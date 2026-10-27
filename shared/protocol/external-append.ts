import {z} from 'zod';
import {Id,Revision} from './data.ts';
const Hash=z.string().regex(/^[a-f0-9]{64}$/);
export const AppendConfirmation=z.strictObject({
 operationId:z.uuid(),previewId:z.uuid(),expectedEpoch:z.uuid(),expectedRevision:Revision,
 targetDigest:Hash,sourceSnapshot:Hash,sourceGraphDigest:Hash,selectedDeckIds:z.array(Id).min(1).max(100),
 forceIndependent:z.boolean(),folderId:Id.nullable(),appendIndependent:z.literal(true),
});
export type AppendConfirmationDTO=z.infer<typeof AppendConfirmation>;
export const AppendReceipt=z.strictObject({
 encoding:z.literal('ganksoft.independent-append-result/1'),operationId:z.uuid(),requestHash:Hash,
 imported:z.array(z.strictObject({sourceDeckId:Id,destinationDeckId:Id,sourceVersion:Hash})).max(100),
 skippedDeckIds:z.array(Id).max(100),blockedDeckIds:z.array(Id).max(100),createdAt:z.iso.datetime(),
});
export type AppendReceiptDTO=z.infer<typeof AppendReceipt>;

export const AppendSelection=z.strictObject({scanId:z.uuid(),selectedDeckIds:z.array(Id).min(1).max(100),forceIndependent:z.boolean(),folderId:Id.nullable()});
export const AppendDependencies=z.strictObject({snapshotDigest:Hash,selectedDeckIds:z.array(Id).max(100),closed:z.boolean(),requiredDecks:z.array(z.strictObject({
 sourceDeckId:Id,name:z.string(),reasons:z.array(z.strictObject({fromDeckId:Id,kind:z.enum(['legacy-question-origin','historical-evidence-deck','knowledge-relation','knowledge-preference','archived-page-card','session-card']),sourceId:Id}))
})).max(100)});
export const AppendDuplicatePlan=z.strictObject({importDeckIds:z.array(Id).max(100),skippedDeckIds:z.array(Id).max(100),blockedDeckIds:z.array(Id).max(100),forceIndependent:z.boolean()});
export const AppendPlan=z.strictObject({selection:AppendDependencies,duplicates:AppendDuplicatePlan.nullable(),confirmation:AppendConfirmation.nullable()});
export const AppendResult=AppendReceipt.extend({state:z.literal('committed'),epoch:z.uuid(),recoveryPointAvailable:z.boolean(),reopened:z.boolean()});
export const AppendStatus=z.strictObject({operationId:z.uuid(),state:z.enum(['preparing','prepared','committed','aborted']),epoch:z.uuid(),recoveryPointAvailable:z.boolean(),reopened:z.boolean(),result:AppendResult.nullable()});
