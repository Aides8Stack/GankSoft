// UI audit with an isolated synthetic fresh606 profile. This launches
// package.json's production main, never the card-draft/workspace test host.
import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createClient} from '../../shared/protocol/client.ts';
import {publishFresh} from '../../tests/fixtures/fresh-production.ts';

const require=createRequire(import.meta.url),root=mkdtempSync(join(tmpdir(),'gank-ui-audit-'));
const out=resolve('validation-results/production-ui-audit');mkdirSync(out,{recursive:true});
const cases:unknown[]=[],operations:string[]=[],errors:string[]=[],external:string[]=[];
let app:Awaited<ReturnType<typeof electron.launch>>|undefined;
const report={sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 platform:process.platform,entry:JSON.parse(readFileSync('package.json','utf8')).main,
 target:resolve('.'),host:'production main',cases,operations,errors,external,
 prototypeVisualAcceptance:'DEFERRED_VISUAL_ONLY',windows10Manual:'NOT_RUN',windows11Manual:'NOT_RUN',status:'FAIL'};
try{
 app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[]),resolve('.')],env:{...process.env,GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:join(root,'synthetic')}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,r=>{external.push(r.request().url());return r.abort();});
 await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
 assert.equal(page.url(),'gank-app://ui/index.html');
 assert.equal(await page.locator('.unified-shell').count(),1);
 assert.equal(await page.getByRole('heading',{name:'今天，从一次主动回忆开始。',exact:true}).count(),0);
 const client=createClient(r=>page.evaluate(request=>(window as any).gank.protocol(request),r));
 await client.call('app.capabilities',{});assert.equal((await client.call('workspace.catalog',{})).model,'unified');
 const deck=await client.call('workspace.catalog.save',{kind:'deck',name:'正式 UI 合成审阅',parentId:null});
 const question=await publishFresh(client,'question',deck.id);
 await publishFresh(client,'qa',deck.id);await publishFresh(client,'direct',deck.id);
 const tree=await client.call('knowledge.tree.read',{deckId:deck.id});
 await client.call('knowledge.node.create',{deckId:deck.id,parentId:null,name:'正式合成知识点',expectedTreeHash:tree.treeHash});
 await page.reload();await page.getByRole('button',{name:/正式 UI 合成审阅/}).waitFor();
 async function capture(name:string){
  cases.push({page:name,url:page.url(),headings:await page.getByRole('heading').allTextContents(),alerts:await page.getByRole('alert').allTextContents()});
  assert.deepEqual(await page.getByRole('alert').allTextContents(),[]);
  assert.ok(await page.locator('.unified-shell').evaluate(el=>el.scrollWidth<=innerWidth),'App must fit the viewport');
  await page.screenshot({path:join(out,name+'.png'),animations:'disabled',timeout:10000});
 }
 await capture('home');
 await page.getByRole('button',{name:/正式 UI 合成审阅/}).click();
 await page.getByRole('textbox',{name:'搜索卡片标题',exact:true}).waitFor();
 await page.getByRole('button',{name:'正式合成question',exact:true}).waitFor();await capture('cards');
 await page.getByText('新建卡片',{exact:true}).click();
 await page.getByRole('button',{name:'直接记忆',exact:true}).click();
 await page.getByTestId('draft-title').fill('正式UI新建记忆');
 await page.locator('.gank-editor .ProseMirror').first().fill('正式UI新建的记忆正文');
 await page.getByTestId('publish-card').click();
 await page.getByText('发布成功，历史已保留',{exact:true}).waitFor();
 operations.push('UI create and publish direct memory');
 await page.getByRole('button',{name:'所有卡片',exact:true}).click();
 await page.getByRole('button',{name:'正式UI新建记忆',exact:true}).waitFor();
 await page.getByRole('button',{name:'卡片集概览',exact:true}).click();
 await page.getByRole('region',{name:'卡片集概览',exact:true}).waitFor();await capture('deck-overview');
 await page.getByRole('button',{name:'学习分析',exact:true}).click();
 await page.getByRole('region',{name:'复盘记录列表',exact:true}).waitFor();await capture('analytics');
 await page.getByRole('button',{name:'所有卡片',exact:true}).click();
 await page.getByRole('button',{name:'正式合成question',exact:true}).click();
 await page.getByRole('button',{name:'编辑卡片',exact:true}).click();
 await page.getByTestId('draft-title').waitFor();await page.locator('.gank-editor .ProseMirror').first().waitFor();await capture('editor');
 await page.getByTestId('draft-title').fill('正式UI修改后的错题');
 await page.getByTestId('publish-card').click();
 await page.getByText('发布成功，历史已保留',{exact:true}).waitFor();
 assert.equal((await client.call('card.getPublishedContent',question)).title,'正式UI修改后的错题');
 operations.push('UI edit and publish existing question');
 await page.getByRole('button',{name:'所有卡片',exact:true}).click();
 await page.getByRole('button',{name:'正式UI修改后的错题',exact:true}).click();
 await page.getByRole('button',{name:'复盘此卡片',exact:true}).click();
 await page.getByRole('region',{name:'单选错题',exact:true}).waitFor();await capture('review');
 await page.getByRole('radio',{name:'错误',exact:true}).check();
 await page.getByLabel('独立思路',{exact:true}).fill('正式UI复盘原始思路');
 await page.getByRole('button',{name:'揭示答案',exact:true}).click();
 await page.getByRole('slider').evaluate((el:HTMLInputElement)=>{el.value='90';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.getByRole('button',{name:'保存本次复盘',exact:true}).click();
 await page.getByText('复盘已保存 · 自评 9.0 · 客观答错 · again',{exact:true}).waitFor();
 operations.push('UI wrong answer with score9 forces Again and saves review');
 await page.getByRole('button',{name:'知识图谱',exact:true}).click();
 await page.locator('.mind-canvas .me-tpc').first().waitFor();
 assert.equal(await page.locator('.unified-sidebar').count(),0);await capture('knowledge');
 await page.reload();await page.getByRole('button',{name:/正式 UI 合成审阅/}).click();
 await page.getByRole('button',{name:'正式UI新建记忆',exact:true}).waitFor();
 await page.getByRole('button',{name:'正式UI修改后的错题',exact:true}).click();
 await page.getByText('复盘趋势与历史',{exact:true}).click();
 await page.getByRole('button',{name:/9 分/}).click();
 await page.getByRole('region',{name:'当次复盘证据',exact:true}).waitFor();
 await page.getByText('原始思路：正式UI复盘原始思路',{exact:true}).waitFor();
 operations.push('Reload preserves UI-created card, published edit and review history');
 assert.equal(cases.length,7);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 report.status='PASS';
}finally{
 writeFileSync(join(out,'result.json'),JSON.stringify(report,null,2));
 await app?.close();rmSync(root,{recursive:true,force:true});
}
console.log(JSON.stringify(report,null,2));
