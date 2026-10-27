import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync,type SQLInputValue} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {AppendIdentityMap} from '../electron/modules/storage-unified/append-identities.ts';
import {AppendMetadataMap} from '../electron/modules/storage-unified/append-metadata.ts';
import {AppendLegacyMap} from '../electron/modules/storage-unified/append-legacy.ts';
import {scanExternalDatabase} from '../electron/modules/storage-unified/external-scan.ts';
import {collectAppendGraph} from '../electron/modules/storage-unified/append-graph.ts';
import {validateBusinessData} from '../electron/infrastructure/integrity.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
import {dueEligibility} from '../electron/modules/review/due-eligibility.ts';
import type {Row} from '../electron/modules/cards-unified/legacy.ts';

function insert(db:DatabaseSync,table:string,row:Row){const keys=Object.keys(row);db.prepare(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...Object.values(row) as SQLInputValue[]);}

test('T39 selected604 graph metadata commits with all FK/business checks, independent archive namespaces and preserved original artifacts',async()=>{
 const f=schema604Fixture(),target=new DatabaseSync(':memory:');try{
  f.insert('knowledge_archives',{id:'synthetic:archive',archive_key:'synthetic:pack',module:f.ids.qDeck,version_label:'v1',content:JSON.stringify({archiveId:'synthetic:pack',nodes:[{key:'local-node-key',name:f.ids.child1}]}),checksum:'original-artifact-checksum',created_at:f.at});
  f.insert('knowledge_keys',{archive_key:'synthetic:pack',node_key:'local-node-key',knowledge_id:f.ids.child1});
  f.db.prepare('UPDATE saved_filters SET payload=?').run(JSON.stringify({query:f.ids.question,knowledge:[f.ids.child1],match:'all'}));
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),scan=await scanExternalDatabase(f.databasePath,f.root);try{
   const graph=collectAppendGraph(scan,[f.ids.qDeck,f.ids.mDeck,f.ids.trashDeck]),ids=new AppendIdentityMap(randomUUID()),metadata=new AppendMetadataMap(ids),legacy=new AppendLegacyMap(ids);
   target.exec(readFileSync(new URL('./fixtures/schema604.sql',import.meta.url),'utf8').replace(/\r\n?/g,'\n'));target.exec('PRAGMA foreign_keys=ON;BEGIN;PRAGMA defer_foreign_keys=ON');
   const legacyTables=['questions','memory_cards','materials','assets','attempts','memory_reviews','attempt_faults','attempt_evidence_snapshots','schedule_events','scheduling'];
   for(const [table,rows]of Object.entries(graph.tables))for(const r of rows){
    const mapped=legacyTables.includes(table)?legacy.row(table,r):table==='decks'?metadata.deck(r,graph.selectedDeckIds,null):table==='settings'?metadata.setting(r):table==='study_sessions'?metadata.session(r):table==='recycle_batches'?metadata.recycle(r):metadata.row(table,r);insert(target,table,mapped);
   }
   assert.deepEqual(target.prepare('PRAGMA foreign_key_check').all(),[]);target.exec('COMMIT');validateBusinessData(target);
   const source=f.db.prepare('SELECT * FROM knowledge_archives').get()!,archive=target.prepare('SELECT * FROM knowledge_archives').get()!;
   assert.notEqual(archive.id,source.id);assert.notEqual(archive.archive_key,source.archive_key);assert.equal(archive.content,source.content);assert.equal(archive.checksum,source.checksum);
   const k=target.prepare('SELECT * FROM knowledge_keys').get()!;assert.equal(k.archive_key,archive.archive_key);assert.equal(k.knowledge_id,ids.id('knowledge',f.ids.child1));assert.equal(k.node_key,'local-node-key');
   const filter=JSON.parse(String(target.prepare('SELECT payload FROM saved_filters').get()!.payload));assert.equal(filter.query,f.ids.question);assert.deepEqual(filter.knowledge,[ids.id('knowledge',f.ids.child1)]);
   const relation=target.prepare('SELECT * FROM relations').get()!;assert.ok(String(relation.source_id)<String(relation.target_id));assert.equal(relation.note,'合成关系');
   const session=JSON.parse(String(target.prepare('SELECT payload FROM study_sessions').get()!.payload));assert.equal(session.timerPaused,true);assert.equal(session.totalSeconds,123);assert.equal(session.thought,'未提交草稿原文');assert.deepEqual(session.responseImages,[ids.id('asset',f.ids.responseImage)]);
   const trash=JSON.parse(String(target.prepare('SELECT payload FROM recycle_batches').get()!.payload));assert.deepEqual(trash.questions,[ids.id('card',f.ids.trashQuestion)]);assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);
  }finally{scan.close();}
 }finally{target.close();f.close();}
});

