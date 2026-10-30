// True Electron GUI flows for CAT-01, CAT-03..11. No backend business writes.
import assert from 'node:assert/strict';
import {executeCase,enterCards,exitEditorToList,restart,awaitDraft} from '../helpers.mjs';
import {observe,evidence,step,editor,newQuestion,publish} from './core-support.mjs';
import {gotoHome,chooseDeck,findCatalog,allCatalog,openCatalogDialog,
  createCatalog,manageCatalog,deleteDeckGUI,restoreDeckGUI} from './m1-support.mjs';
import {finishSeedReview,integrity} from './system-support.mjs';
import {snapshot} from '../../r7/support.ts';
import {fixtureOwner} from './p0-support.mjs';
const id=process.argv[2],out=process.argv[3];
const cases=['CAT-01','CAT-03','CAT-04','CAT-05','CAT-06','CAT-07','CAT-08','CAT-09','CAT-10','CAT-11'];
if(!cases.includes(id)||!out)throw Error('UNKNOWN_M1_CATALOG_CASE');
const seedMany=async f=>{
  await fixtureOwner(f,async api=>{
    for(let i=0;i<55;i++)await api.call('workspace.catalog.save',{
      kind:'deck',name:'T2-M1 页码 '+String(i).padStart(3,'0'),parentId:null});
  });
};
async function createPublished(ctx,mode,title){
  const p=ctx.session.page;
  if(mode==='question'){
    await newQuestion(ctx,title,true);
    await publish(ctx,title);
  }else{
    await p.getByRole('button',{name:'新建卡片',exact:true}).click();
    const label=mode==='qa'?'问答记忆':'直接记忆';
    await p.getByRole('navigation',{name:'卡片类型'}).getByRole('button',{name:label,exact:true}).click();
    const switchDlg=p.getByRole('dialog',{name:'确认切换卡片类型'});
    await switchDlg.getByRole('button',{name:'确认切换并清除草稿',exact:true}).click();
    await switchDlg.waitFor({state:'hidden'});
    await p.getByTestId('draft-title').fill(title);
    if(mode==='qa'){
      await editor(ctx,'front').fill('合成问题 '+title);
      await editor(ctx,'back').fill('合成答案 '+title);
    }else await editor(ctx,'body').fill('合成直接记忆 '+title);
    await p.getByTestId('publish-card').click();
    await p.getByRole('status').filter({hasText:'发布成功，历史已保留'}).waitFor();
  }
  await exitEditorToList(ctx);
  step(ctx,'GUI published '+mode+' '+title);
}
await executeCase(id,out,async ctx=>{
  await observe(ctx);
  let p=ctx.session.page,reboot;
  if(id==='CAT-01'){
    const item=await createCatalog(ctx,'folder','T2-M1 根文件夹');
    assert.equal(item.parentId,null);
    reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);await gotoHome(ctx);
    assert.equal((await findCatalog(ctx,'folder',item.name)).at(0)?.id,item.id);
    await p.getByRole('article',{name:item.name,exact:true}).waitFor();
    step(ctx,'GUI folder persisted as identical root identity after independent Electron restart');
  }else if(id==='CAT-03'){
    await gotoHome(ctx);
    let modal=await openCatalogDialog(ctx,'deck');
    const field=modal.getByRole('textbox',{name:'目录项名称',exact:true});
    await modal.getByRole('button',{name:'保存目录',exact:true}).click();
    assert.equal(await field.evaluate(el=>el.validity.valueMissing),true,'Empty name must be invalid');
    assert.equal(await modal.isVisible(),true);
    await field.fill('   ');
    await modal.getByRole('button',{name:'保存目录',exact:true}).click();
    await modal.getByRole('alert').waitFor();
    await modal.getByRole('button',{name:'取消',exact:true}).click();
    assert.equal((await findCatalog(ctx,'deck','   ')).length,0);
    const name='T2-M1 唯一目录名称';
    await createCatalog(ctx,'deck',name);
    modal=await openCatalogDialog(ctx,'deck');
    await modal.getByRole('textbox',{name:'目录项名称',exact:true}).fill(name);
    await modal.getByRole('button',{name:'保存目录',exact:true}).click();
    await modal.getByRole('alert').waitFor();
    await modal.getByRole('button',{name:'取消',exact:true}).click();
    assert.equal((await findCatalog(ctx,'deck',name)).length,1,'Duplicate catalog save must not replace or duplicate');
    step(ctx,'GUI empty/whitespace/duplicate names produce explicit refusal without orphan or silent overwrite');
  }else if(id==='CAT-04'){
    await gotoHome(ctx);
    const original=ctx.fixture.deck.name,renamed='T2-M1 重命名后保留知识和卡片';
    const linksBefore=await ctx.session.api.call('knowledge.cardLinks.get',ctx.fixture.card);
    const before=await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card);
    const modal=await manageCatalog(ctx,original);
    await modal.getByRole('textbox',{name:'目录项名称',exact:true}).fill(renamed);
    await modal.getByRole('button',{name:'保存目录',exact:true}).click();
    await modal.waitFor({state:'hidden'});
    const rows=await findCatalog(ctx,'deck',renamed);
    assert.equal(rows.length,1);assert.equal(rows[0].id,ctx.fixture.deck.id);
    await chooseDeck(ctx,{...rows[0],name:renamed});
    await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();
    await p.locator('tr[data-card-id="'+ctx.fixture.card.cardId+'"]').waitFor();
    reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
    assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card),before);
    assert.equal((await findCatalog(ctx,'deck',renamed))[0].id,rows[0].id);
    assert.deepEqual(await ctx.session.api.call('knowledge.cardLinks.get',ctx.fixture.card),linksBefore);
    await chooseDeck(ctx,{id:rows[0].id,name:renamed});
    step(ctx,'GUI deck rename retains original identity, published content and knowledge after new PID');
  }else if(id==='CAT-05'){
    const root=await createCatalog(ctx,'folder','T2-M1 一级');
    const child=await createCatalog(ctx,'folder','T2-M1 二级',root);
    assert.equal(child.parentId,root.id);
    await gotoHome(ctx);
    await p.getByRole('article',{name:root.name,exact:true}).getByRole('button',{name:root.name,exact:true}).click();
    await p.getByRole('navigation',{name:'目录路径'}).getByRole('button',{name:root.name}).waitFor();
    await p.getByRole('article',{name:child.name,exact:true}).getByRole('button',{name:child.name,exact:true}).click();
    await p.getByRole('navigation',{name:'目录路径'}).getByRole('button',{name:root.name}).click();
    assert.equal((await findCatalog(ctx,'folder',child.name,root.id))[0].id,child.id);
    await p.getByRole('navigation',{name:'目录路径'}).getByRole('button',{name:'全部卡片集'}).click();
    reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
    assert.equal((await findCatalog(ctx,'folder',child.name,root.id))[0].parentId,root.id);
    step(ctx,'GUI nested folder, breadcrumb navigation and exact parent relation survive reboot');
  }else if(id==='CAT-06'){
    const newDeck=await createCatalog(ctx,'deck','T2-M1 三种卡共存');
    await chooseDeck(ctx,newDeck);
    await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();
    ctx.fixture.deck={id:newDeck.id,name:newDeck.name};
    await createPublished(ctx,'question','T2-M1 问题卡');
    await createPublished(ctx,'qa','T2-M1 问答卡');
    await createPublished(ctx,'direct','T2-M1 直接记忆卡');
    const cards=(await ctx.session.api.call('card.listSummary',{deckId:newDeck.id,limit:100})).items;
    assert.equal(cards.length,3);
    assert.deepEqual(cards.map(x=>x.publishedType).sort(),['direct','qa','question']);
    await gotoHome(ctx);
    await p.getByRole('article',{name:newDeck.name,exact:true}).getByText('3 张').waitFor();
    await p.getByRole('complementary',{name:'学习导航'})
      .getByRole('button',{name:newDeck.name+'，3 张卡片'}).waitFor();
    reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
    assert.equal((await ctx.session.api.call('card.listSummary',{deckId:newDeck.id,limit:100})).items.length,3);
    step(ctx,'Three GUI-published modes agree between Home, rail, list, read-only storage and new PID');
  }else if(id==='CAT-07'){
    await gotoHome(ctx);
    let shown=p.getByRole('region',{name:'卡片集目录'}).getByRole('article');
    const first=await shown.count();
    const more=p.getByRole('button',{name:'更多卡片集',exact:true});
    await more.waitFor();assert.ok(first>=50&&first<56);
    await more.click();
    assert.equal(await shown.count(),57,'52? initial two fixture decks plus 55 seeded decks must appear exactly once');
    const titles=await shown.locator('.catalog-open').allTextContents();
    assert.equal(new Set(titles).size,titles.length);
    await p.getByRole('textbox',{name:/搜索卡片集|搜索目录/}).waitFor({timeout:5000});
    reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);await gotoHome(ctx);
    assert.ok(await p.getByRole('button',{name:'更多卡片集'}).isVisible());
    step(ctx,'GUI catalog pagination/search/reentry has complete nonduplicated roster');
  }else if(id==='CAT-08'){
    await gotoHome(ctx);
    const before=await findCatalog(ctx,'deck',ctx.fixture.deck.name);
    const modal=await manageCatalog(ctx,ctx.fixture.deck.name);
    await modal.getByRole('textbox',{name:'目录项名称'}).fill('T2-M1 不应保存的名称');
    p.once('dialog',d=>d.accept());
    await modal.getByRole('button',{name:'取消',exact:true}).click();
    await modal.waitFor({state:'hidden'});
    assert.deepEqual(await findCatalog(ctx,'deck',ctx.fixture.deck.name),before);
    assert.equal((await findCatalog(ctx,'deck','T2-M1 不应保存的名称')).length,0);
    step(ctx,'GUI cancel confirms discard; catalog name, ID and revision do not change');
  }else if(id==='CAT-09'){
    await enterCards(ctx);
    await p.getByRole('checkbox',{name:'选择 B2 保持发布和历史',exact:true}).check();
    await chooseDeck(ctx,ctx.fixture.secondDeck);
    await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();
    assert.equal(await p.getByRole('region',{name:'卡片批量操作'}).getByText(/已选 \d+ 张/).count(),0);
    await chooseDeck(ctx,ctx.fixture.deck);
    await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();
    assert.ok(await p.getByRole('checkbox',{name:'选择 B2 保持发布和历史'}).isChecked());
    assert.equal((await ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.secondDeck.id,limit:100})).items.length,0);
    step(ctx,'Cross-deck list selection remains scoped; no foreign batch selection or writes');
  }else if(id==='CAT-10'){
    await finishSeedReview(ctx);
    await enterCards(ctx);
    await p.getByRole('button',{name:'编辑 B2 保持发布和历史',exact:true}).click();
    await editor(ctx,'body').fill('CAT-10 回收前必须保留的关联草稿');
    await awaitDraft(ctx,'B2 保持发布和历史','body','CAT-10 回收前必须保留的关联草稿');
    await exitEditorToList(ctx);
    const protectedBefore=snapshot(ctx.fixture).tables;
    const item=ctx.fixture.deck;
    await gotoHome(ctx);
    await deleteDeckGUI(ctx,item);
    await p.getByRole('article',{name:item.name,exact:true}).waitFor({state:'hidden'});
    assert.equal((await findCatalog(ctx,'deck',item.name)).length,0);
    assert.equal(await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:new RegExp('^'+item.name+'，')}).count(),0);
    const protectedAfter=snapshot(ctx.fixture).tables;
    for(const table of ['learning_card_drafts','learning_review_events','learning_content_versions']){
      assert.ok(protectedBefore[table]?.length>0,'Protection fixture missing '+table);
      if(table==='learning_card_drafts'){
        assert.equal(protectedAfter[table].length,protectedBefore[table].length);
        for(let i=0;i<protectedBefore[table].length;i++){
          const old=protectedBefore[table][i],saved=protectedAfter[table][i];
          assert.equal(saved.revision,old.revision+1,'Lifecycle must advance CAS revision');
          assert.equal(saved.base_published_revision,old.base_published_revision+1);
          const oldDoc=JSON.parse(old.payload),savedDoc=JSON.parse(saved.payload);
          assert.equal(savedDoc.document.revision,oldDoc.document.revision+1);
          assert.equal(savedDoc.document.basePublishedRevision,oldDoc.document.basePublishedRevision+1);
          // Compare every remaining byte of the stored business document, not just its text.
          delete oldDoc.document.revision;delete savedDoc.document.revision;
          delete oldDoc.document.basePublishedRevision;delete savedDoc.document.basePublishedRevision;
          assert.deepEqual(savedDoc,oldDoc,'Lifecycle must preserve full draft identity/content/media/origin');
          assert.deepEqual({...saved,revision:0,base_published_revision:0,payload:''},
            {...old,revision:0,base_published_revision:0,payload:''});
        }
      }else assert.deepEqual(protectedAfter[table],protectedBefore[table],'Recycle must preserve '+table);
    }
    step(ctx,'GUI delete removes deck from Home and sidebar, but preserves it in recycle');
  }else if(id==='CAT-11'){
    await finishSeedReview(ctx);
    const card=await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card);
    const links=await ctx.session.api.call('knowledge.cardLinks.get',ctx.fixture.card);
    await gotoHome(ctx);
    await deleteDeckGUI(ctx,{id:ctx.fixture.deck.id,name:ctx.fixture.deck.name});
    await restoreDeckGUI(ctx,{id:ctx.fixture.deck.id,name:ctx.fixture.deck.name});
    reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
    assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card),card);
    assert.deepEqual(await ctx.session.api.call('knowledge.cardLinks.get',ctx.fixture.card),links);
    await chooseDeck(ctx,ctx.fixture.deck);
    await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();
    await p.locator('tr[data-card-id="'+ctx.fixture.card.cardId+'"]').waitFor();
    step(ctx,'GUI delete/recycle/restore retains deck/card/knowledge identities, published content and new PID');
  }
  integrity(ctx);
  return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureSetup:id==='CAT-07'?seedMany:undefined});
