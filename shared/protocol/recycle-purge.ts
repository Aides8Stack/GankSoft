import {z} from 'zod';
import {Id,Revision} from './data.ts';
import {RecycleImpactInput,RecycleImpact} from './recycle-impact.ts';
export const PurgeScope=z.discriminatedUnion('kind',[
 RecycleImpactInput.options[0],RecycleImpactInput.options[1],
 RecycleImpactInput.options[2].extend({nodeId:Id.optional(),scope:z.enum(['node','subtree']).default('node')}),
]);
export const PurgePreview=RecycleImpact.omit({execution:true,blockers:true}).extend({
 execution:z.enum(['ready','blocked']),blockers:z.array(z.string().max(400)).max(50),
 previewToken:z.string().max(200000).nullable(),
 effects:z.array(z.strictObject({table:z.string().max(100),deleted:Revision,updated:Revision,created:Revision})).max(100),
 preservedCards:Revision,retainedFiles:Revision,
});
export const PurgeCommand=z.strictObject({previewToken:z.string().min(1).max(200000),confirmation:z.literal('永久删除并销毁所选对象历史')});
export const PurgeResult=z.strictObject({purged:z.literal(true),kind:z.enum(['cards','deck','knowledge']),objects:Revision,retainedFiles:Revision});
