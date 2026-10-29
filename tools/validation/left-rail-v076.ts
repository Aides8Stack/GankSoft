// Production Electron -> real IPC -> isolated Schema606 -> process restart.
import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createClient} from '../../shared/protocol/client.ts';
import {publishFresh} from '../../tests/fixtures/fresh-production.ts';
const require=createRequire(import.meta.url),root=mkdtempSync(join(tmpdir(),'gank-rail-')),out=resolve('validation-results/v076/left-rail');mkdirSync(out,{recursive:true});
let app:Awaited<ReturnType<typeof electron.launch>>|undefined;
const cases:string[]=[],errors:string[]=[];
async function launch(){
 app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--ozone-override-screen-size=1600,1000','--disable-gpu']:[]),resolve('.')],env:{...process.env,GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:join(root,'synthetic')}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
 const client=createClient(r=>page.evaluate(request=>(window as any).gank.protocol(request),r));await client.call('app.capabilities',{});
 return {page,client};
}
async function stop(){await app?.evaluate(({app})=>app.exit(0)).catch(()=>{});await app?.close();app=undefined;}
try{
 let {page,client}=await launch();
 const folderName='公务员考试 · 导航验收',deckName='言语理解 · 导航验收';
 await page.getByRole('button',{name:'新建文件夹',exact:true}).click();await page.getByRole('textbox',{name:'目录项名称'}).fill(folderName);await page.getByRole('button',{name:'保存目录',exact:true}).click();
 let rootCatalog=await client.call('workspace.catalog',{});const folder=rootCatalog.items.find(i=>i.name===folderName)!;assert.ok(folder);
 await page.getByRole('button',{name:'侧栏新建卡片集',exact:true}).click();await page.getByRole('textbox',{name:'目录项名称'}).fill(deckName);
 await page.getByRole('dialog').locator('[aria-label="目标文件夹"]').getByRole('button',{name:folderName,exact:true}).click();await page.getByRole('button',{name:'保存目录',exact:true}).click();
 let nested=await client.call('workspace.catalog',{folderId:folder.id});const deck=nested.items.find(i=>i.name===deckName)!;assert.ok(deck);assert.equal(deck.cardCount,0);
 const rail=page.getByRole('complementary',{name:'学习导航'});const folderButton=rail.getByRole('button',{name:folderName,exact:true});
 const deckButton=rail.getByRole('button',{name:deckName+'，0 张卡片',exact:true});await deckButton.waitFor();
 await folderButton.click();assert.equal(await deckButton.count(),0);assert.equal(await folderButton.getAttribute('aria-expanded'),'false');await folderButton.click();await deckButton.click();
 await page.getByRole('region',{name:'卡片集概览',exact:true}).waitFor();assert.equal(await deckButton.getAttribute('aria-current'),'page');assert.match(await page.locator('.unified-content').innerText(),new RegExp(folderName+' / '+deckName));
 cases.push('UI create folder + nested deck -> real catalog; expand/collapse -> selected deck and exact path');
 // Cancel a dirty directory dialog through the existing navigation guard.
 await page.getByRole('button',{name:'侧栏新建卡片集',exact:true}).click();await page.getByRole('textbox',{name:'目录项名称'}).fill('取消，不应写入');await page.evaluate(()=>{window.confirm=()=>false;});await page.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await page.getByRole('dialog',{name:'编辑目录项'}).count(),1);
 await page.evaluate(()=>{window.confirm=()=>true;});await page.getByRole('button',{name:'取消',exact:true}).click();rootCatalog=await client.call('workspace.catalog',{});assert.equal(rootCatalog.items.some(i=>i.name==='取消，不应写入'),false);cases.push('dirty dialog discard rejected + cancel writes no catalog item');
 await publishFresh(client,'question',deck.id);await page.reload();await rail.getByRole('button',{name:deckName+'，1 张卡片',exact:true}).click();
 await page.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();await page.getByRole('button',{name:'正式合成question',exact:true}).click();await page.getByRole('button',{name:'编辑卡片',exact:true}).click();
 await page.getByTestId('draft-title').fill('侧栏离开保存的草稿');await rail.getByRole('button',{name:'学习总览',exact:true}).click();await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
 const drafts=await client.call('draft.listSummary',{deckId:deck.id});assert.equal(drafts.items[0].title,'侧栏离开保存的草稿');cases.push('card editor -> sidebar home uses save guard -> actual draft persisted');
 await rail.getByRole('button',{name:deckName+'，1 张卡片',exact:true}).click();
 for(const width of [1500,1366,900]){await app!.evaluate(({BrowserWindow},w)=>BrowserWindow.getAllWindows()[0].setSize(w,900),width);assert.equal(await rail.evaluate(el=>getComputedStyle(el).width),'213px');assert.ok(await rail.getByText('知识 · 记忆 · 复盘',{exact:true}).isVisible());assert.ok(await rail.getByText(deckName,{exact:true}).isVisible());assert.equal(await page.locator('.unified-sidebar').count(),1);await page.screenshot({path:join(out,`nested-deck-${width}.png`)});}
 cases.push('1500/1366/900: one 213px text rail, brand, real folder/deck/count, selected state');
 await page.getByRole('button',{name:'切换专注模式',exact:true}).click();assert.equal(await rail.isVisible(),false);await page.getByRole('button',{name:'切换专注模式',exact:true}).click();assert.equal(await rail.isVisible(),true);cases.push('prototype focus toggle hides/restores complete navigation');
 await stop();({page,client}=await launch());nested=await client.call('workspace.catalog',{folderId:folder.id});assert.equal(nested.items.find(i=>i.id===deck.id)?.cardCount,1);assert.equal((await client.call('draft.listSummary',{deckId:deck.id})).items[0].title,'侧栏离开保存的草稿');
 await page.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:deckName+'，1 张卡片',exact:true}).click();await page.getByRole('region',{name:'卡片集概览',exact:true}).waitFor();cases.push('new Electron process: folder/deck/count/draft survive and UI opens persisted nested deck');
 assert.deepEqual(errors,[]);
 writeFileSync(join(out,'result.json'),JSON.stringify({status:'PASS',sourceParentSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:true,platform:process.platform,data:'isolated synthetic606',cases,errors,windowsReal:'NOT_RUN'},null,2));console.log(`PASS ${cases.length} production rail scenarios`);
}finally{await stop();rmSync(root,{recursive:true,force:true});}
