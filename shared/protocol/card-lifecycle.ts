import {z} from 'zod';
import {Id,Revision,Timestamp} from './data.ts';
import {CardMode} from './unified.ts';
import {StoredReviewSession} from './review-details.ts';

const Selection=z.array(z.strictObject({cardId:Id,expectedRevision:Revision.min(1)})).min(1).max(500)
 .refine(v=>new Set(v.map(c=>c.cardId)).size===v.length,'卡片选择不能重复');
const Scope={deckId:Id,cards:Selection};
export const BatchCards=z.discriminatedUnion('action',[
 z.strictObject({...Scope,action:z.literal('delete')}),
 z.strictObject({...Scope,action:z.literal('move'),targetDeckId:Id,expectedTargetRevision:Revision.min(1)}),
]);
export const RestoreCards=z.strictObject(Scope);
export const CardsChanged=z.strictObject({count:Revision.min(1),action:z.enum(['delete','move','restore'])});
export const RecycleCardsInput=z.strictObject({deckId:Id,after:Id.nullable().default(null),limit:Revision.min(1).max(100).default(30)});
export const RecycleCardsPage=z.strictObject({items:z.array(z.strictObject({cardId:Id,title:z.string().max(300),publishedType:CardMode,revision:Revision.min(1),deletedAt:Timestamp})).max(100),nextCursor:Id.nullable()});
export const ArchivedReviewSession=z.strictObject({encoding:z.literal('ganksoft.archived-session/1'),reason:z.literal('card-move'),document:StoredReviewSession}).refine(v=>v.document.completed,'仅已完成的复盘页面可归档');
