import { dueEligibility, clearDueOverrides } from "./due-eligibility.ts";
import { reviewConfig } from "./config-service.ts";
import { Rating, type Card } from 'ts-fsrs';
import { nextFsrsCard, ENGINE } from './fsrs-engine.ts';
export { ENGINE } from './fsrs-engine.ts';
import { one, run, id, type Context } from '../../infrastructure/context.ts';
import { effectiveMaxInterval } from './policy.ts';
export function schedulingDue(ctx: Context, kind: string, cardId: string) {
  return dueEligibility(ctx,kind,cardId).eligible;
}
export function advance(
  ctx: Context,
  kind: string,
  cardId: string,
  score: number,
  maxInterval: number,
  reviewId: string,
  previousMastery: number | null,
  metadata: { evaluationVersion?: string } = {},
) {
  const now = ctx.now(),
    row = one(ctx, 'SELECT data FROM scheduling WHERE kind=? AND card_id=?', kind, cardId);
  const rating =
    score <= 1 ? Rating.Again : score === 2 ? Rating.Hard : score === 3 ? Rating.Good : Rating.Easy;
  maxInterval = effectiveMaxInterval(ctx, kind, cardId, maxInterval);
  const table = kind === 'question' ? 'questions' : 'memory_cards';
  const deckId = one(ctx, `SELECT module FROM ${table} WHERE id=?`, cardId).module;
  const retention = reviewConfig(ctx, deckId).config.desiredRetention;
  const result = nextFsrsCard(row ? JSON.parse(row.data) as Card : null, now, rating, maxInterval, retention);
  const before = result.before;
  clearDueOverrides(ctx,kind,cardId);
  run(
    ctx,
    'INSERT INTO scheduling VALUES (?,?,?,?) ON CONFLICT(kind,card_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at',
    kind,
    cardId,
    JSON.stringify(result.card),
    now.toISOString(),
  );
  run(
    ctx,
    'INSERT INTO schedule_events VALUES (?,?,?,?,?,?,?,?)',
    reviewId,
    kind,
    cardId,
    rating,
    JSON.stringify(before),
    JSON.stringify(result.card),
    JSON.stringify({ ...result.log, maxIntervalDays: maxInterval, desiredRetention: retention, ...metadata }),
    now.toISOString(),
  );
  return {
    maxIntervalDays: maxInterval,
    days: result.card.scheduled_days,
    dueAt: result.card.due.toISOString(),
    mastery: null,
    algorithm: ENGINE,
    rating,
    state: result.card.state,
    reason: 'FSRS 已根据本次表现和历史状态安排下次复盘：' + result.card.due.toLocaleString('zh-CN'),
  };
}
