import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { z } from 'zod';
import { unifiedWorkspaceFixture } from './fixtures/unified-workspace.ts';
import { CommitReview, ReviewSessionView } from '../shared/protocol/unified-review.ts';
import { validateUnifiedData } from '../electron/infrastructure/migrations/unified-integrity.ts';
import { createBackup, stageBackup } from '../electron/infrastructure/backup.ts';
import { createClient } from '../shared/protocol/client.ts';
import { Application } from '../electron/application.ts';
import { createApplicationProtocol } from '../electron/protocol/gateway.ts';
import { schema604Fixture } from './fixtures/v075-schema604.ts';

const code=(name:string)=>(e:unknown)=>e instanceof Error&&'code' in e&&e.code===name;
type View=z.infer<typeof ReviewSessionView>;
type Fixture=Awaited<ReturnType<typeof unifiedWorkspaceFixture>>;
async function ready(f:Fixture,s:View,scoreTenths=90,selectedOptionId='stable:b') {
  const scope={deckId:s.deckId,sessionId:s.sessionId};
  if(s.stage==='answer') s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'reveal',
    draft:{...s.draft,selectedOptionId:s.content.mode==='question'?selectedOptionId:null,thought:'合成独立思路'}});
  s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths,faults:['合成错因'],gaps:'合成知识漏洞',reflection:'合成反思'}});
  return {session:s,input:{...scope,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths,faults:s.draft.faults,gaps:s.draft.gaps,reflection:s.draft.reflection,practice:false} satisfies z.infer<typeof CommitReview>};
}
test('T16/T17 three modes record original tenths/objective/rating and use one real FSRS state per card',async()=>{
  const f=await unifiedWorkspaceFixture();try {
    for(const mode of ['question','qa','direct'] as const) {
      const card=await f.card(mode),s=await f.client.call('learning.session.open',{deckId:card.deckId,cardIds:[card.cardId]});
      assert.equal(s.stage,mode==='direct'?'reveal':'answer');
      const {input}=await ready(f,s,90,'stable:a');f.advance(2400);
      const e=await f.client.call('learning.review.submit',input);
      assert.equal(e.scoreTenths,90);assert.equal(e.objectiveCorrect,mode==='question'?false:null);assert.equal(e.rating,mode==='question'?'again':'easy');
      assert.equal(e.native!.schedule.outcome,'updated');assert.equal(e.native!.elapsedSeconds,2);
      assert.equal(e.native!.thought,'合成独立思路'.repeat(mode==='direct'?0:1));
      assert.equal(f.ctx.db.prepare('SELECT count(*) n FROM scheduling WHERE card_id=?').get(card.cardId)!.n,1);
      assert.equal(f.ctx.db.prepare('SELECT count(*) n FROM schedule_events WHERE card_id=?').get(card.cardId)!.n,1);
      assert.deepEqual(await f.client.call('learning.review.submit',input),e); // New requestId, same eventId.
      validateUnifiedData(f.ctx.db);
    }
  } finally {f.close();}
});
test('T18 receipt rollback and two clients retry the frozen event exactly once',async()=>{
  const f=await unifiedWorkspaceFixture();try {
    const card=await f.card('qa'),s=await f.client.call('learning.session.open',{deckId:card.deckId,cardIds:[card.cardId]}),{input}=await ready(f,s,59);
    const req=f.client.prepare('learning.review.submit',input);
    f.ctx.db.exec("CREATE TEMP TRIGGER reject_native_review BEFORE INSERT ON protocol_receipts WHEN NEW.method='learning.review.submit' BEGIN SELECT RAISE(ABORT,'synthetic receipt failure'); END");
    await assert.rejects(()=>f.client.send(req));
    assert.equal(f.ctx.db.prepare('SELECT 1 FROM learning_review_events WHERE id=?').get(input.eventId),undefined);
    assert.equal(f.ctx.db.prepare('SELECT 1 FROM scheduling WHERE card_id=?').get(card.cardId),undefined);
    assert.equal((await f.client.call('learning.session.get',{deckId:s.deckId,sessionId:s.sessionId})).stage,'reveal');
    f.ctx.db.exec('DROP TRIGGER reject_native_review');
    const result=await f.client.send(req),second=createClient(r=>f.host.execute(r));await second.call('app.capabilities',{});
    assert.deepEqual(await second.call('learning.review.submit',input),result);
    assert.deepEqual(await f.client.send(req),result);
    await assert.rejects(()=>second.call('learning.review.submit',{...input,scoreTenths:100}),code('ENTRY_CONFLICT'));
    assert.equal(f.ctx.db.prepare('SELECT count(*) n FROM schedule_events WHERE id=?').get(result.eventId)!.n,1);
  } finally {f.close();}
});
test('T19 V1 completion after V2 publication archives V1 and skips changed version/cycle scheduling',async()=>{
  for(const resetStudyCycle of [false,true]) {
    const f=await unifiedWorkspaceFixture();try {
      const card=await f.card('question'),s=await f.client.call('learning.session.open',{deckId:card.deckId,cardIds:[card.cardId]}),{input}=await ready(f,s,100);
      const original=await f.client.call('card.getPublishedContent',{cardId:card.cardId,deckId:card.deckId});
      const d=await f.client.call('draft.previewSwitch',{cardId:card.cardId,deckId:card.deckId,targetType:'question'});
      const changed=structuredClone(d.fields);if(changed.payload.encoding!=='question-v1')throw Error('fixture');changed.payload.fields.correctOptionId='stable:a';
      const saved=await f.client.call('draft.save',{cardId:card.cardId,deckId:card.deckId,expectedPublishedRevision:1,expectedDraftRevision:null,fields:changed});
      const v2=await f.client.call('card.publish',{cardId:card.cardId,deckId:card.deckId,expectedPublishedRevision:1,expectedDraftRevision:saved.revision,resetStudyCycle});
      const e=await f.client.call('learning.review.submit',input);
      assert.equal(e.contentVersionId,original.versionId);assert.equal(e.cycleId,card.publication.cycleId);assert.equal(e.objectiveCorrect,true);
      assert.equal(e.native!.schedule.outcome,resetStudyCycle?'cycle-conflict':'version-conflict');
      assert.equal(f.ctx.db.prepare('SELECT 1 FROM scheduling WHERE card_id=?').get(card.cardId),undefined);
      assert.equal((await f.client.call('card.getPublishedContent',{cardId:card.cardId,deckId:card.deckId})).versionId,v2.versionId);
      validateUnifiedData(f.ctx.db);
    } finally {f.close();}
  }
});
test('T20 disjoint pages, answer freeze, pause/leave/reopen and exact total timing preserve the draft',async()=>{
  const f=await unifiedWorkspaceFixture();try {
    const a=await f.card('question'),b=await f.card('direct');
    let s=await f.client.call('learning.session.open',{deckId:a.deckId,cardIds:[a.cardId,b.cardId]});const scope={deckId:s.deckId,sessionId:s.sessionId};
    await assert.rejects(()=>f.client.call('learning.session.open',{deckId:a.deckId,cardIds:[b.cardId]}),code('DUPLICATE_SESSION'));
    const initial=s;f.advance(8000);
    s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'pause',draft:{...s.draft,selectedOptionId:'stable:b',thought:'退出前原稿'}});
    f.advance(3600000);f.reopen();
    assert.deepEqual(await f.client.call('learning.session.get',scope),s);
    await assert.rejects(()=>f.client.call('learning.session.change',{...scope,expectedRevision:initial.revision,action:'resume'}),code('REVISION_CONFLICT'));
    s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'resume'});f.advance(3000);
    const r=await ready(f,s,60);s=r.session;
    await assert.rejects(()=>f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'save',draft:{...s.draft,thought:'不能改的旧思路'}}),code('ANSWER_FROZEN'));
    const event=await f.client.call('learning.review.submit',r.input);assert.equal(event.native!.elapsedSeconds,11);
    s=await f.client.call('learning.session.get',scope);s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'next'});
    assert.equal(s.entry.cardId,b.cardId);assert.equal(s.stage,'reveal');assert.equal(s.totalSeconds,11);assert.equal(s.elapsedSeconds,0);
    assert.equal(s.content.mode,'direct');assert.ok(!JSON.stringify(s).includes('合成问题'));
    validateUnifiedData(f.ctx.db);
  } finally {f.close();}
});
test('T18 unknown delivery can recover operation status and replay without a second event',async()=>{
  const f=await unifiedWorkspaceFixture();try {
    const c=await f.card('direct'),s=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]}),{input}=await ready(f,s,75);
    let lose=true;const client=createClient(async r=>{const response=await f.host.execute(r);if(lose&&r.method==='learning.review.submit'){lose=false;throw Error('synthetic response loss');}return response;});
    await client.call('app.capabilities',{});const req=client.prepare('learning.review.submit',input);
    await assert.rejects(()=>client.send(req));
    const recovered=await client.send(req);assert.equal(recovered.rating,'good');
    assert.equal(f.ctx.db.prepare('SELECT count(*) n FROM learning_review_events WHERE id=?').get(input.eventId)!.n,1);
    assert.equal(f.ctx.db.prepare('SELECT count(*) n FROM schedule_events WHERE id=?').get(input.eventId)!.n,1);
  } finally {f.close();}
});
test('S4 full backup restores native result sessions and immutable event/schedule detail',async()=>{
  const f=await unifiedWorkspaceFixture();try {
    const c=await f.card('direct'),s=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]}),{input}=await ready(f,s,89);
    const event=await f.client.call('learning.review.submit',input),archive=join(f.source.root,'native-review-backup.zip'),target=join(f.source.root,'review-restored');
    await createBackup(f.ctx.db,f.ctx.dataDir,archive);await stageBackup(archive,target);
    const db=new DatabaseSync(join(target,'ganksoft.sqlite'));
    try {validateUnifiedData(db);assert.equal(JSON.parse(String(db.prepare('SELECT document FROM learning_review_events WHERE id=?').get(event.eventId)!.document)).scoreTenths,89);}
    finally {db.close();}
    f.reopen();assert.equal((await f.client.call('learning.session.get',{deckId:s.deckId,sessionId:s.sessionId})).result!.eventId,event.eventId);
  } finally {f.close();}
});
test('S4 rejects production604, foreign decks and unissued event identities without writes',async()=>{
  const old=schema604Fixture();try {const client=createClient(r=>createApplicationProtocol(new Application({db:old.db,dataDir:old.dataDir,now:()=>new Date(old.at)})).execute(r));await client.call('app.capabilities',{});
    await assert.rejects(()=>client.call('learning.session.open',{deckId:old.ids.qDeck,cardIds:[old.ids.question]}),code('MIGRATION_NOT_ACTIVATED'));
  } finally {old.close();}
  const f=await unifiedWorkspaceFixture();try {
    const c=await f.card('direct');await assert.rejects(()=>f.client.call('learning.session.open',{deckId:f.source.ids.mDeck,cardIds:[c.cardId]}),code('DECK_CONFLICT'));
    const s=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]}),{input}=await ready(f,s);
    await assert.rejects(()=>f.client.call('learning.review.submit',{...input,eventId:randomUUID()}),code('SESSION_STAGE_CONFLICT'));
    assert.equal(f.ctx.db.prepare("SELECT count(*) n FROM learning_review_events WHERE json_extract(document,'$.native.encoding')='ganksoft.review-event/1'").get()!.n,0);
  } finally {f.close();}
});

