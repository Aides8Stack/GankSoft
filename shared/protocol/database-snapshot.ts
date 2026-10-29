import {z} from 'zod';
const Count=z.number().int().nonnegative();
export const ExternalScanSummary=z.strictObject({scanId:z.uuid(),schemaVersion:z.union([z.literal(604),z.literal(606)]),sourceGeneration:z.uuid(),
 snapshotDigest:z.string().regex(/^[a-f0-9]{64}$/),deckCount:Count,pendingOperations:Count,media:z.strictObject({files:Count,bytes:Count})});
export const ExternalDeckSummary=z.strictObject({sourceDeckId:z.string().min(1),name:z.string(),recycled:z.boolean(),
 cards:z.strictObject({active:Count,recycled:Count,question:Count.nullable(),qa:Count.nullable(),direct:Count.nullable()}),
 legacy:z.strictObject({questions:Count,memories:Count}),knowledge:z.strictObject({active:Count,recycled:Count}),versions:Count,drafts:Count,unpublishedDrafts:Count,
 reviewEvents:Count,sessions:Count,schedules:Count});
export const ExternalDeckPage=z.strictObject({items:z.array(ExternalDeckSummary).max(100),nextCursor:z.string().nullable()});
export type ExternalScanSummaryDTO=z.infer<typeof ExternalScanSummary>;
export type ExternalDeckPageDTO=z.infer<typeof ExternalDeckPage>;
