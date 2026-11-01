import {hasPreservedImageReference} from './reference-guard.ts';
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import type {Context} from '../../infrastructure/context.ts';
import {ProtocolError} from '../../../shared/protocol/data.ts';
import {transaction} from '../../infrastructure/database.ts';
import {requireTree,readNode} from '../knowledge-unified/storage.ts';
import {saveNode} from '../knowledge-unified/tree.ts';
import {readWorkspaceDraft,saveWorkspaceDraft} from '../cards-unified/draft-service.ts';
import {markdownImages} from '../../../shared/knowledge/media.ts';
import {parsePlacement} from '../../../shared/editor/document.ts';
import type {z} from 'zod';
import {MediaList,MediaTarget,MediaDelete,MediaImpact,MediaPage,MediaRef} from '../../../shared/protocol/media-library.ts';
const digest=(x:unknown)=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
type Ref=z.infer<typeof MediaRef>;
function inventory(ctx:Context){
 const pending=new Set<string>();
 for(const row of ctx.db.prepare("SELECT value FROM settings WHERE key LIKE 'media-insertion:%'").all()){const lease=JSON.parse(String(row.value));if(lease.state==='pending'||lease.state==='rejected')for(const image of lease.images)if(!image.retained)pending.add(image.id);}
 const assets=new Map<string,{assetId:string;deckId:string;mime:string;fileName:string}>();
 for(const row of ctx.db.prepare("SELECT value FROM settings WHERE key LIKE 'media-draft:%'").all()){const m=JSON.parse(String(row.value));if(!pending.has(m.id))assets.set(m.id,{assetId:m.id,deckId:m.deckId,mime:m.mime,fileName:m.file_name});}
 for(const row of ctx.db.prepare('SELECT a.*,q.module FROM assets a JOIN questions q ON q.id=a.question_id').all())if(!assets.has(String(row.id)))assets.set(String(row.id),{assetId:String(row.id),deckId:String(row.module),mime:String(row.mime),fileName:String(row.file_name)});
 return assets;
}
function references(ctx:Context,id:string,fileName?:string):Ref[]{
 const refs:Ref[]=[];
 const add=(kind:string,ownerId:string,value:unknown,mutable=false,label=ownerId)=>{const text=typeof value==='string'?value:JSON.stringify(value);if(!text.includes(id)&&(!fileName||!text.includes(fileName)))return;
  const count=(text.match(new RegExp('gank-asset://'+id,'g'))??[]).length;
  refs.push({kind,ownerId,label:label.slice(0,400),mutable,placements:Math.max(1,count)});
 };
 // All versions include noncurrent modes, recycled cards and history snapshots. Never filter deleted rows.
 for(const r of ctx.db.prepare('SELECT v.*,c.title,c.deck_id FROM learning_content_versions v JOIN learning_cards c ON c.id=v.card_id ORDER BY v.id').all())add('已发布版本/历史',String(r.card_id),r.document,false,String(r.title)+' · '+String(r.id));
 for(const r of ctx.db.prepare('SELECT * FROM learning_review_events ORDER BY id').all())add('学习历史',String(r.card_id),r.document);
 for(const r of ctx.db.prepare('SELECT * FROM learning_card_drafts ORDER BY card_id').all()){
  const c=ctx.db.prepare('SELECT * FROM learning_cards WHERE id=?').get(r.card_id as string);add('卡片草稿',String(r.card_id),r.payload,!c?.deleted_at,String(c?.title??r.card_id));
 }
 for(const r of ctx.db.prepare('SELECT key,value FROM settings ORDER BY key').all()){
  const key=String(r.key);if(/^(media-draft:|media-retired:|media-insertion:)/.test(key))continue;
  if(key.startsWith('new-card-draft:')){const v=JSON.parse(String(r.value));add('卡片草稿',v.document.cardId,r.value,true,v.document.title||v.document.cardId);}
  else if(key.startsWith('unified-knowledge-body:')){const id=key.slice('unified-knowledge-body:'.length),n=ctx.db.prepare('SELECT name,deleted_at FROM knowledge WHERE id=?').get(id);add('知识点正文',id,r.value,!!n&&!n.deleted_at,String(n?.name??id));}
  else add('保留记录',key,r.value);
 }
 for(const r of ctx.db.prepare('SELECT * FROM assets ORDER BY id').all())if(r.id===id)add('原有卡片附件',String(r.question_id),id);
 // Legacy attempts/session snapshots can retain response images not present in published mediaRefs.
 for(const table of ['attempts','review_sessions']){
  if(!ctx.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))continue;
  for(const r of ctx.db.prepare(`SELECT rowid AS referenceRow,* FROM ${table}`).all())add('历史/会话保留',table+':'+r.referenceRow,r);
 }
 return refs;
}
function describe(ctx:Context,p:z.infer<typeof MediaTarget>){
 requireTree(ctx,p.deckId);const asset=inventory(ctx).get(p.assetId);
 if(!asset||asset.deckId!==p.deckId)throw new ProtocolError('MEDIA_SCOPE_CONFLICT','图片不属于当前卡片集或已经退役');
 if(!/^[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i.test(asset.fileName))throw new ProtocolError('MEDIA_REFERENCE_INVALID','图片路径无效');
 const file=join(ctx.dataDir,'attachments',asset.fileName),stat=lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink())throw new ProtocolError('MEDIA_REFERENCE_INVALID','图片文件无效');
 const sha256=digest(readFileSync(file)),refs=references(ctx,p.assetId,asset.fileName),blocked=refs.some(r=>!r.mutable),item={assetId:p.assetId,mime:asset.mime,bytes:stat.size,sha256,references:refs.reduce((n,r)=>n+r.placements,0),blocked};
 return {asset,refs,item,hash:digest({asset,sha256,refs,documents:refs.map(r=>r.kind==='知识点正文'?ctx.db.prepare('SELECT version FROM knowledge WHERE id=?').get(r.ownerId):r.kind==='卡片草稿'?readWorkspaceDraft(ctx,{deckId:p.deckId,cardId:r.ownerId}):null)})};
}
export function mediaList(ctx:Context,input:z.infer<typeof MediaList>){const p=MediaList.parse(input);requireTree(ctx,p.deckId);const all=[...inventory(ctx).values()].filter(a=>a.deckId===p.deckId).sort((a,b)=>a.assetId.localeCompare(b.assetId));
 const selected=all.filter(a=>{const refs=references(ctx,a.assetId,a.fileName);return (!p.cardId||refs.some(r=>r.ownerId===p.cardId))&&JSON.stringify([a,refs]).toLocaleLowerCase().includes(p.query.toLocaleLowerCase());});
 return MediaPage.parse({items:selected.slice(p.offset,p.offset+100).map(a=>describe(ctx,{deckId:p.deckId,assetId:a.assetId}).item),total:selected.length,nextOffset:p.offset+100<selected.length?p.offset+100:null});}
