import test from 'node:test';
import assert from 'node:assert/strict';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';

test('W7.1-01 practice saves immediately without any SQLite scheduling change',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('direct'),before=f.ctx.db.prepare('SELECT * FROM scheduling ORDER BY kind,card_id').all();
  let s=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]});
  s=await f.client.call('learning.session.change',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:90}});
  const e=await f.client.call('learning.review.submit',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:90,faults:[],gaps:'',reflection:'',practice:false});
  assert.equal(e.native!.practice,true);assert.ok(f.ctx.db.prepare('SELECT 1 FROM learning_review_events WHERE id=?').get(e.eventId));
  assert.deepEqual(f.ctx.db.prepare('SELECT * FROM scheduling ORDER BY kind,card_id').all(),before);
 }finally{f.close();}
});
test('W7.1-06/07 same card is allowed in independent unfinished practice queues',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('direct');
  const a=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]});
  const b=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]});
  assert.notEqual(a.sessionId,b.sessionId);
  const q=await f.client.call('learning.queue.preview',{deckId:c.deckId,selectedIds:[c.cardId]});
  assert.equal(q.due[0].cardId,c.cardId);assert.equal(q.excluded.session_reserved,undefined);
 }finally{f.close();}
});

type F=Awaited<ReturnType<typeof unifiedWorkspaceFixture>>;
import type {z} from 'zod';
import type {DraftFields} from '../shared/protocol/card-draft.ts';
import {ReviewSessionView} from '../shared/protocol/unified-review.ts';
import {OpenReviewSession} from '../shared/protocol/unified-review.ts';
import {copyFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {Worker} from 'node:worker_threads';
import {createHash,randomUUID} from 'node:crypto';
import {placementUrl} from '../shared/editor/document.ts';
import {validateUnifiedData} from '../electron/infrastructure/migrations/unified-integrity.ts';
type View=z.infer<typeof ReviewSessionView>;
const scope=(s:View)=>({deckId:s.deckId,sessionId:s.sessionId});
async function ready(f:F,s:View,scoreTenths=90){
 if(s.stage==='answer')s=await f.client.call('learning.session.change',{...scope(s),expectedRevision:s.revision,action:'reveal',draft:{...s.draft,selectedOptionId:s.content.mode==='question'?'stable:b':null,thought:'frozen thought'}});
 f.advance(2100);
 s=await f.client.call('learning.session.change',{...scope(s),expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths,faults:['gap'],gaps:'gap',reflection:'reflection'}});
 return {s,input:{...scope(s),expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths,faults:s.draft.faults,gaps:s.draft.gaps,reflection:s.draft.reflection,practice:false}};
}
async function submit(f:F,s:View,score=90){const r=await ready(f,s,score);const event=await f.client.call('learning.review.submit',r.input);return {event,s:await f.client.call('learning.session.get',scope(s)),input:r.input};}
const facts=(f:F,id:string)=>({schedule:f.ctx.db.prepare('SELECT * FROM scheduling WHERE card_id=? ORDER BY kind').all(id),
 events:f.ctx.db.prepare('SELECT * FROM schedule_events WHERE card_id=? ORDER BY id').all(id),
 cycle:f.ctx.db.prepare('SELECT current_cycle_id FROM learning_cards WHERE id=?').get(id),
 cycles:f.ctx.db.prepare('SELECT * FROM learning_study_cycles WHERE card_id=? ORDER BY id').all(id),
 plans:f.ctx.db.prepare('SELECT * FROM plans WHERE question_id=?').all(id),
 overrides:f.ctx.db.prepare("SELECT * FROM settings WHERE key=?").all('unified-ai-due:'+id)});
