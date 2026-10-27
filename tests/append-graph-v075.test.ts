import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {writeFileSync,readFileSync} from 'node:fs';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {scanExternalDatabase} from '../electron/modules/storage-unified/external-scan.ts';
import {collectAppendGraph} from '../electron/modules/storage-unified/append-graph.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';

test('T39 a selected legacy deck graph includes raw historical evidence, media-only archives, response/unbound assets and its policies while excluding unselected/global data',async()=>{
 const f=schema604Fixture();try{
  const other=randomUUID(),orphan=randomUUID(),image=readFileSync(join(f.dataDir,'attachments',f.ids.currentImage+'.png'));
  writeFileSync(join(f.dataDir,'attachments',other+'.png'),image);writeFileSync(join(f.dataDir,'attachments',orphan+'.png'),image);
  f.insert('assets',{id:other,question_id:f.ids.trashQuestion,role:'question',file_name:other+'.png',mime:'image/png',sort_order:0});
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),scan=await scanExternalDatabase(f.databasePath,f.root);try{
   const graph=collectAppendGraph(scan,[f.ids.qDeck]);assert.equal(graph.sourceSchema,604);assert.deepEqual(graph.selectedDeckIds,[f.ids.qDeck]);assert.equal(graph.tables.decks!.length,1);assert.equal(graph.tables.questions!.length,1);assert.equal(graph.tables.memory_cards!.length,0);assert.equal(graph.tables.memory_reviews!.length,0);
   assert.deepEqual(new Set(graph.tables.attempts!.map(r=>r.id)),new Set([f.ids.attempt1,f.ids.attempt2]));assert.equal(graph.tables.attempts!.find(r=>r.id===f.ids.attempt2)!.question_snapshot,'');assert.equal(graph.tables.attempts!.find(r=>r.id===f.ids.attempt1)!.self_score,9.3);assert.ok(graph.tables.attempt_faults!.length&&graph.tables.attempt_evidence_snapshots!.length);
   for(const table of ['plans','scheduling','schedule_events','review_receipts','deck_review_config_v2','card_review_policies','study_sessions','saved_filters'])assert.ok(graph.tables[table]!.length,table);
   assert.deepEqual(new Set(graph.media.map(m=>m.name)),new Set([f.ids.currentImage,f.ids.historicalImage,f.ids.responseImage,f.ids.unboundImage].map(id=>id+'.png')));
   assert.ok(!graph.media.some(m=>m.name===other+'.png'||m.name===orphan+'.png'));assert.ok(graph.references.some(r=>r.owner==='attempts/'+f.ids.attempt1&&r.fileName===f.ids.historicalImage+'.png'));
   assert.ok(graph.tables.settings!.every(r=>String(r.key).startsWith('media-draft:')));assert.ok(!('protocol_receipts'in graph.tables)&&!('platform_operations'in graph.tables)&&!('audits'in graph.tables));
   assert.deepEqual(scan.verify(),before);assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);
  }finally{scan.close();}
 }finally{f.close();}
});

test('T39 required deck dependencies block an incomplete graph; an explicitly closed subset preserves its source IDs without pulling unrelated trash decks',async()=>{
 const f=schema604Fixture();try{const scan=await scanExternalDatabase(f.databasePath,f.root);try{
  assert.throws(()=>collectAppendGraph(scan,[f.ids.mDeck]),/APPEND_SELECTION_INCOMPLETE/);
  const a=collectAppendGraph(scan,[f.ids.qDeck,f.ids.mDeck]),b=collectAppendGraph(scan,[f.ids.mDeck,f.ids.qDeck]);
  assert.equal(a.graphDigest,b.graphDigest);assert.equal(a.tables.decks!.length,2);assert.equal(a.tables.memory_cards!.length,1);assert.equal(a.tables.memory_cards![0]!.legacy_question_id,f.ids.question);assert.equal(a.tables.memory_reviews!.length,2);assert.ok(!a.tables.questions!.some(r=>r.id===f.ids.trashQuestion));
 }finally{scan.close();}}finally{f.close();}
});

