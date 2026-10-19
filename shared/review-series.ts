/** Pure chart model: no database, Vue state, scheduling or IPC dependencies. */
export interface QuantitativeReview {
  id: string;
  ordinal: number;
  createdAt: string;
  selfScore: number | null;
  elapsedSeconds: number | null;
  correct: boolean | null;
  effective: boolean;
  contentVersion?: number;
}
export type ReviewMetric = 'selfScore' | 'elapsedSeconds';
export function reviewSeries(records: QuantitativeReview[], metric: ReviewMetric) {
  const values = records.map((r) => r[metric]);
  const present = values.filter((v): v is number => v !== null && Number.isFinite(v));
  const rawMax = Math.max(1, ...present);
  const ceiling = metric === 'selfScore' ? 10 : Math.max(10, Math.ceil(rawMax / 10) * 10);
  const points = records.map((r, i) => ({
    ...r,
    value: values[i],
    x: 55 + (records.length <= 1 ? 300 : (i * 590) / (records.length - 1)),
    y: values[i] == null ? null : 210 - (values[i]! / ceiling) * 180,
  }));
  const segments = points
    .slice(1)
    .flatMap((p, i) =>
      p.y !== null && points[i].y !== null && p.contentVersion === points[i].contentVersion
        ? [{ a: points[i], b: p }]
        : [],
    );
  return {
    points,
    segments,
    ceiling,
    ticks: [0, ceiling / 2, ceiling],
    hasValues: present.length > 0,
  };
}
