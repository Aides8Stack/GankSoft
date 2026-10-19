import { calendarDay } from "./calendar.ts";
/** Daily task budget counts distinct cards; observations and relearning stay separate. */
export function dailyReviewBudget(
  rows: readonly {
    effective: number | boolean;
    created_at: string;
    question_id?: string;
    card_id?: string;
  }[],
  cardIds: ReadonlySet<string>,
  now: Date,
  timezone: string,
) {
  const dueIds = new Set<string>();
  let effectiveEvents = 0,
    practiceEvents = 0;
  for (const row of rows) {
    const id = row.question_id ?? row.card_id;
    if (
      !id ||
      !cardIds.has(id) ||
      calendarDay(new Date(row.created_at), timezone) !==
        calendarDay(now, timezone)
    )
      continue;
    if (row.effective) {
      effectiveEvents++;
      dueIds.add(id);
    } else practiceEvents++;
  }
  return {
    uniqueDue: dueIds.size,
    relearnEvents: effectiveEvents - dueIds.size,
    practiceEvents,
    dueIds,
  };
}
