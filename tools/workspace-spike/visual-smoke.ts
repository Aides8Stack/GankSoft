import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {unifiedWorkspaceFixture} from '../../tests/fixtures/unified-workspace.ts';
const f=await unifiedWorkspaceFixture(),require=createRequire(import.meta.url),shots:{page:string;width:number;file:string}[]=[],errors:string[]=[],external:string[]=[];
for(const mode of ['question','qa','direct'] as const)await f.card(mode);f.release();let app:Awaited<ReturnType<typeof electron.launch>>|undefined;
try{
 app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[]),resolve('tools/card-draft-spike/main.cjs')],env:{...process.env,GANKSOFT_DRAFT_TEST_CONTROL:f.control,GANKSOFT_DRAFT_TEST_SCOPE:'{}',GANKSOFT_UNIFIED_TEST_ENTRY:'workspace',GANKSOFT_TEST_OFFSCREEN:'1'}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{external.push(r.request().url());return r.abort();});mkdirSync('validation-results/s7f-visual',{recursive:true});
 async function size(width:number){await app!.evaluate(({BrowserWindow},w)=>BrowserWindow.getAllWindows()[0].setContentSize(w,900),width);await page.setViewportSize({width,height:900});}
 async function capture(name:string){for(const width of [1366,720]){await size(width);assert.ok(await page.locator('.unified-shell').evaluate(el=>el.scrollWidth<=innerWidth));const file=`validation-results/s7f-visual/${name}-${width}.png`;await page.screenshot({path:resolve(file),animations:'disabled',caret:'hide',timeout:10000});shots.push({page:name,width,file});}console.log('S7F_VISUAL',name);}
 async function list(){await page.getByRole('button',{name:'返回列表',exact:true}).click();await page.getByRole('textbox',{name:'搜索卡片标题',exact:true}).waitFor();}
 async function card(mode:string){await page.getByRole('textbox',{name:'搜索卡片标题',exact:true}).fill('合成'+mode);await page.getByRole('button',{name:'搜索',exact:true}).click();await page.getByRole('button',{name:'合成'+mode,exact:true}).click();await page.getByRole('button',{name:'编辑卡片',exact:true}).waitFor();}
 await size(1366);await page.getByRole('button',{name:'合成考试目录',exact:true}).waitFor();await capture('home');await page.getByRole('button',{name:'合成考试目录',exact:true}).click();await page.getByRole('button',{name:/合成错题/}).click();await page.getByRole('textbox',{name:'搜索卡片标题',exact:true}).waitFor();await capture('cards');
 await card('question');await page.getByText('合成题干',{exact:true}).waitFor();await page.getByText('复盘趋势与历史',{exact:true}).click();await capture('detail-history');await page.getByRole('button',{name:'编辑卡片',exact:true}).click();await page.getByTestId('draft-title').waitFor();await page.locator('.gank-editor .ProseMirror').first().waitFor();await capture('editor');await list();
 for(const mode of ['question','qa','direct']){await card(mode);await page.getByRole('button',{name:'复盘此卡片',exact:true}).click();await page.getByRole('region',{name:mode==='question'?'单选错题':mode==='qa'?'问答记忆':'直接记忆',exact:true}).waitFor();
  if(mode!=='direct'){if(mode==='question'){await page.getByRole('radio',{name:'甲',exact:true}).check();await page.getByLabel('独立思路',{exact:true}).fill('合成视觉验收独立思路');}await capture('review-'+mode+'-answer');await page.getByRole('button',{name:'揭示答案',exact:true}).click();}
  await page.getByLabel('知识漏洞',{exact:true}).waitFor();await capture('review-'+mode+'-score');await list();
 }
 await page.getByRole('button',{name:'卡片集概览',exact:true}).click();await page.getByText('当前卡片',{exact:true}).waitFor();await capture('deck-overview');await list();
 await page.getByRole('button',{name:'学习分析',exact:true}).click();await page.getByRole('region',{name:'复盘记录列表',exact:true}).waitFor();await capture('analytics');await list();
 await page.getByRole('button',{name:'筛选学习',exact:true}).click();await page.getByRole('button',{name:'预览学习队列',exact:true}).waitFor();await capture('filters');await list();
 await page.getByRole('button',{name:'复盘调度',exact:true}).click();await page.getByRole('button',{name:'保存调度设置',exact:true}).waitFor();await capture('schedule');await list();
 await page.getByRole('button',{name:'卡片回收站',exact:true}).click();await page.getByText('回收站为空。',{exact:true}).waitFor();await capture('recycle');await list();
 await page.getByRole('button',{name:'知识图谱',exact:true}).click();await page.locator('.mind-canvas .me-tpc').first().waitFor();assert.equal(await page.locator('.mind-canvas [data-nodeid="megank-root"]').innerText(),'合成错题');await capture('map-fullscreen');await page.getByRole('button',{name:'切换大纲模式',exact:true}).click();await page.getByRole('navigation',{name:'大纲分级目录',exact:true}).waitFor();await page.locator('.knowledge-markdown .ProseMirror').waitFor();await capture('markdown-outline');await page.getByRole('button',{name:'返回知识图谱',exact:true}).click();await page.getByRole('textbox',{name:'搜索卡片标题',exact:true}).waitFor();
 await page.getByRole('button',{name:'系统设置',exact:true}).click();await page.getByRole('combobox',{name:'主题',exact:true}).waitFor();await capture('system-settings');assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(shots.length,34);
}finally{mkdirSync('validation-results',{recursive:true});writeFileSync('validation-results/s7f-visual.json',JSON.stringify({platform:process.platform,shots,errors,external,visualReview:'PENDING actual image review; capture is not visual PASS',manualWin10Win11:'NOT_RUN'},null,2));if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy()));await app.close();}f.close();}
console.log(JSON.stringify({captures:shots.length,errors,external}));
