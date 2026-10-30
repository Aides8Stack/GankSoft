// M3-05: five GUI analytics time/chart/knowledge/history continuity tests.
import assert from 'node:assert/strict';
import {executeCase,enterCards,exitEditorToList,restart} from '../helpers.mjs';
import {observe,evidence,step,editor} from './core-support.mjs';
import {integrity} from './system-support.mjs';
import {analytics,reviewCard,nativeTitle,twoLinkedCards,history,readFullHistory,cardLinks} from './m3-support.mjs';
const id=process.argv[2],out=process.argv[3];
const ids=['AN-02','AN-03','AN-04','AN-05','AN-08'];
if(!ids.includes(id)||!out)throw Error('UNKNOWN_M3_ANALYTICS_CASE');
const initialFixture=id==='AN-05'?twoLinkedCards:undefined;
const readAnalytics=async(ctx,date={range:'all'})=>
  ctx.session.api.call('workspace.analytics',{deckId:ctx.fixture.deck.id,date,limit:100});
const navDetail=async ctx=>{
  await enterCards(ctx);
  const p=ctx.session.page;
  await p.getByRole('button',{name:'详情 '+nativeTitle,exact:true}).click();
  const article=p.getByRole('article',{name:'卡片详情'});await article.waitFor();return article;
};
await executeCase(id,out,async ctx=>{
  await observe(ctx);let p=ctx.session.page,reboot;
  const card=ctx.fixture.card,initial=await history(ctx,card),full=await readAnalytics(ctx);
  if(id==='AN-02'){
    const view=await analytics(ctx);
    const region=p.getByRole('region',{name:'学习分析'});
    assert.equal(view.result.eventCount,full.eventCount);
    for(const range of ['7','30','all']){
      await p.getByRole('combobox',{name:'分析时间范围'}).selectOption(range);
      await region.locator('[aria-busy=false]').waitFor();
      const r=await readAnalytics(ctx,{range});
      const text=await region.locator('.metric').filter({hasText:'范围内复盘'}).locator('.metric-number').innerText();
      assert.equal(parseInt(text,10),r.eventCount,'Actual GUI range count differs from read-only event table');
    }
    await p.locator('.r4-date-custom summary').click();
    const custom=p.getByRole('group',{name:'统计日期范围'});
    await custom.getByRole('textbox',{name:'开始日期'}).fill('1990-01-01');
    await custom.getByRole('textbox',{name:'结束日期'}).fill('1990-01-03');
    await p.getByRole('button',{name:'更新分析'}).click();
    const zero=await readAnalytics(ctx,{range:'custom',start:'1990-01-01',end:'1990-01-03'});
    assert.equal(zero.eventCount,0);
    assert.equal(parseInt(await region.locator('.metric').filter({hasText:'范围内复盘'}).locator('.metric-number').innerText()),0);
    const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
    await custom.getByRole('textbox',{name:'开始日期'}).fill(today);
    await custom.getByRole('textbox',{name:'结束日期'}).fill(today);
    await p.getByRole('button',{name:'更新分析'}).click();
    const daily=await readAnalytics(ctx,{range:'custom',start:today,end:today});
    assert.equal(parseInt(await region.locator('.metric').filter({hasText:'范围内复盘'}).locator('.metric-number').innerText()),daily.eventCount);
    step(ctx,'GUI 7/30/all/custom date filters, old and boundary-day event counts match read-only API in study timezone');
  }else if(id==='AN-03'){
    const view=await analytics(ctx);
    assert.ok(view.result.items.length>0);
    const chart=p.getByRole('group',{name:/已加载记录 · 自评分，横轴为复盘次序/});
    await chart.waitFor();
    const points=chart.getByRole('button');
    assert.equal(await points.count(),view.result.items.filter(x=>x.scoreTenths!==null).length);
    const wanted=view.result.items.at(-1);
    await points.first().click();
    const panel=p.getByRole('article',{name:'卡片详情'});await panel.waitFor();
    const event=await ctx.session.api.call('learning.history.get',{deckId:ctx.fixture.deck.id,cardId:wanted.cardId,eventId:wanted.eventId});
    assert.equal(event.eventId,wanted.eventId);
    const proof=panel.getByRole('region',{name:'当次复盘证据'});await proof.waitFor();
    assert.ok((await proof.innerText()).includes('自评'));
    assert.ok((await proof.innerText()).includes((event.scoreTenths/10).toFixed(1)));
    step(ctx,'GUI analytics trend clicked saved real point; card-detail opens corresponding event evidence and score');
  }else if(id==='AN-04'){
    const detail=await navDetail(ctx);
    await detail.locator('.analytics-chart').first().waitFor();
    const scoreChart=detail.getByRole('group',{name:/已加载记录 · 自评分，横轴/});
    await scoreChart.waitFor();
    assert.ok(await scoreChart.getByRole('button').count()>0);
    await detail.getByText('查看用时趋势',{exact:true}).click();
    const timeChart=detail.getByRole('group',{name:/已加载记录 · 用时，横轴/});
    await timeChart.waitFor();
    const list=await readFullHistory(ctx,card);
    assert.equal(await scoreChart.getByRole('button').count(),list.filter(x=>x.scoreTenths!==null).length);
    assert.equal(await timeChart.getByRole('button').count(),list.filter(x=>x.elapsedSeconds!==null).length);
    await scoreChart.getByRole('button').first().click();
    const selected=detail.getByRole('region',{name:'当次复盘证据'});
    await selected.waitFor();
    assert.ok((await selected.innerText()).includes('自评'));
    if(await timeChart.getByRole('button').count())await timeChart.getByRole('button').first().click();
    assert.ok((await selected.innerText()).includes('用时')||await detail.locator('.detail-history-list button').count()>0);
    step(ctx,'One-card GUI score/elapsed chart points match actual ReviewEvent scores and timing');
  }else if(id==='AN-05'){
    const link=await cardLinks(ctx,ctx.fixture.qa);
    assert.ok(link.nodeIds.includes(ctx.fixture.ids[0]));
    let {result}=await analytics(ctx);
    const mastery=p.getByRole('region',{name:'知识点综合掌握度'});
    await p.getByRole('button',{name:'更多知识点',exact:true}).click();
    await mastery.getByText('生命周期甲',exact:true).waitFor();
    const before=await ctx.session.api.call('learning.mastery.knowledge',{
      deckId:ctx.fixture.deck.id,nodeId:ctx.fixture.ids[0],scope:'aggregate'});
    assert.equal(new Set(before.cardIds).size,before.cardIds.length,'Mastery cannot count same card twice');
    assert.ok(before.cardIds.includes(card.cardId)&&before.cardIds.includes(ctx.fixture.qa.cardId));
    await enterCards(ctx);
    await p.getByRole('button',{name:'编辑 T2-A published QA',exact:true}).click();
    await p.getByRole('button',{name:'选择知识点',exact:true}).click();
    const dialog=p.getByRole('dialog',{name:'选择知识点关联'});
    await dialog.getByRole('checkbox',{name:'生命周期甲',exact:true}).uncheck();
    await dialog.getByRole('button',{name:'确认关联',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    const after=await ctx.session.api.call('learning.mastery.knowledge',{
      deckId:ctx.fixture.deck.id,nodeId:ctx.fixture.ids[0],scope:'aggregate'});
    assert.ok(!after.cardIds.includes(ctx.fixture.qa.cardId));
    assert.ok(after.cardIds.includes(card.cardId));
    ({result}=await analytics(ctx));
    await p.getByRole('button',{name:'更多知识点',exact:true}).click();
    const text=await mastery.innerText();
    assert.ok(text.includes('生命周期甲')&&text.includes('关联 '+after.cardIds.length+' 张卡片'));
    step(ctx,'GUI card-knowledge unlink updates aggregate mastery without duplicate cards; analytics reloads exact IDs');
  }else if(id==='AN-08'){
    const before=await readFullHistory(ctx,card);
    const published=await ctx.session.api.call('card.getPublishedContent',card);
    await enterCards(ctx);
    await p.getByRole('button',{name:'编辑 '+nativeTitle,exact:true}).click();
    const selectType=async(name)=>{
      await p.getByRole('navigation',{name:'卡片类型'}).getByRole('button',{name,exact:true}).click();
      const d=p.getByRole('dialog',{name:'确认切换卡片类型'});
      await d.getByRole('button',{name:'确认切换并清除草稿'}).click();
      await d.waitFor({state:'hidden'});
    };
    await selectType('问答记忆');
    await editor(ctx,'front').fill('AN-08 转换正面');
    await editor(ctx,'back').fill('AN-08 转换答案');
    await p.getByTestId('publish-card').click();
    await p.getByRole('status').filter({hasText:'发布成功，历史已保留'}).waitFor();
    const qa=await ctx.session.api.call('card.getPublishedContent',card);
    assert.equal(qa.payload.mode,'qa');
    assert.equal((await readFullHistory(ctx,card)).length,before.length);
    await selectType('直接记忆');
    await editor(ctx,'body').fill('AN-08 新周期记忆正文');
    await p.getByTestId('publish-card').click();
    await p.getByRole('status').filter({hasText:'发布成功，历史已保留'}).waitFor();
    const direct=await ctx.session.api.call('card.getPublishedContent',card);
    assert.equal(direct.payload.mode,'direct');
    assert.notEqual(direct.versionId,published.versionId);
    assert.notEqual(direct.versionId,qa.versionId);
    assert.deepEqual(await readFullHistory(ctx,card),before);
    await exitEditorToList(ctx);
    await analytics(ctx);
    assert.ok(await p.getByRole('group',{name:/已加载记录 · 自评分，横轴/}).getByRole('button').count()>0);
    reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
    assert.deepEqual(await readFullHistory(ctx,card),before);
    assert.equal((await ctx.session.api.call('card.getPublishedContent',card)).versionId,direct.versionId);
    step(ctx,'GUI published direct→QA→direct twice without dropping prior ReviewEvent or analytics trend after restart');
  }
  integrity(ctx);
  return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureSetup:initialFixture});
