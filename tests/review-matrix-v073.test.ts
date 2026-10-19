import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from './fixture.ts';
import { Application } from '../electron/application.ts';
import { cardConfig,reviewConfig,saveConfig } from '../electron/modules/review/config-service.ts';
import { saveReviewPolicy,saveDeckReviewPolicy } from '../electron/modules/review/policy.ts';
import { assessmentTarget,saveAssessmentPolicy } from '../electron/modules/assessment/policy.ts';
import { previewQueue } from '../electron/modules/review/review-queue.ts';
import { previewExisting,applyExisting } from '../electron/modules/review/due-preview.ts';
import { selectCandidates,type QueueCandidate } from '../shared/review-priority-v2.ts';
import { DeckConfig } from '../shared/review-config.ts';
function fixture(){const db=openDatabase(':memory:');let now=new Date('2026-10-19T00:00:00Z');const ctx={db,dataDir:'',now:()=>new Date(now)};const app=new Application(ctx);return{db,ctx,app,time:(s:string)=>{now=new Date(s)}}}
test('CFG-06..08 move keeps overrides and current plans, none disables inherited timing',()=>{
 const f=fixture();try{
 const {app,ctx,db}=f;const a='question-default';const b=app.handle('deck.save',{name:'B',kind:'question'});
 saveDeckReviewPolicy(ctx,{deck_id:a,daily_limit:15,max_interval_days:30});saveDeckReviewPolicy(ctx,{deck_id:b,daily_limit:20,max_interval_days:120});
 for(const override of [null,7]){
 const id=app.handle('question.save',{module:a,stem:'S'+override,answer:'A'});saveReviewPolicy(ctx,{kind:'question',card_id:id,max_interval_days:override});
 const due=app.snapshot().questions.find(q=>q.id===id).due_at;const q=app.snapshot().questions.find(q=>q.id===id);
 app.handle('question.save',{...q,module:b});assert.equal(cardConfig(ctx,'question',id).maxIntervalDays,override??120);assert.equal(app.snapshot().questions.find(q=>q.id===id).due_at,due);
 }
 const q=app.snapshot().questions[0];saveAssessmentPolicy(ctx,{scope:'deck',id:b,target_seconds:80});
 saveAssessmentPolicy(ctx,{scope:'card',id:q.id,mode:'none'});assert.equal(assessmentTarget(ctx,q.id),null);
 saveAssessmentPolicy(ctx,{scope:'card',id:q.id,mode:'custom',target_seconds:90});assert.equal(assessmentTarget(ctx,q.id),90);
 saveAssessmentPolicy(ctx,{scope:'card',id:q.id,mode:'inherit'});assert.equal(assessmentTarget(ctx,q.id),80);
 }finally{f.db.close()}
});
test('CFG-10..13 strict server boundaries reject without data changes and scope/deletion checks hold',()=>{
 const f=fixture();try{
 const {app,ctx,db}=f;const id=app.handle('question.save',{module:'question-default',stem:'S',answer:'A'});
 for(const value of [0,-1,3651,1.5,NaN,Infinity,'7']){
 const before=db.prepare('SELECT total_changes() n').get()!.n;assert.throws(()=>saveReviewPolicy(ctx,{kind:'question',card_id:id,max_interval_days:value as any}));assert.equal(db.prepare('SELECT total_changes() n').get()!.n,before);
 }
 for(const n of [0,201,1.5,NaN])assert.throws(()=>saveDeckReviewPolicy(ctx,{deck_id:'question-default',daily_limit:n,max_interval_days:30}));
 for(const n of [0,86401,NaN])assert.throws(()=>saveAssessmentPolicy(ctx,{scope:'card',id,mode:'custom',target_seconds:n}));
 assert.throws(()=>saveAssessmentPolicy(ctx,{scope:'card',id:'nonexistent',mode:'custom',target_seconds:90}));
 app.handle('question.delete',{id});assert.throws(()=>saveReviewPolicy(ctx,{kind:'question',card_id:id,max_interval_days:7}));
 }finally{f.db.close()}
});
test('SCH-11..13 oldest severe overdue has guaranteed service and seeded selection is reproducible',()=>{
 const c=DeckConfig.parse({});const item=(id:string,days:number,risk:number):QueueCandidate=>({cardId:id,kind:'question',dueAt:new Date(Date.UTC(2026,9,19)-days*86400000).toISOString(),overdue:days/(days+1),severe:days>7,questionRisk:risk,knowledgeRisk:risk,coverage:1,knowledgeIds:['k'],fatigue:false,specialtyBoost:1,reasonCodes:[]});
 const pool=[item('old',120,.1),item('failed',1,1),item('failed2',2,1)];
 assert.equal(selectCandidates(pool,1,c,'fixed')[0].cardId,'old');
 assert.deepEqual(selectCandidates(pool,2,c,'fixed'),selectCandidates(pool,2,c,'fixed'));
 for(const p of ['weak','overdue','coverage','custom'] as const)assert.equal(selectCandidates(pool,1,{...c,priorityPreset:p},'fixed')[0].cardId,'old');
 assert.equal(DeckConfig.safeParse({...c,weights:{question:NaN,knowledge:0,overdue:0,coverage:1}}).success,false);
});
test('DUE-17 SCH-07 explicit snooze and pause prevent schedule writes; practice never changes FSRS',()=>{
 const f=fixture();try{
 const {app,db,ctx}=f;const id=app.handle('question.save',{module:'question-default',stem:'S',answer:'A'});
 const submit=(key:string,practice=false)=>app.handle('review.submit',{question_id:id,request_id:key,content_version:1,answer:'A',basis:'independent',understanding:2,thought:key,practice});
 submit('first');app.handle('plan.set',{id,action:'tomorrow'});
 const old=db.prepare('SELECT * FROM scheduling').all();assert.equal(submit('snoozed').effective,false);assert.deepEqual(db.prepare('SELECT * FROM scheduling').all(),old);
 app.handle('plan.set',{id,action:'pause'});assert.equal(submit('paused').effective,false);assert.equal(submit('practice',true).effective,false);assert.deepEqual(db.prepare('SELECT * FROM scheduling').all(),old);
 assert.equal(previewQueue(ctx,{deckId:'question-default'}).due.length,0);
 }finally{f.db.close()}
});
test('DUE-03,06,07,10,11,18 intervals never delay, own override wins, deleted/first study skip, expired or timezone-changed tokens reject',()=>{
 const f=fixture();try{
 const {app,db,ctx}=f;const deckId='question-default';const q=app.handle('question.save',{module:deckId,stem:'S',answer:'A'});
 const last='2026-10-01T00:00:00Z',due='2026-11-30T00:00:00Z';
 db.prepare('INSERT INTO scheduling VALUES (?,?,?,?)').run('question',q,JSON.stringify({last_review:last,due}),last);db.prepare('UPDATE plans SET due_at=? WHERE question_id=?').run(due,q);
 saveDeckReviewPolicy(ctx,{deck_id:deckId,daily_limit:15,max_interval_days:30});saveReviewPolicy(ctx,{kind:'question',card_id:q,max_interval_days:90});
 let p=previewExisting(ctx,{deckId});assert.equal(p.affectedCount,0);assert.equal(Date.parse(p.rows[0].afterDue!),Date.parse(due));
 saveReviewPolicy(ctx,{kind:'question',card_id:q,max_interval_days:7});p=previewExisting(ctx,{deckId});assert.equal(p.affectedCount,1);
 db.prepare("UPDATE settings SET value='America/New_York' WHERE key='studyTimezone'").run();assert.throws(()=>applyExisting(ctx,{previewToken:p.previewToken},'tz'),/变化/);
 p=previewExisting(ctx,{deckId});f.time('2026-10-19T00:06:00Z');assert.throws(()=>applyExisting(ctx,{previewToken:p.previewToken},'expire'),/过期/);
 app.handle('question.delete',{id:q});assert.equal(previewExisting(ctx,{deckId}).skipped.deleted,1);
 const first=app.handle('question.save',{module:deckId,stem:'first',answer:'A'});assert.equal(previewExisting(ctx,{deckId,cardId:first}).skipped.no_valid_last_review,1);
 }finally{f.db.close()}
});
