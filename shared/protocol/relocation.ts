import {z} from 'zod';
import {FullRestoreConfirmation,FullRestoreResult} from './full-backup.ts';

export const RelocationConfirmation=FullRestoreConfirmation.extend({
 destination:z.string().min(1),sourceDigest:z.string().regex(/^[a-f0-9]{64}$/),
});
export const RelocationPlan=z.strictObject({
 source:z.string(),destination:z.string(),mediaFiles:z.number().int().nonnegative(),mediaBytes:z.number().int().nonnegative(),
 availableBytes:z.string().regex(/^\d+$/),estimatedBytes:z.string().regex(/^\d+$/),requiredBytes:z.string().regex(/^\d+$/),confirmation:RelocationConfirmation,
});
export const RelocationStatus=FullRestoreResult.extend({destination:z.string()});
export type RelocationConfirmationDTO=z.infer<typeof RelocationConfirmation>;

export const RelocationInfo=z.strictObject({currentDirectory:z.string()});
