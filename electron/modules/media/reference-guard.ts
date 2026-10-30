import type {Context} from '../../infrastructure/context.ts';
type Image={id:string;fileName:string};
/** Fail closed for all persistent content, including opaque recycle/history rows.
 * Protocol receipts describe completed calls, not live image usage. Staging and
 * retirement metadata are ownership/cleanup journals, never content references. */
export function hasPreservedImageReference(ctx:Context,image:Image):boolean {
 for(const r of ctx.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()){
  const table=String(r.name);if(!/^[a-z_0-9]+$/.test(table))throw Error('MEDIA_CLEANUP_UNKNOWN_SCHEMA');
  if(['protocol_receipts','platform_operations'].includes(table))continue;
  for(const row of ctx.db.prepare(`SELECT * FROM ${table}`).iterate()){
   if(table==='settings'&&/^(media-draft:|media-retired:|media-insertion:)/.test(String(row.key)))continue;
   const text=JSON.stringify(row);
   if(text.includes(image.id)||text.includes(image.fileName))return true;
  }
 }
 return false;
}