test('T39 selected606 graph retains all native modes/versions, unpublished and existing drafts, immutable review JSON and exact FSRS state without replay',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  await f.card('question');const qa=await f.card('qa'),direct=await f.card('direct');
  await f.client.call('draft.save',{deckId:qa.deckId,cardId:qa.cardId,expectedPublishedRevision:1,expectedDraftRevision:null,fields:{title:'尚未发布的变更',payload:qa.payload,mediaRefs:[]}});
  await f.client.call('draft.create',{deckId:qa.deckId,initialType:'direct'});
  let s=await f.client.call('learning.session.open',{deckId:direct.deckId,cardIds:[direct.cardId]});s=await f.client.call('learning.session.change',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:85}});
  const event=await f.client.call('learning.review.submit',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:85,faults:[],gaps:'',reflection:'',practice:false});
  const before=inspectDatabaseBaseline(join(f.ctx.dataDir,'ganksoft.sqlite'),f.ctx.dataDir),raw=String(f.ctx.db.prepare('SELECT document FROM learning_review_events WHERE id=?').get(event.eventId)!.document),state=String(f.ctx.db.prepare('SELECT data FROM scheduling WHERE card_id=?').get(direct.cardId)!.data);
  const scan=await scanExternalDatabase(join(f.ctx.dataDir,'ganksoft.sqlite'),f.source.root);try{
   const graph=collectAppendGraph(scan,[qa.deckId]);assert.equal(graph.sourceSchema,606);assert.deepEqual(new Set(graph.tables.learning_cards!.map(r=>r.published_type)),new Set(['question','qa','direct']));
   assert.equal(graph.tables.learning_review_events!.find(r=>r.id===event.eventId)!.document,raw);assert.equal(graph.tables.scheduling!.find(r=>r.card_id===direct.cardId)!.data,state);
   assert.equal(graph.tables.learning_card_drafts!.length,1);assert.ok(String(graph.tables.learning_card_drafts![0]!.payload).includes('尚未发布的变更'));assert.equal(graph.tables.settings!.filter(r=>String(r.key).startsWith('new-card-draft:')).length,1);
   assert.ok(graph.tables.learning_content_versions!.length>=6);assert.deepEqual(scan.verify(),before);assert.deepEqual(inspectDatabaseBaseline(join(f.ctx.dataDir,'ganksoft.sqlite'),f.ctx.dataDir),before);
  }finally{scan.close();}
 }finally{f.close();}
});

test('T39 per-selection graph digest is stable across unrelated global changes and changes when selected facts change',async()=>{
 const f=schema604Fixture();try{
  const scan=await scanExternalDatabase(f.databasePath,f.root);let old:string;
  try{old=collectAppendGraph(scan,[f.ids.qDeck]).graphDigest;}finally{scan.close();}
  f.insert('settings',{key:'unrelated-ui-preference',value:'synthetic change'});
  const next=await scanExternalDatabase(f.databasePath,f.root);try{assert.equal(collectAppendGraph(next,[f.ids.qDeck]).graphDigest,old);}finally{next.close();}
  f.db.prepare('UPDATE questions SET stem=stem||? WHERE id=?').run('已修改来源题干',f.ids.question);
  const changed=await scanExternalDatabase(f.databasePath,f.root);try{assert.notEqual(collectAppendGraph(changed,[f.ids.qDeck]).graphDigest,old);}finally{changed.close();}
 }finally{f.close();}
});

test('T39 unknown source tables are rejected as unsupported instead of silently discarding possible learning data',async()=>{
 const f=schema604Fixture();try{
  f.db.exec("CREATE TABLE source_extension(id TEXT PRIMARY KEY,payload TEXT);INSERT INTO source_extension VALUES('synthetic','preserve')");
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),scan=await scanExternalDatabase(f.databasePath,f.root);try{
   assert.throws(()=>collectAppendGraph(scan,[f.ids.qDeck]),/APPEND_TABLE_UNSUPPORTED/);assert.deepEqual(scan.verify(),before);assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);
  }finally{scan.close();}
 }finally{f.close();}
});

test('T39 unknown learning metadata prefixes fail closed while unrelated global preferences stay outside the append graph',async()=>{
 const f=schema604Fixture();try{
  f.insert('settings',{key:'unified-future-learning:'+f.ids.question,value:JSON.stringify({deckId:f.ids.qDeck,importantSyntheticFact:'preserve'})});
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),scan=await scanExternalDatabase(f.databasePath,f.root);try{
   assert.throws(()=>collectAppendGraph(scan,[f.ids.qDeck]),/APPEND_SETTINGS_UNSUPPORTED/);assert.deepEqual(scan.verify(),before);assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);
  }finally{scan.close();}
 }finally{f.close();}
});
