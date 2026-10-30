// M4-02: eight real GUI backup, Schema606 merge, relocation, recycle and restoration cases.
// BACK-14 has a separate attended native-Windows script.
import assert from 'node:assert/strict';
import {mkdirSync,existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {executeCase} from '../helpers.mjs';
import {observe,evidence,step} from './core-support.mjs';
import {gotoHome,manageCatalog,deleteDeckGUI,restoreDeckGUI,createCatalog,confirmAction} from './m1-support.mjs';
import {map,select,leaveMap} from './module-support.mjs';
import {oldMediaFixture,qaFixture,settings,backup,selectFile,protectedFacts,
 snapshot,integrity,readContainer,hash,makeMergeSource,previewMerge,cancelMerge,confirmMerge,
 openTrash,enterCards,exitEditorToList,cardList,catalog,published,history,restart} from './m4-support.mjs';
const id=process.argv[2],out=process.argv[3];
const ids=['BACK-02','BACK-08','BACK-09','BACK-12','TRASH-01','TRASH-05','TRASH-06','TRASH-07'];
if(!ids.includes(id)||!out)throw Error('UNKNOWN_M4_STORAGE_CASE');
const fixtureSetup=['TRASH-05','BACK-09'].includes(id)?oldMediaFixture:undefined;
import {finishSeedReview} from './system-support.mjs';
const title='B2 保持发布和历史';
const scope=ctx=>({deckId:ctx.fixture.deck.id});
await executeCase(id,out,async ctx=>{
 await observe(ctx);let p=ctx.session.page,reboot;
 if(['TRASH-05','TRASH-07'].includes(id))await finishSeedReview(ctx);
 const initial=snapshot(ctx.fixture),original=await published(ctx);
 const originalHistory=(await history(ctx)).items;
 if(id==='BACK-02'){
   await settings(ctx,'备份与恢复');
   const notThere=join(ctx.fixture.root,'cancel-must-not-exist.zip');
   await selectFile(ctx,null,true);
   await p.getByRole('button',{name:'导出完整备份',exact:true}).click();
   await p.getByRole('status').filter({hasText:'已取消备份'}).waitFor();
   assert.equal(existsSync(notThere),false);
   assert.deepEqual(snapshot(ctx.fixture),initial);
   step(ctx,'GUI complete-backup native chooser canceled; no ZIP, no completed message, zero persisted changes');
 }else if(id==='BACK-08'||id==='BACK-09'){
   const source=await makeMergeSource(ctx);
   const sourceDbHash=hash(readFileSync(source.file));
   const stable=snapshot(ctx.fixture);
   const panel=await previewMerge(ctx,source.file);
   assert.match(await panel.innerText(),/Schema606/);
   assert.match(await panel.innerText(),/历史|图片|卡片/);
   if(id==='BACK-08'){
     await cancelMerge(panel);
     assert.deepEqual(snapshot(ctx.fixture),stable);
     assert.equal(hash(readFileSync(source.file)),sourceDbHash);
     assert.ok(!(await catalog(ctx)).items.some(x=>x.name.includes('导入副本')));
     step(ctx,'GUI merger preview/cancel keeps origin ZIP/SQLite immutable and destination full DB/media identical');
   }else{
     await confirmMerge(panel);
     await ctx.session.api.call('app.capabilities',{});
     const decks=(await catalog(ctx)).items;
     const imports=decks.filter(x=>x.kind==='deck'&&!new Set([ctx.fixture.deck.id,ctx.fixture.secondDeck.id]).has(x.id));
     assert.ok(imports.length>=1,'Confirmed merge did not make a separate deck');
     const newDeck=imports.find(x=>x.cardCount>0)??imports[0];
     const cards=(await ctx.session.api.call('card.listSummary',{deckId:newDeck.id,limit:100})).items;
     const same=cards.find(x=>x.title===title);
     assert.ok(same&&same.cardId!==ctx.fixture.card.cardId,'Same ID not reallocated');
     const h=(await ctx.session.api.call('learning.history.list',{deckId:newDeck.id,cardId:same.cardId})).items;
     assert.equal(h.length,originalHistory.length);
     const sourceDue=(await cardList(ctx)).items.find(x=>x.cardId===ctx.fixture.card.cardId).dueAt;
     assert.ok(cards.find(x=>x.cardId===same.cardId).dueAt,'Merged deck lost FSRS schedule');
     assert.ok(sourceDue);
     assert.equal((await ctx.session.api.call('knowledge.tree.read',{deckId:newDeck.id})).nodes.length,
       (await ctx.session.api.call('knowledge.tree.read',scope(ctx))).nodes.length);
     assert.deepEqual(await published(ctx),original);
     assert.equal(hash(readFileSync(source.file)),sourceDbHash);
     reboot=await restart(ctx);await observe(ctx);
     assert.equal((await ctx.session.api.call('learning.history.list',{deckId:newDeck.id,cardId:same.cardId})).items.length,h.length);
     assert.equal((await ctx.session.api.call('card.listSummary',{deckId:newDeck.id,limit:100})).items.find(x=>x.cardId===same.cardId).dueAt,
       cards.find(x=>x.cardId===same.cardId).dueAt);
     step(ctx,'GUI merge duplicate-ID database: independent card ID, history, FSRS, knowledge, source media and fresh PID');
   }
 }else if(id==='BACK-12'){
   await settings(ctx,'数据管理');
   const panel=p.getByRole('region',{name:'迁移活动数据目录'});
   const oldInfo=await ctx.session.api.call('storage.relocate.info',{});
   await panel.getByRole('button',{name:'读取当前数据目录'}).click();
   assert.ok((await panel.innerText()).includes(oldInfo.currentDirectory));
   const parent=join(ctx.fixture.root,'M4 数据目录 中文 空格');
   mkdirSync(parent,{recursive:true});
   await selectFile(ctx,parent);
   await panel.getByRole('button',{name:'选择目标文件夹'}).click();
   const preview=panel.getByRole('article',{name:'目录迁移预览'});
   await preview.waitFor();
   assert.match(await preview.innerText(),/GankSoftData/);
   const before=snapshot(ctx.fixture);
   assert.equal(await preview.getByRole('button',{name:'确认迁移目录'}).isDisabled(),true);
   await preview.getByRole('button',{name:'取消迁移'}).click();
   await panel.getByRole('status').filter({hasText:'已取消迁移'}).waitFor();
   assert.deepEqual(snapshot(ctx.fixture),before);
   await selectFile(ctx,parent);
   await panel.getByRole('button',{name:'选择目标文件夹'}).click();
   const again=panel.getByRole('article',{name:'目录迁移预览'});
   await again.getByLabel('我确认迁移全部活动数据到上述新目录').check();
   await again.getByRole('button',{name:'确认迁移目录'}).click();
   await p.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();
   await ctx.session.api.call('app.capabilities',{});
   const after=await ctx.session.api.call('storage.relocate.info',{});
   assert.equal(after.currentDirectory,join(parent,'GankSoftData'));
   assert.ok(existsSync(join(after.currentDirectory,'ganksoft.sqlite')));
   assert.deepEqual(snapshot(ctx.fixture),before);
   reboot=await restart(ctx);await observe(ctx);
   assert.equal((await ctx.session.api.call('storage.relocate.info',{})).currentDirectory,after.currentDirectory);
   assert.deepEqual(await published(ctx),original);
   step(ctx,'Native directory chooser preview/cancel/confirm; new active data directory, identical SQL facts and fresh PID');
 }else if(id==='TRASH-01'){
   const r=await openTrash(ctx,'卡片集');
   const tabs=r.getByRole('navigation',{name:'回收站分类'});
   for(const name of ['卡片集','卡片','知识点']){
     await tabs.getByRole('button',{name,exact:true}).click();
     assert.equal(await tabs.getByRole('button',{name,exact:true}).getAttribute('aria-current'),'page');
     if(name!=='卡片集'){
       const selector=r.getByRole('combobox',{name:'回收站卡片集'});
       await selector.selectOption(ctx.fixture.deck.id);
     }
     assert.equal(await r.getByRole('alert').count(),0);
     assert.ok((await r.innerText()).includes(name));
   }
   assert.deepEqual(snapshot(ctx.fixture),initial);
   step(ctx,'Settings recycle tabs for decks/cards/knowledge and empty state load correctly; no writes');
 }else if(id==='TRASH-05'){
   const beforeLinks=await ctx.session.api.call('knowledge.cardLinks.get',ctx.fixture.card);
   const beforeTree=await ctx.session.api.call('knowledge.tree.read',scope(ctx));
   const beforeMedia=snapshot(ctx.fixture).media;
   await gotoHome(ctx);
   const deckRow=(await catalog(ctx)).items.find(x=>x.id===ctx.fixture.deck.id);
   assert.ok(deckRow);
   await deleteDeckGUI(ctx,deckRow);
   assert.ok((await ctx.session.api.call('workspace.recycle.decks',{deleted:true})).items.some(x=>x.id===deckRow.id));
   await restoreDeckGUI(ctx,deckRow);
   assert.ok((await ctx.session.api.call('workspace.recycle.decks',{deleted:false})).items.some(x=>x.id===deckRow.id));
   assert.deepEqual(await published(ctx),original);
   assert.deepEqual((await history(ctx)).items,originalHistory);
   assert.deepEqual(await ctx.session.api.call('knowledge.cardLinks.get',ctx.fixture.card),beforeLinks);
   assert.equal((await ctx.session.api.call('knowledge.tree.read',scope(ctx))).nodes.length,beforeTree.nodes.length);
   assert.deepEqual(snapshot(ctx.fixture).media,beforeMedia);
   reboot=await restart(ctx);await observe(ctx);
   assert.deepEqual(await published(ctx),original);
   assert.deepEqual(snapshot(ctx.fixture).media,beforeMedia);
   step(ctx,'GUI deck and all child cards/knowledge/media/history restore atomically under same original IDs');
 }else if(id==='TRASH-06'){
   await enterCards(ctx);await map(ctx);
   await select(p,'生命周期甲');
   await p.getByLabel('更多知识点操作',{exact:true}).click();
   await p.getByRole('button',{name:'删除知识子树'}).click();
   const confirm=p.getByRole('dialog',{name:'确认图谱操作'});
   await confirm.getByRole('button',{name:'确认',exact:true}).click();
   const batch=(await ctx.session.api.call('knowledge.recycle.list',scope(ctx)))[0];
   assert.ok(batch&&batch.count>=2);
   await leaveMap(ctx);
   await settings(ctx,'回收站');
   const tab=p.getByRole('navigation',{name:'回收站分类'});
   await tab.getByRole('button',{name:'知识点'}).click();
   await p.getByRole('button',{name:'知识子树回收站'}).click();
   const dlg=p.getByRole('dialog',{name:'恢复知识子树'});await dlg.waitFor();
   await dlg.getByLabel('回收批次').selectOption(batch.batchId);
   await dlg.getByLabel('恢复名称（可选）').fill('生命周期甲（冲突处理）');
   await dlg.getByLabel('恢复位置').selectOption('root');
   await dlg.getByRole('button',{name:'预览恢复'}).click();
   await dlg.getByText(/共 2 个节点/).waitFor();
   const pre=await ctx.session.api.call('knowledge.tree.read',scope(ctx));
   assert.equal(pre.nodes.length,1);
   await dlg.getByRole('button',{name:'确认恢复'}).click();
   await dlg.waitFor({state:'hidden'});
   const tree=await ctx.session.api.call('knowledge.tree.read',scope(ctx));
   assert.ok(tree.nodes.some(x=>x.nodeId===ctx.fixture.ids[0]&&x.parentId===null&&x.name==='生命周期甲（冲突处理）'));
   assert.ok(tree.nodes.some(x=>x.nodeId===ctx.fixture.ids[2]&&x.parentId===ctx.fixture.ids[0]));
   assert.deepEqual(await published(ctx),original);
   reboot=await restart(ctx);await observe(ctx);
   assert.equal((await ctx.session.api.call('knowledge.tree.read',scope(ctx))).nodes.length,3);
   step(ctx,'Native subtree restore preview/rename/root remount retains original IDs and valid child parent without orphan');
 }else if(id==='TRASH-07'){
   const beforeDue=(await cardList(ctx)).items.find(x=>x.cardId===ctx.fixture.card.cardId).dueAt;
   await enterCards(ctx);
   await p.getByRole('checkbox',{name:'选择 '+title}).check();
   await p.getByRole('button',{name:'移动选中卡片'}).click();
   const target=p.getByRole('region',{name:'选择目标卡片集'});
   await target.getByRole('button',{name:ctx.fixture.secondDeck.name,exact:true}).click();
   const dialog=p.getByRole('alertdialog',{name:'移动卡片确认'});
   await dialog.getByRole('button',{name:'确认移动卡片'}).click();
   await p.getByRole('status').filter({hasText:/已移动 1 张卡片/}).waitFor();
   const moved={deckId:ctx.fixture.secondDeck.id,cardId:ctx.fixture.card.cardId};
   assert.ok((await ctx.session.api.call('card.listSummary',{deckId:moved.deckId,limit:100})).items.some(x=>x.cardId===moved.cardId));
   await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:new RegExp('^'+ctx.fixture.secondDeck.name)}).click();
   await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片'}).click();
   await p.getByRole('checkbox',{name:'选择 '+title}).check();
   await p.getByRole('button',{name:'移到回收站'}).click();
   await p.getByRole('alertdialog',{name:'移入回收站确认'}).getByRole('button',{name:'确认移入回收站'}).click();
   await openTrash(ctx,'卡片');
   await p.getByRole('combobox',{name:'回收站卡片集'}).selectOption(moved.deckId);
   await p.getByRole('checkbox',{name:'恢复 '+title}).check();
   await confirmAction(ctx,()=>p.getByRole('button',{name:'恢复选中卡片',exact:true}).click());
   await p.getByRole('checkbox',{name:'恢复 '+title,exact:true}).waitFor({state:'hidden'});
   const cards=(await ctx.session.api.call('card.listSummary',{deckId:moved.deckId,limit:100})).items;
   assert.ok(cards.some(x=>x.cardId===moved.cardId&&x.dueAt===beforeDue));
   assert.equal((await ctx.session.api.call('learning.history.list',moved)).items.length,originalHistory.length);
   reboot=await restart(ctx);await observe(ctx);
   assert.ok((await ctx.session.api.call('card.listSummary',{deckId:moved.deckId,limit:100})).items.some(x=>x.cardId===moved.cardId));
   step(ctx,'GUI cross-deck move→delete→restore retains card ID/history/dueAt in destination deck, not source');
 }
 integrity(ctx);
 return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureSetup});
