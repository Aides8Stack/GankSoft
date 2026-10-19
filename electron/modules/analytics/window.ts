import {
  all,
  one,
  required,
  type Context,
} from "../../infrastructure/context.ts";
import {
  DateSelection,
  type DateSelectionInput,
} from "../../../shared/workspace-contracts.ts";
import { calendarDay } from "../../../shared/calendar.ts";
export function resolveWindow(
  input: DateSelectionInput,
  now: Date,
  timeZone: string,
) {
  const selection = DateSelection.parse({
      range: input.range,
      start: input.start,
      end: input.end,
    }),
    end = calendarDay(now, timeZone);
  if (selection.range === "all") return { start: null, end: null, timeZone };
  if (selection.range === "custom")
    return { start: selection.start!, end: selection.end!, timeZone };
  const date = new Date(end + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() - Number(selection.range) + 1);
  return { start: date.toISOString().slice(0, 10), end, timeZone };
}
export function selectDeckReviews(
  ctx: Context,
  deckId: string,
  input: DateSelectionInput,
) {
  const deck = one(
    ctx,
    "SELECT * FROM decks WHERE id=? AND deleted_at IS NULL",
    required(deckId, "卡片集"),
  );
  if (!deck) throw Error("卡片集不存在或已删除");
  const timeZone =
    one(ctx, "SELECT value FROM settings WHERE key=?", "studyTimezone")
      ?.value || "Asia/Shanghai";
  const window = resolveWindow(input, ctx.now(), timeZone),
    memory = deck.kind === "memory";
  const cards = all(
    ctx,
    `SELECT * FROM ${memory ? "memory_cards" : "questions"} WHERE module=? AND deleted_at IS NULL`,
    deckId,
  );
  const rows = all(
    ctx,
    memory
      ? `SELECT r.*,r.card_id AS question_id FROM memory_reviews r JOIN memory_cards c ON c.id=r.card_id WHERE c.module=? AND c.deleted_at IS NULL ORDER BY r.created_at DESC,r.rowid DESC`
      : `SELECT r.* FROM attempts r JOIN questions c ON c.id=r.question_id WHERE c.module=? AND c.deleted_at IS NULL ORDER BY r.created_at DESC,r.rowid DESC`,
    deckId,
  ).filter((r) => {
    const day = calendarDay(new Date(r.created_at), timeZone);
    return (
      (!window.start || day >= window.start) &&
      (!window.end || day <= window.end)
    );
  });
  return {
    deck,
    memory,
    cards,
    rows,
    effective: rows.filter((r) => r.effective),
    window,
  };
}
export function collectionSummary(
  ctx: Context,
  p: { deckId: string } & DateSelectionInput,
) {
  const d = selectDeckReviews(ctx, p.deckId, p),
    { cards, rows, effective, memory } = d;
  const failed = (r: any) => (memory ? r.score <= 1 : !r.correct);
  const weak = cards
    .map((c) => ({
      id: c.id,
      title: c.title,
      failures: effective.filter((r) => r.question_id === c.id && failed(r))
        .length,
    }))
    .filter((c) => c.failures)
    .sort((a, b) => b.failures - a.failures || a.id.localeCompare(b.id));
  const days = new Map<string, number>();
  for (const r of rows) {
    const day = calendarDay(new Date(r.created_at), d.window.timeZone);
    days.set(day, (days.get(day) || 0) + 1);
  }
  const plans = all(
    ctx,
    `SELECT p.* FROM ${memory ? "memory_plans" : "plans"} p JOIN ${memory ? "memory_cards" : "questions"} c ON c.id=p.${memory ? "card_id" : "question_id"} WHERE c.module=? AND c.deleted_at IS NULL`,
    p.deckId,
  );
  const linked = new Set(
    all(
      ctx,
      `SELECT l.${memory ? "card_id" : "question_id"} AS id FROM ${memory ? "memory_knowledge" : "question_knowledge"} l JOIN knowledge k ON k.id=l.knowledge_id WHERE k.module=? AND k.deleted_at IS NULL`,
      p.deckId,
    ).map((r) => r.id),
  );
  return {
    deckId: p.deckId,
    kind: d.deck.kind,
    window: d.window,
    summary: {
      cards: cards.length,
      unlinked: cards.filter((c) => !linked.has(c.id)).length,
      effective: effective.length,
      practice: rows.length - effective.length,
      failures: effective.filter(failed).length,
      due: plans.filter(
        (p) => !p.paused && p.due_at && new Date(p.due_at) <= ctx.now(),
      ).length,
      paused: plans.filter((p) => p.paused).length,
    },
    weak,
    daily: [...days]
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 14)
      .map(([date, count]) => ({ date, count })),
    scores: [0, 2, 3, 4].map((score) => ({
      score,
      count: effective.filter((r) =>
        score === 0 ? r.score <= 1 : r.score === score,
      ).length,
    })),
  };
}
