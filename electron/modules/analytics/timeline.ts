import { all, one, type Context } from '../../infrastructure/context.ts';
import { cardReviewStats } from '../review/analytics.ts';
import { evidenceSummary } from '../../../shared/assessment.ts';
import { assessmentTarget } from '../assessment/policy.ts';
import type { CardKind } from '../../../shared/review-contract.ts';

/** One card, one timeline. Internal revisions and historical evidence are never rewritten. */
export function cardTimeline(ctx: Context, input: { kind: CardKind; cardId: string }) {
  const data = cardReviewStats(ctx, { kind: input.kind, card_id: input.cardId });
  let previous: number | null = null;
  for (const record of data.records) {
    record.selfScoreChange =
      record.effective && record.selfScore !== null && previous !== null
        ? Math.round((record.selfScore - previous) * 10) / 10
        : null;
    if (record.effective && record.selfScore !== null) previous = record.selfScore;
  }
  data.summary.selfScoreChange =
    data.records.filter((r) => r.effective && r.selfScore !== null).at(-1)?.selfScoreChange ?? null;
  if (input.kind === 'question') {
    const rows = all(
      ctx,
      'SELECT * FROM attempts WHERE question_id=? ORDER BY created_at,rowid',
      input.cardId,
    );
    data.evidence = evidenceSummary(
      rows,
      data.currentContentVersion,
      assessmentTarget(ctx, input.cardId),
      String(
        one(ctx, "SELECT value FROM settings WHERE key='studyTimezone'")?.value ?? 'Asia/Shanghai',
      ),
      true,
    );
  }
  return data;
}
