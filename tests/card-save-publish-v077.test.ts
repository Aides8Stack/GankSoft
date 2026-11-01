import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {prepareAndActivateUnified,openUnifiedOwner} from '../electron/infrastructure/migrations/coordinator.ts';
import {Application} from '../electron/application.ts';
import {createApplicationProtocol} from '../electron/protocol/gateway.ts';
import {createClient} from '../shared/protocol/client.ts';
import {blankCardFields,newCardSession} from '../shared/cards/mapping.ts';
import {publicationIssues} from '../shared/protocol/card-draft.ts';

async function fixture(){
 const source=schema604Fixture();source.db.exec("UPDATE platform_operations SET state='completed'");
 const control=join(source.root,'control');
 await prepareAndActivateUnified({db:source.db,dataDir:source.dataDir,now:()=>new Date(source.at)},control);
 let owner=openUnifiedOwner(control),ctx={db:owner.db,dataDir:owner.dataDir,now:()=>new Date(source.at)};
 let protocol=createApplicationProtocol(new Application(ctx));let drop=false;
 const api=createClient(async r=>{const result=await protocol.execute(r);if(drop&&(r as {method:string}).method==='card.publish'&&result.ok){drop=false;throw Error('injected lost reply');}return result;});
 await api.call('app.capabilities',{});
 return {source,api,get ctx(){return ctx;},get protocol(){return protocol;},loseReply(){drop=true;},
 reopen(){owner.close();owner=openUnifiedOwner(control);ctx={...ctx,db:owner.db};protocol=createApplicationProtocol(new Application(ctx));},
 close(){owner.close();source.close();}};
}
const code=(expected:string)=>(e:unknown)=>(e as {code:string}).code===expected;
function complete(mode:'question'|'qa'|'direct'){
 const f=blankCardFields(mode);f.title='中文完整标题';
 if(f.payload.encoding==='question-v1'){f.payload.fields.stem='题干';f.payload.fields.options=[{optionId:'a',position:0,markdown:'甲'},{optionId:'b',position:1,markdown:'乙'}];f.payload.fields.correctOptionId='a';}
 else if(f.payload.encoding==='qa-v1'){f.payload.fields.front='正面';f.payload.fields.back='背面';}
 else if(f.payload.encoding==='direct-v1')f.payload.fields.body='记忆正文';
 return f;
}
function snapshot(f:Awaited<ReturnType<typeof fixture>>){
 return Object.fromEntries(['learning_cards','learning_content_versions','learning_study_cycles','learning_review_events','learning_card_drafts','question_knowledge','memory_knowledge','scheduling','settings'].map(t=>[t,f.ctx.db.prepare('SELECT * FROM '+t+' ORDER BY 1').all()]));
}
test('B1 A: all three sessions are memory-only; blank/partial/manual updates persist one draft and reopen exactly',async()=>{
 const f=await fixture();try{
 for(const mode of ['question','qa','direct'] as const){
  const scope={deckId:f.source.ids.qDeck,cardId:randomUUID()},before=snapshot(f),session=newCardSession(scope,mode);
  assert.deepEqual(snapshot(f),before);assert.equal(await f.api.call('draft.get',scope),null);
  const blank=await f.api.call('draft.save',{...scope,expectedPublishedRevision:0,expectedDraftRevision:null,fields:session.fields});
  assert.equal(blank.revision,1);assert.equal(f.ctx.db.prepare('SELECT 1 FROM learning_cards WHERE id=?').get(scope.cardId),undefined);
  const partial={...session.fields,title:'部分内容'};
  const saved=await f.api.call('draft.save',{...scope,expectedPublishedRevision:0,expectedDraftRevision:1,fields:partial});
  assert.equal(saved.revision,2);assert.equal(f.ctx.db.prepare('SELECT COUNT(*) n FROM settings WHERE key=?').get('new-card-draft:'+scope.cardId)!.n,1);
  f.reopen();assert.deepEqual(await f.api.call('draft.get',scope),saved);
 }
 }finally{f.close();}
});
test('B1 B: no-draft direct publication for every mode; duplicate request and distinct stale request never duplicate versions',async()=>{
 const f=await fixture();try{for(const mode of ['question','qa','direct'] as const){
 const scope={deckId:f.source.ids.qDeck,cardId:randomUUID()},fields=complete(mode);
 const req=f.api.prepare('card.publish',{...scope,expectedPublishedRevision:0,expectedDraftRevision:null,fields,resetStudyCycle:false});
 const result=await f.api.send(req);assert.deepEqual(await f.api.send(req),result);
 assert.equal(await f.api.call('draft.get',scope),null);
 assert.equal(f.ctx.db.prepare('SELECT COUNT(*) n FROM learning_content_versions WHERE card_id=?').get(scope.cardId)!.n,1);
 assert.equal(f.ctx.db.prepare('SELECT 1 FROM settings WHERE key=?').get('new-card-draft:'+scope.cardId),undefined);
 await assert.rejects(()=>f.api.call('card.publish',req.payload),code('CONTENT_VERSION_CONFLICT'));
 f.reopen();assert.deepEqual((await f.api.call('card.getPublishedContent',scope)).payload,fields.payload);
 }}finally{f.close();}
});
test('B1 B: repeated incomplete publishes write nothing, including protocol receipts',async()=>{
 const f=await fixture();try{for(const mode of ['question','qa','direct'] as const){
 const scope={deckId:f.source.ids.qDeck,cardId:randomUUID()},fields=blankCardFields(mode),before=snapshot(f);
 assert.ok(publicationIssues(fields.payload).length);
 const receipts=f.ctx.db.prepare('SELECT COUNT(*) n FROM protocol_receipts').get()!.n;
 for(let i=0;i<3;i++)await assert.rejects(()=>f.api.call('card.publish',{...scope,expectedPublishedRevision:0,expectedDraftRevision:null,fields,resetStudyCycle:false}),code('PUBLISH_INCOMPLETE'));
 assert.deepEqual(snapshot(f),before);assert.equal(f.ctx.db.prepare('SELECT COUNT(*) n FROM protocol_receipts').get()!.n,receipts);
 }}finally{f.close();}
});
test('B1 B/C: existing draft failure rolls back version and deletion; inline content wins, atomic clear succeeds',async()=>{
 const f=await fixture();try{
 const scope={deckId:f.source.ids.qDeck,cardId:randomUUID()},fields=complete('qa');
 const draft=await f.api.call('draft.save',{...scope,expectedPublishedRevision:0,expectedDraftRevision:null,fields:{...fields,title:'旧草稿'}});
 const req=f.api.prepare('card.publish',{...scope,expectedPublishedRevision:0,expectedDraftRevision:draft.revision,fields,resetStudyCycle:false});
 f.ctx.db.exec("CREATE TEMP TRIGGER fail_publish_receipt BEFORE INSERT ON protocol_receipts WHEN NEW.method='card.publish' BEGIN SELECT RAISE(ABORT,'B1 injected receipt failure'); END");
 const before=snapshot(f);await assert.rejects(()=>f.api.send(req));assert.deepEqual(snapshot(f),before);
 f.ctx.db.exec('DROP TRIGGER fail_publish_receipt');const result=await f.api.send(req);
 assert.equal(result.revision,1);assert.equal(await f.api.call('draft.get',scope),null);assert.equal((await f.api.call('card.getPublishedContent',scope)).title,fields.title);
 }finally{f.close();}
});
test('B1 B: unknown committed publication is reconciled by exact request across reopen',async()=>{
 const f=await fixture();try{
 const scope={deckId:f.source.ids.qDeck,cardId:randomUUID()};
 const req=f.api.prepare('card.publish',{...scope,expectedPublishedRevision:0,expectedDraftRevision:null,fields:complete('direct'),resetStudyCycle:false});
 f.loseReply();await assert.rejects(()=>f.api.send(req),code('TRANSPORT_UNKNOWN'));f.reopen();
 const result=await f.api.send(req);assert.equal(result.revision,1);assert.equal(f.ctx.db.prepare('SELECT COUNT(*) n FROM learning_content_versions WHERE card_id=?').get(scope.cardId)!.n,1);
 }finally{f.close();}
});
test('B1 C: published edits and manual drafts preserve frozen content/history/FSRS/links; new publication retains cycle',async()=>{
 const f=await fixture();try{
 const scope={deckId:f.source.ids.qDeck,cardId:f.source.ids.question},original=await f.api.call('card.getPublishedContent',scope),before=snapshot(f);
 const fields=complete('question');fields.title='修改稿';assert.deepEqual(snapshot(f),before);
 const old=await f.api.call('draft.get',scope);
 const draft=await f.api.call('draft.save',{...scope,expectedPublishedRevision:1,expectedDraftRevision:old?.revision??null,fields});
 const after=snapshot(f);for(const key of Object.keys(before).filter(k=>k!=='learning_card_drafts'))assert.deepEqual(after[key],before[key],key);
 assert.deepEqual(await f.api.call('card.getPublishedContent',scope),original);
 await assert.rejects(()=>f.api.call('card.publish',{...scope,expectedPublishedRevision:1,expectedDraftRevision:null,fields,resetStudyCycle:false}),code('DRAFT_REVISION_CONFLICT'));
 const result=await f.api.call('card.publish',{...scope,expectedPublishedRevision:1,expectedDraftRevision:draft.revision,fields,resetStudyCycle:false});
 assert.equal(result.revision,2);assert.equal(result.cycleId,(before.learning_cards as any[]).find(c=>c.id===scope.cardId).current_cycle_id);
 const final=snapshot(f);for(const key of ['learning_review_events','scheduling','question_knowledge','memory_knowledge'])assert.deepEqual(final[key],before[key]);
 assert.equal(await f.api.call('draft.get',scope),null);f.reopen();assert.equal((await f.api.call('card.getPublishedContent',scope)).title,'修改稿');
 }finally{f.close();}
});
test('B1 A: committed save with lost response reopens safely; same request returns one old draft',async()=>{
 const f=await fixture();try{
 const scope={deckId:f.source.ids.qDeck,cardId:randomUUID()},fields=blankCardFields('direct');
 const request=f.api.prepare('draft.save',{...scope,expectedPublishedRevision:0,expectedDraftRevision:null,fields});
 const receipt=await f.protocol.execute(request);assert.equal(receipt.ok,true); // simulated dropped response: caller receives nothing
 f.reopen();const saved=await f.api.send(request);assert.equal(saved.revision,1);assert.deepEqual(await f.api.call('draft.get',scope),saved);
 assert.equal(f.ctx.db.prepare('SELECT COUNT(*) n FROM settings WHERE key=?').get('new-card-draft:'+scope.cardId)!.n,1);
 }finally{f.close();}
});
