import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from './fixture.ts';
import { Application } from '../electron/application.ts';
import { reviewConfig,saveConfig,cardConfig } from '../electron/modules/review/config-service.ts';
import { saveDeckReviewPolicy,saveReviewPolicy } from '../electron/modules/review/policy.ts';
import { advance } from '../electron/modules/review/fsrs.ts';
import { DeckConfig } from '../shared/review-config.ts';
test('CFG-01..06 inheritance, source, movement and override remain unified',()=>{
 const db=openDatabase(':memory:');const ctx={db,dataDir:'',now:()=>new Date('2026-10-19T00:00:00Z')};const app=new Application(ctx);
 try{
 const q=app.handle('question.save',{module:'question-default',stem:'S',answer:'A'});
 assert.equal(cardConfig(ctx,'question',q).maxIntervalDays,365);
 saveDeckReviewPolicy(ctx,{deck_id:'question-default',daily_limit:15,max_interval_days:30});
 assert.equal(cardConfig(ctx,'question',q).source,'deck_default');
 saveReviewPolicy(ctx,{kind:'question',card_id:q,max_interval_days:90});
 saveDeckReviewPolicy(ctx,{deck_id:'question-default',daily_limit:15,max_interval_days:60});
 assert.equal(cardConfig(ctx,'question',q).maxIntervalDays,90);
 assert.equal(cardConfig(ctx,'question',q).source,'card_override');
 saveReviewPolicy(ctx,{kind:'question',card_id:q,max_interval_days:null});assert.equal(cardConfig(ctx,'question',q).maxIntervalDays,60);
 }finally{db.close()}
});
test('SCH-01..03 retention validates, CAS rejects stale, future-only preserves original FSRS',()=>{
 const db=openDatabase(':memory:');const ctx={db,dataDir:'',now:()=>new Date('2026-10-19T00:00:00Z')};const app=new Application(ctx);
 try{
 for(const kind of ['question','memory']){
 const deck=kind+'-default';const id=app.handle(kind+'.save',kind==='question'?{module:deck,stem:'S',answer:'A'}:{module:deck,title:'T',cue:'C',content:'D'});
 const original=advance(ctx,kind,id,3,365,crypto.randomUUID(),null);
 const before=db.prepare('SELECT * FROM scheduling WHERE card_id=?').get(id);
 const c=reviewConfig(ctx,deck);assert.equal(c.config.desiredRetention,.9);
 const saved=saveConfig(ctx,{deckId:deck,expectedRevision:0,config:{...c.config,desiredRetention:.95}});
 assert.equal(saved.revision,1);assert.deepEqual(db.prepare('SELECT * FROM scheduling WHERE card_id=?').get(id),before);
 assert.throws(()=>saveConfig(ctx,{deckId:deck,expectedRevision:0,config:c.config}),/变化/);
 advance(ctx,kind,id,3,365,crypto.randomUUID(),null);
 const log=db.prepare('SELECT log FROM schedule_events WHERE card_id=? ORDER BY rowid DESC LIMIT 1').get(id) as any;
 assert.equal(JSON.parse(log.log).desiredRetention,.95);assert.ok(original.dueAt);
 }
 for(const n of [.79,.98,NaN,Infinity,'0.90']) assert.equal(DeckConfig.safeParse({desiredRetention:n}).success,false);
 for(const n of [.8,.97])assert.equal(DeckConfig.safeParse({desiredRetention:n}).success,true);
 for(const weights of [{question:1,knowledge:1,overdue:0,coverage:0},{question:-1,knowledge:1,overdue:1,coverage:0}])assert.equal(DeckConfig.safeParse({weights}).success,false);
 }finally{db.close()}
});
