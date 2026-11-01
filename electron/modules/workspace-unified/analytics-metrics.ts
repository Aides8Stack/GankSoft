/** W3/W4 shared scalar aggregation. No bodies, history arrays or scheduling writes. */
export function metricAccumulator() {
  return {
    cardCount: 0,
    cardsByMode: { question: 0, qa: 0, direct: 0 },
    eventCount: 0,
    gradedCount: 0,
    scoreSum: 0,
    latestScoreTenths: null as number | null,
    latestKey: "",
    objectiveCount: 0,
    correctCount: 0,
    elapsedSeconds: 0,
    dueCount: 0,
  };
}
export type MetricAccumulator = ReturnType<typeof metricAccumulator>;
export function addEvent(
  m: MetricAccumulator,
  e: {
    id: string;
    created_at: string;
    score: unknown;
    correct: unknown;
    elapsed: unknown;
  },
) {
  m.eventCount++;
  if (e.score !== null) {
    m.gradedCount++;
    m.scoreSum += Number(e.score);
    const key = e.created_at + "|" + e.id;
    if (key >= m.latestKey) {
      m.latestKey = key;
      m.latestScoreTenths = Number(e.score);
    }
  }
  if (e.correct !== null) {
    m.objectiveCount++;
    if (e.correct) m.correctCount++;
  }
  m.elapsedSeconds += Number(e.elapsed ?? 0);
}
export function mergeMetrics(m: MetricAccumulator, n: MetricAccumulator) {
  for (const k of [
    "cardCount",
    "eventCount",
    "gradedCount",
    "scoreSum",
    "objectiveCount",
    "correctCount",
    "elapsedSeconds",
    "dueCount",
  ] as const)
    m[k] += n[k];
  for (const k of ["question", "qa", "direct"] as const)
    m.cardsByMode[k] += n.cardsByMode[k];
  if (n.latestKey >= m.latestKey) {
    m.latestKey = n.latestKey;
    m.latestScoreTenths = n.latestScoreTenths;
  }
}
export function finishMetrics(m: MetricAccumulator) {
  const { scoreSum, latestKey, ...out } = m;
  return {
    ...out,
    cardsByMode: { ...out.cardsByMode },
    averageScoreTenths: m.gradedCount ? scoreSum / m.gradedCount : null,
  };
}