async function formal(f:F,deckId:string){return f.client.call('learning.session.open',{deckId,mode:'scheduled'});}
function stored(f:F,s:View){return JSON.parse(String(f.ctx.db.prepare("SELECT payload FROM study_sessions WHERE json_extract(payload,'$.sessionId')=?").get(s.sessionId)!.payload));}
function count(f:F,table:string,id:string){return Number(f.ctx.db.prepare(`SELECT count(*) n FROM ${table} WHERE card_id=?`).get(id)!.n);}
async function publish(f:F,c:{cardId:string;deckId:string},fields:z.infer<typeof DraftFields>,reset=false){return f.client.call('card.publish',{cardId:c.cardId,deckId:c.deckId,expectedPublishedRevision:Number(f.ctx.db.prepare('SELECT revision FROM learning_cards WHERE id=?').get(c.cardId)!.revision),expectedDraftRevision:null,fields,resetStudyCycle:reset});}

test('W7.1-02 same card practiced five times retains five distinct records and existing FSRS bytes',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('question');await submit(f,await formal(f,c.deckId));const before=facts(f,c.cardId);
  const events=[];for(let i=0;i<5;i++){
   const s=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId],practice:true});
   const r=await submit(f,s);events.push(r.event);assert.equal(r.event.native!.practice,true);assert.equal(r.event.objectiveCorrect,true);assert.equal(r.event.native!.elapsedSeconds,2);assert.deepEqual(facts(f,c.cardId),before);
  }
  assert.equal(new Set(events.map(e=>e.eventId)).size,5);assert.equal(count(f,'learning_review_events',c.cardId),6);
  const summary=await f.client.call('card.listSummary',{deckId:c.deckId});assert.equal(summary.items.find(x=>x.cardId===c.cardId)!.reviewCount,6);
 }finally{f.close();}
});
test('W7.1-03 scheduled transaction uses real FSRS and ignores client practice flag',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('direct'),s=await formal(f,c.deckId),r=await ready(f,s);
  const e=await f.client.call('learning.review.submit',{...r.input,practice:true});
  assert.equal(e.native!.practice,false);assert.equal(e.native!.schedule.outcome,'updated');
  const state=JSON.parse(String(f.ctx.db.prepare('SELECT data FROM scheduling WHERE card_id=?').get(c.cardId)!.data));
  assert.equal(state.reps,1);assert.equal(state._gank.eventId,e.eventId);assert.ok(state.stability>0);assert.ok(state.difficulty>0);
  assert.equal(f.ctx.db.prepare('SELECT after_state FROM schedule_events WHERE id=?').get(e.eventId)!.after_state,JSON.stringify(state));
  assert.equal(stored(f,s).resultEventId,e.eventId);assert.equal(stored(f,s).completed,true);
  await assert.rejects(()=>formal(f,c.deckId),{code:'NO_SCHEDULED_CARDS'});
 }finally{f.close();}
});
for(const mode of ['practice','scheduled'] as const)test(`W7.1-04/05 ${mode}: two durable commits survive restart; third failure rolls back only third`,async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const cards=[];for(let i=0;i<5;i++)cards.push(await f.card('direct'));
  let s=mode==='scheduled'?await formal(f,cards[0].deckId):await f.client.call('learning.session.open',{deckId:cards[0].deckId,cardIds:cards.map(c=>c.cardId)});
  const ids=stored(f,s).ids,events=[];
  for(let i=0;i<2;i++){const r=await submit(f,s);events.push(r.event);s=r.s;s=await f.client.call('learning.session.change',{...scope(s),expectedRevision:s.revision,action:'next'});}
  s=await f.client.call('learning.session.change',{...scope(s),expectedRevision:s.revision,action:'pause'});f.reopen();s=await f.client.call('learning.session.get',scope(s));
  assert.equal(s.index,2);assert.equal(s.total-s.index,3);for(const e of events)assert.ok(f.ctx.db.prepare('SELECT 1 FROM learning_review_events WHERE id=?').get(e.eventId));
  const third=await ready(f,s),before=JSON.stringify({sessions:f.ctx.db.prepare('SELECT * FROM study_sessions').all(),events:f.ctx.db.prepare('SELECT * FROM learning_review_events').all(),schedule:f.ctx.db.prepare('SELECT * FROM scheduling').all(),logs:f.ctx.db.prepare('SELECT * FROM schedule_events').all()});
  // Fail after the domain writes, at the outer receipt, proving atomic progress too.
  f.ctx.db.exec("CREATE TEMP TRIGGER w7_third BEFORE INSERT ON protocol_receipts WHEN NEW.method='learning.review.submit' BEGIN SELECT RAISE(ABORT,'W7 third receipt fail'); END");
  await assert.rejects(()=>f.client.call('learning.review.submit',third.input));
  assert.equal(JSON.stringify({sessions:f.ctx.db.prepare('SELECT * FROM study_sessions').all(),events:f.ctx.db.prepare('SELECT * FROM learning_review_events').all(),schedule:f.ctx.db.prepare('SELECT * FROM scheduling').all(),logs:f.ctx.db.prepare('SELECT * FROM schedule_events').all()}),before);
  assert.equal(count(f,'learning_review_events',ids[2]),0);assert.equal(stored(f,s).draft.reflection,'reflection');
  f.ctx.db.exec('DROP TRIGGER w7_third');
  const a=await f.client.call('learning.review.submit',third.input),b=await f.client.call('learning.review.submit',third.input);assert.deepEqual(a,b);assert.equal(count(f,'learning_review_events',ids[2]),1);
  f.reopen();for(const e of events)assert.ok(f.ctx.db.prepare('SELECT 1 FROM learning_review_events WHERE id=?').get(e.eventId));
 }finally{f.close();}
});
test('W7.1-08/09/10/14 deck uniqueness and practice/scheduled coexist without exclusions',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const a=await f.card('direct'),b=await f.card('direct',f.source.ids.mDeck);
  const p=await f.client.call('learning.session.open',{deckId:a.deckId,cardIds:[a.cardId]}),s=await formal(f,a.deckId),again=await formal(f,a.deckId),other=await formal(f,b.deckId);
  assert.equal(s.sessionId,again.sessionId);assert.notEqual(s.sessionId,other.sessionId);assert.notEqual(s.sessionId,p.sessionId);
  const q=await f.client.call('learning.queue.preview',{deckId:a.deckId,selectedIds:[a.cardId]});assert.equal(q.due[0].cardId,a.cardId);
  const p2=await f.client.call('learning.session.open',{deckId:a.deckId,cardIds:[a.cardId]});await submit(f,p2);assert.equal((await formal(f,a.deckId)).sessionId,s.sessionId);await submit(f,s);
  assert.equal(count(f,'schedule_events',a.cardId),1);
  const active=f.ctx.db.prepare("SELECT deck_id,count(*) n FROM study_sessions WHERE json_extract(payload,'$.mode')='scheduled' AND json_extract(payload,'$.completed')=0 GROUP BY deck_id").all();assert.equal(active.length,1);assert.equal(active[0].deck_id,b.deckId);
 }finally{f.close();}
});
test('W7.1-11/12 create request retry is durable and new request creates new practice',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('direct'),req=f.client.prepare('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]});
  const a=await f.client.send(req),b=await f.client.send(req);assert.deepEqual(a,b);f.reopen();assert.deepEqual(await f.client.send(req),a);
  const next=await f.client.call('learning.session.open',req.payload);assert.notEqual(next.sessionId,a.sessionId);
  assert.equal(f.ctx.db.prepare("SELECT count(*) n FROM study_sessions WHERE json_extract(payload,'$.mode')='practice'").get()!.n,2);
 }finally{f.close();}
});
test('W7.1-13 due/relearn IDs remain unique; new due cards wait for next formal queue',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('direct');let s=await formal(f,c.deckId);await submit(f,s,0);f.advance(600000);
  const another=await f.card('direct');
  const q=await f.client.call('learning.queue.preview',{deckId:c.deckId});assert.ok(q.relearn.some(x=>x.cardId===c.cardId));assert.ok(q.due.some(x=>x.cardId===another.cardId));
  s=await formal(f,c.deckId);assert.equal(new Set(stored(f,s).ids).size,2);assert.equal(stored(f,s).ids.length,2);
  const late=await f.card('direct');assert.equal((await formal(f,c.deckId)).sessionId,s.sessionId);assert.ok(!stored(f,s).ids.includes(late.cardId));
  await assert.rejects(()=>f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId,c.cardId]}));
  await assert.rejects(()=>f.client.call('learning.session.open',{deckId:c.deckId,mode:'scheduled',cardIds:[c.cardId]}));
 }finally{f.close();}
});

