import {installKnowledgeHistory} from '../electron/infrastructure/migrations/knowledge-history.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync,type SQLInputValue} from 'node:sqlite';
import {join} from 'node:path';
import {copyFileSync,mkdirSync,readFileSync} from 'node:fs';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {scanExternalDatabase} from '../electron/modules/storage-unified/external-scan.ts';
import {collectAppendGraph} from '../electron/modules/storage-unified/append-graph.ts';
import {mapAppendGraph,type MappedAppendGraph} from '../electron/modules/storage-unified/append-map.ts';
import {UNIFIED_SCHEMA} from '../electron/infrastructure/migrations/unified-schema.ts';
import {validateBusinessData} from '../electron/infrastructure/integrity.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
import {placementUrl} from '../shared/editor/document.ts';
import {knowledgePlacements} from '../shared/knowledge/media.ts';
import {stageImage} from '../electron/modules/media/drafts.ts';

function materialize(mapped:MappedAppendGraph,root:string,sourceDirectory:string,unified:boolean){
 const dir=join(root,'mapped-'+mapped.operationId);mkdirSync(join(dir,'attachments'),{recursive:true});
 for(const file of mapped.media)copyFileSync(join(sourceDirectory,'attachments',file.sourceName),join(dir,'attachments',file.destinationName));
 const path=join(dir,'ganksoft.sqlite'),db=new DatabaseSync(path);
 try{
  db.exec(readFileSync(new URL('./fixtures/schema604.sql',import.meta.url),'utf8').replace(/\r\n?/g,'\n'));db.exec('PRAGMA foreign_keys=ON;BEGIN;PRAGMA defer_foreign_keys=ON');
  if(unified){db.exec(UNIFIED_SCHEMA);db.prepare("INSERT INTO learning_model_meta VALUES(1,604,606,'staged',?)").run('a'.repeat(64));db.exec('PRAGMA user_version=606');if(mapped.tables.knowledge_history_identities)installKnowledgeHistory(db);}
  db.prepare('INSERT INTO protocol_meta VALUES(1,?,0,1)').run(randomUUID());
  for(const [table,rows]of Object.entries(mapped.tables))for(const r of rows){const keys=Object.keys(r);db.prepare(`INSERT ${table==='knowledge_history_identities'?'OR IGNORE ':''}INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...Object.values(r) as SQLInputValue[]);}
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);validateBusinessData(db);db.exec('COMMIT');return {db,dir,path};
 }catch(e){if(db.isTransaction)db.exec('ROLLBACK');db.close();throw e;}
}

test('T39 complete606 mapped graph reopens with exact immutable projections, native modes/drafts/sessions/FSRS and knowledge media/recycle integrity',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const question=await f.card('question'),qa=await f.card('qa'),direct=await f.card('direct');
  await f.client.call('draft.save',{deckId:qa.deckId,cardId:qa.cardId,expectedPublishedRevision:1,expectedDraftRevision:null,fields:{title:'待续草稿',payload:qa.payload,mediaRefs:[]}});await f.client.call('draft.create',{deckId:qa.deckId,initialType:'direct'});
  let s=await f.client.call('learning.session.open',{deckId:direct.deckId,cardIds:[direct.cardId]});s=await f.client.call('learning.session.change',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:85}});
  const event=await f.client.call('learning.review.submit',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:85,faults:[],gaps:'',reflection:'',practice:false});
  s=await f.client.call('learning.session.get',{deckId:s.deckId,sessionId:s.sessionId});await f.client.call('learning.session.change',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'next'});
  await f.client.call('learning.session.open',{deckId:question.deckId,cardIds:[question.cardId]});
  const node=await f.client.call('knowledge.node.read',{deckId:qa.deckId,nodeId:f.source.ids.child1}),bytes=readFileSync(join(f.ctx.dataDir,'attachments',f.source.ids.currentImage+'.png')),image=stageImage(f.ctx,qa.deckId,'knowledge',bytes,'image/png');
  await f.client.call('knowledge.node.save',{deckId:qa.deckId,nodeId:node.nodeId,expectedRevision:node.revision,markdown:[30,80].map(width=>`![知识](${placementUrl({assetId:image.id,placementId:randomUUID(),width})})`).join('\n\n')});
  const tree=await f.client.call('knowledge.tree.read',{deckId:qa.deckId});await f.client.call('knowledge.subtree.delete',{deckId:qa.deckId,nodeId:node.nodeId,expectedTreeHash:tree.treeHash});
  const before=inspectDatabaseBaseline(join(f.ctx.dataDir,'ganksoft.sqlite'),f.ctx.dataDir),scan=await scanExternalDatabase(join(f.ctx.dataDir,'ganksoft.sqlite'),f.source.root);try{
   const source=collectAppendGraph(scan,[f.source.ids.qDeck,f.source.ids.mDeck,f.source.ids.trashDeck]),operation=randomUUID(),mapped=mapAppendGraph(source,operation),target=materialize(mapped,f.source.root,scan.candidateDirectory,true);
   try{
    assert.deepEqual(mapAppendGraph(source,operation),mapped);assert.equal(mapped.tables.learning_cards!.length,source.tables.learning_cards!.length);assert.equal(mapped.tables.learning_review_events!.length,source.tables.learning_review_events!.length);
    assert.deepEqual(new Set(mapped.tables.learning_cards!.map(r=>r.published_type)),new Set(['question','qa','direct']));assert.equal(mapped.tables.learning_card_drafts!.length,1);
    const e=JSON.parse(String(mapped.tables.learning_review_events!.find(r=>JSON.parse(String(r.document)).native)?.document));assert.equal(e.native.submissionHash,event.native!.submissionHash);assert.deepEqual(e.native.schedule,event.native!.schedule);assert.equal(e.scoreTenths,85);
    const state=JSON.parse(String(mapped.tables.scheduling!.find(r=>r.card_id===e.cardId)!.data)),original=JSON.parse(String(source.tables.scheduling!.find(r=>r.card_id===direct.cardId)!.data));delete state._gank;delete original._gank;assert.deepEqual(state,original);
    const body=JSON.parse(String(mapped.tables.settings!.find(r=>String(r.key).startsWith('unified-knowledge-body:'))!.value));assert.deepEqual(knowledgePlacements(body.markdown).map(p=>p.width),[30,80]);assert.notEqual(body.assets[0].id,image.id);assert.ok(mapped.tables.recycle_batches!.some(r=>r.kind==='unified-knowledge'));
    const live=mapped.tables.study_sessions!.map(r=>JSON.parse(String(r.payload))).find(s=>s.encoding==='ganksoft.review-session/1'&&!s.completed);assert.equal(live.resumedAt,null);
    const log=JSON.parse(String(mapped.tables.schedule_events!.find(r=>r.id===e.eventId)!.log));assert.equal(log.cycleId,e.cycleId);assert.equal(log.versionId,e.contentVersionId);
    const baseline=inspectDatabaseBaseline(target.path,target.dir,606);assert.equal(baseline.media.length,mapped.media.length);target.db.close();const reopened=new DatabaseSync(target.path);try{validateBusinessData(reopened);}finally{reopened.close();}assert.equal(inspectDatabaseBaseline(target.path,target.dir).digest,baseline.digest);
   }finally{if(target.db.isOpen)target.db.close();}
   assert.deepEqual(inspectDatabaseBaseline(join(f.ctx.dataDir,'ganksoft.sqlite'),f.ctx.dataDir),before);
  }finally{scan.close();}
 }finally{f.close();}
});

test('T39 legacy actual Markdown image placements remap independently and unknown historical facts stay unknown in a valid604 output',async()=>{
 const f=schema604Fixture();try{
  const uri=placementUrl({assetId:f.ids.currentImage,placementId:randomUUID(),width:37});f.db.prepare('UPDATE questions SET stem=? WHERE id=?').run('原字面ID '+f.ids.question+'\n\n![原图]('+uri+')\n\n`![代码]('+uri+')`',f.ids.question);
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),scan=await scanExternalDatabase(f.databasePath,f.root);try{
   const graph=collectAppendGraph(scan,[f.ids.qDeck]),mapped=mapAppendGraph(graph,randomUUID()),target=materialize(mapped,f.root,scan.candidateDirectory,false);try{
    const stem=String(mapped.tables.questions![0]!.stem),p=knowledgePlacements(stem);assert.equal(p.length,1);assert.equal(p[0]!.width,37);assert.notEqual(p[0]!.assetId,f.ids.currentImage);assert.ok(stem.includes('原字面ID '+f.ids.question));assert.ok(stem.includes('`![代码]('+uri+')`'));
    assert.equal(mapped.tables.attempts!.find(r=>r.question_snapshot==='')!.question_snapshot,'');assert.equal(inspectDatabaseBaseline(target.path,target.dir,604).media.length,4);
   }finally{target.db.close();}assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);
  }finally{scan.close();}
 }finally{f.close();}
});

test('T39 valid abandoned answer media is retained, missing ownership rejects and moved legacy session cards require explicit dependency selection',async()=>{
 const f=schema604Fixture();try{
  const s=f.db.prepare('SELECT * FROM study_sessions').get()!,payload=JSON.parse(String(s.payload));payload.abandonedDrafts=[{cardId:f.ids.question,entryId:'old',thought:'原稿',responseImages:[f.ids.responseImage]}];f.db.prepare('UPDATE study_sessions SET payload=?').run(JSON.stringify(payload));
  let scan=await scanExternalDatabase(f.databasePath,f.root);try{const graph=collectAppendGraph(scan,[f.ids.qDeck]);assert.ok(graph.media.some(m=>m.name===f.ids.responseImage+'.png'));const mapped=mapAppendGraph(graph,randomUUID());const page=JSON.parse(String(mapped.tables.study_sessions![0]!.payload));assert.notEqual(page.abandonedDrafts[0].responseImages[0],f.ids.responseImage);}finally{scan.close();}
  payload.abandonedDrafts[0].responseImages=[randomUUID()];f.db.prepare('UPDATE study_sessions SET payload=?').run(JSON.stringify(payload));scan=await scanExternalDatabase(f.databasePath,f.root);try{assert.throws(()=>collectAppendGraph(scan,[f.ids.qDeck]),/APPEND_SESSION_MEDIA_INCOMPLETE/);}finally{scan.close();}
  payload.abandonedDrafts=[];payload.ids=[f.ids.memory];f.db.prepare('UPDATE study_sessions SET payload=?').run(JSON.stringify(payload));scan=await scanExternalDatabase(f.databasePath,f.root);try{assert.throws(()=>collectAppendGraph(scan,[f.ids.qDeck]),/APPEND_SELECTION_INCOMPLETE/);assert.equal(collectAppendGraph(scan,[f.ids.qDeck,f.ids.mDeck]).tables.memory_cards!.length,1);}finally{scan.close();}
 }finally{f.close();}
});
