import { randomUUID } from "node:crypto";
import type { Context } from "../../infrastructure/context.ts";
import { transaction } from "../../infrastructure/database.ts";
import { audit } from "../../infrastructure/context.ts";
import { ProtocolError } from "../../../shared/protocol/data.ts";
import {
  ApplyAdjustments,
  UndoAdjustments,
  AdjustmentLogsInput,
  type PrepareSelection,
} from "../../../shared/protocol/ai-adjustments.ts";
import type { z } from "zod";
import type { buildAdjustmentPreview } from "./adjustment-preview.ts";
import { resolveAdjustmentSelection } from "./adjustment-preflight.ts";
import { basisHash, targetBasis, treeBasis } from "./adjustment-basis.ts";
import {
  publishedCard,
  readSchedule,
  currentDue,
  schedulePolicy,
  setCardSchedulePolicy,
  dueOverrideAnchor,
} from "../cards-unified/schedule.ts";
import { reviewConfig } from "../review/config-service.ts";
import { NativeDueOverride } from "../../../shared/protocol/review-details.ts";
// One ephemeral credential per current owner, consumed only by a durable committed operation.
const prepared = new WeakMap<
  Context,
  {
    preview: ReturnType<typeof buildAdjustmentPreview>;
    input: z.infer<typeof PrepareSelection>;
    token: string;
    expires: number;
  }
>();
export function discardAdjustmentPreparation(ctx: Context) {
  prepared.delete(ctx);
}
export function retainAdjustmentPreparation(
  ctx: Context,
  preview: ReturnType<typeof buildAdjustmentPreview>,
  input: z.infer<typeof PrepareSelection>,
  summary: { preparationToken: string },
) {
  prepared.set(ctx, {
    preview,
    input: structuredClone(input),
    token: summary.preparationToken,
    expires: preview.expiresAt,
  });
}
const MODEL = "ganksoft.ai-adjustment/1",
  BYTE_BUDGET = 48 * 1024 * 1024,
  TIME_BUDGET = 30000;
type DeckRow = { payload: string; revision: number; updated_at: string };
type Change =
  | {
      kind: "setting";
      key: string;
      before: string | null;
      after: string;
      cardId: string;
      dueBefore?: string | null;
      dueAfter?: string;
    }
  | { kind: "deck"; key: string; before: DeckRow | null; after: DeckRow };