test('W7.1-15 every content field/type/media/link/publication edit preserves actual SQLite FSRS and cycle rows',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('question');await submit(f,await formal(f,c.deckId));const before=facts(f,c.cardId);
  const assertUnchanged=()=>assert.deepEqual(facts(f,c.cardId),before);
  const fields={title:'new title',payload:structuredClone(c.payload),mediaRefs:[] as any[]};
  if(fields.payload.encoding!=='question-v1')throw Error('fixture');
  const q=fields.payload.fields;
  for(const change of [()=>fields.title='changed title',()=>q.stem='changed **stem**',()=>q.material='material',()=>q.correctOptionId='stable:a',()=>q.options[0].markdown='new option',()=>q.analysis='new analysis',()=>q.initialThought='thought',()=>q.source='source']){
   change();await publish(f,c,fields);assertUnchanged();
  }
  const bytes=readFileSync(join(f.ctx.dataDir,'attachments',f.source.ids.unboundImage+'.png')),assetId=f.source.ids.unboundImage,placementId=randomUUID();
  const ref={assetId,placementId,width:80,role:'analysis',fileName:assetId+'.png',mime:'image/png'};
  fields.mediaRefs=[ref];q.analysis=`![media](${placementUrl({assetId,placementId,width:80})})`;await publish(f,c,fields);assertUnchanged();
  fields.mediaRefs=[];q.analysis='removed media';await publish(f,c,fields);assertUnchanged();
  for(const payload of [{encoding:'qa-v1',mode:'qa',fields:{front:'**Markdown front**',back:'changed answer',supplement:'supplement',source:''}},{encoding:'direct-v1',mode:'direct',fields:{body:'**Markdown** content',source:''}}]){
   await publish(f,c,{title:'changed type',payload,mediaRefs:[]},true);assertUnchanged();
  }
  const links=await f.client.call('knowledge.cardLinks.get',{deckId:c.deckId,cardId:c.cardId});
  await f.client.call('knowledge.cardLinks.set',{deckId:c.deckId,cardId:c.cardId,nodeIds:[f.source.ids.child1],expectedRevision:links.revision});assertUnchanged();
  validateUnifiedData(f.ctx.db);f.reopen();assertUnchanged();
 }finally{f.close();}
});
for(const mode of ['practice','scheduled'] as const)test(`W7.1-16 ${mode}: all entries freeze at creation; old version submits after content publication`,async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const a=await f.card('direct'),b=await f.card('direct');let s=mode==='scheduled'?await formal(f,a.deckId):await f.client.call('learning.session.open',{deckId:a.deckId,cardIds:[a.cardId,b.cardId]});
  const frozen=stored(f,s).entries;
  for(const entry of frozen)await publish(f,{cardId:entry.cardId,deckId:s.deckId},{title:'changed',payload:{encoding:'direct-v1',mode:'direct',fields:{body:'latest content',source:''}},mediaRefs:[]});
  for(let i=0;i<2;i++){
   assert.equal(s.entry.versionId,frozen[i].versionId);assert.equal(s.content.versionId,frozen[i].versionId);assert.equal(s.content.title,'合成direct');
   const r=await submit(f,s);assert.equal(r.event.contentVersionId,frozen[i].versionId);
   const log=f.ctx.db.prepare('SELECT log FROM schedule_events WHERE id=?').get(r.event.eventId);if(mode==='scheduled')assert.equal(JSON.parse(String(log!.log)).versionId,frozen[i].versionId);else assert.equal(log,undefined);
   s=r.s;if(i===0)s=await f.client.call('learning.session.change',{...scope(s),expectedRevision:s.revision,action:'next'});
  }
 }finally{f.close();}
});
test('W7.1-17 unknown legacy mode preserves session, drafts, progress, events and scheduling on recovery',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const a=await f.card('direct'),b=await f.card('direct');let s=await f.client.call('learning.session.open',{deckId:a.deckId,cardIds:[a.cardId,b.cardId]});
  const first=await submit(f,s);s=await f.client.call('learning.session.change',{...scope(s),expectedRevision:first.s.revision,action:'next'});
  s=await f.client.call('learning.session.change',{...scope(s),expectedRevision:s.revision,action:'save',draft:{...s.draft,reflection:'legacy retained',practice:false}});
  const raw=stored(f,s);delete raw.mode;delete raw.entries;raw.practiceMode=false;
  f.ctx.db.prepare("UPDATE study_sessions SET payload=? WHERE json_extract(payload,'$.sessionId')=?").run(JSON.stringify(raw),s.sessionId);
  const history=f.ctx.db.prepare('SELECT * FROM learning_review_events ORDER BY id').all(),before=facts(f,b.cardId);
  f.reopen();const restored=await f.client.call('learning.session.get',scope(s));assert.equal(restored.mode,'practice');assert.equal(restored.practiceMode,true);assert.equal(restored.sessionId,s.sessionId);assert.equal(restored.index,1);assert.equal(restored.draft.reflection,'legacy retained');assert.equal(restored.draft.practice,false);
  assert.deepEqual(f.ctx.db.prepare('SELECT * FROM learning_review_events ORDER BY id').all(),history);assert.deepEqual(facts(f,b.cardId),before);
  const r=await submit(f,restored);assert.equal(r.event.native!.practice,true);assert.deepEqual(facts(f,b.cardId),before);assert.ok(f.ctx.db.prepare('SELECT 1 FROM learning_review_events WHERE id=?').get(first.event.eventId));
 }finally{f.close();}
});
test('W7.1-18 concurrent independent SQLite connections create exactly one active formal queue',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('direct'),path=join(f.source.root,'concurrency.sqlite'),clock=f.ctx.now().toISOString();
  f.ctx.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');copyFileSync(f.ctx.db.location()!,path);
  const gate=new SharedArrayBuffer(4),workers=[0,1].map(()=>new Worker(new URL('./fixtures/w7-create-worker.ts',import.meta.url),{workerData:{path,deckId:c.deckId,clock,gate}}));
  const exits=workers.map(w=>new Promise<void>((resolve,reject)=>{w.on('error',reject);w.on('exit',code=>code?reject(Error('worker exit '+code)):resolve());}));
  const replies=workers.map(w=>new Promise<string>((resolve,reject)=>{w.on('error',reject);w.on('message',m=>{if(m.ready){if(Atomics.add(new Int32Array(gate),0,1)===1){Atomics.store(new Int32Array(gate),0,3);Atomics.notify(new Int32Array(gate),0);}}else if(m.sessionId)resolve(m.sessionId);});w.on('exit',code=>{if(code)reject(Error('worker exit '+code));});}));
  const ids=await Promise.all(replies);await Promise.all(exits);assert.equal(ids[0],ids[1]);
  const db=new DatabaseSync(path);db.exec('PRAGMA busy_timeout=5000');try{assert.equal(db.prepare("SELECT count(*) n FROM study_sessions WHERE json_extract(payload,'$.mode')='scheduled' AND json_extract(payload,'$.completed')=0").get()!.n,1);assert.equal(db.prepare('PRAGMA user_version').get()!.user_version,606);}finally{db.close();}
  await Promise.all(workers.map(w=>w.terminate()));
 }finally{f.close();}
});
test('W7.1 protocol accepts modes and legacy flags; duplicate IDs and client-selected scheduled cards reject',()=>{
 const deckId=randomUUID(),cardId=randomUUID();assert.equal(OpenReviewSession.parse({deckId,cardIds:[cardId],practice:false}).mode,'practice');assert.ok(OpenReviewSession.safeParse({deckId,mode:'scheduled'}).success);
 assert.equal(OpenReviewSession.safeParse({deckId,mode:'scheduled',cardIds:[cardId]}).success,false);assert.equal(OpenReviewSession.safeParse({deckId,cardIds:[cardId,cardId]}).success,false);
});