export function mediaImpact(ctx:Context,input:z.infer<typeof MediaTarget>){const p=MediaTarget.parse(input),d=describe(ctx,p);return MediaImpact.parse({item:d.item,hash:d.hash,refs:d.refs.slice(0,200),truncated:d.refs.length>200,reason:d.item.blocked?'仍被已发布版本、历史或保留内容引用，禁止物理删除。':d.refs.length?'可在二次确认后移除以下可变正文引用；执行时再次核对修订。':'没有持久引用，可安全退役并清理文件。'});}
function strip(markdown:string,id:string){const edits=markdownImages(markdown).filter(i=>{try{return parsePlacement(i.url).assetId===id;}catch{return false;}});for(const e of edits.reverse())markdown=markdown.slice(0,e.start)+markdown.slice(e.end);return markdown;}
function stripFields(value:any,id:string):any{if(typeof value==='string')return strip(value,id);if(Array.isArray(value))return value.map(v=>stripFields(v,id));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,stripFields(v,id)]));return value;}
export function mediaDelete(ctx:Context,input:z.infer<typeof MediaDelete>){const p=MediaDelete.parse(input);return transaction(ctx.db,()=>{const d=describe(ctx,p);if(d.hash!==p.expectedHash)throw new ProtocolError('MEDIA_PREVIEW_STALE','引用或正文已变化，请重新预览');if(d.item.blocked||d.refs.length>200)throw new ProtocolError('MEDIA_REFERENCED','存在不可变或未完整展示的引用，禁止删除');if(d.refs.length&&!p.detach)throw new ProtocolError('MEDIA_REFERENCED','图片仍被正文引用，请先预览并明确确认删除引用与资源');
 for(const r of d.refs){if(r.kind==='知识点正文'){const n=readNode(ctx,p.deckId,r.ownerId);saveNode(ctx,{deckId:p.deckId,nodeId:r.ownerId,expectedRevision:n.revision,markdown:strip(n.markdown,p.assetId)});}
 else if(r.kind==='卡片草稿'){const doc=readWorkspaceDraft(ctx,{deckId:p.deckId,cardId:r.ownerId})!;saveWorkspaceDraft(ctx,{deckId:p.deckId,cardId:r.ownerId,expectedPublishedRevision:doc.basePublishedRevision,expectedDraftRevision:doc.revision,fields:{title:doc.title,payload:stripFields(doc.payload,p.assetId),mediaRefs:doc.mediaRefs.filter(x=>x.assetId!==p.assetId)}});}}
 if(references(ctx,p.assetId).length)throw new ProtocolError('MEDIA_REFERENCED','仍有保留引用，已撤销本批删除');
 ctx.db.prepare('DELETE FROM settings WHERE key=?').run('media-draft:'+p.assetId);
 ctx.db.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run('media-retired:'+p.assetId,JSON.stringify({fileName:d.asset.fileName,deckId:p.deckId}));return {retired:true as const};});}
/** Called only AFTER the host committed its durable receipt. Failures keep bytes for safe retry. */
export function finalizeMediaRetirements(ctx:Context,removeFile:typeof rmSync=rmSync){
 for(const row of ctx.db.prepare("SELECT key,value FROM settings WHERE key LIKE 'media-retired:%'").all()){
  const key=String(row.key),id=key.slice('media-retired:'.length);
  let m:any;
  try{
   m=JSON.parse(String(row.value));
   if(!/^[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i.test(m.fileName))throw Error('MEDIA_CLEANUP_INVALID_PATH');
   const file=join(ctx.dataDir,'attachments',m.fileName);
   if(existsSync(file)){
    if((m.insertionId&&hasPreservedImageReference(ctx,{id,fileName:m.fileName}))||references(ctx,id,m.fileName).length||[...inventory(ctx).values()].some(a=>a.fileName===m.fileName))continue;
    const stat=lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('MEDIA_CLEANUP_FILE_CHANGED');
    if(m.sha256&&createHash('sha256').update(readFileSync(file)).digest('hex')!==m.sha256)throw Error('MEDIA_CLEANUP_FILE_CHANGED');
    removeFile(file);
   }
   if(m.cleanupError){delete m.cleanupError;ctx.db.prepare('UPDATE settings SET value=? WHERE key=?').run(JSON.stringify(m),key);}
  }catch(error){
   console.warn('图片暂存清理待重试',id,String(error));
   if(m){m.cleanupError=String(error);try{ctx.db.prepare('UPDATE settings SET value=? WHERE key=?').run(JSON.stringify(m),key);}catch(recordError){console.warn('无法登记图片清理错误',id,String(recordError));}}
  }
 }
}
