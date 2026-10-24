import { createHash,randomUUID } from 'node:crypto';
import { readFileSync,rmSync,lstatSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { Context } from '../../infrastructure/context.ts';
import { validateImage } from '../../infrastructure/images.ts';
import { stageImage,draftImage } from '../media/drafts.ts';
import { StoredNodeBody } from '../../../shared/protocol/knowledge-tree.ts';
import { ProtocolError } from '../../../shared/protocol/data.ts';
import type { Response } from '../../../shared/protocol/registry.ts';
import { parsePlacement,placementUrl } from '../../../shared/editor/document.ts';
import { KnowledgeAsset,assertKnowledgeAssets,knowledgePlacements,mapMarkdownImages,imageMarkdown,type KnowledgeAssetDTO } from '../../../shared/knowledge/media.ts';

const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
const writes=new WeakMap<DatabaseSync,string[]>();
/** Includes host output validation and receipt insertion, not just the handler. */
export function executeKnowledgeMedia(ctx:Context,action:()=>Response) {
 const files:string[]=[];writes.set(ctx.db,files);
 try{const result=action();if(!result.ok&&result.error.outcome!=='unknown')for(const path of files)rmSync(path,{force:true});return result;}
 finally{writes.delete(ctx.db);}
}
export function resolveKnowledgeAssets(ctx:Context,deckId:string,markdown:string):KnowledgeAssetDTO[] {
 const refs=knowledgePlacements(markdown),ids=[...new Set(refs.map(r=>r.assetId))];
 const assets=ids.map(id=>{
  const meta=draftImage(ctx,id,deckId,'knowledge'),path=join(ctx.dataDir,'attachments',meta.file_name);
  const stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink())throw new ProtocolError('MEDIA_REFERENCE_INVALID','知识图片路径不安全');
  const bytes=readFileSync(path);validateImage(bytes,meta.mime);
  if(meta.sha256!==hash(bytes))throw new ProtocolError('MEDIA_REFERENCE_INVALID','知识图片校验失败');
  return KnowledgeAsset.parse({id,mime:meta.mime,fileName:meta.file_name,sha256:hash(bytes)});
 });
 assertKnowledgeAssets(markdown,assets);return assets;
}
export interface ImportImage {id:string;mime:string;bytes:Buffer;sha256:string}
/** Validates before any write; binary payload never travels back through renderer DTOs. */
export function prepareMarkdownImages(markdown:string,images:Map<string,ImportImage>) {
 return mapMarkdownImages(markdown,image=>{
  const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(image.url);
  if(!match||match[2].length%4!==0||match[2].length>27_962_028)throw new ProtocolError('MARKDOWN_IMAGE_INVALID','图片需为有效的 PNG/JPEG/WebP Base64 Data URI');
  const bytes=Buffer.from(match[2],'base64');
  if(bytes.toString('base64')!==match[2])throw new ProtocolError('MARKDOWN_IMAGE_INVALID','图片Base64编码不规范');
  validateImage(bytes,match[1]);
  const sha256=hash(bytes);let prepared=images.get(sha256);
  if(!prepared){prepared={id:randomUUID(),mime:match[1],bytes,sha256};images.set(sha256,prepared);}
  let width=100,title=image.title;
  if(title?.startsWith('ganksoft-image:')) {
   const m=/^ganksoft-image:v1:([1-9]\d?|100):([A-Za-z0-9_-]+)$/.exec(title);
   if(!m)throw new ProtocolError('MARKDOWN_IMAGE_WIDTH_INVALID','图片宽度扩展不合法');
   const raw=Buffer.from(m[2],'base64url');
   if(raw.toString('base64url')!==m[2])throw new ProtocolError('MARKDOWN_IMAGE_WIDTH_INVALID','图片标题编码不规范');
   const decoded:unknown=JSON.parse(raw.toString('utf8'));if(decoded!==null&&typeof decoded!=='string')throw new ProtocolError('MARKDOWN_IMAGE_WIDTH_INVALID','图片标题扩展不合法');
   width=Number(m[1]);title=decoded as string|null;
  }
  return imageMarkdown(image,placementUrl({assetId:prepared.id,placementId:randomUUID(),width}),title);
 });
}
export function persistMarkdownImages(ctx:Context,deckId:string,images:Map<string,ImportImage>) {
 const map=new Map<string,string>();
 // Dedup only within this deck. Never accept a source database's resource identity.
 const existing=new Map<string,KnowledgeAssetDTO>();
 for(const row of ctx.db.prepare("SELECT value FROM settings WHERE key LIKE 'unified-knowledge-body:%'").iterate()) {
  const body=StoredNodeBody.parse(JSON.parse(String(row.value)));if(body.deckId!==deckId)continue;
  for(const asset of body.assets)existing.set(asset.sha256,asset);
 }
 for(const image of images.values()) {
  const known=existing.get(image.sha256);
  if(known){const meta=draftImage(ctx,known.id,deckId,'knowledge'),bytes=readFileSync(join(ctx.dataDir,'attachments',meta.file_name));if(hash(bytes)!==image.sha256||meta.sha256!==image.sha256||meta.mime!==image.mime)throw new ProtocolError('MEDIA_REFERENCE_INVALID','已存知识图片损坏');map.set(image.id,known.id);continue;}
  const asset=stageImage(ctx,deckId,'knowledge',image.bytes,image.mime,file=>writes.get(ctx.db)?.push(join(ctx.dataDir,'attachments',file)));
  map.set(image.id,asset.id);
 }
 return map;
}
export function remapKnowledgeImages(markdown:string,ids:Map<string,string>) {
 return mapMarkdownImages(markdown,image=>{const p=parsePlacement(image.url);return imageMarkdown(image,placementUrl({...p,assetId:ids.get(p.assetId)??p.assetId}));});
}
export function exportMarkdownImages(ctx:Context,deckId:string,markdown:string) {
 const assets=resolveKnowledgeAssets(ctx,deckId,markdown);
 return mapMarkdownImages(markdown,image=>{
  const p=parsePlacement(image.url),a=assets.find(a=>a.id===p.assetId)!,bytes=readFileSync(join(ctx.dataDir,'attachments',a.fileName));
  const title=`ganksoft-image:v1:${p.width}:${Buffer.from(JSON.stringify(image.title)).toString('base64url')}`;
  return imageMarkdown(image,`data:${a.mime};base64,${bytes.toString('base64')}`,title);
 });
}
