import { DomainError } from "../../../shared/domain-error.ts";
import { validateSelfScore } from "../../../shared/self-assessment.ts";
import { studyTransition } from "../../../shared/protocol/lifecycle.ts";
import {
  all,
  one,
  run,
  required,
  text,
  audit,
  type Context,
} from "../../infrastructure/context.ts";
import type {
  CardKind,
  SessionPort,
  ReviewResult,
} from "../../../shared/review-contract.ts";
const defaults = {
  answer: "",
  thought: "",
  responseImages: [],
  basis: "independent",
  understanding: 2,
  improvement: "",
  faults: [],
  errorIds: [],
  faultDetail: "",
  note: "",
  seconds: 0,
  practice: false,
};
export function saveSession(ctx: Context, p: any) {
  const deck = one(
    ctx,
    "SELECT * FROM decks WHERE id=? AND deleted_at IS NULL",
    required(p.deck_id, "卡片集"),
  );
  if (!deck) throw new Error("卡片集不存在");
  const old = one(
    ctx,
    "SELECT * FROM study_sessions WHERE deck_id=? AND json_extract(payload,'$.sessionId')=?",
    deck.id,
    p.payload?.sessionId ?? "",
  );
  if (
    p.expected_revision != null &&
    p.expected_revision !== (old?.revision ?? 0)
  )
    throw new DomainError(
      "REVISION_CONFLICT",
      "会话版本已变化，请重新载入，当前草稿仍保留",
    );
  if (
    old &&
    (!Number.isInteger(p.expected_revision) ||
      p.expected_revision !== old.revision)
  )
    throw new DomainError(
      "REVISION_CONFLICT",
      "会话版本已变化或缺少版本，请重新载入，当前草稿仍保留",
    );
  const raw = p.payload;
  if (!raw || typeof raw !== "object" || JSON.stringify(raw).length > 1000000)
    throw new Error("会话数据不合法或过大");
  const s = { ...defaults, ...raw };
  if (
    !Array.isArray(s.ids) ||
    s.ids.length > 5000 ||
    new Set(s.ids).size !== s.ids.length ||
    s.ids.some((x: any) => typeof x !== "string")
  )
    throw new Error("会话卡片队列不合法");
  if (
    !Number.isInteger(s.index) ||
    s.index < 0 ||
    s.index > s.ids.length ||
    !["answer", "reveal", "result"].includes(s.stage)
  )
    throw new Error("会话进度或阶段不合法");
  if (
    !Number.isInteger(s.seconds) ||
    s.seconds < 0 ||
    s.seconds > 86400 ||
    !Array.isArray(s.faults) ||
    !Array.isArray(s.errorIds)
  )
    throw new Error("会话字段不合法");
  for (const key of ["answer", "thought", "improvement", "faultDetail", "note"])
    text(s[key]);
  if (deck.kind === "question" && s.selfScore != null && s.stage !== "answer") {
    const q = one(
      ctx,
      "SELECT answer,content_version FROM questions WHERE id=?",
      s.ids[s.index],
    );
    if (q && q.content_version === s.contentVersion)
      validateSelfScore(s.answer === q.answer, s.selfScore);
  }
  const previous = old ? JSON.parse(old.payload) : null;
  if (!old) {
    const signature = JSON.stringify([...s.ids].sort());
    const duplicate = all(
      ctx,
      "SELECT payload FROM study_sessions WHERE deck_id=?",
      deck.id,
    ).some(
      (row) =>
        JSON.stringify([...JSON.parse(row.payload).ids].sort()) === signature,
    );
    if (duplicate)
      throw new DomainError(
        "DUPLICATE_SESSION",
        "这些题目已有复盘页面，请打开已有页面",
      );
  }
  if (previous?.schemaVersion === 1 && s.schemaVersion !== 1)
    throw new DomainError("PROTOCOL_CONFLICT", "会话协议不能降级，原稿仍保留");
  for (const id of s.ids) {
    const card = one(
      ctx,
      `SELECT * FROM ${deck.kind === "question" ? "questions" : "memory_cards"} WHERE id=? AND module=?`,
      id,
      deck.id,
    );
    if ((!card || card.deleted_at) && !previous?.ids?.includes(id))
      throw new Error("会话卡片不属于当前卡片集或已删除");
  }
  if (s.schemaVersion !== 1)
    throw new Error("不支持的会话协议版本，请升级旧草稿后保存");
  if (s.schemaVersion === 1) {
    required(s.sessionId, "会话编号");
    required(s.entryId, "本次作答编号");
    if (!Number.isInteger(s.contentVersion) || s.contentVersion < 0)
      throw new Error("题目内容版本不合法");
    if (previous?.sessionId && previous.sessionId !== s.sessionId && !p.replace)
      throw new Error("已有未完成会话，请继续或确认重新开始");
    if (
      previous?.sessionId === s.sessionId &&
      JSON.stringify(previous.ids) !== JSON.stringify(s.ids)
    )
      throw new Error("会话队列不能改写，请重新开始");
    if (previous?.entryId === s.entryId) {
      if (
        previous.sessionId !== s.sessionId ||
        previous.index !== s.index ||
        previous.ids[previous.index] !== s.ids[s.index]
      )
        throw new DomainError(
          "ENTRY_CONFLICT",
          "作答编号已绑定其他题目，不能切换",
        );
      if (previous.stage === "result" && s.stage !== "result")
        throw new Error("本次复盘已保存，请进入下一张");
      if (previous.stage === "reveal" && s.stage === "answer")
        throw new Error("已展开解析，不能回写独立作答阶段");
      if (
        previous.stage !== "answer" &&
        (s.thought !== previous.thought ||
          s.answer !== previous.answer ||
          JSON.stringify(s.responseImages ?? []) !==
            JSON.stringify(previous.responseImages ?? []))
      )
        throw new Error("独立作答原稿和思路已冻结，反思请单独填写");
      if (previous.contentVersion !== s.contentVersion)
        throw new Error("会话题目版本不能自动替换");
      if (previous.stage === "result") s.savedResult = previous.savedResult;
    } else if (previous?.sessionId === s.sessionId && p.restart) {
      if (s.index !== previous.index || s.stage !== "answer")
        throw new Error("重新作答必须保留当前题目并回到作答阶段");
    } else if (previous?.sessionId === s.sessionId && !p.restart) {
      const oldCard = one(
        ctx,
        `SELECT id FROM ${deck.kind === "question" ? "questions" : "memory_cards"} WHERE id=? AND module=? AND deleted_at IS NULL`,
        previous.ids[previous.index],
        deck.id,
      );
      if (
        ((!p.skip || oldCard) && previous.stage !== "result") ||
        s.index !== previous.index + 1
      )
        throw new Error("请先保存本次复盘，再进入下一张");
    }
    if (s.stage === "result") {
      const receipt = one(
        ctx,
        "SELECT * FROM review_receipts WHERE request_id=?",
        s.entryId,
      );
      if (
        !receipt ||
        receipt.kind !== deck.kind ||
        receipt.card_id !== s.ids[s.index]
      )
        throw new Error("会话尚无已保存的复盘记录");
      s.savedResult = JSON.parse(receipt.response);
    }
    if (
      s.stage === "reveal" &&
      deck.kind === "question" &&
      (!/^[A-D]$/.test(s.answer) || !s.thought.trim())
    )
      throw new Error("请先填写答案和独立思路");
  }
  if (previous?.sessionId === s.sessionId)
    s.abandonedDrafts = Array.isArray(previous.abandonedDrafts)
      ? previous.abandonedDrafts
      : [];
  if (
    previous &&
    previous.entryId !== s.entryId &&
    previous.stage !== "result"
  ) {
    const archive = [
      ...(Array.isArray(previous.abandonedDrafts)
        ? previous.abandonedDrafts
        : []),
    ];
    archive.push({
      cardId: previous.ids[previous.index],
      entryId: previous.entryId,
      contentVersion: previous.contentVersion,
      answer: previous.answer,
      thought: previous.thought,
      responseImages: previous.responseImages ?? [],
      improvement: previous.improvement,
      createdAt: ctx.now().toISOString(),
    });
    s.abandonedDrafts = archive;
    audit(ctx, p.skip ? "跳过失效卡片并保留原稿" : "重新作答并保留原稿", {
      deckId: deck.id,
      draft: archive.at(-1),
    });
  }
  const revision = (old?.revision ?? 0) + 1;
  run(
    ctx,
    "INSERT INTO study_sessions(deck_id,payload,updated_at,revision) VALUES (?,?,?,?) ON CONFLICT DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at,revision=excluded.revision",
    deck.id,
    JSON.stringify(s),
    ctx.now().toISOString(),
    revision,
  );
  return { revision };
}
export function deleteSession(ctx: Context, p: any) {
  const row = one(
    ctx,
    "SELECT * FROM study_sessions WHERE deck_id=? AND json_extract(payload,'$.sessionId')=?",
    p.deck_id,
    p.session_id,
  );
  if (p.session_id && row && JSON.parse(row.payload).sessionId !== p.session_id)
    throw new Error("会话已变化，请刷新后重试");
  run(
    ctx,
    "DELETE FROM study_sessions WHERE deck_id=? AND json_extract(payload,'$.sessionId')=?",
    p.deck_id,
    p.session_id,
  );
  return true;
}
export function sessionPort(ctx: Context): SessionPort {
  return {
    validateSubmission(kind: CardKind, p: any) {
      if (!p.session_id) {
        const active = all(ctx, "SELECT payload FROM study_sessions").some(
          (row) => JSON.parse(row.payload).entryId === p.request_id,
        );
        if (active)
          throw new DomainError(
            "ENTRY_CONFLICT",
            "本次作答编号属于学习会话，请携带会话身份",
          );
        return;
      }
      const row = one(
        ctx,
        "SELECT * FROM study_sessions WHERE deck_id=? AND json_extract(payload,'$.sessionId')=?",
        p.deck_id,
        p.session_id,
      );
      const s = row && JSON.parse(row.payload),
        cardId = kind === "question" ? p.question_id : p.id;
      if (
        !s ||
        s.sessionId !== p.session_id ||
        s.entryId !== p.request_id ||
        s.ids[s.index] !== cardId ||
        s.stage !== "reveal"
      )
        throw new Error("会话阶段或作答编号不匹配，请重新载入");
      const card = one(
        ctx,
        `SELECT * FROM ${kind === "question" ? "questions" : "memory_cards"} WHERE id=? AND deleted_at IS NULL`,
        cardId,
      );
      const deck = one(
        ctx,
        "SELECT * FROM decks WHERE id=? AND deleted_at IS NULL",
        p.deck_id,
      );
      if (!card || !deck || deck.kind !== kind || card.module !== p.deck_id)
        throw new DomainError(
          "DECK_CONFLICT",
          "卡片已移动或删除，原稿仍保留，请跳过或重新开始",
        );
      if (s.contentVersion !== p.content_version)
        throw new DomainError("CONTENT_VERSION_CONFLICT", "会话内容版本不匹配");
      if (
        kind === "question" &&
        (s.thought !== p.thought ||
          s.answer !== p.answer ||
          JSON.stringify(s.responseImages ?? []) !==
            JSON.stringify(p.response_images ?? []))
      )
        throw new Error("提交思路与独立作答原稿不一致");
    },
    recordSaved(p: any, result: ReviewResult) {
      if (!p.session_id) return;
      const row = one(
          ctx,
          "SELECT * FROM study_sessions WHERE deck_id=? AND json_extract(payload,'$.sessionId')=?",
          p.deck_id,
          p.session_id,
        ),
        s = JSON.parse(row.payload);
      s.stage = studyTransition(s.stage, "commit");
      s.savedResult = result;
      s.pendingSubmission = null;
      run(
        ctx,
        "UPDATE study_sessions SET payload=?,revision=revision+1,updated_at=? WHERE deck_id=? AND json_extract(payload,'$.sessionId')=?",
        JSON.stringify(s),
        ctx.now().toISOString(),
        p.deck_id,
        p.session_id,
      );
    },
  };
}
