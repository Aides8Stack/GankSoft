import {hasPreservedImageReference as referenced} from './reference-guard.ts';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {z} from 'zod';
import type {Context} from '../../infrastructure/context.ts';
import {transaction} from '../../infrastructure/database.ts';
import {ProtocolError} from '../../../shared/protocol/data.ts';
import {MediaInsertionScope,MediaInsertionFinish} from '../../../shared/protocol/media-insertion.ts';
import {stageImage} from './drafts.ts';
import {finalizeMediaRetirements} from './library.ts';

const prefix='media-insertion:';
type Scope=z.infer<typeof MediaInsertionScope>;
type Image={id:string;fileName:string;mime:string;sha256:string;retained?:boolean};
type Lease=Scope&{state:'pending'|'accepted'|'rejected';images:Image[];lastError:string|null};
const digest=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
function read(ctx:Context,p:Scope):Lease|null {
 const row=ctx.db.prepare('SELECT value FROM settings WHERE key=?').get(prefix+p.insertionId);
 if(!row)return null;
 const lease=JSON.parse(String(row.value)) as Lease;
 if(lease.deckId!==p.deckId||lease.insertionId!==p.insertionId)throw new ProtocolError('MEDIA_SCOPE_CONFLICT','图片暂存请求不属于当前卡片集');
 return lease;
}
function write(ctx:Context,lease:Lease){ctx.db.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').run(prefix+lease.insertionId,JSON.stringify(lease));}
function retireRejected(ctx:Context,lease:Lease){
 lease.lastError=null;
 for(const image of lease.images){
  try{
   if(image.retained)continue;
   if(!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(image.fileName)||!image.fileName.startsWith(image.id+'.'))throw Error('MEDIA_CLEANUP_INVALID_PATH');
   // Fresh image IDs are allocated by stageImage; only this journal can own them.
   const row=ctx.db.prepare('SELECT value FROM settings WHERE key=?').get('media-draft:'+image.id);
   const meta=row?JSON.parse(String(row.value)):null;
   if(meta&&(meta.insertionId!==lease.insertionId||meta.id!==image.id||meta.deckId!==lease.deckId||meta.file_name!==image.fileName||meta.sha256!==image.sha256))throw Error('MEDIA_CLEANUP_OWNERSHIP_CHANGED');
   if(referenced(ctx,image)){image.retained=true;continue;}
   const file=join(ctx.dataDir,'attachments',image.fileName);
   if(existsSync(file)){
    const stat=lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||digest(readFileSync(file))!==image.sha256)throw Error('MEDIA_CLEANUP_FILE_CHANGED');
   }
   ctx.db.prepare('DELETE FROM settings WHERE key=?').run('media-draft:'+image.id);
   ctx.db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').run('media-retired:'+image.id,JSON.stringify({fileName:image.fileName,deckId:lease.deckId,insertionId:lease.insertionId,sha256:image.sha256}));
  }catch(error){lease.lastError=String(error);}
 }
 write(ctx,lease);
}
/** Only opt-in image-paste requests acquire a lease. Journal each allocated file
 * BEFORE its first filesystem write, in its own committed transaction. This also
 * covers a process crash between writing bytes and writing media-draft metadata. */
export function stageInsertionImages(ctx:Context,scope:Scope,purpose:string,images:{bytes:Buffer;mime:string}[]){
 const p=MediaInsertionScope.parse(scope);
 if(read(ctx,p))throw new ProtocolError('MEDIA_INSERTION_REUSED','图片暂存请求已使用，请重新粘贴');
 const lease:Lease={...p,state:'pending',images:[],lastError:null};
 write(ctx,lease);
 try{return images.map(image=>stageImage(ctx,p.deckId,purpose,image.bytes,image.mime,fileName=>{
  lease.images.push({id:fileName.slice(0,fileName.lastIndexOf('.')),fileName,mime:image.mime,sha256:digest(image.bytes)});
  write(ctx,lease);
 },p.insertionId));}catch(error){
  transaction(ctx.db,()=>{lease.state='rejected';retireRejected(ctx,lease);});
  finalizeMediaRetirements(ctx);
  throw error;
 }
}
export function finishInsertion(ctx:Context,input:z.infer<typeof MediaInsertionFinish>){
 const p=MediaInsertionFinish.parse(input);
 return transaction(ctx.db,()=>{
  const lease=read(ctx,p);if(!lease)return {state:'missing' as const,pendingCleanup:0,lastError:null};
  if(lease.state==='accepted'&&p.outcome==='rejected')throw new ProtocolError('MEDIA_INSERTION_ACCEPTED','图片已插入，不能按失败请求清理');
  if(lease.state==='rejected'&&p.outcome==='accepted')throw new ProtocolError('MEDIA_INSERTION_REJECTED','图片请求已取消，请重新粘贴');
  lease.state=p.outcome;
  if(lease.state==='rejected')retireRejected(ctx,lease);else write(ctx,lease);
  // This is the durable journal acknowledgement, not a claim that unlink ran.
  return insertionStatus(ctx,{deckId:p.deckId,insertionId:p.insertionId});
 });
}
export function insertionStatus(ctx:Context,input:Scope){
 const p=MediaInsertionScope.parse(input),lease=read(ctx,p);
 if(!lease)return {state:'missing' as const,pendingCleanup:0,lastError:null};
 let pendingCleanup=0,lastError=lease.lastError;
 if(lease.state==='rejected')for(const image of lease.images){
  if(image.retained||referenced(ctx,image))continue;
  if(existsSync(join(ctx.dataDir,'attachments',image.fileName))||ctx.db.prepare('SELECT 1 FROM settings WHERE key=?').get('media-draft:'+image.id))pendingCleanup++;
  const retired=ctx.db.prepare('SELECT value FROM settings WHERE key=?').get('media-retired:'+image.id);
  if(retired){const m=JSON.parse(String(retired.value));if(m.cleanupError)lastError=String(m.cleanupError);}
 }
 return {state:lease.state,pendingCleanup,lastError};
}
/** Retries only rejected, request-owned journals. Active requests are untouched. */
export function retryRejectedInsertions(ctx:Context){
 for(const row of ctx.db.prepare("SELECT key,value FROM settings WHERE key LIKE 'media-insertion:%'").all()){
  try{
   const lease=JSON.parse(String(row.value)) as Lease;
   if(lease.state==='rejected')transaction(ctx.db,()=>retireRejected(ctx,lease));
  }catch(error){console.warn('图片暂存清理待重试',String(row.key),String(error));}
 }
}
/** Owner lock is acquired before this runs; no renderer/in-flight writer exists.
 * Accepted resources and every persistent reference retain their original bytes. */
export function recoverStagedInsertions(ctx:Context){
 for(const row of ctx.db.prepare("SELECT key,value FROM settings WHERE key LIKE 'media-insertion:%'").all()){
  try{
   const lease=JSON.parse(String(row.value)) as Lease;
   if(lease.state==='pending')transaction(ctx.db,()=>{lease.state='rejected';retireRejected(ctx,lease);});
  }catch(error){console.warn('图片暂存恢复待核对',String(row.key),String(error));}
 }
 retryRejectedInsertions(ctx);
 finalizeMediaRetirements(ctx);
}
