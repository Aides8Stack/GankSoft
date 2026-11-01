import test from 'node:test';
import assert from 'node:assert/strict';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {recoverReviewTimers} from '../electron/modules/cards-unified/review-session.ts';

test('W2 timer cutoff survives queued autosave, multiple segments, navigation and owner restart',async()=>{
 const f=await unifiedWorkspaceFixture();try{
 const card=await f.card('direct');let s=await f.client.call('learning.session.open',{deckId:card.deckId,cardIds:[card.cardId]});
 const scope={deckId:s.deckId,sessionId:s.sessionId};
 f.advance(2300);const cutoff=f.ctx.now().toISOString();
 f.advance(7000);s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'save',draft:{...s.draft,reflection:'retained'}});
 s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'pause',pausedAt:cutoff});
 assert.equal(s.elapsedSeconds,2);f.advance(100000);assert.equal((await f.client.call('learning.session.get',scope)).elapsedSeconds,2);
 s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'resume'});f.advance(1900);
 s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'pause'});assert.equal(s.elapsedSeconds,4);
 f.reopen();f.advance(20000);s=await f.client.call('learning.session.get',scope);assert.equal(s.paused,true);assert.equal(s.elapsedSeconds,4);assert.equal(s.draft.reflection,'retained');
 s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'resume'});f.advance(1500);
 s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'save'});f.advance(3600000);
 recoverReviewTimers(f.ctx);s=await f.client.call('learning.session.get',scope);assert.equal(s.paused,true);assert.equal(s.elapsedSeconds,5);
 }finally{f.close();}
});

test('W2 final commit archives atomically, idempotent rollback/retry, six-card snapshots remain historical',async()=>{
 const f=await unifiedWorkspaceFixture();try{
 const cards=[];for(const mode of ['direct','qa','question','direct','qa','question'] as const)cards.push(await f.card(mode));
 const deckId=cards[0].deckId;let s=await f.client.call('learning.session.open',{deckId,cardIds:cards.map(c=>c.cardId)});
 const scope={deckId,sessionId:s.sessionId},scores=[58,65,85,95,80,99],events=[];
 for(let i=0;i<cards.length;i++){
  f.advance(1300+i*1000);
  if(s.stage==='answer')s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'reveal',draft:{...s.draft,thought:'independent',selectedOptionId:cards[i].payload.encoding==='question-v1'?(i===5?'stable:a':'stable:b'):null}});
  s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:scores[i]}});
  const input={...scope,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:scores[i],faults:[],gaps:'',reflection:'',practice:false as const};
  if(i===5){const req=f.client.prepare('learning.review.submit',input);f.ctx.db.exec("CREATE TEMP TRIGGER w2_fail BEFORE INSERT ON protocol_receipts WHEN NEW.method='learning.review.submit' BEGIN SELECT RAISE(ABORT,'W2 final receipt failure'); END");
   await assert.rejects(()=>f.client.send(req));assert.equal((await f.client.call('learning.session.settlement',scope)).completed,false);assert.equal(f.ctx.db.prepare('SELECT count(*) n FROM learning_review_events WHERE id=?').get(input.eventId)!.n,0);
   f.ctx.db.exec('DROP TRIGGER w2_fail');const [a,b]=await Promise.all([f.client.send(req),f.client.send(req)]);assert.deepEqual(a,b);events.push(a);
  }else events.push(await f.client.call('learning.review.submit',input));
  s=await f.client.call('learning.session.get',scope);assert.equal(s.completed,i===5);
  if(i<5)s=await f.client.call('learning.session.change',{...scope,expectedRevision:s.revision,action:'next'});
 }
 const view=await f.client.call('learning.session.settlement',scope);assert.equal(view.completedCount,6);assert.deepEqual(view.rows.map(r=>r.cardId),cards.map(c=>c.cardId));assert.deepEqual(view.rows.map(r=>r.event!.scoreTenths),scores);
 assert.deepEqual(view.ratings,{again:2,hard:1,good:2,easy:1});assert.equal(view.correctCount,1);assert.equal(view.objectiveCount,2);assert.deepEqual(view.rows.map(r=>r.event!.native!.elapsedSeconds),[1,2,3,4,5,6]);
 const firstDue=view.rows[0].dueAt;assert.equal(firstDue,JSON.parse(String(f.ctx.db.prepare('SELECT after_state FROM schedule_events WHERE id=?').get(events[0].eventId)!.after_state)).due);
 // Reservation released immediately, allowing a later legitimate review of the same card.
 let next=await f.client.call('learning.session.open',{deckId,cardIds:[cards[0].cardId]});f.advance(3600000);
 next=await f.client.call('learning.session.change',{deckId,sessionId:next.sessionId,expectedRevision:next.revision,action:'save',draft:{...next.draft,scoreTenths:100}});
 await f.client.call('learning.review.submit',{deckId,sessionId:next.sessionId,expectedRevision:next.revision,eventId:next.entry.eventId,scoreTenths:100,faults:[],gaps:'',reflection:'',practice:false});
 assert.notEqual(firstDue,JSON.parse(String(f.ctx.db.prepare('SELECT data FROM scheduling WHERE card_id=?').get(cards[0].cardId)!.data)).due);
 const before=f.ctx.db.prepare('SELECT * FROM schedule_events ORDER BY id').all();
 f.reopen();assert.deepEqual(await f.client.call('learning.session.settlement',scope),view);assert.deepEqual(await f.client.call('learning.session.settlement',scope),view);assert.deepEqual(f.ctx.db.prepare('SELECT * FROM schedule_events ORDER BY id').all(),before);
 const history=await f.client.call('workspace.sessions',{deckId,status:'completed'});assert.equal(history.totalCount,2);assert.equal(history.items.length,2);assert.equal(history.items.find(x=>x.sessionId===s.sessionId)!.completedCount,6);
 const incomplete=await f.client.call('workspace.sessions',{deckId,status:'incomplete'});assert.equal(incomplete.items.length,0);
 assert.equal(f.ctx.db.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');assert.equal(f.ctx.db.prepare('PRAGMA foreign_key_check').all().length,0);
 }finally{f.close();}
});
