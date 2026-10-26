import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {openUnifiedOwner,recoverUnifiedMigration,readRestoreStatus} from '../electron/infrastructure/migrations/coordinator.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
import {scanExternalDatabase} from '../electron/modules/storage-unified/external-scan.ts';
import {prepareIndependentAppend,readIndependentAppendResult} from '../electron/modules/storage-unified/append-service.ts';
import {transaction} from '../electron/infrastructure/database.ts';

const baseline=(o:ReturnType<typeof openUnifiedOwner>)=>inspectDatabaseBaseline(join(o.dataDir,'ganksoft.sqlite'),o.dataDir);
function facts(db:DatabaseSync){return new Map(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().filter(r=>!['protocol_meta','learning_owner'].includes(String(r.name))).map(r=>[String(r.name),db.prepare(`SELECT * FROM "${r.name}"`).all().map(v=>JSON.stringify(v))]));}
function assertPreserved(old:ReturnType<typeof facts>,db:DatabaseSync){for(const [table,rows]of old){const actual=db.prepare(`SELECT * FROM "${table}"`).all().map(v=>JSON.stringify(v));for(const v of new Set(rows))assert.equal(actual.filter(r=>r===v).length,rows.filter(r=>r===v).length,table+' original row multiplicity');}}

test('T39 real owner append preserves every original row/media, maps colliding source IDs independently, records provenance, skips repeat and supports explicit fresh copies',async()=>{
 const target=await unifiedWorkspaceFixture(),source=schema604Fixture();let owner:ReturnType<typeof openUnifiedOwner>|undefined;try{
  await target.card('direct');target.release();owner=openUnifiedOwner(target.control);const old=facts(owner.db),before=baseline(owner),sourceBefore=inspectDatabaseBaseline(source.databasePath,source.dataDir),scan=await scanExternalDatabase(source.databasePath,target.source.root);
  try{
   const p=await prepareIndependentAppend(owner,scan,[source.ids.qDeck,source.ids.mDeck],target.source.root);assert.ok(p.confirmation);assert.equal(baseline(owner).digest,before.digest,'preview cannot change the active owner');
   const pending=p.confirm(owner,target.control,p.confirmation);assert.throws(()=>p.close(),/追加提交进行中/);const [result,replayed]=await Promise.all([pending,p.confirm(owner,target.control,p.confirmation)]);assert.deepEqual(replayed,result);assert.equal(result.state,'committed');assert.equal(result.imported.length,2);assert.notEqual(result.epoch,owner.epoch);assert.equal(result.recoveryPointAvailable,true);assert.throws(()=>transaction(owner!.db,()=>{}),/恢复中|退役/);
   owner.close();owner=openUnifiedOwner(target.control);assertPreserved(old,owner.db);for(const m of before.media)assert.ok(baseline(owner).media.some(n=>n.name===m.name&&n.sha256===m.sha256));
   assert.equal(owner.db.prepare('SELECT count(*) AS n FROM decks').get()!.n,5);assert.equal(owner.db.prepare('SELECT count(*) AS n FROM attempts').get()!.n,4);assert.equal(owner.db.prepare('SELECT count(*) AS n FROM memory_reviews').get()!.n,4);
   for(const d of result.imported){assert.notEqual(d.sourceDeckId,d.destinationDeckId);assert.ok(owner.db.prepare('SELECT 1 FROM decks WHERE id=?').get(d.destinationDeckId));}
   p.close();assert.deepEqual(await p.confirm(owner,target.control,p.confirmation),result,'exact retry survives source preview disposal and owner reopen');
   const duplicate=await prepareIndependentAppend(owner,scan,[source.ids.qDeck,source.ids.mDeck],target.source.root);assert.equal(duplicate.confirmation,null);assert.deepEqual(new Set(duplicate.plan.skippedDeckIds),new Set([source.ids.qDeck,source.ids.mDeck]));duplicate.close();
   const originalAfterFirst=facts(owner.db),forced=await prepareIndependentAppend(owner,scan,[source.ids.qDeck,source.ids.mDeck],target.source.root,{forceIndependent:true});assert.ok(forced.confirmation);const copied=await forced.confirm(owner,target.control,forced.confirmation);forced.close();assert.ok(copied.imported.every(d=>!result.imported.some(old=>old.destinationDeckId===d.destinationDeckId)));
   owner.close();owner=openUnifiedOwner(target.control);assertPreserved(originalAfterFirst,owner.db);assert.equal(owner.db.prepare('SELECT count(*) AS n FROM decks').get()!.n,7);assert.deepEqual(inspectDatabaseBaseline(source.databasePath,source.dataDir),sourceBefore);
  }finally{scan.close();}
 }finally{owner?.close();source.close();target.close();}
});

