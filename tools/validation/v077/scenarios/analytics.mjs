import assert from 'node:assert/strict';
import {executeCase,restart} from '../helpers.mjs';
import {observe,evidence,step,directFixture,directTitle} from './core-support.mjs';
import {reviewDirect,analytics,assertAnalytics} from './module-support.mjs';
const id=process.argv[2],out=process.argv[3];
if(!['AN-01','AN-06','AN-07'].includes(id)||!out)throw Error('UNSUPPORTED_ANALYTICS_CASE');
await executeCase(id,out,async ctx=>{
  await observe(ctx);let event;
  if(id==='AN-01')event=await reviewDirect(ctx,directTitle,ctx.fixture.direct);
  const deck=id==='AN-07'?ctx.fixture.secondDeck:ctx.fixture.deck;
  const data=await analytics(ctx,deck);await assertAnalytics(ctx,data);
  if(id==='AN-01'){
    const cards=(await ctx.session.api.call('card.listSummary',{deckId:deck.id,limit:100})).items;
    const events=(await Promise.all(cards.map(card=>ctx.session.api.call('learning.history.list',{deckId:deck.id,cardId:card.cardId})))).flatMap(h=>h.items);
    assert.equal(data.eventCount,events.length);assert.ok(data.items.some(x=>x.eventId===event.eventId));
    assert.equal(data.averageScoreTenths,events.reduce((s,x)=>s+x.scoreTenths,0)/events.length);
  }
  if(id==='AN-06'){
    const p=ctx.session.page,rows=await p.locator('.recent-link').allTextContents();assert.ok(rows.length>0);
    await p.getByRole('button',{name:'收起记录',exact:true}).click();assert.equal(await p.locator('.recent-link').count(),0);
    assert.equal(await p.getByRole('button',{name:'展开记录',exact:true}).getAttribute('aria-expanded'),'false');
    await p.getByRole('button',{name:'展开记录',exact:true}).click();assert.deepEqual(await p.locator('.recent-link').allTextContents(),rows);
    await assertAnalytics(ctx,data);
    step(ctx,'GUI collapse/expand keeps identical history rows and counts');
  }
  if(id==='AN-07'){
    assert.equal(data.eventCount,0);assert.equal(data.averageScoreTenths,null);
    await ctx.session.page.getByText('此范围没有复盘记录。',{exact:true}).waitFor();
    step(ctx,'Empty deck shows zero reviews, no invented score/rate and explicit empty history');
  }
  step(ctx,'Analytics GUI counts/scores/history match read-only real review events');
  const reboot=await restart(ctx);await observe(ctx);const after=await analytics(ctx,deck);await assertAnalytics(ctx,after);assert.deepEqual(after,data);
  step(ctx,'New Electron PID restores exact analytics and GUI state from persisted events');
  return {...await evidence(ctx),reboot};
},{fixtureSetup:id==='AN-01'?directFixture:undefined});
