// B2 only. Production renderer + IPC, independent readonly SQLite, distinct process restart.
// ClipboardEvents below exercise the real paste handler but are NOT physical Windows clipboard evidence.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Transformer} from '@napi-rs/image';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {_electron as electron} from 'playwright-core';
import {freshFixture} from './scenarios/m1-support.mjs';
import {args,require,stop} from '../r5/support.ts';
import {createClient} from '../../../shared/protocol/client.ts';
import {createFullRestoreSession} from '../../../electron/modules/storage-unified/restore-session.ts';
import {blankCardFields} from '../../../shared/cards/mapping.ts';
import {placementUrl} from '../../../shared/editor/document.ts';
const out=resolve(process.env.B2_EVIDENCE_DIR??'validation-results/v077/b2/gui');mkdirSync(out,{recursive:true});
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const report={batch:'B2',platform:process.platform,sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scriptSha256:hash(readFileSync(new URL(import.meta.url))),
 status:'IN_PROGRESS',clipboard:'SYNTHETIC_CLIPBOARD_EVENT_NOT_PHYSICAL_WINDOWS',checks:[],pids:[],windowsCI:'NOT_RUN',windows10:'NOT_RUN',windows11:'NOT_RUN'};
let s,f;const errors=[];
function check(name,detail={}){report.checks.push({name,status:'PASS',...detail});console.log('PASS '+name);writeFileSync(join(out,'result.json'),JSON.stringify(report,null,2)+'\n');}
function sql(fn){const dir=JSON.parse(readFileSync(f.data+'-control606/active.json','utf8')).activeDir,db=new DatabaseSync(join(dir,'ganksoft.sqlite'),{readOnly:true});try{return fn(db);}finally{db.close();}}
function facts(){return sql(db=>Object.fromEntries(['learning_cards','learning_content_versions','learning_study_cycles','learning_review_events','learning_card_drafts','scheduling','question_knowledge','memory_knowledge'].map(t=>[t,db.prepare('SELECT * FROM '+t+' ORDER BY 1').all()]).concat([['draftSettings',db.prepare("SELECT * FROM settings WHERE key LIKE 'new-card-draft:%' ORDER BY key").all()]])));}
const drafts=()=>sql(db=>db.prepare("SELECT key,value FROM settings WHERE key LIKE 'new-card-draft:%' ORDER BY key").all().map(r=>JSON.parse(r.value)));
async function launch(){
 const app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='win32'?[]:args),resolve('tools/validation/v077/host.cjs')],env:{...process.env,TZ:'Asia/Shanghai',GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:f.data,GANK_R6_MAIN:resolve('dist-electron/electron/main.js')},timeout:20000});
 const page=await app.firstWindow();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(String(e)));
 await page.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();const api=createClient(r=>page.evaluate(v=>window.gank.protocol(v),r));await api.call('app.capabilities',{});
 const child=app.process();report.pids.push(child.pid);return{app,page,api,child};
}

