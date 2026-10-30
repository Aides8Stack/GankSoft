import assert from 'node:assert/strict';
import {executeCase,enterCards,restart} from '../helpers.mjs';
import {observe,evidence,step} from '../scenarios/core-support.mjs';
import {gotoHome,chooseDeck,openCatalogDialog,createCatalog,findCatalog,allCatalog} from '../scenarios/m1-support.mjs';
import {integrity,receipts} from '../scenarios/system-support.mjs';
const [id,out]=process.argv.slice(2);
if(!['ENV-05','CAT-03'].includes(id)||!out)throw Error('F1_CASE_REQUIRED');
await executeCase(id,out,async ctx=>{
 await observe(ctx);let p=ctx.session.page,reboot;
 if(id==='ENV-05'){
  for(const width of [600,900,1366]){
   await p.setViewportSize({width,height:880});
   const toggle=p.getByRole('button',{name:'展开卡片集目录',exact:true});
   if(width===600){
    for(let i=0;i<4;i++){
     await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
     const hit=await toggle.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});assert.ok(hit,'Drawer intercepts real toggle target');
     await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    }
    await toggle.click();await chooseDeck(ctx,ctx.fixture.deck);
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   }else await chooseDeck(ctx,ctx.fixture.deck);
   for(const name of ['概览','所有卡片','筛选学习','知识图谱','学习分析','导入导出']){
    const nav=p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name,exact:true});
    await nav.click();assert.equal(await nav.getAttribute('aria-current'),'page');
   }
   const settings=p.getByRole('button',{name:'本地用户设置',exact:true});await settings.click();
   await p.getByRole('region',{name:'系统设置',exact:true}).waitFor();await p.getByRole('button',{name:'返回原页面',exact:true}).click();
   step(ctx,`${width}px real mouse: drawer/navigation/six deck pages/settings succeeded`);
  }
 }else{
  await gotoHome(ctx);let initial=await allCatalog(ctx);
  const published=await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card);
  await p.evaluate(()=>window.confirm=()=>true);
  for(const kind of ['folder','deck']){
   let d=await openCatalogDialog(ctx,kind),field=d.getByRole('textbox',{name:'目录项名称',exact:true});
   await d.getByRole('button',{name:'保存目录',exact:true}).click();assert.equal(await field.evaluate(e=>e.validity.valueMissing),true);
   const calls=(await receipts(ctx,'workspace.catalog.save')).length;
   await field.fill('   ');await d.getByRole('button',{name:'保存目录',exact:true}).click();
   await d.getByRole('alert').filter({hasText:'名称不能为空、不能全部为空格'}).waitFor();
   assert.ok(await field.isEnabled());assert.ok(await d.getByRole('button',{name:'取消',exact:true}).isEnabled());
   assert.equal((await receipts(ctx,'workspace.catalog.save')).length,calls,'Invalid name must not dispatch');
   await d.getByRole('button',{name:'取消',exact:true}).click();await d.waitFor({state:'hidden'});
   assert.deepEqual(await allCatalog(ctx),initial);
   d=await openCatalogDialog(ctx,kind);field=d.getByRole('textbox',{name:'目录项名称',exact:true});
   await field.fill('  ');await d.getByRole('button',{name:'保存目录',exact:true}).click();
   await field.fill(`F1 ${kind} 合法恢复`);await d.getByRole('button',{name:'保存目录',exact:true}).click();await d.waitFor({state:'hidden'});
   const saved=(await findCatalog(ctx,kind,`F1 ${kind} 合法恢复`))[0];assert.ok(saved);
   initial=await allCatalog(ctx);
   d=await openCatalogDialog(ctx,kind);await d.getByLabel('目录项名称',{exact:true}).fill(saved.name);
   await d.getByRole('button',{name:'保存目录',exact:true}).click();await d.getByRole('alert').waitFor();
   await d.getByRole('button',{name:'取消',exact:true}).click();assert.equal((await findCatalog(ctx,kind,saved.name)).length,1);
   step(ctx,`${kind}: empty/whitespace rejected without IPC; cancel, correct name, duplicate refusal work`);
  }
  let d=await openCatalogDialog(ctx,'deck');await d.getByLabel('目录项名称',{exact:true}).fill('F1 unknown protected');
  await ctx.session.app.evaluate(()=>globalThis.v077Faults.arm('workspace.catalog.save','drop-unknown'));
  await d.getByRole('button',{name:'保存目录',exact:true}).click();await d.getByRole('button',{name:'核对原目录请求',exact:true}).waitFor();
  assert.ok(await d.getByRole('button',{name:'取消',exact:true}).isDisabled());
  assert.ok(await d.getByLabel('目录项名称',{exact:true}).isDisabled());
  await ctx.session.app.evaluate(()=>globalThis.v077Faults.clear());await d.getByRole('button',{name:'核对原目录请求',exact:true}).click();await d.waitFor({state:'hidden'});
  assert.equal((await findCatalog(ctx,'deck','F1 unknown protected')).length,1);
  assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card),published);
  const before=await allCatalog(ctx);integrity(ctx);reboot=await restart(ctx);await observe(ctx);p=ctx.session.page;
  assert.deepEqual(await allCatalog(ctx),before);assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card),published);
  step(ctx,'Lost committed reply stays locked; same-request recovery creates once; catalog and published data survive new PID');
 }
 integrity(ctx);return {...await evidence(ctx),...(reboot?{reboot}:{})};
});
