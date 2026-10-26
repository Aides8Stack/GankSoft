import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {unifiedWorkspaceFixture} from '../../tests/fixtures/unified-workspace.ts';
import {inspectDatabaseBaseline} from '../../electron/infrastructure/migrations/baseline.ts';
const f=await unifiedWorkspaceFixture(),require=createRequire(import.meta.url),cases:string[]=[],errors:string[]=[],external:string[]=[];
await f.card('qa');const original=f.ctx.dataDir,before=inspectDatabaseBaseline(join(original,'ganksoft.sqlite'),original);f.release();
const parent=join(f.source.root,'迁移新位置');mkdirSync(parent);let app:Awaited<ReturnType<typeof electron.launch>>|undefined;
function record(name:string){cases.push(name);console.log('RELOCATION_UI_CASE',name);}
const launch=()=>electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[]),resolve('tools/card-draft-spike/main.cjs')],env:{...process.env,GANKSOFT_DRAFT_TEST_CONTROL:f.control,GANKSOFT_DRAFT_TEST_SCOPE:'{}',GANKSOFT_UNIFIED_TEST_ENTRY:'workspace',GANKSOFT_TEST_FULL_RESTORE:'1',GANKSOFT_TEST_OFFSCREEN:'1'}});
try{
 app=await launch();app.process().stderr?.on('data',chunk=>console.error('ELECTRON_STDERR',String(chunk).slice(0,2000)));let page=await app.firstWindow();page.setDefaultTimeout(15000);await page.setViewportSize({width:1366,height:900});page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{external.push(r.request().url());return r.abort();});
 const open=async()=>{await page.getByRole('button',{name:'系统设置',exact:true}).click();await page.getByRole('button',{name:'数据与备份',exact:true}).click();};await open();
 let region=page.getByRole('region',{name:'迁移活动数据目录',exact:true});
 await app.evaluate(({dialog})=>{dialog.showOpenDialog=async()=>({canceled:true,filePaths:[]});});
 await region.getByRole('button',{name:'选择目标文件夹',exact:true}).click();await region.getByText('已取消选择目录',{exact:true}).waitFor();record('native directory chooser cancellation leaves source untouched');
 await app.evaluate(({dialog},dir)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[dir]});},parent);
 const choose=async()=>{console.log('RELOCATION_STEP choose:start');await region.getByRole('button',{name:'选择目标文件夹',exact:true}).click();await region.getByRole('article',{name:'目录迁移预览',exact:true}).waitFor();console.log('RELOCATION_STEP choose:end');};await choose();
 assert.deepEqual(inspectDatabaseBaseline(join(original,'ganksoft.sqlite'),original),before);assert.ok(await region.getByText(join(parent,'GankSoftData'),{exact:false}).count());
 await page.setViewportSize({width:720,height:900});assert.ok(await region.evaluate(el=>el.scrollWidth<=el.clientWidth));record('Chinese path and bounded preview fit narrow settings view');
 await region.getByRole('button',{name:'取消迁移',exact:true}).click();await region.getByText('已取消迁移，当前数据未改变',{exact:true}).waitFor();record('cancel closes snapshot and preserves active source');
 console.log('RELOCATION_STEP second-preview:start');await choose();console.log('RELOCATION_STEP second-preview:end');await region.getByRole('checkbox',{name:'我确认迁移全部活动数据到上述新目录',exact:true}).check();
 console.log('RELOCATION_STEP confirm:start');await Promise.all([page.waitForEvent('domcontentloaded',{timeout:15000}),region.getByRole('button',{name:'确认迁移目录',exact:true}).click()]);console.log('RELOCATION_STEP confirm:reloaded');await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
 const active=await app.evaluate(()=>globalThis.cardDraftTest.ctx.dataDir);assert.equal(active,join(parent,'GankSoftData'));
 assert.deepEqual(inspectDatabaseBaseline(join(original,'ganksoft.sqlite'),original),before);record('real Electron confirmation changes unique owner, retains old source and reloads workspace');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy()));await app.close();app=await launch();page=await app.firstWindow();page.setDefaultTimeout(15000);await page.setViewportSize({width:720,height:900});page.on('pageerror',e=>errors.push(e.message));
 await open();region=page.getByRole('region',{name:'迁移活动数据目录',exact:true});await region.getByRole('button',{name:'查询上次迁移结果',exact:true}).click();
 await region.getByText('上次迁移已提交，当前目录已重开',{exact:true}).waitFor();record('process restart reads durable relocation status and external owner');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}catch(e){console.error('RELOCATION_FAILURE',e);throw e;}finally{mkdirSync('validation-results',{recursive:true});writeFileSync('validation-results/s8c-relocation-ui.json',JSON.stringify({platform:process.platform,cases,errors,external,windowsManual:'NOT_RUN'},null,2));console.log('RELOCATION_STEP cleanup:start');if(app){try{await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy()));}catch{}await app.close().catch(()=>{});}f.close();}
console.log(JSON.stringify({cases,errors,external}));
