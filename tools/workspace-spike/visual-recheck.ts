import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {unifiedWorkspaceFixture} from '../../tests/fixtures/unified-workspace.ts';
const f=await unifiedWorkspaceFixture(),require=createRequire(import.meta.url),cases:string[]=[],images:string[]=[],errors:string[]=[],external:string[]=[];
for(const mode of ['question','qa','direct'] as const)await f.card(mode);f.release();let app:Awaited<ReturnType<typeof electron.launch>>|undefined;
try{
 app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[]),resolve('tools/card-draft-spike/main.cjs')],env:{...process.env,GANKSOFT_DRAFT_TEST_CONTROL:f.control,GANKSOFT_DRAFT_TEST_SCOPE:'{}',GANKSOFT_UNIFIED_TEST_ENTRY:'workspace',GANKSOFT_TEST_OFFSCREEN:'1'}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{external.push(r.request().url());return r.abort();});mkdirSync('validation-results/s7f-recheck',{recursive:true});
 async function size(width:number){await app!.evaluate(({BrowserWindow},w)=>BrowserWindow.getAllWindows()[0].setContentSize(w,900),width);await page.setViewportSize({width,height:900});}
 async function picture(name:string,width:number){const path=`validation-results/s7f-recheck/${name}-${width}.png`;await page.screenshot({path,timeout:10000,animations:'disabled',caret:'hide'});images.push(path);}
 async function list(){await page.getByRole('button',{name:'返回列表',exact:true}).click();await page.getByRole('textbox',{name:'搜索卡片标题',exact:true}).waitFor();}
 async function review(mode:string){await page.getByRole('textbox',{name:'搜索卡片标题',exact:true}).fill('合成'+mode);await page.getByRole('button',{name:'搜索',exact:true}).click();await page.getByRole('button',{name:'合成'+mode,exact:true}).click();await page.getByRole('button',{name:'复盘此卡片',exact:true}).click();}
 await size(1366);await page.getByRole('button',{name:'合成考试目录',exact:true}).click();await page.getByRole('region',{name:'卡片集目录',exact:true}).getByRole('button',{name:/合成错题/}).click();await page.getByRole('region',{name:'卡片集概览',exact:true}).waitFor();await page.getByRole('button',{name:'所有卡片',exact:true}).click();
 for(const mode of ['question','qa','direct']){
  await review(mode);
  if(mode==='question'){
   await page.getByRole('radio',{name:'甲',exact:true}).check();await page.getByLabel('独立思路',{exact:true}).fill('合成独立思路');
   for(const width of [1366,720]){await size(width);assert.equal(await page.locator('.review-option').evaluateAll(rows=>rows.every(row=>{const input=row.querySelector('input')!.getBoundingClientRect(),text=row.querySelector('.gank-content')!.getBoundingClientRect();return input.width<=24&&text.x-input.right>=0&&text.x-input.right<=24&&text.width>100;})),true);await picture('review-question-answer',width);}
   const radio=page.getByRole('radio',{name:'乙',exact:true});await radio.focus();await radio.press('Space');assert.equal(await radio.isChecked(),true);
  }
  if(mode!=='direct')await page.getByRole('button',{name:'揭示答案',exact:true}).click();await page.getByLabel('知识漏洞',{exact:true}).waitFor();
  for(const width of [1366,720]){
   await size(width);const practice=page.getByRole('checkbox',{name:'仅练习，不更新排期',exact:true});await practice.scrollIntoViewIfNeeded();assert.equal(await practice.evaluate(el=>{const r=el.getBoundingClientRect(),label=el.closest('label')!.getBoundingClientRect();return r.width<=24&&r.x-label.x<24&&r.y>=label.y&&r.bottom<=label.bottom;}),true);
   await practice.focus();await practice.press('Space');assert.equal(await practice.isChecked(),true);await practice.press('Space');assert.equal(await practice.isChecked(),false);
   const score=page.getByRole('slider');await score.focus();await score.press('ArrowRight');const save=page.getByRole('button',{name:'保存本次复盘',exact:true});await save.scrollIntoViewIfNeeded();assert.equal(await save.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.y>=0&&r.bottom<=innerHeight&&!!hit&&el.contains(hit);}),true);
   await page.locator('.unified-content').evaluate(el=>el.scrollTop=0);await picture('review-'+mode+'-score',width);
  }
  cases.push(mode+' review: aligned controls, Space/arrow keyboard input and reachable bottom save at1366/720');await list();
 }
 await page.getByRole('button',{name:'知识图谱',exact:true}).click();await page.locator('.mind-canvas .me-tpc').first().waitFor();await page.getByRole('button',{name:'切换大纲模式',exact:true}).click();await page.getByRole('navigation',{name:'大纲分级目录',exact:true}).waitFor();
 for(const width of [1366,720]){
  await size(width);await page.waitForFunction(()=>{const toolbar=document.querySelector('.mind-tools')!.getBoundingClientRect(),outline=document.querySelector('.native-outline-workbench')!.getBoundingClientRect();return outline.top>=toolbar.bottom+8;});
  const nav=page.getByRole('navigation',{name:'大纲分级目录',exact:true}),root=nav.getByRole('button',{name:'合成根甲',exact:true});await root.focus();await root.press('Enter');await page.locator('.outline-body h2').filter({hasText:'合成根甲'}).waitFor();
  assert.equal(await root.evaluate(el=>{const r=el.getBoundingClientRect(),t=document.querySelector('.mind-tools')!.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.y>t.bottom&&!!hit&&el.contains(hit);}),true);
  const title=await page.locator('.outline-body>h2').boundingBox(),tools=await page.getByRole('toolbar',{name:'导图工具栏',exact:true}).boundingBox();assert.ok(title&&tools&&title.y>tools.y+tools.height);
  const back=page.getByRole('button',{name:'返回知识图谱',exact:true});await back.focus();assert.equal(await page.getByRole('tooltip').innerText(),'返回知识图谱');await root.focus();await picture('markdown-outline',width);
 }cases.push('outline: actual wrapping toolbar reserves document/TOC space, first row/title stay clickable and keyboard tooltip remains Chinese');
 assert.equal(images.length,10);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{mkdirSync('validation-results',{recursive:true});writeFileSync('validation-results/s7f-recheck.json',JSON.stringify({platform:process.platform,cases,images,errors,external,visualReview:'PENDING actual image review; geometry is not a substitute for reading images',windowsManual:'NOT_RUN'},null,2));if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy()));await app.close();}f.close();}
console.log(JSON.stringify({cases,images:images.length,errors,external}));
