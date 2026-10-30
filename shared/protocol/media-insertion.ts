import {z} from 'zod';
import {Id} from './data.ts';
export const MediaInsertionScope=z.strictObject({deckId:Id,insertionId:Id});
export const MediaInsertionFinish=MediaInsertionScope.extend({outcome:z.enum(['accepted','rejected'])});
export const MediaInsertionStatus=z.strictObject({
  state:z.enum(['pending','accepted','rejected','missing']),
  pendingCleanup:z.number().int().nonnegative(),
  lastError:z.string().nullable(),
});
