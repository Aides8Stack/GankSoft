import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,mkdtempSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {build} from 'vite';
import vue from '@vitejs/plugin-vue';
import {prepareFreshUnified} from '../../../electron/infrastructure/migrations/coordinator.ts';
import {createFullRestoreSession} from '../../../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../../../shared/protocol/client.ts';
import {stageImage} from '../../../electron/modules/media/drafts.ts';
import {placementUrl} from '../../../shared/editor/document.ts';
import {Transformer} from '@napi-rs/image';
import {start,stop,openMap} from './support.ts';
const out='docs/v076/rebuild-v37-source-first/stages/R5/evidence/b2-2';mkdirSync(out,{recursive:true});
const report:any={base:'28cc2ad4f0a92401b410907ff51a5755f2437db8',status:'FAIL',cases:[],errors:[],scope:'B2.2 lifecycle gates in validation build; production UI uses uninstrumented build'},pass=(name:string,details:any={})=>report.cases.push({name,status:'PASS',...details});
let session:any,fixture:any;const metadata='validation-results/r5-b2-2/fixture.json';
try{
 if(existsSync(metadata)){fixture=JSON.parse(readFileSync(metadata,'utf8'));assert.ok(existsSync(fixture.data+'-control606/active.json'));}
 else{
  const root=mkdtempSync(join(tmpdir(),'gank-b2-lifecycle-')),data=join(root,'synthetic606');await prepareFreshUnified(data,data+'-control606');
  const owner=await createFullRestoreSession(data+'-control606',{workspaceParent:root,selectBackup:async()=>null,allowLegacyRestore:false});
  try{const api=createClient(r=>owner.execute(r));await api.call('app.capabilities',{});const deck=(await api.call('workspace.catalog',{})).items.find(x=>x.kind==='deck')!;
   const name='B2 生命周期合成';await api.call('workspace.catalog.save',{kind:'deck',id:deck.id,name,parentId:null,expectedRevision:deck.revision});
   const ids:string[]=[];for(const name of ['生命周期甲','生命周期乙','生命周期子']){const tree=await api.call('knowledge.tree.read',{deckId:deck.id});const n=await api.call('knowledge.node.create',{deckId:deck.id,expectedTreeHash:tree.treeHash,parentId:ids.length===2?ids[0]:null,name});ids.push(n.nodeId);}
   const png=Transformer.fromRgbaPixels(Buffer.from([40,130,80,255]),1,1).pngSync(),asset=stageImage(owner.ctx,deck.id,'knowledge',png,'image/png'),placement=placementUrl({assetId:asset.id,placementId:crypto.randomUUID(),width:30});
   const a=await api.call('knowledge.node.read',{deckId:deck.id,nodeId:ids[0]});await api.call('knowledge.node.save',{deckId:deck.id,nodeId:a.nodeId,expectedRevision:a.revision,markdown:`甲节点原文\n\n![合成像素](${placement})\n`});
   const b=await api.call('knowledge.node.read',{deckId:deck.id,nodeId:ids[1]});await api.call('knowledge.node.save',{deckId:deck.id,nodeId:b.nodeId,expectedRevision:b.revision,markdown:'乙节点原文\n'});
   fixture={root,data,deck:{id:deck.id,name},ids,asset,placement};mkdirSync('validation-results/r5-b2-2',{recursive:true});writeFileSync(metadata,JSON.stringify(fixture,null,2)+'\n');
  }finally{owner.close();}
 }
 await build({configFile:false,base:'./',plugins:[vue(),{name:'validation-only-lifecycle-gates',enforce:'pre',transform(code,id){if(!id.endsWith('/src/editor/milkdown-adapter.ts'))return;assert.equal(code.split('await crepe.create();').length,2);return code.replace('await crepe.create();','await (window as any).b2Gate?.("create"); await crepe.create();').replace('await crepe.destroy();','await (window as any).b2Gate?.("destroy"); await crepe.destroy();');}}],build:{outDir:'dist/assets/b2-lifecycle',emptyOutDir:true,assetsInlineLimit:0,rollupOptions:{input:resolve('tools/validation/r5/b2-lifecycle.html')}}});
 session=await start(fixture.data);const {page:p}=session;
 await p.goto('gank-app://ui/assets/b2-lifecycle/tools/validation/r5/b2-lifecycle.html');await p.waitForFunction(()=>!!(window as any).b2Lifecycle);
 for(const method of ['abortInitialization','disableBeforeAsyncDestroy']){
  try{let timer:ReturnType<typeof setTimeout>|undefined;try{pass(method,await Promise.race([p.evaluate(async method=>(window as any).b2Lifecycle[method](),method),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('bounded lifecycle test timeout')),15000);})]));}finally{clearTimeout(timer);}}
  catch(e){report.cases.push({name:method,status:'FAIL',error:String(e)});}
 }
 if(report.cases.some((x:any)=>x.status==='FAIL'))throw Error('controlled lifecycle assertions failed');
 if(!process.argv.includes('--adapter-only')){
  await p.goto('gank-app://ui/index.html');await p.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();await openMap(p,fixture.deck.name);
  await p.getByRole('button',{name:'Markdown 大纲',exact:true}).click();await p.locator('.active-body .gank-editor[aria-busy=false]').waitFor();
  // Count all writable native DOMs at every mutation, including detached owners
  // in the controlled test above; production count covers every mounted instant.
  await p.evaluate(()=>{(window as any).b2Counts=[];const take=()=>{(window as any).b2Counts.push(document.querySelectorAll('.knowledge-markdown [contenteditable=true]').length);};new MutationObserver(take).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['contenteditable']});take();});
  const nav=p.getByRole('navigation',{name:'大纲分级目录'}),choose=async(id:string)=>{await nav.locator(`[data-outline-nav="${id}"] .outline-label`).click();await p.locator(`[data-outline-entry="${id}"] .gank-editor[aria-busy=false]`).waitFor();};
  const {api}=session,scope={deckId:fixture.deck.id},before=await api.call('knowledge.tree.read',scope),other=await api.call('knowledge.node.read',{...scope,nodeId:fixture.ids[2]});
  await choose(fixture.ids[0]);const editor=p.locator('.active-body .ProseMirror');assert.equal(await editor.locator('img[data-gank-placement]').count(),1);
  await editor.click();await editor.press('Control+End');await p.keyboard.type(' B2.2 快速修改');
  // Dispatch competing real UI selections in the same event turn, before the
  // first asynchronous flush returns. Final owner must not inherit A's draft.
  await nav.evaluate((el:any,ids:string[])=>{for(const id of ids)el.querySelector(`[data-outline-nav="${id}"] .outline-label`)?.click();},[fixture.ids[1],fixture.ids[2],fixture.ids[1]]);
  await p.locator(`[data-outline-entry="${fixture.ids[1]}"] .gank-editor[aria-busy=false]`).waitFor();
  const a=await api.call('knowledge.node.read',{...scope,nodeId:fixture.ids[0]});assert.match(a.markdown,/B2.2 快速修改/);assert.ok(a.markdown.includes(fixture.placement));
  assert.equal(await editor.innerText(),'乙节点原文');await editor.press('Control+z');assert.equal(await editor.innerText(),'乙节点原文');
  assert.deepEqual(await api.call('knowledge.node.read',{...scope,nodeId:fixture.ids[2]}),other);
  pass('concurrent quick UI node switches flush only original node and do not transfer native history',{saved:a});
  await editor.fill('B2.2 原生格式历史');await editor.press('Control+a');await editor.press('Control+b');await p.waitForFunction(()=>!!document.querySelector('.active-body .ProseMirror strong'));
  await editor.press('Control+z');assert.equal(await editor.locator('strong').count(),0);await editor.press('Control+Shift+z');assert.equal(await editor.locator('strong').count(),1);
  await choose(fixture.ids[0]);await editor.press('Control+z');assert.match(await editor.innerText(),/甲节点原文/);assert.equal(await editor.locator('img[data-gank-placement]').count(),1);
  // Width uses the existing public image adapter and native history, not a new
  // undo stack or image-management feature.
  const width=p.getByRole('spinbutton',{name:'图片 1 宽度',exact:true});await width.fill('55');await width.press('Tab');assert.match(await editor.locator('img').getAttribute('style')??'',/55%/);
  await editor.press('Control+z');assert.match(await editor.locator('img').getAttribute('style')??'',/30%/);await editor.press('Control+Shift+z');assert.match(await editor.locator('img').getAttribute('style')??'',/55%/);
  await p.getByRole('button',{name:'思维导图',exact:true}).click();await p.getByRole('button',{name:'Markdown 大纲',exact:true}).click();await p.locator('.active-body .gank-editor[aria-busy=false]').waitFor();
  assert.equal(await editor.locator('img[data-gank-placement]').count(),1);assert.match(await editor.locator('img').getAttribute('style')??'',/55%/);
  const counts=await p.evaluate(()=>(window as any).b2Counts);assert.ok(counts.every((n:number)=>n<=1));
  const final=await api.call('knowledge.tree.read',scope);assert.deepEqual(final.nodes.map(({revision,...n}:any)=>n),before.nodes.map(({revision,...n}:any)=>n));
  assert.deepEqual(await api.call('knowledge.node.read',{...scope,nodeId:fixture.ids[2]}),other);pass('native formatting and image width undo/redo, map-outline remount, single writable instance and unchanged real hierarchy',{counts,tree:final});
 }
 report.status='PASS';
}catch(e){report.errors.push(String((e as Error).stack??e));process.exitCode=1;}
finally{if(session)await stop(session.app,fixture.data);writeFileSync(join(out,process.env.B2_REPORT??'verification.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases,errors:report.errors}));
