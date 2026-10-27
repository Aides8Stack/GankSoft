import { fromMarkdown } from 'mdast-util-from-markdown';
import { parsePlacement } from '../editor/document.ts';

export {KnowledgeAsset,type KnowledgeAssetDTO} from '../protocol/knowledge-media.ts';
import type {KnowledgeAssetDTO} from '../protocol/knowledge-media.ts';
export interface MarkdownImage {start:number;end:number;url:string;alt:string;title:string|null}
/** CommonMark owns image/code/definition context. No raw string URL replacement. */
export function markdownImages(markdown:string):MarkdownImage[] {
 const root=fromMarkdown(markdown),images:MarkdownImage[]=[];
 const definitions=new Map<string,{url:string;title?:string|null}>();
 function walk(node:any,visit:(node:any)=>void){visit(node);for(const child of node.children??[])walk(child,visit);}
 walk(root,n=>{if(n.type==='definition'&&!definitions.has(n.identifier))definitions.set(n.identifier,n);});
 walk(root,n=>{
  if(n.type==='html'&&/<\s*(img|script|iframe|object|embed|svg)\b|\bon\w+\s*=/i.test(n.value))throw Error('MARKDOWN_UNSAFE_HTML');
  if(n.type!=='image'&&n.type!=='imageReference')return;
  const source=n.type==='image'?n:definitions.get(n.identifier);
  if(!source)throw Error('MEDIA_REFERENCE_MISSING');
  images.push({start:n.position.start.offset,end:n.position.end.offset,url:source.url,alt:n.alt??'',title:source.title??null});
 });
 if(images.length>200)throw Error('MEDIA_TOO_MANY_PLACEMENTS');
 return images;
}
export function imageMarkdown(image:Pick<MarkdownImage,'alt'|'title'>,url:string,title=image.title) {
 const alt=image.alt.replace(/[\\\[\]]/g,'\\$&').replace(/\r?\n/g,' ');
 return `![${alt}](<${url}>${title===null?'':` "${title.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r?\n/g,' ')}"`})`;
}
export function mapMarkdownImages(markdown:string,map:(image:MarkdownImage)=>string) {
 const edits=markdownImages(markdown).map(image=>({start:image.start,end:image.end,text:map(image)}));
 const root=fromMarkdown(markdown),imageIds=new Set<string>(),linkIds=new Set<string>(),definitions:any[]=[];
 function walk(node:any){if(node.type==='imageReference')imageIds.add(node.identifier);if(node.type==='linkReference')linkIds.add(node.identifier);if(node.type==='definition')definitions.push(node);for(const child of node.children??[])walk(child);}
 walk(root);
 for(const node of definitions)if(imageIds.has(node.identifier)){
  if(linkIds.has(node.identifier))throw Error('MEDIA_IMAGE_DEFINITION_SHARED');
  edits.push({start:node.position.start.offset,end:node.position.end.offset,text:''});
 }
 let result=markdown;for(const edit of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,edit.start)+edit.text+result.slice(edit.end);return result;
}
export function knowledgePlacements(markdown:string) {
 const ids=new Set<string>();
 return markdownImages(markdown).map(image=>{
  const p=parsePlacement(image.url);if(ids.has(p.placementId))throw Error('MEDIA_PLACEMENT_DUPLICATE');ids.add(p.placementId);return p;
 });
}
export function assertKnowledgeAssets(markdown:string,assets:KnowledgeAssetDTO[]) {
 const refs=knowledgePlacements(markdown),used=new Set(refs.map(r=>r.assetId));
 if(used.size!==assets.length||new Set(assets.map(a=>a.id)).size!==assets.length||assets.some(a=>!used.has(a.id)))throw Error('MEDIA_REFERENCE_MISSING');
 for(const id of used)if(!assets.some(a=>a.id===id))throw Error('MEDIA_REFERENCE_MISSING');
 return refs;
}
