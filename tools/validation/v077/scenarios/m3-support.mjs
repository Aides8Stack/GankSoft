// Shared GUI operations for M3: only fixtureSetup may write via protocol.
import assert from 'node:assert/strict';
import {enterCards,restart} from '../helpers.mjs';
import {questionFixture,questionTitle,editor,step} from './core-support.mjs';
import {qaFixture,qaTitle,fixtureOwner} from './p0-support.mjs';
import {map,selectNode,leaveMap,nav} from './module-support.mjs';
export {map,selectNode,leaveMap,nav,questionTitle,qaTitle};
export const nativeTitle='B2 保持发布和历史';
export const allModes=[nativeTitle,questionTitle,qaTitle];
export const knowledgeNames=['生命周期甲','生命周期乙','生命周期子'];

export async function threeModes(f) { await questionFixture(f);await qaFixture(f); }
export async function twoLinkedCards(f) {
  await threeModes(f);
  await fixtureOwner(f,async api=>{
    await api.call('knowledge.cardLinks.set',{
      deckId:f.deck.id,cardId:f.qa.cardId,nodeIds:[f.ids[0],f.ids[1]],expectedRevision:0});
  });
}
export async function openPlanner(ctx) {
  await enterCards(ctx);
  const p=ctx.session.page;
  await nav(ctx,'筛选学习');
  await p.getByRole('heading',{name:'筛选学习',exact:true}).waitFor();
  return p;
}
export const plannerPreview=ctx=>ctx.session.page.getByRole('region',{name:'学习队列预览',exact:true});
export async function previewPlanner(ctx) {
  const p=ctx.session.page;
  await p.getByRole('button',{name:'预览学习队列',exact:true}).click();
  const region=plannerPreview(ctx);
  await region.getByText(/\d+ 张 · 本次队列/).waitFor();
  return {region,labels:await region.locator('.filter-preview-row').allInnerTexts()};
}
export const queueItems=q=>[...q.due,...q.relearn,...q.specialty].filter((v,i,a)=>a.findIndex(w=>w.cardId===v.cardId)===i);
export async function studySelected(ctx,titles){
  await enterCards(ctx);
  const p=ctx.session.page;
  for(const title of titles)await p.getByRole('checkbox',{name:'选择 '+title,exact:true}).check();
  await p.getByRole('button',{name:'学习选中卡片',exact:true}).click();
  await p.getByRole('heading',{name:'学习与复盘',exact:true}).waitFor();
  await p.getByRole('heading',{name:titles[0],exact:true}).waitFor();
  const sessions=await ctx.session.api.call('workspace.sessions',{deckId:ctx.fixture.deck.id});
  const session=sessions.items.find(s=>!s.completed&&s.total===titles.length);
  assert.ok(session,'GUI selected-card session must exist with exact requested size');
  step(ctx,'GUI selected '+titles.length+' cards and opened persistent review session');
  return {page:p,session};
}
export async function reviewCard(ctx,title,card,scoreTenths,{correct=true,practice=false,notes}={}){
  const p=ctx.session.page;
  await studySelected(ctx,[title]);
  if(card===ctx.fixture.question){
    await p.getByRole('radio',{name:correct?'甲正确':'乙错误',exact:true}).check();
    await p.getByLabel('独立思路',{exact:true}).fill('M3 独立判断 '+scoreTenths);
  }
  const reveal=p.getByRole('button',{name:'揭示答案',exact:true});
  if(await reveal.isVisible())await reveal.click();
  const slider=p.getByRole('slider');await slider.focus();
  if(scoreTenths<=50){
    await slider.press('Home');
    for(let i=0;i<scoreTenths;i++)await slider.press('ArrowRight');
  }else{
    await slider.press('End');
    for(let i=100;i>scoreTenths;i--)await slider.press('ArrowLeft');
  }
  assert.equal(await slider.getAttribute('aria-valuetext'),(scoreTenths/10).toFixed(1)+' 分');
  if(notes){
    await p.locator('details.r4-review-extra').filter({hasText:'错误原因与知识漏洞'}).locator('summary').click();
    await p.getByLabel('错因（每行一项）').fill(notes.faults??'');
    await p.getByLabel('知识漏洞').fill(notes.gaps??'');
    await p.getByLabel('反思（可选）').fill(notes.reflection??'');
  }
  if(practice)await p.getByLabel('仅练习，不更新排期').check();
  await p.getByTestId('review-save-state').filter({hasText:'草稿已保存'}).waitFor();
  const resume=p.getByRole('button',{name:'继续计时',exact:true});
  if(await resume.isVisible())await resume.click();
  await p.getByRole('button',{name:'保存本次复盘',exact:true}).click();
  await p.getByRole('status').filter({hasText:'复盘已保存 · 自评 '+(scoreTenths/10).toFixed(1)}).waitFor();
  const list=(await ctx.session.api.call('learning.history.list',card)).items;
  const event=list[0];
  assert.equal(event.scoreTenths,scoreTenths);
  step(ctx,'GUI revealed, keyboard-scored '+(scoreTenths/10).toFixed(1)+' and visibly submitted review event '+event.eventId);
  return event;
}
export async function openDeckSchedule(ctx){
  await enterCards(ctx);await nav(ctx,'调度设置');
  const region=ctx.session.page.getByRole('region',{name:'统一复盘调度设置',exact:true});
  await region.getByRole('heading',{name:'卡片集调度',exact:true}).waitFor();
  return region;
}
export async function openCardSchedule(ctx,title=nativeTitle){
  await enterCards(ctx);
  const p=ctx.session.page;
  await p.getByRole('button',{name:'详情 '+title,exact:true}).click();
  await p.getByRole('article',{name:'卡片详情'}).waitFor();
  await p.getByRole('button',{name:'单卡调度',exact:true}).click();
  const region=p.getByRole('region',{name:'统一复盘调度设置',exact:true});
  await region.getByRole('heading',{name:'单卡调度',exact:true}).waitFor();
  return region;
}
export async function treeRead(ctx) {return ctx.session.api.call('knowledge.tree.read',{deckId:ctx.fixture.deck.id});}
export async function nodeRead(ctx,nodeId){
  return ctx.session.api.call('knowledge.node.read',{deckId:ctx.fixture.deck.id,nodeId});
}
export async function cardLinks(ctx,card=ctx.fixture.card){
  return ctx.session.api.call('knowledge.cardLinks.get',card);
}
export async function openOutline(ctx){
  await map(ctx);
  const p=ctx.session.page;
  await p.getByRole('group',{name:'知识图谱视图'}).getByRole('button',{name:'Markdown 大纲'}).click();
  await p.getByRole('region',{name:'Markdown 大纲工作台'}).waitFor();
  return p;
}
export async function openExchange(ctx,mode='import'){
  await map(ctx);
  const p=ctx.session.page;
  await p.getByLabel('更多知识点操作',{exact:true}).click();
  await p.getByRole('button',{name:mode==='import'?'导入知识 Markdown':'导出知识 Markdown',exact:true}).click();
  const panel=p.getByRole('region',{name:mode==='import'?'导入知识 Markdown':'导出知识 Markdown',exact:true});
  await panel.waitFor();return panel;
}
export async function importPreview(panel,markdown){
  await panel.getByRole('textbox',{name:'粘贴 Markdown',exact:true}).fill(markdown);
  await panel.getByRole('button',{name:'读取粘贴内容',exact:true}).click();
  await panel.getByRole('button',{name:'预览导入',exact:true}).click();
  await panel.locator('.import-row').first().waitFor();
  return panel.locator('.import-row');
}
export async function closeExchange(panel){
  await panel.getByRole('button',{name:'关闭 Markdown 交换',exact:true}).click();
  await panel.waitFor({state:'hidden'});
}
export async function analytics(ctx,deck=ctx.fixture.deck){
  const p=ctx.session.page;
  await p.getByRole('complementary',{name:'学习导航'})
    .getByRole('button',{name:new RegExp('^'+deck.name+'，')}).click();
  await nav(ctx,'学习分析');
  await p.getByRole('combobox',{name:'分析时间范围'}).selectOption('all');
  await p.locator('[aria-label="学习分析"][aria-busy=false]').waitFor();
  return {page:p,result:await ctx.session.api.call('workspace.analytics',{deckId:deck.id,date:{range:'all'}})};
}
export async function history(ctx,card){
  return (await ctx.session.api.call('learning.history.list',card)).items;
}
export async function readFullHistory(ctx,card){
  let after=null,items=[];
  do{
    const r=await ctx.session.api.call('learning.history.list',{...card,after,limit:100});
    items.push(...r.items);after=r.nextCursor;
    assert.ok(items.length<1500,'Fixture review history exceeded bound');
  }while(after);
  return items;
}
export async function restartAndObserve(ctx,observe){
  const proof=await restart(ctx);
  if(observe)await observe(ctx);
  return proof;
}
