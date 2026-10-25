import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {writeFileSync,readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {unifiedWorkspaceFixture} from '../../tests/fixtures/unified-workspace.ts';
const f=await unifiedWorkspaceFixture(),require=createRequire(import.meta.url),file=join(f.source.root,'window-state.json');
const cases:string[]=[],errors:string[]=[];let status='IN_PROGRESS',blocker='';let app:Awaited<ReturnType<typeof electron.launch>>|undefined;
f.release();
async function launch(){
 app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[]),resolve('tools/card-draft-spike/main.cjs')],env:{...process.env,GANKSOFT_DRAFT_TEST_CONTROL:f.control,GANKSOFT_DRAFT_TEST_SCOPE:'{}',GANKSOFT_UNIFIED_TEST_ENTRY:'workspace',GANKSOFT_TEST_WINDOW_STATE:file,GANKSOFT_TEST_OFFSCREEN:'1'}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.getByRole('button',{name:'系统设置',exact:true}).waitFor();
}
async function close(){if(app){const closed=app.waitForEvent('close');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.close()));await closed;app=undefined;}}
async function maximized(value:boolean,change=false){
 await app!.evaluate(async({BrowserWindow},{value,change})=>{
  const w=BrowserWindow.getAllWindows()[0];if(change){if(value)w.maximize();else w.unmaximize();}if(w.isMaximized()===value)return;
  await new Promise<void>((ok,fail)=>{const event=value?'maximize':'unmaximize',done=()=>{clearTimeout(timer);ok();},timer=setTimeout(()=>{w.removeListener(event,done);fail(Error('NATIVE_WINDOW_STATE_TIMEOUT'));},15000);w.once(event,done);});
 },{value,change});
}
try{
 await launch();
 const expected=await app!.evaluate(({BrowserWindow,screen})=>{const w=BrowserWindow.getAllWindows()[0],a=screen.getPrimaryDisplay().workArea;w.setBounds({x:a.x+20,y:a.y+20,width:Math.min(900,a.width-40),height:Math.min(760,a.height-40)});return w.getNormalBounds();});
 assert.ok(expected.width>0&&expected.height>0,'NATIVE_NORMAL_BOUNDS_UNAVAILABLE: headless platform returned zero normal size');
 await close();assert.deepEqual(JSON.parse(readFileSync(file,'utf8')).bounds,expected);
 await launch();assert.deepEqual(await app!.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].getNormalBounds()),expected);cases.push('native normal bounds persist across actual process close and restart');
 if(process.platform==='win32'){
  await maximized(true,true);await close();assert.equal(JSON.parse(readFileSync(file,'utf8')).maximized,true);
  await launch();await maximized(true);
  assert.deepEqual(await app!.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].getNormalBounds()),expected);
  await maximized(false,true);
  await close();assert.equal(JSON.parse(readFileSync(file,'utf8')).maximized,false);cases.push('native maximize/unmaximize preserve normal bounds through process restart');
 }else await close();
 writeFileSync(file,JSON.stringify({version:1,bounds:{x:999999,y:-999999,width:900,height:760},maximized:false}));
 await launch();assert.equal(await app!.evaluate(({BrowserWindow,screen})=>{const b=BrowserWindow.getAllWindows()[0].getBounds(),a=screen.getPrimaryDisplay().workArea;return b.x>=a.x&&b.y>=a.y&&b.x+b.width<=a.x+a.width&&b.y+b.height<=a.y+a.height;}),true);await close();cases.push('removed monitor restores the complete native window inside the current work area');
 writeFileSync(file,'broken-json');await launch();await close();assert.equal(JSON.parse(readFileSync(file,'utf8')).version,1);cases.push('corrupted state recovers on native close without preventing application startup');assert.deepEqual(errors,[]);status='PASS';
}catch(e){blocker=String(e);status=process.platform==='linux'&&blocker.includes('NATIVE_NORMAL_BOUNDS_UNAVAILABLE')?'BLOCKED':'FAIL';throw e;}finally{await close();mkdirSync('validation-results',{recursive:true});writeFileSync('validation-results/s7f-window.json',JSON.stringify({platform:process.platform,status,blocker,cases,errors,nativeMaximize:process.platform==='win32'?'executed':'NOT_RUN: headless desktop has no window manager',windowsManual:'NOT_RUN'},null,2));f.close();}
console.log(JSON.stringify({cases,errors}));
