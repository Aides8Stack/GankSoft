// True Electron GUI flows for ENV-02..09; NOT_RUN until actually executed.
import assert from 'node:assert/strict';
import {executeCase,enterCards,awaitDraft,restart} from '../helpers.mjs';
import {observe,evidence,step,editor} from './core-support.mjs';
import {freshFixture,gotoHome,chooseDeck} from './m1-support.mjs';
import {arm,clear,integrity} from './system-support.mjs';

const id=process.argv[2],out=process.argv[3];
const eligible=['ENV-02','ENV-03','ENV-04','ENV-05','ENV-06','ENV-07','ENV-08','ENV-09'];
if(!eligible.includes(id)||!out)throw Error('UNKNOWN_M1_ENV_CASE');
const fresh=id==='ENV-02'||id==='ENV-09';
await executeCase(id,out,async ctx=>{
  await observe(ctx);
  let p=ctx.session.page,reboot;
  if(id==='ENV-02'){
    const data=await ctx.session.api.call('workspace.dashboard',{});
    assert.equal(data.cardCount,0,'Fresh Schema606 must contain no cards');
    assert.equal(data.eventCount,0,'Fresh Schema606 must contain no review history');
    await p.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
    await p.getByText('还没有学习记录',{exact:true}).waitFor();
    const catalog=await ctx.session.api.call('workspace.catalog',{});
    for(const deck of catalog.items.filter(x=>x.kind==='deck')){
      await chooseDeck(ctx,deck);
      for(const name of ['概览','所有卡片','筛选学习','知识图谱','学习分析','导入导出']){
        const button=p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name,exact:true});
        await button.click();assert.equal(await button.getAttribute('aria-current'),'page');
        assert.equal(await p.locator('main.unified-content').isVisible(),true);
      }
    }
    await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:'系统设置',exact:true}).click();
    await p.getByRole('region',{name:'系统设置',exact:true}).waitFor();
    await gotoHome(ctx);
    step(ctx,'Fresh real Schema606 has empty cards/reviews and explicit home guidance');
    reboot=await restart(ctx);await observe(ctx);
    assert.equal((await ctx.session.api.call('workspace.dashboard',{})).cardCount,0);
  }else if(id==='ENV-03'){
    await enterCards(ctx);
    await p.getByRole('textbox',{name:'搜索卡片标题',exact:true}).fill('B2 保持发布和历史');
    await p.getByRole('button',{name:'搜索',exact:true}).click();
    assert.equal(await p.locator('tr[data-card-id]').count(),1);
    await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:'系统设置',exact:true}).click();
    await p.getByRole('region',{name:'系统设置'}).waitFor();
    await p.getByRole('button',{name:'返回原页面',exact:true}).click();
    assert.equal(await p.getByRole('textbox',{name:'搜索卡片标题',exact:true}).inputValue(),'B2 保持发布和历史');
    await gotoHome(ctx);
    await chooseDeck(ctx,ctx.fixture.deck);
    await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();
    await p.locator('tr[data-card-id="'+ctx.fixture.card.cardId+'"]').waitFor();
    step(ctx,'Narrow rail navigation preserves deck-scoped search/return state and real card identity');
  }else if(id==='ENV-04'){
    const cards=()=>p.locator('tr[data-card-id]');
    for(const target of [ctx.fixture.secondDeck,ctx.fixture.deck,ctx.fixture.secondDeck,ctx.fixture.deck]){
      await chooseDeck(ctx,target);
      await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();
      if(target.id===ctx.fixture.deck.id)await p.locator('tr[data-card-id="'+ctx.fixture.card.cardId+'"]').waitFor();
      else assert.equal(await cards().count(),0,'Another deck leaked the original card');
    }
    assert.equal((await ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.secondDeck.id,limit:100})).items.length,0);
    step(ctx,'Rapid alternating GUI deck switches never show another deck cards');
  }else if(id==='ENV-05'){
    const native=await ctx.session.app.evaluate(({BrowserWindow})=>({
      before:BrowserWindow.getAllWindows()[0].getSize(),
      maximized:BrowserWindow.getAllWindows()[0].isMaximized()}));
    await ctx.session.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].maximize());
    assert.equal(await ctx.session.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isMaximized()),true);
    await ctx.session.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].unmaximize());
    const focus=p.getByRole('button',{name:'切换专注模式',exact:true});
    await focus.click();assert.equal(await focus.getAttribute('aria-pressed'),'true');
    await focus.click();assert.equal(await focus.getAttribute('aria-pressed'),'false');
    await p.setViewportSize({width:600,height:760});
    const expand=p.getByRole('button',{name:'展开卡片集目录',exact:true});
    await expand.click();assert.equal(await expand.getAttribute('aria-expanded'),'true');
    await expand.click();assert.equal(await expand.getAttribute('aria-expanded'),'false');
    await p.setViewportSize({width:native.before[0],height:native.before[1]});
    step(ctx,'Native maximize/restore and GUI focus/rail toggles preserve accessible controls');
  }else if(id==='ENV-06'){
    await chooseDeck(ctx,ctx.fixture.deck);
    const routes=['概览','所有卡片','筛选学习','知识图谱','学习分析','导入导出'];
    const visited=[];
    for(const width of [1500,1366,900]){
      await p.setViewportSize({width,height:880});
      for(const label of routes){
        const b=p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:label,exact:true});
        await b.click();
        assert.equal(await b.getAttribute('aria-current'),'page','Route not active: '+label);
        assert.equal(await p.locator('main.unified-content').isVisible(),true);
        const bounds=await b.boundingBox();
        assert.ok(bounds&&bounds.width>0&&bounds.height>0,'Navigation disappeared: '+label);
        visited.push({width,page:label});
      }
    }
    ctx.observations.checks.widthRoutes=visited;
    step(ctx,'Six production deck pages are accessible at 1500/1366/900 width through GUI');
  }else if(id==='ENV-07'){
    await enterCards(ctx);
    await arm(ctx,'card.listSummary');
    await p.getByRole('textbox',{name:'搜索卡片标题',exact:true}).fill('B2');
    await p.getByRole('button',{name:'搜索',exact:true}).click();
    await p.getByRole('alert').filter({hasText:/V077_SYNTHETIC_TRANSPORT_FAILURE|读取失败|提交结果未知/}).waitFor();
    assert.ok((await ctx.session.app.evaluate(()=>globalThis.v077Faults.events())).some(e=>e.method==='card.listSummary'&&e.injected),'Query really reached armed transport fault');
    await clear(ctx);
    await p.getByRole('button',{name:'重新读取卡片',exact:true}).click();
    await p.locator('tr[data-card-id="'+ctx.fixture.card.cardId+'"]').waitFor();
    step(ctx,'Injected real IPC query failure yields visible alert and successful GUI retry');
  }else if(id==='ENV-08'){
    await enterCards(ctx);
    await p.getByRole('button',{name:'编辑 B2 保持发布和历史',exact:true}).click();
    const content='ENV-08 离页必须持久保存未提交正文';
    await editor(ctx,'body').fill(content);
    await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:'系统设置',exact:true}).click();
    await p.getByRole('region',{name:'系统设置',exact:true}).waitFor();
    const draft=await awaitDraft(ctx,'B2 保持发布和历史','body',content,false);
    assert.equal(draft.cardId,ctx.fixture.card.cardId);
    await p.getByRole('button',{name:'返回原页面',exact:true}).click();
    assert.match(await editor(ctx,'body').innerText(),/ENV-08 离页必须持久保存/);
    await gotoHome(ctx);
    reboot=await restart(ctx);await observe(ctx);
    assert.ok((await ctx.session.api.call('draft.get',ctx.fixture.card)).payload.fields.body.includes(content));
    step(ctx,'Unsaved GUI editor content is protected when switching settings/home and survives new PID');
  }else if(id==='ENV-09'){
    assert.ok(ctx.fixture.data.includes('中文 空格'),'Real filesystem path must contain Chinese and spaces');
    const before=await ctx.session.api.call('workspace.catalog',{});
    await p.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
    reboot=await restart(ctx);await observe(ctx);
    assert.deepEqual(await ctx.session.api.call('workspace.catalog',{}),before);
    step(ctx,'Fresh Electron uses Chinese and space path; new process reads same Schema606');
  }
  integrity(ctx);
  return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureFactory:fresh?(opts=>freshFixture({...opts,unicode:id==='ENV-09'})):undefined});
