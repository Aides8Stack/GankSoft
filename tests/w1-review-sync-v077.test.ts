import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {createClient} from '../shared/protocol/client.ts';
import type {Input} from '../shared/protocol/registry.ts';
import type {z} from 'zod';
import {ReviewSessionView} from '../shared/protocol/unified-review.ts';
import {createHost} from '../shared/protocol/host.ts';
import {createHash} from 'node:crypto';
import {PROTOCOL} from '../shared/protocol/data.ts';
const code=(name:string)=>(e:unknown)=>(e as {code?:string}).code===name;
type F=Awaited<ReturnType<typeof unifiedWorkspaceFixture>>;
async function prepare(f:F,card:{cardId:string;deckId:string},practice=false,score=90,existing?:z.infer<typeof ReviewSessionView>){
 const state=f.ctx.db.prepare('SELECT data FROM scheduling WHERE card_id=?').get(card.cardId);
 if(!practice&&!existing&&state){const due=Date.parse(JSON.parse(String(state.data)).due);if(due>+f.ctx.now())f.advance(due-+f.ctx.now()+1);}
 let s=existing??await f.client.call('learning.session.open',practice?{deckId:card.deckId,cardIds:[card.cardId]}:{deckId:card.deckId,mode:'scheduled'});
 assert.equal(s.entry.cardId,card.cardId);
 const scope={deckId:s.deckId,sessionId:s.sessionId};
 if(s.stage==='answer')s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'reveal',draft:{...s.draft,selectedOptionId:s.content.mode==='question'?'stable:a':null,thought:'W1 independent'}});
 s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:score,reflection:'W1 retained answer'}});
 const input:Input<'learning.review.submit'>={...scope,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:score,faults:[],gaps:'',reflection:s.draft.reflection,practice:false};
 return {s,input};
}
async function complete(f:F,s:z.infer<typeof ReviewSessionView>){const latest=await f.client.call('learning.session.get',{deckId:s.deckId,sessionId:s.sessionId});await f.client.call('learning.session.change',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:latest.revision,action:'next'});}
function facts(f:F,id:string){return {events:f.ctx.db.prepare('SELECT * FROM learning_review_events WHERE card_id=?').all(id),schedules:f.ctx.db.prepare('SELECT * FROM schedule_events WHERE card_id=?').all(id),latest:f.ctx.db.prepare('SELECT * FROM scheduling WHERE card_id=?').get(id),revision:f.ctx.db.prepare('SELECT revision FROM protocol_meta').get()!.revision};}
test('W7 regression W1-01/02/03 three formal modes, wrong objective Again and due/relearn scheduling',async()=>{
 const f=await unifiedWorkspaceFixture();try{for(const mode of ['question','qa','direct'] as const){const deck=await f.client.call('workspace.catalog.save',{kind:'deck',name:'W1 '+mode,parentId:null}),card=await f.card(mode,deck.id);for(let round=0;round<2;round++){
 const {s,input}=await prepare(f,card,false,100);assert.equal(s.practiceMode,false);assert.equal(s.draft.practice,false);
 const e=await f.client.call('learning.review.submit',input);assert.equal(e.scoreTenths,100);assert.equal(e.rating,mode==='question'?'again':'easy');assert.equal(e.native!.practice,false);assert.equal(e.native!.schedule.outcome,'updated');
 const actual=facts(f,card.cardId);assert.equal(actual.events.length,round+1);assert.equal(actual.schedules.length,round+1);const latest=JSON.parse(String(actual.latest!.data));assert.equal(latest._gank.eventId,e.eventId);assert.equal(latest.reps,round+1);assert.equal(actual.schedules.at(-1)!.after_state,actual.latest!.data);
 await complete(f,s);
 }}}finally{f.close();}
});
test('W1-04/06 receipt failure rolls back all tables + revision; original request retries exactly once',async()=>{
 const f=await unifiedWorkspaceFixture();try{const card=await f.card('direct'),{s,input}=await prepare(f,card),req=f.client.prepare('learning.review.submit',input),before=facts(f,card.cardId);
 f.ctx.db.exec("CREATE TEMP TRIGGER w1_fail BEFORE INSERT ON protocol_receipts WHEN NEW.method='learning.review.submit' BEGIN SELECT RAISE(ABORT,'W1 fail receipt'); END");
 await assert.rejects(()=>f.client.send(req));assert.deepEqual(facts(f,card.cardId),before);const draft=await f.client.call('learning.session.get',{deckId:s.deckId,sessionId:s.sessionId});assert.equal(draft.stage,'reveal');assert.equal(draft.draft.reflection,'W1 retained answer');
 f.ctx.db.exec('DROP TRIGGER w1_fail');
 const events=await Promise.all([f.client.send(req),f.client.send(req)]);assert.deepEqual(events[0],events[1]);assert.equal(facts(f,card.cardId).events.length,1);assert.equal(facts(f,card.cardId).schedules.length,1);
 assert.equal(facts(f,card.cardId).revision,Number(before.revision)+1);assert.equal(f.client.metadata(events[0])!.dataRevision,Number(before.revision)+1);
 f.reopen();assert.equal((await f.client.call('learning.session.get',{deckId:s.deckId,sessionId:s.sessionId})).result!.eventId,input.eventId);
 }finally{f.close();}
});
test('W1-06 unknown reply resolves original receipt metadata and never duplicates',async()=>{
 const f=await unifiedWorkspaceFixture();try{const card=await f.card('qa'),{input}=await prepare(f,card);let drop=true;
 const c=createClient(async request=>{const r=request as {method:string},reply=await f.host.execute(request);if(drop&&r.method==='learning.review.submit'){drop=false;throw Error('lost');}return reply;});await c.call('app.capabilities',{});const req=c.prepare('learning.review.submit',input);
 await assert.rejects(()=>c.send(req),code('TRANSPORT_UNKNOWN'));
 const status=await c.call('operation.status',{requestId:req.requestId,method:req.method,payload:req.payload});assert.equal(status.state,'committed');const e=c.acceptReceipt(req,status.response);assert.equal(e.eventId,input.eventId);assert.ok(c.metadata(e));assert.equal(facts(f,card.cardId).events.length,1);assert.equal((await c.send(req)).eventId,e.eventId);
 }finally{f.close();}
});
test('W7 regression W1-06 publication keeps frozen V1 and still commits scheduled V1',async()=>{
 const f=await unifiedWorkspaceFixture();try{const card=await f.card('direct'),{s,input}=await prepare(f,card);
 const r=await f.client.call('card.getPublishedContent',{cardId:card.cardId,deckId:card.deckId}),fields={title:'changed',payload:r.payload!,mediaRefs:r.mediaRefs};await f.client.call('card.publish',{cardId:card.cardId,deckId:card.deckId,expectedPublishedRevision:Number(f.ctx.db.prepare('SELECT revision FROM learning_cards WHERE id=?').get(card.cardId)!.revision),expectedDraftRevision:null,resetStudyCycle:false,fields});
 const event=await f.client.call('learning.review.submit',input);assert.equal(event.contentVersionId,s.entry.versionId);assert.equal(event.native!.schedule.outcome,'updated');assert.equal(facts(f,card.cardId).schedules.length,1);
 }finally{f.close();}
});
test('W1-05/07 late old query rejected after two writes; cursor invalidation; monotonic metadata',async()=>{
 const f=await unifiedWorkspaceFixture();try{const a=await f.card('direct'),b=await f.card('direct');let release!:()=>void,hold=false;
 const c=createClient(async request=>{const reply=await f.host.execute(request);if(hold&&(request as {method:string}).method==='card.listSummary'){hold=false;await new Promise<void>(r=>release=r);}return reply;});await c.call('app.capabilities',{});
 const first=await c.call('card.listSummary',{deckId:a.deckId,limit:1});hold=true;const old=c.call('card.listSummary',{deckId:a.deckId,limit:1});const rejected=assert.rejects(()=>old,code('DATA_REVISION_CHANGED'));
 let page=await f.client.call('learning.session.open',{deckId:a.deckId,mode:'scheduled'});
 for(let i=0;i<2;i++){const card={cardId:page.entry.cardId,deckId:page.deckId},{s,input}=await prepare(f,card,false,90,page);const e=await c.call('learning.review.submit',input);assert.equal(e.native!.schedule.outcome,'updated');const current=await f.client.call('learning.session.get',{deckId:s.deckId,sessionId:s.sessionId});if(!current.completed)page=await f.client.call('learning.session.change',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:current.revision,action:'next'});}
 release();await rejected;await assert.rejects(()=>c.call('card.listSummary',{deckId:a.deckId,limit:1,cursor:first.nextCursor}),code('DATA_REVISION_CHANGED'));
 const current=await c.call('card.listSummary',{deckId:a.deckId});assert.equal(current.items.find(i=>i.cardId===a.cardId)!.reviewCount,1);assert.equal(c.metadata(current)!.dataRevision,c.snapshot()!.dataRevision);
 }finally{f.close();}
});
test('W1-08 epoch metadata rejects delayed old identities without bypassing owner safety',async()=>{
 let epoch=randomUUID(),revision=0,release!:()=>void,hold=false;
 const host=createHost({epoch:()=>epoch,revision:()=>revision,atomic:fn=>fn(),getReceipt:()=>null,putReceipt:()=>{},bumpRevision:()=>++revision},{},s=>createHash('sha256').update(s).digest('hex'));
 const c=createClient(async request=>{const result=host.execute(request);if(hold){hold=false;await new Promise<void>(r=>release=r);}return result;});await c.call('app.capabilities',{});const oldEpoch=c.snapshot()!.dataEpoch;
 hold=true;const old=c.call('app.capabilities',{});const rejected=assert.rejects(()=>old,code('DATA_EPOCH_CHANGED'));
 epoch=randomUUID();await c.call('app.capabilities',{});assert.notEqual(c.snapshot()!.dataEpoch,oldEpoch);release();await rejected;assert.equal(c.snapshot()!.dataEpoch,epoch);
});
test('W7 regression W1-03 mode is server-owned; client practice flag cannot bypass formal scheduling',async()=>{
 const f=await unifiedWorkspaceFixture();try{const card=await f.card('direct'),{s,input}=await prepare(f,card);
 const event=await f.client.call('learning.review.submit',{...input,practice:true});assert.equal(event.native!.practice,false);assert.equal(facts(f,card.cardId).schedules.length,1);
 const p=await f.client.call('learning.session.open',{deckId:card.deckId,cardIds:[card.cardId],practice:false});assert.equal(p.mode,'practice');
 assert.equal((await f.client.call('learning.session.get',{deckId:s.deckId,sessionId:s.sessionId})).completed,true);
 }finally{f.close();}
});
test('W1-03 historical native practice bytes remain unchanged while a new formal event schedules',async()=>{
 const f=await unifiedWorkspaceFixture();try{const card=await f.card('direct');const first=await prepare(f,card);const e=await f.client.call('learning.review.submit',first.input);await complete(f,first.s);
 // Synthetic historical fixture only: emulate an old pre-W1 practice record.
 e.eventId=randomUUID();e.createdAt=new Date(Date.parse(e.createdAt)-1000).toISOString();e.native!.practice=true;e.native!.schedule.outcome='practice';e.native!.schedule.afterHash=null;const historical=JSON.stringify(e);
 f.ctx.db.prepare('INSERT INTO learning_review_events VALUES(?,?,?,?,?,?,?)').run(e.eventId,e.cardId,e.contentVersionId,e.cycleId,e.mode,e.createdAt,historical);
 assert.equal((await f.client.call('learning.history.get',{cardId:card.cardId,deckId:card.deckId,eventId:e.eventId})).native!.practice,true);
 const next=await prepare(f,card);await f.client.call('learning.review.submit',next.input);
 assert.equal(f.ctx.db.prepare('SELECT document FROM learning_review_events WHERE id=?').get(e.eventId)!.document,historical);assert.equal(facts(f,card.cardId).events.length,3);assert.equal(facts(f,card.cardId).schedules.length,2);
 }finally{f.close();}
});
test('W1-08 fresh reads recompute study-day counts without a data revision change',async()=>{
 const f=await unifiedWorkspaceFixture();try{const card=await f.card('direct');const {input}=await prepare(f,card);await f.client.call('learning.review.submit',input);const before=await f.client.call('workspace.dashboard',{deckId:card.deckId});assert.ok(before.todayCount>0);const revision=f.client.snapshot()!.dataRevision;f.advance(2*86400000);const after=await f.client.call('workspace.dashboard',{deckId:card.deckId});assert.equal(after.todayCount,0);assert.equal(f.client.snapshot()!.dataRevision,revision);
 }finally{f.close();}
});
