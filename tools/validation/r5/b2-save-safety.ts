import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync,readdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {_electron as electron} from 'playwright-core';
import {createClient} from '../../../shared/protocol/client.ts';
import {b2Fixture} from './b2-fixture.ts';
import {args,require,openMap,stop} from './support.ts';
const out='docs/v076/rebuild-v37-source-first/stages/R5/evidence/b2-final';mkdirSync(out,{recursive:true});
const report:any={base:'06ebccc3c59e78d6425dc4fe6eefa0bc4f12b8c4',status:'FAIL',scope:'B2.3 production Electron UI → real IPC/service/Schema606, validation-only rejected/reply-loss wrapper',cases:[],errors:[]};
const pass=(name:string,details:any={})=>{report.cases.push({name,status:'PASS',...details});writeFileSync(join(out,'b23-progress.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS '+name);};
let f:any,s:any;
const hash=(v:any)=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
function protectedData(){const db=new DatabaseSync(f.data+'-control606/target/ganksoft.sqlite',{readOnly:true});try{
 assert.equal(db.prepare('PRAGMA user_version').get()!.user_version,606);assert.equal(db.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');
 return {tables:Object.fromEntries(['learning_cards','learning_content_versions','learning_published_modes','learning_review_events','schedule_events','scheduling'].map(table=>[table,db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()])),files:readdirSync(f.data+'-control606/target/attachments').sort().map(name=>({name,sha256:hash(readFileSync(join(f.data+'-control606/target/attachments',name)))}))};
 }finally{db.close();}}
async function launch(){
 const app=await electron.launch({executablePath:require('electron'),args:[...args,resolve('tools/validation/r5/b2-fault-host.cjs')],env:{...process.env,TZ:'Asia/Shanghai',GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:f.data,GANK_B2_MAIN:resolve('dist-electron/electron/main.js'),GANK_B2_EVENT_LOG:join(f.root,'b23-ipc-events.jsonl')},timeout:20000});
 const page=await app.firstWindow();page.setDefaultTimeout(12000);await page.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();const api=createClient(r=>page.evaluate((v:any)=>(window as any).gank.protocol(v),r));await api.call('app.capabilities',{});return {app,page,api,pid:app.process().pid};
}
async function enter(){if(await s.page.locator('.mind-canvas').count()===0)await openMap(s.page,f.deck.name);const button=s.page.getByRole('button',{name:'Markdown 大纲',exact:true});if(await button.getAttribute('aria-pressed')!=='true')await button.click();await choose(f.ids[1]);}
async function choose(nodeId:string){const p=s.page;await p.getByRole('navigation',{name:'大纲分级目录'}).locator(`[data-outline-nav="${nodeId}"] .outline-label`).click();await p.locator(`[data-outline-entry="${nodeId}"] .gank-editor[aria-busy=false]`).waitFor();}
const current=()=>s.page.locator('.knowledge-markdown .gank-editor:visible .ProseMirror[contenteditable=true]');
const save=()=>s.page.locator('.knowledge-markdown .gank-editor:visible').getByRole('button',{name:'保存',exact:true});
const node=()=>s.api.call('knowledge.node.read',{deckId:f.deck.id,nodeId:f.ids[1]});
const arm=(mode:string)=>s.app.evaluate((_:any,v:any)=>(globalThis as any).b2Faults.arm(v.mode,v.node),{mode,node:f.ids[1]});
const clear=()=>s.app.evaluate(()=>(globalThis as any).b2Faults.clear());
try{
 f=await b2Fixture();writeFileSync(join(f.root,'b23-ipc-events.jsonl'),'');s=await launch();const firstPid=s.pid;report.fixture={parameters:f.parameters,ids:f.ids,deckId:f.deck.id};
 const protectedBefore=protectedData();assert.equal(protectedBefore.tables.learning_review_events.length,1);assert.equal(protectedBefore.tables.learning_content_versions.length,1);
 const linksBefore=await s.api.call('knowledge.cardLinks.get',f.card),treeBefore=await s.api.call('knowledge.tree.read',{deckId:f.deck.id}),others=await Promise.all([f.ids[0],f.ids[2]].map(nodeId=>s.api.call('knowledge.node.read',{deckId:f.deck.id,nodeId})));
 await enter();let before=await node();
 if(!process.argv.includes('--quit-only')){
 await arm('reject');await current().fill('B2.3 失败后保留的正文草稿');await save().click();await s.page.getByText('合成保存失败，正文未写入',{exact:true}).waitFor();
 assert.match(await current().innerText(),/失败后保留/);assert.deepEqual(await node(),before);await s.page.getByRole('button',{name:'思维导图',exact:true}).click();assert.equal(await s.page.getByRole('main',{name:'知识点 Markdown 文档'}).count(),1);assert.match(await current().innerText(),/失败后保留/);
 await clear();await s.page.getByRole('button',{name:'重试保存正文',exact:true}).click();await s.page.locator('.knowledge-markdown output[data-save-state=clean]').waitFor();let saved=await node();assert.match(saved.markdown,/失败后保留/);assert.equal(saved.revision,before.revision+1);pass('definitive save failure retains draft and blocks unsafe view switch; explicit retry saves only target node');
 before=saved;await arm('unknown-once');await current().fill('B2.3 原请求核对后只保存一次');await save().click();await s.page.getByRole('button',{name:'核对正文保存结果',exact:true}).waitFor();
 assert.equal(await s.page.locator('.knowledge-markdown [inert]').count(),1);const committed=await node();assert.match(committed.markdown,/原请求核对/);assert.equal(committed.revision,before.revision+1);
 const eventsBefore=await s.app.evaluate(()=>(globalThis as any).b2Faults.events());const original=eventsBefore.at(-1);await clear();await s.page.getByRole('button',{name:'核对正文保存结果',exact:true}).click();await s.page.locator('.knowledge-markdown output[data-save-state=clean]').waitFor();saved=await node();
 const eventsAfter=await s.app.evaluate(()=>(globalThis as any).b2Faults.events()),retries=eventsAfter.slice(eventsBefore.length);assert.ok(retries.length>0);assert.ok(retries.every((r:any)=>r.requestId===original.requestId),'unknown recovery must not issue a second command ID');assert.equal(saved.revision,committed.revision,'receipt recovery must not write the document again');assert.equal(saved.markdown,committed.markdown);pass('unknown reply freezes editor; original requestId replay acknowledges exactly one committed revision',{originalRequestId:original.requestId,retries});
 await s.page.getByRole('button',{name:'思维导图',exact:true}).click();await s.page.getByRole('button',{name:'打开知识栏',exact:true}).click();await s.page.locator('.mind-detail .gank-editor[aria-busy=false]').waitFor();
 await current().fill('B2.3 关闭详情立即保存');await s.page.getByRole('button',{name:'关闭知识栏',exact:true}).click();await s.page.locator('.mind-detail').waitFor({state:'hidden'});assert.match((await node()).markdown,/关闭详情立即保存/);pass('editing then closing detail synchronously flushes pending native transaction');
 await s.page.getByRole('button',{name:'Markdown 大纲',exact:true}).click();await choose(f.ids[1]);await current().fill('B2.3 离开页面立即保存');await s.page.getByRole('button',{name:'返回所有卡片',exact:true}).click();await s.page.locator('.native-outline-workbench').waitFor({state:'hidden'});assert.match((await node()).markdown,/离开页面立即保存/);pass('leaving knowledge page flushes draft through existing UnifiedWorkspace guard');
 await s.page.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'知识图谱',exact:true}).click();await s.page.getByRole('button',{name:'Markdown 大纲',exact:true}).click();await choose(f.ids[1]);await current().fill('B2.3 切换卡片集立即保存');await s.page.getByRole('button',{name:'返回所有卡片',exact:true}).click();await s.page.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:new RegExp('^'+f.secondDeck.name+'，')}).click();await s.page.locator('.native-outline-workbench').waitFor({state:'hidden'});assert.match((await node()).markdown,/切换卡片集立即保存/);pass('switching deck flushes original scope without migrating draft to the new deck');
 }
 await enter();await current().fill('B2.3 退出Electron精确持久化\n\n**原生正文**');
 // This is a normal Electron close with dirty native text, not a same-process read.
 const expectedMarkdown='B2.3 退出Electron精确持久化';{let timer:any;try{await Promise.race([stop(s.app,f.data),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('normal Electron quit did not complete within8s')),8000))]);}finally{clearTimeout(timer);}}s=null;
 const db=new DatabaseSync(f.data+'-control606/target/ganksoft.sqlite',{readOnly:true});let disk:any;try{disk=JSON.parse(String(db.prepare('SELECT value FROM settings WHERE key=?').get('unified-knowledge-body:'+f.ids[1])!.value));}finally{db.close();}assert.match(disk.markdown,new RegExp(expectedMarkdown));
 s=await launch();assert.notEqual(s.pid,firstPid);const reopened=await node();const exitWrite=JSON.parse(readFileSync(join(f.root,'b23-ipc-events.jsonl'),'utf8').trim().split('\n').at(-1)!);assert.equal(exitWrite.nodeId,f.ids[1]);assert.equal(reopened.markdown,exitWrite.markdown);assert.equal(reopened.revision,exitWrite.expectedRevision+1);assert.equal(reopened.markdown,disk.markdown);assert.equal(reopened.nodeId,f.ids[1]);assert.equal(reopened.parentId,treeBefore.nodes.find((n:any)=>n.nodeId===f.ids[1]).parentId);
 // Revisions are checked against the exact post-close on-disk row, not cleanup.
 const check=new DatabaseSync(f.data+'-control606/target/ganksoft.sqlite',{readOnly:true});try{assert.equal(reopened.revision,check.prepare('SELECT version FROM knowledge WHERE id=?').get(f.ids[1])!.version);}finally{check.close();}
 assert.deepEqual(await Promise.all([f.ids[0],f.ids[2]].map(nodeId=>s.api.call('knowledge.node.read',{deckId:f.deck.id,nodeId}))),others);assert.deepEqual(protectedData(),protectedBefore);assert.deepEqual(await s.api.call('knowledge.cardLinks.get',f.card),linksBefore);assert.deepEqual((await s.api.call('knowledge.tree.read',{deckId:f.deck.id})).nodes.map(({revision,...n}:any)=>n),treeBefore.nodes.map(({revision,...n}:any)=>n));
 await enter();assert.match(await current().innerText(),/退出Electron精确持久化/);pass('new Electron process precisely rereads nodeId, Markdown, revision and hierarchy BEFORE cleanup; other nodes/published versions/nonempty history/links/assets unchanged',{firstPid,newPid:s.pid,reopened,exitWrite,protectedSha256:hash(protectedBefore),links:linksBefore});
 // True concurrent CAS conflict, with independent IPC command after UI load.
 before=await node();const remote=await s.api.call('knowledge.node.save',{deckId:f.deck.id,nodeId:f.ids[1],expectedRevision:before.revision,markdown:'B2.3 其他写入者已保存'});await current().fill('B2.3 必须保留的冲突草稿');await save().click();await s.page.getByText('知识正文已变化，请保留当前草稿',{exact:true}).waitFor();assert.match(await current().innerText(),/必须保留的冲突草稿/);assert.deepEqual(await node(),remote);
 await s.page.getByRole('button',{name:'思维导图',exact:true}).click();assert.match(await current().innerText(),/必须保留的冲突草稿/);assert.deepEqual(await node(),remote);pass('real CAS conflict preserves local draft and remote committed body, blocks unsafe navigation');
 await s.page.getByRole('button',{name:'重新读取已保存正文',exact:true}).click();await s.page.getByRole('button',{name:'保留当前草稿',exact:true}).click();assert.match(await current().innerText(),/必须保留的冲突草稿/);
 await s.page.getByRole('button',{name:'重新读取已保存正文',exact:true}).click();const confirmation=s.page.getByRole('group',{name:'确认放弃冲突草稿',exact:true});await confirmation.scrollIntoViewIfNeeded();const rect=await confirmation.boundingBox();assert.ok(rect&&rect.width>0&&rect.height>0);await s.page.screenshot({path:join(out,'b23-cas-confirm.png')});report.conflictConfirmation={rect,viewport:await s.page.evaluate(()=>({width:innerWidth,height:innerHeight})),buttonLabels:await confirmation.getByRole('button').allTextContents()};await s.page.getByRole('button',{name:'确认放弃草稿并重新读取',exact:true}).click();await s.page.locator('.knowledge-markdown .gank-editor[aria-busy=false]').waitFor();assert.equal(await current().innerText(),'B2.3 其他写入者已保存');assert.deepEqual(await node(),remote);pass('CAS recovery requires explicit draft-discard confirmation; cancelling retains draft and reread never overwrites remote data');
 assert.deepEqual(protectedData(),protectedBefore);report.status='PASS';
}catch(e){report.errors.push(String((e as Error).stack??e));process.exitCode=1;if(s)writeFileSync(join(out,(process.env.B2_REPORT??'b23-final.json')+'.dom.txt'),await s.page.locator('body').innerText().catch(()=>''));}
finally{if(s){report.ipcEvents=await s.app.evaluate(()=>(globalThis as any).b2Faults.events()).catch(()=>[]);writeFileSync(join(out,process.env.B2_REPORT??'b23-final.json'),JSON.stringify(report,null,2)+'\n');if(report.status!=='PASS')await s.app.evaluate(({BrowserWindow}:any)=>BrowserWindow.getAllWindows().forEach((w:any)=>w.destroy())).catch(()=>{});await stop(s.app,f.data);}writeFileSync(join(out,process.env.B2_REPORT??'b23-final.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.length,errors:report.errors}));
