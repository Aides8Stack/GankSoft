/** Historical rules-v1.0 only. Never use for new scheduling. */
export const ALGORITHM_VERSION = 'rules-v1.0';
export interface ScheduleInput {
  score: number;
  previousInterval: number;
  previousMastery: number | null;
  recentScores: number[];
  now: Date;
  maxInterval: number;
}
export function schedule(input: ScheduleInput) {
  const {
    score,
    previousInterval: interval,
    previousMastery,
    recentScores,
    now,
    maxInterval,
  } = input;
  if (!Number.isInteger(score) || score < 0 || score > 4) throw new Error('评分必须在 0—4 之间');
  let days =
    score <= 1
      ? 1
      : score === 2
        ? interval
          ? Math.min(7, Math.max(1, Math.round(interval * 0.5)))
          : 2
        : score === 3
          ? interval
            ? Math.round(interval * 1.8)
            : 3
          : interval
            ? Math.round(interval * 2.5)
            : 7;
  const recent = [score, ...recentScores].slice(0, 3);
  const repeated = recent.filter((s) => s <= 1).length >= 2;
  if (repeated) days = 1;
  days = Math.min(Math.max(1, days), Math.max(1, maxInterval));
  const due = new Date(now);
  due.setDate(due.getDate() + days);
  const mastery =
    previousMastery == null ? score * 25 : Math.round(previousMastery * 0.6 + score * 25 * 0.4);
  return {
    days,
    dueAt: due.toISOString(),
    mastery,
    algorithm: ALGORITHM_VERSION,
    reason: `本次评分 ${score}；${interval ? `上次计划间隔 ${interval} 天` : '首次有效复盘'}${repeated ? '；近期重复错误' : ''}，安排 ${days} 天后复盘。`,
  };
}
