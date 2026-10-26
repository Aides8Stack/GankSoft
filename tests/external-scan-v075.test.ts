import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {scanExternalDatabase} from '../electron/modules/storage-unified/external-scan.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
import {transaction} from '../electron/infrastructure/database.ts';

test('T39 readonly606 external scan captures committed WAL/all table-media fingerprints, counts actual modes/drafts/history and pages stable deck identities',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  for(const mode of ['question','qa','direct'] as const)await f.card(mode);await f.client.call('draft.create',{deckId:f.source.ids.qDeck,initialType:'qa'});
  transaction(f.ctx.db,()=>f.ctx.db.prepare("UPDATE decks SET name='同名合成集' WHERE id IN (?,?)").run(f.source.ids.qDeck,f.source.ids.mDeck));
  const file=join(f.ctx.dataDir,'ganksoft.sqlite'),before=inspectDatabaseBaseline(file,f.ctx.dataDir),bytes=readFileSync(file),wal=readFileSync(file+'-wal');
  const scan=await scanExternalDatabase(file,f.source.root);try{
   assert.deepEqual(scan.verify(),before);assert.deepEqual(inspectDatabaseBaseline(file,f.ctx.dataDir),before);assert.deepEqual(readFileSync(file),bytes);assert.deepEqual(readFileSync(file+'-wal'),wal);
   assert.equal(scan.summary.schemaVersion,606);assert.equal(scan.summary.media.files,before.media.length);assert.equal(scan.summary.snapshotDigest,before.digest);
   const decks=[];let cursor:string|null=null;do{const page=scan.listDecks(1,cursor);assert.ok(page.items.length<=1);decks.push(...page.items);cursor=page.nextCursor;}while(cursor);
   assert.equal(decks.length,scan.summary.deckCount);assert.equal(new Set(decks.map(d=>d.sourceDeckId)).size,decks.length);assert.equal(decks.filter(d=>d.name==='同名合成集').length,2);
   const q=decks.find(d=>d.sourceDeckId===f.source.ids.qDeck)!;assert.ok(q.cards.question!>=1&&q.cards.qa!>=1&&q.cards.direct!>=1);assert.equal(q.unpublishedDrafts,1);assert.ok(q.reviewEvents>0&&q.versions>0);assert.ok(decks.some(d=>d.recycled));
   assert.doesNotMatch(JSON.stringify({summary:scan.summary,decks}),/rawJson|candidateDirectory|question_snapshot|dataDir|\/tmp\//);
  }finally{scan.close();scan.close();}assert.equal(existsSync(scan.candidateDirectory),false);assert.throws(()=>scan.listDecks(),/EXTERNAL_SCAN_CLOSED/);assert.throws(()=>scan.verify(),/EXTERNAL_SCAN_CLOSED/);
 }finally{f.close();}
});

test('T39 readonly604 scan preserves legacy facts/pending operations and does not fabricate606 mode mappings or upgrade the source',async()=>{
 const f=schema604Fixture();try{
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),scan=await scanExternalDatabase(f.databasePath,f.root);
  try{assert.equal(scan.summary.schemaVersion,604);assert.ok(scan.summary.pendingOperations>0);assert.deepEqual(scan.verify(),before);
   for(const d of scan.listDecks().items){assert.equal(d.cards.question,null);assert.equal(d.cards.qa,null);assert.equal(d.cards.direct,null);assert.equal(d.cards.active+d.cards.recycled,d.legacy.questions+d.legacy.memories);}
   assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);assert.equal(Number(f.db.prepare('PRAGMA user_version').get()!.user_version),604);
  }finally{scan.close();}
 }finally{f.close();}
});

test('T39 source mutation during capture rejects mixed evidence, removes only owned snapshot and never rolls back the external writer',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  writeFileSync(join(f.source.root,'keep.txt'),'synthetic keep');const oldFiles=readdirSync(f.source.root).sort();
  await assert.rejects(()=>scanExternalDatabase(join(f.ctx.dataDir,'ganksoft.sqlite'),f.source.root,{checkpoint:phase=>{
   if(phase==='sqlite-captured')transaction(f.ctx.db,()=>f.ctx.db.prepare("INSERT INTO settings VALUES('external-writer','preserve')").run());
  }}),/EXTERNAL_SOURCE_CHANGED/);
  assert.deepEqual(readdirSync(f.source.root).sort(),oldFiles);assert.equal(readFileSync(join(f.source.root,'keep.txt'),'utf8'),'synthetic keep');assert.equal(f.ctx.db.prepare("SELECT value FROM settings WHERE key='external-writer'").get()!.value,'preserve');
 }finally{f.close();}
});

test('T39 completed scan remains bound to its private snapshot after source edits; snapshot media tampering fails final verification',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const scan=await scanExternalDatabase(join(f.ctx.dataDir,'ganksoft.sqlite'),f.source.root);try{
   const old=scan.listDecks();transaction(f.ctx.db,()=>f.ctx.db.prepare("UPDATE decks SET name='后来改名' WHERE id=?").run(f.source.ids.qDeck));
   assert.deepEqual(scan.listDecks(),old);assert.equal(scan.verify().digest,scan.summary.snapshotDigest);
   const m=scan.baseline.media[0];writeFileSync(join(scan.candidateDirectory,'attachments',m.name),'corrupt synthetic image');assert.throws(()=>scan.verify());
   assert.ok(readFileSync(join(f.ctx.dataDir,'attachments',m.name)).length>10);
  }finally{scan.close();}
 }finally{f.close();}
});

test('T39 invalid database and staging-inside-source are rejected without creating or replacing caller data',async()=>{
 const f=schema604Fixture();try{
  const paths=readdirSync(f.dataDir).sort();await assert.rejects(()=>scanExternalDatabase(f.databasePath,f.dataDir),/EXTERNAL_SOURCE_INVALID/);assert.deepEqual(readdirSync(f.dataDir).sort(),paths);
  const invalid=join(f.dataDir,'invalid.sqlite');writeFileSync(invalid,'not a database');await assert.rejects(()=>scanExternalDatabase(invalid,f.root));assert.equal(readFileSync(invalid,'utf8'),'not a database');
  const scan=await scanExternalDatabase(f.databasePath,f.root);try{assert.throws(()=>scan.listDecks(0),/EXTERNAL_PAGE_INVALID/);assert.throws(()=>scan.listDecks(101),/EXTERNAL_PAGE_INVALID/);}finally{scan.close();}
 }finally{f.close();}
});
