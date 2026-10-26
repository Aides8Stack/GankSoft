import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {join} from 'node:path';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {scanExternalDatabase} from '../electron/modules/storage-unified/external-scan.ts';
import {collectAppendGraph} from '../electron/modules/storage-unified/append-graph.ts';
import {appendDeckVersions,appendProvenanceSetting,readAppendProvenance,planAppendDuplicates} from '../electron/modules/storage-unified/append-provenance.ts';

test('T39 each deck source version is stable across selection size, unrelated deck/global changes and source epoch renewal',async()=>{
 const f=schema604Fixture();try{
  const get=async(selected:string[])=>{const scan=await scanExternalDatabase(f.databasePath,f.root);try{return appendDeckVersions(collectAppendGraph(scan,selected));}finally{scan.close();}};
  const all=[f.ids.qDeck,f.ids.mDeck,f.ids.trashDeck],single=(await get([f.ids.qDeck]))[0]!,original=await get(all),q=()=>original.find(v=>v.sourceDeckId===f.ids.qDeck)!;assert.deepEqual(single,q());
  f.insert('settings',{key:'synthetic-unrelated-preference',value:'does not affect learning'});f.db.prepare('UPDATE memory_cards SET content=?').run('仅改变其他卡片集');f.db.prepare('UPDATE protocol_meta SET epoch=?').run(randomUUID());
  const next=await get(all);assert.deepEqual(next.find(v=>v.sourceDeckId===f.ids.qDeck),q());assert.notEqual(next.find(v=>v.sourceDeckId===f.ids.mDeck)!.sourceVersion,original.find(v=>v.sourceDeckId===f.ids.mDeck)!.sourceVersion);
  f.db.prepare('UPDATE questions SET stem=? WHERE id=?').run('来源事实改变',f.ids.question);const changed=(await get([f.ids.qDeck]))[0]!;assert.notEqual(changed.sourceVersion,single.sourceVersion);assert.notEqual(changed.sourceKey,single.sourceKey);
 }finally{f.close();}
});

test('T39 default duplicate skipping blocks dependent fresh decks instead of merging with existing target copies; explicit force imports independent copies',async()=>{
 const f=schema604Fixture();let db:DatabaseSync|undefined;try{
  const scan=await scanExternalDatabase(f.databasePath,f.root);try{
   const graph=collectAppendGraph(scan,[f.ids.qDeck,f.ids.mDeck,f.ids.trashDeck]),versions=appendDeckVersions(graph),v=versions.find(v=>v.sourceDeckId===f.ids.qDeck)!,destination=randomUUID(),path=join(f.root,'synthetic-provenance.sqlite');
   db=new DatabaseSync(path);db.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);CREATE TABLE decks(id TEXT PRIMARY KEY,name TEXT)');db.prepare('INSERT INTO decks VALUES(?,?)').run(destination,'目标中已经编辑过的独立副本');
   const row=appendProvenanceSetting({encoding:'ganksoft.independent-append-provenance/1',operationId:randomUUID(),sourceDeckId:v.sourceDeckId,sourceVersion:v.sourceVersion,sourceKey:v.sourceKey,sourceSchema:604,sourceGeneration:graph.sourceGeneration,sourceSnapshot:graph.snapshotDigest,destinationDeckId:destination,createdAt:f.at});db.prepare('INSERT INTO settings VALUES(?,?)').run(row.key!,row.value!);
   db.close();db=new DatabaseSync(path);assert.equal(readAppendProvenance(db).length,1);
   const planned=planAppendDuplicates(db,versions);assert.deepEqual(planned.skippedDeckIds,[f.ids.qDeck]);assert.deepEqual(planned.blockedDeckIds,[f.ids.mDeck]);assert.deepEqual(planned.importDeckIds,[f.ids.trashDeck]);assert.equal(db.prepare('SELECT count(*) AS n FROM decks').get()!.n,1);
   const force=planAppendDuplicates(db,versions,true);assert.deepEqual(new Set(force.importDeckIds),new Set(graph.selectedDeckIds));assert.deepEqual(force.skippedDeckIds,[]);assert.deepEqual(force.blockedDeckIds,[]);
   db.prepare('DELETE FROM decks WHERE id=?').run(destination);assert.deepEqual(planAppendDuplicates(db,versions).importDeckIds,versions.map(v=>v.sourceDeckId),'historical provenance for a physically removed copy cannot hide available source data');
  }finally{scan.close();}
 }finally{db?.close();f.close();}
});

test('T39 malformed or mismatched provenance rejects rather than silently treating unverified metadata as a duplicate',async()=>{
 const f=schema604Fixture(),db=new DatabaseSync(':memory:');try{
  db.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);CREATE TABLE decks(id TEXT PRIMARY KEY)');
  const scan=await scanExternalDatabase(f.databasePath,f.root);try{
   const graph=collectAppendGraph(scan,[f.ids.qDeck]),v=appendDeckVersions(graph)[0]!,record={encoding:'ganksoft.independent-append-provenance/1' as const,operationId:randomUUID(),sourceDeckId:v.sourceDeckId,sourceVersion:v.sourceVersion,sourceKey:v.sourceKey,sourceSchema:604 as const,sourceGeneration:graph.sourceGeneration,sourceSnapshot:graph.snapshotDigest,destinationDeckId:randomUUID(),createdAt:f.at};
   assert.throws(()=>appendProvenanceSetting({...record,sourceVersion:'f'.repeat(64)}),/APPEND_PROVENANCE_INVALID/);
   const row=appendProvenanceSetting(record);db.prepare('INSERT INTO settings VALUES(?,?)').run(String(row.key)+'-mismatch',row.value!);assert.throws(()=>readAppendProvenance(db),/APPEND_PROVENANCE_INVALID/);assert.throws(()=>planAppendDuplicates(db,[v]),/APPEND_PROVENANCE_INVALID/);
  }finally{scan.close();}
 }finally{db.close();f.close();}
});

test('T39 native review and draft facts belong to their own deck version; owner revision changes cannot invalidate an unrelated deck version',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const versions=async()=>{const scan=await scanExternalDatabase(join(f.ctx.dataDir,'ganksoft.sqlite'),f.source.root);try{return appendDeckVersions(collectAppendGraph(scan,[f.source.ids.qDeck,f.source.ids.mDeck,f.source.ids.trashDeck]));}finally{scan.close();}};
  const before=await versions(),card=await f.card('direct');let page=await f.client.call('learning.session.open',{deckId:card.deckId,cardIds:[card.cardId]});page=await f.client.call('learning.session.change',{deckId:page.deckId,sessionId:page.sessionId,expectedRevision:page.revision,action:'save',draft:{...page.draft,scoreTenths:90}});await f.client.call('learning.review.submit',{deckId:page.deckId,sessionId:page.sessionId,expectedRevision:page.revision,eventId:page.entry.eventId,scoreTenths:90,faults:[],gaps:'',reflection:'',practice:false});await f.client.call('draft.create',{deckId:card.deckId,initialType:'qa'});
  const after=await versions();assert.equal(after.length,3);assert.equal(new Set(after.map(v=>v.sourceKey)).size,3);assert.notEqual(after.find(v=>v.sourceDeckId===card.deckId)!.sourceVersion,before.find(v=>v.sourceDeckId===card.deckId)!.sourceVersion);assert.deepEqual(after.find(v=>v.sourceDeckId===f.source.ids.mDeck),before.find(v=>v.sourceDeckId===f.source.ids.mDeck));
 }finally{f.close();}
});
