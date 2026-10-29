import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {settingsFixture} from '../../../tests/fixtures/ganksoft/settings.ts';
import {start,stop,openMap,nameNew,select,saveMap} from '../r5/support.ts';
const out='validation-results/r745/graph';mkdirSync(out,{recursive:true});
const report:any={status:'FAIL',cases:[],layouts:[],errors:[]};let s:any;
try{
 const f=await settingsFixture('r745-graph');s=await start(f.data);const p=s.page,api=s.api,deckId=f.deck.id;
 p.on('pageerror',(e:any)=>report.errors.push(e.message));await openMap(p,f.deck.name);
 const before=await api.call('knowledge.tree.read',{deckId});
 assert.equal(await p.locator('.mind-canvas .me-root').count(),1);
 await p.locator('[data-nodeid="me'+f.ids[0]+'"]').click();await p.getByRole('button',{name:'打开知识栏',exact:true}).click();
 const side=p.getByRole('region',{name:'知识点细节栏'}),mastery=await api.call('learning.mastery.knowledge',{deckId,nodeId:f.ids[0],scope:'direct'});
 await p.waitForFunction((count:number)=>document.querySelector('.r5-association-stats strong')?.textContent===String(count),mastery.cardIds.length).catch(async()=>{assert.match(await side.innerText(),new RegExp(String(mastery.cardIds.length)));});
 assert.deepEqual(await api.call('knowledge.tree.read',{deckId}),before);
 await p.getByRole('button',{name:'关闭知识栏',exact:true}).click();
 report.cases.push('sole root; exact tree/revision retained; API-derived association');
 await p.getByRole('button',{name:'新增一级知识点',exact:true}).click();await nameNew(p,'最终一级知识点');
 let tree=await api.call('knowledge.tree.read',{deckId}),added=tree.nodes.find((n:any)=>n.name==='最终一级知识点');assert.ok(added);assert.equal(added.parentId,null);assert.equal(tree.nodes.length,before.nodes.length+1);
 await select(p,'最终一级知识点');await p.getByLabel('更多知识点操作',{exact:true}).click();await p.getByRole('button',{name:'调整层级',exact:true}).click();const dlg=p.getByRole('dialog',{name:'调整知识点层级',exact:true});await dlg.getByLabel('新的上级',{exact:true}).selectOption(f.ids[0]);await dlg.getByRole('button',{name:'保存层级',exact:true}).click();await dlg.waitFor({state:'hidden'});
 tree=await api.call('knowledge.tree.read',{deckId});assert.equal(tree.nodes.find((n:any)=>n.nodeId===added.nodeId).parentId,f.ids[0]);
 await select(p,'最终一级知识点');await p.getByLabel('更多知识点操作',{exact:true}).click();await p.getByRole('button',{name:'重命名',exact:true}).click();await nameNew(p,'最终改名知识点');
 await p.getByLabel('更多知识点操作',{exact:true}).click();await p.getByRole('button',{name:'删除知识子树',exact:true}).click();const confirm=p.getByRole('dialog').filter({hasText:'将选中知识点及全部下级移入回收站'});await confirm.getByRole('button',{name:'确认',exact:true}).click();await p.waitForFunction((id:string)=>!document.querySelector('[data-nodeid="me'+id+'"]'),added.nodeId);
 assert.equal((await api.call('knowledge.tree.read',{deckId})).nodes.length,before.nodes.length);report.cases.push('native add/rename/reparent/delete; original nodes and links preserved');
 for(const width of [1500,1366,900]){await s.app.evaluate(({BrowserWindow}:any,w:number)=>BrowserWindow.getAllWindows()[0].setContentSize(w,900),width);const c=await p.context().newCDPSession(p);await c.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await c.detach();await p.waitForFunction((w:number)=>innerWidth===w,width);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);report.layouts.push({width,rootCount:await p.locator('.mind-canvas .me-root').count()});}
 const nav=p.getByRole('navigation',{name:'卡片集功能'}),images=nav.getByRole('button',{name:'图片资源',exact:true});await images.focus();await p.keyboard.press('Enter');await p.getByRole('region',{name:/图片资源/}).first().waitFor();assert.equal(await api.call('media.library.list',{deckId,query:'',offset:0}).then((v:any)=>v.total)>0,true);report.cases.push('threewidth layout and 900px image navigation focus/Enter; actual deck resources');
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.failure=String((e as Error).stack??e);process.exitCode=1;if(s)writeFileSync(out+'/failure.txt',await s.page.locator('body').innerText());}finally{if(s)await stop(s.app,'');writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
