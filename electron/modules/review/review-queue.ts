import { all, one, type Context } from "../../infrastructure/context.ts";
import { reviewConfig } from "./config-service.ts";
import { dueEligibility } from "./due-eligibility.ts";
import { deckDiagnosis } from "./diagnosis.ts";
import { dailyReviewBudget } from "../../../shared/review-budget.ts";
import {
  selectCandidates,
  type QueueCandidate,
} from "../../../shared/review-priority-v2.ts";
import { calendarDay } from "../../../shared/calendar.ts";
export function previewQueue(
  ctx: Context,
  p: {
    deckId: string;
    seed?: string;
    cardId?: string;
    diagnosisOffset?: number;
  },
) {
  const view = reviewConfig(ctx, p.deckId);
  const config = view.config;
  const now = ctx.now();
  const kind = one(ctx, "SELECT kind FROM decks WHERE id=?", p.deckId).kind as
    "question" | "memory";
  const timezone = String(
    one(ctx, "SELECT value FROM settings WHERE key='studyTimezone'")?.value ??
      "Asia/Shanghai",
  );
  const cards = all(
    ctx,
    `SELECT * FROM ${kind === "question" ? "questions" : "memory_cards"} WHERE module=? AND deleted_at IS NULL ORDER BY id`,
    p.deckId,
  );
  const histories = all(
    ctx,
    kind === "question"
      ? "SELECT a.* FROM attempts a JOIN questions q ON q.id=a.question_id LEFT JOIN attempt_evidence_snapshots e ON e.attempt_id=a.id WHERE q.module=? AND (e.deck_id IS NULL OR e.deck_id=q.module)"
      : "SELECT r.* FROM memory_reviews r JOIN memory_cards m ON m.id=r.card_id WHERE m.module=?",
    p.deckId,
  );
  const budget = dailyReviewBudget(
    histories,
    new Set(cards.map((c) => c.id)),
    now,
    timezone,
  );
  const diagnosis = kind === "question" ? deckDiagnosis(ctx, p.deckId) : null;
  const links =
    kind === "question"
      ? all(
          ctx,
          "SELECT l.* FROM question_knowledge l JOIN questions q ON q.id=l.question_id WHERE q.module=?",
          p.deckId,
        )
      : [];
  const pools: {
    due: QueueCandidate[];
    relearn: QueueCandidate[];
    specialty: QueueCandidate[];
  } = { due: [], relearn: [], specialty: [] };
  const excluded: Record<string, number> = {};
  const skip = (s: string) => {
    excluded[s] = (excluded[s] ?? 0) + 1;
  };
  for (const card of cards) {
    const due = dueEligibility(ctx, kind, card.id);
    if (due.paused || due.deleted) {
      skip("paused_or_deleted");
      continue;
    }
    if (
      kind === "question" &&
      (card.status !== "ready" || !/^[A-D]$/.test(card.answer))
    ) {
      skip("not_ready");
      continue;
    }
    const kids = links
      .filter((l) => l.question_id === card.id)
      .map((l) => l.knowledge_id);
    const evidence = diagnosis?.questions.find((d) => d.cardId === card.id);
    const knowledge =
      diagnosis?.knowledge.filter((d) => kids.includes(d.knowledgeId)) ?? [];
    const age = due.effectiveDue
      ? (now.getTime() - Date.parse(due.effectiveDue)) / 86400000
      : 0;
    const interval = Math.max(
      1,
      (Date.parse(due.rawDue ?? "") - Date.parse(due.lastReview ?? "")) /
        86400000 || 1,
    );
    const severe = age >= Math.max(7, interval);
    const prefs = view.knowledge
      .filter((k) => !k.orphan && kids.includes(k.knowledgeId))
      .map((k) => k.preference);
    const fatigue = histories.some(
      (r) =>
        (r.question_id ?? r.card_id) === card.id &&
        calendarDay(new Date(r.created_at), timezone) ===
          calendarDay(now, timezone),
    );
    const candidate: QueueCandidate = {
      cardId: card.id,
      kind,
      dueAt: due.effectiveDue ?? now.toISOString(),
      overdue: Math.max(0, age) / (Math.max(0, age) + interval),
      severe,
      questionRisk: evidence?.risk ?? 0.5,
      knowledgeRisk: Math.max(
        0,
        ...knowledge.map((k) => (k.risk ?? 0) * k.confidence),
      ),
      coverage: knowledge.length
        ? Math.max(...knowledge.map((k) => 1 - k.coverage))
        : 1,
      knowledgeIds: kids,
      fatigue,
      specialtyBoost: prefs.length
        ? Math.max(
            ...prefs.map(
              (k) =>
                k.boost *
                (k.mode === "prioritize"
                  ? 1.25
                  : k.mode === "reduce"
                    ? 0.75
                    : 1) *
                (k.variantFirst && fatigue ? 0.5 : 1),
            ),
          )
        : 1,
      reasonCodes: [
        ...(evidence?.bad ? ["repeat_error"] : []),
        ...(knowledge.some((k) => ["weak", "suspected_weak"].includes(k.status))
          ? ["weak_knowledge_practice"]
          : []),
        ...(severe ? ["severely_overdue"] : []),
        ...(evidence?.reasonCodes ?? []),
        ...(fatigue ? ["recent_fatigue"] : []),
      ],
    };
    if (due.eligible) {
      (budget.dueIds.has(card.id) ? pools.relearn : pools.due).push(candidate);
      continue;
    }
    if (
      kind === "memory" ||
      due.explicitSnooze ||
      !config.crossQuestionVerification ||
      prefs.some(
        (k) =>
          k.mode === "exclude_specialty" ||
          k.practicePaused ||
          k.practiceTarget === 0,
      )
    ) {
      skip("specialty_excluded");
      continue;
    }
    pools.specialty.push({
      ...candidate,
      reasonCodes: [...candidate.reasonCodes, "cross_question_practice"],
    });
  }
  const seed = p.seed ?? calendarDay(now, timezone);
  const dueLeft = Math.max(0, view.dailyLimit - budget.uniqueDue),
    relearnLeft = Math.max(
      0,
      config.sameDayRelearnBudget - budget.relearnEvents,
    );
  const practiceUsed = histories.filter(
    (r) =>
      calendarDay(new Date(r.created_at), timezone) ===
        calendarDay(now, timezone) &&
      r.assessment_snapshot &&
      JSON.parse(r.assessment_snapshot).contribution === "practice",
  ).length;
  const specialtyLeft = Math.max(0, config.specialtyDailyLimit - practiceUsed);
  const due = selectCandidates(pools.due, dueLeft, config, seed),
    relearn = selectCandidates(pools.relearn, relearnLeft, config, seed);
  let specialty = selectCandidates(
    pools.specialty,
    specialtyLeft,
    config,
    seed,
    true,
  );
  // Per-knowledge targets constrain extra work only; candidates remain unique.
  const used = new Map<string, number>();
  specialty = specialty.filter((c) => {
    const prefs = view.knowledge.filter(
      (k) => c.knowledgeIds.includes(k.knowledgeId) && !k.orphan,
    );
    if (
      prefs.some(
        (k) =>
          k.preference.practiceTarget !== null &&
          (used.get(k.knowledgeId) ?? 0) >= k.preference.practiceTarget,
      )
    )
      return false;
    for (const kid of c.knowledgeIds) used.set(kid, (used.get(kid) ?? 0) + 1);
    return true;
  });
  return {
    deckId: p.deckId,
    ruleVersion: "adaptive-review-v2.0",
    configRevision: view.revision,
    calculatedAt: now.toISOString(),
    timezone,
    seed,
    dataRevision: diagnosis?.dataRevision ?? "memory",
    budgets: {
      uniqueDueUsed: budget.uniqueDue,
      relearnUsed: budget.relearnEvents,
      practiceUsed,
      dueLeft,
      relearnLeft,
      specialtyLeft,
      practiceMinutes: config.practiceMinutes,
    },
    due,
    relearn,
    specialty,
    excluded,
    diagnosis: diagnosis
      ? {
          ...diagnosis,
          questionTotal: diagnosis.questions.length,
          knowledgeTotal: diagnosis.knowledge.length,
          knowledgeOffset: p.diagnosisOffset ?? 0,
          questions: diagnosis.questions
            .filter((d) =>
              p.cardId
                ? d.cardId === p.cardId
                : [...due, ...relearn, ...specialty].some(
                    (c) => c.cardId === d.cardId,
                  ),
            )
            .slice(0, 100),
          knowledge: diagnosis.knowledge.slice(
            p.diagnosisOffset ?? 0,
            (p.diagnosisOffset ?? 0) + 50,
          ),
        }
      : null,
  };
}
