import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {writeFileSync} from 'node:fs';
import {basename} from 'node:path';
import type {z} from 'zod';
import type {Context} from '../../infrastructure/context.ts';
import {transaction} from '../../infrastructure/database.ts';
import {ProtocolError} from '../../../shared/protocol/data.ts';
import {MarkdownSource,ImportMarkdown,MarkdownImportPreview,ConfirmMarkdownImport,MarkdownImportResult,ExportMarkdown,MarkdownExportPreview,UseMarkdownExport,MarkdownPage,MarkdownDiff,MarkdownDiffView,MarkdownHeadings,MarkdownHeadingsPage} from '../../../shared/protocol/knowledge-markdown.ts';
import {MARKDOWN_HEADER,MAX_MARKDOWN_BYTES,MarkdownProtocolError,parseMarkedMarkdown,serializeMarkedMarkdown,externalHeadingCandidates,confirmExternalHeadings,type MarkdownForestNode} from '../../../shared/knowledge/markdown.ts';
import {readTree,requireTree,markdownBody,validateBody,writeBody} from './storage.ts';
import {applyTree,saveNode} from './tree.ts';
function md<T>(action:()=>T):T{try{return action();}catch(e){if(e instanceof MarkdownProtocolError)throw new ProtocolError(e.code,e.message);throw e;}}
const lifetime=300000;
type Source={deckId:string;epoch:string;expires:number;text:string;name:string;bytes:number;format:'marked'|'external';headings:ReturnType<typeof externalHeadingCandidates>};
type PlanRow={key:string;line:number;path:string[];nodeId:string;parentId:string|null;position:number;action:'create'|'keep'|'replace'|'append';after:string;beforeChars:number;afterChars:number;changed:boolean;revision:number};
type Plan={deckId:string;epoch:string;expires:number;treeHash:string;rows:PlanRow[];created:number;updated:number;kept:number;sourceName:string;bytes:number};
type Exported={deckId:string;epoch:string;expires:number;treeHash:string;markdown:string};
const states=new WeakMap<DatabaseSync,{sources:Map<string,Source>;imports:Map<string,Plan>;exports:Map<string,Exported>}>();
function state(ctx:Context){let s=states.get(ctx.db);if(!s){s={sources:new Map(),imports:new Map(),exports:new Map()};states.set(ctx.db,s);}for(const map of [s.sources,s.imports,s.exports])for(const [id,item]of map)if(item.expires<+ctx.now())map.delete(id);return s;}
const epoch=(ctx:Context)=>String(ctx.db.prepare('SELECT epoch FROM protocol_meta WHERE singleton=1').get()!.epoch);
function scope(ctx:Context,item:{deckId:string;epoch:string;expires:number}|undefined,deckId:string){requireTree(ctx,deckId);if(!item||item.deckId!==deckId||item.epoch!==epoch(ctx)||item.expires<+ctx.now())throw new ProtocolError('MARKDOWN_PREVIEW_STALE','Markdown预览已过期或范围变化，请重新选择文件/预览');}
function trimMap<T>(map:Map<string,T>,limit:number){while(map.size>limit)map.delete(map.keys().next().value!);}
export function stageMarkdownSource(ctx:Context,deckId:string,text:string,name='粘贴的Markdown') {
 requireTree(ctx,deckId);const bytes=Buffer.byteLength(text,'utf8');if(bytes>MAX_MARKDOWN_BYTES||text.includes('\0'))throw new ProtocolError('MARKDOWN_SOURCE_INVALID','Markdown文件过大或含空字符');
 const first=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n',1)[0],format=first===MARKDOWN_HEADER?'marked' as const:'external' as const;
 const headings=format==='external'?md(()=>externalHeadingCandidates(text)):[];if(headings.length>5000)throw new ProtocolError('MARKDOWN_TOO_MANY_NODES','标题过多，请分批导入');
 const sourceToken=randomUUID();state(ctx).sources.set(sourceToken,{deckId,epoch:epoch(ctx),expires:+ctx.now()+lifetime,text,name,bytes,format,headings});trimMap(state(ctx).sources,2);
 return MarkdownSource.parse({deckId,sourceToken,name,bytes,format,headingTotal:headings.length,headings:headings.slice(0,100)});
}
export function previewMarkdownImport(ctx:Context,input:z.infer<typeof ImportMarkdown>) {
 const p=ImportMarkdown.parse(input),s=state(ctx),source=s.sources.get(p.sourceToken);scope(ctx,source,p.deckId);
 const tree=readTree(ctx,p.deckId);if(p.parentId&&!tree.nodes.some(n=>n.nodeId===p.parentId))throw new ProtocolError('DECK_CONFLICT','挂载知识点不属于当前图谱');
 const parsed=md(()=>source!.format==='marked'?parseMarkedMarkdown(source!.text):confirmExternalHeadings(source!.text,p.selectedLines??[]));
 if(!parsed.length)throw new ProtocolError('MARKDOWN_EMPTY','文件中没有可导入知识点');
 if(Object.keys(p.policies).some(key=>!parsed.some(n=>n.key===key)))throw new ProtocolError('MARKDOWN_SELECTION_STALE','正文策略不属于当前文件');
 let plannedBytes=0;
 const target=new Map<string,string>(),paths=new Map<string,string[]>(),rows:PlanRow[]=[],counts=new Map<string|null,number>();
 const livePath=(id:string|null):string[]=>{const out:string[]=[],seen=new Set<string>();while(id){if(seen.has(id))throw new ProtocolError('TREE_CYCLE','知识路径循环');seen.add(id);const n=tree.nodes.find(n=>n.nodeId===id);if(!n)throw new ProtocolError('TREE_PARENT_MISSING','知识父路径缺失');out.unshift(n.name);id=n.parentId;}return out;};
 for(const node of parsed){
  const parentId=node.parentKey?target.get(node.parentKey)!:p.parentId,path=[...(node.parentKey?paths.get(node.parentKey)!:livePath(p.parentId)),node.name];
  if(node.parentKey&&!parentId)throw new ProtocolError('MARKDOWN_PARENT_MISSING','文件父级未映射');
  const old=tree.nodes.find(n=>n.parentId===parentId&&n.name===node.name),nodeId=old?.nodeId??randomUUID();
  const action=old?(p.policies[node.key]??'keep'):'create',before=old?markdownBody(ctx,p.deckId,nodeId):'',after=action==='keep'?before:action==='append'?[before,node.markdown].filter(Boolean).join('\n\n'):node.markdown;
  if(action!=='keep'){validateBody({encoding:'ganksoft.knowledge-body/1',deckId:p.deckId,nodeId,markdown:after});plannedBytes+=Buffer.byteLength(after);if(plannedBytes>MAX_MARKDOWN_BYTES)throw new ProtocolError('MARKDOWN_TOO_LARGE','本批正文更新超过64MiB，请分批导入');}
  const nextPosition=counts.get(parentId)??tree.nodes.filter(n=>n.parentId===parentId).length;
  const row:PlanRow={key:node.key,line:node.line,path,nodeId,parentId,position:old?.position??nextPosition,action,after:action==='keep'?'':after,beforeChars:before.length,afterChars:after.length,changed:!!old&&before!==after,revision:old?.revision??0};
  if(!old)counts.set(parentId,nextPosition+1);target.set(node.key,nodeId);paths.set(node.key,path);rows.push(row);
 }
 if(tree.nodes.length+rows.filter(r=>r.action==='create').length>5000)throw new ProtocolError('TREE_TOO_LARGE','导入后图谱超过5000个知识点');
 const previewToken=randomUUID(),plan:Plan={deckId:p.deckId,epoch:epoch(ctx),expires:+ctx.now()+lifetime,treeHash:tree.treeHash,rows,
  created:rows.filter(r=>r.action==='create').length,updated:rows.filter(r=>r.action!=='create'&&r.changed).length,
  kept:rows.filter(r=>r.action!=='create'&&!r.changed).length,sourceName:source!.name,bytes:source!.bytes};
 s.imports.set(previewToken,plan);trimMap(s.imports,4);
 return importPage(ctx,p.deckId,previewToken,plan,0,50);
}
function importPage(ctx:Context,deckId:string,previewToken:string,plan:Plan,offset:number,limit:number){
 scope(ctx,plan,deckId);const rows:Record<string,unknown>[]= [];let bytes=0,index=offset;
 for(const row of plan.rows.slice(offset,offset+limit)){
  const {key,line,path,nodeId,action,beforeChars,afterChars}=row,item={key,line,path,nodeId,action,beforeChars,afterChars},size=Buffer.byteLength(JSON.stringify(item));
  if(bytes+size>1_400_000)break;rows.push(item);bytes+=size;index++;
 }
 return MarkdownImportPreview.parse({deckId,previewToken,sourceName:plan.sourceName,treeHash:plan.treeHash,created:plan.created,updated:plan.updated,kept:plan.kept,imageCount:0,bytes:plan.bytes,total:plan.rows.length,nextOffset:index<plan.rows.length?index:null,rows});
}
export function markdownImportPage(ctx:Context,input:z.infer<typeof MarkdownPage>){const p=MarkdownPage.parse(input),plan=state(ctx).imports.get(p.previewToken);scope(ctx,plan,p.deckId);return importPage(ctx,p.deckId,p.previewToken,plan!,p.offset,p.limit);}
export function markdownImportDiff(ctx:Context,input:z.infer<typeof MarkdownDiff>){
 const p=MarkdownDiff.parse(input),plan=state(ctx).imports.get(p.previewToken);scope(ctx,plan,p.deckId);
 if(readTree(ctx,p.deckId).treeHash!==plan!.treeHash)throw new ProtocolError('MARKDOWN_PREVIEW_STALE','图谱已变化，请重新预览');
 const row=plan!.rows.find(r=>r.key===p.key);if(!row)throw new ProtocolError('MARKDOWN_SELECTION_STALE','没有当前差异条目');
 const before=row.action==='create'?'':markdownBody(ctx,p.deckId,row.nodeId);
 return MarkdownDiffView.parse({key:row.key,path:row.path,before,after:row.action==='keep'?before:row.after});
}
export function markdownHeadingPage(ctx:Context,input:z.infer<typeof MarkdownHeadings>){
 const p=MarkdownHeadings.parse(input),source=state(ctx).sources.get(p.sourceToken);scope(ctx,source,p.deckId);const end=p.offset+p.limit;
 return MarkdownHeadingsPage.parse({total:source!.headings.length,nextOffset:end<source!.headings.length?end:null,headings:source!.headings.slice(p.offset,end)});

}
export function confirmMarkdownImport(ctx:Context,input:z.infer<typeof ConfirmMarkdownImport>) {
 const p=ConfirmMarkdownImport.parse(input);
 return transaction(ctx.db,()=>{
  const plan=state(ctx).imports.get(p.previewToken);scope(ctx,plan,p.deckId);const tree=readTree(ctx,p.deckId);
  if(plan!.treeHash!==tree.treeHash)throw new ProtocolError('MARKDOWN_PREVIEW_STALE','图谱或正文已变化，请重新预览');
  const added=plan!.rows.filter(r=>r.action==='create');
  if(added.length)applyTree(ctx,{deckId:p.deckId,expectedTreeHash:tree.treeHash,nodes:[...tree.nodes.map(({revision,...n})=>n),...added.map(r=>({nodeId:r.nodeId,name:r.path.at(-1)!,parentId:r.parentId,position:r.position}))]});
  for(const row of plan!.rows){
   if(row.action==='create')writeBody(ctx,{encoding:'ganksoft.knowledge-body/1',deckId:p.deckId,nodeId:row.nodeId,markdown:row.after});
   else if(row.changed)saveNode(ctx,{deckId:p.deckId,nodeId:row.nodeId,expectedRevision:row.revision,markdown:row.after});
  }
  return MarkdownImportResult.parse({deckId:p.deckId,created:plan!.created,updated:plan!.updated,kept:plan!.kept});
 });
}
export function previewMarkdownExport(ctx:Context,input:z.infer<typeof ExportMarkdown>) {
 const p=ExportMarkdown.parse(input),tree=readTree(ctx,p.deckId),chosen=new Set(p.nodeIds);
 if(chosen.size!==p.nodeIds.length||p.nodeIds.some(id=>!tree.nodes.some(n=>n.nodeId===id)))throw new ProtocolError('DECK_CONFLICT','所选知识点重复、已删除或不属于当前图谱');
 if(p.includeDescendants){let size=-1;while(size!==chosen.size){size=chosen.size;for(const n of tree.nodes)if(n.parentId&&chosen.has(n.parentId))chosen.add(n.nodeId);}}
 const included=new Set(chosen);for(const id of chosen){let parent=tree.nodes.find(n=>n.nodeId===id)!.parentId;while(parent){included.add(parent);parent=tree.nodes.find(n=>n.nodeId===parent)!.parentId;}}
 let bodyBytes=0;
 const counts=new Map<string|null,number>(),nodes:MarkdownForestNode[]=[];
 for(const n of tree.nodes.filter(n=>included.has(n.nodeId))){const position=counts.get(n.parentId)??0;counts.set(n.parentId,position+1);
  const body=chosen.has(n.nodeId)||p.includeParentBodies?markdownBody(ctx,p.deckId,n.nodeId):'';bodyBytes+=Buffer.byteLength(body);if(bodyBytes>MAX_MARKDOWN_BYTES)throw new ProtocolError('MARKDOWN_TOO_LARGE','所选正文超过64MiB，请缩小导出范围');
  nodes.push({key:n.nodeId,parentKey:n.parentId,name:n.name,position,markdown:body,line:1});}
 const markdown=md(()=>serializeMarkedMarkdown(nodes)),exportToken=randomUUID();state(ctx).exports.set(exportToken,{deckId:p.deckId,epoch:epoch(ctx),expires:+ctx.now()+lifetime,treeHash:tree.treeHash,markdown});trimMap(state(ctx).exports,2);
 return MarkdownExportPreview.parse({deckId:p.deckId,exportToken,nodeCount:nodes.length,bodyCount:chosen.size+(p.includeParentBodies?nodes.length-chosen.size:0),bytes:Buffer.byteLength(markdown,'utf8'),imageCount:0,markdown:markdown.slice(0,100000),truncated:markdown.length>100000});
}
export function preparedMarkdownExport(ctx:Context,input:z.infer<typeof UseMarkdownExport>) {
 const p=UseMarkdownExport.parse(input),prepared=state(ctx).exports.get(p.exportToken);scope(ctx,prepared,p.deckId);
 if(readTree(ctx,p.deckId).treeHash!==prepared!.treeHash)throw new ProtocolError('MARKDOWN_PREVIEW_STALE','图谱或正文已变化，请重新预览导出');return prepared!.markdown;
}
export function savePreparedMarkdown(ctx:Context,input:z.infer<typeof UseMarkdownExport>,path:string|null) {
 const markdown=preparedMarkdownExport(ctx,input);if(path===null)return {saved:false,name:null};
 writeFileSync(path,markdown,{encoding:'utf8'});return {saved:true,name:basename(path)};
}
