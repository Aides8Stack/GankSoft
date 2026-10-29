import { _electron as electron } from 'playwright-core';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { unifiedWorkspaceFixture } from '../../tests/fixtures/unified-workspace.ts';
const require=createRequire(import.meta.url),f=await unifiedWorkspaceFixture();
const cases:string[]=[],errors:string[]=[],external:string[]=[];
const sessions=[];
for(const mode of ['question','qa','direct'] as const) {
  const card=await f.card(mode);let s=await f.client.call('learning.session.open',{deckId:card.deckId,cardIds:[card.cardId]});
  s=await f.client.call('learning.session.change',{deckId:s.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'pause'});
  sessions.push(s);
}
f.release();
let app:Awaited<ReturnType<typeof electron.launch>>|undefined;
async function launch(index:number) {
  const s=sessions[index];
  app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[]),resolve('tools/card-draft-spike/main.cjs')],
    env:{...process.env,GANKSOFT_DRAFT_TEST_CONTROL:f.control,GANKSOFT_DRAFT_TEST_SCOPE:JSON.stringify({sessionId:s.sessionId,deckId:s.deckId}),GANKSOFT_UNIFIED_TEST_ENTRY:'review'}});
  const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.setViewportSize({width:1366,height:900});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(/^https?:/,route=>{external.push(route.request().url());return route.abort();});
  await page.getByRole('heading',{name:s.content.title,exact:true}).waitFor();
  await page.locator('.gank-content .ProseMirror').first().waitFor();
  return page;
}
async function closeApp() {if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy()));await app.close();app=undefined;}}
const counts=async(index:number)=>app!.evaluate((_electron,cardId)=>{
  const db=(globalThis as any).cardDraftTest.ctx.db;
  return {events:db.prepare("SELECT count(*) n FROM learning_review_events WHERE card_id=? AND json_extract(document,'$.native.encoding')='ganksoft.review-event/1'").get(cardId).n,
    logs:db.prepare('SELECT count(*) n FROM schedule_events WHERE card_id=?').get(cardId).n};
},sessions[index].entry.cardId);
try {
  let page=await launch(0);
  assert.equal(await page.locator('[aria-label="答案解析"]').count(),0);
  assert.ok(await page.locator('.gank-content .ProseMirror').evaluateAll(es=>es.every(el=>el.getAttribute('contenteditable')==='false')));
  const body=await page.locator('.gank-content .ProseMirror').first().innerText();await page.locator('.gank-content .ProseMirror').first().click();await page.keyboard.type('不可写入');
  assert.equal(await page.locator('.gank-content .ProseMirror').first().innerText(),body);
  cases.push('question hides answer before reveal and shared Crepe renders read-only without changing content');
  await page.getByRole('radio',{name:'甲',exact:true}).check();await page.getByLabel('独立思路',{exact:true}).fill('重启前的独立思路');
  await page.getByLabel('独立思路',{exact:true}).press('Control+s');
  await page.getByTestId('review-save-state').filter({hasText:'草稿已保存'}).waitFor();
  assert.equal(await page.evaluate(()=>(window as any).unifiedReviewSpike.form.close()),true);
  await closeApp();page=await launch(0);
  assert.equal(await page.getByRole('radio',{name:'甲',exact:true}).isChecked(),true);assert.equal(await page.getByLabel('独立思路',{exact:true}).inputValue(),'重启前的独立思路');
  await page.getByRole('button',{name:'继续计时',exact:true}).click();
  await page.getByRole('button',{name:'揭示答案',exact:true}).click();await page.locator('[aria-label="答案解析"]').waitFor();
  assert.equal(await page.getByLabel('独立思路',{exact:true}).isDisabled(),true);
  cases.push('question draft Ctrl+S and guarded pause survive process restart; reveal freezes the original choice and thought');
  await page.locator('input[type="range"]').fill('90');await page.getByText('错误原因与知识漏洞（可选）',{exact:true}).click();await page.getByLabel('错因（每行一项）',{exact:true}).fill('合成错因');
  await page.getByLabel('知识漏洞',{exact:true}).fill('合成知识漏洞');await page.getByLabel('反思（可选）',{exact:true}).fill('合成反思');
  await app!.evaluate(()=>{(globalThis as any).cardDraftTest.ctx.db.exec("CREATE TEMP TRIGGER reject_ui_review BEFORE INSERT ON protocol_receipts WHEN NEW.method='learning.review.submit' BEGIN SELECT RAISE(ABORT,'synthetic UI receipt failure'); END");});
  await page.getByRole('button',{name:'保存本次复盘',exact:true}).click();await page.getByRole('alert').waitFor();
  assert.deepEqual(await counts(0),{events:0,logs:0});assert.equal(await page.locator('input[type="range"]').inputValue(),'90');
  cases.push('native review receipt failure rolls back event and scheduling while retaining high subjective score and reflection');
  await app!.evaluate(()=>{
    const t=(globalThis as any).cardDraftTest;t.ctx.db.exec('DROP TRIGGER reject_ui_review');
    (globalThis as any).__reviewExecute=t.host.execute.bind(t.host);
    t.host.execute=async(request:Record<string,unknown>)=>{const result=await (globalThis as any).__reviewExecute(request);if(request.method==='learning.review.submit'||request.method==='operation.status')throw Error('synthetic response and status loss');return result;};
  });
  await page.getByRole('button',{name:'保存本次复盘',exact:true}).click();await page.getByRole('button',{name:'重试核对提交',exact:true}).waitFor();
  assert.equal(await page.locator('input[type="range"]').isDisabled(),true);assert.equal(await page.evaluate(()=>(window as any).unifiedReviewSpike.form.close()),false);
  assert.deepEqual(await counts(0),{events:1,logs:1});
  await app!.evaluate(()=>{const t=(globalThis as any).cardDraftTest;t.host.execute=(globalThis as any).__reviewExecute;});
  await page.getByRole('button',{name:'重试核对提交',exact:true}).click();
  await page.getByRole('status').filter({hasText:'客观答错'}).waitFor();
  assert.match(await page.getByRole('status').filter({hasText:'客观答错'}).innerText(),/9\.0.*again/s);assert.deepEqual(await counts(0),{events:1,logs:1});
  cases.push('unknown submit locks editing and close; exact request retry saves wrong objective plus9.0 as Again only once');
  await page.getByRole('button',{name:'完成复盘',exact:true}).click();await page.getByText('本次复盘已完成',{exact:true}).waitFor();await closeApp();
  page=await launch(1);assert.equal(await page.locator('[aria-label="记忆答案"]').count(),0);assert.equal(await page.getByRole('radio').count(),0);
  await page.getByRole('button',{name:'继续计时',exact:true}).click();await page.getByRole('button',{name:'揭示答案',exact:true}).click();await page.locator('[aria-label="记忆答案"]').waitFor();
  await page.locator('input[type="range"]').fill('74');await page.getByRole('button',{name:'保存本次复盘',exact:true}).click();
  await page.getByRole('status').filter({hasText:'7.4'}).waitFor();assert.match(await page.getByRole('status').filter({hasText:'7.4'}).innerText(),/hard/);assert.deepEqual(await counts(1),{events:1,logs:1});
  cases.push('QA shows front then reveals back, stores7.4 as Hard with null objective');await closeApp();
  page=await launch(2);assert.equal(await page.getByRole('button',{name:'揭示答案',exact:true}).count(),0);await page.getByText('合成直接记忆',{exact:true}).waitFor();
  await page.getByRole('button',{name:'继续计时',exact:true}).click();await page.locator('input[type="range"]').fill('100');
  await app!.evaluate(()=>{const t=(globalThis as any).cardDraftTest;(globalThis as any).__reviewExecute=t.host.execute.bind(t.host);t.host.execute=async(request:Record<string,unknown>)=>{if(request.method==='learning.session.get')throw Error('synthetic refresh failure');return (globalThis as any).__reviewExecute(request);};});
  await page.getByRole('button',{name:'保存本次复盘',exact:true}).click();await page.getByRole('button',{name:'重新读取已保存结果',exact:true}).waitFor();
  assert.match(await page.getByRole('alert').innerText(),/已保存.*刷新失败/);assert.deepEqual(await counts(2),{events:1,logs:1});
  await app!.evaluate(()=>{const t=(globalThis as any).cardDraftTest;t.host.execute=(globalThis as any).__reviewExecute;});
  await page.getByRole('button',{name:'重新读取已保存结果',exact:true}).click();await page.getByRole('status').filter({hasText:'10.0'}).waitFor();assert.match(await page.getByRole('status').filter({hasText:'10.0'}).innerText(),/easy/);
  assert.deepEqual(await counts(2),{events:1,logs:1});
  cases.push('direct memory reads immediately;10.0 is Easy and post-commit refresh failure recovers by query without a new event');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
} catch(e) { console.error(e);throw e; } finally {
  mkdirSync('validation-results',{recursive:true});writeFileSync('validation-results/unified-review-v075.json',JSON.stringify({platform:process.platform,cases,errors,external,manualWin10Win11:'NOT_RUN'},null,2));
  await closeApp();f.close();
}
console.log(JSON.stringify({cases,errors,external}));
