import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {unifiedWorkspaceFixture} from '../../tests/fixtures/unified-workspace.ts';
const f=await unifiedWorkspaceFixture(),deckId=f.source.ids.qDeck,require=createRequire(import.meta.url),cases:string[]=[],errors:string[]=[],external:string[]=[];
async function add(name:string,parentId:string|null=null){const t=await f.client.call('knowledge.tree.read',{deckId});return f.client.call('knowledge.node.create',{deckId,expectedTreeHash:t.treeHash,name,parentId});}
const a=await add('界面根甲'),b=await add('界面根乙'),c=await add('拖动子节点',a.nodeId),mergeTarget=await add('合并界面目标');f.release();
let app:Awaited<ReturnType<typeof electron.launch>>|undefined,page:Awaited<ReturnType<NonNullable<typeof app>['firstWindow']>>;
async function launch(){ app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[]),resolve('tools/card-draft-spike/main.cjs')],env:{...process.env,GANKSOFT_DRAFT_TEST_CONTROL:f.control,GANKSOFT_DRAFT_TEST_SCOPE:JSON.stringify({deckId}),GANKSOFT_UNIFIED_TEST_ENTRY:'knowledge'}});
 page=await app.firstWindow();page.setDefaultTimeout(15000);await page.setViewportSize({width:1600,height:1000});page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,route=>{external.push(route.request().url());return route.abort();});await page.locator('.mind-canvas .me-tpc').filter({hasText:'界面根甲'}).waitFor();
}
async function close(){if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy()));await app.close();app=undefined;}}
async function query(method:string,payload:Record<string,unknown>){return page.evaluate(async({method,payload})=>{
 const call=(window as any).gank.protocol;const cap=await call({protocol:{major:2,minor:0},requestId:crypto.randomUUID(),dataEpoch:null,method:'app.capabilities',payload:{}});
 const result=await call({protocol:{major:2,minor:0},requestId:crypto.randomUUID(),dataEpoch:cap.dataEpoch,method,payload});if(!result.ok)throw Error(JSON.stringify(result));return result.data;
},{method,payload});}
const node=(name:string)=>page.locator('.mind-canvas .me-tpc').filter({hasText:name});
try{
 await launch();await page.getByRole('button',{name:'适应窗口',exact:true}).click();
 const canvas=page.locator('.mind-canvas'),area=(await canvas.boundingBox())!,before=(await node('界面根甲').boundingBox())!;
 await page.mouse.move(area.x+area.width/2,area.y+area.height-45);await page.mouse.down();await page.mouse.move(area.x+area.width/2+65,area.y+area.height-80,{steps:8});await page.mouse.up();
 const after=(await node('界面根甲').boundingBox())!;assert.ok(Math.abs(after.x-before.x-65)<3);assert.ok(Math.abs(after.y-before.y+35)<3);
 assert.equal(await page.getByRole('button',{name:'图谱已保存',exact:true}).isDisabled(),true);cases.push('blank left-pan moves canvas without dirtying tree or stealing node operations');
 await page.getByRole('button',{name:'适应窗口',exact:true}).click();
 let from=(await node('拖动子节点').boundingBox())!,to=(await node('界面根乙').boundingBox())!;
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x+from.width/2+12,from.y+from.height/2+12,{steps:4});await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:20});await page.mouse.up();
 await page.getByRole('button',{name:'保存图谱修改',exact:true}).waitFor();
 await page.getByRole('button',{name:'撤销',exact:true}).click();
 const parentInView=()=>page.evaluate(id=>{const visit=(n:any):string|null=>{if(n.children?.some((c:any)=>c.id===id))return n.id;for(const c of n.children??[]){const found=visit(c);if(found)return found;}return null;};return visit((window as any).knowledgeSpike.workspace.mind().getData().nodeData);},c.nodeId);
 assert.equal(await parentInView(),a.nodeId);await page.getByRole('button',{name:'重做',exact:true}).click();assert.equal(await parentInView(),b.nodeId);
 await page.getByRole('button',{name:'保存图谱修改',exact:true}).click();await page.getByRole('button',{name:'图谱已保存',exact:true}).waitFor();
 let tree=await query('knowledge.tree.read',{deckId});assert.equal(tree.nodes.find((n:any)=>n.nodeId===c.nodeId).parentId,b.nodeId);
 cases.push('real node mouse drag, public undo/redo and typed tree save persist the new parent');
 await node('拖动子节点').dblclick();await page.locator('.knowledge-markdown .ProseMirror').waitFor();
 await page.locator('.knowledge-markdown .ProseMirror').click();await page.keyboard.press('Control+End');await page.keyboard.insertText('正文重启验证');await page.keyboard.press('Control+s');
 await page.waitForFunction(()=>document.querySelector('.knowledge-markdown [data-save-state]')?.getAttribute('data-save-state')==='clean');
 assert.match((await query('knowledge.node.read',{deckId,nodeId:c.nodeId})).markdown,/正文重启验证/);
 assert.equal(await page.evaluate(()=>(window as any).knowledgeSpike.workspace.close()),true);await close();await launch();
 tree=await query('knowledge.tree.read',{deckId});assert.equal(tree.nodes.find((n:any)=>n.nodeId===c.nodeId).parentId,b.nodeId);
 await node('拖动子节点').dblclick();await page.locator('.knowledge-markdown .ProseMirror').waitFor();assert.match(await page.locator('.knowledge-markdown .ProseMirror').innerText(),/正文重启验证/);
 cases.push('current node Markdown Ctrl+S and hierarchy survive real Electron process restart');
 await app!.evaluate(()=>{(globalThis as any).cardDraftTest.ctx.db.exec("CREATE TEMP TRIGGER reject_node_ui BEFORE INSERT ON protocol_receipts WHEN NEW.method='knowledge.node.save' BEGIN SELECT RAISE(ABORT,'synthetic node UI save failure'); END");});
 await page.locator('.knowledge-markdown .ProseMirror').click();await page.keyboard.press('Control+End');await page.keyboard.insertText('失败保留正文');await page.keyboard.press('Control+s');await page.getByRole('button',{name:'重试保存正文',exact:true}).waitFor();
 assert.doesNotMatch((await query('knowledge.node.read',{deckId,nodeId:c.nodeId})).markdown,/失败保留正文/);assert.match(await page.locator('.knowledge-markdown .ProseMirror').innerText(),/失败保留正文/);
 assert.equal(await page.evaluate(()=>(window as any).knowledgeSpike.workspace.close()),false);
 await app!.evaluate(()=>{(globalThis as any).cardDraftTest.ctx.db.exec('DROP TRIGGER reject_node_ui');});await page.getByRole('button',{name:'重试保存正文',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.knowledge-markdown [data-save-state]')?.getAttribute('data-save-state')==='clean');
 assert.match((await query('knowledge.node.read',{deckId,nodeId:c.nodeId})).markdown,/失败保留正文/);cases.push('node save receipt failure retains editor content and blocks close until exact scope saves');
 await app!.evaluate(()=>{const t=(globalThis as any).cardDraftTest;(globalThis as any).__knowledgeExecute=t.host.execute.bind(t.host);t.host.execute=async(request:Record<string,unknown>)=>{const result=await (globalThis as any).__knowledgeExecute(request);if(request.method==='knowledge.node.save'||request.method==='operation.status')throw Error('synthetic knowledge response and status loss');return result;};});
 await page.locator('.knowledge-markdown .ProseMirror').click();await page.keyboard.press('Control+End');await page.keyboard.insertText('未知保存验证');await page.keyboard.press('Control+s');await page.getByRole('button',{name:'核对正文保存结果',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>(window as any).knowledgeSpike.workspace.close()),false);
 assert.equal(await page.locator('.knowledge-markdown [inert]').count(),1);
 await app!.evaluate(()=>{(globalThis as any).cardDraftTest.host.execute=(globalThis as any).__knowledgeExecute;});await page.getByRole('button',{name:'核对正文保存结果',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.knowledge-markdown [data-save-state]')?.getAttribute('data-save-state')==='clean');
 assert.equal((await query('knowledge.node.read',{deckId,nodeId:c.nodeId})).markdown.split('未知保存验证').length-1,1);cases.push('unknown node save keeps original request, locks editing/close and safely recovers without duplicating content');
 await page.getByRole('button',{name:'关闭知识栏',exact:true}).click();await node('界面根甲').click();await page.getByRole('button',{name:'合并知识点',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'合并知识点',exact:true});await dialog.getByLabel('合并到',{exact:true}).selectOption(mergeTarget.nodeId);await dialog.getByRole('button',{name:'预览合并',exact:true}).click();
 await dialog.getByRole('button',{name:'确认合并',exact:true}).waitFor();assert.ok((await query('knowledge.tree.read',{deckId})).nodes.some((n:any)=>n.nodeId===a.nodeId));
 await dialog.getByRole('button',{name:'取消',exact:true}).click();assert.ok((await query('knowledge.tree.read',{deckId})).nodes.some((n:any)=>n.nodeId===a.nodeId));
 await page.getByRole('button',{name:'合并知识点',exact:true}).click();await dialog.getByLabel('合并到',{exact:true}).selectOption(mergeTarget.nodeId);await dialog.getByRole('button',{name:'预览合并',exact:true}).click();await dialog.getByRole('button',{name:'确认合并',exact:true}).click();await dialog.waitFor({state:'detached'});
 assert.equal((await query('knowledge.tree.read',{deckId})).nodes.some((n:any)=>n.nodeId===a.nodeId),false);cases.push('separate merge preview/cancel/confirm keeps default target body and requires explicit confirmation');
 await page.getByRole('button',{name:'知识子树回收站',exact:true}).click();const recycle=page.getByRole('dialog',{name:'恢复知识子树',exact:true}),batches=await query('knowledge.recycle.list',{deckId});
 await recycle.getByLabel('回收批次',{exact:true}).selectOption(batches.find((x:any)=>x.rootId===a.nodeId).batchId);await recycle.getByRole('button',{name:'预览恢复',exact:true}).click();await recycle.getByRole('button',{name:'确认恢复',exact:true}).click();await recycle.waitFor({state:'detached'});
 assert.ok((await query('knowledge.tree.read',{deckId})).nodes.some((n:any)=>n.nodeId===a.nodeId));cases.push('recycle dialog previews and atomically restores the original source node identity');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}catch(e){console.error(e);if(page!){try{writeFileSync('/tmp/ganksoft-knowledge-ui-failure.html',await page.content());}catch{}}throw e;}
finally{mkdirSync('validation-results',{recursive:true});writeFileSync('validation-results/unified-knowledge-v075.json',JSON.stringify({platform:process.platform,cases,errors,external,manualWin10Win11:'NOT_RUN'},null,2));await close();f.close();}
console.log(JSON.stringify({cases,errors,external}));
