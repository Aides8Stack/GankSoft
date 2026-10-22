import { one, run, type Context } from "../../infrastructure/context.ts";
/** A plan is the canonical visible due (including legacy explicit postponements).
 * FSRS retains its unmodified algorithm state; policy and snooze are explicit layers. */
export function dueEligibility(ctx: Context, kind: string, cardId: string) {
  if (!["question", "memory"].includes(kind)) throw Error("卡片类型不合法");
  const card = one(
    ctx,
    `SELECT id,module,version,${kind === "question" ? "content_version" : "learning_version"},deleted_at FROM ${kind === "question" ? "questions" : "memory_cards"} WHERE id=?`,
    cardId,
  );
  const plan = one(
    ctx,
    `SELECT * FROM ${kind === "question" ? "plans" : "memory_plans"} WHERE ${kind === "question" ? "question_id" : "card_id"}=?`,
    cardId,
  );
  const scheduling = one(
    ctx,
    "SELECT data FROM scheduling WHERE kind=? AND card_id=?",
    kind,
    cardId,
  );
  const fsrs = scheduling ? JSON.parse(scheduling.data) : null;
  const anchor = JSON.stringify({
    module: card?.module,
    editVersion: card?.version,
    version:
      kind === "question" ? card?.content_version : card?.learning_version,
    plan,
    fsrs,
  });
  const policy = one(
    ctx,
    "SELECT * FROM review_due_overrides WHERE kind=? AND card_id=? AND source='policy'",
    kind,
    cardId,
  );
  const snooze = one(
    ctx,
    "SELECT * FROM review_due_overrides WHERE kind=? AND card_id=? AND source='snooze'",
    kind,
    cardId,
  );
  const rawDue = plan?.due_at ?? fsrs?.due ?? null;
  const explicitSnooze = !!(
    snooze?.anchor === anchor ||
    (plan?.reason?.startsWith("手动延期") && plan?.due_at)
  );
  const effectiveDue =
    snooze?.anchor === anchor
      ? snooze.effective_due
      : !explicitSnooze && policy?.anchor === anchor && rawDue
        ? new Date(
            Math.min(Date.parse(rawDue), Date.parse(policy.effective_due)),
          ).toISOString()
        : rawDue;
  const paused = !!plan?.paused;
  const deleted = !card || !!card.deleted_at;
  return {
    effectiveDue,
    rawDue,
    fsrsDue: fsrs?.due ?? null,
    lastReview: fsrs?.last_review ?? null,
    anchor,
    paused,
    deleted,
    explicitSnooze,
    eligible:
      !paused &&
      !deleted &&
      !!effectiveDue &&
      Date.parse(effectiveDue) <= ctx.now().getTime(),
  };
}
export function clearDueOverrides(ctx: Context, kind: string, cardId: string) {
  run(
    ctx,
    "DELETE FROM review_due_overrides WHERE kind=? AND card_id=?",
    kind,
    cardId,
  );
}