test('T39 legacy result and pending session identities match mapped receipts while original hashes, drafts and elapsed time remain evidence',()=>{
 const f=schema604Fixture();try{
  const ids=new AppendIdentityMap(randomUUID()),m=new AppendMetadataMap(ids),row=f.db.prepare('SELECT * FROM study_sessions').get()!,base=JSON.parse(String(row.payload)),receipt=f.db.prepare("SELECT * FROM review_receipts WHERE kind='question'").get()!;
  const result=m.session({...row,payload:JSON.stringify({...base,stage:'result',entryId:receipt.request_id,savedResult:JSON.parse(String(receipt.response))})});
  const p=JSON.parse(String(result.payload)),mappedReceipt=m.row('review_receipts',receipt);assert.equal(p.entryId,mappedReceipt.request_id);assert.equal(p.savedResult.attemptId,JSON.parse(String(mappedReceipt.response)).attemptId);assert.equal(mappedReceipt.payload_hash,receipt.payload_hash);
  const pending={question_id:f.ids.question,deck_id:f.ids.qDeck,session_id:base.sessionId,request_id:base.entryId,content_version:2,response_images:[f.ids.responseImage],error_knowledge_ids:[f.ids.child1],thought:f.ids.question,elapsed_seconds:17};
  const saved=m.session({...row,payload:JSON.stringify({...base,stage:'reveal',pendingSubmission:pending,abandonedDrafts:[{cardId:f.ids.question,entryId:'old-entry',thought:f.ids.question,responseImages:[f.ids.responseImage],contentVersion:1}]})}),s=JSON.parse(String(saved.payload));
  assert.equal(s.pendingSubmission.request_id,s.entryId);assert.equal(s.pendingSubmission.session_id,s.sessionId);assert.equal(s.pendingSubmission.question_id,s.ids[0]);assert.equal(s.pendingSubmission.thought,pending.thought);assert.equal(s.pendingSubmission.elapsed_seconds,17);assert.equal(s.timerPaused,true);assert.equal(s.totalSeconds,123);assert.equal(s.abandonedDrafts[0].thought,f.ids.question);assert.equal(s.abandonedDrafts[0].cardId,s.ids[0]);assert.deepEqual(s.pendingSubmission.error_knowledge_ids,[ids.id('knowledge',f.ids.child1)]);
 }finally{f.close();}
});

test('T39 due override anchor identity transformation preserves both active eligibility and an existing stale conflict without recalculating FSRS',()=>{
 const f=schema604Fixture();try{
  const ctx={db:f.db,dataDir:f.dataDir,now:()=>new Date(f.at)},anchor=dueEligibility(ctx,'question',f.ids.question).anchor,ids=new AppendIdentityMap(randomUUID()),m=new AppendMetadataMap(ids),raw=JSON.parse(anchor);
  const source={kind:'question',card_id:f.ids.question,source:'policy',effective_due:f.at,operation_id:'source-operation',anchor,created_at:f.at},mapped=m.row('review_due_overrides',source),a=JSON.parse(String(mapped.anchor));
  assert.equal(a.module,ids.id('deck',f.ids.qDeck));assert.equal(a.plan.question_id,ids.id('card',f.ids.question));assert.deepEqual(a.fsrs,raw.fsrs);assert.equal(a.editVersion,raw.editVersion);assert.equal(a.version,raw.version);assert.equal(mapped.effective_due,source.effective_due);
  const stale=m.row('review_due_overrides',{...source,anchor:JSON.stringify({...raw,editVersion:raw.editVersion-1})});assert.notEqual(stale.anchor,mapped.anchor);
  const operation=m.row('review_config_operations',{id:'source-operation',request_id:'source-request',digest:'original-request-proof',response:JSON.stringify({operationId:'source-operation',count:2}),created_at:f.at});assert.equal(operation.id,mapped.operation_id);assert.equal(operation.digest,'original-request-proof');assert.equal(JSON.parse(String(operation.response)).operationId,operation.id);
 }finally{f.close();}
});

test('T39 scoped settings and subtree recycle use mapped keys and IDs while source bytes and per-placement facts stay independent',()=>{
 const ids=new AppendIdentityMap(randomUUID()),m=new AppendMetadataMap(ids),deck='source:deck',node='source:node',card='source:card';
 const body={encoding:'ganksoft.knowledge-body/1',nodeId:node,deckId:deck,markdown:card,assets:[]},mapped=m.setting({key:'unified-knowledge-body:'+node,value:JSON.stringify(body)}),b=JSON.parse(String(mapped.value));assert.equal(mapped.key,'unified-knowledge-body:'+b.nodeId);assert.equal(b.markdown,card);assert.equal(b.deckId,ids.id('deck',deck));
 const batch={encoding:'ganksoft.knowledge-recycle/1',batchId:'source:batch',deckId:deck,rootId:node,nodes:[{nodeId:node,parentId:null,name:'旧根',position:0,revision:2,deletedRevision:3}],mergedInto:null,createdAt:'2026-10-18T02:00:00.000Z'},recycled=m.recycle({kind:'unified-knowledge',item_id:batch.batchId,payload:JSON.stringify(batch)}),r=JSON.parse(String(recycled.payload));assert.equal(r.batchId,recycled.item_id);assert.equal(r.rootId,b.nodeId);assert.equal(r.nodes[0].deletedRevision,3);
 assert.throws(()=>m.setting({key:'unified-future:'+node,value:'{}'}),/APPEND_SETTING_UNSUPPORTED/);assert.throws(()=>m.recycle({kind:'knowledge',item_id:node,payload:'{}'}),/APPEND_RECYCLE_UNSUPPORTED/);assert.throws(()=>m.row('saved_filters',{id:'filter',deck_id:deck,payload:'{"futureReference":"unknown"}'}),/APPEND_FILTER_UNSUPPORTED/);
});