test('T39 pointer-time lost response remains committed; receipt can be read after reopen and exact confirmation never appends twice',async()=>{
 const target=await unifiedWorkspaceFixture(),source=schema604Fixture();target.release();let owner=openUnifiedOwner(target.control);const scan=await scanExternalDatabase(source.databasePath,target.source.root);try{
  const p=await prepareIndependentAppend(owner,scan,[source.ids.qDeck],target.source.root);assert.ok(p.confirmation);const result=await p.confirm(owner,target.control,p.confirmation,{checkpoint:phase=>{if(phase==='restore:pointer')throw Error('synthetic response lost after pointer');}});
  owner.close();await recoverUnifiedMigration(target.control);owner=openUnifiedOwner(target.control);p.close();scan.close();assert.deepEqual(readIndependentAppendResult(target.control,result.operationId),result);assert.deepEqual(await p.confirm(owner,target.control,p.confirmation),result);assert.equal(owner.db.prepare('SELECT count(*) AS n FROM decks').get()!.n,4);
 }finally{scan.close();owner.close();source.close();target.close();}
});

test('T39 actual606 source native history, draft origin and FSRS state survive a controlled append without replay or recalculation',async()=>{
 const target=await unifiedWorkspaceFixture(),source=await unifiedWorkspaceFixture();let owner:ReturnType<typeof openUnifiedOwner>|undefined;try{
  const card=await source.card('direct'),draft=await source.card('qa');await source.client.call('draft.save',{deckId:draft.deckId,cardId:draft.cardId,expectedPublishedRevision:1,expectedDraftRevision:null,fields:{title:'来源未发布改动',payload:draft.payload,mediaRefs:[]}});
  let page=await source.client.call('learning.session.open',{deckId:card.deckId,cardIds:[card.cardId]});page=await source.client.call('learning.session.change',{deckId:page.deckId,sessionId:page.sessionId,expectedRevision:page.revision,action:'save',draft:{...page.draft,scoreTenths:90}});const event=await source.client.call('learning.review.submit',{deckId:page.deckId,sessionId:page.sessionId,expectedRevision:page.revision,eventId:page.entry.eventId,scoreTenths:90,faults:[],gaps:'',reflection:'',practice:false});
  const originalState=JSON.parse(String(source.ctx.db.prepare('SELECT data FROM scheduling WHERE card_id=?').get(card.cardId)!.data)),sourceBefore=inspectDatabaseBaseline(join(source.ctx.dataDir,'ganksoft.sqlite'),source.ctx.dataDir);
  target.release();owner=openUnifiedOwner(target.control);const before=facts(owner.db),scan=await scanExternalDatabase(join(source.ctx.dataDir,'ganksoft.sqlite'),target.source.root);try{
   const p=await prepareIndependentAppend(owner,scan,[source.source.ids.qDeck],target.source.root);assert.ok(p.confirmation);const result=await p.confirm(owner,target.control,p.confirmation);p.close();owner.close();owner=openUnifiedOwner(target.control);assertPreserved(before,owner.db);
   const deck=result.imported[0]!.destinationDeckId,stored=owner.db.prepare("SELECT e.document FROM learning_review_events e JOIN learning_cards c ON c.id=e.card_id WHERE c.deck_id=? AND json_extract(e.document,'$.native') IS NOT NULL").get(deck)!,imported=JSON.parse(String(stored.document));assert.notEqual(imported.eventId,event.eventId);assert.equal(imported.native.submissionHash,event.native!.submissionHash);assert.deepEqual(imported.native.schedule,event.native!.schedule);assert.equal(imported.scoreTenths,90);
   const state=JSON.parse(String(owner.db.prepare('SELECT data FROM scheduling WHERE card_id=?').get(imported.cardId)!.data));assert.notEqual(state._gank.cycleId,originalState._gank.cycleId);delete state._gank;delete originalState._gank;assert.deepEqual(state,originalState);assert.equal(owner.db.prepare('SELECT count(*) AS n FROM learning_card_drafts d JOIN learning_cards c ON c.id=d.card_id WHERE c.deck_id=?').get(deck)!.n,1);baseline(owner);assert.deepEqual(inspectDatabaseBaseline(join(source.ctx.dataDir,'ganksoft.sqlite'),source.ctx.dataDir),sourceBefore);
  }finally{scan.close();}
 }finally{owner?.close();source.close();target.close();}
});

