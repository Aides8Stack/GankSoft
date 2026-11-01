// WIN-03 real Windows display scale / six-page accessibility; WIN-08 physically dragged editor table.
import assert from 'node:assert/strict';
import {join,dirname} from 'node:path';
import {readFileSync} from 'node:fs';
import {_electron as electron} from 'playwright-core';
import {createClient} from '../../../../shared/protocol/client.ts';
import {executeCase,enterCards,restart} from '../helpers.mjs';
import {observe,evidence,step,editor} from './core-support.mjs';
import {openPublished,writeRich,paste,saveDraft,integrity} from './m4-support.mjs';
import {preflight,actualOs,sha256,blocked,operatorStep,recordLocalProof} from './win-native-support.mjs';
const id=process.argv[2],out=process.argv[3];
if(!['WIN-03','WIN-08'].includes(id)||!out)throw Error('UNKNOWN_M5_NATIVE_UI_CASE');
const exe=process.env.GANKSOFT_WIN_PORTABLE_EXE,zip=process.env.GANKSOFT_WIN_PORTABLE_ZIP;
async function launchPacked(f){
 const app=await electron.launch({executablePath:exe,args:[],
   env:{...process.env,GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:f.data,TZ:'Asia/Shanghai'},timeout:30000});
 const page=await app.firstWindow();page.setDefaultTimeout(16000);
 await page.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();
 const api=createClient(req=>page.evaluate(v=>window.gank.protocol(v),req));
 await api.call('app.capabilities',{});return {app,page,api};
}
async function visiblePage(ctx,label){
 const p=ctx.session.page;
 const m=await p.evaluate(()=>{
  const x=document.querySelector('.unified-content');const r=x?.getBoundingClientRect();
  const btn=[...document.querySelectorAll('.unified-content button')].filter(e=>!e.disabled&&e.getBoundingClientRect().width>18);
  return {w:innerWidth,h:innerHeight,content:r?{w:r.width,h:r.height}:null,
   overflow:x?.scrollWidth-x?.clientWidth,buttons:btn.length};
 });
 assert.ok(m.content?.w>350&&m.content?.h>260,'Unusable '+label+' at actual Windows DPI');
 assert.ok(m.buttons>0&&m.overflow<150,'Controls hidden/overflow: '+label);
 await p.screenshot({path:join(ctx.out,'WIN03-'+label+'.png')});
 return {label,...m};
}
if(preflight(id,out,{portable:id==='WIN-03'}))
await executeCase(id,out,async ctx=>{
 await observe(ctx);let p=ctx.session.page,reboot;
 if(id==='WIN-03'){
   const wanted=Number(process.env.GANKSOFT_WIN_EXPECT_SCALE);
   if(![100,125].includes(wanted))throw blocked('Set GANKSOFT_WIN_EXPECT_SCALE=100 or 125 matching REAL Windows Display Settings');
   const factor=await ctx.session.app.evaluate(({screen})=>screen.getPrimaryDisplay().scaleFactor);
   if(Math.abs(factor*100-wanted)>1)throw blocked('Windows physical scale is '+factor+' and not '+wanted+'%');
   const pages=[];
   await p.getByRole('heading',{name:'学习总览'}).waitFor();
   pages.push(await visiblePage(ctx,'home'));
   await enterCards(ctx);pages.push(await visiblePage(ctx,'cards'));
   await openPublished(ctx);pages.push(await visiblePage(ctx,'editor'));
   await enterCards(ctx);
   await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'学习分析'}).click();
   await p.getByRole('heading',{name:'学习分析'}).waitFor();
   pages.push(await visiblePage(ctx,'analytics'));
   await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'知识图谱'}).click();
   await p.getByRole('heading',{name:'知识图谱'}).waitFor();
   pages.push(await visiblePage(ctx,'knowledge'));
   await enterCards(ctx);
   await p.getByRole('checkbox',{name:'选择 B2 保持发布和历史'}).check();
   await p.getByRole('button',{name:'学习选中卡片'}).click();
   await p.getByRole('heading',{name:'学习与复盘'}).waitFor();
   pages.push(await visiblePage(ctx,'review'));
   assert.equal(pages.length,6);
   const build=JSON.parse(readFileSync(join(dirname(exe),'build-metadata.json'),'utf8'));
   const proof={schema:'ganksoft.v077/win-host-1',caseId:id,os:actualOs(),
     nativeScale:factor,scalePercent:wanted,sourceSha:build.sha,version:build.version,
     zipSha256:sha256(zip),exeSha256:sha256(exe),
     pages:pages.map(x=>({name:x.label,viewport:[x.w,x.h],controls:x.buttons,
       contentWidth:x.content.w})),localOutcome:'PASS'};
   recordLocalProof(out,'WIN-03-'+wanted+'percent-host-proof.json',proof);
   ctx.observations.checks.realDpi=proof;
   step(ctx,'Six real portable-app views at actual Windows DPI; screenshots and interactive controls verified');
   await evidence(ctx);
   throw blocked('WIN-03 one physical scale verified; requires 100 AND 125 percent proofs for matching executable before final PASS');
 }
 await openPublished(ctx);
 await editor(ctx,'body').fill('WIN-08 table edit');
 await writeRich(ctx,{plain:'\n\n| A | B |\n| --- | --- |\n| 甲 | 乙 |',
   html:'<p>WIN08 synthetic table seed only</p>'});
 await paste(ctx,'body');
 const table=editor(ctx,'body').locator('table');await table.waitFor();
 assert.ok(await table.locator('td,th').count()>=4);
 const events=await operatorStep(ctx,'WIN-08 actual Windows mouse table drag',
   '请用真实鼠标在表格中拖动选择多个单元格并释放，物理键盘输入 WIN08_CELL，Ctrl+Z撤销、Ctrl+Shift+Z重做。确认表格最终仍含WIN08_CELL，回到GankSoft按F8。',{timeout:65000});
 assert.ok(events.some(e=>e.kind==='pointerdown')&&events.some(e=>e.kind==='pointerup')&&
   events.filter(e=>e.kind==='pointermove').length>=2,'Physical mouse drag events absent');
 assert.ok(events.some(e=>e.kind==='input'),'Real keyboard table input not observed');
 assert.ok((await table.innerText()).includes('WIN08_CELL'));
 const saved=await saveDraft(ctx,'B2 保持发布和历史','body','WIN08_CELL');
 assert.ok(saved.payload.fields.body.includes('|')&&saved.payload.fields.body.includes('WIN08_CELL'));
 reboot=await restart(ctx);await observe(ctx);
 assert.equal((await ctx.session.api.call('draft.get',ctx.fixture.card)).payload.fields.body,saved.payload.fields.body);
 await enterCards(ctx);await p.getByRole('button',{name:'编辑 B2 保持发布和历史'}).click();
 assert.ok((await editor(ctx,'body').locator('table').innerText()).includes('WIN08_CELL'));
 ctx.observations.checks.nativeDrag={events:events.length,os:actualOs(),reboot};
 integrity(ctx);
 step(ctx,'True Windows mouse table selection, cell edit, undo/redo and fresh Electron PID preserved Markdown');
 return {...await evidence(ctx),reboot};
},{...(id==='WIN-03'?{launch:launchPacked}:{})});
