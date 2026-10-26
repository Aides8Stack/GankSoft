import test from 'node:test';
import assert from 'node:assert/strict';
import {KnowledgePreference} from '../shared/review-config.ts';
import {randomUUID} from 'node:crypto';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {scanExternalDatabase} from '../electron/modules/storage-unified/external-scan.ts';
import {planAppendSelection,requireClosedAppendSelection} from '../electron/modules/storage-unified/append-selection.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
import {join} from 'node:path';

test('T39 selected memory deck exposes its real legacy-question FK dependency without silently copying or detaching it',async()=>{
 const f=schema604Fixture();try{
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),scan=await scanExternalDatabase(f.databasePath,f.root);try{
   const plan=planAppendSelection(scan,[f.ids.mDeck]);assert.equal(plan.closed,false);assert.deepEqual(plan.selectedDeckIds,[f.ids.mDeck]);assert.equal(plan.requiredDecks.length,1);assert.equal(plan.requiredDecks[0]!.sourceDeckId,f.ids.qDeck);assert.ok(plan.requiredDecks[0]!.reasons.some(r=>r.kind==='legacy-question-origin'&&r.sourceId===f.ids.memory));
   assert.throws(()=>requireClosedAppendSelection(scan,[f.ids.mDeck]),/APPEND_SELECTION_INCOMPLETE/);
   const accepted=planAppendSelection(scan,[f.ids.mDeck,f.ids.qDeck]);assert.equal(accepted.closed,true);assert.deepEqual(requireClosedAppendSelection(scan,[f.ids.mDeck,f.ids.qDeck]),[f.ids.qDeck,f.ids.mDeck].sort());assert.ok(!accepted.selectedDeckIds.includes(f.ids.trashDeck));
   assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);assert.deepEqual(scan.verify(),before);
  }finally{scan.close();}
 }finally{f.close();}
});

test('T39 independent question subset stays a subset, selection validation rejects missing/duplicate sources and result mutation cannot change the scan',async()=>{
 const f=schema604Fixture();try{const scan=await scanExternalDatabase(f.databasePath,f.root);try{
  const p=planAppendSelection(scan,[f.ids.qDeck]);assert.equal(p.closed,true);assert.deepEqual(p.requiredDecks,[]);assert.deepEqual(p.selectedDeckIds,[f.ids.qDeck]);
  p.selectedDeckIds.push('mutated');assert.deepEqual(planAppendSelection(scan,[f.ids.qDeck]).selectedDeckIds,[f.ids.qDeck]);
  assert.throws(()=>planAppendSelection(scan,[]),/APPEND_SELECTION_INVALID/);assert.throws(()=>planAppendSelection(scan,[f.ids.qDeck,f.ids.qDeck]),/APPEND_SELECTION_INVALID/);assert.throws(()=>planAppendSelection(scan,[randomUUID()]),/APPEND_SOURCE_DECK_MISSING/);
 }finally{scan.close();}}finally{f.close();}
});

test('T39 cross-deck knowledge links form a finite explicit dependency closure while unrelated decks and source names remain unchanged',async()=>{
 const f=schema604Fixture();try{
  // The existing schema permits cross-deck relations; current card links are
  // still deck-isolated. Selection must show this dependency instead of dropping it.
  const [a,b]=[f.ids.child1,f.ids.memoryNode].sort();f.insert('relations',{id:randomUUID(),source_id:a,target_id:b,kind:'跨集合成',note:'keep'});
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),scan=await scanExternalDatabase(f.databasePath,f.root);try{
   const p=planAppendSelection(scan,[f.ids.qDeck]);assert.equal(p.requiredDecks.length,1);assert.equal(p.requiredDecks[0]!.sourceDeckId,f.ids.mDeck);assert.ok(p.requiredDecks[0]!.reasons.some(r=>r.kind==='knowledge-relation'));
   // The memory -> question dependency closes a cycle; it is neither recursive
   // cloning nor an automatic merge with any same-named target object.
   const complete=planAppendSelection(scan,[f.ids.qDeck,f.ids.mDeck]);assert.equal(complete.closed,true);assert.equal(complete.selectedDeckIds.length,2);assert.deepEqual(scan.verify(),before);assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);
  }finally{scan.close();}
 }finally{f.close();}
});

