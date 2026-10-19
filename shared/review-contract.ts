/** Internal module protocol v1. Renderer and domain modules share these names and shapes. */
export type CardKind = 'question' | 'memory';
export interface DeckReviewPolicy {
  deck_id: string;
  daily_limit: number;
  max_interval_days: number;
}
export interface SaveReviewPolicyCommand {
  kind: CardKind;
  card_id: string;
  /** null inherits the owning deck default; an integer overrides it. */
  max_interval_days: number | null;
}
export type StudyStage = 'answer' | 'reveal' | 'result';
export type CommandResponse<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: string;
      code: string;
      definitive: boolean;
      fieldErrors?: Record<string, string>;
      retryable?: boolean;
    };
export interface ScheduleResult {
  maxIntervalDays?: number;
  days: number;
  dueAt: string;
  mastery: number | null;
  algorithm: string;
  rating: number;
  state: number;
  reason: string;
}
export interface ReviewResult {
  attemptId: string;
  assessment?: import('./assessment.ts').Assessment;
  reason?: string;
  selfScore?: number | null;
  score: number;
  effective: boolean;
  result: ScheduleResult | null;
}
export interface ReviewCommand {
  protocol_version?: 1 | 2;
  request_id: string;
  content_version: number;
  deck_id?: string;
  session_id?: string;
}
export interface QuestionReviewCommand extends ReviewCommand {
  question_id: string;
  question_version?: number;
  answer: string;
  thought: string;
  basis: 'independent' | 'guess' | 'remember' | 'hint';
  understanding: number;
  self_score?: number;
  elapsed_seconds?: number;
  improvement?: string;
  faults?: string[];
  error_knowledge_ids?: string[];
  fault_detail?: string;
  practice?: boolean;
}
export interface MemoryReviewCommand extends ReviewCommand {
  id: string;
  score: number;
  note?: string;
  practice?: boolean;
}
export interface SessionPort {
  validateSubmission(kind: CardKind, payload: any): void;
  recordSaved(payload: any, result: ReviewResult): void;
}
export const REVIEW_PROTOCOL_VERSION = 2;
