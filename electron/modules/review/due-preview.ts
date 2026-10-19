import { createHash, createHmac, randomBytes } from "node:crypto";
import {
  all,
  one,
  run,
  audit,
  id,
  type Context,
} from "../../infrastructure/context.ts";
import { transaction } from "../../infrastructure/database.ts";
import { effectiveReviewPolicy } from "./policy.ts";
import { reviewConfig } from "./config-service.ts";
import { dueEligibility } from "./due-eligibility.ts";
import { RULE_VERSION } from "../../../shared/review-config.ts";
const secret = randomBytes(32);
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
function cards(ctx: Context, deckId: string, cardId?: string) {
  const kind = one(ctx, "SELECT kind FROM decks WHERE id=?", deckId)?.kind;
  if (!kind) throw Error("卡片集不存在");
  const rows = all(
    ctx,
    `SELECT id FROM ${kind === "question" ? "questions" : "memory_cards"} WHERE module=? ORDER BY id`,
    deckId,
  ).filter((r) => !cardId || r.id === cardId);
  if (cardId && !rows.length) throw Error("卡片不属于当前集");
  return rows.map((c) => ({ kind, cardId: c.id }));
}
function cardPolicy(ctx: Context, kind: string, cardId: string) {
  const card = one(
    ctx,
    `SELECT module FROM ${kind === "question" ? "questions" : "memory_cards"} WHERE id=?`,
    cardId,
  );
  const own = one(
    ctx,
    "SELECT max_interval_days FROM card_review_policies WHERE kind=? AND card_id=?",
    kind,
    cardId,
  );
  return {
    source: own ? "card_override" : "deck_default",
    maxIntervalDays:
      own?.max_interval_days ??
      one(
        ctx,
        "SELECT max_interval_days FROM deck_review_policies WHERE deck_id=?",
        card.module,
      )?.max_interval_days ??
      365,
  };
}
function dataFingerprint(
  ctx: Context,
  deckId: string,
  cardId?: string,
  states?: unknown[],
) {
  return hash({
    config: reviewConfig(ctx, deckId),
    timezone: timezone(ctx),
    history: one(
      ctx,
      "SELECT count(*) n,max(a.rowid) latest FROM attempts a JOIN questions q ON q.id=a.question_id WHERE q.module=?",
      deckId,
    ),
    memoryHistory: one(
      ctx,
      "SELECT count(*) n,max(r.rowid) latest FROM memory_reviews r JOIN memory_cards m ON m.id=r.card_id WHERE m.module=?",
      deckId,
    ),
    cards:
      states ??
      cards(ctx, deckId, cardId).map((c) => ({
        ...c,
        policy: cardPolicy(ctx, c.kind, c.cardId),
        due: dueEligibility(ctx, c.kind, c.cardId),
      })),
  });
}
const timezone = (ctx: Context) =>
  String(
    one(ctx, "SELECT value FROM settings WHERE key='studyTimezone'")?.value ??
      "Asia/Shanghai",
  );
