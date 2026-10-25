import {z} from 'zod';
const Count=z.number().int().nonnegative();
/** A full database recovery preview, separate from card/Markdown content exchange. */
export const FullBackupSummary=z.strictObject({
 previewId:z.uuid(),kind:z.literal('full-backup'),schemaVersion:z.union([z.literal(604),z.literal(606)]),createdAt:z.iso.datetime(),
 requiresUnifiedMigration:z.boolean(),
 decks:z.strictObject({active:Count,recycled:Count}),
 knowledge:z.strictObject({active:Count,recycled:Count}),
 unifiedCards:z.strictObject({question:Count,qa:Count,direct:Count,recycled:Count}).nullable(),
 versions:Count,drafts:z.strictObject({publishedCard:Count,unpublishedCard:Count}),reviewEvents:Count,studyCycles:Count,sessions:Count,schedules:Count,
 legacy:z.strictObject({questions:Count,memories:Count,attempts:Count,memoryReviews:Count}),
 media:z.strictObject({files:Count,bytes:Count}),
});
export type FullBackupSummaryDTO=z.infer<typeof FullBackupSummary>;
