// Frozen HTML only. Reference images are never production acceptance.
import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),root=mkdtempSync(join(tmpdir(),'gank-reference-')),out=resolve('validation-results/v076/reference');mkdirSync(out,{recursive:true});
const reference=resolve('docs/v075/reference/OPEN-ME-v3.7.html'),hash=createHash('sha256').update(readFileSync(reference)).digest('hex');assert.equal(hash,'8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015');
writeFileSync(join(root,'main.cjs'),`const {app,BrowserWindow}=require('electron');app.disableHardwareAcceleration();app.whenReady().then(()=>{const w=new BrowserWindow({width:1366,height:900,show:true,webPreferences:{offscreen:process.platform==='linux'}});w.loadFile(${JSON.stringify(reference)});});`);
const pages=process.argv.slice(2);if(!pages.length)pages.push('overview','deck','cards','cardDetail','editor','review','analytics','knowledge','settings');
const report={referenceSha256:hash,platform:process.platform,zoom:1,font:'Noto Sans CJK SC fallback / Segoe UI on Windows',status:'FAIL',images:[]};let app;
try{
 app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--ozone-override-screen-size=1600,1000','--disable-gpu']:[]),join(root,'main.cjs')]});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
 const cdp=await page.context().newCDPSession(page);
 for(const name of pages){
  await page.evaluate(name=>{const [route,mode,stage]=name.split(':');state.page=route;if(route==='editor'&&mode)state.editorMode=mode;if(route==='review'&&mode)state.reviewMode=mode;if(route==='review'&&stage)state.reviewStage=stage;render();},name);
  for(const width of [1500,1366,900]){
   await app.evaluate(({BrowserWindow},w)=>BrowserWindow.getAllWindows()[0].setSize(w,900),width);
   // Headless Electron's offscreen nativeImage can encode a 1x1 bitmap despite a full layout.
   // CDP captures the actual compositor surface with an explicit, matching CSS viewport.
   await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
   await page.evaluate(()=>document.fonts.ready);
   const {data}=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});const png=Buffer.from(data,'base64');
   assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),900);assert.ok(png.length>1000,'Reject empty capture');
   const file=`reference-${name.replaceAll(':','-')}-${width}.png`;writeFileSync(join(out,file),png);report.images.push({page:name,width,height:900,file,sha256:createHash('sha256').update(png).digest('hex')});
  }
 }
 report.status='PASS';
}finally{writeFileSync(join(out,'manifest.json'),JSON.stringify(report,null,2));await app?.close();rmSync(root,{recursive:true,force:true});}
console.log(`Reference ${report.status}: ${report.images.length} validated captures`);
