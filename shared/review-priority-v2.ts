import { PRESETS, type ReviewDeckConfig } from "./review-config.ts";
export interface QueueCandidate {
  cardId: string;
  kind: "question" | "memory";
  dueAt: string;
  overdue: number;
  severe: boolean;
  questionRisk: number;
  knowledgeRisk: number;
  coverage: number;
  knowledgeIds: string[];
  fatigue: boolean;
  specialtyBoost: number;
  reasonCodes: string[];
}
/** Stable seeded exploration never replaces reserved due work. */
const randomKey = (seed: string, id: string) => {
  let n = 2166136261;
  for (const c of seed + id) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return (n >>> 0) / 4294967296;
};
export function selectCandidates(
  candidates: QueueCandidate[],
  limit: number,
  config: ReviewDeckConfig,
  seed: string,
  specialty = false,
) {
  const weights =
    config.priorityPreset === "custom"
      ? config.weights
      : PRESETS[config.priorityPreset];
  const score = (c: QueueCandidate) => {
    const base =
      weights.question * c.questionRisk +
      weights.knowledge * c.knowledgeRisk +
      weights.overdue * c.overdue +
      weights.coverage * c.coverage;
    return (
      (base * (specialty ? c.specialtyBoost : 1) -
        (config.sameDayFatiguePenalty && c.fatigue ? 0.15 : 0)) *
        (1 - (specialty ? config.randomFraction : 0)) +
      (specialty ? config.randomFraction * randomKey(seed, c.cardId) : 0)
    );
  };
  const available = [...new Map(candidates.map((c) => [c.cardId, c])).values()];
  const chosen: QueueCandidate[] = [];
  if (!specialty && limit > 0) {
    const severe = available
      .filter((c) => c.severe)
      .sort(
        (a, b) =>
          Date.parse(a.dueAt) - Date.parse(b.dueAt) ||
          a.cardId.localeCompare(b.cardId),
      );
    // At least one severe item prevents starvation even when weighted risk dominates.
    chosen.push(
      ...severe.slice(
        0,
        Math.max(1, Math.ceil(limit * config.severeOverdueReserve)),
      ),
    );
  }
  const covered = new Set<string>(chosen.flatMap((c) => c.knowledgeIds));
  while (chosen.length < limit) {
    const rest = available.filter(
      (c) => !chosen.some((x) => x.cardId === c.cardId),
    );
    if (!rest.length) break;
    const diversity = (c: QueueCandidate) =>
      config.diversityMode === "focus"
        ? 0
        : (config.diversityMode === "spread" ? 0.2 : 0.08) *
          (c.knowledgeIds.some((k) => !covered.has(k)) ? 1 : 0);
    rest.sort(
      (a, b) =>
        score(b) + diversity(b) - (score(a) + diversity(a)) ||
        Date.parse(a.dueAt) - Date.parse(b.dueAt) ||
        a.cardId.localeCompare(b.cardId),
    );
    const c = rest[0];
    chosen.push(c);
    for (const k of c.knowledgeIds) covered.add(k);
  }
  return chosen.map((c) => ({
    ...c,
    score: score(c),
    reasonCodes: [
      ...c.reasonCodes,
      ...(chosen[0]?.cardId === c.cardId && c.severe && !specialty
        ? ["severe_overdue_fairness"]
        : []),
    ],
  }));
}
