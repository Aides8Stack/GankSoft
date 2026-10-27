import { z } from 'zod';
import { NativeReviewDetails } from './review-details.ts';
import { ratingFromTenths, SCORE_MAPPING_VERSION } from './unified-rating.ts';
import { Id, Revision, Text, Timestamp } from './data.ts';

export const CardMode = z.enum(['question', 'qa', 'direct']);
const QuestionFields = z.strictObject({
  stem: Text, material: Text, analysis: Text, source: Text, initialThought: Text.optional(),
  options: z.array(z.strictObject({ optionId: Id, position: Revision, markdown: Text })).min(2).max(100),
  correctOptionId: Id,
}).superRefine((v, c) => {
  if (new Set(v.options.map(o => o.optionId)).size !== v.options.length ||
      new Set(v.options.map(o => o.position)).size !== v.options.length ||
      !v.options.some(o => o.optionId === v.correctOptionId))
    c.addIssue({ code: 'custom', message: '选项身份/位置必须唯一，正确答案必须引用一个选项' });
});
// Legacy options remain text until a verified conversion, never guessed from line breaks.
export const ContentPayload = z.discriminatedUnion('encoding', [
  z.strictObject({ encoding: z.literal('question-v1'), mode: z.literal('question'), fields: QuestionFields }),
  z.strictObject({ encoding: z.literal('legacy-question-604'), mode: z.literal('question'), fields: z.strictObject({
    stem: Text, options: Text, answer: z.string(), analysis: Text, material: Text, source: Text, initialThought: Text,
  }) }),
  z.strictObject({ encoding: z.literal('qa-v1'), mode: z.literal('qa'), fields: z.strictObject({ front: Text, back: Text, supplement: Text, source: Text }) }),
  z.strictObject({ encoding: z.literal('direct-v1'), mode: z.literal('direct'), fields: z.strictObject({ body: Text, source: Text }) }),
]);
export const MediaReference = z.strictObject({
  placementId: Id, assetId: Id, fileName: z.string().regex(/^[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i),
  mime: z.enum(['image/png', 'image/jpeg', 'image/webp']), role: z.enum(['question', 'analysis', 'response']),
  width: z.number().min(1).max(100).nullable(),
});
export const ContentVersion = z.strictObject({
  versionId: Id, cardId: Id, mode: CardMode, title: z.string().max(300),
  availability: z.enum(['known', 'partial', 'unknown']), payload: ContentPayload.nullable(),
  mediaRefs: z.array(MediaReference), publishedAt: Timestamp.nullable(),
  source: z.strictObject({
    schema: z.number().int(), kind: z.enum(['legacy-current', 'legacy-event', 'published']),
    key: Id, ordinal: Revision.nullable(), wireToken: z.uuid().nullable(), rawJson: z.string().nullable(),
  }),
}).superRefine((v, c) => {
  if ((v.payload && v.payload.mode !== v.mode) || (v.availability === 'known' && !v.payload) ||
      (v.availability === 'unknown' && v.payload))
    c.addIssue({ code: 'custom', message: '内容模式或缺失状态不一致' });
});
export const Card = z.strictObject({
  cardId: Id, deckId: Id, publishedType: CardMode, currentVersionId: Id, currentCycleId: Id,
  revision: Revision, deletedAt: Timestamp.nullable(), legacyKind: z.enum(['question', 'memory']).nullable(),
});
export const CardDraft = z.strictObject({
  cardId: Id, draftType: CardMode, payload: ContentPayload,
  revision: Revision, basePublishedRevision: Revision, updatedAt: Timestamp,
}).superRefine((v, c) => {
  if (v.payload.mode !== v.draftType) c.addIssue({ code: 'custom', message: '草稿只能包含当前一种模式' });
});
export const StudyCycle = z.strictObject({
  cycleId: Id, cardId: Id, startedAt: Timestamp.nullable(),
  provenance: z.enum(['legacy-segment', 'explicit-relearn']), sourceOrdinal: Revision.nullable(),
});
export const ReviewEvent = z.strictObject({
  eventId: Id, cardId: Id, deckIdAtEvent: Id.nullable(), contentVersionId: Id, cycleId: Id,
  mode: CardMode, createdAt: Timestamp,
  scoreTenths: z.number().int().min(0).max(100).nullable(), objectiveCorrect: z.boolean().nullable(),
  rating: z.enum(['again', 'hard', 'good', 'easy']).nullable(),
  mappingVersion: z.string(), engineVersion: z.string(),
  legacyScale: z.literal('0-4').nullable(), legacyScore: z.number().int().min(0).max(4).nullable(),
  legacySelfScore: z.number().min(0).max(10).nullable(), legacyRating: z.number().int().nullable(),
  legacyRaw: z.string().nullable(), knowledgeSnapshot: z.string().nullable(),
  native: NativeReviewDetails.optional(),
}).superRefine((v,c)=>{
  if(v.native && (v.mappingVersion!==SCORE_MAPPING_VERSION || v.scoreTenths===null || v.legacyScale!==null ||
    (v.mode==='question' ? v.objectiveCorrect===null : v.objectiveCorrect!==null) ||
    (v.scoreTenths!==null && v.rating!==ratingFromTenths(v.scoreTenths,v.objectiveCorrect))))
    c.addIssue({code:'custom',message:'统一复盘评分或规则快照不一致'});
  if(v.mappingVersion===SCORE_MAPPING_VERSION && !v.native)
    c.addIssue({code:'custom',message:'统一复盘缺少事件明细'});
});
export const Summary = z.strictObject({
  cardId: Id, deckId: Id, title: z.string().max(300), publishedType: CardMode,
  contentVersionId: Id, revision: Revision, dueAt: Timestamp.nullable(),
  paused: z.boolean(), knowledgeCount: Revision,
});
export const SummaryInput = z.strictObject({
  deckId: Id, filters: z.strictObject({ mode: CardMode.optional(),query:z.string().max(300).default('') }).default(()=>({query:''})),
  cursor: z.string().max(2000).nullable().default(null), limit: z.number().int().min(1).max(100).default(50),
});
export const SummaryPage = z.strictObject({ items: z.array(Summary).max(100), nextCursor: z.string().nullable(), dataRevision: Revision });
export const ContentInput = z.strictObject({ cardId: Id, deckId: Id, versionId: Id.optional() });
export const VersionInput = z.strictObject({ cardId: Id, deckId: Id, versionId: Id });
export type ContentVersionDTO = z.infer<typeof ContentVersion>;
export type ContentPayloadDTO = z.infer<typeof ContentPayload>;
export type SummaryInputDTO = z.infer<typeof SummaryInput>;
export type SummaryPageDTO = z.infer<typeof SummaryPage>;
export type ReviewEventDTO = z.infer<typeof ReviewEvent>;