function sign(body: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}
export function previewExisting(
  ctx: Context,
  p: { deckId: string; cardId?: string; offset?: number; limit?: number },
) {
  reviewConfig(ctx, p.deckId);
  const now = ctx.now();
  const states = cards(ctx, p.deckId, p.cardId).map((c) => ({
    ...c,
    policy: cardPolicy(ctx, c.kind, c.cardId),
    due: dueEligibility(ctx, c.kind, c.cardId),
  }));
  const rows = states.map((c) => {
    const due = c.due;
    const policy = c.policy;
    const last = Date.parse(due.lastReview ?? "");
    const before = due.effectiveDue;
    let reason = due.deleted
      ? "deleted"
      : due.paused
        ? "paused"
        : due.explicitSnooze
          ? "manual_snooze"
          : !Number.isFinite(last) || last > now.getTime()
            ? "no_valid_last_review"
            : !before || !Number.isFinite(Date.parse(before))
              ? "invalid_due"
              : "unchanged";
    const after =
      reason === "unchanged"
        ? new Date(
            Math.min(
              Date.parse(before!),
              Math.max(now.getTime(), last + policy.maxIntervalDays * 86400000),
            ),
          ).toISOString()
        : before;
    if (after && before && Date.parse(after) < Date.parse(before))
      reason = "advance";
    return {
      kind: c.kind,
      cardId: c.cardId,
      source: policy.source,
      maxIntervalDays: policy.maxIntervalDays,
      beforeDue: before,
      afterDue: after,
      reason,
      anchor: due.anchor,
    };
  });
  const digest = dataFingerprint(ctx, p.deckId, p.cardId, states);
  const payload = {
    deckId: p.deckId,
    ...(p.cardId ? { cardId: p.cardId } : {}),
    at: now.toISOString(),
    expires: now.getTime() + 300000,
    digest,
    timezone: timezone(ctx),
    ruleVersion: RULE_VERSION,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const skipped: Record<string, number> = {};
  for (const r of rows)
    if (r.reason !== "advance")
      skipped[r.reason] = (skipped[r.reason] ?? 0) + 1;
  return {
    previewToken: body + "." + sign(body),
    configRevision: reviewConfig(ctx,p.deckId).revision,
    mode: "advance_existing" as const,
    calculatedAt: payload.at,
    ruleVersion: RULE_VERSION,
    timezone: payload.timezone,
    dataRevision: digest,
    total: rows.length,
    inheritedCount: rows.filter((r) => r.source === "deck_default").length,
    overriddenCount: rows.filter((r) => r.source === "card_override").length,
    affectedCount: rows.filter((r) => r.reason === "advance").length,
    immediateDueCount: rows.filter(
      (r) => r.reason === "advance" && Date.parse(r.afterDue!) <= now.getTime(),
    ).length,
    skipped,
    rows: rows
      .slice(p.offset ?? 0, (p.offset ?? 0) + (p.limit ?? 50))
      .map(({ anchor, ...r }) => r),
    offset: p.offset ?? 0,
  };
}
export function applyExisting(
  ctx: Context,
  p: { previewToken: string },
  requestId: string,
) {
  return transaction(ctx.db, () => {
    const digest = hash(p);
    const old = one(
      ctx,
      "SELECT * FROM review_config_operations WHERE request_id=?",
      requestId,
    );
    if (old) {
      if (old.digest !== digest) throw Error("请求编号冲突");
      return JSON.parse(old.response);
    }
    const [body, signature] = p.previewToken.split(".");
    if (!body || signature !== sign(body))
      throw Error("预览签名无效，请重新预览");
    const token = JSON.parse(Buffer.from(body, "base64url").toString());
    if (
      ctx.now().getTime() > token.expires ||
      ctx.now().getTime() < Date.parse(token.at) ||
      token.digest !== dataFingerprint(ctx, token.deckId, token.cardId)
    )
      throw Error("预览已过期或数据已变化，请重新预览");
    const fixed = { ...ctx, now: () => new Date(token.at) };
    const page = previewExisting(fixed, {
      deckId: token.deckId,
      cardId: token.cardId,
      limit: 1000000,
    });
    const operationId = id();
    let count = 0;
    for (const r of page.rows.filter((r) => r.reason === "advance")) {
      const due = dueEligibility(ctx, r.kind, r.cardId);
      run(
        ctx,
        "INSERT INTO review_due_overrides VALUES (?,?,'policy',?,?,?,?) ON CONFLICT(kind,card_id,source) DO UPDATE SET effective_due=excluded.effective_due,operation_id=excluded.operation_id,anchor=excluded.anchor,created_at=excluded.created_at",
        r.kind,
        r.cardId,
        r.afterDue,
        operationId,
        due.anchor,
        ctx.now().toISOString(),
      );
      count++;
    }
    const response = { operationId, count };
    run(
      ctx,
      "INSERT INTO review_config_operations VALUES (?,?,?,?,?)",
      operationId,
      requestId,
      digest,
      JSON.stringify(response),
      ctx.now().toISOString(),
    );
    audit(ctx, "明确提前现有计划", {
      operationId,
      count,
      deckId: token.deckId,
      previewDigest: token.digest,
    });
    return response;
  });
}
export function undoExisting(
  ctx: Context,
  p: { operationId: string; deckId: string },
) {
  return transaction(ctx.db, () => {
    reviewConfig(ctx, p.deckId);
    const rows = all(
      ctx,
      "SELECT * FROM review_due_overrides WHERE operation_id=?",
      p.operationId,
    );
    if (!rows.length) throw Error("没有可撤销的覆盖；可能已经复盘或撤销");
    const allowed = new Set(
      cards(ctx, p.deckId).map((c) => c.kind + ":" + c.cardId),
    );
    if (
      rows.some(
        (r) =>
          !allowed.has(r.kind + ":" + r.card_id) ||
          dueEligibility(ctx, r.kind, r.card_id).anchor !== r.anchor,
      )
    )
      throw Error("卡片已复盘、移动或人工编辑，禁止撤销旧操作");
    run(
      ctx,
      "DELETE FROM review_due_overrides WHERE operation_id=?",
      p.operationId,
    );
    audit(ctx, "撤销提前计划", p);
    return { count: rows.length };
  });
}
