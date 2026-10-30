// M4: seven settings GUI feedback contracts, all data writes via actual buttons.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {executeCase} from '../helpers.mjs';
import {observe,evidence,step,editor} from './core-support.mjs';
import {gotoHome} from './m1-support.mjs';
import {settings,selectFile,openPublished,openTransfer,clipText,
 draft,published,enterCards,protectedFacts,snapshot,integrity,restart,receipts} from './m4-support.mjs';
const id=process.argv[2],out=process.argv[3];
const ids=['SET-05','SET-06','SET-07','SET-08','SET-09','SET-10','SET-11'];
if(!ids.includes(id)||!out)throw Error('UNKNOWN_M4_SETTINGS_CASE');
await executeCase(id,out,async ctx=>{
 await observe(ctx);let p=ctx.session.page,reboot;
 const initial=snapshot(ctx.fixture),pub=await published(ctx);
 if(id==='SET-05'||id==='SET-06'){
   await enterCards(ctx);await settings(ctx,'复盘与调度');
   const region=p.getByRole('region',{name:'统一复盘调度设置'});
   const max=region.getByLabel('最大间隔（天）');
   const original=await max.inputValue();
   await max.fill(id==='SET-06'?'1':original==='123'?'124':'123');
   assert.equal(await region.getByRole('button',{name:'预览重算现有排期'}).isDisabled(),true);
   await region.getByText('请先保存修改后再预览。').waitFor();
   assert.equal(await region.getByText(/总计 \d+ · 可提前 \d+/).count(),0);
   await region.getByRole('button',{name:'保存调度设置'}).click();
   await region.getByRole('status').filter({hasText:'操作已保存'}).waitFor();
   assert.equal(await region.getByRole('button',{name:'预览重算现有排期'}).isDisabled(),false);
   const config=await ctx.session.api.call('policy.config.get',{deckId:ctx.fixture.deck.id});
   assert.equal(config.maxIntervalDays,id==='SET-06'?1:original==='123'?124:123);
   if(id==='SET-06'){
     const list=()=>ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.deck.id,limit:100});
     const due=(await list()).items.find(x=>x.cardId===ctx.fixture.card.cardId).dueAt;
     await region.getByRole('button',{name:'预览重算现有排期'}).click();
     await region.getByText(/总计 \d+ · 可提前 \d+/).waitFor();
     const pre=await ctx.session.api.call('policy.config.preview',{deckId:ctx.fixture.deck.id,offset:0,limit:20});
     for(const x of pre.rows)if(x.beforeDue&&x.afterDue)assert.ok(Date.parse(x.afterDue)<=Date.parse(x.beforeDue));
     assert.equal((await list()).items.find(x=>x.cardId===ctx.fixture.card.cardId).dueAt,due);
     await p.evaluate(()=>window.confirm=()=>true);
     await region.getByRole('button',{name:'确认重算'}).click();
     await region.getByRole('status').filter({hasText:'操作已保存'}).waitFor();
     const recomputed=(await list()).items.find(x=>x.cardId===ctx.fixture.card.cardId).dueAt;
     assert.ok(!due||!recomputed||Date.parse(recomputed)<=Date.parse(due));
     await p.evaluate(()=>window.confirm=()=>true);
     await region.getByRole('button',{name:'撤销本次重算'}).click();
     await region.getByRole('status').filter({hasText:'操作已保存'}).waitFor();
     assert.equal((await list()).items.find(x=>x.cardId===ctx.fixture.card.cardId).dueAt,due);
     reboot=await restart(ctx);await observe(ctx);
     assert.equal((await list()).items.find(x=>x.cardId===ctx.fixture.card.cardId).dueAt,due);
   }
   if(id==='SET-05'){reboot=await restart(ctx);await observe(ctx);assert.deepEqual(await ctx.session.api.call('policy.config.get',{deckId:ctx.fixture.deck.id}),config);}
   step(ctx,'Dirty schedule save-first feedback, preview/cancel/confirm/undo and persisted FSRS due dates');
 }else if(id==='SET-07'){
   await settings(ctx,'外部 AI 协作');
   const region=p.getByRole('region',{name:'外部 AI 协作'});
   assert.ok((await region.innerText()).length>20);
   await p.getByRole('button',{name:'返回原页面'}).click();
   await openPublished(ctx);
   const dialog=await openTransfer(ctx,'prompt');
   const basic=await dialog.getByLabel('Prompt预览').inputValue();
   assert.ok(basic.length>80&&!basic.includes('生命周期子'));
   await dialog.getByLabel('当前卡片集完整知识点候选目录').check();
   const expanded=await dialog.getByLabel('Prompt预览').inputValue();
   assert.ok(expanded.length>basic.length&&expanded.includes('生命周期甲'));
   await dialog.getByRole('button',{name:'复制到剪贴板'}).click();
   await dialog.getByRole('status').filter({hasText:'Prompt已复制'}).waitFor();
   assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),expanded);
   assert.deepEqual(await published(ctx),pub);
   step(ctx,'AI Prompt permission scope is opt-in; visible preview equals copied clipboard; no external AI request');
 }else if(id==='SET-08'){
   await enterCards(ctx);
   await ctx.session.app.evaluate(()=>globalThis.v077Faults.arm('maintenance.backup','drop'));
   await settings(ctx,'备份与恢复');
   await selectFile(ctx,ctx.fixture.root+'/M4-unknown-backup.zip',true);
   await p.getByRole('button',{name:'导出完整备份'}).click();
   await p.getByRole('alert').waitFor();
   const sent=(await receipts(ctx,'maintenance.backup')).length;
   await settings(ctx,'待核对操作');
   const region=p.getByRole('region',{name:'待核对操作'});
   const operations=await ctx.session.api.call('maintenance.operations',{});
   assert.ok(operations.length,'An unknown file operation must appear in settings');
   const op=operations[0];
   await region.getByLabel('核对说明 '+op.requestId).fill('M4 已独立核对合成文件与当前数据，没有再次写入的必要。');
   p.once('dialog',d=>d.accept());
   await region.getByRole('button',{name:'记录核对结果'}).click();
   await region.getByRole('status').filter({hasText:'已记录核对结果'}).waitFor();
   assert.equal((await receipts(ctx,'maintenance.backup')).length,sent,'Status resolve duplicated an unknown backup request');
   await ctx.session.app.evaluate(()=>globalThis.v077Faults.clear());
   step(ctx,'Unknown result resolved with explicit operator note but no duplicate write');
 }else if(id==='SET-09'){
   await settings(ctx,'关于');
   const display=await p.getByRole('region',{name:'关于'}).innerText();
   const version=JSON.parse(readFileSync('package.json','utf8')).version;
   assert.ok(display.includes('GankSoft')&&display.includes('Schema606'));
   assert.ok(display.includes('v'+version),
     'ABOUT_VERSION_STALE: UI displayed '+display+' while package.json is '+version);
   assert.ok(await ctx.session.api.call('app.capabilities',{}));
   step(ctx,'About UI must display current package version, portable platform and Schema606 (stale copy is a real FAIL)');
 }else if(id==='SET-10'){
   await openPublished(ctx);
   const text='SET-10 编辑后进设置返回，正文不可丢';
   await editor(ctx,'body').fill(text);
   await p.getByTestId('save-draft').click();
   await p.locator('[data-save-state="clean"]').waitFor();
   const saved=await draft(ctx);
   assert.ok(saved.payload.fields.body.includes(text));
   await settings(ctx,'常规设置');
   await p.getByRole('button',{name:'返回原页面'}).click();
   assert.ok((await editor(ctx,'body').innerText()).includes(text));
   assert.equal((await draft(ctx)).revision,saved.revision);
   reboot=await restart(ctx);await observe(ctx);
   assert.ok((await draft(ctx)).payload.fields.body.includes(text));
   assert.deepEqual(await published(ctx),pub);
   step(ctx,'Edited draft stays visible after settings return and remains persisted after independent process restart');
 }else if(id==='SET-11'){
   await gotoHome(ctx);
   await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:'系统设置'}).click();
   await p.getByRole('navigation',{name:'设置分类'}).getByRole('button',{name:'复盘与调度'}).click();
   const region=p.getByRole('region',{name:'复盘与调度'});
   await region.getByText(/进入卡片集后可设置卡片集默认调度/).waitFor();
   assert.equal(await region.getByRole('region',{name:'统一复盘调度设置'}).count(),0);
   assert.equal(await region.getByRole('alert').count(),0);
   assert.deepEqual(snapshot(ctx.fixture),initial);
   step(ctx,'Missing selected deck produces helpful schedule guidance without stale policy lookup or writes');
 }
 integrity(ctx);
 return {...await evidence(ctx),...(reboot?{reboot}:{})};
});
