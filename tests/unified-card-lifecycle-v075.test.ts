import test from 'node:test';
import assert from 'node:assert/strict';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {validateUnifiedData} from '../electron/infrastructure/migrations/unified-integrity.ts';
const code=(value:string)=>(e:unknown)=>(e as {code?:string}).code===value;
const targetRevision=(f:Awaited<ReturnType<typeof unifiedWorkspaceFixture>>,id:string)=>Number(f.ctx.db.prepare('SELECT version FROM decks WHERE id=?').get(id)!.version);

test('T34 mixed native cards move without deck.kind restrictions, retaining identity, draft, history, FSRS and override',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const cards=await Promise.all([f.card('question'),f.card('qa'),f.card('direct')]),c=cards[2],deckId=c.deckId,targetDeckId=f.source.ids.mDeck;
  await f.client.call('knowledge.cardLinks.set',{deckId,cardId:c.cardId,nodeIds:[f.source.ids.child1],expectedRevision:0});
  await f.client.call('policy.card.set',{kind:'card',cardId:c.cardId,expectedRevision:0,maxIntervalDays:99});
  let s=await f.client.call('learning.session.open',{deckId,cardIds:[c.cardId]});
  s=await f.client.call('learning.session.change',{deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:90,reflection:'保留原始反思'}});
  const event=await f.client.call('learning.review.submit',{deckId,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:90,faults:[],gaps:'',reflection:'保留原始反思',practice:false});
  s=await f.client.call('learning.session.get',{deckId,sessionId:s.sessionId});
  s=await f.client.call('learning.session.change',{deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'next'});assert.equal(s.completed,true);
  const archived=String(f.ctx.db.prepare("SELECT payload FROM study_sessions WHERE json_extract(payload,'$.sessionId')=?").get(s.sessionId)!.payload);
  const preview=await f.client.call('draft.previewSwitch',{deckId,cardId:c.cardId,targetType:'direct'});
  await f.client.call('draft.save',{deckId,cardId:c.cardId,expectedPublishedRevision:1,expectedDraftRevision:null,fields:{...preview.fields,title:'移动后保留的草稿'}});
  const state=f.ctx.db.prepare('SELECT data FROM scheduling WHERE card_id=?').get(c.cardId)!.data;
  const versions=f.ctx.db.prepare('SELECT id,document FROM learning_content_versions WHERE card_id=? ORDER BY id').all(c.cardId);
  const req=f.client.prepare('card.batch.apply',{deckId,action:'move',cards:cards.map(c=>({cardId:c.cardId,expectedRevision:1})),targetDeckId,expectedTargetRevision:targetRevision(f,targetDeckId)});
  assert.deepEqual(await f.client.send(req),{count:3,action:'move'});assert.deepEqual(await f.client.send(req),{count:3,action:'move'});
  for(const card of cards)assert.equal((await f.client.call('card.getPublishedContent',{deckId:targetDeckId,cardId:card.cardId})).versionId,card.publication.versionId);
  assert.deepEqual(f.ctx.db.prepare('SELECT id,document FROM learning_content_versions WHERE card_id=? ORDER BY id').all(c.cardId),versions);
  assert.equal(f.ctx.db.prepare('SELECT data FROM scheduling WHERE card_id=?').get(c.cardId)!.data,state);
  assert.equal((await f.client.call('policy.card.get',{kind:'card',cardId:c.cardId})).maxIntervalDays,99);
  assert.deepEqual((await f.client.call('knowledge.cardLinks.get',{deckId:targetDeckId,cardId:c.cardId})).nodeIds,[]);
  const d=await f.client.call('draft.get',{deckId:targetDeckId,cardId:c.cardId});assert.equal(d!.title,'移动后保留的草稿');assert.equal(d!.basePublishedRevision,2);
  assert.deepEqual(await f.client.call('learning.history.get',{deckId:targetDeckId,cardId:c.cardId,eventId:event.eventId}),event);
  assert.equal(JSON.stringify(JSON.parse(String(f.ctx.db.prepare('SELECT value FROM settings WHERE key=?').get('unified-archived-session:'+s.sessionId)!.value)).document),archived);
  await assert.rejects(()=>f.client.call('card.getPublishedContent',{deckId,cardId:c.cardId}),code('DECK_CONFLICT'));
  f.reopen();validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});

