// M3-03: 12 graph CRUD, association, layout and responsive GUI operations.
import assert from 'node:assert/strict';
import {executeCase,enterCards,restart} from '../helpers.mjs';
import {observe,evidence,step} from './core-support.mjs';
import {integrity} from './system-support.mjs';
import {map,selectNode,treeRead,nodeRead,cardLinks,openPlanner,nativeTitle} from './m3-support.mjs';
import {nameNew,saveMap,select} from '../../r5/support.ts';
import {chooseDeck} from './m1-support.mjs';
const id=process.argv[2],out=process.argv[3];
const ids=['KNOW-01','KNOW-03','KNOW-04','KNOW-05','KNOW-06','KNOW-07',
  'KNOW-08','KNOW-09','KNOW-10','KNOW-13','KNOW-14','KNOW-15'];
if(!ids.includes(id)||!out)throw Error('UNKNOWN_M3_KNOW_CASE');
const mk=()=> 'M3 知识操作 '+id;
async function openMenu(p){
  const menu=p.getByLabel('更多知识点操作',{exact:true});
  await menu.click();return p.locator('.r5-node-menu');
}
async function editorLinks(ctx){
  await enterCards(ctx);
  const p=ctx.session.page;
  await p.getByRole('button',{name:'编辑 '+nativeTitle,exact:true}).click();
  await p.getByRole('button',{name:'选择知识点',exact:true}).click();
  const d=p.getByRole('dialog',{name:'选择知识点关联',exact:true});
  await d.waitFor();return d;
}
await executeCase(id,out,async ctx=>{
 await observe(ctx);let p=ctx.session.page,reboot;
 const original=await treeRead(ctx);
 const before=await cardLinks(ctx);
 if(['KNOW-09','KNOW-10'].includes(id)){
   const dlg=await editorLinks(ctx);
   const selected=dlg.getByRole('checkbox',{name:'生命周期乙',exact:true});
   await selected.check();
   if(id==='KNOW-09'){
     await dlg.getByRole('button',{name:'确认关联',exact:true}).click();
     await dlg.waitFor({state:'hidden'});
     const after=await cardLinks(ctx);
     assert.ok(after.nodeIds.includes(ctx.fixture.ids[0])&&after.nodeIds.includes(ctx.fixture.ids[1]));
     assert.equal(new Set(after.nodeIds).size,after.nodeIds.length);
     reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
     assert.deepEqual((await cardLinks(ctx)).nodeIds.sort(),after.nodeIds.sort());
     await enterCards(ctx);
     await p.getByRole('button',{name:'编辑 '+nativeTitle,exact:true}).click();
     await p.getByRole('button',{name:'选择知识点',exact:true}).click();
     const restored=p.getByRole('dialog',{name:'选择知识点关联'});
     assert.equal(await restored.getByRole('checkbox',{name:'生命周期乙'}).isChecked(),true);
     await restored.getByRole('button',{name:'取消',exact:true}).click();
   }else{
     await dlg.getByRole('button',{name:'取消',exact:true}).click();
     await dlg.waitFor({state:'hidden'});
     assert.deepEqual(await cardLinks(ctx),before);
     reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
     assert.deepEqual(await cardLinks(ctx),before);
   }
   assert.deepEqual(await treeRead(ctx),original,'Card link edit must never alter node tree');
   step(ctx,'GUI card-knowledge association confirm/cancel preserves cross-card identity, and restart checks persisted links');
 }else{
   await map(ctx);
   const toolbar=p.getByRole('toolbar',{name:'知识图谱工具栏'});
   const canvas=p.locator('.mind-canvas');
   if(id==='KNOW-01'){
     for(const node of original.nodes)await canvas.locator('.me-tpc').filter({hasText:node.name}).first().waitFor();
     const root=original.nodes.filter(x=>x.parentId===null);
     assert.ok(root.length>=2);
     const zoom=toolbar.getByLabel('当前缩放比例');
     const initial=await zoom.innerText();
     await toolbar.getByRole('button',{name:'放大',exact:true}).click();
     assert.notEqual(await zoom.innerText(),initial);
     await toolbar.getByRole('button',{name:'缩小',exact:true}).click();
     await toolbar.getByRole('button',{name:'适应窗口',exact:true}).click();
     assert.deepEqual(await treeRead(ctx),original);
     step(ctx,'Real graph roots/descendants and mouse/zoom operations load from immutable Schema606 tree');
   }else if(id==='KNOW-03'){
     await selectNode(ctx,'生命周期甲');
     await toolbar.getByRole('button',{name:'新增下级',exact:true}).click();
     await nameNew(p,mk());
     let tree=await treeRead(ctx),child=tree.nodes.find(x=>x.name===mk());
     assert.ok(child&&child.parentId===ctx.fixture.ids[0]);
     await selectNode(ctx,mk());
     await openMenu(p);await p.getByRole('button',{name:'重命名',exact:true}).click();
     const inp=canvas.locator('#input-box');await inp.fill('M3 重命名 '+id);await inp.press('Enter');
     await saveMap(p);
     tree=await treeRead(ctx);child=tree.nodes.find(x=>x.nodeId===child.nodeId);
     assert.equal(child.name,'M3 重命名 '+id);
     await selectNode(ctx,child.name);
     await openMenu(p);await p.getByRole('button',{name:'调整层级',exact:true}).click();
     const dlg=p.getByRole('dialog',{name:'调整知识点层级'});await dlg.waitFor();
     await dlg.getByRole('combobox',{name:'新的上级'}).selectOption(ctx.fixture.ids[1]);
     await dlg.getByRole('button',{name:'保存层级',exact:true}).click();
     await dlg.waitFor({state:'hidden'});
     assert.equal((await treeRead(ctx)).nodes.find(x=>x.nodeId===child.nodeId)?.parentId,ctx.fixture.ids[1]);
     assert.deepEqual(await cardLinks(ctx),before);
     reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
     assert.equal((await treeRead(ctx)).nodes.find(x=>x.nodeId===child.nodeId)?.parentId,ctx.fixture.ids[1]);
     step(ctx,'GUI child-add, rename, move-to-other-parent and restart preserve node ID, no cycle or card-link loss');
   }else if(id==='KNOW-04'){
     await toolbar.getByRole('button',{name:'全部收起',exact:true}).click();
     const collapsed=await canvas.locator('.me-tpc').count();
     await toolbar.getByRole('button',{name:'全部展开',exact:true}).click();
     const expanded=await canvas.locator('.me-tpc').count();
     assert.ok(expanded>=collapsed);
     await selectNode(ctx,'生命周期甲');
     const child=canvas.locator('.me-tpc').filter({hasText:'生命周期子'});
     await child.waitFor();
     const rect=await canvas.boundingBox();assert.ok(rect);
     await p.mouse.move(rect.x+rect.width*0.75,rect.y+rect.height*0.5);
     await p.mouse.down();await p.mouse.move(rect.x+rect.width*0.58,rect.y+rect.height*0.6,{steps:6});await p.mouse.up();
     await toolbar.getByRole('button',{name:'回到中心',exact:true}).click();
     assert.deepEqual(await treeRead(ctx),original);
     step(ctx,'GUI expand/collapse, pan/center and node-selection change only canvas presentation, never tree DB');
   }else if(id==='KNOW-05'){
     const results=[];
     for(const width of [900,1366,1500]){
       await p.setViewportSize({width,height:840});
       for(const layout of ['向左展开','向右展开','左右展开','向下展开']){
         await toolbar.getByRole('button',{name:'导图结构'}).click();
         await p.getByRole('button',{name:layout,exact:true}).click();
         const r=await canvas.boundingBox();
         assert.ok(r&&r.width>220&&r.height>120,'Graph canvas obscured at '+width);
         await canvas.locator('.me-tpc').filter({hasText:'生命周期甲'}).first().waitFor();
         results.push({width,layout,canvasWidth:r.width});
       }
     }
     ctx.observations.checks.layouts=results;
     assert.deepEqual(await treeRead(ctx),original);
     step(ctx,'Four true graph orientation options across three viewport widths preserve business node hierarchy');
   }else if(id==='KNOW-06'){
     const nav=p.getByRole('complementary',{name:'学习导航'});
     assert.ok(await nav.isVisible());
     await toolbar.getByRole('button',{name:'全屏',exact:true}).click();
     await p.locator('.mind-workspace.r5-fullscreen').waitFor();
     assert.ok(await nav.count()>0,'Fullscreen must not remove narrow navigation structure');
     await toolbar.getByRole('button',{name:'退出全屏',exact:true}).click();
     assert.equal(await p.locator('.mind-workspace.r5-fullscreen').count(),0);
     const r=await canvas.boundingBox();assert.ok(r&&r.width>200);
     assert.deepEqual(await treeRead(ctx),original);
     step(ctx,'GUI full-window graph toggles back and preserves narrow navigation rail and scrollable canvas');
   }else if(id==='KNOW-07'){
     await selectNode(ctx,'生命周期乙');
     await openMenu(p);await p.getByRole('button',{name:'重命名',exact:true}).click();
     const inp=canvas.locator('#input-box');await inp.fill('M3 节点菜单重命名');await inp.press('Enter');
     await saveMap(p);
     await selectNode(ctx,'M3 节点菜单重命名');
     await toolbar.getByRole('button',{name:'新增下级',exact:true}).click();
     await nameNew(p,mk());
     const tree=await treeRead(ctx);
     assert.ok(tree.nodes.some(x=>x.name===mk()));
     await selectNode(ctx,mk());await openMenu(p);
     await p.getByRole('button',{name:'删除知识子树',exact:true}).click();
     const confirm=p.getByRole('dialog',{name:'确认图谱操作'});
     await confirm.getByRole('button',{name:'取消',exact:true}).click();
     assert.ok((await treeRead(ctx)).nodes.some(x=>x.name===mk()),'Cancel must protect new node');
     step(ctx,'Native node menu: rename, add child, delete preview/cancel, no silent removal');
   }else if(id==='KNOW-08'){
     await selectNode(ctx,'生命周期甲');
     await p.getByRole('button',{name:'筛选此知识点的卡片',exact:true}).click();
     await p.getByRole('heading',{name:'筛选学习'}).waitFor();
     assert.ok((await p.locator('.filter-chips').innerText()).includes('生命周期甲'));
     const q=await ctx.session.api.call('learning.queue.preview',{deckId:ctx.fixture.deck.id,
       filters:{knowledge:[ctx.fixture.ids[0]],includeChildren:true},limit:100});
     await p.getByRole('button',{name:'预览学习队列'}).click();
     await p.getByRole('region',{name:'学习队列预览'}).getByText(/\d+ 张 · 本次队列/).waitFor();
     const entries=await p.locator('.filter-preview-row').allInnerTexts();
     for(const row of entries)assert.ok([...q.due,...q.relearn,...q.specialty].some(c=>row.includes(c.title)));
     assert.deepEqual(await treeRead(ctx),original);
     step(ctx,'Graph selection to planner retains exact selected node identity, child scope and current deck');
   }else if(id==='KNOW-13'){
     await selectNode(ctx,'生命周期甲');await openMenu(p);
     await p.getByRole('button',{name:'调整层级',exact:true}).click();
     const dlg=p.getByRole('dialog',{name:'调整知识点层级'});await dlg.waitFor();
     const options=await dlg.getByRole('combobox',{name:'新的上级'}).locator('option').evaluateAll(o=>o.map(x=>x.value));
     assert.ok(!options.includes(ctx.fixture.ids[0]),'Self-parent should be impossible');
     assert.ok(!options.includes(ctx.fixture.ids[2]),'Descendant-parent would create cycle');
     await dlg.getByRole('button',{name:'取消'}).click();await dlg.waitFor({state:'hidden'});
     await openMenu(p);await p.getByRole('button',{name:'删除知识子树'}).click();
     await p.getByRole('dialog',{name:'确认图谱操作'}).getByRole('button',{name:'取消'}).click();
     assert.deepEqual(await treeRead(ctx),original);
     assert.deepEqual(await cardLinks(ctx),before);
     step(ctx,'GUI cycle-creating parents unavailable; cancel move/delete leaves entire subtree and links unchanged');
   }else if(id==='KNOW-14'){
     for(let i=0;i<3;i++){
       await chooseDeck(ctx,ctx.fixture.secondDeck);
       const change=p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'知识图谱'});
       await change.click();
       await p.getByRole('heading',{name:'知识图谱'}).waitFor();
       assert.equal((await treeRead(ctx)).nodes.length,original.nodes.length,'Read-only source deck unaffected');
       assert.equal((await ctx.session.api.call('knowledge.tree.read',{deckId:ctx.fixture.secondDeck.id})).nodes.length,0);
       assert.equal(await p.locator('.mind-canvas .me-tpc').filter({hasText:'生命周期甲'}).count(),0);
       await chooseDeck(ctx,ctx.fixture.deck);await change.click();
       await p.locator('.mind-canvas .me-tpc').filter({hasText:'生命周期甲'}).first().waitFor();
     }
     assert.deepEqual(await treeRead(ctx),original);
     step(ctx,'Repeated GUI deck switches discard stale graph nodes/events and keep both independent trees intact');
   }else if(id==='KNOW-15'){
     const widths=[];
     for(const width of [900,1366,1500]){
       await p.setViewportSize({width,height:860});
       const c=await canvas.boundingBox(),bar=await toolbar.boundingBox();
       assert.ok(c&&c.width>260&&c.height>180,'Canvas unusable at '+width);
       assert.ok(bar&&bar.width>180,'Graph toolbar hidden at '+width);
       await toolbar.getByRole('button',{name:'放大'}).click();
       await toolbar.getByRole('button',{name:'适应窗口'}).click();
       await selectNode(ctx,'生命周期甲');
       await p.getByRole('region',{name:'知识点细节栏'}).waitFor();
       const d=await p.getByRole('region',{name:'知识点细节栏'}).boundingBox();
       assert.ok(d&&d.width>=220,'Detail sidebar too narrow at '+width);
       widths.push({width,canvas:c.width,toolbar:bar.width,detail:d.width});
     }
     ctx.observations.checks.graphWidthProbe=widths;
     assert.deepEqual(await treeRead(ctx),original);
     step(ctx,'900/1366/1500 viewport graph canvas, zoom, map toolbar and detail panel remain human-operable');
   }
 }
 integrity(ctx);
 return {...await evidence(ctx),...(reboot?{reboot}:{})};
});
