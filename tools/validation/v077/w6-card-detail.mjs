// W6 targeted production Vue/Electron user actions; API calls only seed/read/concurrent-writer probes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {_electron as electron} from 'playwright-core';
import {freshFixture} from './scenarios/m1-support.mjs';
import {createFullRestoreSession} from '../../../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../../../shared/protocol/client.ts';
import {seedW6} from '../../../tests/fixtures/w6-card-detail.ts';
import {args,require} from '../r5/support.ts';
const out=resolve(process.env.W6_EVIDENCE_DIR??'validation-results/w6');mkdirSync(out,{recursive:true});
const hash=v=>createHash('sha256').update(v).digest('hex');
const report={sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceTree:execFileSync('git',['rev-parse','HEAD:'],{encoding:'utf8'}).trim(),platform:process.platform,startedAt:new Date().toISOString(),cases:[],checks:[],pids:[],windowsCI:'NOT_RUN',windows10:'NOT_RUN',windows11:'NOT_RUN',physical125DPI:'NOT_RUN',faultBoundary:'test-only main process IPC wrapper; production handler used unless explicitly faulted'};
report.sourceFiles=Object.fromEntries(execFileSync('git',['ls-files','--','src','shared','electron'],{encoding:'utf8'}).trim().split('\n').map(p=>[p,hash(readFileSync(p))]));
report.scriptFiles=Object.fromEntries(['tools/validation/v077/w6-card-detail.mjs','tools/validation/v077/w6-host.cjs','tests/fixtures/w6-card-detail.ts'].map(p=>[p,hash(readFileSync(p))]));
let f,ids,s,owner,stage='seed';const errors=[];
const p=()=>s.page,detail=()=>p().locator('.w6-detail'),panel=()=>p().locator('.w6-knowledge-links'),dialog=()=>p().locator('dialog[data-knowledge-picker-host]');
const save=()=>writeFileSync(join(out,'result.json'),JSON.stringify({...report,stage,errors},null,2)+'\n');
function check(name,extra={}){report.checks.push({name,status:'PASS',...extra});console.log('PASS '+name);save();}
function pass(id){report.cases.push({id,status:'PASS'});save();}
function sql(fn){const a=JSON.parse(readFileSync(f.data+'-control606/active.json')),db=new DatabaseSync(join(a.activeDir,'ganksoft.sqlite'),{readOnly:true});try{return fn(db);}finally{db.close();}}
function frozen(){return sql(db=>hash(JSON.stringify(['learning_review_events','schedule_events','scheduling','learning_cards','learning_content_versions','knowledge'].map(t=>db.prepare('SELECT * FROM '+t+' ORDER BY 1').all()))));}
function relationsDB(){return sql(db=>db.prepare('SELECT value FROM settings WHERE key=?').get('unified-card-knowledge:'+ids.question)?.value);}
async function flags(v){await s.app.evaluate((_,value)=>globalThis.w6.set(value),v);}
async function calls(){return s.app.evaluate(()=>globalThis.w6.calls());}
async function waitFor(fn,arg){await p().waitForFunction(fn,arg);}
async function launch(){const app=await electron.launch({executablePath:require('electron'),args:[...args,resolve('tools/validation/v077/w6-host.cjs')],env:{...process.env,TZ:'Asia/Shanghai',GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:f.data},timeout:30000});const page=await app.firstWindow();page.setDefaultTimeout(18000);page.on('pageerror',e=>errors.push(String(e)));await page.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();report.pids.push(app.process().pid);const api=createClient(r=>page.evaluate(v=>window.gank.protocol(v),r));await api.call('app.capabilities',{});return {app,page,api};}
async function cards(){await p().locator('[data-catalog-id="'+ids.deckId+'"] > .deck-link').click();await p().getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();await p().locator('.r3-cards').waitFor();}
async function open(title='W6-question-材料'){await p().locator('.r3-cards .card-title-link').filter({hasText:new RegExp('^'+title+'$')}).click();await detail().waitFor();await p().getByRole('button',{name:'修改关联',exact:true}).waitFor();await waitFor(()=>!document.querySelector('.w6-detail')?.getAttribute('aria-busy')?.includes('true'));await waitFor(()=>!document.querySelector('.w6-knowledge-links button')?.disabled);}
async function back(){await detail().locator('.page-heading .heading-actions button').first().click();await p().locator('.r3-cards').waitFor();}
async function modify(){await panel().getByRole('button',{name:'修改关联',exact:true}).click();await dialog().waitFor({state:'visible'});await dialog().getByRole('button',{name:'确认选择',exact:true}).isEnabled();await dialog().locator('.knowledge-exchange-map [data-knowledge-id]').first().waitFor();}
async function pick(id){await dialog().locator('.knowledge-exchange-map [data-knowledge-id="'+id+'"]').click();}
async function confirm(){await dialog().getByRole('button',{name:'确认选择',exact:true}).click();await dialog().waitFor({state:'hidden'});await panel().locator('.w6-link-editor').waitFor();}
async function submit(){await panel().getByRole('button',{name:'保存关联',exact:true}).click();}
async function verified(){await panel().getByText('关联已保存，并已重新读取数据库验证。',{exact:true}).waitFor();}
async function reread(){await panel().getByRole('button',{name:'重新读取当前关联',exact:true}).click();await p().getByText(/已重新读取当前关联；待保存选择保留/).waitFor();}
async function external(nodeIds){await s.api.call('knowledge.cardLinks.set',{deckId:ids.deckId,cardId:ids.question,nodeIds,expectedRevision:(await s.api.call('knowledge.cardLinks.get',{deckId:ids.deckId,cardId:ids.question})).revision});}
async function readLinks(){return (await s.api.call('knowledge.cardLinks.get',{deckId:ids.deckId,cardId:ids.question})).nodeIds;}
const groups=new Set((process.env.W6_GROUPS??'1,2,3,4,5,6,7,8').split(','));
try{
 if(process.env.W6_FIXTURE_FILE){({f,ids}=JSON.parse(readFileSync(process.env.W6_FIXTURE_FILE)));}else{f=await freshFixture({unicode:true});owner=await createFullRestoreSession(f.data+'-control606',{workspaceParent:f.root,selectBackup:async()=>null,allowLegacyRestore:false});const api=createClient(r=>owner.execute(r));await api.call('app.capabilities',{});ids=await seedW6(api,owner.ctx);owner.close();owner=null;writeFileSync(join(out,'fixture.json'),JSON.stringify({f,ids},null,2));}
 s=await launch();await cards();await open();const before=frozen();
 if(groups.has('1')){
  stage='W6-01';assert.ok((await detail().locator('.w6-material').innerText()).includes('材料位于题干之前'));
  for(const width of [900,1366,1600]){
   await s.app.evaluate(({BrowserWindow},v)=>BrowserWindow.getAllWindows()[0].setSize(v,950),width);
   await p().locator('.w6-option-copy .ProseMirror').first().waitFor();
   const g=await detail().evaluate(el=>{const q=x=>el.querySelector(x).getBoundingClientRect();return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,cols:getComputedStyle(el.querySelector('.w6-option-grid')).gridTemplateColumns.split(' ').length,material:q('.w6-material').top,stem:q('.w6-stem').top,options:q('.w6-option-grid').top,rows:[...el.querySelectorAll('.w6-option-row')].map(row=>{const a=row.querySelector('.w6-option-letter').getBoundingClientRect(),b=row.querySelector('.w6-option-copy p').getBoundingClientRect(),t=row.querySelector('.w6-option-copy');return {a:a.top,b:b.top,letterWidth:a.width,overflow:t.scrollWidth>t.clientWidth,text:b.height};})};});
   assert.equal(g.width,width);assert.equal(g.overflow,false);assert.ok(g.material<g.stem&&g.stem<g.options);assert.equal(g.cols,width===900?1:2);assert.ok(g.rows.every(r=>Math.abs(r.a-r.b)<3&&!r.overflow));assert.ok(g.rows[0].text>40);await p().screenshot({path:join(out,'question-'+width+'.png')});check('W6-01 real window geometry '+width,g);
  }
  await back();await open('W6-question');assert.equal(await detail().locator('.w6-material').count(),0);await back();await open();pass('W6-01');
 }
 if(groups.has('2')){
  stage='W6-02';await p().locator('.w6-answer-analysis .ProseMirror table:visible').first().waitFor();assert.match(await detail().locator('.w6-correct-answer').innerText(),/正确答案 B/);assert.match(await detail().locator('.w6-correct-answer').innerText(),/第二项/);
  assert.equal(await detail().locator('.w6-answer-analysis').count(),1);assert.ok((await detail().locator('.w6-answer-analysis').innerText()).includes('初始推理保留'));
  await waitFor(()=>{const img=document.querySelector('.w6-answer-analysis img[data-gank-placement]');return img?.complete&&img.naturalWidth>0;});assert.ok(await detail().locator('.w6-answer-analysis .katex').count()>0);check('W6-02 correctOptionId resolves second array item; table/math/asset rendered');
  check('W6-02 defensive missing-answer coverage: tests/w6-card-detail-v077.test.ts (separate Node run); protocol refuses invalid published content');pass('W6-02');
 }
 if(groups.has('3')){
  stage='W6-03';for(const [title,region] of [['W6-qa','问题与答案'],['W6-direct','直接记忆正文']]){await back();await open(title);await p().getByRole('region',{name:region,exact:true}).waitFor();assert.equal(await detail().locator('.w6-option-grid,.w6-answer-analysis').count(),0);await waitFor(()=>{const img=document.querySelector('.w6-content-panel img[data-gank-placement]');return img?.complete&&img.naturalWidth>0;});await detail().locator('.w6-content-panel .katex').first().waitFor();if(title==='W6-qa')assert.match(await detail().locator('.w6-content-panel').innerText(),/QA问题[\s\S]*QA答案[\s\S]*补充内容/);else await detail().locator('.w6-content-panel table:visible').first().waitFor();check('W6-03 mode and media '+title);}
  await back();await open();pass('W6-03');
 }
 if(groups.has('4')){
  stage='W6-04';assert.equal(await p().locator('.w6-statistics').count(),1);assert.equal(await p().locator('.w6-recent .history-row').count(),3);assert.match(await p().locator('.w6-stat-metrics').innerText(),/23 次[\s\S]*8.5/);assert.equal(await p().locator('.w6-history-panel').getAttribute('open'),null);
  await p().getByRole('button',{name:'全部历史 →',exact:true}).click();assert.equal(await p().locator('.detail-history-list button').count(),20);await p().getByRole('button',{name:'更多历史记录',exact:true}).click();await waitFor(()=>document.querySelectorAll('.detail-history-list button').length===23);await p().locator('.detail-history-list button').last().click();await p().getByRole('region',{name:'当次复盘证据',exact:true}).waitFor();const evidence=await p().locator('.w6-event-evidence').innerText();assert.match(evidence,/自评 8.5[\s\S]*当时思路[\s\S]*当次反思/);for(const name of ['知识点A','知识点B','知识点C'])assert.ok(evidence.includes(name));check('W6-04 cursor pagination 20→23 / event-time score, choice, thought, reflection, A/B/C');pass('W6-04');
 }
 if(groups.has('5')){
  stage='W6-05';assert.match(await panel().innerText(),/W6逻辑根 \/ 知识点A/);await flags({missingNode:ids.B});await back();await open();assert.match(await panel().innerText(),/知识点已失效/);assert.ok((await readLinks()).includes(ids.B));await flags({missingNode:''});
  await back();await open('W6-direct');assert.match(await panel().innerText(),/当前尚未关联知识点/);await back();await flags({failRead:1});
  // Initial failure must show a recoverable relation error while retaining the card itself.
  await p().locator('.r3-cards .card-title-link').filter({hasText:/^W6-question-材料$/}).click();await p().locator('.w6-link-error').waitFor();assert.equal(await p().getByRole('region',{name:'题目与选项',exact:true}).count(),1);await panel().getByRole('button',{name:'重新读取当前关联',exact:true}).click();await p().getByText(/已重新读取当前关联/).waitFor();
  await back();await flags({failTree:1});await open();await p().locator('.w6-link-error').filter({hasText:'读取失败'}).waitFor();await panel().getByRole('button',{name:'重新读取当前关联',exact:true}).click();await p().getByText(/已重新读取当前关联/).waitFor();check('W6-05 tree read failure is explicit and recoverable');
  await back();await flags({hold:true});const opening=open();
  await assertEventually(async()=>await s.app.evaluate(()=>globalThis.w6.held()));assert.match(await panel().innerText(),/正在读取知识点关联/);await s.app.evaluate(()=>globalThis.w6.release());await opening;
  check('W6-05 complete paths / empty / invalid-node / failed and held reads distinguished');pass('W6-05');
 }
 if(groups.has('6')){
  stage='W6-06';const raw=relationsDB(),start=(await calls()).filter(c=>c.method==='knowledge.cardLinks.set').length;
  await modify();assert.equal(await dialog().locator('.picker-chips button').count(),3);await pick(ids.B);await dialog().getByRole('button',{name:'取消',exact:true}).click();assert.equal(relationsDB(),raw);assert.equal(await panel().locator('.w6-link-editor').count(),0);
  await modify();await pick(ids.B);await pick(ids.D);await confirm();assert.equal(relationsDB(),raw);assert.match(await panel().locator('.w6-link-diff').innerText(),/待新增：[\s\S]*知识点D[\s\S]*待断开：[\s\S]*知识点B[\s\S]*待保留：[\s\S]*知识点A[\s\S]*知识点C/);
  await panel().getByRole('button',{name:'放弃修改',exact:true}).click();await p().getByText(/已放弃修改，并读取数据库当前关联/).waitFor();assert.equal(relationsDB(),raw);assert.equal((await calls()).filter(c=>c.method==='knowledge.cardLinks.set').length,start);
  // Real parent click + explicit subtree uses the same picker, only temporary until Save.
  await modify();await pick(ids.root);await dialog().getByRole('button',{name:'选中全部子知识点',exact:true}).click();assert.equal(await dialog().locator('.picker-chips button').count(),5);await dialog().getByRole('button',{name:'取消',exact:true}).click();assert.equal(relationsDB(),raw);
  await modify();await pick(ids.B);await pick(ids.D);await confirm();await submit();await verified();assert.deepEqual(new Set(await readLinks()),new Set([ids.A,ids.C,ids.D]));assert.ok((await s.api.call('knowledge.tree.read',{deckId:ids.deckId})).nodes.some(n=>n.nodeId===ids.B));assert.equal(await detail().count(),1);check('W6-06 real picker / preselect / subtree / cancel and discard zero writes / A,B,C→A,C,D exact SQLite readback',{old:[ids.A,ids.B,ids.C],requested:[ids.A,ids.C,ids.D],database:JSON.parse(relationsDB())});pass('W6-06');
 }
 if(groups.has('7')){
  stage='W6-07';await external([ids.A,ids.C,ids.D]);await back();await open();await modify();await pick(ids.B);await pick(ids.D);await confirm();const pending=await panel().locator('.w6-link-editor').innerText();
  await external([ids.A,ids.C]);await submit();await p().locator('.w6-link-error').filter({hasText:'其他操作修改'}).waitFor();assert.match(await panel().locator('.w6-link-editor').innerText(),/知识点B/);assert.ok(await panel().getByRole('button',{name:'保存关联',exact:true}).isDisabled());await reread();await submit();await verified();assert.deepEqual(new Set(await readLinks()),new Set([ids.A,ids.B,ids.C]));check('W6-07 actual CAS conflict / baseline reread / retained selection / user reconfirm');
  await modify();await pick(ids.B);await pick(ids.D);await confirm();await flags({failSet:true});const prior=relationsDB();await submit();await p().locator('.w6-link-error').filter({hasText:'保存关联失败'}).waitFor();assert.equal(relationsDB(),prior);assert.match(await panel().locator('.w6-link-editor').innerText(),/知识点D/);check('W6-07 rejected command retains pending and SQLite unchanged');
  // Write commits, reply and first two receipt lookups are lost. No fresh write is permitted.
  await flags({unknown:true,statusUnknown:2});const start=(await calls()).length;await submit();await p().locator('.w6-link-error').filter({hasText:'保存结果未知'}).waitFor();assert.ok(await panel().getByRole('button',{name:'保存关联',exact:true}).isDisabled());const during=(await calls()).slice(start),writes=during.filter(c=>c.method==='knowledge.cardLinks.set'),queries=during.filter(c=>c.method==='operation.status');assert.equal(writes.length,1);assert.equal(queries.length,2);assert.ok(queries.every(q=>q.payload.requestId===writes[0].requestId));await panel().getByRole('button',{name:'核验保存结果',exact:true}).click();await verified();assert.equal((await calls()).slice(start).filter(c=>c.method==='knowledge.cardLinks.set').length,1);assert.deepEqual(new Set(await readLinks()),new Set([ids.A,ids.C,ids.D]));check('W6-07 unknown committed reply; original requestId operation.status; one write only',{requestId:writes[0].requestId});
  await modify();await pick(ids.D);await confirm();await flags({failAfterSet:1});await submit();await p().locator('.w6-link-error').filter({hasText:'读回验证失败'}).waitFor();assert.equal(await panel().getByText('关联已保存，并已重新读取数据库验证。',{exact:true}).count(),0);assert.ok(await panel().getByRole('button',{name:'保存关联',exact:true}).isDisabled());await panel().getByRole('button',{name:'核验保存结果',exact:true}).click();await verified();assert.deepEqual(new Set(await readLinks()),new Set([ids.A,ids.C]));check('W6-07 successful write with failed readback never claims verified success');pass('W6-07');
 }
 if(groups.has('8')){
  stage='W6-08';await external([ids.A,ids.C]);await back();await open();assert.equal(frozen(),before,'W6 relationship changes preserve every history/schedule/FSRS/card/content/knowledge row byte');
  // External writer changes baseline while focus revalidation/dataSync fires. Pending must survive.
  await modify();await pick(ids.D);await confirm();await external([ids.A,ids.B,ids.C]);await p().evaluate(()=>window.dispatchEvent(new Event('focus')));await assertEventually(async()=>await panel().locator('.w6-link-editor').count()===1);assert.match(await panel().locator('.w6-link-editor').innerText(),/知识点D/);await panel().getByRole('button',{name:'放弃修改',exact:true}).click();await p().getByText(/已放弃修改/).waitFor();assert.deepEqual(new Set(await readLinks()),new Set([ids.A,ids.B,ids.C]));assert.equal(await panel().locator('.w6-link-chip').count(),3);check('W6-08 dataSync preserves pending; discard restores concurrent database baseline');
  // An old held get spans unmount, a new relationship write, and a new detail mount.
  await back();await flags({hold:true});const oldOpen=open();await assertEventually(async()=>await s.app.evaluate(()=>globalThis.w6.held()));await back();await external([ids.A,ids.C,ids.D]);await open();await s.app.evaluate(()=>globalThis.w6.release());await oldOpen;await p().evaluate(()=>new Promise(requestAnimationFrame));assert.equal(await panel().locator('.w6-link-chip').count(),3);assert.match(await panel().innerText(),/知识点D/);assert.doesNotMatch(await panel().innerText(),/知识点B/);check('W6-08 held obsolete response cannot overwrite new mount or new relationship');
  await modify();await pick(ids.D);await confirm();await flags({epoch:true});await submit();await p().getByText('数据库已切换，旧页面引用已清除。',{exact:true}).waitFor();await waitFor(()=>document.querySelector('.w6-detail')?.getAttribute('aria-busy')==='false');assert.equal(await panel().locator('.w6-link-editor').count(),0);assert.deepEqual(new Set(await readLinks()),new Set([ids.A,ids.C,ids.D]));check('W6-08 DATA_EPOCH_CHANGED rejected write clears obsolete transient references and reloads');
  for(const width of [900,1366,1600]){await s.app.evaluate(({BrowserWindow},v)=>BrowserWindow.getAllWindows()[0].setSize(v,950),width);const g=await detail().evaluate(el=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,panels:[...el.querySelectorAll(':scope>section')].map(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))}));assert.equal(g.overflow,false);assert.ok(g.panels.every(e=>e.right<=width+1));check('W6-08 responsive full page '+width,g);}
  await p().getByRole('button',{name:'全部历史 →',exact:true}).click();await p().locator('.detail-history-list button').first().click();await p().getByRole('region',{name:'当次复盘证据',exact:true}).waitFor();assert.match(await p().locator('.w6-event-evidence').innerText(),/知识点B/);const finalLinks=await readLinks();
  // Real storage restore changes epoch; re-enter detail and verify unchanged content/snapshots.
  const epochBefore=JSON.parse(readFileSync(f.data+'-control606/active.json')).epoch;
  await p().getByRole('button',{name:'本地用户设置',exact:true}).click();
  await p().getByRole('navigation',{name:'设置分类'}).getByRole('button',{name:'备份与恢复',exact:true}).click();
  const backup=join(f.root,'W6-synthetic-epoch.zip');
  await s.app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},backup);
  await p().getByRole('button',{name:'导出完整备份',exact:true}).click();await p().getByText('完整备份已导出',{exact:true}).waitFor();
  const restore=p().getByRole('region',{name:'恢复完整备份',exact:true});await restore.getByRole('button',{name:'选择完整备份',exact:true}).click();await restore.getByLabel('完整备份恢复预览',{exact:true}).waitFor();await restore.getByLabel('我确认用该备份替换全部当前数据',{exact:true}).check();await restore.getByRole('button',{name:'确认恢复全部数据',exact:true}).click();await p().locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();
  const epochAfter=JSON.parse(readFileSync(f.data+'-control606/active.json')).epoch;assert.notEqual(epochBefore,epochAfter);await s.api.call('app.capabilities',{});await cards();await open();assert.deepEqual(new Set(await readLinks()),new Set(finalLinks));assert.equal(frozen(),before);check('W6-08 real GUI restore changes epoch; detail reopen preserves links and history',{epochBefore,epochAfter});
  await s.app.close();s=await launch();await cards();await open();assert.notEqual(report.pids[0],report.pids[1]);assert.deepEqual(new Set(await readLinks()),new Set(finalLinks));assert.equal(frozen(),before);const integrity=sql(db=>({integrity:db.prepare('PRAGMA integrity_check').get(),foreignKeys:db.prepare('PRAGMA foreign_key_check').all(),schema:db.prepare('PRAGMA user_version').get(),events:db.prepare('SELECT COUNT(*) AS n FROM learning_review_events').get().n}));assert.equal(integrity.integrity.integrity_check,'ok');assert.equal(integrity.foreignKeys.length,0);assert.equal(integrity.events,23);check('W6-08 independent Electron PID / SQLite exact readback / history,FSRS,tree unchanged',{...integrity,frozenBefore:before,frozenAfter:frozen(),relations:JSON.parse(relationsDB())});pass('W6-08');
 }
 assert.deepEqual(errors,[]);report.status='PASS';stage='done';save();
}catch(e){report.status='FAIL';report.error=String(e?.stack??e);if(s)report.panel=await panel().innerText().catch(()=>'<no panel>');if(s)report.transport=await calls().catch(()=>[]);if(s)report.images=await p().locator('img').evaluateAll(nodes=>nodes.map(n=>({src:n.src,html:n.outerHTML,complete:n.complete,width:n.naturalWidth}))).catch(()=>[]);report.cases.push({id:stage,status:'FAIL'});save();if(s)await p().screenshot({path:join(out,'failure.png')}).catch(()=>{});console.error(e);process.exitCode=1;}
finally{owner?.close();if(s)await s.app.close().catch(()=>{});save();}
async function assertEventually(fn){for(let i=0;i<200;i++){if(await fn())return;await new Promise(r=>setTimeout(r,25));}throw Error('Expected asynchronous condition did not become true');}