test('T34 native batch soft-delete and paged restore retain all versions, current links and draft',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const a=await f.card('qa'),b=await f.card('direct'),deckId=a.deckId;
  await f.client.call('knowledge.cardLinks.set',{deckId,cardId:a.cardId,nodeIds:[f.source.ids.child1],expectedRevision:0});
  const p=await f.client.call('draft.previewSwitch',{deckId,cardId:a.cardId,targetType:'qa'});
  await f.client.call('draft.save',{deckId,cardId:a.cardId,expectedPublishedRevision:1,expectedDraftRevision:null,fields:{...p.fields,title:'删除前原稿'}});
  await f.client.call('card.batch.apply',{deckId,action:'delete',cards:[a,b].map(c=>({cardId:c.cardId,expectedRevision:1}))});
  assert.ok(!(await f.client.call('card.listSummary',{deckId})).items.some(c=>c.cardId===a.cardId||c.cardId===b.cardId));
  const first=await f.client.call('card.recycle.list',{deckId,limit:1});assert.equal(first.items.length,1);assert.ok(first.nextCursor);assert.doesNotMatch(JSON.stringify(first),/payload|markdown|mediaRefs/);
  const second=await f.client.call('card.recycle.list',{deckId,after:first.nextCursor,limit:1});assert.equal(second.items.length,1);assert.equal(second.nextCursor,null);
  await assert.rejects(()=>f.client.call('card.recycle.restore',{deckId,cards:[{cardId:a.cardId,expectedRevision:1}]}),code('REVISION_CONFLICT'));
  await f.client.call('card.recycle.restore',{deckId,cards:[...first.items,...second.items].map(c=>({cardId:c.cardId,expectedRevision:c.revision}))});
  assert.deepEqual((await f.client.call('knowledge.cardLinks.get',{deckId,cardId:a.cardId})).nodeIds,[f.source.ids.child1]);
  assert.equal((await f.client.call('draft.get',{deckId,cardId:a.cardId}))!.title,'删除前原稿');
  f.reopen();validateUnifiedData(f.ctx.db);assert.equal((await f.client.call('card.getPublishedContent',{deckId,cardId:b.cardId})).versionId,b.publication.versionId);
 }finally{f.close();}
});

test('T34 stale, cross-deck, duplicate, same-target and receipt failures roll back the entire selection',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const a=await f.card('direct'),b=await f.card('qa'),deckId=a.deckId,targetDeckId=f.source.ids.mDeck;
  await assert.rejects(()=>f.client.call('card.batch.apply',{deckId,action:'delete',cards:[{cardId:a.cardId,expectedRevision:1},{cardId:b.cardId,expectedRevision:2}]}),code('REVISION_CONFLICT'));
  const req=f.client.prepare('card.batch.apply',{deckId,action:'move',cards:[a,b].map(c=>({cardId:c.cardId,expectedRevision:1})),targetDeckId,expectedTargetRevision:targetRevision(f,targetDeckId)});
  f.ctx.db.exec("CREATE TEMP TRIGGER reject_batch_receipt BEFORE INSERT ON protocol_receipts WHEN NEW.method='card.batch.apply' BEGIN SELECT RAISE(ABORT,'synthetic receipt failure'); END");
  await assert.rejects(()=>f.client.send(req));
  assert.equal((await f.client.call('card.listSummary',{deckId})).items.filter(c=>c.cardId===a.cardId||c.cardId===b.cardId).length,2);
  f.ctx.db.exec('DROP TRIGGER reject_batch_receipt');assert.equal((await f.client.send(req)).count,2);
  await assert.rejects(()=>f.client.call('card.batch.apply',{deckId,action:'delete',cards:[{cardId:a.cardId,expectedRevision:2}]}),code('CARD_SCOPE_CONFLICT'));
  await assert.rejects(()=>f.client.call('card.batch.apply',{deckId:targetDeckId,action:'move',cards:[{cardId:a.cardId,expectedRevision:2}],targetDeckId,expectedTargetRevision:targetRevision(f,targetDeckId)}),code('DECK_CONFLICT'));
 }finally{f.close();}
});

test('T34 lifecycle protects unfinished review pages and preserves their original draft',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('direct'),s=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]});
  await assert.rejects(()=>f.client.call('card.batch.apply',{deckId:c.deckId,action:'delete',cards:[{cardId:c.cardId,expectedRevision:1}]}),code('CARD_SESSION_ACTIVE'));
  assert.deepEqual(await f.client.call('learning.session.get',{deckId:c.deckId,sessionId:s.sessionId}),s);
 }finally{f.close();}
});

test('T34 legacy-backed cards use the same lifecycle and retain immutable old evidence after cross-kind move',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const {qDeck:deckId,mDeck:targetDeckId,question:cardId}=f.source.ids;
  const old=f.ctx.db.prepare('SELECT document FROM learning_review_events WHERE card_id=? ORDER BY id').all(cardId);
  const card=(await f.client.call('card.listSummary',{deckId})).items.find(c=>c.cardId===cardId)!;
  await f.client.call('card.batch.apply',{deckId,action:'move',targetDeckId,expectedTargetRevision:targetRevision(f,targetDeckId),cards:[{cardId,expectedRevision:card.revision}]});
  assert.equal(f.ctx.db.prepare('SELECT module FROM questions WHERE id=?').get(cardId)!.module,targetDeckId);
  assert.deepEqual(f.ctx.db.prepare('SELECT document FROM learning_review_events WHERE card_id=? ORDER BY id').all(cardId),old);
  assert.deepEqual((await f.client.call('knowledge.cardLinks.get',{deckId:targetDeckId,cardId})).nodeIds,[]);
  f.reopen();validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
