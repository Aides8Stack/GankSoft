import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase,transaction } from './fixture.ts';
import { Application } from '../electron/application.ts';
import { previewExisting } from '../electron/modules/review/due-preview.ts';
import { previewQueue } from '../electron/modules/review/review-queue.ts';
test('DUE-20 DAT-10 5000-card preview returns bounded pages with complete counts and reproducible queue',()=>{
 const db=openDatabase(':memory:');const ctx={db,dataDir:'',now:()=>new Date('2026-10-19T00:00:00Z')};const app=new Application(ctx);
 try{
 const first=app.handle('question.save',{module:'question-default',stem:'fixture',answer:'A'});
 const row=db.prepare('SELECT * FROM questions WHERE id=?').get(first)!;const keys=Object.keys(row);
 const insert=db.prepare(`INSERT INTO questions (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`);
 const plan=db.prepare("INSERT INTO plans VALUES (?, ?,0,NULL,0,'fixture','FSRS')");
 transaction(db,()=>{for(let i=0;i<4999;i++){const id='perf-'+String(i).padStart(5,'0');insert.run(...keys.map(k=>k==='id'?id:row[k]));plan.run(id,ctx.now().toISOString())}});
 const changes=db.prepare('SELECT total_changes() n').get()!.n;const before=performance.now();
 const p=previewExisting(ctx,{deckId:'question-default',offset:40,limit:20});const elapsed=performance.now()-before;
 assert.equal(p.total,5000);assert.equal(p.rows.length,20);assert.equal(p.skipped.no_valid_last_review,5000);
 const queueStart=performance.now();const q=previewQueue(ctx,{deckId:'question-default',seed:'perf'});const queueMs=performance.now()-queueStart;
 assert.equal(q.due.length,15);assert.equal(new Set(q.due.map(c=>c.cardId)).size,15);
 assert.equal(db.prepare('SELECT total_changes() n').get()!.n,changes);
 console.log(JSON.stringify({cards:5000,duePreviewMs:elapsed,queueMs,heapMiB:process.memoryUsage().heapUsed/1048576,pageRows:p.rows.length}));
 assert.ok(elapsed<10000);assert.ok(queueMs<10000);
 }finally{db.close()}
});
