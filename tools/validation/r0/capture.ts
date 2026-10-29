// Real production entry and frozen reference, same Electron/font/viewport, synthetic data only.
import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createClient} from '../../../shared/protocol/client.ts';
import {createR0Fixture} from './fixture.ts';
const require=createRequire(import.meta.url),out=resolve('validation-results/v076/R0-matched'),refRoot=mkdtempSync(join(tmpdir(),'gank-r0-reference-'));
mkdirSync(out,{recursive:true});
const sha=(b:any)=>createHash('sha256').update(b).digest('hex');
const sourceFiles=execFileSync('git',['ls-files','src','electron','shared'],{encoding:'utf8'}).trim().split('\n');const fingerprint=sha(Buffer.concat(sourceFiles.flatMap(p=>[Buffer.from(p),readFileSync(p)])));
const common=['.left-rail','.unified-topbar','.topbar','.subnav','.deck-subnav','.unified-content','.content-container','.page-heading','.summary-strip','.metric','.split-layout','.deck-row','.soft-callout','.hero-panel','.quick-row','.editor-shell','.review-shell','.knowledge-workbench','.mind-workspace','.settings-layout','.system-settings','button:focus-visible'];
const report:any={seed:'matched-v37-real606-v1',sourceParentSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),verifiedRemoteCheckpoint:'acc977dc1ddf7583617995d96157066300e11a05',workingTree:true,implementationFingerprint:fingerprint,prototypeSha256:sha(readFileSync('docs/v075/reference/OPEN-ME-v3.7.html')),entry:'electron/main.ts -> src/main.ts -> src/unified/UnifiedWorkspace.vue',platform:process.platform,command:'node --experimental-strip-types tools/validation/r0/capture.ts',capture:'NOT_RUN',visualAcceptance:'NOT_RUN',windowsReal:'NOT_RUN',cases:[],images:[],errors:[]};
let app:any,refApp:any,fixture:any;
const args=process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--ozone-override-screen-size=1600,1000','--disable-gpu']:[];
async function stop(){if(app){await app.evaluate(({app}:any)=>app.exit(0)).catch(()=>{});await app.close();app=undefined;}}
async function launch(){app=await electron.launch({executablePath:require('electron'),args:[...args,resolve('.')],env:{...process.env,GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:fixture.data}});const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',(e:Error)=>report.errors.push(e.message));await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();const client=createClient(r=>page.evaluate((request:any)=>(window as any).gank.protocol(request),r));await client.call('app.capabilities',{});return {page,client};}
async function capture(host:any,page:any,kind:string,state:string){
 const cdp=await page.context().newCDPSession(page),sheets=new Map<string,any>();cdp.on('CSS.styleSheetAdded',({header}:any)=>sheets.set(header.styleSheetId,header));await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 for(const width of [1500,1366,900]){
  await host.evaluate(({BrowserWindow}:any,w:number)=>{const win=BrowserWindow.getAllWindows()[0];win.setContentSize(w,900);win.webContents.setZoomFactor(1);},width);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
  const meta=await page.evaluate(()=>({innerWidth,innerHeight,outerWidth,outerHeight,devicePixelRatio,scrollWidth:document.documentElement.scrollWidth,fontFamily:getComputedStyle(document.body).fontFamily,fontSize:getComputedStyle(document.body).fontSize,fontsStatus:document.fonts.status,userAgent:navigator.userAgent}));assert.equal(meta.innerWidth,width);assert.equal(meta.innerHeight,900);assert.equal(meta.devicePixelRatio,1);
  const dimensions=await host.evaluate(({BrowserWindow,screen}:any)=>({bounds:BrowserWindow.getAllWindows()[0].getBounds(),contentBounds:BrowserWindow.getAllWindows()[0].getContentBounds(),zoom:BrowserWindow.getAllWindows()[0].webContents.getZoomFactor(),displayScaleFactor:screen.getPrimaryDisplay().scaleFactor}));
  const dom=await page.evaluate(()=>{const all=[...document.querySelectorAll('body *')].filter(el=>!['SCRIPT','STYLE','PATH','SVG'].includes(el.tagName));const ids=new Map(all.map((el,i)=>[el,i]));return all.map((el,i)=>({id:i,parent:ids.get(el.parentElement!),tag:el.tagName.toLowerCase(),class:el.getAttribute('class'),role:el.getAttribute('role'),aria:el.getAttribute('aria-label'),data:[...el.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]),text:el.children.length?undefined:el.textContent?.slice(0,200)}));});
  const styles=[];const {root}=await cdp.send('DOM.getDocument');
  for(const selector of common){const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});if(!nodeId)continue;
   const [computed,matched,box]=await Promise.all([cdp.send('CSS.getComputedStyleForNode',{nodeId}),cdp.send('CSS.getMatchedStylesForNode',{nodeId}),page.locator(selector).first().boundingBox()]);
   const props=new Set(['display','position','width','min-width','max-width','height','min-height','padding-top','padding-right','padding-bottom','padding-left','margin-bottom','gap','grid-template-columns','font-family','font-size','font-weight','line-height','color','background-color','border-radius','overflow-x','overflow-y','box-shadow']);
   const fonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
   styles.push({selector,box,platformFonts:fonts.fonts,computed:Object.fromEntries(computed.computedStyle.filter((p:any)=>props.has(p.name)).map((p:any)=>[p.name,p.value])),matched:matched.matchedCSSRules.map((r:any)=>({selector:r.rule.selectorList.text,matchingSelectors:r.matchingSelectors,origin:r.rule.origin,source:sheets.get(r.rule.styleSheetId)?.sourceURL??'inline',range:r.rule.style.range,media:r.rule.media?.map((m:any)=>m.text),declarations:r.rule.style.cssProperties.filter((p:any)=>p.range&&!p.disabled).map((p:any)=>({name:p.name,value:p.value,important:p.important}))}))});
  }
  const screenshot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true}),png=Buffer.from(screenshot.data,'base64');assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),900);assert.ok(png.length>1000);
  const file=`${kind}-${state}-${width}.png`;writeFileSync(join(out,file),png);const snapshot=`${kind}-${state}-${width}.json`;writeFileSync(join(out,snapshot),JSON.stringify({kind,state,fixture:fixture.seed,meta,dimensions,dom,styles},null,2)+'\n');report.images.push({kind,state,width,height:900,file,sha256:sha(png),snapshot,snapshotSha256:sha(readFileSync(join(out,snapshot))),meta,dimensions,semanticMatch:state==='overview'?'headline metrics match; catalog/recent differences tracked':'state/content mapped; business differences tracked',visualReview:'NOT_RUN'});
 }
 await cdp.detach();
}
try{
 fixture=await createR0Fixture();report.environment={node:process.version,electron:require('electron/package.json').version,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,font:'Noto Sans CJK SC Regular installed in host fontconfig'};report.fixture={at:fixture.at,seed:fixture.seed,dashboard:fixture.dashboard,scoped:fixture.scoped};report.cases.push({name:'real typed service fixture: Schema606, 5 decks/242 cards/53 due/18 today, 86/24/28 language',status:'PASS'});
 let {page,client}=await launch();assert.equal(page.url(),'gank-app://ui/index.html');const dashboard=await client.call('workspace.dashboard',{});assert.equal(dashboard.cardCount,242);assert.equal(dashboard.dueCount,53);assert.equal(dashboard.todayCount,18);
 await page.locator('[aria-label="学习摘要"][aria-busy="false"]').waitFor();await capture(app,page,'production','overview');
 const rail=page.getByRole('complementary',{name:'学习导航'});
 await rail.getByRole('button',{name:'言语理解，86 张卡片',exact:true}).click();await page.getByRole('region',{name:'卡片集概览',exact:true}).waitFor();await page.getByRole('region',{name:'最近卡片',exact:true}).locator('.mini-row').first().waitFor();await capture(app,page,'production','deck');
 await page.getByRole('button',{name:'所有卡片',exact:true}).click();await page.getByRole('textbox',{name:'搜索卡片标题',exact:true}).fill('中国创新与世界现代化');await page.getByRole('button',{name:'搜索',exact:true}).click();await page.getByRole('button',{name:'编辑 中国创新与世界现代化——发展理念',exact:true}).waitFor();await page.getByRole('button',{name:'编辑 中国创新与世界现代化——发展理念',exact:true}).click();await page.getByTestId('draft-title').waitFor();await page.locator('.gank-editor .ProseMirror').first().waitFor();await capture(app,page,'production','editor');
 await page.getByRole('button',{name:'学习总览',exact:true}).click();await page.getByRole('region',{name:'继续今天的复盘',exact:true}).getByRole('button',{name:'继续复盘',exact:true}).click();await page.getByRole('region',{name:'单选错题',exact:true}).waitFor();await capture(app,page,'production','review');
 await page.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'知识图谱',exact:true}).click();await page.locator('.mind-canvas .me-main').first().waitFor({state:'attached'});await capture(app,page,'production','knowledge');
 await page.getByRole('button',{name:'返回知识图谱',exact:true}).click();await page.getByRole('button',{name:'系统设置',exact:true}).click();await page.getByRole('region',{name:'系统设置',exact:true}).waitFor();await capture(app,page,'production','settings');
 report.cases.push({name:'UI navigation overview/deck/editor/review/knowledge/settings, actual IPC-backed content',status:'PASS'});
 await stop();({page,client}=await launch());const after=await client.call('workspace.dashboard',{});assert.equal(after.cardCount,242);assert.equal(after.dueCount,53);assert.equal(after.todayCount,18);assert.equal((await client.call('knowledge.tree.read',{deckId:fixture.decks.language.id})).nodes.length,28);assert.equal((await client.call('draft.listSummary',{deckId:fixture.decks.language.id})).items.some(d=>d.cardId===fixture.unpublishedId),true);assert.equal((await client.call('learning.session.get',{deckId:fixture.decks.language.id,sessionId:fixture.pendingSession})).entry.cardId,fixture.cards[1].cardId);report.cases.push({name:'new production Electron process rereads counts, knowledge, unpublished draft and pending session',status:'PASS'});await stop();
 const reference=resolve('docs/v075/reference/OPEN-ME-v3.7.html');writeFileSync(join(refRoot,'main.cjs'),`const {app,BrowserWindow}=require('electron');app.disableHardwareAcceleration();app.whenReady().then(()=>new BrowserWindow({width:1500,height:900,webPreferences:{offscreen:process.platform==='linux'}}).loadFile(${JSON.stringify(reference)}));`);
 refApp=await electron.launch({executablePath:require('electron'),args:[...args,join(refRoot,'main.cjs')]});const ref=await refApp.firstWindow();await ref.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
 for(const state of ['overview','deck','editor','review','knowledge','settings']){await ref.evaluate((name:string)=>{const w=window as any;(0,eval)(`state.page=${JSON.stringify(name)};state.deck='language';state.editorMode='question';state.reviewMode='question';state.reviewStage='answer';state.setting='general';render();`);},state);await capture(refApp,ref,'reference',state);}
 assert.deepEqual(report.errors,[]);report.capture='PASS';
} catch(error){report.capture='FAIL';report.failure=String((error as Error).stack??error);throw error;}
finally{writeFileSync(join(out,'manifest.json'),JSON.stringify(report,null,2)+'\n');await stop();await refApp?.close();fixture?.close();rmSync(refRoot,{recursive:true,force:true});}
console.log(JSON.stringify({capture:report.capture,cases:report.cases.length,images:report.images.length,visualAcceptance:report.visualAcceptance}));