test('W7.1 scheduled CAS still rejects changed scheduling; practice tolerates later formal scheduling',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('direct'),practice=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]});
  await submit(f,await formal(f,c.deckId));const after=facts(f,c.cardId);await submit(f,practice);assert.deepEqual(facts(f,c.cardId),after);
  const due=Date.parse(JSON.parse(String(after.schedule[0].data)).due);f.advance(due-+f.ctx.now()+1);
  const scheduled=await formal(f,c.deckId),r=await ready(f,scheduled);
  const changed=JSON.parse(String(after.schedule[0].data));changed._gank.revision++;
  f.ctx.db.prepare('UPDATE scheduling SET data=? WHERE card_id=?').run(JSON.stringify(changed),c.cardId);
  const before=facts(f,c.cardId);await assert.rejects(()=>f.client.call('learning.review.submit',r.input),{code:'REVIEW_SNAPSHOT_CONFLICT'});assert.deepEqual(facts(f,c.cardId),before);assert.equal(count(f,'learning_review_events',c.cardId),2);
 }finally{f.close();}
});

import {contentIdentity} from '../shared/protocol/identity.ts';
test('W7.1 legacy606 command with practice=false has no formal provenance and cannot schedule; raw old draft survives',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const old=f.ctx.db.prepare("SELECT * FROM study_sessions WHERE json_extract(payload,'$.schemaVersion')=1").all(),before=facts(f,f.source.ids.memory),history=f.ctx.db.prepare('SELECT * FROM learning_review_events ORDER BY id').all();
  const requestId=randomUUID(),req=f.client.prepare('review.memory.submit',{requestId,kind:'memory',deckId:f.source.ids.mDeck,cardId:f.source.ids.memory,contentVersion:contentIdentity(f.source.ids.memory,2),rating:'good',practice:false},requestId);
  const result=await f.client.send(req);assert.deepEqual(await f.client.send(req),result);assert.equal(result.effective,false);
  assert.deepEqual(facts(f,f.source.ids.memory),before);assert.equal(count(f,'learning_review_events',f.source.ids.memory),3);
  for(const event of history)assert.equal(f.ctx.db.prepare('SELECT document FROM learning_review_events WHERE id=?').get(event.id)!.document,event.document);
  assert.deepEqual(f.ctx.db.prepare("SELECT * FROM study_sessions WHERE json_extract(payload,'$.schemaVersion')=1").all(),old);
  const payload={deckId:f.source.ids.qDeck,expectedRevision:0,draft:{sessionId:randomUUID(),entryId:randomUUID(),ids:[f.source.ids.question],index:0,contentVersion:contentIdentity(f.source.ids.question,2),stage:'answer' as const,answer:'',thought:'retained independent old draft',basis:'independent' as const,understanding:2,elapsedSeconds:0,practice:false}};
  await f.client.call('session.draft',payload);await f.client.call('session.draft',{...payload,draft:{...payload.draft,sessionId:randomUUID(),entryId:randomUUID()}});
  assert.deepEqual(facts(f,f.source.ids.memory),before);
 }finally{f.close();}
});

import {transaction} from '../electron/infrastructure/database.ts';
test('W7.1 owner integrity rejects an imported duplicate formal session atomically',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('direct'),s=await formal(f,c.deckId),raw=stored(f,s),before=f.ctx.db.prepare('SELECT * FROM study_sessions ORDER BY rowid').all();
  assert.throws(()=>transaction(f.ctx.db,()=>f.ctx.db.prepare('INSERT INTO study_sessions VALUES(?,?,?,?)').run(s.deckId,JSON.stringify({...raw,sessionId:randomUUID()}),f.ctx.now().toISOString(),raw.revision)),/多个活动正式队列/);
  assert.deepEqual(f.ctx.db.prepare('SELECT * FROM study_sessions ORDER BY rowid').all(),before);validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
