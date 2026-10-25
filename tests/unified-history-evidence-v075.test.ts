import test from 'node:test';
import assert from 'node:assert/strict';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {historyEvidence} from '../shared/cards/history-evidence.ts';

test('T33 event evidence uses frozen content and retains native faults/gaps after the card changes',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('question'),scope={deckId:c.deckId,cardId:c.cardId};let s=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]});
  s=await f.client.call('learning.session.change',{deckId:c.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'reveal',draft:{...s.draft,selectedOptionId:'stable:a',thought:'当时独立思路'}});
  s=await f.client.call('learning.session.change',{deckId:c.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:55,faults:['误读条件','计算失误'],gaps:'原始知识漏洞',reflection:'原始反思'}});
  const e=await f.client.call('learning.review.submit',{deckId:c.deckId,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:55,faults:['误读条件','计算失误'],gaps:'原始知识漏洞',reflection:'原始反思',practice:false});
  const v=await f.client.call('content.getVersion',{...scope,versionId:e.contentVersionId});const before=JSON.stringify(e);
  assert.deepEqual(historyEvidence(e,v),{thought:'当时独立思路',reflection:'原始反思',faults:['误读条件','计算失误'],gaps:'原始知识漏洞',choice:'甲'});
  assert.equal(historyEvidence(e,{...v,versionId:'different:version'}).choice,'未记录');assert.equal(JSON.stringify(e),before);
 }finally{f.close();}
});

test('T33 legacy original fault detail and per-knowledge evidence survive; absent gaps and native scores are not invented',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const e=await f.client.call('learning.history.get',{deckId:f.source.ids.qDeck,cardId:f.source.ids.question,eventId:f.source.ids.attempt2});
  const result=historyEvidence(e);assert.equal(result.thought,'合成原始思路');assert.equal(result.reflection,'合成原始反思');assert.ok(result.faults.includes('原始错因'));assert.ok(result.faults.some(s=>s.includes('知识缺失')&&s.includes('不可改写')&&s.includes('当时名称')));assert.equal(result.gaps,'');assert.equal(e.scoreTenths,null);
 }finally{f.close();}
});

test('T33 missing evidence remains explicit and malformed optional legacy JSON cannot hide native evidence',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const e=await f.client.call('learning.history.get',{deckId:f.source.ids.qDeck,cardId:f.source.ids.question,eventId:f.source.ids.attempt2});
  assert.deepEqual(historyEvidence({...e,legacyRaw:'not-json'}),{thought:'',reflection:'',faults:[],gaps:'',choice:'不适用'});
  assert.deepEqual(historyEvidence(null),{thought:'',reflection:'',faults:[],gaps:'',choice:'不适用'});
 }finally{f.close();}
});
