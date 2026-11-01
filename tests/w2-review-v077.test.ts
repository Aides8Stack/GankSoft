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
