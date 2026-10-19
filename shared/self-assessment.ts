import { DomainError } from './domain-error.ts';
/** A user score is separate from objective correctness and the 0–4 scheduler grade. */
export function validateSelfScore(correct: boolean, value: unknown): number | null {
  if (value == null) return null; // Pre-v0.4.10 clients and histories remain compatible.
  const rounded = typeof value === 'number' ? Math.round(value * 10) / 10 : NaN;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 10 ||
    Math.abs(value * 10 - Math.round(value * 10)) > 1e-8 ||
    (correct ? rounded < 6 : rounded >= 6)
  )
    throw new DomainError(
      'VALIDATION_ERROR',
      correct ? '答对时自评分应为 6.0—10.0，步进 0.1 分' : '答错时自评分应为 0.0—5.9，步进 0.1 分',
      { self_score: '范围或步进不合法' },
    );
  return rounded;
}
export function assessedGrade(base: number, correct: boolean, selfScore: number | null) {
  if (selfScore == null) return base;
  const assessment = correct ? (selfScore < 7 ? 2 : selfScore < 9 ? 3 : 4) : selfScore < 3 ? 0 : 1;
  return Math.min(base, assessment);
}

export function objectiveGrade(correct: boolean, basis: string, understanding: number): number {
  if (!Number.isInteger(understanding) || understanding < 0 || understanding > 3)
    throw new Error('理解评价不合法');
  if (basis === 'hint') return Math.min(understanding, 1);
  if (!correct) return understanding > 0 ? 1 : 0;
  if (basis !== 'independent' || understanding < 2) return 2;
  return understanding === 3 ? 4 : 3;
}
