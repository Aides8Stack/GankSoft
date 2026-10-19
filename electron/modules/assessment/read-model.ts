import { fsrs, type Card } from 'ts-fsrs';
import { one, type Context } from '../../infrastructure/context.ts';
import type { MemoryModel } from '../../../shared/assessment.ts';
/** Read only; computing a forgetting estimate never saves a review or moves a due date. */
export function memoryModel(ctx: Context, kind: string, cardId: string): MemoryModel | null {
  const row = one(ctx, 'SELECT data FROM scheduling WHERE kind=? AND card_id=?', kind, cardId);
  if (!row) return null;
  const card: Card = JSON.parse(row.data);
  card.due = new Date(card.due);
  if (card.last_review) card.last_review = new Date(card.last_review);
  const now = ctx.now();
  const retrieval =
    card.last_review && now.getTime() >= card.last_review.getTime()
      ? fsrs({ request_retention: 0.9, enable_fuzz: false }).get_retrievability(card, now, false)
      : null;
  const firstNewEvent =
    kind === 'question'
      ? one(
          ctx,
          "SELECT e.before_state FROM schedule_events e JOIN attempts a ON a.id=e.id WHERE a.question_id=? AND a.content_version=(SELECT content_version FROM questions WHERE id=?) AND a.assessment_snapshot<>'' ORDER BY a.created_at,a.rowid LIMIT 1",
          cardId,
          cardId,
        )
      : null;
  // A new content version starts from an empty card even if old-version logs remain.
  const legacy =
    kind === 'question' && (!firstNewEvent || JSON.parse(firstNewEvent.before_state).reps > 0);
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    retrievability: retrieval === null ? null : Math.max(0, Math.min(1, retrieval)),
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review?.toISOString() ?? null,
    legacyHistory: legacy,
  };
}
