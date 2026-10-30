// Eight M4 real GUI faults: racing operations, unsafe input, corruption, cancel and Schema606 isolation.
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {executeCase} from '../helpers.mjs';
import {observe,evidence,step,editor,questionFixture} from './core-support.mjs';
import {trace,arm,clear,receipts,remove} from './system-support.mjs';
import {gotoHome,chooseDeck} from './m1-support.mjs';
import {oldMediaFixture,qaFixture,openPublished,openTransfer,writeImage,
 settings,selectFile,backup,draft,published,history,enterCards,restart,
 snapshot,protectedFacts,integrity} from './m4-support.mjs';
const id=process.argv[2],out=process.argv[3];
const ids=['FAULT-01','FAULT-06','FAULT-07','FAULT-09','FAULT-10','FAULT-11','FAULT-12','FAULT-13'];
if(!ids.includes(id)||!out)throw Error('UNKNOWN_M4_FAULT_CASE');
const fixtureSetup=id==='FAULT-11'?questionFixture:id==='FAULT-09'?oldMediaFixture:undefined;
await executeCase(id,out,async ctx=>{
 await trace(ctx);let p=ctx.session.page,reboot;
 const before=snapshot(ctx.fixture),pub=await published(ctx);
 const history0=(await history(ctx)).items;
 if(id==='FAULT-01'){
   await openPublished(ctx);
   await ctx.session.app.evaluate(()=>globalThis.v077Faults.hold('draft.save'));
   await editor(ctx,'body').fill('M4 在途保存只属于原卡');
   await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:new RegExp('^'+ctx.fixture.secondDeck.name)}).click();
   const s=await p.getByTestId('draft-title').count();
   // During held save, either navigation is guarded or the eventual save must target only the origin card.
   if(s)assert.ok((await editor(ctx,'body').innerText()).includes('M4 在途保存'));
   await ctx.session.app.evaluate(()=>globalThis.v077Faults.release());
   const deadline=Date.now()+12000;let saved;
   while(Date.now()<deadline){
     saved=await draft(ctx);
     if(saved?.payload?.fields?.body?.includes('M4 在途保存'))break;
     await new Promise(r=>setTimeout(r,100));
   }
   assert.ok(saved?.payload?.fields?.body?.includes('M4 在途保存'),'In-flight draft was lost during navigation');
   assert.equal((await ctx.session.api.call('draft.listSummary',{deckId:ctx.fixture.secondDeck.id})).items.length,0,
     'Stale save leaked to destination deck');
   await chooseDeck(ctx,ctx.fixture.deck);
   await enterCards(ctx);
   assert.deepEqual(await published(ctx),pub);
   step(ctx,'Held genuine draft.save while switching deck: no stale write into other card/deck; correct original draft saved');
 }else if(id==='FAULT-06'){
   await openPublished(ctx);
   const external=[];p.on('request',r=>external.push(r.url()));
   const content=['<script>globalThis.__fault_script=1</script>',
     '<img src="file:///C:/Users/secret/m4.png" onerror="globalThis.__fault_img=1">',
     '[click me](javascript:alert(1))','<iframe src="https://example.invalid/fault"></iframe>'].join('\n\n');
   await editor(ctx,'body').fill(content);
   await p.getByTestId('save-draft').click();
   const result=await draft(ctx);
   assert.ok(result.payload.fields.body.includes('script')||await p.getByRole('alert').count()>0);
   assert.equal(await p.evaluate(()=>Boolean(globalThis.__fault_script||globalThis.__fault_img)),false);
   assert.ok(!external.some(x=>x.includes('example.invalid/fault')||x.includes('m4.png')));
   assert.deepEqual(await published(ctx),pub);
   step(ctx,'GUI unsafe script/HTML/javascript/file URI remains inert; no remote fetch, data leak or published mutation');
 }else if(id==='FAULT-07'||id==='FAULT-09'){
   const file=await backup(ctx),bad=join(ctx.fixture.root,'m4-broken-'+id+'.zip');
   writeFileSync(bad,readFileSync(file).subarray(0,Math.min(90,readFileSync(file).length)));
   const stable=snapshot(ctx.fixture);
   await settings(ctx,'备份与恢复');
   await selectFile(ctx,bad);
   const panel=p.getByRole('region',{name:'恢复完整备份'});
   await panel.getByRole('button',{name:'选择完整备份'}).click();
   await panel.getByRole('alert').first().waitFor();
   assert.equal(await panel.getByRole('article',{name:'完整备份恢复预览'}).count(),0);
   assert.deepEqual(snapshot(ctx.fixture),stable,'Malformed backup left partial DB/media writes');
   if(id==='FAULT-09'){
     await openPublished(ctx);
     const d=editor(ctx,'body'),unsafe='![bad](gank-asset://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/evil)';
     await d.fill(unsafe);
     await p.getByTestId('save-draft').click();
     const saved=await draft(ctx);
     assert.ok(saved.payload.fields.body.includes('bad')||await p.getByRole('alert').count()>0);
     assert.ok(!saved.mediaRefs.some(r=>r.assetId==='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'));
     assert.equal(await d.locator('img[data-gank-placement]').count(),0);
     assert.deepEqual(await published(ctx),pub);
   }
   const rebootFacts=snapshot(ctx.fixture);
   reboot=await restart(ctx);await observe(ctx);
   assert.deepEqual(snapshot(ctx.fixture),rebootFacts);
   step(ctx,'GUI corrupted archive refuses preview/restore atomically; forged media ID cannot fetch external resources');
 }else if(id==='FAULT-10'){
   await openPublished(ctx);
   const oldDraft=await draft(ctx);
   await p.getByRole('navigation',{name:'卡片类型'}).getByRole('button',{name:'问答记忆'}).click();
   const dialog=p.getByRole('dialog',{name:'确认切换卡片类型'});
   await dialog.waitFor();await dialog.press('Escape');
   await dialog.waitFor({state:'hidden'});
   assert.deepEqual(await draft(ctx),oldDraft);
   assert.deepEqual(await published(ctx),pub);
   await p.getByRole('button',{name:'批量输入选项'}).count();
   const transfer=await openTransfer(ctx,'paste');
   await transfer.press('Escape');
   await transfer.waitFor({state:'hidden'});
   assert.deepEqual(await draft(ctx),oldDraft);
   assert.equal((await history(ctx)).items.length,history0.length);
   step(ctx,'Real Escape on type-switch and content-exchange dialogs cancels without draft/history/business changes');
 }else if(id==='FAULT-11'){
   await enterCards(ctx);
   await p.getByRole('checkbox',{name:'选择 B2 保持发布和历史'}).check();
   await p.getByRole('button',{name:'学习选中卡片'}).click();
   await p.getByRole('heading',{name:'B2 保持发布和历史',exact:true}).waitFor();
   const one=(await ctx.session.api.call('workspace.sessions',{deckId:ctx.fixture.deck.id})).items
     .filter(s=>!s.completed).at(-1);
   assert.ok(one);
   await p.getByRole('button',{name:'暂停计时'}).click();
   await p.getByRole('button',{name:'返回卡片列表'}).click();
   await enterCards(ctx);
   await p.getByRole('checkbox',{name:'选择 T1-A seeded published question'}).check();
   await p.getByRole('button',{name:'学习选中卡片'}).click();
   await p.getByRole('heading',{name:'T1-A seeded published question'}).waitFor();
   const sessions=(await ctx.session.api.call('workspace.sessions',{deckId:ctx.fixture.deck.id})).items;
   const two=sessions.find(s=>!s.completed&&s.sessionId!==one.sessionId);
   assert.ok(two&&two.sessionId!==one.sessionId);
   assert.equal(two.total,1);
   await p.getByRole('button',{name:'暂停计时'}).click();
   const original=await ctx.session.api.call('learning.session.get',{deckId:ctx.fixture.deck.id,sessionId:one.sessionId});
   assert.equal(original.entry.cardId,ctx.fixture.card.cardId);
   assert.equal((await history(ctx)).items.length,history0.length,'Switching sessions created phantom ReviewEvent');
   reboot=await restart(ctx);await observe(ctx);
   const restored=await ctx.session.api.call('learning.session.get',{deckId:ctx.fixture.deck.id,sessionId:one.sessionId});
   assert.equal(restored.entry.cardId,original.entry.cardId);
   step(ctx,'GUI two independent review sessions, pause/leave/reopen, no cross-session event or card overwrite');
 }else if(id==='FAULT-12'){
   const caps=await ctx.session.api.call('app.capabilities',{});
   assert.ok(caps,'Schema606 client capabilities missing');
   const initialTables=snapshot(ctx.fixture);
   const older=Object.keys(initialTables.tables).filter(x=>/604_legacy|legacy_604/.test(x));
   assert.equal(older.length,0,'Production may not reconnect old 604 data path');
   await settings(ctx,'关于');
   assert.ok((await p.getByRole('region',{name:'关于'}).innerText()).includes('Schema606'));
   reboot=await restart(ctx);await observe(ctx);
   assert.deepEqual(snapshot(ctx.fixture),initialTables);
   assert.deepEqual(await published(ctx),pub);
   step(ctx,'Actual Electron Schema606 startup, about data format, new PID and no legacy604 tables after migration');
 }else if(id==='FAULT-13'){
   await openPublished(ctx);
   const oldDraft=await draft(ctx);
   const field=p.getByTestId('draft-title');
   await field.fill('M4-FAULT-13-'+('超长标题'.repeat(80)));
   await p.getByTestId('save-draft').click();
   await p.locator('[role=alert],[data-save-state=error]').first().waitFor();
   const text=await p.locator('[role=alert],[data-save-state=error]').allInnerTexts();
   assert.ok(text.join(' ').length>0,'Title-too-long error has no user feedback');
   const after=await draft(ctx);
   assert.equal(after?.title,oldDraft?.title,'Rejected overlong title corrupted existing draft');
   assert.deepEqual(await published(ctx),pub);
   await field.fill('B2 保持发布和历史');
   const batch=p.getByRole('button',{name:'批量输入选项'});
   assert.equal(await batch.count(),0,'Direct card cannot expose question batch editor');
   assert.equal((await history(ctx)).items.length,history0.length);
   step(ctx,'Oversized card title rejected visibly without overwriting earlier valid draft or unrelated ReviewEvent');
 }
 integrity(ctx);
 return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureSetup});
