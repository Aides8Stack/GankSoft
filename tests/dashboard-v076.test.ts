import test from 'node:test';
import assert from 'node:assert/strict';
import {freshFixture,publishFresh} from './fixtures/fresh-production.ts';
test('v076 overview aggregates real606 across folders, isolates decks and returns bounded scalar metadata',async()=>{
 const f=await freshFixture();try{
  const initial=await f.client.call('workspace.dashboard',{});assert.equal(initial.cardCount,0);assert.equal(initial.todayCount,0);assert.equal(initial.averageScoreTenths,null);
  const folder=await f.client.call('workspace.catalog.save',{kind:'folder',parentId:null,name:'合成目录'});
  const deck=await f.client.call('workspace.catalog.save',{kind:'deck',parentId:folder.id,name:'合成子集'});
  const other=await f.client.call('workspace.catalog.save',{kind:'deck',parentId:null,name:'合成其他'});
  const card=await publishFresh(f.client,'question',deck.id);await publishFresh(f.client,'direct',other.id);
  for(let i=0;i<7;i++)await publishFresh(f.client,'qa',deck.id);
  const before=JSON.stringify(f.ctx.db.prepare('SELECT * FROM scheduling').all());
  const trace:string[]=[],prepare=f.ctx.db.prepare.bind(f.ctx.db);f.ctx.db.prepare=(sql:string)=>{trace.push(sql);return prepare(sql);};
  const global=await f.client.call('workspace.dashboard',{}),scoped=await f.client.call('workspace.dashboard',{deckId:deck.id});
  const list=await f.client.call('card.listSummary',{deckId:deck.id});assert.ok(list.items.every(r=>r.reviewCount===0&&r.lastScoreTenths===null&&r.knowledgeNames.length===0));assert.equal(global.cardCount,9);assert.equal(global.dueCount,9);assert.equal(scoped.cardCount,8);assert.equal(scoped.dueCount,8);assert.equal(scoped.recentCards.length,6);assert.ok(scoped.recentCards.every(r=>r.deckId===deck.id));
  assert.doesNotMatch(JSON.stringify(scoped),/markdown|payload|mediaRefs|thought|legacyRaw/);assert.ok(trace.every(sql=>!/^SELECT (?:\*|document) FROM (?:learning_content_versions|learning_review_events|assets)/i.test(sql)));
  assert.equal(JSON.stringify(f.ctx.db.prepare('SELECT * FROM scheduling').all()),before);
  const session=await f.client.call('learning.session.open',{deckId:deck.id,cardIds:[card.cardId]});
  assert.equal((await f.client.call('workspace.dashboard',{})).sessions[0].sessionId,session.sessionId);
  assert.equal((await f.client.call('workspace.dashboard',{deckId:other.id})).sessions.length,0);
  await f.reopen();assert.equal((await f.client.call('workspace.dashboard',{deckId:deck.id})).cardCount,8);
 }finally{f.close();}
});
test('v076 overview uses study timezone, distinguishes missing scores, and excludes deleted decks',async()=>{
 const f=await freshFixture();try{
  const deck=await f.client.call('workspace.catalog.save',{kind:'deck',parentId:null,name:'复盘统计'});
  f.ctx.now=()=>new Date('2026-10-26T16:30:00.000Z');
  f.ctx.db.prepare("UPDATE settings SET value='Asia/Shanghai' WHERE key='studyTimezone'").run();
  const card=await publishFresh(f.client,'direct',deck.id);
  let s=await f.client.call('learning.session.open',{deckId:deck.id,cardIds:[card.cardId]});
  s=await f.client.call('learning.session.change',{deckId:deck.id,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:90}});
  await f.client.call('learning.review.submit',{deckId:deck.id,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:90,faults:[],gaps:'',reflection:'',practice:false});
  const d=await f.client.call('workspace.dashboard',{deckId:deck.id});assert.equal(d.today,'2026-10-27');assert.equal(d.timeZone,'Asia/Shanghai');assert.equal(d.eventCount,1);assert.equal(d.todayCount,1);assert.equal(d.averageScoreTenths,90);assert.equal(d.objectiveCount,0);assert.equal(d.correctCount,0);assert.equal(d.recent[0].cardId,card.cardId);const list=await f.client.call('card.listSummary',{deckId:deck.id});assert.equal(list.items[0].reviewCount,1);assert.equal(list.items[0].lastScoreTenths,90);
  s=await f.client.call('learning.session.get',{deckId:deck.id,sessionId:s.sessionId});
  await f.client.call('learning.session.change',{deckId:deck.id,sessionId:s.sessionId,expectedRevision:s.revision,action:'next'});
  await f.client.call('workspace.decks.batch',{action:'delete',decks:[{id:deck.id,expectedRevision:deck.revision}]});
  assert.equal((await f.client.call('workspace.dashboard',{})).cardCount,0);assert.deepEqual((await f.client.call('workspace.dashboard',{})).recent,[]);
  await assert.rejects(()=>f.client.call('workspace.dashboard',{deckId:deck.id}));
 }finally{f.close();}
});
