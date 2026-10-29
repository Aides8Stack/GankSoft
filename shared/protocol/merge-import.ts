import {z} from 'zod';
import {Id,Revision} from './data.ts';
const Hash=z.string().regex(/^[a-f0-9]{64}$/);
export const MergeConfirmation=z.strictObject({
 operationId:z.uuid(),previewId:z.uuid(),expectedEpoch:z.uuid(),expectedRevision:Revision,
 targetDigest:Hash,sourceSnapshot:Hash,sourceGraphDigest:Hash,selectedDeckIds:z.array(Id).min(1).max(100),
 forceIndependent:z.boolean(),folderId:Id.nullable(),importIndependent:z.literal(true),
});
export type MergeConfirmationDTO=z.infer<typeof MergeConfirmation>;
export const MergeReceipt=z.strictObject({
 encoding:z.literal('ganksoft.independent-import-result/1'),operationId:z.uuid(),requestHash:Hash,
 imported:z.array(z.strictObject({sourceDeckId:Id,destinationDeckId:Id,sourceVersion:Hash})).max(100),
 skippedDeckIds:z.array(Id).max(100),blockedDeckIds:z.array(Id).max(100),createdAt:z.iso.datetime(),
});
export type MergeReceiptDTO=z.infer<typeof MergeReceipt>;

export const MergeSelection=z.strictObject({scanId:z.uuid(),selectedDeckIds:z.array(Id).min(1).max(100),forceIndependent:z.boolean(),folderId:Id.nullable()});
export const MergeDependencies=z.strictObject({snapshotDigest:Hash,selectedDeckIds:z.array(Id).max(100),closed:z.boolean(),requiredDecks:z.array(z.strictObject({
 sourceDeckId:Id,name:z.string(),reasons:z.array(z.strictObject({fromDeckId:Id,kind:z.enum(['legacy-question-origin','historical-evidence-deck','knowledge-relation','knowledge-preference','archived-page-card','session-card']),sourceId:Id}))
})).max(100)});
export const MergeDuplicatePlan=z.strictObject({importDeckIds:z.array(Id).max(100),skippedDeckIds:z.array(Id).max(100),blockedDeckIds:z.array(Id).max(100),forceIndependent:z.boolean()});
export const MergeImpact=z.strictObject({decks:z.number().int().nonnegative(),cards:z.number().int().nonnegative(),knowledge:z.number().int().nonnegative(),reviewEvents:z.number().int().nonnegative(),drafts:z.number().int().nonnegative(),schedules:z.number().int().nonnegative(),mediaFiles:z.number().int().nonnegative(),mediaBytes:z.number().int().nonnegative()});
export const MergePlan=z.strictObject({selection:MergeDependencies,duplicates:MergeDuplicatePlan.nullable(),confirmation:MergeConfirmation.nullable(),impact:MergeImpact.nullable().default(null)});
export const MergeResult=MergeReceipt.extend({state:z.literal('committed'),epoch:z.uuid(),recoveryPointAvailable:z.boolean(),reopened:z.boolean()});
export const MergeStatus=z.strictObject({operationId:z.uuid(),state:z.enum(['preparing','prepared','committed','aborted']),epoch:z.uuid(),recoveryPointAvailable:z.boolean(),reopened:z.boolean(),result:MergeResult.nullable()});

import {ExternalScanSummary,ExternalDeckPage} from './database-snapshot.ts';
export const MergeScanSummary=ExternalScanSummary.extend({schemaVersion:z.literal(606)});
export const MergeDeckPage=ExternalDeckPage;
