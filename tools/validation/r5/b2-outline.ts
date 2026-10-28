// B2.1 only: isolated minimal real606 forest. No B1 exchange or R5.a suite rerun.
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {_electron as electron} from 'playwright-core';
import {prepareFreshUnified} from '../../../electron/infrastructure/migrations/coordinator.ts';
import {createFullRestoreSession} from '../../../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../../../shared/protocol/client.ts';
import {start,stop,openMap,args,require} from './support.ts';
const out='docs/v076/rebuild-v37-source-first/stages/R5/evidence/b2-1';mkdirSync(out,{recursive:true});
const root=mkdtempSync(join(tmpdir(),'gank-b2-outline-')),data=join(root,'synthetic606');
const report:any={status:'FAIL',base:'2bfd6246b90cc84cd81393c9b0358fec2c368995',scope:'B2.1 working tree; B2.2/B2.3 full safety matrix NOT_RUN',environment:{platform:process.platform,node:process.version,electron:require('electron/package.json').version,font:execFileSync('fc-match',['Noto Sans CJK SC'],{encoding:'utf8'}).trim()},cases:[],visuals:[],errors:[]};
const hash=(value:any)=>createHash('sha256').update(value).digest('hex');
report.prototypeSha256=hash(readFileSync('docs/v075/reference/OPEN-ME-v3.7.html'));
let s:any,refApp:any;
const pass=(name:string,details:any={})=>report.cases.push({name,status:'PASS',...details});
async function settle(p:any){await p.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});}
async function size(app:any,p:any,width:number){await app.evaluate(({BrowserWindow}:any,w:number)=>{BrowserWindow.getAllWindows()[0].setContentSize(w,900);},width);const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await settle(p);return cdp;}
async function snapshot(p:any,production:boolean){return p.evaluate((production:boolean)=>{
 const selectors=production?{workbench:'.native-outline-workbench',document:'.outline-body',toc:'.native-outline-workbench > nav',toolbar:'.r5-mapbar',footer:'.r5-map-footer'}:{workbench:'.knowledge-workbench .map-layout',document:'.knowledge-outline',toc:'.knowledge-outline-toc',toolbar:'.knowledge-mapbar',footer:'.knowledge-map-footer'};
 function info(el:Element){const r=el.getBoundingClientRect(),c=getComputedStyle(el);return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,font:c.fontFamily,fontSize:c.fontSize,color:c.color,background:c.backgroundColor,padding:c.padding,overflow:c.overflow,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};}
 return {width:innerWidth,height:innerHeight,dpr:devicePixelRatio,regions:Object.fromEntries(Object.entries(selectors).map(([k,v])=>{const e=document.querySelector(v);return [k,e?info(e):null]})),modules:[...document.querySelectorAll('[data-outline-entry]')].map(e=>({id:e.getAttribute('data-outline-entry'),depth:e.getAttribute('data-depth'),heading:e.querySelector('strong')?.textContent,...info(e)})),navigation:[...document.querySelectorAll(production?'[data-outline-nav]':'.knowledge-outline-toc .knowledge-nav-row')].map(e=>({name:e.textContent?.trim(),...info(e)})),editables:document.querySelectorAll('.knowledge-markdown [contenteditable=true]').length,bodyWidth:document.documentElement.scrollWidth};
 },production);}
