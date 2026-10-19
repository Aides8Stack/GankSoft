import { calendarDay } from "./calendar.ts";
export interface EvidenceEvent {
  id: string;
  cardId: string;
  at: string;
  timezone: string;
  independent: boolean;
  positive: boolean;
  negative: boolean;
  practice: boolean;
  credit: number;
  faults: string[];
}
export interface EvidenceRule {
  evidenceHalfLifeDays: number;
  knowledgePerQuestionCreditCap: number;
  repeatPenalty: "sqrt" | "linear" | "none";
}
/** Explainable evidence index, never a calibrated mastery probability. No history window. */
export function analyzeEvidence(
  events: EvidenceEvent[],
  now: Date,
  rule: EvidenceRule,
  coverageTotal = 1,
  knowledge = false,
) {
  let good = 0,
    bad = 0,
    recentGood = 0,
    recentBad = 0,
    oldGood = 0,
    oldBad = 0,
    last = -Infinity,
    lastAge = Infinity;
  const seen = new Set<string>(),
    cards = new Set<string>(),
    days = new Set<string>(),
    credits = new Map<string, number>(),
    exposures = new Map<string, number>();
  let band: "stable" | "weak" | "neutral" = "neutral";
  let observations = 0,
    invalid = 0;
  const faults: Record<string, number> = {};
  for (const e of [...events].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id),
  )) {
    const time = Date.parse(e.at);
    if (!Number.isFinite(time) || time > now.getTime()) {
      invalid++;
      continue;
    }
    observations++;
    if (!e.independent || e.practice || (!e.positive && !e.negative)) continue;
    const day = calendarDay(new Date(time), e.timezone);
    const unique = e.cardId + ":" + day;
    if (seen.has(unique)) continue;
    seen.add(unique);
    const age = Math.max(0,(Date.parse(calendarDay(now,e.timezone)+"T00:00:00Z")-Date.parse(day+"T00:00:00Z"))/86400000);
    let w = Math.pow(2, -age / rule.evidenceHalfLifeDays) * e.credit;
    const n = (exposures.get(e.cardId) ?? 0) + 1;
    exposures.set(e.cardId, n);
    if (knowledge) {
      w *=
        rule.repeatPenalty === "sqrt"
          ? 1 / Math.sqrt(n)
          : rule.repeatPenalty === "linear"
            ? 1 / n
            : 1;
      w = Math.min(
        w,
        Math.max(
          0,
          rule.knowledgePerQuestionCreditCap - (credits.get(e.cardId) ?? 0),
        ),
      );
    }
    credits.set(e.cardId, (credits.get(e.cardId) ?? 0) + w);
    cards.add(e.cardId);
    days.add(day);
    last = Math.max(last, time);
    lastAge = Math.min(lastAge,age);
    if (e.positive) {
      good += w;
      if (age <= rule.evidenceHalfLifeDays) recentGood += w;
      else oldGood += w;
    }
    if (e.negative) {
      bad += w;
      if (age <= rule.evidenceHalfLifeDays) recentBad += w;
      else oldBad += w;
      for (const f of new Set(e.faults)) faults[f] = (faults[f] ?? 0) + w;
    }
    const r = (1.5 + bad) / (3 + good + bad);
    band =
      r >= 0.65
        ? "weak"
        : r <= 0.35
          ? "stable"
          : band === "weak" && r >= 0.55
            ? "weak"
            : band === "stable" && r <= 0.45
              ? "stable"
              : "neutral";
  }
  const n = good + bad;
  const risk = n ? (1.5 + bad) / (3 + n) : null;
  const coverage = Math.min(1, cards.size / Math.max(1, coverageTotal));
  const confidence =
    (1 - Math.exp(-n / 4)) *
    (1 - Math.exp(-days.size / 3)) *
    (knowledge ? (1 - Math.exp(-cards.size / 3)) * Math.sqrt(coverage) : 1);
  const stale =
    Number.isFinite(last) &&
    lastAge > rule.evidenceHalfLifeDays * 2;
  const recentRisk = (1.5 + recentBad) / (3 + recentGood + recentBad),
    oldRisk = (1.5 + oldBad) / (3 + oldGood + oldBad);
  const improving = oldBad > 0 && recentGood > 0 && recentRisk < oldRisk - 0.08;
  // Wide neutral zone: one contradictory observation does not flip weak/stable directly.
  const status:
    | "unseen"
    | "stale"
    | "improving"
    | "insufficient"
    | "weak"
    | "suspected_weak"
    | "stable"
    | "unstable" = !n
    ? "unseen"
    : stale
      ? "stale"
      : improving
        ? "improving"
        : confidence < 0.15
          ? "insufficient"
          : band === "weak"
            ? "weak"
            : risk! >= 0.55
              ? "suspected_weak"
              : band === "stable" && confidence >= 0.4
                ? "stable"
                : "unstable";
  return {
    status,
    risk,
    confidence,
    coverage,
    coverageGap: coverage < 1,
    effectiveEvidenceN: n,
    good,
    bad,
    distinctCards: cards.size,
    distinctDays: days.size,
    observations,
    invalidEvents: invalid,
    stale,
    improving,
    faults,
    reasonCodes: [
      ...(!n ? ["insufficient_evidence"] : []),
      ...(stale ? ["stale_evidence"] : []),
      ...(coverage < 1 ? ["coverage_gap"] : []),
      ...(improving ? ["recent_improvement"] : []),
    ],
  };
}
