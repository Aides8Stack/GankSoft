import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {b2Fixture} from '../../../tests/fixtures/ganksoft/b2.ts';
import {start,stop} from '../r5/support.ts';
const out=process.env.R6_SETTINGS_OUT??'docs/v076/rebuild-v37-source-first/stages/R6/evidence/settings';mkdirSync(out,{recursive:true});
const report:any={status:'FAIL',base:'dd64f033d469dec42c1bb688ffcaa113517ad6d6',cases:[],visual:[],errors:[]};let s:any,f:any;
const pass=(name:string,details:any={})=>{report.cases.push({name,status:'PASS',...details});console.log('PASS '+name);};
try{
 f=await b2Fixture({metadata:'validation-results/r6-settings/fixture.json'});s=await start(f.data);const p=s.page;
 await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:new RegExp('^'+f.deck.name+'，')}).click();
 await p.getByRole('button',{name:'本地用户设置',exact:true}).click();const system=p.getByRole('region',{name:'系统设置',exact:true}),nav=system.getByRole('navigation',{name:'设置分类',exact:true});
 const select=async(name:string)=>{await nav.getByRole('button',{name,exact:true}).click();await system.locator('.settings-main>.section-heading h2').filter({hasText:name}).waitFor();};
 await select('常规设置');assert.match(await system.innerText(),/简体中文/);assert.equal(await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:'回收站',exact:true}).count(),0);
 for(const name of ['外观与主题','数据管理','备份与恢复','回收站','待核对操作','外部 AI 协作','关于']){await select(name);assert.equal(await nav.getByRole('button',{name,exact:true}).getAttribute('aria-current'),'page');assert.equal(await system.locator('h2:focus').count(),1);}
 await select('数据管理');await system.getByText(/当前有效数据目录：/).waitFor();assert.equal(await system.getByRole('button',{name:'选择目标文件夹',exact:true}).isEnabled(),true);
 await select('备份与恢复');await system.getByRole('button',{name:'选择完整备份',exact:true}).waitFor();assert.equal(await system.getByRole('button',{name:'选择完整备份',exact:true}).isEnabled(),true);
 await select('回收站');await system.getByRole('navigation',{name:'回收站分类'}).getByRole('button',{name:'卡片集',exact:true}).click();await system.getByText('没有已删除的卡片集。',{exact:true}).waitFor();pass('all9 settings categories, focus, native storage capability and embedded recycle empty state');
 await system.getByRole('button',{name:'返回原页面',exact:true}).click();await p.getByRole('button',{name:'本地用户设置',exact:true}).click();await system.getByRole('heading',{name:'回收站',exact:true}).first().waitFor();pass('return original deck page and reopen retained settings category');
 await select('复盘与调度');const daily=system.getByLabel('每日独立卡片上限',{exact:true});await daily.fill('19');await p.evaluate(()=>{(window as any).confirmationCalls=[];window.confirm=(message)=>{(window as any).confirmationCalls.push(message);return false;};});await nav.getByRole('button',{name:'常规设置',exact:true}).click();assert.equal((await p.evaluate(()=>(window as any).confirmationCalls)).length,1);assert.equal(await daily.inputValue(),'19');await p.evaluate(()=>{window.confirm=()=>true;});await select('常规设置');pass('embedded scheduler unsaved change cancel keeps draft; explicit discard permits section change (native confirm answer adapter)');
 assert.ok(s.app.process().pid);
 for(const width of [900,1366,1500]){
  await s.app.evaluate(({BrowserWindow}:any,w:number)=>BrowserWindow.getAllWindows()[0].setContentSize(w,900),width);
  const c=await p.context().newCDPSession(p);await c.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  for(const kind of ['常规设置','回收站']){await select(kind);await p.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame)});const data=await system.evaluate((el:any)=>({width:innerWidth,scroll:document.documentElement.scrollWidth,font:getComputedStyle(el).fontFamily,items:[...el.querySelectorAll('.settings-grid,.settings-menu,.settings-main')].map((e:any)=>({class:e.className,rect:e.getBoundingClientRect().toJSON(),scroll:e.scrollWidth,client:e.clientWidth,css:{display:getComputedStyle(e).display,grid:getComputedStyle(e).gridTemplateColumns,padding:getComputedStyle(e).padding}}))}));assert.ok(data.scroll<=width+1);assert.ok(data.items.every((i:any)=>i.scroll<=i.client+1));const file=join(out,(kind==='常规设置'?'general':'trash')+'-'+width);await p.screenshot({path:file+'.png'});writeFileSync(file+'.json',JSON.stringify(data,null,2));report.visual.push({width,kind,sha256:createHash('sha256').update(readFileSync(file+'.png')).digest('hex')});}await c.detach();
 }
 pass('production settings and internal recycle6 screenshots/DOM/CSS at900/1366/1500 without horizontal overflow');report.status='PASS';
}catch(e){report.errors.push(String((e as Error).stack??e));process.exitCode=1;if(s){writeFileSync(join(out,'failure-'+(process.env.R6_ATTEMPT??'0')+'.txt'),await s.page.locator('body').innerText().catch(()=>''));await s.page.screenshot({path:join(out,'failure-'+(process.env.R6_ATTEMPT??'0')+'.png')}).catch(()=>{});}}
finally{writeFileSync(join(out,'attempt-'+(process.env.R6_ATTEMPT??'0')+'.json'),JSON.stringify(report,null,2)+'\n');if(s)await stop(s.app,f.data);}console.log(JSON.stringify(report));
