import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,cpSync,rmSync,mkdtempSync} from 'node:fs';
import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {createClient} from '../../../shared/protocol/client.ts';
const require=createRequire(import.meta.url),hash=(b:any)=>createHash('sha256').update(b).digest('hex');
const out='docs/v076/rebuild-v37-source-first/stages/R2/'+(process.env.R2_EVIDENCE??'evidence-closure');mkdirSync(out,{recursive:true});
const seed='validation-results/r2-seed-v2',f=JSON.parse(readFileSync(seed+'/fixture.json','utf8'));
assert.ok(f.root.startsWith(join(tmpdir(),'gank-r0-matched-')));rmSync(f.root,{recursive:true,force:true});cpSync(seed+'/root',f.root,{recursive:true});
const args=['--no-sandbox','--ozone-platform=headless','--ozone-override-screen-size=1600,1000','--disable-gpu'];
const report:any={status:'FAIL',fixture:'REUSED matched-v37-real606-v1',cases:[],captures:[],errors:[],windows:'NOT_RUN',referenceSha256:hash(readFileSync('docs/v075/reference/OPEN-ME-v3.7.html'))};
let app:any,refApp:any;const temp=mkdtempSync(join(tmpdir(),'gank-r2-closure-'));
const selectors=['.left-rail','.content-container','.page-heading','.page-heading h1','.page-heading p','.heading-actions','.heading-actions button','.summary-strip','.metric','.split-layout','.split-layout>.surface','.deck-list','.deck-row','.deck-row-main','.deck-row-main strong','.deck-row-main small','.deck-row-meta','.soft-callout','.mini-row','.mini-row-main','.mini-row-main strong','.mini-row-main small','.mini-row-end','.deck-statline','.hero-panel','.quick-row','.subsection-grid','.subsection-grid>.surface:last-child','.subsection-grid .metric','.progress-line','.progress-line+.mini-row','.progress-line+.mini-row+.mini-row','.subsection-grid>.surface:last-child>button'];
async function snapshots(host:any,p:any,kind:string,state:string){
 const cdp=await p.context().newCDPSession(p);
 for(const width of [1500,1366,900]){
  await host.evaluate(({BrowserWindow}:any,w:number)=>{const win=BrowserWindow.getAllWindows()[0];win.setContentSize(w,900);win.webContents.setZoomFactor(1);},width);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  await p.mouse.move(0,0);await p.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
  const snap=await p.evaluate((sels:string[])=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,scroll:document.querySelector('.content-scroller')?.scrollHeight,elements:sels.map(selector=>{const e=document.querySelector(selector);if(!e)return {selector,missing:true};const c=getComputedStyle(e),b=e.getBoundingClientRect();return {selector,text:e.textContent,box:{x:b.x,y:b.y,width:b.width,height:b.height},css:Object.fromEntries(['display','padding','marginTop','marginBottom','gap','fontSize','fontWeight','lineHeight','textAlign','color','backgroundColor','borderColor','borderBottomWidth','minHeight','alignItems','gridTemplateColumns','whiteSpace'].map(k=>[k,(c as any)[k]]))};})}),selectors);
  assert.equal(snap.width,width);assert.equal(snap.dpr,1);assert.equal(snap.elements[0].box?.width,213);
  const name=`${kind}-${state}-${width}`;writeFileSync(join(out,name+'.json'),JSON.stringify(snap,null,2)+'\n');
  if(kind==='production'&&!process.env.R2_INSPECT){const png=Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true})).data,'base64');assert.equal(png.readUInt32BE(16),width);writeFileSync(join(out,name+'.png'),png);report.captures.push({file:name+'.png',sha256:hash(png)});}
 }
 await cdp.detach();
}
async function start(){app=await electron.launch({executablePath:require('electron'),args:[...args,resolve('.')],env:{...process.env,TZ:'Asia/Shanghai',GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:f.data}});const p=await app.firstWindow();p.setDefaultTimeout(12000);p.on('pageerror',(e:Error)=>report.errors.push(e.message));await p.locator('[aria-label="学习摘要"][aria-busy="false"]').waitFor();return p;}
async function stop(){if(app){await app.evaluate(({app}:any)=>app.exit(0)).catch(()=>{});await app.close();app=undefined;}}
const record=(name:string)=>report.cases.push({name,status:'PASS'});
try{
 let p=await start();assert.deepEqual(await p.locator('.metric .number').allTextContents(),['5','242','53','18']);
 const rows=await p.locator('.r2-overview .deck-row').evaluateAll((els:Element[])=>els.map(e=>({name:e.querySelector('.deck-row-main strong')!.textContent,path:e.querySelector('.deck-row-main small')!.textContent})));
 await snapshots(app,p,'production','overview');await p.locator('.deck-row').filter({hasText:'言语理解'}).click();await p.locator('[aria-label="卡片集概览"][aria-busy="false"]').waitFor();await snapshots(app,p,'production','deck');
 if(!process.env.R2_INSPECT&&!process.env.R2_CAPTURE_ONLY){
  const nav=p.getByRole('navigation',{name:'卡片集功能'});assert.deepEqual(await nav.getByRole('button').allTextContents(),['概览','所有卡片','筛选学习','开始复盘','知识图谱','学习分析','导入导出','调度设置']);record('real606 totals and R1 eight-tab navigation');
  await p.locator('.hero-panel').getByRole('button',{name:'继续学习',exact:true}).click();await p.getByRole('textbox',{name:'独立思路',exact:true}).fill('R2 视觉收尾续学');await p.getByRole('button',{name:'系统设置',exact:true}).click();const settings=p.getByRole('region',{name:'系统设置',exact:true});await settings.getByRole('navigation',{name:'设置分类'}).getByRole('button',{name:'回收站',exact:true}).click();for(const name of ['卡片','卡片集','知识点'])await settings.getByRole('navigation',{name:'回收站分类'}).getByRole('button',{name,exact:true}).click();await settings.getByRole('button',{name:'返回原页面',exact:true}).click();assert.equal(await p.getByRole('textbox',{name:'独立思路',exact:true}).inputValue(),'R2 视觉收尾续学');record('continue learning and settings embedded three-scope recycle preserve draft');
  await p.getByRole('button',{name:'学习总览',exact:true}).click();await p.locator('[aria-label="学习摘要"][aria-busy="false"]').waitFor();await p.locator('.catalog-management>summary').click();assert.equal(await p.getByRole('button',{name:'新建文件夹',exact:true}).isVisible(),true);await p.locator('.catalog-management>summary').click();record('folder management remains accessible at 900px');await stop();
  p=await start();await p.getByRole('region',{name:'继续今天的复盘'}).getByRole('button',{name:'继续学习',exact:true}).click();assert.equal(await p.getByRole('textbox',{name:'独立思路',exact:true}).inputValue(),'R2 视觉收尾续学');record('new Electron process resumes persisted thought');
 }
 await stop();
 writeFileSync(join(temp,'ref.cjs'),`const {app,BrowserWindow}=require('electron');app.whenReady().then(()=>new BrowserWindow({webPreferences:{offscreen:true}}).loadFile(${JSON.stringify(resolve('docs/v075/reference/OPEN-ME-v3.7.html'))}));`);refApp=await electron.launch({executablePath:require('electron'),args:[...args,join(temp,'ref.cjs')]});const ref=await refApp.firstWindow();await ref.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
 const project=(items:any[])=>items.map(c=>({id:c.cardId,title:c.title,deck:Object.keys(f.decks).find(k=>f.decks[k].id===c.deckId),mode:({question:'question',qa:'recall',direct:'reading'} as any)[c.mode],knowledge:c.knowledgeNames??[],reviews:c.reviewCount??0}));
 await ref.evaluate((items:any[])=>(0,eval)(`cards.splice(0,cards.length,...${JSON.stringify(items)});render()`),project(f.dashboard.recent));await snapshots(refApp,ref,'prototype','overview');
 // Content-only control: real folder paths, same insertion order; CSS and frozen rendering functions untouched.
 await ref.evaluate((items:any[])=>(0,eval)(`{const rows=${JSON.stringify(items)};const ordered=rows.map(r=>{const [k,d]=Object.entries(decks).find(([k,d])=>d.title===r.name);d.desc=r.path;return [k,d]});Object.keys(decks).forEach(k=>delete decks[k]);Object.assign(decks,Object.fromEntries(ordered));render();}`),rows);await snapshots(refApp,ref,'prototype-content-control','overview');
 // Restore original prototype deck description for the raw deck comparison.
 await ref.evaluate((items:any[])=>(0,eval)(`cards.splice(0,cards.length,...${JSON.stringify(items)});decks.language.desc='逻辑填空 · 片段阅读 · 语句表达';state.page='deck';state.deck='language';render()`),project(f.scoped.recentCards));await snapshots(refApp,ref,'prototype','deck');
 assert.deepEqual(report.errors,[]);report.status=process.env.R2_INSPECT?'DIAGNOSTIC':'PASS';
}catch(e){report.errors.push(String((e as Error).message).replaceAll(resolve('.'),'<repo>'));process.exitCode=1;}finally{writeFileSync(join(out,'manifest.json'),JSON.stringify(report,null,2)+'\n');await stop();await refApp?.close();rmSync(temp,{recursive:true,force:true});}
console.log(JSON.stringify({status:report.status,cases:report.cases,errors:report.errors}));
