// Reference evidence only, never production UI acceptance.
import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const require=createRequire(import.meta.url),root=mkdtempSync(join(tmpdir(),'gank-reference-')),out=resolve('validation-results/v076/reference');mkdirSync(out,{recursive:true});
writeFileSync(join(root,'main.cjs'),`const {app,BrowserWindow}=require('electron');app.whenReady().then(()=>{const w=new BrowserWindow({width:1366,height:900,show:false});w.loadFile(${JSON.stringify(resolve('docs/v075/reference/OPEN-ME-v3.7.html'))});});`);
let app;
try{app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[]),join(root,'main.cjs')]});const page=await app.firstWindow();await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();const b64=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));writeFileSync(join(out,'prototype-overview-1366.png'),Buffer.from(b64,'base64'));}finally{await app?.close();rmSync(root,{recursive:true,force:true});}
