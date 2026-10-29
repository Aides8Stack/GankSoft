import type {ArchiveDocument} from '../../../shared/import-protocol.ts';
import {validateArchive,digest} from '../imports/protocol.ts';
import {AppendProvenance} from '../storage-unified/append-provenance.ts';
import {AppendIdentityMap} from '../storage-unified/append-identities.ts';
import type {Row} from './purge-plan.ts';
const only=(v:unknown,keys:string[])=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k));
function recognized(row:Row,settings:Row[]):ArchiveDocument{
 const a=JSON.parse(row.content);validateArchive(a);
 if(!only(a,['archiveId','subject','version','note','nodes','relations'])||a.nodes.some((n:unknown)=>!only(n,['key','name','parentKey','aliases','principle','conditions','method','traps']))||a.relations.some((r:unknown)=>!only(r,['sourceKey','targetKey','kind','note'])))throw Error('未识别的存档字段');
 if(digest(a)!==row.checksum||a.version!==row.version_label)throw Error('存档校验和或版本不一致');
 let owned=a.archiveId===row.archive_key&&a.subject===row.module;
 if(!owned)for(const r of settings.filter(s=>String(s.key).startsWith('append-provenance:'))){
  const parsed=AppendProvenance.safeParse(JSON.parse(r.value));if(!parsed.success)continue;const p=parsed.data,map=new AppendIdentityMap(p.operationId);
  if(p.destinationDeckId===row.module&&p.sourceDeckId===a.subject&&map.id('namespace',a.archiveId)===row.archive_key)owned=true;
 }
 if(!owned)throw Error('存档来源与当前卡片集/来源键无法证明');return a;
}
/** Source keys, not display names or substring guesses, identify every version. */
export function planArchiveScope(tables:Map<string,Row[]>,deckId:string,wholeDeck:boolean,nodes:Set<string>,mark:(t:string,r:Row,set?:Row)=>void,blockers:string[]){
 const rows=(t:string)=>tables.get(t)??[],bindings=rows('knowledge_keys'),knowledge=new Map(rows('knowledge').map(r=>[r.id,r]));
 const selected=new Map<string,Set<string>>();
 for(const k of bindings.filter(r=>nodes.has(r.knowledge_id))){const keys=selected.get(k.archive_key)??new Set<string>();keys.add(k.node_key);selected.set(k.archive_key,keys);}
 const sourceKeys=new Map<string,Set<string>>();
 for(const r of rows('knowledge_archives')){
  if(!selected.has(r.archive_key)&&!(wholeDeck&&r.module===deckId)){if([...nodes].some(id=>String(r.content).includes(id)))blockers.push('知识存档 '+r.id+' 含未证明的本地知识引用；保留并拒绝删除。');continue;}
  try{
   const a=recognized(r,rows('settings'));
   if(r.module!==deckId)throw Error('存档属于其他卡片集');
   if(bindings.some(k=>k.archive_key===r.archive_key&&knowledge.get(k.knowledge_id)?.module!==deckId))throw Error('来源键仍被其他卡片集使用');
   const removed=selected.get(r.archive_key)??new Set<string>(),source=sourceKeys.get(String(r.archive_key))??new Set<string>();removed.forEach(k=>source.add(k));sourceKeys.set(String(r.archive_key),source);
   if(wholeDeck){mark('knowledge_archives',r);continue;}
   if(!a.nodes.some(n=>removed.has(n.key)))continue;
   const byKey=new Map(a.nodes.map(n=>[n.key,n]));
   const remaining=a.nodes.filter(n=>!removed.has(n.key)).map(n=>{
    let parent=n.parentKey;while(parent&&removed.has(parent))parent=byKey.get(parent)?.parentKey;
    return parent===n.parentKey?n:{...n,parentKey:parent??null};
   });
   if(!remaining.length){mark('knowledge_archives',r);continue;}
   const next={...a,nodes:remaining,relations:a.relations.filter(e=>!removed.has(e.sourceKey)&&!removed.has(e.targetKey))};validateArchive(next);
   mark('knowledge_archives',r,{content:JSON.stringify(next),checksum:digest(next)});
  }catch(e){blockers.push('知识存档 '+String(r.id).slice(0,100)+'：'+String((e as Error).message).slice(0,240)+'；未修改任何存档。');}
 }
 if(!sourceKeys.size)return;
 for(const r of rows('import_entries')){
  if(![...sourceKeys.keys()].some(key=>String(r.archive_refs).includes(key)))continue;
  let refs:unknown;try{refs=JSON.parse(r.archive_refs);}catch{blockers.push('导入来源关联格式无法证明：'+r.entry_key);continue;}
  if(!Array.isArray(refs)||refs.some(v=>!only(v,['archiveId','version','nodeKey'])||typeof v.archiveId!=='string'||typeof v.nodeKey!=='string'||typeof v.version!=='string')){
   blockers.push('导入来源关联存在未识别字段：'+r.entry_key);continue;
  }
  const next=refs.filter(v=>!sourceKeys.get(v.archiveId)?.has(v.nodeKey));
  if(next.length!==refs.length)mark('import_entries',r,{archive_refs:JSON.stringify(next)});
 }
}