const p=()=>s.page;
const heading=name=>p().getByRole('heading',{name,exact:true});
const inbox=()=>p().getByRole('region',{name:'草稿箱',exact:true});
const backButton=()=>p().getByRole('button',{name:/返回上一页/}).first();
const leaveDialog=()=>p().getByRole('dialog',{name:'离开未保存的编辑',exact:true});
const row=id=>p().locator('[data-draft-id="'+id+'"]');
async function deck(){await p().getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:new RegExp('^'+f.deck.name+'，')}).click();await nav('所有卡片');}
async function nav(name){await p().getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name,exact:true}).click();}
async function allCards(){await nav('所有卡片');await heading('所有卡片').waitFor();}
async function openInbox(){await p().getByRole('button',{name:'草稿箱',exact:true}).click();await heading('草稿箱').waitFor();await p().getByRole('status').filter({hasText:'正在处理草稿'}).waitFor({state:'hidden'});}
async function searchDraft(query){await inbox().getByLabel('搜索草稿标题').fill(query);await inbox().getByRole('button',{name:'搜索',exact:true}).click();await p().getByRole('status').filter({hasText:'正在处理草稿'}).waitFor({state:'hidden'});}
async function editing(){await p().getByTestId('draft-title').waitFor();}
async function newCard(){await p().getByRole('button',{name:'新建卡片',exact:true}).click();await editing();}
async function choose(name){await leaveDialog().waitFor();await leaveDialog().getByRole('button',{name,exact:true}).click();}
async function cancelEditor(){await p().getByTestId('cancel-editor').click();}
async function save(){await p().getByTestId('save-draft').click();await p().locator('[data-save-state=clean]').filter({hasText:'草稿已成功保存'}).waitFor();}
async function openDraft(id){await row(id).getByRole('button',{name:'继续编辑',exact:true}).click();await editing();}
async function confirmDelete(id){await row(id).getByRole('button',{name:/删除草稿|放弃修改/}).click();const d=p().getByRole('dialog',{name:'确认处理草稿',exact:true});await d.waitFor();return d;}
function formalFacts(){const data=facts();delete data.learning_card_drafts;delete data.draftSettings;return data;}
try{
 f=await freshFixture({unicode:true});report.fixture=f;
 const owner=await createFullRestoreSession(f.data+'-control606',{workspaceParent:f.root,selectBackup:async()=>null,allowLegacyRestore:false});
 const seed=createClient(r=>owner.execute(r));await seed.call('app.capabilities',{});
 const historical=await seed.call('draft.create',{deckId:f.deck.id,initialType:'qa'});
 for(let i=0;i<51;i++){const fields=blankCardFields('direct');fields.title='分页草稿 '+String(i).padStart(2,'0');await seed.call('draft.save',{deckId:f.deck.id,cardId:randomUUID(),expectedPublishedRevision:0,expectedDraftRevision:null,fields});}
 const formalScope={deckId:f.deck.id,cardId:randomUUID()},fields=blankCardFields('direct');fields.title='B2 正式卡';fields.payload.fields.body='正式正文始终保留';
 await seed.call('card.publish',{...formalScope,expectedPublishedRevision:0,expectedDraftRevision:null,fields,resetStudyCycle:false});owner.close();
 s=await launch();await deck();
 // Filter, sort, scroll and all three leave choices through real buttons.
 await p().getByLabel('搜索卡片标题',{exact:true}).fill('B2');await p().getByRole('button',{name:'搜索',exact:true}).click();await p().getByLabel('已加载卡片排序').selectOption('title');
 const baseline=facts();await newCard();await p().getByTestId('draft-title').fill('B2 未提交内容');await backButton().click();await choose('继续编辑');await leaveDialog().waitFor({state:'hidden'});assert.equal(await p().getByTestId('draft-title').inputValue(),'B2 未提交内容');assert.deepEqual(facts(),baseline);
 await cancelEditor();await choose('放弃本次修改并返回');await heading('所有卡片').waitFor();assert.deepEqual(facts(),baseline);assert.equal(await p().getByLabel('搜索卡片标题',{exact:true}).inputValue(),'B2');assert.equal(await p().getByLabel('已加载卡片排序').inputValue(),'title');check('B2-01 top back continue and bottom cancel discard preserve filter/sort and write nothing');
 await newCard();await p().getByTestId('draft-title').fill('B2 手动草稿');await cancelEditor();await choose('保存草稿并返回');await heading('所有卡片').waitFor();
 const saved=drafts().find(d=>d.document.title==='B2 手动草稿').document,scope={deckId:f.deck.id,cardId:saved.cardId};assert.equal(saved.revision,1);check('B2-02 explicit save-and-return creates exactly one draft with SQLite readback');
 await openInbox();assert.equal(await inbox().locator('tbody tr').count(),50);await inbox().getByRole('button',{name:'更多草稿',exact:true}).click();await p().getByRole('status').filter({hasText:'正在处理草稿'}).waitFor({state:'hidden'});await row(historical.cardId).waitFor();assert.equal(await inbox().locator('tbody tr').count(),53);check('B2-03 independent inbox lists historical blank drafts and loads next metadata page');
 await searchDraft('B2 手动草稿');assert.equal(await inbox().locator('tbody tr').count(),1);await openDraft(saved.cardId);await cancelEditor();await heading('草稿箱').waitFor();assert.equal(await inbox().getByLabel('搜索草稿标题').inputValue(),'B2 手动草稿');await row(saved.cardId).waitFor();
 await openDraft(saved.cardId);await p().getByTestId('draft-title').fill('本次放弃');await cancelEditor();await choose('放弃本次修改并返回');await heading('草稿箱').waitFor();assert.deepEqual(await s.api.call('draft.get',scope),saved);check('B2-04 inbox search/reopen/back preserves source query; discard keeps previously saved draft');
 // Editing -> inbox -> back -> same editor, then nested policy and system return.
 await openDraft(saved.cardId);await openInbox();await backButton().click();await editing();assert.equal(await p().getByTestId('draft-title').inputValue(),saved.title);
 assert.equal(await p().getByRole('button',{name:'调度设置',exact:true}).last().isDisabled(),true);
 await p().getByRole('button',{name:'系统设置',exact:true}).click();await heading('设置').waitFor();await p().getByRole('button',{name:'返回原页面',exact:true}).click();await editing();assert.equal(await p().getByTestId('draft-title').inputValue(),saved.title);check('B2-05 editor/inbox/policy/system nested source returns keep card identity');
 // Save failure and unknown retry stay in the same editor/dialog, exact original request.
 await p().getByTestId('draft-title').fill('B2 保存失败保留');const durable=facts();await s.app.evaluate(()=>globalThis.v077Faults.arm('draft.save','reject'));
 await cancelEditor();await choose('保存草稿并返回');await leaveDialog().getByRole('alert').waitFor();assert.deepEqual(facts(),durable);assert.equal(await p().getByTestId('draft-title').inputValue(),'B2 保存失败保留');assert.equal(await leaveDialog().getByRole('button',{name:'放弃本次修改并返回',exact:true}).isDisabled(),true);
 await s.app.evaluate(()=>globalThis.v077Faults.clear());await choose('保存草稿并返回');await heading('草稿箱').waitFor();const saves=await s.app.evaluate(()=>globalThis.v077Faults.events().filter(e=>e.method==='draft.save').slice(-2));assert.equal(saves[0].requestId,saves[1].requestId);assert.equal((await s.api.call('draft.get',scope)).title,'B2 保存失败保留');check('B2-06 failed/unknown save stays put and retries original request before returning',{requests:saves});
 await allCards();const formalBefore=await s.api.call('card.getPublishedContent',formalScope),protectedBefore=formalFacts();
 await p().locator('[data-card-id="'+formalScope.cardId+'"]').getByRole('button',{name:'编辑 B2 正式卡',exact:true}).click();await editing();await p().getByRole('button',{name:'调度设置',exact:true}).last().click();await heading('单卡调度').waitFor();await p().getByRole('status').filter({hasText:'当前来源'}).waitFor();await backButton().click();await editing();assert.equal(await p().getByTestId('draft-title').inputValue(),'B2 正式卡');await p().getByTestId('draft-title').fill('B2 正式修改草稿');await save();await openInbox();await searchDraft('B2 正式修改草稿');
 const cancelDelete=await confirmDelete(formalScope.cardId);await cancelDelete.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(formalFacts(),protectedBefore);assert.ok(await s.api.call('draft.get',formalScope));
 const deletePublished=await confirmDelete(formalScope.cardId);await deletePublished.getByRole('button',{name:'确认放弃修改',exact:true}).click();await deletePublished.waitFor({state:'hidden'});assert.equal(await s.api.call('draft.get',formalScope),null);assert.deepEqual(await s.api.call('card.getPublishedContent',formalScope),formalBefore);assert.deepEqual(formalFacts(),protectedBefore);check('B2-07 published modification discard leaves formal/history/FSRS/link state unchanged');
 // Deleted source draft falls back safely. Unknown deletion reconciles its original request.
 await allCards();await openInbox();await searchDraft('保存失败保留');await openDraft(saved.cardId);await openInbox();await searchDraft('保存失败保留');
 const deletion=await confirmDelete(saved.cardId);await s.app.evaluate(()=>globalThis.v077Faults.arm('draft.discard','drop-unknown'));await deletion.getByRole('button',{name:'确认删除草稿',exact:true}).click();await deletion.getByRole('alert').waitFor();assert.equal(await s.api.call('draft.get',scope),null);assert.equal(await deletion.getByRole('button',{name:'取消',exact:true}).isDisabled(),true);
 await s.app.evaluate(()=>globalThis.v077Faults.clear());await deletion.getByRole('button',{name:'核对原删除请求',exact:true}).click();await deletion.waitFor({state:'hidden'});const requests=await s.app.evaluate(()=>globalThis.v077Faults.events().filter(e=>e.method==='draft.discard').slice(-2));assert.equal(requests[0].requestId,requests[1].requestId);await backButton().click();await heading('所有卡片').waitFor();check('B2-08 unknown deletion is reconciled idempotently and deleted editor source falls back safely',{requests});
 // Detail source and planner state.
 await p().locator('[data-card-id="'+formalScope.cardId+'"]').getByRole('button',{name:'详情 B2 正式卡',exact:true}).click();await heading('卡片详情').waitFor();await p().getByRole('button',{name:'编辑卡片',exact:true}).click();await editing();await cancelEditor();await heading('卡片详情').waitFor();await backButton().click();await heading('所有卡片').waitFor();assert.equal(await p().getByLabel('搜索卡片标题',{exact:true}).inputValue(),'B2');check('B2-09 list/detail/editor nested back restores true source and filtering');
 await newCard();const dialogFacts=facts();report.layouts=[];
 for(const [width,height,label] of [[900,900,'900'],[1366,768,'1366'],[1600,900,'1600'],[1280,720,'1600-at-125-percent-css-equivalent']]){
  await p().setViewportSize({width,height});
  for(const name of ['复制 Prompt','粘贴卡片']){
   await p().getByRole('button',{name,exact:true}).click();const d=p().getByRole('dialog',{name:'内容交换',exact:true});await d.waitFor();
   const metrics=await d.evaluate(el=>{const r=el.getBoundingClientRect(),body=el.querySelector('.transfer-body'),footer=el.querySelector('.transfer-actions');const f=footer.getBoundingClientRect();return{width:r.width,height:r.height,left:r.left,right:r.right,bottom:r.bottom,viewportWidth:innerWidth,viewportHeight:innerHeight,footerBottom:f.bottom,bodyOverflow:getComputedStyle(body).overflowY,scrollHeight:body.scrollHeight,clientHeight:body.clientHeight};});
   assert.ok(metrics.left>=0&&metrics.right<=width&&metrics.bottom<=height&&metrics.footerBottom<=metrics.bottom);assert.ok(metrics.width>=Math.min(760,width-40));assert.equal(metrics.bodyOverflow,'auto');
   await d.locator('.transfer-body').evaluate(el=>el.scrollTop=el.scrollHeight);await d.getByRole('button',{name:'取消',exact:true}).click();await d.waitFor({state:'hidden'});assert.deepEqual(facts(),dialogFacts);report.layouts.push({label,dialog:name,...metrics});
  }
  await p().screenshot({path:join(out,'editor-'+label+'.png')});
 }
 check('B2-10 Prompt/paste reading windows fit 900/1366/1600 and 125-percent CSS-equivalent boundaries; cancel writes nothing',{layouts:report.layouts});
 // Escape on leave is continue; app close uses the same three-choice controller.
 await p().getByTestId('draft-title').fill('B2 窗口关闭保护');await cancelEditor();await leaveDialog().waitFor();await p().keyboard.press('Escape');await leaveDialog().waitFor({state:'hidden'});assert.equal(await p().getByTestId('draft-title').inputValue(),'B2 窗口关闭保护');
 await s.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());await leaveDialog().waitFor();await choose('继续编辑');assert.deepEqual(facts(),dialogFacts);check('B2-11 Esc and real BrowserWindow close share leave guard with zero implicit writes');
 await cancelEditor();await choose('放弃本次修改并返回');await heading('所有卡片').waitFor();const final=facts();await stop(s.app,f.data);s=null;s=await launch();assert.equal(new Set(report.pids).size,2);assert.deepEqual(facts(),final);assert.equal(await s.api.call('draft.get',scope),null);assert.equal(await s.api.call('draft.get',formalScope),null);assert.deepEqual(await s.api.call('card.getPublishedContent',formalScope),formalBefore);assert.deepEqual(await s.api.call('draft.get',{deckId:f.deck.id,cardId:historical.cardId}),historical);check('B2-12 fresh process preserves deletions/formal content/history and historical draft');
 assert.deepEqual(errors,[]);report.finalDatabaseSha256=hash(final);report.status='PASS';
}catch(e){report.status=s?'FAIL':'TEST_INFRA';report.error=String(e.stack??e);process.exitCode=1;if(s){writeFileSync(join(out,'failure-ui.txt'),await s.page.locator('body').innerText().catch(()=>''));await s.page.screenshot({path:join(out,'failure.png')}).catch(()=>{});}}
finally{if(s){report.requests=await s.app.evaluate(()=>globalThis.v077Faults.events()).catch(()=>[]);let timer;try{await Promise.race([stop(s.app,f.data),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('CLEANUP_TIMEOUT')),5000);})]);}catch{if(s.child.exitCode===null)s.child.kill('SIGKILL');}finally{clearTimeout(timer);}}report.rendererErrors=errors;writeFileSync(join(out,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,error:report.error,pids:report.pids}));}