type Op = {
  model: typeof MODEL;
  deckId: string;
  source: { exportId: string; snapshotId: string; dataEpoch: string };
  actionHashes: string[];
  operationId: string;
  actionCount: number;
  cardCount: number;
  knowledgeCount: number;
  types: string[];
  undone: boolean;
  undoneAt: string | null;
  appliedRevision: number;
  afterGuard: string;
  targets: string[];
  changes: Change[];
};
function revision(ctx: Context) {
  return Number(
    ctx.db.prepare("SELECT revision FROM protocol_meta").get()!.revision,
  );
}
function epoch(ctx: Context) {
  return String(ctx.db.prepare("SELECT epoch FROM protocol_meta").get()!.epoch);
}
function guard(ctx: Context, deckId: string, targets: string[]) {
  const m = treeBasis(ctx, deckId, () => {});
  return basisHash({
    tree: m,
    config: reviewConfig(ctx, deckId),
    targets: targets.map((id) => targetBasis(ctx, deckId, id)),
  });
}
const result = (o: Op) => ({
  operationId: o.operationId,
  actionCount: o.actionCount,
  cardCount: o.cardCount,
  knowledgeCount: o.knowledgeCount,
  undone: o.undone,
});
function parseOp(raw: unknown) {
  const o = JSON.parse(String(raw)) as Op;
  if (o.model !== MODEL) throw Error("不是AI调度调整操作");
  return o;
}
function undoReason(ctx: Context, o: Op): string | null {
  if (o.undone) return "操作已经撤销";
  if (o.source.dataEpoch !== epoch(ctx) || revision(ctx) !== o.appliedRevision)
    return "执行后数据库已发生写入，为保护后续学习，本组不能撤销";
  try {
    if (guard(ctx, o.deckId, o.targets) !== o.afterGuard)
      return "目标版本、排期、知识或策略已变化";
  } catch {
    return "目标已删除、移动或发生变化";
  }
  for (const c of o.changes) {
    if (c.kind === "setting") {
      if (
        String(
          ctx.db.prepare("SELECT value FROM settings WHERE key=?").get(c.key)
            ?.value ?? "",
        ) !== c.after
      )
        return "调整字段已发生变化";
      if (
        c.dueAfter &&
        Date.parse(c.dueAfter) <= ctx.now().getTime() &&
        c.dueBefore &&
        Date.parse(c.dueBefore) > ctx.now().getTime()
      )
        return "提前的任务已经到期，撤销不能把待复盘移至未来";
    } else {
      const r = ctx.db
        .prepare(
          "SELECT payload,revision,updated_at FROM deck_review_config_v2 WHERE deck_id=?",
        )
        .get(c.key);
      if (basisHash(r) !== basisHash(c.after)) return "卡片集配置已变化";
    }
  }
  return null;
}
/** Called only by the synchronous host, inside its BEGIN IMMEDIATE + receipt transaction. */
export function applyAdjustments(
  ctx: Context,
  input: unknown,
  requestId: string,
  budget?: { bytes?: number; milliseconds?: number },
) {
  return transaction(ctx.db, () => {
    const p = ApplyAdjustments.parse(input),
      credential = prepared.get(ctx),
      started = Date.now();
    const byteLimit = Math.min(BYTE_BUDGET, budget?.bytes ?? BYTE_BUDGET),
      timeLimit = Math.min(TIME_BUDGET, budget?.milliseconds ?? TIME_BUDGET);
    if (
      !credential ||
      credential.token !== p.preparationToken ||
      credential.expires <= ctx.now().getTime() ||
      basisHash(credential.input.source) !== basisHash(p.source) ||
      p.deckId !== credential.input.deckId
    )
      throw new ProtocolError(
        "AI_PREPARATION_STALE",
        "执行凭据无效或已过期，请重新导入和确认",
      );
    if (
      ctx.db
        .prepare("SELECT 1 FROM review_config_operations WHERE digest=?")
        .get(p.preparationToken)
    )
      throw Error("本组凭据已执行，不能重复使用");
    const plan = resolveAdjustmentSelection(
      ctx,
      credential.preview,
      credential.input,
    );
    const records = plan.records,
      operationId = randomUUID(),
      actionHashes = records.map((r) =>
        basisHash({ exportId: p.source.exportId, actionId: r.action.actionId }),
      );
    const selected = new Set(actionHashes);
    for (const row of ctx.db
      .prepare(
        "SELECT response FROM review_config_operations WHERE json_extract(response,'$.model')=? AND json_extract(response,'$.source.exportId')=?",
      )
      .iterate(MODEL, p.source.exportId)) {
      const old = parseOp(row.response);
      if (old.actionHashes.some((k) => selected.has(k)))
        throw Error("来源中已有建议执行过，请重新导出分析");
    }
    const changes: Change[] = [],
      targetSet = new Set<string>(),
      knowledge = new Set<string>(),
      types = new Set<string>();
    let bytes = 0;
    const add = (c: Change) => {
      bytes += Buffer.byteLength(JSON.stringify(c));
      if (bytes > byteLimit || Date.now() - started > timeLimit)
        throw Error("整组事务资源预算不足，尚未写入；请缩小选择后重新确认");
      changes.push(c);
    };
    // Resolve every write and its rollback material before the first business write.
    for (const r of records) {
      const a = r.action;
      types.add(a.type);
      for (const t of r.targets) targetSet.add(t.cardId);
      if (a.type === "deck.policy.retention.set") {
        const cfg = reviewConfig(ctx, p.deckId),
          old = ctx.db
            .prepare(
              "SELECT payload,revision,updated_at FROM deck_review_config_v2 WHERE deck_id=?",
            )
            .get(p.deckId) as DeckRow | undefined;
        add({
          kind: "deck",
          key: p.deckId,
          before: old ?? null,
          after: {
            payload: JSON.stringify({
              ...cfg.config,
              desiredRetention: a.value,
            }),
            revision: Number(cfg.revision) + 1,
            updated_at: ctx.now().toISOString(),
          },
        });
      } else if (a.type === "card.schedule.advance_due") {
        const card = publishedCard(ctx, { deckId: p.deckId, cardId: a.cardId }),
          due = currentDue(ctx, card),
          key = "unified-ai-due:" + a.cardId;
        const previous = ctx.db
          .prepare("SELECT value FROM settings WHERE key=?")
          .get(key);
        // Replacing an active override would require anchoring to the pre-overlay due.
        // Fail closed rather than stacking hidden effective-due layers.
        if (previous)
          throw Error("卡片已有到期覆盖，请完成复盘或撤销原操作后重新分析");
        const after = NativeDueOverride.parse({
          encoding: "ganksoft.ai-due/1",
          cardId: a.cardId,
          operationId,
          anchor: dueOverrideAnchor(card, readSchedule(ctx, card).hash, due),
          dueAt: a.dueAt,
        });
        add({
          kind: "setting",
          key,
          cardId: a.cardId,
          before: null,
          after: JSON.stringify(after),
          dueBefore: due.dueAt,
          dueAfter: a.dueAt,
        });
      } else {
        if (a.type === "knowledge.cards.max_interval.set")
          knowledge.add(a.knowledgeId);
        for (const t of r.targets) {
          const card = publishedCard(ctx, {
              deckId: p.deckId,
              cardId: t.cardId,
            }),
            policy = schedulePolicy(ctx, card),
            key = "unified-card-policy:" + t.cardId;
          const before = ctx.db
            .prepare("SELECT value FROM settings WHERE key=?")
            .get(key);
          add({
            kind: "setting",
            key,
            cardId: t.cardId,
            before: before ? String(before.value) : null,
            after: JSON.stringify({
              encoding: "ganksoft.card-policy/1",
              cardId: t.cardId,
              maxIntervalDays: a.value,
              revision: policy.overrideRevision + 1,
            }),
          });
        }
      }
    }
    const targets = [...targetSet].sort(),
      appliedRevision = revision(ctx) + 1;
    const op: Op = {
      model: MODEL,
      deckId: p.deckId,
      source: {
        exportId: p.source.exportId,
        snapshotId: p.source.snapshotId,
        dataEpoch: p.source.dataEpoch,
      },
      actionHashes,
      operationId,
      actionCount: records.length,
      cardCount: targets.length,
      knowledgeCount: knowledge.size,
      types: [...types],
      undone: false,
      undoneAt: null,
      appliedRevision,
      afterGuard: "",
      targets,
      changes,
    };
    if (Buffer.byteLength(JSON.stringify(op)) * 2 > byteLimit)
      throw Error("整组持久撤销审计超过字节预算，未写入");
    for (const c of changes) {
      if (Date.now() - started > timeLimit)
        throw Error("事务时间超预算，整组回滚");
      if (c.kind === "setting") {
        if (c.key.startsWith("unified-card-policy:")) {
          const value = JSON.parse(c.after),
            card = publishedCard(ctx, { deckId: p.deckId, cardId: c.cardId });
          setCardSchedulePolicy(
            ctx,
            card,
            value.maxIntervalDays,
            value.revision - 1,
          );
        } else
          ctx.db
            .prepare(
              "INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            )
            .run(c.key, c.after);
      } else
        ctx.db
          .prepare(
            "INSERT INTO deck_review_config_v2 VALUES(?,?,?,?) ON CONFLICT(deck_id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision,updated_at=excluded.updated_at",
          )
          .run(c.key, c.after.payload, c.after.revision, c.after.updated_at);
    }
    op.afterGuard = guard(ctx, p.deckId, targets);
    if (Date.now() - started > timeLimit)
      throw Error("整组事务时间超限，完整回滚");
    ctx.db
      .prepare("INSERT INTO review_config_operations VALUES(?,?,?,?,?)")
      .run(
        operationId,
        requestId,
        p.preparationToken,
        JSON.stringify(op),
        ctx.now().toISOString(),
      );
    audit(ctx, "AI调度调整执行", {
      ...result(op),
      types: op.types,
      deckId: p.deckId,
    });
    return result(op);
  });
}
export function undoAdjustments(ctx: Context, input: unknown) {
  return transaction(ctx.db, () => {
    const p = UndoAdjustments.parse(input),
      row = ctx.db
        .prepare("SELECT response FROM review_config_operations WHERE id=?")
        .get(p.operationId);
    if (!row) throw Error("调整记录不存在");
    const o = parseOp(row.response);
    if (o.deckId !== p.deckId) throw Error("调整不属于当前卡片集");
    if (o.undone) return result(o);
    const reason = undoReason(ctx, o);
    if (reason) throw Error(reason);
    for (const c of o.changes) {
      if (c.kind === "setting") {
        if (c.before === null)
          ctx.db.prepare("DELETE FROM settings WHERE key=?").run(c.key);
        else
          ctx.db
            .prepare("UPDATE settings SET value=? WHERE key=?")
            .run(c.before, c.key);
      } else if (c.before === null)
        ctx.db
          .prepare("DELETE FROM deck_review_config_v2 WHERE deck_id=?")
          .run(c.key);
      else
        ctx.db
          .prepare(
            "UPDATE deck_review_config_v2 SET payload=?,revision=?,updated_at=? WHERE deck_id=?",
          )
          .run(c.before.payload, c.before.revision, c.before.updated_at, c.key);
    }
    o.undone = true;
    o.undoneAt = ctx.now().toISOString();
    ctx.db
      .prepare("UPDATE review_config_operations SET response=? WHERE id=?")
      .run(JSON.stringify(o), o.operationId);
    audit(ctx, "AI调度调整撤销", {
      ...result(o),
      types: o.types,
      deckId: p.deckId,
    });
    return result(o);
  });
}
export function listAdjustments(ctx: Context, input: unknown) {
  const p = AdjustmentLogsInput.parse(input),
    total = Number(
      ctx.db
        .prepare(
          "SELECT count(*) n FROM review_config_operations WHERE json_extract(response,'$.model')=? AND json_extract(response,'$.deckId')=?",
        )
        .get(MODEL, p.deckId)!.n,
    );
  const rows = ctx.db
    .prepare(
      "SELECT response,created_at FROM review_config_operations WHERE json_extract(response,'$.model')=? AND json_extract(response,'$.deckId')=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",
    )
    .all(MODEL, p.deckId, p.limit, p.offset)
    .map((r) => {
      const o = parseOp(r.response),
        reason = undoReason(ctx, o);
      return {
        ...result(o),
        createdAt: String(r.created_at),
        undoneAt: o.undoneAt,
        types: o.types,
        canUndo: reason === null,
        blockedReason: reason,
      };
    });
  return { total, offset: p.offset, rows };
}
