import { z } from 'zod';
import { Id, Revision } from './data.ts';
import { ContentVersion, ReviewEvent } from './unified.ts';
import { FrozenReviewEntry, ReviewAnswerDraft } from './review-details.ts';

export const ReviewSessionScope = z.strictObject({deckId:Id,sessionId:Id});
export const OpenReviewSession = z.strictObject({deckId:Id,cardIds:z.array(Id).min(1).max(500)})
  .refine(v=>new Set(v.cardIds).size===v.cardIds.length,'队列不能重复卡片');
export const ReviewSessionView = z.strictObject({
  sessionId:Id,deckId:Id,revision:Revision.min(1),index:Revision,total:Revision.min(1),
  stage:z.enum(['answer','reveal','result']),entry:FrozenReviewEntry,draft:ReviewAnswerDraft,
  paused:z.boolean(),elapsedSeconds:Revision,totalSeconds:Revision,completed:z.boolean(),
  content:ContentVersion,result:ReviewEvent.nullable(),
});
export const ChangeReviewSession = ReviewSessionScope.extend({
  expectedRevision:Revision.min(1),action:z.enum(['save','reveal','pause','resume','next']),draft:ReviewAnswerDraft.optional(),
});
export const CommitReview = ReviewSessionScope.extend({
  expectedRevision:Revision.min(1),eventId:Id,scoreTenths:z.number().int().min(0).max(100),
  faults:z.array(z.string().max(300)).max(100),gaps:z.string().max(200000),reflection:z.string().max(200000),practice:z.boolean(),
});

export const MasteryEvidence = z.strictObject({
  status:z.enum(['pending','unseen','stale','improving','insufficient','weak','suspected_weak','stable','unstable']),
  risk:z.number().min(0).max(1).nullable(),confidence:z.number().min(0).max(1),effectiveEvidenceN:z.number().nonnegative(),
  observations:Revision,distinctCards:Revision,
});
export const CardMastery = MasteryEvidence.extend({cardId:Id,cycleId:Id,historyCount:Revision});
export const KnowledgeMastery = MasteryEvidence.extend({nodeId:Id,scope:z.enum(['direct','aggregate']),cardIds:z.array(Id)});
export const HistoryInput = z.strictObject({cardId:Id,deckId:Id,after:Id.nullable().default(null),limit:Revision.min(1).max(100).default(20)});
export const HistorySummary = z.strictObject({
  eventId:Id,contentVersionId:Id,cycleId:Id,mode:ReviewEvent.shape.mode,createdAt:ReviewEvent.shape.createdAt,
  scoreTenths:ReviewEvent.shape.scoreTenths,objectiveCorrect:ReviewEvent.shape.objectiveCorrect,rating:ReviewEvent.shape.rating,
  elapsedSeconds:Revision.nullable(),
});
export const HistoryPage = z.strictObject({items:z.array(HistorySummary).max(100),nextCursor:Id.nullable()});

export const RecomputePreview = z.strictObject({encoding:z.literal('ganksoft.recompute-preview/1'),deckId:Id,
  calculatedAt:ReviewEvent.shape.createdAt,previewToken:z.string().max(5000),total:Revision,affectedCount:Revision,overriddenCount:Revision,
  rows:z.array(z.strictObject({cardId:Id,source:z.enum(['card_override','deck_default']),maxIntervalDays:Revision.min(1),
    beforeDue:ReviewEvent.shape.createdAt.nullable(),afterDue:ReviewEvent.shape.createdAt.nullable(),reason:z.string()})).max(100)});
