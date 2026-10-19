import { createEmptyCard } from "ts-fsrs";
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from './fixture.ts';
import { Application } from '../electron/application.ts';
import { previewExisting,applyExisting,undoExisting } from '../electron/modules/review/due-preview.ts';
import { dueEligibility } from '../electron/modules/review/due-eligibility.ts';
import { saveReviewPolicy } from '../electron/modules/review/policy.ts';
import { advance } from '../electron/modules/review/fsrs.ts';
function fixture(){const db=openDatabase(':memory:');let now=new Date('2026-10-19T00:00:00Z');const ctx={db,dataDir:'',now:()=>new Date(now)};const app=new Application(ctx);
 const q=app.handle('question.save',{module:'question-default',stem:'S',answer:'A'});
 const original={...createEmptyCard(new Date('2026-10-01T00:00:00Z')),state:2,reps:1,due:'2027-04-01T00:00:00Z',last_review:'2026-10-01T00:00:00Z',difficulty:5,stability:90};
 db.prepare('INSERT INTO scheduling VALUES (?,?,?,?)').run('question',q,JSON.stringify(original),now.toISOString());
 db.prepare('UPDATE plans SET due_at=? WHERE question_id=?').run(original.due,q);
 saveReviewPolicy(ctx,{kind:'question',card_id:q,max_interval_days:7});
 return {db,ctx,app,q,time:(s:string)=>{now=new Date(s)}};}
test('DUE-01..06,09,12,15 read-only preview, explicit advance, idempotent confirmation and conditional undo',()=>{
 const f=fixture();try{
 const before=f.db.prepare('SELECT * FROM scheduling').all();const changes=f.db.prepare('SELECT total_changes() n').get()!.n;
 const p=previewExisting(f.ctx,{deckId:'question-default'});
 assert.equal(f.db.prepare('SELECT total_changes() n').get()!.n,changes);
 assert.equal(p.affectedCount,1);assert.equal(p.immediateDueCount,1);
 assert.equal(dueEligibility(f.ctx,'question',f.q).eligible,false);
 const r=applyExisting(f.ctx,{previewToken:p.previewToken},'one');
 assert.deepEqual(applyExisting(f.ctx,{previewToken:p.previewToken},'one'),r);
 assert.equal(dueEligibility(f.ctx,'question',f.q).eligible,true);
 assert.equal(f.app.snapshot().questions[0].due_at,p.rows[0].afterDue);
 assert.deepEqual(f.db.prepare('SELECT * FROM scheduling').all(),before);
 assert.equal(f.db.prepare('SELECT count(*) n FROM attempts').get()!.n,0);
 undoExisting(f.ctx,{deckId:'question-default',operationId:r.operationId});
 assert.equal(dueEligibility(f.ctx,'question',f.q).eligible,false);
 }finally{f.db.close()}
});
test('DUE-07,08,10,11,16,18 stale policy, review, pause, snooze and clock rollback fail safely',()=>{
 const f=fixture();try{
 let p=previewExisting(f.ctx,{deckId:'question-default'});
 saveReviewPolicy(f.ctx,{kind:'question',card_id:f.q,max_interval_days:8});
 assert.throws(()=>applyExisting(f.ctx,{previewToken:p.previewToken},'stale'),/变化/);
 f.app.handle('plan.set',{id:f.q,action:'pause'});assert.equal(previewExisting(f.ctx,{deckId:'question-default'}).skipped.paused,1);
 f.app.handle('plan.set',{id:f.q,action:'resume'});f.app.handle('plan.set',{id:f.q,action:'tomorrow'});
 assert.equal(previewExisting(f.ctx,{deckId:'question-default'}).skipped.manual_snooze,1);
 p=previewExisting(f.ctx,{deckId:'question-default'});f.time('2026-10-18T23:00:00Z');
 assert.throws(()=>applyExisting(f.ctx,{previewToken:p.previewToken},'clock'),/过期/);
 }finally{f.db.close()}
});
test('DUE-03,14 transaction failure has no partial writes and longer cap never delays',()=>{
 const f=fixture();try{
 const p=previewExisting(f.ctx,{deckId:'question-default'});
 f.db.exec("CREATE TRIGGER fail_operation BEFORE INSERT ON review_config_operations BEGIN SELECT RAISE(ABORT,'disk simulation');END;");
 assert.throws(()=>applyExisting(f.ctx,{previewToken:p.previewToken},'fault'),/disk simulation/);
 assert.equal(f.db.prepare('SELECT count(*) n FROM review_due_overrides').get()!.n,0);
 f.db.exec('DROP TRIGGER fail_operation');
 const op=applyExisting(f.ctx,{previewToken:p.previewToken},'success');
 advance(f.ctx,'question',f.q,3,7,crypto.randomUUID(),null);
 assert.throws(()=>undoExisting(f.ctx,{deckId:'question-default',operationId:op.operationId}),/没有可撤销/);
 }finally{f.db.close()}
});