test('T39 candidate SQL failure, media corruption, cancellation, altered confirmation and a stale target leave the active library untouched',async()=>{
 const target=await unifiedWorkspaceFixture(),source=schema604Fixture();target.release();let owner=openUnifiedOwner(target.control);let scan=await scanExternalDatabase(source.databasePath,target.source.root);try{
  const before=baseline(owner),pointer=readFileSync(join(target.control,'active.json'),'utf8');
  await assert.rejects(()=>prepareIndependentAppend(owner,scan,[source.ids.qDeck],target.source.root,{}, {checkpoint:phase=>{if(phase==='append:rows')throw Error('synthetic SQL append fault');}}),/synthetic SQL append fault/);assert.equal(baseline(owner).digest,before.digest);
  await assert.rejects(()=>prepareIndependentAppend(owner,scan,[source.ids.qDeck],target.source.root,{}, {checkpoint:phase=>{if(phase==='append:copied')writeFileSync(join(scan.candidateDirectory,'attachments',source.ids.currentImage+'.png'),'synthetic corrupt bytes');}}));assert.equal(baseline(owner).digest,before.digest);scan.close();scan=await scanExternalDatabase(source.databasePath,target.source.root);
  const cancel=await prepareIndependentAppend(owner,scan,[source.ids.qDeck],target.source.root);assert.ok(cancel.confirmation);cancel.close();await assert.rejects(()=>cancel.confirm(owner,target.control,cancel.confirmation!),/预览已关闭/);
  const p=await prepareIndependentAppend(owner,scan,[source.ids.qDeck],target.source.root);assert.ok(p.confirmation);await assert.rejects(()=>p.confirm(owner,target.control,{...p.confirmation!,forceIndependent:true}),/确认与预览不一致/);
  transaction(owner.db,()=>{owner.db.prepare('UPDATE questions SET stem=stem||? WHERE id=?').run('合法目标变更',source.ids.question);owner.db.prepare('UPDATE protocol_meta SET revision=revision+1').run();});const changed=baseline(owner);
  await assert.rejects(()=>p.confirm(owner,target.control,p.confirmation!),/目标事实或媒体已变化/);p.close();assert.equal(baseline(owner).digest,changed.digest);assert.equal(readFileSync(join(target.control,'active.json'),'utf8'),pointer);assert.equal(owner.db.prepare('SELECT count(*) AS n FROM decks').get()!.n,3);
 }finally{scan.close();owner.close();source.close();target.close();}
});

for(const phase of ['append:rows','restore:frozen','restore:prepared','restore:pointer'])test('T39 real append process interruption at '+phase+' recovers exactly the pointer-selected original or appended facts',async()=>{
 const target=await unifiedWorkspaceFixture(),source=schema604Fixture();target.release();let owner:ReturnType<typeof openUnifiedOwner>|undefined;try{
  owner=openUnifiedOwner(target.control);const before=baseline(owner);owner.close();owner=undefined;
  const module=(path:string)=>JSON.stringify(new URL(path,import.meta.url).href);
  const code=`import{writeFileSync}from'node:fs';import{join}from'node:path';import{openUnifiedOwner}from${module('../electron/infrastructure/migrations/coordinator.ts')};import{scanExternalDatabase}from${module('../electron/modules/storage-unified/external-scan.ts')};import{prepareIndependentAppend}from${module('../electron/modules/storage-unified/append-service.ts')};const[control,file,parent,phase,deck]=process.argv.slice(1);const o=openUnifiedOwner(control),s=await scanExternalDatabase(file,parent);const stop=p=>{if(p===phase)process.exit(61)};const p=await prepareIndependentAppend(o,s,[deck],parent,{}, {checkpoint:stop});writeFileSync(join(parent,'append-confirmation.json'),JSON.stringify(p.confirmation));await p.confirm(o,control,p.confirmation,{checkpoint:stop});process.exit(62);`;
  const child=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',code,target.control,source.databasePath,target.source.root,phase,source.ids.qDeck],{encoding:'utf8'});assert.equal(child.status,61,child.stderr);
  await recoverUnifiedMigration(target.control);owner=openUnifiedOwner(target.control);
  if(phase==='restore:pointer'){
   const confirmation=JSON.parse(readFileSync(join(target.source.root,'append-confirmation.json'),'utf8')),result=readIndependentAppendResult(target.control,confirmation.operationId);assert.ok(result);assert.equal(result.imported.length,1);assert.equal(owner.db.prepare('SELECT count(*) AS n FROM decks').get()!.n,4);assert.equal(result.epoch,owner.epoch);
  }else{assert.equal(baseline(owner).digest,before.digest);assert.equal(owner.db.prepare('SELECT count(*) AS n FROM decks').get()!.n,3);if(phase!=='append:rows'){const c=JSON.parse(readFileSync(join(target.source.root,'append-confirmation.json'),'utf8'));assert.equal(readRestoreStatus(target.control,c.operationId)!.state,'aborted');assert.equal(readIndependentAppendResult(target.control,c.operationId),null);}}
 }finally{owner?.close();source.close();target.close();}
});
