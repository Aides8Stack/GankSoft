import { ProtocolError } from './data.ts';

export const SCORE_MAPPING_VERSION = 'self-score-tenths/1';
export type UnifiedRating = 'again' | 'hard' | 'good' | 'easy';
/** The subjective score is never rewritten to agree with the objective result. */
export function ratingFromTenths(scoreTenths: number, objectiveCorrect: boolean | null): UnifiedRating {
  if (!Number.isInteger(scoreTenths) || scoreTenths < 0 || scoreTenths > 100 ||
      (objectiveCorrect !== null && typeof objectiveCorrect !== 'boolean'))
    throw new ProtocolError('VALIDATION_ERROR', '自评应为0.0–10.0，步长0.1');
  if (objectiveCorrect === false || scoreTenths <= 59) return 'again';
  if (scoreTenths <= 74) return 'hard';
  if (scoreTenths <= 89) return 'good';
  return 'easy';
}
