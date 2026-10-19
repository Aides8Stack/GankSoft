import { calendarDay } from './calendar.ts';
import { DomainError } from './domain-error.ts';
import { validateSelfScore, assessedGrade, objectiveGrade } from './self-assessment.ts';
export const EVALUATION_VERSION = 'exam-evaluation-v1';
export type Basis = 'independent' | 'guess' | 'remember' | 'hint';
export type TargetMode = 'inherit' | 'custom' | 'none';
export interface AssessmentInput {
  correct: boolean;
  basis: Basis;
  understanding: number;
  selfScore: number | null;
  elapsedSeconds: number | null;
  targetSeconds: number | null;
  practice: boolean;
}
export interface Assessment {
  version: typeof EVALUATION_VERSION;
  correct: boolean;
  basis: Basis;
  understanding: number;
  selfScore: number | null;
  methodSuccessful: boolean;
  eligible: boolean;
  grade: number;
  gradeBeforeEfficiency: number;
  elapsedSeconds: number | null;
  targetSeconds: number | null;
  efficiency: 'unconfigured' | 'unmeasured' | 'within_target' | 'overtime';
  timeRatio: number | null;
  contribution:
    | 'eligible'
    | 'effective'
    | 'early_regression'
    | 'same_day'
    | 'practice'
    | 'guess'
    | 'remember'
    | 'hint';
  reasons: string[];
}
export function targetSeconds(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 86400)
    throw new DomainError('VALIDATION_ERROR', '目标用时应为1—86400秒，或不设置', {
      target_seconds: '请输入整数秒或选择不设置',
    });
  return value;
}
export function elapsedSeconds(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 86400)
    throw new DomainError('VALIDATION_ERROR', '用时不合法', {
      elapsed_seconds: '应为0—86400的数值或空值',
    });
  return Math.round(value);
}
/** Pure, shared assessment. FSRS owns memory dynamics; this module only qualifies evidence. */
export function evaluateQuestion(input: AssessmentInput): Assessment {
  if (
    typeof input.correct !== 'boolean' ||
    typeof input.practice !== 'boolean' ||
    !['independent', 'guess', 'remember', 'hint'].includes(input.basis)
  )
    throw new DomainError('VALIDATION_ERROR', '评估输入不合法');
  const selfScore = validateSelfScore(input.correct, input.selfScore);
  const time = elapsedSeconds(input.elapsedSeconds),
    target = targetSeconds(input.targetSeconds);
  let grade = assessedGrade(
    objectiveGrade(input.correct, input.basis, input.understanding),
    input.correct,
    selfScore,
  );
  const methodSuccessful =
    input.basis === 'independent' && input.correct && input.understanding >= 2;
  const reasons: string[] = [];
  if (input.basis === 'independent' && input.correct && input.understanding < 2) {
    grade = 1;
    reasons.push('答案正确但尚不能解释主要步骤，方法提取未成功，进入重学');
  }
  if (!input.correct) reasons.push('本次答案错误，不能作为成功提取');
  const contribution: Assessment['contribution'] = input.practice
    ? 'practice'
    : input.basis === 'independent'
      ? 'eligible'
      : input.basis;
  const eligible = contribution === 'eligible';
  const explanation = {
    practice: '练习记录：不更新FSRS和排期',
    guess: '猜测记录：不作为独立解题证据，不延长排期',
    remember: '记得原答案：不能证明方法掌握，不更新FSRS和排期',
    hint: '借助提示：保留学习记录，不更新FSRS和排期',
  };
  if (contribution !== 'eligible') reasons.push(explanation[contribution]);
  const efficiency: Assessment['efficiency'] =
    target === null
      ? 'unconfigured'
      : time === null || time === 0
        ? 'unmeasured'
        : time <= target
          ? 'within_target'
          : 'overtime';
  const gradeBeforeEfficiency = grade;
  if (eligible && methodSuccessful && efficiency === 'overtime' && grade === 4) {
    grade = 3;
    reasons.push('独立答对且理解方法，但超过已配置目标用时：轻松降为正常，不判遗忘');
  }
  if (eligible && !reasons.length)
    reasons.push(
      methodSuccessful ? '独立作答并能解释方法，按保守自评进入FSRS' : '独立作答尚未成功，进入重学',
    );
  return {
    version: EVALUATION_VERSION,
    correct: input.correct,
    basis: input.basis,
    understanding: input.understanding,
    selfScore,
    methodSuccessful,
    eligible,
    grade,
    gradeBeforeEfficiency,
    elapsedSeconds: time,
    targetSeconds: target,
    efficiency,
    timeRatio:
      target !== null && time !== null && time > 0 ? Math.round((time / target) * 100) / 100 : null,
    contribution,
    reasons,
  };
}
export function parseAssessment(raw: string | null | undefined): Assessment | null {
  if (!raw) return null;
  const a = JSON.parse(raw);
  if (
    !a ||
    a.version !== EVALUATION_VERSION ||
    typeof a.correct !== 'boolean' ||
    typeof a.methodSuccessful !== 'boolean' ||
    typeof a.eligible !== 'boolean' ||
    !Number.isInteger(a.grade) ||
    a.grade < 0 ||
    a.grade > 4 ||
    !['independent', 'guess', 'remember', 'hint'].includes(a.basis) ||
    ![
      'eligible',
      'effective',
      'early_regression',
      'same_day',
      'practice',
      'guess',
      'remember',
      'hint',
    ].includes(a.contribution) ||
    !['unconfigured', 'unmeasured', 'within_target', 'overtime'].includes(a.efficiency) ||
    !Array.isArray(a.reasons) ||
    a.reasons.some((v: unknown) => typeof v !== 'string')
  )
    throw new Error('复盘评估快照结构损坏');
  const expected = evaluateQuestion({
    correct: a.correct,
    basis: a.basis,
    understanding: a.understanding,
    selfScore: a.selfScore,
    elapsedSeconds: a.elapsedSeconds,
    targetSeconds: a.targetSeconds,
    practice: a.contribution === 'practice',
  });
  if (
    a.eligible !== expected.eligible ||
    a.methodSuccessful !== expected.methodSuccessful ||
    a.grade !== expected.grade ||
    a.gradeBeforeEfficiency !== expected.gradeBeforeEfficiency ||
    a.efficiency !== expected.efficiency ||
    a.timeRatio !== expected.timeRatio ||
    a.selfScore !== expected.selfScore ||
    a.elapsedSeconds !== expected.elapsedSeconds ||
    (a.eligible && !['effective', 'early_regression', 'same_day'].includes(a.contribution)) ||
    (!a.eligible && a.contribution !== expected.contribution)
  )
    throw new Error('复盘评估快照语义不一致');
  return a;
}
export interface AssessmentPolicyRow {
  question_id: string;
  mode: 'custom' | 'none';
  target_seconds: number | null;
}
export interface DeckAssessmentPolicyRow {
  deck_id: string;
  target_seconds: number | null;
}
export function resolvedTarget(
  cardId: string,
  deckId: string,
  cards: AssessmentPolicyRow[],
  decks: DeckAssessmentPolicyRow[],
): number | null {
  const card = cards.find((p) => p.question_id === cardId);
  return card
    ? card.target_seconds
    : (decks.find((p) => p.deck_id === deckId)?.target_seconds ?? null);
}
export interface EvidenceSummary {
  contentVersion: number;
  days: number;
  totalIndependent: number;
  answerCorrectRate: number | null;
  methodSuccessRate: number | null;
  targetSeconds: number | null;
  timedDays: number;
  withinTargetDays: number;
  sufficient: boolean;
  message: string;
}
export function evidenceSummary(
  rows: {
    created_at: string;
    effective: number;
    content_version: number;
    assessment_snapshot?: string;
  }[],
  version: number,
  target: number | null,
  timeZone = 'Asia/Shanghai',
  allRecords = false,
): EvidenceSummary {
  const days = new Map<string, Assessment>();
  let totalIndependent = 0;
  for (const row of rows) {
    if (!row.effective || (!allRecords && row.content_version !== version)) continue;
    const a = parseAssessment(row.assessment_snapshot);
    if (!a || !a.eligible || a.basis !== 'independent') continue;
    totalIndependent++;
    const date = new Date(row.created_at);
    const day = calendarDay(date, timeZone);
    days.set(day, a); // latest eligible result per calendar day; cramming does not inflate evidence days
  }
  const sample = [...days.values()].slice(-10),
    n = sample.length;
  const timed = sample.filter(
    (a) =>
      a.methodSuccessful && a.targetSeconds === target && target !== null && a.timeRatio !== null,
  );
  const sufficient = n >= 3;
  return {
    contentVersion: version,
    days: n,
    totalIndependent,
    answerCorrectRate: n
      ? Math.round((sample.filter((a) => a.correct).length / n) * 1000) / 10
      : null,
    methodSuccessRate: n
      ? Math.round((sample.filter((a) => a.methodSuccessful).length / n) * 1000) / 10
      : null,
    targetSeconds: target,
    timedDays: timed.length,
    withinTargetDays: timed.filter((a) => a.efficiency === 'within_target').length,
    sufficient,
    message: !sufficient
      ? '跨日独立证据不足：至少积累3个日期，仅描述本题表现'
      : sample.slice(-3).every((a) => a.methodSuccessful)
        ? '最近3个独立复盘日均能解释方法；不代表已掌握同类题'
        : '最近的独立表现仍有方法或答案失误，建议继续巩固',
  };
}

export interface MemoryModel {
  stability: number;
  difficulty: number;
  retrievability: number | null;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
  legacyHistory: boolean;
}
