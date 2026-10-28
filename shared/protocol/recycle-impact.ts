import {z} from 'zod';
import {Id,Revision} from './data.ts';
const Cards=z.array(z.strictObject({cardId:Id,expectedRevision:Revision.min(1)})).min(1).max(500).refine(v=>new Set(v.map(c=>c.cardId)).size===v.length,'选择不能重复');
export const RecycleImpactInput=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('cards'),deckId:Id,cards:Cards}),
 z.strictObject({kind:z.literal('deck'),deckId:Id,expectedRevision:Revision.min(1)}),
 z.strictObject({kind:z.literal('knowledge'),deckId:Id,batchId:Id}),
]);
export const RecycleImpact=z.strictObject({
 kind:z.enum(['cards','deck','knowledge']),deckId:Id,epoch:z.uuid(),fingerprint:z.string().regex(/^[a-f0-9]{64}$/),
 objects:z.array(z.strictObject({kind:z.enum(['card','deck','knowledge','draft']),id:Id,label:z.string().max(300),revision:Revision.min(1)})).max(10000),
 counts:z.strictObject({cards:Revision,knowledge:Revision,versions:Revision,cycles:Revision,events:Revision,drafts:Revision,newDrafts:Revision,schedules:Revision,sessions:Revision,referenceDocuments:Revision,imageReferences:Revision}),
 execution:z.literal('blocked'),blockers:z.array(z.string().max(400)).min(1).max(10),
 filePolicy:z.literal('retain-all'),
});