try{
 assert.match(report.environment.font,/Noto Sans CJK SC/);
 assert.equal(report.prototypeSha256,'8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015');
 await prepareFreshUnified(data,data+'-control606');
 const fixture=await createFullRestoreSession(data+'-control606',{workspaceParent:root,selectBackup:async()=>null,allowLegacyRestore:false});
 let deck:any,tree:any;const ids:string[]=[],bodies=new Map<string,any>();
 try{
 const api=createClient(r=>fixture.execute(r));await api.call('app.capabilities',{});
 const original=(await api.call('workspace.catalog',{})).items.find(x=>x.kind==='deck')!;
 deck={...await api.call('workspace.catalog.save',{kind:'deck',id:original.id,name:'B2 文档式大纲合成',parentId:null,expectedRevision:original.revision}),name:'B2 文档式大纲合成'};
 tree=await api.call('knowledge.tree.read',{deckId:deck.id});
 let parentId:string|null=null;
 const names=['言语理解','逻辑填空','语境分析','关系判断','转折关系','细节辨析','第七层真实节点'];
 for(const [i,name] of [...names,'资料分析','细节辨析'].entries()){
 if(i===7)parentId=null;
 const n=await api.call('knowledge.node.create',{deckId:deck.id,expectedTreeHash:tree.treeHash,parentId,name});
 const markdown=i===2?'## 观察语境\n\n- 先看转折\n- 再看搭配\n\n| 线索 | 作用 |\n| --- | --- |\n| 但是 | 转折 |\n\n公式 $a^2+b^2=c^2$\n':`正文 ${i+1}：${name}，属于${i<7?'言语理解':'资料分析'}。\n`;
 await api.call('knowledge.node.save',{deckId:deck.id,nodeId:n.nodeId,expectedRevision:n.revision,markdown});
 ids.push(n.nodeId);parentId=n.nodeId;tree=await api.call('knowledge.tree.read',{deckId:deck.id});bodies.set(n.nodeId,await api.call('knowledge.node.read',{deckId:deck.id,nodeId:n.nodeId}));
 }
 assert.equal(fixture.ctx.db.prepare('PRAGMA user_version').get()!.user_version,606);assert.equal(fixture.ctx.db.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');
 }finally{fixture.close();}
 mkdirSync('validation-results/r5-b2',{recursive:true});writeFileSync('validation-results/r5-b2/fixture.json',JSON.stringify({root,data,deck,ids,tree},null,2)+'\n');
 s=await start(data);const {page:p,api}=s;p.on('pageerror',(e:any)=>report.errors.push(e.message));await openMap(p,deck.name);
 await p.getByRole('button',{name:'Markdown 大纲',exact:true}).click();
 await p.locator('.native-outline-workbench .gank-editor[aria-busy=false]').waitFor();
 const nav=p.getByRole('navigation',{name:'大纲分级目录'}),doc=p.getByRole('main',{name:'知识点 Markdown 文档'});
 assert.equal(await doc.locator('.knowledge-outline-root').count(),2);assert.equal(await doc.locator('[data-outline-entry]').count(),9);
 assert.deepEqual(await doc.locator('[data-outline-entry]').evaluateAll((els:any[])=>els.map(e=>[e.dataset.outlineEntry,+e.dataset.depth])),ids.map((id,i)=>[id,i<7?i+1:i-6]));
 for(const [i,id] of ids.entries()){const row=nav.locator(`[data-outline-nav="${id}"]`);assert.equal(await row.getAttribute('data-depth'),String(i<7?i:i-7));}
 assert.equal(await doc.locator(`[data-outline-entry="${ids[6]}"] .outline-mark`).innerText(),'L7');
 pass('two real roots, nine exact IDs, true seven-level hierarchy and unambiguous same-name nodes');
 const offsets=await nav.locator('[data-outline-nav]').evaluateAll((els:any[])=>els.slice(0,7).map(e=>parseFloat(getComputedStyle(e).paddingLeft)));
 assert.ok(offsets.every((x:number,i:number)=>i===0||x>offsets[i-1]));pass('TOC indentation increases at every actual depth',{offsets});
 await nav.getByRole('button',{name:'收起 言语理解',exact:true}).click();assert.equal(await nav.locator(`[data-outline-nav="${ids[6]}"]`).count(),0);
 await nav.getByRole('button',{name:'展开 言语理解',exact:true}).click();await nav.locator(`[data-outline-nav="${ids[6]}"]`).waitFor();
 await nav.locator(`[data-outline-nav="${ids[6]}"] .outline-label`).click();await p.locator('.active-body .gank-editor[aria-busy=false]').waitFor();
 assert.match(await p.locator('.active-body .ProseMirror').innerText(),/第七层真实节点/);
 const loc=await doc.locator(`[data-outline-entry="${ids[6]}"]`).boundingBox(),scroll=await doc.boundingBox();assert.ok(loc&&scroll&&loc.y>=scroll.y&&loc.y<scroll.y+scroll.height);
 await nav.locator(`[data-outline-nav="${ids[8]}"] .outline-label`).click();await p.locator('.active-body .gank-editor[aria-busy=false]').waitFor();assert.match(await p.locator('.active-body .ProseMirror').innerText(),/属于资料分析/);
 pass('TOC collapse/expand and selection locate exact seventh-level and duplicate-name bodies');
 await doc.getByRole('button',{name:'展开正文 语境分析',exact:true}).click();const preview=doc.locator(`[data-outline-entry="${ids[2]}"] .gank-content`);await preview.locator('.ProseMirror').waitFor();assert.match(await preview.innerText(),/先看转折/);assert.equal(await preview.locator('table:has(th)').count(),1);assert.equal(await preview.locator('th').allTextContents().then(xs=>xs.map(x=>x.trim())).then(JSON.stringify),JSON.stringify(['线索','作用']));assert.equal(await preview.locator('[contenteditable=true]').count(),0);assert.equal(await p.locator('.knowledge-markdown [contenteditable=true]').count(),1);
 assert.deepEqual(await api.call('knowledge.tree.read',{deckId:deck.id}),tree);for(const id of ids)assert.deepEqual(await api.call('knowledge.node.read',{deckId:deck.id,nodeId:id}),bodies.get(id));
 pass('independent readonly Markdown module renders existing headings/lists/table/formula path with only one writable body and exact zero writes');
 // Necessary regression for the changed slot/container: hiding the active body
 // cannot unmount its draft, and selecting another module must flush it.
 const active=p.locator('.active-body .ProseMirror');await active.fill('B2.1 折叠保护的正文草稿');
 await doc.getByRole('button',{name:'收起正文 细节辨析',exact:true}).last().click();assert.equal(await p.locator('.active-body .gank-editor').count(),1);assert.equal(await p.locator('.active-body').isVisible(),false);
 await doc.getByRole('button',{name:'展开正文 细节辨析',exact:true}).last().click();assert.match(await p.locator('.active-body .ProseMirror').innerText(),/折叠保护/);
 await nav.locator(`[data-outline-nav="${ids[2]}"] .outline-label`).click();await doc.locator(`[data-outline-entry="${ids[2]}"] .gank-editor[aria-busy=false]`).waitFor();const changed=await api.call('knowledge.node.read',{deckId:deck.id,nodeId:ids[8]});assert.match(changed.markdown,/折叠保护/);assert.equal(changed.revision,bodies.get(ids[8]).revision+1);
 for(const id of ids.slice(0,8))assert.deepEqual(await api.call('knowledge.node.read',{deckId:deck.id,nodeId:id}),bodies.get(id));
 pass('active module folding retains editor/draft; TOC node switch flushes only original node via existing CAS');
 const savedTree=await api.call('knowledge.tree.read',{deckId:deck.id});
 await doc.getByRole('button',{name:'收起正文 语境分析',exact:true}).click();
 await p.getByRole('searchbox',{name:'搜索知识点名称',exact:true}).fill('语境分析');await p.getByRole('button',{name:'定位',exact:true}).click();await p.locator('.active-body:visible').waitFor();
 await p.getByRole('searchbox',{name:'搜索知识点名称',exact:true}).fill('第七层真实节点');await p.getByRole('button',{name:'定位',exact:true}).click();await doc.locator(`[data-outline-entry="${ids[6]}"] .gank-editor[aria-busy=false]`).waitFor();
 assert.match(await p.locator('.active-body .ProseMirror').innerText(),/第七层真实节点/);assert.deepEqual(await api.call('knowledge.tree.read',{deckId:deck.id}),savedTree);
 await nav.locator(`[data-outline-nav="${ids[2]}"] .outline-label`).click();await doc.locator(`[data-outline-entry="${ids[2]}"] .gank-editor[aria-busy=false]`).waitFor();
 pass('search reveals folded active body and locates a deep module without changing saved tree');
 await p.getByRole('button',{name:'全屏',exact:true}).click();
 // Frozen HTML is loaded unchanged; only its demonstration state receives the
 // same fixture IDs/hierarchy/content for this outline-specific comparison.
 const roots:any[]=[];const byId=new Map<string,any>();for(const n of tree.nodes){const node={id:n.nodeId,name:n.name,content:bodies.get(n.nodeId).markdown,children:[]};byId.set(n.nodeId,node);}for(const n of tree.nodes){if(n.parentId)byId.get(n.parentId).children.push(byId.get(n.nodeId));else roots.push(byId.get(n.nodeId));}
 const script=join(root,'reference.cjs');writeFileSync(script,`const {app,BrowserWindow}=require('electron');app.whenReady().then(()=>new BrowserWindow({width:1366,height:900,webPreferences:{offscreen:process.platform==='linux'}}).loadFile(${JSON.stringify(resolve('docs/v075/reference/OPEN-ME-v3.7.html'))}));`);
 refApp=await electron.launch({executablePath:require('electron'),args:[...args,script]});const rp=await refApp.firstWindow();await rp.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
 await rp.evaluate(({roots,id}:any)=>(0,eval)(`knowledgeForests.language=${JSON.stringify(roots)};Object.assign(state,{page:'knowledge',deck:'language',mapSelectedId:${JSON.stringify(id)}});Object.assign(knowledgeState,{view:'outline',fullscreen:true,outlineExpanded:new Set([${JSON.stringify(id)}]),navCollapsed:new Set()});render();`),{roots,id:ids[2]});
 for(const width of [1500,1366,900]){
 const pc=await size(s.app,p,width),rc=await size(refApp,rp,width);
 await nav.locator(`[data-outline-nav="${ids[2]}"] .outline-label`).click();await p.locator('.outline-body').evaluate((e:any)=>e.scrollTop=0);await rp.locator('.knowledge-outline').evaluate((e:any)=>e.scrollTop=0);await settle(p);
 for(const [label,page,isProd] of [['production',p,true],['reference',rp,false]] as const){
 const snap:any=await snapshot(page,isProd),name=`${label}-outline-${width}`;writeFileSync(join(out,name+'.json'),JSON.stringify(snap,null,2)+'\n');await page.screenshot({path:join(out,name+'.png')});
 if(isProd){assert.equal(snap.bodyWidth,width);assert.equal(snap.editables,1);const {document:d,toc:t,toolbar:b,footer:f}=snap.regions;assert.ok(d&&t&&b&&f);assert.ok(d.y>=b.bottom-1&&d.bottom<=f.y+1);assert.ok(d.right<=t.x+1&&t.right<=width);assert.ok(t.width>=210);assert.ok(d.scrollWidth<=d.clientWidth+1);const tocScroll=await page.locator('.outline-toc-scroll').evaluate((e:any)=>({scroll:e.scrollWidth,client:e.clientWidth}));assert.ok(tocScroll.scroll<=tocScroll.client+1);}
 report.visuals.push({name,status:'PASS',sha256:hash(readFileSync(join(out,name+'.png'))),regions:snap.regions});
 }
 await pc.detach();await rc.detach();
 }
 pass('formal Electron three-width outline geometry, one writable instance, PNG and DOM/CSS with frozen matched-state reference');
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.errors.push(String((e as Error).stack??e));process.exitCode=1;if(s){await s.page.screenshot({path:join(out,'failure.png')}).catch(()=>{});writeFileSync(join(out,'failure-dom.txt'),await s.page.locator('body').innerText().catch(()=>''));}}
finally{if(refApp)await refApp.close();if(s)await stop(s.app,data);writeFileSync(join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.length,visuals:report.visuals.length,errors:report.errors}));
