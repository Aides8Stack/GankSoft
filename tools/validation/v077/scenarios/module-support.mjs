import assert from 'node:assert/strict';
import {enterCards} from '../helpers.mjs';
import {openMap,select,nameNew} from '../../r5/support.ts';
import {step} from './core-support.mjs';
export {openMap,select,nameNew};
export async function nav(ctx,name){await ctx.session.page.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name,exact:true}).click();}
export async function map(ctx){await openMap(ctx.session.page,ctx.fixture.deck.name);}
export async function leaveMap(ctx){await ctx.session.page.getByRole('button',{name:'返回所有卡片',exact:true}).click();await ctx.session.page.getByRole('heading',{name:'所有卡片',exact:true}).waitFor();}
export async function selectNode(ctx,name){
  await select(ctx.session.page,name);
  const open=ctx.session.page.getByRole('button',{name:'打开知识栏',exact:true});if(await open.isVisible())await open.click();
  await ctx.session.page.getByRole('heading',{name,exact:true}).waitFor();
  await ctx.session.page.locator('.r5-node-stats[aria-busy=false]').waitFor();
}
export async function reviewDirect(ctx,title,card){
  const p=ctx.session.page;
  await enterCards(ctx);await p.getByRole('checkbox',{name:'选择 '+title,exact:true}).check();
  await p.getByRole('button',{name:'学习选中卡片',exact:true}).click();
  await p.getByRole('heading',{name:title,exact:true}).waitFor();
  const slider=p.getByRole('slider');await slider.waitFor();await slider.focus();await slider.press('End');
  for(let i=0;i<20;i++)await slider.press('ArrowLeft');
  await p.getByLabel('反思（可选）',{exact:true}).fill('T1-B GUI review');
  await p.getByTestId('review-save-state').filter({hasText:'草稿已保存'}).waitFor();
  const resume=p.getByRole('button',{name:'继续计时',exact:true});if(await resume.isVisible())await resume.click();
  await p.getByRole('button',{name:'保存本次复盘',exact:true}).click();
  await p.getByRole('status').filter({hasText:'复盘已保存 · 自评 8.0'}).waitFor();
  const history=(await ctx.session.api.call('learning.history.list',card)).items;
  assert.equal(history.length,1);assert.equal(history[0].scoreTenths,80);assert.equal(history[0].objectiveCorrect,null);
  await p.getByRole('button',{name:'完成复盘',exact:true}).click();
  await p.getByRole('button',{name:'返回卡片列表',exact:true}).click();
  step(ctx,'GUI selected fresh direct card, keyboard scored 8.0, saved one real review, completed session');
  return history[0];
}
export async function analytics(ctx,deck=ctx.fixture.deck){
  const p=ctx.session.page;
  await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:new RegExp('^'+deck.name+'，')}).click();await nav(ctx,'学习分析');
  await p.getByRole('combobox',{name:'分析时间范围',exact:true}).selectOption('all');
  await p.locator('[aria-label="学习分析"][aria-busy=false]').waitFor();
  return ctx.session.api.call('workspace.analytics',{deckId:deck.id,date:{range:'all'}});
}
export async function assertAnalytics(ctx,data){
  const p=ctx.session.page,metric=label=>p.locator('.metric').filter({hasText:label}).locator('.metric-number');
  assert.equal(parseInt(await metric('范围内复盘').innerText()),data.eventCount);
  assert.equal((await metric('平均自评').innerText()).trim(),data.averageScoreTenths===null?'未记录':(data.averageScoreTenths/10).toFixed(1)+' / 10');
  assert.equal((await metric('单选正确率').innerText()).trim(),data.objectiveCount?Math.round(data.correctCount/data.objectiveCount*100)+'%':'未记录');
  assert.equal(await p.locator('.recent-link').count(),data.items.length);
  const rows=await p.locator('.recent-link').allTextContents();
  for(const event of data.items){assert.ok(rows.some(s=>s.includes(event.title)&&s.includes((event.scoreTenths/10).toFixed(1))));}
  ctx.observations.checks.analytics={eventCount:data.eventCount,averageScoreTenths:data.averageScoreTenths,objectiveCount:data.objectiveCount,eventIds:data.items.map(x=>x.eventId)};
}
