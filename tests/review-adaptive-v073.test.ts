import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeEvidence,type EvidenceEvent } from '../shared/review-evidence.ts';
import { DiagnosisRule } from '../shared/review-config.ts';
import { openDatabase } from './fixture.ts';
import { Application } from '../electron/application.ts';
import { deckDiagnosis } from '../electron/modules/review/diagnosis.ts';
import { previewQueue } from '../electron/modules/review/review-queue.ts';
import { saveConfig,reviewConfig,setKnowledgePreference } from '../electron/modules/review/config-service.ts';
const now=new Date('2026-10-19T00:00:00Z');const rule=DiagnosisRule.parse({});
function event(id:string,cardId:string,days:number,positive=true):EvidenceEvent{return{id,cardId,at:new Date(+now-days*86400000).toISOString(),timezone:'Asia/Shanghai',independent:true,positive,negative:!positive,practice:false,credit:1,faults:[]}}
test('SCH-16..19 all-history decay, independent-day caps, stale/unknown and recovery',()=>{
 const repeated=Array.from({length:10},(_,i)=>event('r'+i,'q',0));
 const diverse=Array.from({length:5},(_,i)=>event('d'+i,'q'+i,i));
 const a=analyzeEvidence(repeated,now,rule,5,true),b=analyzeEvidence(diverse,now,rule,5,true);
 assert.equal(a.distinctDays,1);assert.equal(a.distinctCards,1);assert.notEqual(a.status,'stable');assert.ok(b.confidence>a.confidence);
 const old=Array.from({length:20},(_,i)=>event('old'+i,'bad',365+i,false));
 const newer=Array.from({length:12},(_,i)=>event('new'+i,'new'+i,i));
 const recovered=analyzeEvidence([...old,...newer],now,rule,13,true);
 assert.ok(recovered.risk!<analyzeEvidence(old,now,rule,13,true).risk!);assert.equal(recovered.improving,true);
 assert.equal(analyzeEvidence(old,now,rule,13,true).status,'stale');
 assert.equal(analyzeEvidence([],now,rule).risk,null);
 const correction=analyzeEvidence([event('bad','q',0,false),{...event('after','q',0),at:new Date(+now+1000).toISOString()}],new Date(+now+2000),rule,1,true);
 assert.equal(correction.good,0);assert.ok(correction.bad>0);
});
test('SCH-08..15,18 knowledge attribution, parent dedup, exclusion only specialty, no FSRS writes',()=>{
 const db=openDatabase(':memory:');const ctx={db,dataDir:'',now:()=>new Date(now)};const app=new Application(ctx);
 try{
 const deckId='question-default';
 const parent=app.handle('knowledge.save',{module:deckId,name:'P'});
 const k1=app.handle('knowledge.save',{module:deckId,name:'K1',parent_id:parent});
 const k2=app.handle('knowledge.save',{module:deckId,name:'K2',parent_id:parent});
 const q=app.handle('question.save',{module:deckId,stem:'S',answer:'A',knowledge_ids:[parent,k1,k2]});
 app.handle('review.submit',{question_id:q,content_version:1,request_id:'attempt-negative',answer:'B',thought:'failed',basis:'independent',understanding:0,faults:['知识缺失'],error_knowledge_ids:[k2]});
 const d=deckDiagnosis(ctx,deckId);
 assert.equal(d.knowledge.find(k=>k.knowledgeId===k1)!.bad,0);
 assert.ok(d.knowledge.find(k=>k.knowledgeId===k2)!.bad>0);
 assert.ok(d.knowledge.find(k=>k.knowledgeId===parent)!.bad<=1);
 // Explicitly due card remains eligible despite specialty exclusion.
 db.prepare('UPDATE plans SET due_at=? WHERE question_id=?').run(new Date(+now-50*86400000).toISOString(),q);
 setKnowledgePreference(ctx,{deckId,knowledgeId:k2,expectedRevision:0,preference:{mode:'exclude_specialty'}});
 const state=db.prepare('SELECT * FROM scheduling').all();const changes=db.prepare('SELECT total_changes() n').get()!.n;
 const queue=previewQueue(ctx,{deckId,seed:'fixed'});
 assert.equal(queue.relearn.length,1);assert.deepEqual(queue,previewQueue(ctx,{deckId,seed:'fixed'}));
 assert.equal(db.prepare('SELECT total_changes() n').get()!.n,changes);assert.deepEqual(db.prepare('SELECT * FROM scheduling').all(),state);
 assert.throws(()=>setKnowledgePreference(ctx,{deckId:'memory-default',knowledgeId:k2,expectedRevision:0,preference:{}}),/不属于/);
 }finally{db.close()}
});
test('SCH-14,18,20 current-version and association history boundaries, rule tuning never mutates events or FSRS',async()=>{
 const {saveDiagnosisRule}=await import('../electron/modules/review/config-service.ts');
 const db=openDatabase(':memory:');const ctx={db,dataDir:'',now:()=>new Date(now)};const app=new Application(ctx);
 try{
 const deckId='question-default';const k1=app.handle('knowledge.save',{module:deckId,name:'K1'}),k2=app.handle('knowledge.save',{module:deckId,name:'K2'});
 const q=app.handle('question.save',{module:deckId,stem:'S',answer:'A',knowledge_ids:[k1]});
 app.handle('review.submit',{question_id:q,request_id:'positive',content_version:1,answer:'A',thought:'independent',basis:'independent',understanding:2});
 let row=app.snapshot().questions.find(r=>r.id===q);app.handle('question.save',{...row,knowledge_ids:[k1,k2]});
 assert.equal(deckDiagnosis(ctx,deckId).knowledge.find(k=>k.knowledgeId===k2)!.good,0);
 const events=db.prepare('SELECT * FROM attempts').all(),state=db.prepare('SELECT * FROM scheduling').all();
 saveDiagnosisRule(ctx,{expectedRevision:0,rule:{evidenceHalfLifeDays:30}});
 assert.deepEqual(db.prepare('SELECT * FROM attempts').all(),events);assert.deepEqual(db.prepare('SELECT * FROM scheduling').all(),state);
 row=app.snapshot().questions.find(r=>r.id===q);app.handle('question.save',{...row,stem:'new content'});
 assert.equal(deckDiagnosis(ctx,deckId).questions.find(d=>d.cardId===q)!.status,'unseen');assert.equal(db.prepare('SELECT count(*) n FROM attempts').get()!.n,1);
 }finally{db.close()}
});
test('SCH-10,17 DST learning dates and duplicate-day evidence do not inflate confidence',()=>{
 const events=[{...event('before','q',0),at:'2026-11-01T05:30:00Z',timezone:'America/New_York'},{...event('after','q',0),at:'2026-11-01T06:30:00Z',timezone:'America/New_York'}];
 const d=analyzeEvidence(events,new Date('2026-11-02T08:00:00Z'),rule,2,true);assert.equal(d.distinctDays,1);assert.equal(d.distinctCards,1);assert.ok(d.good<=1);
 const future=analyzeEvidence([event('future','q',-10)],now,rule);assert.equal(future.invalidEvents,1);assert.equal(future.risk,null);
});
