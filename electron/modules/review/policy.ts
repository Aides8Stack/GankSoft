import { all, one, run, audit, required, type Context } from '../../infrastructure/context.ts';
import type {
  CardKind,
  SaveReviewPolicyCommand,
  DeckReviewPolicy,
} from '../../../shared/review-contract.ts';
const DAY = 86400000;
/** Deck settings are independent; legacy app settings are migration input only. */
export function deckReviewPolicy(ctx: Context, deckId: string): DeckReviewPolicy {
  const deck = one(ctx, 'SELECT id FROM decks WHERE id=?', deckId);
  if (!deck) throw new Error('卡片集不存在');
  return (
    one(ctx, 'SELECT * FROM deck_review_policies WHERE deck_id=?', deckId) ?? {
      deck_id: deckId,
      daily_limit: 15,
      max_interval_days: 365,
    }
  );
}
export function effectiveMaxInterval(
  ctx: Context,
  kind: string,
  cardId: string,
  _legacyFallback?: number,
) {
  if (kind !== 'question' && kind !== 'memory') throw new Error('卡片类型不合法');
  const card = one(
    ctx,
    `SELECT module FROM ${kind === 'question' ? 'questions' : 'memory_cards'} WHERE id=?`,
    cardId,
  );
  if (!card) throw new Error('卡片不存在');
  return effectiveReviewPolicy(ctx, kind, cardId).maxIntervalDays;
}
/** Single resolver shared by scheduling and configuration previews. */
export function effectiveReviewPolicy(ctx: Context, kind: string, cardId: string) {
  if (kind !== 'question' && kind !== 'memory') throw new Error('卡片类型不合法');
  const card = one(ctx, `SELECT module FROM ${kind === 'question' ? 'questions' : 'memory_cards'} WHERE id=? AND deleted_at IS NULL`, cardId);
  if (!card) throw new Error('卡片不存在或已删除');
  const own = one(ctx, 'SELECT max_interval_days FROM card_review_policies WHERE kind=? AND card_id=?', kind, cardId);
  return { deckId: card.module, maxIntervalDays: own?.max_interval_days ?? deckReviewPolicy(ctx, card.module).max_interval_days,
    source: own ? 'card_override' as const : 'deck_default' as const };
}
export function clampCardToPolicy(ctx: Context, kind: CardKind, id: string) {
  return false; // Moves retain the current plan; destination policy applies to the next review.
}
/** Settings can only advance an existing due date. They never count as a review. */
export function clampCurrentPlan(ctx: Context, kind: CardKind, cardId: string, days: number) {
  const table = kind === 'question' ? 'plans' : 'memory_plans';
  const key = kind === 'question' ? 'question_id' : 'card_id';
  const plan = one(ctx, `SELECT * FROM ${table} WHERE ${key}=?`, cardId);
  if (!plan) return false;
  const row = one(ctx, 'SELECT data FROM scheduling WHERE kind=? AND card_id=?', kind, cardId);
  const card = row ? JSON.parse(row.data) : null;
  // Legacy plans may predate FSRS. Use their latest effective review as the anchor.
  const last =
    card?.last_review ??
    (kind === 'question'
      ? one(
          ctx,
          'SELECT created_at FROM attempts WHERE question_id=? AND effective=1 AND content_version=(SELECT content_version FROM questions WHERE id=question_id) ORDER BY created_at DESC,rowid DESC LIMIT 1',
          cardId,
        )?.created_at
      : one(
          ctx,
          'SELECT created_at FROM memory_reviews WHERE card_id=? AND effective=1 AND card_version=(SELECT learning_version FROM memory_cards WHERE id=card_id) ORDER BY created_at DESC,rowid DESC LIMIT 1',
          cardId,
        )?.created_at);
  if (!last) return false; // No review yet: retain the first-study task.
  const limit = new Date(new Date(last).getTime() + days * DAY);
  const limitMs = limit.getTime();
  if (!Number.isFinite(limitMs)) throw new Error('复盘排期时间不合法');
  const reason = `最大复盘间隔已调整为 ${days} 天，当前排期仅提前、不延后`;
  let changed = false;
  if (new Date(plan.due_at).getTime() > limitMs) {
    run(
      ctx,
      `UPDATE ${table} SET due_at=?,interval_days=?,reason=? WHERE ${key}=?`,
      limit.toISOString(),
      Math.min(plan.interval_days, days),
      reason,
      cardId,
    );
    changed = true;
  }
  if (card && new Date(card.due).getTime() > limitMs) {
    card.due = limit.toISOString();
    card.scheduled_days = Math.min(card.scheduled_days, days);
    run(
      ctx,
      'UPDATE scheduling SET data=?,updated_at=? WHERE kind=? AND card_id=?',
      JSON.stringify(card),
      ctx.now().toISOString(),
      kind,
      cardId,
    );
    changed = true;
  }
  return changed;
}
export function saveReviewPolicy(ctx: Context, p: SaveReviewPolicyCommand) {
  if (p.kind !== 'question' && p.kind !== 'memory') throw new Error('卡片类型不合法');
  const cardId = required(p.card_id, '卡片 ID');
  const table = p.kind === 'question' ? 'questions' : 'memory_cards';
  if (!one(ctx, `SELECT id FROM ${table} WHERE id=? AND deleted_at IS NULL`, cardId))
    throw new Error('卡片不存在或已删除');
  if (
    p.max_interval_days !== null &&
    (!Number.isInteger(p.max_interval_days) || p.max_interval_days < 1 || p.max_interval_days > 3650)
  )
    throw new Error('最大复盘间隔应为 1—3650 天，或选择沿用默认值');
  if (p.max_interval_days === null)
    run(ctx, 'DELETE FROM card_review_policies WHERE kind=? AND card_id=?', p.kind, cardId);
  else
    run(
      ctx,
      'INSERT INTO card_review_policies VALUES (?,?,?) ON CONFLICT(kind,card_id) DO UPDATE SET max_interval_days=excluded.max_interval_days',
      p.kind,
      cardId,
      p.max_interval_days,
    );
  const maxIntervalDays = effectiveMaxInterval(ctx, p.kind, cardId);
  const adjusted = false;
  audit(ctx, '修改单卡复盘间隔', { ...p, maxIntervalDays, adjusted });
  return { maxIntervalDays, adjusted };
}
export function saveDeckReviewPolicy(ctx: Context, p: DeckReviewPolicy) {
  const deckId = required(p.deck_id, '卡片集');
  const deck = one(ctx, 'SELECT * FROM decks WHERE id=? AND deleted_at IS NULL', deckId);
  if (!deck) throw new Error('卡片集不存在或已删除');
  if (
    !Number.isInteger(p.daily_limit) ||
    p.daily_limit < 1 ||
    p.daily_limit > 200 ||
    !Number.isInteger(p.max_interval_days) ||
    p.max_interval_days < 1 ||
    p.max_interval_days > 3650
  )
    throw new Error('每日任务上限应为 1—200，最大间隔应为 1—3650 天');
  const before = deckReviewPolicy(ctx, deckId);
  run(
    ctx,
    'INSERT INTO deck_review_policies VALUES (?,?,?) ON CONFLICT(deck_id) DO UPDATE SET daily_limit=excluded.daily_limit,max_interval_days=excluded.max_interval_days',
    deckId,
    p.daily_limit,
    p.max_interval_days,
  );
  const adjusted = 0; // Policy changes apply on the next effective review.
  audit(ctx, '修改卡片集调度配置', { before, ...p, adjusted });
  return { adjusted };
}
