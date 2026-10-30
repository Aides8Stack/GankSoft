// Real Electron GUI home/deck-overview flows HOME-01..HOME-08.
import assert from 'node:assert/strict';
import {executeCase,enterCards,restart,exitEditorToList,awaitDraft} from '../helpers.mjs';
import {observe,evidence,step,editor} from './core-support.mjs';
import {freshFixture,gotoHome,chooseDeck,createCatalog,findCatalog} from './m1-support.mjs';
import {fixtureOwner} from './p0-support.mjs';
import {integrity} from './system-support.mjs';

const id=process.argv[2],out=process.argv[3];
if(!/^HOME-0[1-8]$/.test(id)||!out)throw Error('UNKNOWN_M1_HOME_CASE');
const paginationFixture=async f=>fixtureOwner(f,async api=>{
  const folder=await api.call('workspace.catalog.save',{kind:'folder',name:'HOME-06 子文件夹',parentId:null});
  await api.call('workspace.catalog.save',{kind:'deck',name:'HOME-06 子层卡片集',parentId:folder.id});
  for(let i=0;i<54;i++)await api.call('workspace.catalog.save',{
    kind:'deck',name:'HOME-06 列表 '+String(i).padStart(3,'0'),parentId:null});
  f.many={folderId:folder.id,childName:'HOME-06 子层卡片集'};
});
const metric=async(p,name)=>p.locator('.summary-strip .metric').filter({hasText:name}).locator('.number').innerText();
const deckTab=(p,name)=>p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name,exact:true});
await executeCase(id,out,async ctx=>{
  await observe(ctx);let p=ctx.session.page,reboot;
  if(id==='HOME-01'){
    await p.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
    assert.equal((await ctx.session.api.call('workspace.dashboard',{})).cardCount,0);
    const item=await createCatalog(ctx,'deck','HOME-01 真实GUI新卡片集');
    await gotoHome(ctx);
    await p.locator('.deck-list').getByRole('button').filter({hasText:item.name}).click();
    await p.getByRole('heading',{name:item.name,exact:true}).waitFor();
    assert.equal((await findCatalog(ctx,'deck',item.name))[0].id,item.id);
    step(ctx,'Fresh GUI home creates deck, shows list and opens matching real identity');
  }else if(id==='HOME-02'){
    const data=await ctx.session.api.call('workspace.dashboard',{deckId:ctx.fixture.deck.id});
    await gotoHome(ctx);await p.locator('.deck-list').getByRole('button').filter({hasText:ctx.fixture.deck.name}).click();
    const overview=p.getByRole('region',{name:'卡片集概览',exact:true});
    await overview.waitFor();await p.locator('[aria-label="卡片集概览"][aria-busy=false]').waitFor();
    const summary=await overview.locator('.deck-statline').innerText();
    assert.ok(summary.includes(data.cardCount+' 张卡片'));
    assert.ok(summary.includes(data.dueCount+' 张待复盘'));
    assert.ok(summary.includes(data.eventCount+' 次'));
    step(ctx,'GUI deck overview count/due/review values exactly match real read-only dashboard');
  }else if(id==='HOME-03'){
    await chooseDeck(ctx,ctx.fixture.deck);
    const before=await ctx.session.api.call('workspace.dashboard',{deckId:ctx.fixture.deck.id});
    await p.getByRole('region',{name:'卡片集概览'}).getByRole('button',{name:'新建卡片',exact:true}).click();
    await p.getByTestId('draft-title').fill('HOME-03 只写草稿');
    await editor(ctx,'stem').fill('HOME-03 尚未发布题干');
    const draft=await awaitDraft(ctx,'HOME-03 只写草稿','stem','HOME-03 尚未发布题干');
    await p.getByRole('button',{name:/返回上一页/}).click();
    await deckTab(p,'概览').click();
    const after=await ctx.session.api.call('workspace.dashboard',{deckId:ctx.fixture.deck.id});
    assert.equal(after.cardCount,before.cardCount,'Unpublished draft must not count as published card');
    assert.equal((await ctx.session.api.call('draft.get',{deckId:ctx.fixture.deck.id,cardId:draft.cardId})).title,draft.title);
    step(ctx,'Overview creates actual new draft without inflating published learning-card count');
  }else if(id==='HOME-04'){
    await chooseDeck(ctx,ctx.fixture.deck);
    for(const [label,route] of [['进入所有卡片','所有卡片'],['进入筛选学习','筛选学习'],['进入知识图谱','知识图谱']]){
      await deckTab(p,'概览').click();
      await p.getByRole('region',{name:'卡片集概览'}).getByRole('button',{name:label,exact:true}).click();
      assert.equal(await deckTab(p,route).getAttribute('aria-current'),'page');
      assert.equal(await p.locator('main.unified-content').isVisible(),true);
    }
    await deckTab(p,'概览').click();
    step(ctx,'Deck overview quick links navigate actual list/planner/knowledge and return');
  }else if(id==='HOME-05'){
    const data=await ctx.session.api.call('workspace.dashboard',{});
    assert.ok(data.eventCount>0,'B2 seed has a submitted review history');
    await chooseDeck(ctx,ctx.fixture.deck);
    await deckTab(p,'学习分析').click();
    await deckTab(p,'所有卡片').click();
    await gotoHome(ctx);
    assert.equal(parseInt(await metric(p,'今日已完成')),data.todayCount);
    assert.equal(parseInt(await metric(p,'卡片集总数')),data.deckCount);
    assert.equal(parseInt(await metric(p,'卡片总数')),data.cardCount);
    const recent=await p.getByRole('region',{name:'最近学习',exact:true}).innerText();
    assert.ok(data.recent.some(x=>recent.includes(x.title)));
    reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
    assert.deepEqual(await ctx.session.api.call('workspace.dashboard',{}),data);
    step(ctx,'Returning/restarting home shows real persisted dashboard metrics and recent review rows');
  }else if(id==='HOME-06'){
    await gotoHome(ctx);
    const rows=p.locator('.deck-list .deck-row');
    const all=(await ctx.session.api.call('workspace.dashboard',{})).deckCount;
    assert.equal(await rows.count(),all,'Home recursively lists all deck entries');
    const names=(await rows.allTextContents()).map(x=>x.trim());
    assert.equal(new Set(names).size,names.length);
    if(await p.locator('details.catalog-management').getAttribute('open')===null)await p.locator('details.catalog-management summary').click();
    const grid=p.getByRole('region',{name:'卡片集目录'}).getByRole('article');
    assert.equal(await grid.count(),50);
    await p.getByRole('button',{name:'更多卡片集',exact:true}).click();
    assert.ok(await grid.count()>50);
    await p.getByRole('article',{name:'HOME-06 子文件夹',exact:true}).getByRole('button',{name:'HOME-06 子文件夹'}).click();
    await p.getByRole('article',{name:ctx.fixture.many.childName,exact:true}).waitFor();
    await p.getByRole('navigation',{name:'目录路径'}).getByRole('button',{name:'全部卡片集'}).click();
    reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);await gotoHome(ctx);
    assert.equal(await p.locator('.deck-list .deck-row').count(),all);
    step(ctx,'Nested folder and paginated home catalog contain every deck once after restart');
  }else if(id==='HOME-07'){
    await gotoHome(ctx);
    const item=ctx.fixture.deck;
    await p.locator('.deck-list').getByRole('button').filter({hasText:item.name}).click();
    await p.getByRole('heading',{name:item.name,exact:true}).waitFor();
    assert.equal(await deckTab(p,'概览').getAttribute('aria-current'),'page');
    await p.getByRole('button',{name:'返回学习总览',exact:true}).click();
    await p.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
    assert.equal(await p.getByRole('complementary',{name:'学习导航'})
      .getByRole('button',{name:'学习总览'}).getAttribute('aria-current'),'page');
    await p.locator('.deck-list').getByRole('button').filter({hasText:item.name}).click();
    await p.getByRole('heading',{name:item.name,exact:true}).waitFor();
    step(ctx,'Home/deck round-trip preserves correct title, navigation selection and breadcrumb target');
  }else if(id==='HOME-08'){
    assert.ok(ctx.fixture.deck,'Fresh initialized deck required for empty study case');
    await chooseDeck(ctx,ctx.fixture.deck);
    const data=await ctx.session.api.call('workspace.dashboard',{deckId:ctx.fixture.deck.id});
    assert.equal(data.cardCount,0);
    assert.equal(data.dueCount,0);
    await p.getByRole('heading',{name:'还没有卡片，开始积累新知识',exact:true}).waitFor();
    const button=p.getByRole('button',{name:'开始本集复盘',exact:true});
    assert.equal(await button.isDisabled(),true,'Empty overview must not open a session');
    assert.equal((await ctx.session.api.call('workspace.sessions',{deckId:ctx.fixture.deck.id})).items.length,0);
    await gotoHome(ctx);
    assert.equal(await p.getByRole('button',{name:'继续学习',exact:true}).isDisabled(),true);
    step(ctx,'Empty deck study controls explicitly refuse empty session rather than writing phantom review');
  }
  integrity(ctx);
  return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureFactory:['HOME-01','HOME-08'].includes(id)?freshFixture:undefined,
  fixtureSetup:id==='HOME-06'?paginationFixture:undefined});
