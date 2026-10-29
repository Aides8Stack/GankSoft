import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import type {Context} from '../../infrastructure/context.ts';
import {transaction} from '../../infrastructure/database.ts';
import {withNativePurgeScope} from '../../infrastructure/migrations/native-purge.ts';
import {ProtocolError} from '../../../shared/protocol/data.ts';
import {PurgeScope,PurgePreview,PurgeCommand,PurgeResult} from '../../../shared/protocol/recycle-purge.ts';
import {planPurge} from './purge-plan.ts';
import type {z} from 'zod';
const tokens=new WeakMap<DatabaseSync,Map<string,{scope:z.output<typeof PurgeScope>;fingerprint:string;expires:number}>>();
const error=()=>new ProtocolError('PREVIEW_STALE','永久删除范围已变化或预览已过期，请重新核对');
export function previewNativePurge(ctx:Context,input:unknown){
 const p=PurgeScope.parse(input),own=!ctx.db.isTransaction;
 if(own)ctx.db.exec('BEGIN DEFERRED');
 try{
  const plan=planPurge(ctx,p);let previewToken:string|null=null;
  if(!plan.blockers.length){
   let cache=tokens.get(ctx.db);if(!cache){cache=new Map();tokens.set(ctx.db,cache);}
   for(const [key,t] of cache)if(t.expires<+ctx.now())cache.delete(key);
   if(cache.size>=1000)cache.delete(cache.keys().next().value!);
   previewToken=randomUUID();cache.set(previewToken,{scope:p,fingerprint:plan.fingerprint,expires:+ctx.now()+300000});
  }
  const view=PurgePreview.parse({...plan.base,objects:plan.objects,counts:plan.counts,fingerprint:plan.fingerprint,execution:plan.blockers.length?'blocked':'ready',blockers:plan.blockers,previewToken,effects:plan.effects,preservedCards:plan.preservedCards,retainedFiles:plan.retainedFiles});
  if(own)ctx.db.exec('COMMIT');return view;
 }catch(e){if(own&&ctx.db.isTransaction)ctx.db.exec('ROLLBACK');throw e;}
}
export function purgeNative(ctx:Context,input:unknown){
 const p=PurgeCommand.parse(input),token=tokens.get(ctx.db)?.get(p.previewToken);
 if(!token||token.expires<+ctx.now()||token.expires>+ctx.now()+300000)throw error();
 return transaction(ctx.db,()=>{
  let plan:ReturnType<typeof planPurge>;
  try{plan=planPurge(ctx,token.scope);}catch{throw error();}
  if(plan.fingerprint!==token.fingerprint||plan.blockers.length)throw error();
  withNativePurgeScope(ctx.db,[...plan.cards],()=>{
   for(const change of plan.ordered){
    if(change.set){const entries=Object.entries(change.set);ctx.db.prepare(`UPDATE ${change.table} SET ${entries.map(([k])=>k+'=?').join(',')} WHERE rowid=?`).run(...entries.map(([,v])=>v),change.row._rowid);}
    else ctx.db.prepare(`DELETE FROM ${change.table} WHERE rowid=?`).run(change.row._rowid);
   }
   for(const {table,value} of plan.insertions){const entries=Object.entries(value);ctx.db.prepare(`INSERT INTO ${table}(${entries.map(([k])=>k).join(',')}) VALUES(${entries.map(()=>'?').join(',')})`).run(...entries.map(([,v])=>v));}
   if(ctx.db.prepare('PRAGMA foreign_key_check').all().length)throw new ProtocolError('PURGE_INTEGRITY','永久删除发现未覆盖的外键引用，已撤销整批删除');
  });
  return PurgeResult.parse({purged:true,kind:plan.p.kind,objects:plan.objects.length,retainedFiles:plan.retainedFiles});
 });
}
