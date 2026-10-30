// M4-01: ten GUI export/import/prompt/clipboard/merge journeys.
import assert from 'node:assert/strict';
import {copyCardContent} from '../../../../shared/cards/clipboard.ts';
import {join} from 'node:path';
import {existsSync} from 'node:fs';
import {executeCase} from '../helpers.mjs';
import {observe,evidence,step,editor,questionFixture} from './core-support.mjs';
import {qaFixture,openPublished,openTransfer,copyCard,parseTransfer,confirmTransfer,
 cancelTransfer,clipText,saveDraft,draft,published,history,exportForImport,openImport,
 makeMergeSource,previewMerge,cancelMerge,confirmMerge,enterCards,exitEditorToList,
 snapshot,protectedFacts,integrity,selectFile,restart,catalog,receipts,openPackage} from './m4-support.mjs';
const id=process.argv[2],out=process.argv[3];
const cases=['EX-01','EX-04','EX-06','EX-07','EX-08','EX-09','EX-10',
  'EX-11','EX-12','EX-13'];
if(!cases.includes(id)||!out)throw Error('UNKNOWN_M4_EXCHANGE_CASE');
const title='B2 保持发布和历史';
const fixtureSetup=id==='EX-01'||id==='EX-04'?qaFixture:id==='EX-08'?questionFixture:undefined;
async function importStandalone(ctx,file,newName){
  const dialog=await openImport(ctx,file);
  await dialog.getByLabel('导入卡片集名称').fill(newName);
  await dialog.getByRole('button',{name:'确认导入独立卡片集'}).click();
  await dialog.getByRole('status').filter({hasText:/已导入 \d+ 张卡片/}).waitFor();
  return (await catalog(ctx)).items.find(x=>x.name===newName);
}
await executeCase(id,out,async ctx=>{
 await observe(ctx);let p=ctx.session.page,reboot;
 const original=snapshot(ctx.fixture),old=await published(ctx);
 if(id==='EX-01'){
   await enterCards(ctx);
   const check=name=>p.getByRole('checkbox',{name:'选择 '+name,exact:true});
   await check(title).check();
   await p.getByRole('button',{name:'导出选中卡片',exact:true}).click();
   let panel=p.getByRole('region',{name:'卡片内容交换预览'});
   await panel.getByRole('heading',{name:'导出选中卡片'}).waitFor();
   assert.match(await panel.innerText(),/1 张卡片/);
   await panel.getByRole('button',{name:'取消交换'}).click();
   assert.equal(await panel.count(),0);
   assert.deepEqual(snapshot(ctx.fixture),original);
   await check(title).check();
   await check('T2-A published QA').check();
   await p.getByRole('button',{name:'导出选中卡片'}).click();
   panel=p.getByRole('region',{name:'卡片内容交换预览'});
   assert.match(await panel.innerText(),/2 张卡片/);
   await panel.getByRole('button',{name:'取消交换'}).click();
   assert.deepEqual(snapshot(ctx.fixture),original);
   assert.equal((await receipts(ctx,'card.exchange.save')).length,0);
   step(ctx,'GUI one-card and multi-card preview/cancel produce no output artifact or business mutation');
 }else if(id==='EX-04'||id==='EX-06'){
   let file;
   if(id==='EX-04'){
     await enterCards(ctx);
     await p.getByRole('checkbox',{name:'选择 '+title,exact:true}).check();
     await p.getByRole('checkbox',{name:'选择 T2-A published QA',exact:true}).check();
     await p.getByRole('button',{name:'导出选中卡片'}).click();
     const outgoing=p.getByRole('region',{name:'卡片内容交换预览'});
     await outgoing.getByRole('heading',{name:'导出选中卡片'}).waitFor();
     assert.match(await outgoing.innerText(),/2 张卡片/);
     file=join(ctx.fixture.root,'m4-ex04-duplicate-IDs.ganksoft');
     await selectFile(ctx,file,true);
     await outgoing.getByRole('button',{name:'选择位置并导出'}).click();
     await outgoing.getByRole('status').filter({hasText:'已导出'}).waitFor();
     assert.ok(existsSync(file));
     await outgoing.getByRole('button',{name:'关闭交换'}).click();
     await p.getByRole('button',{name:'取消选择'}).click();
   }else file=(await exportForImport(ctx)).file;
   const before=snapshot(ctx.fixture);
   const dialog=await openImport(ctx,file);
   await dialog.getByRole('heading',{name:'导入卡片内容'}).waitFor();
   if(id==='EX-06'){
     await dialog.getByLabel('导入卡片集名称').fill('EX-06 候选目的地');
     await dialog.getByRole('button',{name:'取消交换'}).click();
     assert.deepEqual(snapshot(ctx.fixture),before,'Cancel import wrote source content');
     assert.equal((await catalog(ctx)).items.some(x=>x.name==='EX-06 候选目的地'),false);
   }else{
     await dialog.getByLabel('导入卡片集名称').fill('EX-04 ID 冲突独立集');
     await dialog.getByRole('button',{name:'确认导入独立卡片集'}).click();
     await dialog.getByRole('status').filter({hasText:/已导入 2 张卡片/}).waitFor();
     const decks=(await catalog(ctx)).items,copy=decks.find(x=>x.name==='EX-04 ID 冲突独立集');
     assert.ok(copy&&copy.id!==ctx.fixture.deck.id);
     const source=(await ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.deck.id,limit:100})).items;
     const cloned=(await ctx.session.api.call('card.listSummary',{deckId:copy.id,limit:100})).items;
     assert.equal(cloned.length,2);
     for(const x of cloned){
       const match=source.find(s=>s.title===x.title);
       assert.ok(match);assert.notEqual(match.cardId,x.cardId,'Existing card ID collision not re-keyed');
     }
     assert.deepEqual(await published(ctx),old,'Import overwrote source published card');
     reboot=await restart(ctx);await observe(ctx);
     assert.equal((await ctx.session.api.call('card.listSummary',{deckId:copy.id,limit:100})).items.length,2);
   }
   step(ctx,id==='EX-04'?'GUI imported duplicate IDs into new independent deck and preserved source; new PID reopens':'GUI preview changed destination name and canceled with zero DB/media mutations');
 }else if(['EX-07','EX-08','EX-09','EX-10','EX-11','EX-12'].includes(id)){
   await openPublished(ctx);
   const originalDraft=await draft(ctx);
   if(id==='EX-09'){
     const dialog=await openTransfer(ctx,'prompt');
     const preview=dialog.getByLabel('Prompt预览');
     const basic=await preview.inputValue();
     assert.ok(basic.length>60);
     assert.ok(!basic.includes('生命周期子'),'Default prompt unexpectedly includes entire knowledge catalog');
     await dialog.getByRole('checkbox',{name:'当前卡片集完整知识点候选目录'}).check();
     await dialog.getByRole('checkbox',{name:'本卡已确认知识点及父级路径'}).check();
     const expanded=await preview.inputValue();
     assert.ok(expanded.length>basic.length&&expanded.includes('生命周期甲'));
     await dialog.getByRole('button',{name:'复制到剪贴板'}).click();
     assert.equal(await clipText(ctx),expanded);
     assert.deepEqual(await published(ctx),old);
     step(ctx,'Prompt opt-in knowledge scope changes preview; copied OS text exactly equals visible prompt; no unasked network call');
   }else if(id==='EX-07'||id==='EX-12'){
     const clip=await copyCard(ctx);
     if(id==='EX-12'){
       assert.equal(await clipText(ctx),clip);
       await exitEditorToList(ctx);
       await p.getByRole('checkbox',{name:'选择 '+title,exact:true}).check();
       await p.getByRole('button',{name:'导出选中卡片'}).click();
       const modal=p.getByRole('region',{name:'卡片内容交换预览'});
       await modal.getByRole('button',{name:'选择位置并导出'}).waitFor();
       await selectFile(ctx,null,true);
       await modal.getByRole('button',{name:'选择位置并导出'}).click();
       await modal.getByRole('status').filter({hasText:'已取消导出'}).waitFor();
       assert.deepEqual(snapshot(ctx.fixture),original);
       assert.equal((await receipts(ctx,'card.exchange.save')).some(x=>x.ok),false);
       step(ctx,'GUI copy writes genuine Electron clipboard; mocked cancel native-save picker creates no file or false success');
     }else{
       const dialog=await openTransfer(ctx,'paste');
       const raw=await parseTransfer(ctx,dialog,clip);
       assert.ok(raw.includes('不可意外修改'));
       await confirmTransfer(ctx,dialog);
       const next=await draft(ctx);
       assert.equal(next.cardId,ctx.fixture.card.cardId);
       assert.equal(next.payload.mode,old.payload.mode);
       assert.deepEqual(await published(ctx),old,'Clipboard paste directly changed published ContentVersion');
       step(ctx,'GUI Copy card→Paste card preview→explicit confirm: allowed draft fields mapped, published protected');
     }
   }else if(id==='EX-08'){
     const clip=await copyCard(ctx);
     const toQA=JSON.parse(clip.slice(clip.indexOf('{')));
     toQA.fields.payload={encoding:'qa-v1',mode:'qa',fields:{front:'M4 QA 异构交换',back:'M4 答案',supplement:'',source:''}};
     const dialog=await openTransfer(ctx,'paste');
     await parseTransfer(ctx,dialog,copyCardContent(toQA.fields));
     assert.match(await dialog.innerText(),/切换|类型/);
     assert.equal(await dialog.getByRole('button',{name:'确认写入草稿'}).isDisabled(),true);
     await cancelTransfer(dialog);
     assert.deepEqual(await published(ctx),old);
     await p.getByRole('navigation',{name:'卡片类型'}).getByRole('button',{name:'问答记忆'}).click();
     const warning=p.getByRole('dialog',{name:'确认切换卡片类型'});
     assert.match(await warning.innerText(),/草稿|历史/);
     await warning.getByRole('button',{name:'确认切换并清除草稿'}).click();
     await p.getByRole('navigation',{name:'卡片类型'}).getByRole('button',{name:'问答记忆'}).waitFor();
     assert.deepEqual(await published(ctx),old);
     step(ctx,'Mode-incompatible clipboard refuses direct write, cancel preserves original; explicit switch warning and no silent publish');
   }else if(id==='EX-10'||id==='EX-11'){
     const originalText=await editor(ctx,'body').innerText();
     const clip=await copyCard(ctx);
     const payload=JSON.parse(clip.slice(clip.indexOf('{')));
     // AI response fixture must keep the required clipboard marker + strict envelope.
     payload.fields.payload.fields.body='EX-11 AI结构化回复：只写入草稿';
     const dialog=await openTransfer(ctx,'paste');
     await parseTransfer(ctx,dialog,copyCardContent(payload.fields));
     if(id==='EX-10'){
       await cancelTransfer(dialog);
       assert.equal(await editor(ctx,'body').innerText(),originalText);
       assert.deepEqual(await draft(ctx),originalDraft);
       assert.deepEqual(await published(ctx),old);
       step(ctx,'AI structured paste preview can be canceled; draft and published content exactly unchanged');
     }else{
       await confirmTransfer(ctx,dialog);
       const d=await draft(ctx);
       assert.match(d.payload.fields.body,/EX-11 AI结构化回复/);
       assert.deepEqual(await published(ctx),old);
       reboot=await restart(ctx);await observe(ctx);
       assert.match((await draft(ctx)).payload.fields.body,/EX-11 AI结构化回复/);
       assert.deepEqual(await published(ctx),old);
       step(ctx,'Explicit AI structured paste only updates draft; after new PID published still same and no implicit publish');
     }
   }
 }else if(id==='EX-13'){
   const source=await makeMergeSource(ctx);
   const before=snapshot(ctx.fixture);
   let panel=await previewMerge(ctx,source.file);
   assert.match(await panel.innerText(),/历史|卡片|图片/);
   await cancelMerge(panel);
   assert.deepEqual(snapshot(ctx.fixture),before);
   panel=await previewMerge(ctx,source.file);
   await confirmMerge(panel);
   const list=(await catalog(ctx)).items;
   const imported=list.filter(x=>x.kind==='deck'&&x.id!==ctx.fixture.deck.id&&x.id!==ctx.fixture.secondDeck.id);
   assert.ok(imported.length>=1);
   const originalIds=new Set((await ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.deck.id,limit:100})).items.map(x=>x.cardId));
   for(const deck of imported){
     const cards=(await ctx.session.api.call('card.listSummary',{deckId:deck.id,limit:100})).items;
     for(const c of cards)assert.ok(!originalIds.has(c.cardId),'Merge overwrote existing card identity');
   }
   assert.deepEqual(await published(ctx),old);
   reboot=await restart(ctx);await observe(ctx);
   assert.ok((await catalog(ctx)).items.length>=list.length);
   step(ctx,'GUI merge source Schema606: preview/cancel immutable, confirm creates new deck remapping IDs, history and schedule kept');
 }
 integrity(ctx);
 return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureSetup});
