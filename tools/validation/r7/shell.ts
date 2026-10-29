import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {verifyPrototype} from '../prototype-identity.ts';
import {execFileSync} from 'node:child_process';
import {b2Fixture} from '../../../tests/fixtures/ganksoft/b2.ts';
import {launch,stop} from './support.ts';
const out='docs/v076/rebuild-v37-source-first/stages/R7/evidence/shell';
mkdirSync(out,{recursive:true});
const attempt=process.env.R7_ATTEMPT??('run-'+Date.now());
const report:any={status:'FAIL',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),platform:process.platform,node:process.version,cases:[],errors:[],strictVisual:'NOT_RUN',windows:'NOT_RUN'};
let s:any,f:any;
const pass=(name:string,details:any={})=>{report.cases.push({name,status:'PASS',...details});console.log('PASS '+name);};
// R7.5 usability sampling: actual controls must remain visible, unobscured and
// reachable after scrolling. No screenshot or pixel parity requirement.
async function usable(page:any,label:string,control:any){
 for(const width of [1500,1366,900]){
  await s.app.evaluate(({BrowserWindow}:any,w:number)=>BrowserWindow.getAllWindows()[0].setContentSize(w,900),width);
  const c=await page.context().newCDPSession(page);
  try{
   await c.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
   await page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);});
   await control.scrollIntoViewIfNeeded();await control.click({trial:true});
   const geometry=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth}));
   assert.equal(geometry.width,width);assert.ok(geometry.scroll<=width+1,label+' page overflow');
   const box=await control.boundingBox();assert.ok(box&&box.width>0&&box.height>0&&box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=900+1,label+' control clipped');
   (report.usability??=[]).push({page:label,...geometry,status:'PASS'});
  }finally{await c.detach();}
 }
}
try{
 report.referenceIdentity=verifyPrototype();report.referenceSha256=report.referenceIdentity.rawSha256;
 f=await b2Fixture({metadata:'validation-results/r7-shell-'+attempt+'/fixture.json'});s=await launch(f);const p=s.page,pid=s.app.process().pid;
 p.on('pageerror',(e:Error)=>report.errors.push(e.message));assert.equal(p.url(),'gank-app://ui/index.html');
 await usable(p,'学习总览',p.getByRole('button',{name:'返回学习总览',exact:true}));
 const rail=p.getByRole('complementary',{name:'学习导航',exact:true});assert.equal(await rail.count(),1);assert.equal(await rail.getByRole('button',{name:'回收站',exact:true}).count(),0);
 await rail.getByRole('button',{name:new RegExp('^'+f.deck.name+'，')}).click();
 const nav=p.getByRole('navigation',{name:'卡片集功能',exact:true});
 assert.deepEqual(await nav.getByRole('button').allTextContents(),['概览','所有卡片','筛选学习','开始复盘','图片资源','知识图谱','学习分析','导入导出','调度设置']);
 const layout=[];
 for(const width of [900,1366,1500]){await s.app.evaluate(({BrowserWindow}:any,w:number)=>BrowserWindow.getAllWindows()[0].setContentSize(w,900),width);const c=await p.context().newCDPSession(p);await c.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});const data=await p.evaluate(()=>({width:innerWidth,rail:document.querySelector('.left-rail')!.getBoundingClientRect().width,rails:document.querySelectorAll('aside[aria-label="学习导航"]').length,scroll:document.documentElement.scrollWidth,topbar:document.querySelectorAll('.topbar').length}));assert.ok(data.rail>0&&data.rail<width,'navigation must leave usable page space');assert.equal(data.width,width);assert.equal(data.rails,1);assert.equal(data.topbar,1);assert.ok(data.scroll<=width+1);layout.push(data);await c.detach();}
 pass('formal production entry, frozen reference, one usable text rail/topbar and current9 deck entries',{layout});
 for(const name of ['所有卡片','筛选学习','图片资源','学习分析','导入导出','调度设置','概览']){await nav.getByRole('button',{name,exact:true}).click();await p.waitForFunction(()=>!document.querySelector('[role=alert]'));assert.equal(await nav.getByRole('button',{name,exact:true}).getAttribute('aria-current'),'page');if(name==='所有卡片')await usable(p,'卡片集',p.getByRole('textbox',{name:'搜索卡片标题',exact:true}));if(name==='学习分析')await usable(p,'学习分析',p.getByRole('combobox',{name:'分析时间范围',exact:true}));}
 pass('current deck pages mount through production Vue navigation');
 await nav.getByRole('button',{name:'所有卡片',exact:true}).click();await p.getByRole('textbox',{name:'搜索卡片标题',exact:true}).fill('B2 保持');await p.getByRole('button',{name:'搜索',exact:true}).click();const selected=p.getByRole('checkbox',{name:'选择 B2 保持发布和历史',exact:true});await selected.check();
 await p.getByRole('button',{name:'系统设置',exact:true}).click();const system=p.getByRole('region',{name:'系统设置',exact:true});await system.getByRole('navigation',{name:'设置分类'}).getByRole('button',{name:'回收站',exact:true}).click();await system.getByRole('region',{name:'统一回收站'}).waitFor();
 for(const name of ['卡片','卡片集','知识点'])await system.getByRole('navigation',{name:'回收站分类'}).getByRole('button',{name,exact:true}).click();
 await system.getByRole('button',{name:'返回原页面',exact:true}).click();assert.equal(await p.getByRole('textbox',{name:'搜索卡片标题',exact:true}).inputValue(),'B2 保持');assert.equal(await selected.isChecked(),true);
 await rail.getByRole('button',{name:new RegExp('^'+f.secondDeck.name+'，')}).click();await nav.getByRole('button',{name:'所有卡片',exact:true}).click();assert.equal(await p.locator('.data-table tbody tr').count(),0);await rail.getByRole('button',{name:new RegExp('^'+f.deck.name+'，')}).click();await nav.getByRole('button',{name:'所有卡片',exact:true}).click();assert.equal(await selected.isChecked(),true);assert.equal(await p.getByRole('textbox',{name:'搜索卡片标题',exact:true}).inputValue(),'B2 保持');
 pass('settings embedded3 recycle scopes and deck switching preserve isolated query/selection');
 await p.getByRole('button',{name:'编辑 B2 保持发布和历史',exact:true}).click();await p.getByTestId('draft-title').fill('R7.1 离页草稿');await usable(p,'编辑器',p.getByTestId('draft-title'));
 const published=await s.api.call('card.getPublishedContent',f.card);await p.getByRole('button',{name:'系统设置',exact:true}).click();await system.waitFor();const saved=await s.api.call('draft.get',f.card);assert.equal(saved.title,'R7.1 离页草稿');assert.deepEqual(await s.api.call('card.getPublishedContent',f.card),published);await system.getByRole('button',{name:'返回原页面',exact:true}).click();assert.equal(await p.getByTestId('draft-title').inputValue(),'R7.1 离页草稿');
 await nav.getByRole('button',{name:'所有卡片',exact:true}).click();await p.getByRole('button',{name:'学习选中卡片',exact:true}).click();const finish=p.getByRole('button',{name:'完成复盘',exact:true}),reflection=p.getByRole('textbox',{name:'反思（可选）',exact:true});await finish.or(reflection).waitFor();if(await finish.isVisible()){await finish.click();await p.getByRole('button',{name:'返回卡片列表',exact:true}).click();await p.getByRole('button',{name:'学习选中卡片',exact:true}).click();}await p.getByRole('textbox',{name:'反思（可选）',exact:true}).fill('R7.1 复盘离页');await usable(p,'复盘',p.getByRole('textbox',{name:'反思（可选）',exact:true}));await p.getByRole('button',{name:'系统设置',exact:true}).click();await system.waitFor();await system.getByRole('button',{name:'返回原页面',exact:true}).click();assert.equal(await p.getByRole('textbox',{name:'反思（可选）',exact:true}).inputValue(),'R7.1 复盘离页');
 await p.getByRole('button',{name:'返回卡片列表',exact:true}).click();await nav.getByRole('button',{name:'知识图谱',exact:true}).click();await p.locator('.mind-canvas .me-tpc').first().waitFor();await usable(p,'知识图谱',p.getByRole('button',{name:'返回所有卡片',exact:true}));await p.getByRole('button',{name:'返回所有卡片',exact:true}).click();
 pass('editor leave flush protects publication; review pause/return preserves thought; actual MindElixir mounts');
 const sessions=await s.api.call('workspace.sessions',{deckId:f.deck.id});await stop(s.app,f.data);s=null;s=await launch(f);assert.notEqual(s.app.process().pid,pid);assert.deepEqual(await s.api.call('draft.get',f.card),saved);assert.deepEqual(await s.api.call('card.getPublishedContent',f.card),published);assert.deepEqual(await s.api.call('workspace.sessions',{deckId:f.deck.id}),sessions);pass('normal close releases lease; new ElectronPID exactly restores draft/publication/review sessions',{oldPid:pid,newPid:s.app.process().pid});
 assert.equal(report.usability.length,18);pass('R7.5 six production pages: three widths each, real controls reachable without clipping');assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.errors.push(String((e as Error).stack??e));process.exitCode=1;if(s)writeFileSync(out+'/failure-'+attempt+'.txt',await s.page.locator('body').innerText().catch(()=>''));}
finally{if(s){if(report.status!=='PASS')await s.app.evaluate(({BrowserWindow}:any)=>BrowserWindow.getAllWindows().forEach((w:any)=>w.destroy()));await stop(s.app,f.data);}writeFileSync(out+'/attempt-'+attempt+'.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