test('T39 activated606 selection planning reads the captured snapshot and does not access or write the active application database',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  await f.card('direct');const before=inspectDatabaseBaseline(join(f.ctx.dataDir,'ganksoft.sqlite'),f.ctx.dataDir),scan=await scanExternalDatabase(join(f.ctx.dataDir,'ganksoft.sqlite'),f.source.root);
  try{const p=planAppendSelection(scan,[f.source.ids.qDeck]);assert.equal(p.closed,true);assert.equal(p.snapshotDigest,scan.summary.snapshotDigest);assert.deepEqual(inspectDatabaseBaseline(join(f.ctx.dataDir,'ganksoft.sqlite'),f.ctx.dataDir),before);scan.close();assert.throws(()=>planAppendSelection(scan,[f.source.ids.qDeck]),/EXTERNAL_SCAN_CLOSED/);}finally{scan.close();}
 }finally{f.close();}
});

test('T39 historical evidence and orphan knowledge preferences keep their true source scopes and expose dependencies instead of being relabelled',async()=>{
 const f=schema604Fixture();try{
  f.db.prepare('UPDATE attempt_evidence_snapshots SET deck_id=? WHERE attempt_id=?').run(f.ids.mDeck,f.ids.attempt1);
  f.insert('knowledge_specialty_prefs',{deck_id:f.ids.qDeck,knowledge_id:f.ids.memoryNode,payload:JSON.stringify(KnowledgePreference.parse({boost:1.2})),revision:1,updated_at:f.at});
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),scan=await scanExternalDatabase(f.databasePath,f.root);try{
   const p=planAppendSelection(scan,[f.ids.qDeck]),dep=p.requiredDecks.find(d=>d.sourceDeckId===f.ids.mDeck)!;
   assert.ok(dep.reasons.some(r=>r.kind==='historical-evidence-deck'));assert.ok(dep.reasons.some(r=>r.kind==='knowledge-preference'));
   assert.equal(f.db.prepare('SELECT deck_id FROM attempt_evidence_snapshots WHERE attempt_id=?').get(f.ids.attempt1)!.deck_id,f.ids.mDeck);assert.deepEqual(scan.verify(),before);assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);
  }finally{scan.close();}
 }finally{f.close();}
});

test('T39 a real completed review page archived by card move retains the moved card dependency without mutating history',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('direct');let s=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]});
  s=await f.client.call('learning.session.change',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:90}});
  await f.client.call('learning.review.submit',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:90,faults:[],gaps:'',reflection:'',practice:false});
  s=await f.client.call('learning.session.get',{deckId:s.deckId,sessionId:s.sessionId});
  s=await f.client.call('learning.session.change',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'next'});assert.equal(s.completed,true);
  const revision=Number(f.ctx.db.prepare('SELECT revision FROM learning_cards WHERE id=?').get(c.cardId)!.revision),targetRevision=Number(f.ctx.db.prepare('SELECT version FROM decks WHERE id=?').get(f.source.ids.mDeck)!.version);
  await f.client.call('card.batch.apply',{deckId:c.deckId,cards:[{cardId:c.cardId,expectedRevision:revision}],action:'move',targetDeckId:f.source.ids.mDeck,expectedTargetRevision:targetRevision});
  const before=inspectDatabaseBaseline(join(f.ctx.dataDir,'ganksoft.sqlite'),f.ctx.dataDir),scan=await scanExternalDatabase(join(f.ctx.dataDir,'ganksoft.sqlite'),f.source.root);
  try{const p=planAppendSelection(scan,[c.deckId]);assert.ok(p.requiredDecks.some(d=>d.sourceDeckId===f.source.ids.mDeck&&d.reasons.some(r=>r.kind==='archived-page-card'&&r.sourceId===c.cardId)));assert.equal(planAppendSelection(scan,[c.deckId,f.source.ids.mDeck]).closed,true);assert.deepEqual(scan.verify(),before);assert.deepEqual(inspectDatabaseBaseline(join(f.ctx.dataDir,'ganksoft.sqlite'),f.ctx.dataDir),before);}finally{scan.close();}
 }finally{f.close();}
});
