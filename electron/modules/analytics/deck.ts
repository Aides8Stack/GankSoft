import { selectDeckReviews } from "./window.ts";
import type { DateSelectionInput } from "../../../shared/workspace-contracts.ts";
import {
  all,
  one,
  required,
  type Context,
} from "../../infrastructure/context.ts";
import type { DeckInsights } from "../../../shared/review-analytics.ts";
import { parseAssessment } from "../../../shared/assessment.ts";

/** Read-only deck analysis. Every source is joined to the requested live deck. */
export function deckInsights(
  ctx: Context,
  input: { deckId: string } & DateSelectionInput,
): DeckInsights {
  const deckId = required(input.deckId, "卡片集");
  const deck = one(
    ctx,
    "SELECT * FROM decks WHERE id=? AND deleted_at IS NULL",
    deckId,
  );
  if (!deck) throw new Error("卡片集不存在或已删除");
  const selected = selectDeckReviews(ctx, deckId, input);
  const questions = selected.cards;
  const rows = selected.rows;
  const effective = selected.effective;
  const knowledge = all(
    ctx,
    "SELECT id,name FROM knowledge WHERE module=? AND deleted_at IS NULL ORDER BY name,id",
    deckId,
  );
  const links = all(
    ctx,
    `SELECT qk.question_id,qk.knowledge_id FROM question_knowledge qk JOIN questions q ON q.id=qk.question_id JOIN knowledge k ON k.id=qk.knowledge_id WHERE q.module=? AND k.module=? AND q.deleted_at IS NULL AND k.deleted_at IS NULL`,
    deckId,
    deckId,
  );
  const faultRows = all(
    ctx,
    `SELECT f.* FROM attempt_faults f JOIN attempts a ON a.id=f.attempt_id JOIN questions q ON q.id=a.question_id WHERE q.module=? AND q.deleted_at IS NULL`,
    deckId,
  );
  const effectiveIds = new Set(effective.map((r) => r.id));
  const faults = new Map<string, Set<string>>();
  for (const f of faultRows)
    if (effectiveIds.has(f.attempt_id)) {
      const set = faults.get(f.category) ?? new Set<string>();
      set.add(f.attempt_id);
      faults.set(f.category, set);
    }
  const repeated = questions
    .map((q) => ({
      id: q.id,
      title: q.title,
      recent: effective
        .filter((r) => r.question_id === q.id)
        .slice(0, 3)
        .map((r) => ({ score: r.score, correct: !!r.correct })),
    }))
    .filter((q) => q.recent.filter((r) => !r.correct).length >= 2);
  const unstable = rows.filter((r) => {
    if (!r.correct) return false;
    const assessment = parseAssessment(r.assessment_snapshot);
    return assessment
      ? !assessment.methodSuccessful
      : r.basis !== "independent" || r.understanding < 3;
  });
  return {
    deckId,
    deckName: deck.name,
    ruleVersion: "deck-insights-v1",
    range: input.range || "30",
    summary: {
      effective: effective.length,
      verified: new Set(effective.map((r) => r.question_id)).size,
      correctRate: effective.length
        ? Math.round(
            (effective.filter((r) => r.correct).length / effective.length) *
              1000,
          ) / 10
        : null,
      repeated: repeated.length,
      uncertain: unstable.length,
    },
    faults: [...faults]
      .map(([name, ids]) => ({ name, count: ids.size }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    repeated,
    knowledge: knowledge.map((k) => {
      const ids = new Set(
        links.filter((l) => l.knowledge_id === k.id).map((l) => l.question_id),
      );
      const failed = new Set(
        faultRows
          .filter(
            (f) => effectiveIds.has(f.attempt_id) && f.knowledge_id === k.id,
          )
          .map((f) => f.attempt_id),
      );
      return {
        id: k.id,
        name: k.name,
        linked: ids.size,
        reviewed: new Set(
          effective
            .filter((r) => ids.has(r.question_id))
            .map((r) => r.question_id),
        ).size,
        failures: failed.size,
      };
    }),
  };
}
