import { z } from 'zod';
import { Id, Revision, Text, Timestamp } from './data.ts';

export const KnowledgePathSnapshot = z.strictObject({
  nodeId: Id, deckId: Id, path: z.array(z.string().max(300)).min(1).max(100),
});
export const SchedulePolicySnapshot = z.strictObject({
  revision: Revision, cardRevision: Revision, maxIntervalDays: z.number().int().min(1).max(3650),
  desiredRetention: z.number().min(0.8).max(0.97), source: z.enum(['card_override','deck_default']),
});
export const ScheduleOutcome = z.enum(['updated','version-conflict','cycle-conflict','schedule-conflict','practice']);
export const NativeReviewDetails = z.strictObject({
  encoding: z.literal('ganksoft.review-event/1'), sessionId: Id,
  submissionHash: z.string().regex(/^[a-f0-9]{64}$/), timezone:z.string().min(1).max(100),
  selectedOptionId: Id.nullable(), elapsedSeconds: z.number().int().min(0).max(86400),
  thought: Text, faults: z.array(z.string().max(300)).max(100), gaps: Text, reflection: Text,
  practice: z.boolean(), policy: SchedulePolicySnapshot,
  schedule: z.strictObject({ outcome: ScheduleOutcome, expectedRevision: Revision,
    beforeHash: z.string().regex(/^[a-f0-9]{64}$/), afterHash: z.string().regex(/^[a-f0-9]{64}$/).nullable() }),
  knowledge: z.array(KnowledgePathSnapshot).max(500),
});
export const UnifiedScheduleMetadata = z.strictObject({
  encoding: z.literal('ganksoft.schedule/1'), cycleId: Id, revision: Revision.min(1), eventId: Id,
});
export const NativeCardPolicy = z.strictObject({
  encoding: z.literal('ganksoft.card-policy/1'), cardId: Id,
  maxIntervalDays: z.number().int().min(1).max(3650).nullable(), revision: Revision,
});
export const ReviewAnswerDraft = z.strictObject({ selectedOptionId: Id.nullable(), thought: Text,
  scoreTenths: z.number().int().min(0).max(100).nullable(), faults: z.array(z.string().max(300)).max(100),
  gaps: Text, reflection: Text, practice: z.boolean() });
export const FrozenReviewEntry = z.strictObject({
  eventId: Id, cardId: Id, versionId: Id, cycleId: Id, scheduleRevision: Revision,
  scheduleHash: z.string().regex(/^[a-f0-9]{64}$/), timezone:z.string().min(1).max(100),
  knowledge: z.array(KnowledgePathSnapshot).max(500),
});
export const StoredReviewSession = z.strictObject({
  encoding: z.literal('ganksoft.review-session/1'), sessionId: Id, deckId: Id,
  ids: z.array(Id).min(1).max(500), index: Revision, stage: z.enum(['answer','reveal','result']),
  entry: FrozenReviewEntry, draft: ReviewAnswerDraft, revision: Revision.min(1),
  elapsedMs: Revision.max(86400000), totalMs: Revision, resumedAt: Timestamp.nullable(),
  resultEventId: Id.nullable(), completed: z.boolean(),
}).superRefine((s,c)=>{
  if(new Set(s.ids).size!==s.ids.length || s.index>=s.ids.length || s.ids[s.index]!==s.entry.cardId ||
    (s.stage==='result')!==(s.resultEventId===s.entry.eventId) || (s.completed && (s.stage!=='result'||s.index!==s.ids.length-1)))
    c.addIssue({code:'custom',message:'统一复盘会话身份或阶段不一致'});
});
