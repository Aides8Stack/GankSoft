// Production main only. Synthetic profiles; screenshots never contain user data.
import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createClient} from '../../shared/protocol/client.ts';
import {publishFresh} from '../../tests/fixtures/fresh-production.ts';
const require=createRequire(import.meta.url),root=mkdtempSync(join(tmpdir(),'gank-v076-ui-'));
const stage=process.argv[2]??'P0',out=resolve('validation-results/v076',stage);mkdirSync(out,{recursive:true});
const errors:string[]=[],cases:unknown[]=[];
async function capture(page:any,file:string,width:number){await page.screenshot({path:join(out,file),animations:'disabled',timeout:10000});const png=readFileSync(join(out,file));assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),900);assert.ok(png.length>1000,'Reject empty screenshot');}

const report={stage,sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:true,platform:process.platform,entry:JSON.parse(readFileSync('package.json','utf8')).main,host:'production main',cases,errors,windowsVisual:'NOT_RUN',windows10Manual:'NOT_RUN',windows11Manual:'NOT_RUN',status:'FAIL'};
let app:Awaited<ReturnType<typeof electron.launch>>|undefined;
try{
 app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--ozone-override-screen-size=1600,1000','--disable-gpu']:[]),resolve('.')],env:{...process.env,GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:join(root,'synthetic')}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 async function three(prefix:string){for(const width of [1500,1366,900]){await app!.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,900),width);assert.ok(await page.locator('.unified-shell').evaluate(el=>el.scrollWidth<=innerWidth));await capture(page,`${prefix}-${width}.png`,width);cases.push({page:prefix,width,status:'PASS'});}}
 await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
 assert.equal(page.url(),'gank-app://ui/index.html');
 for(const width of [1500,1366,900]){
  await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,900),width);
  assert.ok(await page.locator('.unified-shell').evaluate(el=>el.scrollWidth<=innerWidth),'No horizontal app overflow');
  assert.equal(await page.locator('.unified-sidebar').evaluate(el=>getComputedStyle(el).width),'68px');
  assert.equal(await page.getByRole('button',{name:'新建卡片集',exact:true}).evaluate(el=>getComputedStyle(el).borderRadius),'8px');
  assert.deepEqual(await page.getByRole('alert').allTextContents(),[]);
  await capture(page,`home-empty-${width}.png`,width);
  cases.push({page:'home',data:'fresh606',width,status:'PASS'});
 }
 if(stage!=='P0'){
  const client=createClient(r=>page.evaluate(request=>(window as any).gank.protocol(request),r));await client.call('app.capabilities',{});
  const d=await client.call('workspace.catalog.save',{kind:'deck',name:'言语理解 · 合成验收',parentId:null});
  const c=await publishFresh(client,'question',d.id);await publishFresh(client,'direct',d.id);
  await client.call('learning.session.open',{deckId:d.id,cardIds:[c.cardId]});
  await page.reload();await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
  await page.locator('[aria-label="学习摘要"][aria-busy="false"]').waitFor();
  assert.equal(await page.locator('.metric-number').nth(1).innerText(),'2 张');
  await page.getByRole('region',{name:'继续今天的复盘',exact:true}).getByRole('button',{name:'继续复盘',exact:true}).waitFor();
  for(const width of [1500,1366,900]){
   await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,900),width);
   assert.ok(await page.locator('.unified-shell').evaluate(el=>el.scrollWidth<=innerWidth));
   await capture(page,`home-synthetic-${width}.png`,width);
   cases.push({page:'home',data:'synthetic606',width,status:'PASS'});
  }
  await page.getByRole('region',{name:'继续今天的复盘',exact:true}).getByRole('button',{name:'继续复盘',exact:true}).click();
  await page.getByRole('region',{name:'单选错题',exact:true}).waitFor();
  cases.push({operation:'home resumes actual persisted session',status:'PASS'});
  await page.getByRole('button',{name:'学习总览',exact:true}).click();
  await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
  if(!['P0','P1'].includes(stage)){
   await page.getByRole('button',{name:/言语理解 · 合成验收/}).click();
   await page.getByRole('region',{name:'卡片集概览',exact:true}).waitFor();
   await page.getByRole('region',{name:'最近卡片',exact:true}).getByRole('button',{name:/正式合成question/}).waitFor();
   assert.equal(await page.getByRole('textbox',{name:'搜索卡片标题',exact:true}).count(),0);
   for(const width of [1500,1366,900]){
    await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,900),width);
    assert.ok(await page.locator('.unified-shell').evaluate(el=>el.scrollWidth<=innerWidth));
    await capture(page,`deck-overview-${width}.png`,width);
    cases.push({page:'deck-overview',data:'synthetic606',width,status:'PASS'});
   }
   await page.getByRole('button',{name:'所有卡片',exact:true}).click();
   await page.getByRole('button',{name:'正式合成question',exact:true}).waitFor();
   assert.equal(await page.locator('.unified-card-list tbody tr').count(),2);
   await page.getByRole('checkbox',{name:'全选当前页卡片',exact:true}).check();
   assert.equal(await page.locator('.unified-card-list tbody input:checked').count(),2);
   for(const width of [1500,1366,900]){await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,900),width);await capture(page,`cards-${width}.png`,width);assert.ok(await page.locator('.unified-shell').evaluate(el=>el.scrollWidth<=innerWidth));}
   assert.equal(await page.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).getAttribute('aria-current'),'page');
   await page.getByRole('button',{name:'正式合成question',exact:true}).click();
   await page.getByRole('article',{name:'卡片详情',exact:true}).waitFor();
   await page.getByRole('button',{name:'编辑卡片',exact:true}).waitFor();
   await page.getByRole('heading',{name:'当前内容与关联知识点',exact:true}).waitFor();
   for(const width of [1500,1366,900]){await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,900),width);await capture(page,`card-detail-${width}.png`,width);assert.ok(await page.locator('.unified-shell').evaluate(el=>el.scrollWidth<=innerWidth));}
   await page.getByRole('button',{name:'返回列表',exact:true}).click();
   assert.equal(await page.locator('.unified-card-list tbody input:checked').count(),2);
   cases.push({operation:'overview -> paged list -> select all -> detail -> return keeps selection',status:'PASS'});
   if(!['P0','P1','P2'].includes(stage)){
    await page.getByRole('button',{name:'编辑 正式合成question',exact:true}).click();
    await page.getByTestId('draft-title').waitFor();await page.locator('.gank-editor .ProseMirror').first().waitFor();
    await three('editor-question');
    await page.getByTestId('draft-title').fill('正式UI改造错题');await page.getByTestId('publish-card').click();
    await page.getByText('发布成功，历史已保留',{exact:true}).waitFor();
    await page.getByRole('button',{name:'选择知识点',exact:true}).click();
    await page.getByRole('dialog',{name:'选择知识点关联',exact:true}).waitFor();
    await page.getByRole('button',{name:'取消',exact:true}).click();
    await page.getByRole('button',{name:'所有卡片',exact:true}).click();
    await page.getByRole('button',{name:'正式UI改造错题',exact:true}).click();
    await page.getByRole('button',{name:'复盘此卡片',exact:true}).click();
    const resumeClock=page.getByRole('button',{name:'继续计时',exact:true});if(await resumeClock.isVisible())await resumeClock.click();
    await page.getByRole('radio',{name:'错误',exact:true}).check();await page.getByLabel('独立思路',{exact:true}).fill('真实界面复盘思路');
    await three('review-answer');
    await page.getByRole('button',{name:'揭示答案',exact:true}).click();
    await page.getByRole('slider').evaluate((el:HTMLInputElement)=>{el.value='90';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await three('review-reveal');
    await page.getByRole('button',{name:'保存本次复盘',exact:true}).click();
    await page.getByText('复盘已保存 · 自评 9.0 · 客观答错 · again',{exact:true}).waitFor();
    await three('review-result');
    await page.getByRole('button',{name:'学习分析',exact:true}).click();
    await page.getByRole('region',{name:'复盘记录列表',exact:true}).waitFor();
    await page.getByRole('region',{name:'复盘记录列表',exact:true}).getByRole('button',{name:/正式UI改造错题/}).waitFor();
    await three('analytics');
    await page.getByRole('button',{name:'评估本集',exact:true}).click();await page.getByRole('button',{name:'评估本集',exact:true}).waitFor({state:'visible'});
    await publishFresh(client,'qa',d.id);
    for(const mode of ['qa','direct']){await page.getByRole('button',{name:'所有卡片',exact:true}).click();await page.getByRole('button',{name:'搜索',exact:true}).click();await page.getByRole('button',{name:'编辑 正式合成'+mode,exact:true}).click();await page.getByTestId('draft-title').waitFor();await page.locator('.gank-editor .ProseMirror').first().waitFor();await three('editor-'+mode);}
    await page.getByRole('button',{name:'学习总览',exact:true}).click();const empty=(await client.call('workspace.catalog',{})).items.find(i=>i.kind==='deck'&&i.cardCount===0)!;await page.getByRole('region',{name:'卡片集目录',exact:true}).getByRole('button',{name:empty.name,exact:true}).click();await page.getByRole('button',{name:'学习分析',exact:true}).click();await page.getByText('此范围没有复盘记录。',{exact:true}).waitFor();await three('analytics-empty');
    cases.push({operation:'production editor publish -> picker -> wrong answer score9 Again -> real analysis',status:'PASS'});
   }
   if(stage==='P2'){
    const cat=await client.call('workspace.catalog',{}),empty=cat.items.find(i=>i.kind==='deck'&&i.cardCount===0)!;
    await page.getByRole('button',{name:'学习总览',exact:true}).click();await page.getByRole('region',{name:'卡片集目录',exact:true}).getByRole('button',{name:empty.name,exact:true}).click();
    await page.getByRole('region',{name:'卡片集概览',exact:true}).getByText('把值得回顾的内容，留在这里',{exact:true}).waitFor();
    for(const width of [1500,1366,900]){await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,900),width);await capture(page,`deck-empty-${width}.png`,width);}
    await page.getByRole('button',{name:'所有卡片',exact:true}).click();await page.getByText('没有匹配的卡片，可调整筛选或新建卡片。',{exact:true}).waitFor();
    for(const width of [1500,1366,900]){await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,900),width);await capture(page,`cards-empty-${width}.png`,width);}
    cases.push({operation:'fresh606 empty deck overview and list, three widths',status:'PASS'});
   }

  }
 }
 assert.deepEqual(errors,[]);report.status='PASS';
}finally{writeFileSync(join(out,'result.json'),JSON.stringify(report,null,2));await app?.evaluate(({app})=>app.exit(0)).catch(()=>{});await app?.close();rmSync(root,{recursive:true,force:true});}
console.log(JSON.stringify(report,null,2));
