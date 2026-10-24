import { createEmptyCard, fsrs, type Card, type Grade } from 'ts-fsrs';

export const ENGINE = 'FSRS-6 / ts-fsrs 5.4.2';
/** Shared algorithm adapter; persistence, ownership and concurrency belong to callers. */
export function nextFsrsCard(previous: Card | null, now: Date, rating: Grade, maxIntervalDays: number, retention: number) {
  const before: Card = previous ? structuredClone(previous) : createEmptyCard(now);
  before.due = new Date(before.due);
  if (before.last_review) before.last_review = new Date(before.last_review);
  const result = fsrs({ request_retention: retention, maximum_interval: maxIntervalDays, enable_fuzz: false })
    .next(before, now, rating);
  const ceiling = now.getTime() + maxIntervalDays * 86400000;
  if (result.card.due.getTime() > ceiling) {
    result.card.due = new Date(ceiling);
    result.card.scheduled_days = maxIntervalDays;
    result.log.scheduled_days = maxIntervalDays;
  }
  return { before, card: result.card, log: result.log };
}
