import type { CardKind } from "./review-contract.ts";
export interface ReviewStatsQuery {
  kind: CardKind;
  card_id: string;
  /** undefined or null=all versions; lines break at content version boundaries. */
  content_version?: number | null;
}
export interface ReviewPoint {
  id: string;
  ordinal: number;
  createdAt: string;
  contentVersion: number;
  effective: boolean;
  correct: boolean | null;
  answer: string;
  /** Immutable question content at this review; null for legacy records without a snapshot. */
  question: {
    stem: string;
    options: string;
    answer: string;
    analysis: string;
    material: string;
    assets: { id: string; role: "question" | "analysis" | "response" }[];
  } | null;
  correctAnswer: string | null;
  selfScore: number | null;
  selfScoreChange: number | null;
  assessment: import("./assessment.ts").Assessment | null;
  schedulerGrade: number;
  mastery: number | null;
  elapsedSeconds: number | null;
  elapsedSource: "measured" | "missing" | "legacy_unknown" | null;
  intervalDays: number | null;
  dueAt: string | null;
  maxIntervalDays: number | null;
  thought: string;
  faultDetail: string;
  faults: string[];
  knowledgeGaps: string[];
  reflection: string;
}
export interface CardReviewStats {
  kind: CardKind;
  cardId: string;
  title: string;
  currentContentVersion: number;
  selectedVersion: number | null;
  versions: number[];
  lifetimeCount: number;
  evidence: import("./assessment.ts").EvidenceSummary | null;
  memoryModel: import("./assessment.ts").MemoryModel | null;
  summary: {
    total: number;
    effective: number;
    practice: number;
    correctRate: number | null;
    scoredCount: number;
    averageSelfScore: number | null;
    latestSelfScore: number | null;
    selfScoreChange: number | null;
    totalSeconds: number;
    averageSeconds: number | null;
    timedCount: number;
    repeatedFaults: { name: string; count: number }[];
  };
  records: ReviewPoint[];
}

/** Stable read model for one deck; rule changes stay in the analytics module. */
export interface DeckInsights {
  deckId: string;
  deckName: string;
  ruleVersion: string;
  range: "7" | "30" | "all" | "custom";
  summary: {
    effective: number;
    verified: number;
    correctRate: number | null;
    repeated: number;
    uncertain: number;
  };
  faults: { name: string; count: number }[];
  repeated: {
    id: string;
    title: string;
    recent: { score: number; correct: boolean }[];
  }[];
  knowledge: {
    id: string;
    name: string;
    linked: number;
    reviewed: number;
    failures: number;
  }[];
}

/** Common server-side collection summary, using the same date window as DeckInsights. */
export interface CollectionStatistics {
  deckId: string;
  kind: "question" | "memory";
  window: { start: string | null; end: string | null; timeZone: string };
  summary: {
    cards: number;
    unlinked: number;
    effective: number;
    practice: number;
    failures: number;
    due: number;
    paused: number;
  };
  weak: { id: string; title: string; failures: number }[];
  daily: { date: string; count: number }[];
  scores: { score: number; count: number }[];
}
