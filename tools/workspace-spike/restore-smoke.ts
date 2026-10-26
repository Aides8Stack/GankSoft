import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {unifiedWorkspaceFixture} from '../../tests/fixtures/unified-workspace.ts';
import {createBackup} from '../../electron/infrastructure/backup.ts';
import {inspectDatabaseBaseline} from '../../electron/infrastructure/migrations/baseline.ts';
const f=await unifiedWorkspaceFixture(),require=createRequire(import.meta.url),cases:string[]=[],errors:string[]=[],external:string[]=[];
await f.card('qa');const backup=join(f.source.root,'full-restore.zip');await createBackup(f.ctx.db,f.ctx.dataDir,backup);
const wanted=inspectDatabaseBaseline(join(f.ctx.dataDir,'ganksoft.sqlite'),f.ctx.dataDir);const newer=await f.card('direct');
const original=f.ctx.dataDir,before=inspectDatabaseBaseline(join(original,'ganksoft.sqlite'),original);f.release();
let app:Awaited<ReturnType<typeof electron.launch>>|undefined;
function record(s:string){cases.push(s);console.log('RESTORE_UI_CASE',s);}
const facts=(b:typeof wanted)=>({...b,tables:b.tables.filter(t=>!['protocol_meta','learning_owner'].includes(t.name)),digest:null});
try{
 app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[]),resolve('tools/card-draft-spike/main.cjs')],env:{...process.env,GANKSOFT_DRAFT_TEST_CONTROL:f.control,GANKSOFT_DRAFT_TEST_SCOPE:'{}',GANKSOFT_UNIFIED_TEST_ENTRY:'workspace',GANKSOFT_TEST_FULL_RESTORE:'1',GANKSOFT_TEST_OFFSCREEN:'1'}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.setViewportSize({width:1366,height:900});
 page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{external.push(r.request().url());return r.abort();});
 const open=async()=>{await page.getByRole('button',{name:'系统设置',exact:true}).click();await page.getByRole('button',{name:'数据与备份',exact:true}).click();};await open();
 const restore=page.getByRole('region',{name:'恢复完整备份',exact:true});
 await app.evaluate(({dialog})=>{dialog.showOpenDialog=async()=>({canceled:true,filePaths:[]});});
 await restore.getByRole('button',{name:'选择完整备份',exact:true}).click();await restore.getByText('已取消选择备份',{exact:true}).waitFor();assert.deepEqual(inspectDatabaseBaseline(join(original,'ganksoft.sqlite'),original),before);record('native file-dialog cancellation leaves all active table/media fingerprints unchanged');
 const bad=join(f.source.root,'corrupt.zip');writeFileSync(bad,'synthetic corrupt archive');await app.evaluate(({dialog},path)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[path]});},bad);
 await restore.getByRole('button',{name:'选择完整备份',exact:true}).click();await restore.getByRole('alert').waitFor();assert.equal(await restore.getByRole('article',{name:'完整备份恢复预览',exact:true}).count(),0);assert.deepEqual(inspectDatabaseBaseline(join(original,'ganksoft.sqlite'),original),before);record('damaged container is visibly rejected before a confirmation can be accepted');
 await app.evaluate(({dialog},path)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[path]});},backup);
 await restore.getByRole('button',{name:'选择完整备份',exact:true}).click();const preview=restore.getByRole('article',{name:'完整备份恢复预览',exact:true});await preview.getByText('备份内容',{exact:true}).waitFor();
 mkdirSync('validation-results',{recursive:true});await page.screenshot({path:resolve('validation-results/s8a-restore-1366.png'),animations:'disabled',caret:'hide'});
 const confirm=restore.getByRole('button',{name:'确认恢复全部数据',exact:true});assert.equal(await confirm.isDisabled(),true);
 await restore.getByRole('button',{name:'取消恢复',exact:true}).click();await restore.getByText('已取消恢复，当前数据未改变',{exact:true}).waitFor();assert.deepEqual(inspectDatabaseBaseline(join(original,'ganksoft.sqlite'),original),before);record('summary preview is read-only, full replacement requires a separate unchecked acknowledgement, explicit cancel leaves original facts unchanged');
 await restore.getByRole('button',{name:'选择完整备份',exact:true}).click();await preview.waitFor();await page.getByRole('button',{name:'返回上一页',exact:true}).click();await open();assert.equal(await preview.count(),0);record('leaving settings disposes the unconfirmed private preview instead of retaining stale consent');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(720,900));await page.setViewportSize({width:720,height:900});await restore.getByRole('button',{name:'选择完整备份',exact:true}).click();await preview.waitFor();assert.ok(await restore.evaluate(el=>el.scrollWidth<=el.clientWidth));
 await page.screenshot({path:resolve('validation-results/s8a-restore-720.png'),animations:'disabled',caret:'hide'});
 const checkbox=restore.getByRole('checkbox',{name:'我确认用该备份替换全部当前数据',exact:true});assert.equal(await checkbox.isChecked(),false);await checkbox.check();assert.equal(await confirm.isEnabled(),true);record('720px preview stays in its content bounds with readable semantic labels and explicit destructive consent');
 await Promise.all([page.waitForEvent('domcontentloaded'),confirm.click()]);await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
 const active=await app.evaluate(()=>({dataDir:globalThis.cardDraftTest.ctx.dataDir}));
 assert.notEqual(active.dataDir,original);const restored=inspectDatabaseBaseline(join(active.dataDir,'ganksoft.sqlite'),active.dataDir);assert.deepEqual(facts(restored),facts(wanted));assert.deepEqual(inspectDatabaseBaseline(join(original,'ganksoft.sqlite'),original),before);
 assert.equal(await app.evaluate((_electron,id)=>Number(globalThis.cardDraftTest.ctx.db.prepare('SELECT count(*) AS n FROM learning_cards WHERE id=?').get(id).n),newer.cardId),0);record('accepted full restore creates a new epoch and same-control connection, reloads old UI state and exactly restores all backup facts/media while retaining the original library');
 await open();await restore.getByRole('button',{name:'查询上次恢复结果',exact:true}).click();await restore.getByText('上次恢复已提交，当前数据库已重开',{exact:true}).waitFor();record('after renderer reload, the saved operation ID resolves through the durable control receipt without repeating a restore');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{
 mkdirSync('validation-results',{recursive:true});writeFileSync('validation-results/s8a-restore-ui.json',JSON.stringify({platform:process.platform,cases,errors,external,windowsManual:'NOT_RUN'},null,2));
 if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy()));await app.close();}f.close();
}
console.log(JSON.stringify({cases,errors,external}));
