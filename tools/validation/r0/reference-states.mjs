// Enumerate frozen-reference DOM contracts. No production behavior is certified here.
import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),root=mkdtempSync(join(tmpdir(),'gank-r0-states-')),reference=resolve('docs/v075/reference/OPEN-ME-v3.7.html'),out='docs/v076/rebuild-v37-source-first/stages/R0/evidence';mkdirSync(out,{recursive:true});
const hash=createHash('sha256').update(readFileSync(reference)).digest('hex');assert.equal(hash,'8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015');
writeFileSync(join(root,'main.cjs'),`const {app,BrowserWindow}=require('electron');app.whenReady().then(()=>new BrowserWindow({width:1366,height:900,webPreferences:{offscreen:process.platform==='linux'}}).loadFile(${JSON.stringify(reference)}));`);
const scenarios=[];
for(const page of ['overview','deck','cards','cardDetail','filter','analytics','exchange','schedule','settings','knowledge','knowledgeTransfer'])scenarios.push({id:page,page});
for(const mode of ['question','recall','reading']){scenarios.push({id:'editor-'+mode,page:'editor',editorMode:mode});for(const reviewStage of ['answer','reveal','result'])scenarios.push({id:`review-${mode}-${reviewStage}`,page:'review',reviewMode:mode,reviewStage});}
for(const setting of ['general','review','data','appearance','about','trash'])scenarios.push({id:'settings-'+setting,page:'settings',setting});
for(const modal of ['switchEditorMode','knowledgePicker','paste','copyCard','copyPrompt','media','deleteMedia','batchOptions','promptManager','newKnowledge','batchExport','batchDelete','permanentTrash','historyDetail','demo'])scenarios.push({id:'modal-'+modal,page:'editor',modal});
for(const view of ['map','outline'])for(const fullscreen of [false,true])scenarios.push({id:`knowledge-${view}-${fullscreen}`,page:'knowledge',knowledge:{view,fullscreen}});
for(const mode of ['import','export'])for(const step of ['select','preview'])scenarios.push({id:`transfer-${mode}-${step}`,page:'knowledgeTransfer',transfer:{mode,step}});
let app;const results=[],supplement=[];
try{
 app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[]),join(root,'main.cjs')]});const page=await app.firstWindow();await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
 for(const scenario of scenarios){
  await page.reload();await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
  await page.evaluate(s=>{globalThis.__scenario=s;(0,eval)(`Object.assign(state,{page:'editor',modal:null,deleteMediaId:1,pendingEditorMode:'recall',cardSelectedIds:[1,2],trashSelectedIds:['sample-trash-card']},__scenario);if(__scenario.knowledge)Object.assign(knowledgeState,__scenario.knowledge);if(__scenario.transfer)Object.assign(transfer,__scenario.transfer);render();`);},scenario);
  const contract=await page.evaluate(()=>({title:document.querySelector('#view h1')?.textContent,headings:[...document.querySelectorAll('#view h1,#view h2,#overlay-root h2')].map(n=>n.textContent),dom:[...document.querySelectorAll('#view *,#overlay-root *')].map(el=>({tag:el.tagName.toLowerCase(),classes:el.className instanceof SVGAnimatedString?el.className.baseVal:el.className,attributes:[...el.attributes].filter(a=>a.name.startsWith('data-')||a.name.startsWith('aria-')).map(a=>[a.name,a.value]),parentTag:el.parentElement?.tagName.toLowerCase()})),modal:!!document.querySelector('#modal-backdrop'),dimensions:{width:innerWidth,height:innerHeight},style:{fontFamily:getComputedStyle(document.body).fontFamily}}));
  if(['settings-appearance','knowledge-map-true'].includes(scenario.id)){
   const cdp=await page.context().newCDPSession(page);
   for(const width of [1500,1366,900]){
    await app.evaluate(({BrowserWindow},w)=>{BrowserWindow.getAllWindows()[0].setContentSize(w,900);BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1);},width);
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    await page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);});
    const {data}=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});const png=Buffer.from(data,'base64');assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),900);
    const file=`reference-${scenario.id}-${width}.png`;writeFileSync(join(out,file),png);
    supplement.push({scenario,file,width,height:900,sha256:createHash('sha256').update(png).digest('hex'),meta:await page.evaluate(()=>({innerWidth,innerHeight,outerWidth,outerHeight,deviceScaleFactor:devicePixelRatio,fontFamily:getComputedStyle(document.body).fontFamily})),platform:process.platform,zoom:1,prototypeSha256:hash,scope:'Supplementary matched appearance / full-map reference state; production unchanged'});
   }await cdp.detach();
  }
  assert.ok(contract.dom.length>0,scenario.id);if(scenario.modal)assert.equal(contract.modal,true);results.push({scenario,contract,status:'PASS',scope:'REFERENCE_DOM_ENUMERATION_ONLY',productionInteraction:'NOT_RUN'});
 }
 const report={prototypeSha256:hash,platform:process.platform,count:results.length,status:'PASS',scope:'Reference-render DOM contracts, no user-interaction or production API claim',results};
 writeFileSync(join(out,'supplemental-reference.json'),JSON.stringify(supplement,null,2)+'\n');
 writeFileSync(join(out,'reference-states.json.gz'),gzipSync(JSON.stringify(report,null,2)));
 writeFileSync(join(out,'reference-states-summary.json'),JSON.stringify({prototypeSha256:hash,count:results.length,status:'PASS',scenarios:results.map(r=>({id:r.scenario.id,domNodes:r.contract.dom.length,modal:r.contract.modal,status:r.status,scope:r.scope}))},null,2)+'\n');
 console.log(`PASS ${results.length} reference DOM states; production parity NOT_RUN`);
}finally{await app?.close();rmSync(root,{recursive:true,force:true});}
