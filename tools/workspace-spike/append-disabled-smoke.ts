import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {unifiedWorkspaceFixture} from '../../tests/fixtures/unified-workspace.ts';
import {inspectDatabaseBaseline} from '../../electron/infrastructure/migrations/baseline.ts';
const f=await unifiedWorkspaceFixture(),require=createRequire(import.meta.url),cases:string[]=[],errors:string[]=[];
await f.card('qa');const data=f.ctx.dataDir,before=inspectDatabaseBaseline(join(data,'ganksoft.sqlite'),data);f.release();
let app:Awaited<ReturnType<typeof electron.launch>>|undefined;
try{
 app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[]),resolve('tools/card-draft-spike/main.cjs')],env:{...process.env,GANKSOFT_DRAFT_TEST_CONTROL:f.control,GANKSOFT_DRAFT_TEST_SCOPE:'{}',GANKSOFT_UNIFIED_TEST_ENTRY:'workspace',GANKSOFT_TEST_FULL_RESTORE:'1',GANKSOFT_TEST_OFFSCREEN:'1'}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.setViewportSize({width:1366,height:900});page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('button',{name:'系统设置',exact:true}).click();await page.getByRole('button',{name:'备份与恢复',exact:true}).click();
 assert.equal(await page.getByRole('region',{name:'追加外部数据库',exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'选择外部数据库',exact:true}).count(),0);
 assert.ok(await page.getByRole('button',{name:'导出完整备份',exact:true}).isEnabled());
 cases.push('production settings remove external append and retain full backup, content exchange and directory relocation');
 const result=await page.evaluate(async()=>{
  const g=(window as unknown as {gank:{protocol:(q:unknown)=>Promise<any>}}).gank;
  const call=(method:string,payload:unknown={})=>g.protocol({protocol:{major:2,minor:0},requestId:crypto.randomUUID(),dataEpoch:null,method,payload});
  const caps=await call('app.capabilities');
  const disabled=[];for(const method of ['open','decks','preview','cancel','confirm','status'])disabled.push(await call('storage.append.'+method));
  return {caps,disabled};
 });
 assert.ok(!result.caps.data.definedMethods.some((m:string)=>m.startsWith('storage.append.')));
 assert.ok(!result.caps.data.supportedMethods.some((m:string)=>m.startsWith('storage.append.')));
 for(const r of result.disabled){assert.equal(r.ok,false);assert.equal(r.error.code,'METHOD_UNSUPPORTED');assert.equal(r.error.outcome,'rejected');}
 assert.deepEqual(inspectDatabaseBaseline(join(data,'ganksoft.sqlite'),data),before);
 cases.push('real preload IPC has no registered contract/handler for six stale requests without changing database/media or active pointer');assert.deepEqual(errors,[]);
}finally{
 mkdirSync('validation-results',{recursive:true});writeFileSync('validation-results/s8b-isolation-ui.json',JSON.stringify({platform:process.platform,cases,errors,legacyUi:'CANCELLED_BY_OWNER; original append-smoke.ts retained',windowsManual:'NOT_RUN'},null,2));
 if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy())).catch(()=>{});await app.close();}f.close();
}
console.log(JSON.stringify({cases,errors}));
