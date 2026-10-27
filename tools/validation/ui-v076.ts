// Production main only. Synthetic profiles; screenshots never contain user data.
import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),root=mkdtempSync(join(tmpdir(),'gank-v076-ui-'));
const stage=process.argv[2]??'P0',out=resolve('validation-results/v076',stage);mkdirSync(out,{recursive:true});
const errors:string[]=[],cases:unknown[]=[];
const report={stage,sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:true,platform:process.platform,entry:JSON.parse(readFileSync('package.json','utf8')).main,host:'production main',cases,errors,windowsVisual:'NOT_RUN',windows10Manual:'NOT_RUN',windows11Manual:'NOT_RUN',status:'FAIL'};
let app:Awaited<ReturnType<typeof electron.launch>>|undefined;
try{
 app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[]),resolve('.')],env:{...process.env,GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:join(root,'synthetic')}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
 assert.equal(page.url(),'gank-app://ui/index.html');
 for(const width of [1500,1366,900]){
  await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,900),width);
  assert.ok(await page.locator('.unified-shell').evaluate(el=>el.scrollWidth<=innerWidth),'No horizontal app overflow');
  assert.equal(await page.locator('.unified-sidebar').evaluate(el=>getComputedStyle(el).width),'68px');
  assert.equal(await page.getByRole('button',{name:'新建卡片集',exact:true}).evaluate(el=>getComputedStyle(el).borderRadius),'8px');
  assert.deepEqual(await page.getByRole('alert').allTextContents(),[]);
  await page.screenshot({path:join(out,`home-empty-${width}.png`),animations:'disabled',timeout:10000});
  cases.push({page:'home',data:'fresh606',width,status:'PASS'});
 }
 assert.deepEqual(errors,[]);report.status='PASS';
}finally{writeFileSync(join(out,'result.json'),JSON.stringify(report,null,2));await app?.close();rmSync(root,{recursive:true,force:true});}
console.log(JSON.stringify(report,null,2));
