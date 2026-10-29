import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {pruneSession} from './session-scope.ts';
import {planArchiveScope} from './archive-scope.ts';
import {createHash} from 'node:crypto';
import type {z} from 'zod';
import type {Context} from '../../infrastructure/context.ts';
import {ProtocolError} from '../../../shared/protocol/data.ts';
import {PurgeScope} from '../../../shared/protocol/recycle-purge.ts';
import {StoredKnowledgeRecycle,StoredCardLinks,StoredTreeOrder} from '../../../shared/protocol/knowledge-tree.ts';
import {previewRecycleImpact} from './impact.ts';
export type Row=Record<string,any>;
export interface Change {table:string;row:Row;set?:Row}
export const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
/** Explicit domain closure. Unknown/mixed recovery documents block destruction;
 * they are never guessed to be exclusively owned by the selected objects. */
export function planPurge(ctx:Context,input:z.input<typeof PurgeScope>){
 const p=PurgeScope.parse(input),base=previewRecycleImpact(ctx,p.kind==='knowledge'?{kind:p.kind,deckId:p.deckId,batchId:p.batchId}:p);
 const tables=new Map<string,Row[]>();
 for(const r of ctx.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()){
  const name=String(r.name);if(!/^[a-z_0-9]+$/.test(name))throw new ProtocolError('PURGE_SCHEMA_UNKNOWN','存在未识别的数据表');
  tables.set(name,ctx.db.prepare(`SELECT rowid AS _rowid,* FROM ${name} ORDER BY rowid`).all());
 }
 const rows=(t:string)=>tables.get(t)??[];
 const cards=new Set(base.objects.filter(o=>o.kind==='card').map(o=>o.id));
 let nodes=new Set(base.objects.filter(o=>o.kind==='knowledge').map(o=>o.id));
 const selectedBatch=p.kind==='knowledge'?StoredKnowledgeRecycle.parse(JSON.parse(String(rows('recycle_batches').find(r=>r.kind==='unified-knowledge'&&r.item_id===p.batchId)!.payload))):null;
 if(p.kind==='knowledge'){
  const root=p.nodeId??selectedBatch!.rootId;
  if(!nodes.has(root))throw new ProtocolError('DECK_CONFLICT','所选节点不属于当前回收批次');
  nodes=new Set([root]);
  if(p.scope==='subtree'){let size=-1;while(size!==nodes.size){size=nodes.size;for(const n of selectedBatch!.nodes)if(n.parentId&&nodes.has(n.parentId))nodes.add(n.nodeId);}}
 }
 const all=new Set([...cards,...nodes,...base.objects.filter(o=>o.kind==='draft').map(o=>o.id),...(p.kind==='deck'?[p.deckId]:[])]);
 if(p.kind==='deck')for(const r of rows('settings'))if(/^media-(draft|retired):/.test(String(r.key))){const m=JSON.parse(r.value);if(m.deckId===p.deckId&&typeof m.id==='string')all.add(m.id);}
 const changes=new Map<string,Change>(),insertions:{table:string;value:Row}[]=[],blockers:string[]=[];
 const mark=(table:string,row:Row,set?:Row)=>{const key=table+':'+row._rowid,prior=changes.get(key);if(prior&&!prior.set)return;changes.set(key,{table,row,...(set?{set:{...prior?.set,...set}}:{})});};
 const erase=(table:string,predicate:(r:Row)=>boolean)=>rows(table).filter(predicate).forEach(r=>mark(table,r));
 const hit=(v:unknown,ids=all)=>{const text=JSON.stringify(v);return [...ids].some(id=>text.includes(id));};
 const cardRows=rows('learning_cards').filter(r=>cards.has(r.id));
 if(cardRows.some(r=>r.deck_id!==p.deckId||!r.deleted_at))blockers.push('卡片已移动或尚未回收，请刷新。');
 const attempts=new Set(rows('attempts').filter(r=>cards.has(r.question_id)).map(r=>r.id));
 const sessions=(table:string,row:Row,value:unknown)=>pruneSession(row,table,value,cards,rows('learning_review_events'),mark,blockers);
 for(const r of rows('study_sessions')){
  let value:unknown;try{value=JSON.parse(r.payload);}catch{if(hit(r.payload)||(p.kind==='deck'&&r.deck_id===p.deckId))blockers.push('未识别的复盘JSON：study_sessions/'+r._rowid);continue;}
  if(!sessions('study_sessions',r,value)&&(hit(r.payload,cards)||(p.kind==='deck'&&r.deck_id===p.deckId)))blockers.push('未识别的复盘归属：study_sessions/'+r._rowid);
 }
 // Native and retained legacy projections are deleted together, never through trash.manage.
 for(const t of ['learning_review_events','learning_card_drafts','learning_published_modes','learning_study_cycles','learning_content_versions','scheduling','schedule_events','card_review_policies','review_due_overrides','review_receipts'])erase(t,r=>cards.has(r.card_id));
 for(const t of ['attempt_evidence_snapshots','attempt_faults'])erase(t,r=>attempts.has(r.attempt_id));
 for(const t of ['attempts','assets','plans','question_assessment_policies'])erase(t,r=>cards.has(r.question_id));
 for(const t of ['memory_reviews','memory_plans'])erase(t,r=>cards.has(r.card_id));
 erase('question_knowledge',r=>cards.has(r.question_id)||nodes.has(r.knowledge_id));
 erase('memory_knowledge',r=>cards.has(r.card_id)||nodes.has(r.knowledge_id));
 erase('detached_knowledge_links',r=>cards.has(r.card_id)||nodes.has(r.knowledge_id)||(p.kind==='deck'&&(r.source_deck===p.deckId||r.knowledge_deck===p.deckId)));
 for(const t of ['questions','memory_cards','learning_cards'])erase(t,r=>cards.has(r.id));
 for(const r of rows('memory_cards'))if(cards.has(r.legacy_question_id)&&!cards.has(r.id))blockers.push('其他卡片仍引用所选题目身份，禁止跨卡片级联删除。');
 const materials=new Set(rows('questions').filter(r=>cards.has(r.id)&&r.material_id).map(r=>r.material_id));
 erase('materials',r=>materials.has(r.id)&&!rows('questions').some(q=>q.material_id===r.id&&!cards.has(q.id)));
 for(const t of ['knowledge_specialty_prefs','knowledge_keys','analyses'])erase(t,r=>nodes.has(r.knowledge_id));
 erase('relations',r=>nodes.has(r.source_id)||nodes.has(r.target_id));
 // Fault rows and legacyRaw remain byte-exact; their FK targets history identities.
 erase('knowledge_history_identities',r=>(nodes.has(r.id)||rows('attempt_faults').some(f=>attempts.has(f.attempt_id)&&f.knowledge_id===r.id))&&!rows('attempt_faults').some(f=>f.knowledge_id===r.id&&!attempts.has(f.attempt_id))&&(!rows('knowledge').some(n=>n.id===r.id)||nodes.has(r.id)));
 const nodeRows=rows('knowledge'),byId=new Map(nodeRows.map(r=>[r.id,r]));
 const promotedParent=(r:Row)=>{let parent=r.parent_id;while(parent&&nodes.has(parent))parent=byId.get(parent)?.parent_id??null;return parent;};
 for(const r of nodeRows){if(nodes.has(r.id))mark('knowledge',r);else if(nodes.has(r.parent_id)){
  if(r.module!==p.deckId)blockers.push('存在跨卡片集的子节点，禁止调整其他集。');
  else mark('knowledge',r,{parent_id:promotedParent(r),version:Number(r.version)+1});
 }}
 // Rebuild surviving recycled components; deleting one node never silently deletes its children.
 for(const r of rows('recycle_batches')){
  if(r.kind==='unified-knowledge'){
   const batch=StoredKnowledgeRecycle.parse(JSON.parse(r.payload));
   if(p.kind==='deck'&&batch.deckId===p.deckId){mark('recycle_batches',r);continue;}
   if(!batch.nodes.some(n=>nodes.has(n.nodeId))&&!nodes.has(batch.mergedInto??''))continue;
   const remain=batch.nodes.filter(n=>!nodes.has(n.nodeId)).map(n=>{
    const raw=byId.get(n.nodeId),change=raw?changes.get('knowledge:'+raw._rowid):null;
    return change?.set?{...n,parentId:change.set.parent_id,revision:change.set.version-1,deletedRevision:change.set.version}:n;
   });mark('recycle_batches',r);
   const ids=new Set(remain.map(n=>n.nodeId));
   for(const root of remain.filter(n=>!n.parentId||!ids.has(n.parentId))){const component=new Set([root.nodeId]);let size=-1;while(size!==component.size){size=component.size;for(const n of remain)if(n.parentId&&component.has(n.parentId))component.add(n.nodeId);}
    const batchId='purge-remain:'+hash([batch.batchId,root.nodeId]).slice(0,40),value=StoredKnowledgeRecycle.parse({...batch,batchId,rootId:root.nodeId,nodes:remain.filter(n=>component.has(n.nodeId)),mergedInto:nodes.has(batch.mergedInto??'')?null:batch.mergedInto});
    insertions.push({table:'recycle_batches',value:{kind:r.kind,item_id:batchId,payload:JSON.stringify(value)}});
   }
  }else if(r.kind==='deck'){
   if((p.kind==='deck'&&r.item_id===p.deckId)||hit(r.payload)){
    try{const value=JSON.parse(r.payload),allowed=['learning_cards','questions','memory_cards','knowledge'];
     if(!value||Array.isArray(value)||Object.entries(value).some(([k,v])=>!allowed.includes(k)||!Array.isArray(v)||v.some(id=>typeof id!=='string')))throw Error();
     const next=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,(v as string[]).filter(id=>!all.has(id))]));
     if(p.kind==='deck'&&r.item_id===p.deckId){if(Object.values(next).some(v=>v.length))throw Error();mark('recycle_batches',r);}
     else mark('recycle_batches',r,{payload:JSON.stringify(next)});
    }catch{blockers.push('未识别或跨范围的卡片集恢复清单：recycle_batches/'+r.item_id);}
   }
  }else if(all.has(r.item_id)||hit(r.payload))blockers.push('存在未识别的回收引用，禁止不完整销毁。');
 }
 for(const r of rows('settings')){
  const key=String(r.key);let v:Row;try{v=JSON.parse(r.value);}catch{if(hit(r))blockers.push('存在未识别的设置引用：'+key.slice(0,100));continue;}
  if(key.startsWith('unified-card-knowledge:')){
   const l=StoredCardLinks.parse(v);if(cards.has(l.cardId))mark('settings',r);
   else if(l.nodeIds.some(id=>nodes.has(id)))mark('settings',r,{value:JSON.stringify(StoredCardLinks.parse({...l,revision:l.revision+1,nodeIds:l.nodeIds.filter(id=>!nodes.has(id))}))});
  }else if(key.startsWith('unified-knowledge-order:')){
   const o=StoredTreeOrder.parse(v);if(p.kind==='deck'&&o.deckId===p.deckId)mark('settings',r);
   else if(o.nodeIds.some(id=>nodes.has(id)))mark('settings',r,{value:JSON.stringify({...o,nodeIds:o.nodeIds.filter(id=>!nodes.has(id))})});
  }else if(key.startsWith('unified-archived-session:')){if(!sessions('settings',r,v)&&hit(r.value,cards))blockers.push('未识别的归档复盘引用：settings/'+key);}
  else if((key.startsWith('new-card-draft:')&&(cards.has(v.document?.cardId)||(p.kind==='deck'&&v.deckId===p.deckId)))||
   (key.startsWith('unified-card-policy:')&&cards.has(v.cardId))||
   (key.startsWith('unified-knowledge-body:')&&nodes.has(v.nodeId))||
   (key.startsWith('append-provenance:')&&p.kind==='deck'&&v.destinationDeckId===p.deckId))mark('settings',r);
  else if(/^(media-draft:|media-retired:)/.test(key)){if(p.kind==='deck'&&v.deckId===p.deckId)mark('settings',r);/* Only owned metadata; physical files remain unchanged. */}
  else if(hit(r))blockers.push('未识别或共享的保留记录：'+key.slice(0,100)+'；未删除该记录。');
 }
 if(p.kind==='deck'){
  for(const t of ['deck_review_policies','deck_assessment_policies','deck_review_config_v2','knowledge_specialty_prefs','saved_filters'])erase(t,r=>r.deck_id===p.deckId);

  for(const r of rows('attempt_evidence_snapshots'))if(r.deck_id===p.deckId&&!attempts.has(r.attempt_id))blockers.push('未选卡片的历史证据仍引用此卡片集：attempt_evidence_snapshots/'+r.attempt_id+'；保留其历史，不销毁该集。');
  erase('decks',r=>r.id===p.deckId);
  if(rows('decks').some(r=>r.parent_id===p.deckId))blockers.push('卡片集仍是其他卡片集的父节点，请先调整目录。');
 }
 planArchiveScope(tables,p.deckId,p.kind==='deck',nodes,mark,blockers);
 erase('import_entries',r=>all.has(r.local_id));
 for(const r of rows('saved_filters'))if(!changes.has('saved_filters:'+r._rowid)&&hit(r.payload))blockers.push('保存筛选文档仍有未证明的所选引用：saved_filters/'+r.id);
 for(const r of rows('import_entries'))if(!changes.has('import_entries:'+r._rowid)&&hit(r.archive_refs,nodes))blockers.push('导入来源文档包含未证明的本地知识引用：import_entries/'+r.entry_key);
 // Durable receipts retain request identity/digest but never replay destroyed content.
 for(const r of rows('protocol_receipts'))if(hit(r.response)){
  const previous=JSON.parse(r.response);mark('protocol_receipts',r,{response:JSON.stringify({ok:false,requestId:r.request_id,dataEpoch:previous.dataEpoch??r.epoch,error:{code:'DATA_PURGED',message:'该操作涉及的对象已永久删除，原请求不会重新执行',outcome:'rejected',retryable:false,fieldErrors:[]}})});
 }
 for(const r of rows('review_config_operations'))if(hit(r.response))blockers.push('排期操作恢复文档仍引用所选对象：review_config_operations/'+r.id+'；归属未证明。');
 for(const r of rows('audits'))if(hit(r.detail))mark('audits',r,{detail:'{"purged":true}'});
 // Unknown tables/opaque import reports that own selected data are a real blocker.
 const known=new Set(['settings','study_sessions','recycle_batches','protocol_receipts','audits','review_config_operations','import_entries','knowledge_archives','materials','decks','folders','protocol_meta','learning_model_meta','learning_owner','platform_operations','diagnosis_config','attempt_faults','knowledge_history_identities']);
 for(const [table,list] of tables){if(known.has(table))continue;
  for(const r of list){if(changes.has(table+':'+r._rowid))continue;
   const owns=[r.card_id,r.question_id,r.attempt_id,r.knowledge_id,r.source_id,r.target_id,r.deck_id,r.module].some(id=>all.has(id)||attempts.has(id));
   if(owns)blockers.push('未完整覆盖依赖：'+table+'；拒绝跨对象或未知级联。');
   if(table==='import_batches'&&hit(r))blockers.push('导入报告仍含所选对象的保留内容，请先核对报告范围。');
  }
 }
 // A deleted deck cannot remain the owner of staged metadata. Remove only
 // provably exclusive metadata, retain all bytes, reject surviving asset users.
 if(p.kind==='deck')for(const r of rows('settings').filter(r=>String(r.key).startsWith('media-draft:'))){
  const m=JSON.parse(r.value);if(m.deckId!==p.deckId)continue;
  for(const [table,list] of tables)for(const row of list){
   if(table==='settings'&&row._rowid===r._rowid)continue;
   const change=changes.get(table+':'+row._rowid);if(change&&!change.set)continue;
   const remaining={...row,...change?.set};if(JSON.stringify(remaining).includes(String(m.id)))blockers.push('图片元数据仍有未选引用：'+table+'/'+String(row.key??row.id??row._rowid).slice(0,100)+'；不销毁所属卡片集。');
  }
 }
 const rank=(c:Change)=>c.set?0:({attempt_evidence_snapshots:1,attempt_faults:1,question_knowledge:1,memory_knowledge:1,knowledge_specialty_prefs:1,knowledge_keys:1,relations:1,analyses:1,learning_review_events:2,learning_published_modes:3,learning_card_drafts:3,learning_study_cycles:4,learning_content_versions:4,memory_cards:5,questions:6,learning_cards:7,materials:8,knowledge:9,decks:10,knowledge_history_identities:11}[c.table]??2);
 const depth=(row:Row)=>{let n=row.parent_id,d=0;const seen=new Set();while(n&&!seen.has(n)){seen.add(n);d++;n=byId.get(n)?.parent_id;}return d;};
 const ordered=[...changes.values()].sort((a,b)=>rank(a)-rank(b)||(a.table==='knowledge'&&b.table==='knowledge'?depth(b.row)-depth(a.row):0)||a.table.localeCompare(b.table)||Number(a.row._rowid)-Number(b.row._rowid));
 const effects=[...new Set([...ordered.map(c=>c.table),...insertions.map(c=>c.table)])].map(table=>({table,deleted:ordered.filter(c=>c.table===table&&!c.set).length,updated:ordered.filter(c=>c.table===table&&c.set).length,created:insertions.filter(c=>c.table===table).length}));
 const objects=base.objects.filter(o=>o.kind!=='knowledge'||nodes.has(o.id));
 const meta=ctx.db.prepare('SELECT epoch,revision FROM protocol_meta WHERE singleton=1').get()!;
 const fingerprint=hash({contract:'native-purge/1',p,meta,ordered,insertions,blockers});
 const assets=new Set<string>();for(const c of ordered)for(const match of JSON.stringify(c.row).matchAll(/gank-asset:\/\/([a-f0-9-]+)|\\?"assetId\\?"\s*:\s*\\?"([a-f0-9-]+)\\?"/gi))assets.add(match[1]??match[2]);
 const deleted=(table:string)=>ordered.filter(c=>c.table===table&&!c.set).length;
 const counts={...base.counts,knowledge:nodes.size,versions:deleted('learning_content_versions'),cycles:deleted('learning_study_cycles'),events:deleted('learning_review_events'),drafts:deleted('learning_card_drafts'),schedules:deleted('scheduling'),sessions:deleted('study_sessions'),imageReferences:assets.size,referenceDocuments:ordered.filter(c=>['settings','recycle_batches','protocol_receipts'].includes(c.table)).length};
 const retainedFiles=readdirSync(join(ctx.dataDir,'attachments'),{withFileTypes:true}).filter(entry=>entry.isFile()&&!entry.isSymbolicLink()).length;
 const preservedCards=p.kind==='knowledge'?rows('learning_cards').filter(r=>r.deck_id===p.deckId).length:0;
 return {p,base,objects,cards,nodes,ordered,insertions,effects,blockers:[...new Set(blockers)],fingerprint,counts,retainedFiles,preservedCards,meta};
}