async function finish(f:Fixture,card:{cardId:string;deckId:string},score=90) {
  const opened=await f.client.call('learning.session.open',{deckId:card.deckId,cardIds:[card.cardId]}),{input}=await ready(f,opened,score);
  const event=await f.client.call('learning.review.submit',input);
  const current=await f.client.call('learning.session.get',{deckId:opened.deckId,sessionId:opened.sessionId});
  await f.client.call('learning.session.change',{deckId:opened.deckId,sessionId:opened.sessionId,expectedRevision:current.revision,action:'next'});
  return event;
}
async function republish(f:Fixture,card:{cardId:string;deckId:string},resetStudyCycle:boolean) {
  const rev=Number(f.ctx.db.prepare('SELECT revision FROM learning_cards WHERE id=?').get(card.cardId)!.revision);
  const current=await f.client.call('card.getPublishedContent',card);
  const saved=await f.client.call('draft.save',{...card,expectedPublishedRevision:rev,expectedDraftRevision:null,fields:{title:current.title,payload:current.payload!,mediaRefs:current.mediaRefs}});
  return f.client.call('card.publish',{...card,expectedPublishedRevision:rev,expectedDraftRevision:saved.revision,resetStudyCycle});
}
test('T21 reset has pending current mastery and a fresh FSRS cycle while all old history remains paginated',async()=>{
  const f=await unifiedWorkspaceFixture();try {
    const made=await f.card('direct'),card={cardId:made.cardId,deckId:made.deckId};
    const e1=await finish(f,card);assert.notEqual((await f.client.call('learning.mastery.card',card)).status,'pending');
    const v2=await republish(f,card,true),mastery=await f.client.call('learning.mastery.card',card);
    assert.equal(mastery.status,'pending');assert.equal(mastery.historyCount,1);assert.equal(mastery.cycleId,v2.cycleId);
    f.advance(86400000);
    const e2=await finish(f,card,60);
    assert.equal(e2.cycleId,v2.cycleId);assert.equal(e2.native!.schedule.outcome,'updated');
    const log=JSON.parse(String(f.ctx.db.prepare('SELECT before_state FROM schedule_events WHERE id=?').get(e2.eventId)!.before_state));
    assert.equal(log.reps,0);
    const first=await f.client.call('learning.history.list',{...card,limit:1});assert.equal(first.items[0].eventId,e2.eventId);assert.equal('legacyRaw' in first.items[0],false);
    const next=await f.client.call('learning.history.list',{...card,limit:1,after:first.nextCursor});assert.equal(next.items[0].eventId,e1.eventId);
    assert.deepEqual(await f.client.call('learning.history.get',{...card,eventId:e1.eventId}),e1);
    assert.equal(f.ctx.db.prepare('SELECT count(*) n FROM scheduling WHERE card_id=?').get(card.cardId)!.n,1);
  } finally {f.close();}
});
test('T22 global and single-card edits preserve schedules; preview/apply/undo advance only, bind policy and skip overrides/overdue delays',async()=>{
  const f=await unifiedWorkspaceFixture();try {
    const old=await f.card('direct'),own=await f.card('direct');
    await f.client.call('policy.card.set',{kind:'card',cardId:own.cardId,maxIntervalDays:30,expectedRevision:0});
    await finish(f,old);await finish(f,own);f.advance(400*86400000);
    const future=await f.card('direct');await finish(f,future);
    const before=JSON.stringify(f.ctx.db.prepare('SELECT * FROM scheduling ORDER BY kind,card_id').all());
    await f.client.call('policy.deck.set',{deckId:old.deckId,dailyLimit:15,maxIntervalDays:1});
    assert.equal(JSON.stringify(f.ctx.db.prepare('SELECT * FROM scheduling ORDER BY kind,card_id').all()),before);
    const inherited=await f.client.call('policy.card.get',{kind:'card',cardId:future.cardId});assert.equal(inherited.source,'deck_default');assert.equal(inherited.maxIntervalDays,1);
    const ownPolicy=await f.client.call('policy.card.get',{kind:'card',cardId:own.cardId});assert.equal(ownPolicy.maxIntervalDays,30);
    await assert.rejects(()=>f.client.call('policy.card.set',{kind:'card',cardId:own.cardId,maxIntervalDays:2,expectedRevision:0}),code('REVISION_CONFLICT'));
    const stale=await f.client.call('policy.config.preview',{deckId:old.deckId,model:'unified'});
    const config=await f.client.call('policy.config.get',{deckId:old.deckId});await f.client.call('policy.config.save',{deckId:old.deckId,expectedRevision:config.revision,config:{...config.config,desiredRetention:0.9}});
    await assert.rejects(()=>f.client.call('policy.config.applyExisting',{previewToken:stale.previewToken}),code('PREVIEW_STALE'));
    const preview=await f.client.call('policy.config.preview',{deckId:old.deckId,model:'unified'});if(!('encoding' in preview))throw Error('model');
    assert.equal(preview.rows.find(r=>r.cardId===own.cardId)!.reason,'card_override');
    const oldRow=preview.rows.find(r=>r.cardId===old.cardId)!;assert.equal(oldRow.afterDue,oldRow.beforeDue);assert.ok(Date.parse(oldRow.afterDue!)<=f.ctx.now().getTime());
    const futureRow=preview.rows.find(r=>r.cardId===future.cardId)!;assert.equal(futureRow.reason,'advance');assert.ok(Date.parse(futureRow.afterDue!)<=f.ctx.now().getTime()+86400000);
    const reviews=Number(f.ctx.db.prepare('SELECT count(*) n FROM learning_review_events').get()!.n);
    const req=f.client.prepare('policy.config.applyExisting',{previewToken:preview.previewToken}),applied=await f.client.send(req);assert.equal(applied.count,1);assert.deepEqual(await f.client.send(req),applied);
    assert.equal(Number(f.ctx.db.prepare('SELECT count(*) n FROM learning_review_events').get()!.n),reviews);
    assert.equal((await f.client.call('policy.config.undoExisting',{deckId:old.deckId,operationId:applied.operationId})).count,1);
    assert.equal(JSON.parse(String(f.ctx.db.prepare("SELECT data FROM scheduling WHERE kind='card' AND card_id=?").get(future.cardId)!.data)).due,futureRow.beforeDue);
    validateUnifiedData(f.ctx.db);
  } finally {f.close();}
});
test('T27 current links union each card once; frozen name/path snapshots survive rename, unlink and cycle reset',async()=>{
  const f=await unifiedWorkspaceFixture();try {
    const template=await f.card('question'),card={cardId:f.source.ids.question,deckId:f.source.ids.qDeck};
    const rev=Number(f.ctx.db.prepare('SELECT revision FROM learning_cards WHERE id=?').get(card.cardId)!.revision);
    const saved=await f.client.call('draft.save',{...card,expectedPublishedRevision:rev,expectedDraftRevision:null,fields:{title:'合成旧题正式整理',payload:template.payload,mediaRefs:[]}});
    await f.client.call('card.publish',{...card,expectedPublishedRevision:rev,expectedDraftRevision:saved.revision,resetStudyCycle:false});
    // Make both existing children descendants of one parent using the real graph API.
    const app=new Application(f.ctx);app.handle('knowledge.save',{id:f.source.ids.child2,module:card.deckId,name:'不同名子节点',parent_id:f.source.ids.root1});
    for(const row of f.ctx.db.prepare('SELECT payload,revision FROM study_sessions WHERE deck_id=?').all(card.deckId)) {
      const existing=JSON.parse(String(row.payload));
      await f.client.call('session.finish',{deckId:card.deckId,sessionId:existing.sessionId,expectedRevision:Number(row.revision)});
    }
    const opened=await f.client.call('learning.session.open',{deckId:card.deckId,cardIds:[card.cardId]}),{input}=await ready(f,opened);
    const frozen=structuredClone(opened.entry.knowledge);assert.equal(frozen.length,2);
    app.handle('knowledge.save',{id:f.source.ids.child1,module:card.deckId,name:'后来改名',parent_id:f.source.ids.root1});
    const event=await f.client.call('learning.review.submit',input);assert.deepEqual(event.native!.knowledge,frozen);
    let aggregate=await f.client.call('learning.mastery.knowledge',{deckId:card.deckId,nodeId:f.source.ids.root1,scope:'aggregate'});
    assert.deepEqual(aggregate.cardIds,[card.cardId]);assert.equal(aggregate.distinctCards,1);
    const current=await f.client.call('learning.session.get',{deckId:opened.deckId,sessionId:opened.sessionId});await f.client.call('learning.session.change',{deckId:opened.deckId,sessionId:opened.sessionId,expectedRevision:current.revision,action:'next'});
    await republish(f,card,true);aggregate=await f.client.call('learning.mastery.knowledge',{deckId:card.deckId,nodeId:f.source.ids.root1,scope:'aggregate'});assert.equal(aggregate.status,'pending');
    const d=await f.client.call('draft.save',{...card,expectedPublishedRevision:Number(f.ctx.db.prepare('SELECT revision FROM learning_cards WHERE id=?').get(card.cardId)!.revision),expectedDraftRevision:null,fields:{title:'解除现行关联',payload:template.payload,mediaRefs:[]}});
    await f.client.call('card.publish',{...card,expectedPublishedRevision:d.basePublishedRevision,expectedDraftRevision:d.revision,resetStudyCycle:false,knowledgeIds:[]});
    aggregate=await f.client.call('learning.mastery.knowledge',{deckId:card.deckId,nodeId:f.source.ids.root1,scope:'aggregate'});assert.deepEqual(aggregate.cardIds,[]);
    assert.deepEqual((await f.client.call('learning.history.get',{...card,eventId:event.eventId})).native!.knowledge,frozen);
  } finally {f.close();}
});
