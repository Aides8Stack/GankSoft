// T2-M1 LIST-02..11. Real Electron GUI batch/list flows with read-only verification.
import assert from 'node:assert/strict';
import {executeCase,enterCards,exitEditorToList,awaitDraft,restart} from '../helpers.mjs';
import {observe,evidence,step,editor,questionFixture,questionTitle} from './core-support.mjs';
import {qaFixture,qaTitle,fixtureOwner} from './p0-support.mjs';
import {chooseDeck,systemSection} from './m1-support.mjs';
import {finishSeedReview,integrity} from './system-support.mjs';
const id=process.argv[2],out=process.argv[3];
const cases=Array.from({length:10},(_,i)=>'LIST-'+String(i+2).padStart(2,'0'));
if(!cases.includes(id)||!out)throw Error('UNKNOWN_M1_LIST_CASE');
const title='B2 保持发布和历史';
async function seeded(f){await questionFixture(f);await qaFixture(f);}
async function many(f){
  await fixtureOwner(f,async api=>{
    for(let i=0;i<35;i++){
      const d=await api.call('draft.create',{deckId:f.deck.id,initialType:'direct'});
      const card={deckId:f.deck.id,cardId:d.cardId};
      const saved=await api.call('draft.save',{...card,expectedPublishedRevision:0,expectedDraftRevision:d.revision,
        fields:{title:'LIST-03 分页 '+String(i).padStart(3,'0'),
          payload:{encoding:'direct-v1',mode:'direct',fields:{body:'分页测试正文 '+i,source:'合成'}},mediaRefs:[]}});
      await api.call('card.publish',{...card,expectedPublishedRevision:0,expectedDraftRevision:saved.revision,resetStudyCycle:false});
    }
  });
}
const listItems=async p=>p.locator('tr[data-card-id]');
async function select(ctx,titles){
  for(const name of titles)await ctx.session.page.getByRole('checkbox',{name:'选择 '+name,exact:true}).check();
  const bar=ctx.session.page.getByRole('toolbar',{name:'批量卡片生命周期'});
  await bar.waitFor();assert.match(await bar.innerText(),new RegExp('已选 '+titles.length+' 张'));
}
async function allPublished(ctx,deckId=ctx.fixture.deck.id){
  const response=await ctx.session.api.call('card.listSummary',{deckId,limit:100});
  return response.items;
}
await executeCase(id,out,async ctx=>{
  await observe(ctx);
  let p=ctx.session.page,reboot;
  if(['LIST-06','LIST-07','LIST-08','LIST-09','LIST-10'].includes(id))
    await finishSeedReview(ctx);
  await enterCards(ctx);
  if(id==='LIST-02'){
    const all=await allPublished(ctx),types=new Set(all.map(x=>x.publishedType));
    assert.deepEqual([...types].sort(),['direct','qa','question']);
    for(const [type,count] of [['direct',1],['qa',1],['question',1]]){
      await p.getByRole('combobox',{name:'卡片模式',exact:true}).selectOption(type);
      await p.waitForFunction(n=>document.querySelectorAll('tr[data-card-id]').length===n,count);
      assert.equal(await listItems(p).count(),count);
      const rows=await listItems(p).allTextContents();
      assert.ok(rows.every(x=>x.includes({question:'单选错题',qa:'问答记忆',direct:'直接记忆'}[type])));
    }
    await p.getByRole('combobox',{name:'卡片模式'}).selectOption('all');
    await p.getByRole('combobox',{name:'已加载卡片排序'}).selectOption('title');
    const sorted=await listItems(p).locator('.card-title-link').allTextContents();
    assert.deepEqual(sorted,[...sorted].sort((a,b)=>a.localeCompare(b,'zh-CN')));
    await p.getByRole('combobox',{name:'已加载卡片排序'}).selectOption('reviews');
    const reviewIds=await listItems(p).evaluateAll(rows=>rows.map(x=>x.dataset.cardId));
    const reviewCounts=reviewIds.map(id=>all.find(x=>x.cardId===id).reviewCount);
    assert.deepEqual(reviewCounts,[...reviewCounts].sort((a,b)=>a-b));
    assert.equal(reviewIds.length,3);
    step(ctx,'Mode filter and title/review sorting derive exclusively from three real published card metadata');
  }else if(id==='LIST-03'){
    const all=await allPublished(ctx);assert.ok(all.length>30);
    assert.equal(await listItems(p).count(),30);
    await p.getByRole('checkbox',{name:'全选已加载卡片',exact:true}).check();
    assert.equal(await p.getByRole('toolbar',{name:'批量卡片生命周期'}).isVisible(),true);
    await p.getByRole('button',{name:'更多卡片',exact:true}).click();
    await p.waitForFunction(n=>document.querySelectorAll('tr[data-card-id]').length===n,all.length);
    assert.equal(await listItems(p).count(),all.length);
    const ids=await listItems(p).evaluateAll(rows=>rows.map(x=>x.getAttribute('data-card-id')));
    assert.equal(new Set(ids).size,all.length);
    assert.equal(await p.locator('tr[data-card-id] input[type=checkbox]:checked').count(),30);
    await p.locator('tr[data-card-id] .card-title-link').first().click();
    await p.getByRole('button',{name:'返回列表',exact:true}).click();
    assert.equal(await listItems(p).count(),all.length);
    assert.equal(await p.locator('tr[data-card-id] input[type=checkbox]:checked').count(),30);
    step(ctx,'List load-more and return retain all unique identities and only selected loaded page rows');
  }else if(id==='LIST-04'){
    const input=p.getByRole('textbox',{name:'搜索卡片标题'});
    await input.fill(title);await p.getByRole('button',{name:'搜索',exact:true}).click();
    assert.equal(await listItems(p).count(),1);
    await p.getByRole('button',{name:'详情 '+title,exact:true}).click();
    await p.getByRole('article',{name:'卡片详情'}).waitFor();
    await p.getByRole('button',{name:'返回列表',exact:true}).click();
    assert.equal(await input.inputValue(),title);assert.equal(await listItems(p).count(),1);
    await p.getByRole('button',{name:'编辑 '+title,exact:true}).click();
    await p.getByTestId('draft-title').waitFor();
    await p.getByRole('button',{name:/返回上一页/}).click();
    assert.equal(await input.inputValue(),title);
    assert.equal(await listItems(p).count(),1);
    step(ctx,'GUI detail/editor/return preserve original list query, one matching card and navigation context');
  }else if(id==='LIST-05'){
    const pub=await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card);
    const links=await ctx.session.api.call('knowledge.cardLinks.get',ctx.fixture.card);
    const history=(await ctx.session.api.call('learning.history.list',ctx.fixture.card)).items;
    await p.getByRole('button',{name:'详情 '+title,exact:true}).click();
    const article=p.getByRole('article',{name:'卡片详情'});
    await article.getByRole('heading',{name:title,exact:true}).waitFor();
    assert.ok((await article.innerText()).includes(pub.payload.fields.body.trim()));
    assert.ok((await article.innerText()).includes('生命周期甲'));
    assert.equal(links.nodeIds.length,1);
    await article.getByRole('button',{name:'查看学习历史',exact:true}).click();
    assert.equal(await article.locator('.detail-history-list button').count(),history.length);
    await article.locator('.detail-history-list button').first().click();
    assert.match(await article.getByRole('region',{name:'当次复盘证据'}).innerText(),/B2合成历史/);
    step(ctx,'Detail content/knowledge/review evidence matches immutable publication and recorded learning history');
  }else if(id==='LIST-06'){
    const titles=[title,qaTitle,questionTitle];
    await select(ctx,titles);
    await p.getByRole('button',{name:'学习选中卡片',exact:true}).click();
    await p.getByRole('heading',{name:'学习与复盘',exact:true}).waitFor();
    const sessions=(await ctx.session.api.call('workspace.sessions',{deckId:ctx.fixture.deck.id})).items;
    assert.ok(sessions.some(s=>s.total===3&&!s.completed),'Selected three cards must create exactly three-entry queue');
    step(ctx,'GUI multi-selects three different published modes and opens a 3-item study session');
  }else if(id==='LIST-07'||id==='LIST-08'){
    const targets=[title,qaTitle,questionTitle],ids=[ctx.fixture.card.cardId,ctx.fixture.qa.cardId,ctx.fixture.question.cardId];
    const before=(await allPublished(ctx)).filter(x=>ids.includes(x.cardId));
    await select(ctx,targets);
    await p.getByRole('button',{name:'移动选中卡片',exact:true}).click();
    const choice=p.getByRole('region',{name:'选择目标卡片集',exact:true});
    await choice.getByRole('button',{name:ctx.fixture.secondDeck.name,exact:true}).click();
    const dialog=p.getByRole('alertdialog',{name:'移动卡片确认'});
    await dialog.waitFor();
    if(id==='LIST-07'){
      await dialog.getByRole('button',{name:'取消移动确认',exact:true}).click();
      await dialog.waitFor({state:'hidden'});
      assert.deepEqual((await allPublished(ctx)).filter(x=>ids.includes(x.cardId)),before);
      assert.equal((await allPublished(ctx,ctx.fixture.secondDeck.id)).length,0);
      step(ctx,'GUI batch move cancellation leaves three cards, histories and deck relations unchanged');
    }else{
      await dialog.getByRole('button',{name:'确认移动卡片',exact:true}).click();
      await dialog.waitFor({state:'hidden'});
      await p.getByRole('status').filter({hasText:'已移动 3 张卡片'}).waitFor();
      assert.equal((await allPublished(ctx)).filter(x=>ids.includes(x.cardId)).length,0);
      const moved=(await allPublished(ctx,ctx.fixture.secondDeck.id)).filter(x=>ids.includes(x.cardId));
      assert.equal(moved.length,3);
      assert.deepEqual(moved.map(x=>x.cardId).sort(),ids.slice().sort());
      reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
      assert.equal((await allPublished(ctx,ctx.fixture.secondDeck.id)).filter(x=>ids.includes(x.cardId)).length,3);
      step(ctx,'GUI batch move retains card IDs and new-deck membership after fresh PID');
    }
  }else if(id==='LIST-09'||id==='LIST-10'){
    const targets=[title,qaTitle,questionTitle],ids=[ctx.fixture.card.cardId,ctx.fixture.qa.cardId,ctx.fixture.question.cardId];
    const before=await allPublished(ctx);
    await select(ctx,targets);
    await p.getByRole('button',{name:'移到回收站',exact:true}).click();
    const dialog=p.getByRole('alertdialog',{name:'移入回收站确认'});
    await dialog.waitFor();
    if(id==='LIST-09'){
      await dialog.getByRole('button',{name:'取消移入',exact:true}).click();
      await dialog.waitFor({state:'hidden'});
      assert.deepEqual(await allPublished(ctx),before);
      step(ctx,'GUI multi-card recycle confirmation canceled; zero persistent changes');
    }else{
      await dialog.getByRole('button',{name:'确认移入回收站',exact:true}).click();
      await dialog.waitFor({state:'hidden'});
      await p.getByRole('status').filter({hasText:'已移到回收站 3 张卡片'}).waitFor();
      assert.equal((await allPublished(ctx)).filter(x=>ids.includes(x.cardId)).length,0);
      await systemSection(ctx,'回收站');
      const region=p.getByRole('region',{name:'统一回收站',exact:true});
      await region.getByRole('navigation',{name:'回收站分类'}).getByRole('button',{name:'卡片',exact:true}).click();
      await region.getByRole('combobox',{name:'回收站卡片集'}).selectOption(ctx.fixture.deck.id);
      for(const name of targets)await region.getByRole('checkbox',{name:'恢复 '+name,exact:true}).check();
      p.once('dialog',d=>d.accept());
      await region.getByRole('button',{name:'恢复选中卡片',exact:true}).click();
      for(const name of targets)await region.getByRole('checkbox',{name:'恢复 '+name}).waitFor({state:'hidden'});
      assert.deepEqual((await allPublished(ctx)).map(x=>x.cardId).sort(),before.map(x=>x.cardId).sort());
      reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
      assert.deepEqual((await allPublished(ctx)).map(x=>x.cardId).sort(),before.map(x=>x.cardId).sort());
      step(ctx,'GUI multi-card delete/recycle/restore retains three original card identities after restart');
    }
  }else if(id==='LIST-11'){
    const before=await allPublished(ctx);
    await p.getByRole('button',{name:'编辑 '+title,exact:true}).click();
    await editor(ctx,'body').fill('LIST-11 已发布卡片的关联草稿');
    const oldDraft=await awaitDraft(ctx,title,'body','LIST-11 已发布卡片的关联草稿');
    await exitEditorToList(ctx);
    await p.getByRole('button',{name:'新建卡片',exact:true}).click();
    await p.getByTestId('draft-title').fill('LIST-11 仅草稿');
    await editor(ctx,'stem').fill('LIST-11 尚未发布');
    const newDraft=await awaitDraft(ctx,'LIST-11 仅草稿','stem','LIST-11 尚未发布');
    await exitEditorToList(ctx);
    assert.equal((await allPublished(ctx)).length,before.length);
    const drafts=(await ctx.session.api.call('draft.listSummary',{deckId:ctx.fixture.deck.id})).items;
    assert.ok(drafts.some(x=>x.cardId===oldDraft.cardId)&&drafts.some(x=>x.cardId===newDraft.cardId));
    assert.notEqual(oldDraft.cardId,newDraft.cardId);
    reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);await enterCards(ctx);
    assert.equal(await listItems(p).count(),before.length);
    await p.getByRole('button',{name:'草稿箱',exact:true}).click();
    await p.getByRole('navigation',{name:'已保存草稿'}).getByRole('button',{name:'LIST-11 仅草稿'}).waitFor();
    step(ctx,'New unpublished draft and existing-card linked draft do not alter published-list count or duplicate IDs');
  }
  integrity(ctx);
  return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureSetup:id==='LIST-03'?many:['LIST-02','LIST-06','LIST-07','LIST-08','LIST-09','LIST-10'].includes(id)?seeded:undefined});
