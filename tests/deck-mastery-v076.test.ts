import test from 'node:test';
import assert from 'node:assert/strict';
import {freshFixture,publishFresh} from './fixtures/fresh-production.ts';
test('v076 deck mastery reuses current-cycle evidence, excludes practice, isolates other decks and survives reopen',async()=>{
 const f=await freshFixture();try{
  const d=await f.client.call('workspace.catalog.save',{kind:'deck',parentId:null,name:'掌握度合成'}),c=await publishFresh(f.client,'direct',d.id);
  assert.equal((await f.client.call('learning.mastery.deck',{deckId:d.id})).status,'pending');
  for(const practice of [true,false]){
   let s=await f.client.call('learning.session.open',{deckId:d.id,cardIds:[c.cardId],practice});s=await f.client.call('learning.session.change',{deckId:d.id,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:90}});
   await f.client.call('learning.review.submit',{deckId:d.id,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:90,faults:[],gaps:'',reflection:'',practice});
   s=await f.client.call('learning.session.get',{deckId:d.id,sessionId:s.sessionId});await f.client.call('learning.session.change',{deckId:d.id,sessionId:s.sessionId,expectedRevision:s.revision,action:'next'});
   assert.equal((await f.client.call('learning.mastery.deck',{deckId:d.id})).observations,practice?0:1);
  }
  const m=await f.client.call('learning.mastery.deck',{deckId:d.id}),single=await f.client.call('learning.mastery.card',c);assert.equal(m.observations,single.observations);assert.equal(m.risk,single.risk);assert.equal(m.cardCount,1);assert.doesNotMatch(JSON.stringify(m),/thought|payload|media|cardIds/);
  const other=await f.client.call('workspace.catalog.save',{kind:'deck',parentId:null,name:'其他卡片集'});await publishFresh(f.client,'question',other.id);assert.deepEqual(await f.client.call('learning.mastery.deck',{deckId:d.id}),m);
  await f.reopen();assert.deepEqual(await f.client.call('learning.mastery.deck',{deckId:d.id}),m);
  await assert.rejects(()=>f.client.call('learning.mastery.deck',{deckId:'missing'}));
 }finally{f.close();}
});
