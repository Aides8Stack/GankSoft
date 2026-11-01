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
const out=resolve(process.env.B2_EVIDENCE_DIR??'validation-results/v077/b2/supplement');mkdirSync(out,{recursive:true});
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
 f=JSON.parse(readFileSync('validation-results/v077/b2/gui/result.json','utf8')).fixture;report.fixture=f;s=await launch();await deck();const before=facts();
 await openInbox();await searchDraft('分页草稿');await inbox().getByRole('button',{name:'更多草稿',exact:true}).click();await p().getByRole('status').filter({hasText:'正在处理草稿'}).waitFor({state:'hidden'});assert.equal(await inbox().locator('tbody tr').count(),51);
 await p().locator('.content-scroller').evaluate(el=>el.scrollTop=500);const selected=inbox().locator('tbody tr').nth(7);await selected.getByRole('button',{name:'继续编辑'}).scrollIntoViewIfNeeded();const scroll=await p().locator('.content-scroller').evaluate(el=>el.scrollTop);const selectedId=await selected.getAttribute('data-draft-id');await selected.getByRole('button',{name:'继续编辑'}).click();await editing();await cancelEditor();await heading('草稿箱').waitFor();await p().getByRole('status').filter({hasText:'正在处理草稿'}).waitFor({state:'hidden'});assert.equal(await inbox().getByLabel('搜索草稿标题').inputValue(),'分页草稿');assert.equal(await inbox().locator('tbody tr').count(),51);const restored=await p().locator('.content-scroller').evaluate(el=>el.scrollTop);assert.ok(Math.abs(scroll-restored)<2,JSON.stringify({scroll,restored}));check('B2-13 inbox query, loaded pagination and scroll restore after editing',{scroll,restored,selectedId});
 await openDraft(selectedId);await openInbox();await s.app.evaluate(()=>globalThis.v077Faults.hold('draft.get'));await backButton().click();const held=await s.app.evaluate(()=>globalThis.v077Faults.events().filter(e=>e.method==='draft.get').at(-1));assert.equal(held.held,true);await backButton().click();await s.app.evaluate(()=>globalThis.v077Faults.release());await editing();await cancelEditor();await heading('草稿箱').waitFor();check('B2-18 repeated back during held source read cannot pop another source');
 await nav('筛选学习');await heading('筛选学习').waitFor();await p().getByLabel('筛选卡片类型').selectOption('direct');await p().getByRole('button',{name:'更多筛选条件',exact:true}).click();await p().getByLabel('筛选关键词').fill('B2 正式');await p().getByRole('button',{name:'预览学习队列',exact:true}).click();await p().getByRole('region',{name:'学习队列预览'}).getByRole('button',{name:/B2 正式卡/}).click();await heading('卡片详情').waitFor();await backButton().click();await heading('筛选学习').waitFor();assert.equal(await p().getByLabel('筛选卡片类型').inputValue(),'direct');await p().getByRole('button',{name:'更多筛选条件',exact:true}).click();assert.equal(await p().getByLabel('筛选关键词').inputValue(),'B2 正式');check('B2-14 planner/detail return preserves exact filter source');
 await allCards();await newCard();
 for(const [width,height,label] of [[900,900,'900'],[1366,768,'1366'],[1600,900,'1600']]){
  await p().setViewportSize({width,height});
  for(const name of ['复制 Prompt','粘贴卡片']){
   await p().getByRole('button',{name,exact:true}).click();const d=p().getByRole('dialog',{name:'内容交换',exact:true});await d.waitFor();
   if(name==='复制 Prompt'){await d.locator('summary').click();await d.getByLabel('Prompt模板',{exact:true}).fill('{{card}}\n'+'长模板内容\n'.repeat(150));}
   else{await d.getByLabel('结构化卡片内容',{exact:true}).fill('无效长内容\n'.repeat(150));await d.getByRole('button',{name:'解析预览',exact:true}).click();}
   await d.locator('.transfer-body').evaluate(el=>el.querySelector('textarea').style.height='1200px');
   const rect=()=>d.evaluate(el=>{const h=el.querySelector('h2').getBoundingClientRect(),f=el.querySelector('.transfer-actions').getBoundingClientRect(),c=el.querySelector('.transfer-config')?.getBoundingClientRect();return {head:h.top,footer:f.top,config:c?.top};});
   const initial=await rect();await d.locator('.transfer-body').evaluate(el=>el.scrollTop=el.scrollHeight);assert.deepEqual(await rect(),initial);const overflow=await d.locator('.transfer-body').evaluate(el=>({scroll:el.scrollHeight,client:el.clientHeight}));assert.ok(overflow.scroll>overflow.client);
   await p().screenshot({path:join(out,label+'-'+(name==='复制 Prompt'?'prompt':'paste')+'.png')});await d.getByRole('button',{name:'取消',exact:true}).click();await d.waitFor({state:'hidden'});
  }
 }
 assert.deepEqual(facts(),before);check('B2-15 long Prompt/paste content scrolls inside fixed header/config/footer in all three widths');
 await p().setViewportSize({width:1366,height:768});await p().getByRole('button',{name:'复制 Prompt',exact:true}).click();const prompt=p().getByRole('dialog',{name:'内容交换',exact:true});await prompt.locator('summary').click();await prompt.getByRole('button',{name:'恢复默认模板',exact:true}).click();const expected=await prompt.getByLabel('Prompt预览',{exact:true}).inputValue();await prompt.getByRole('button',{name:'复制到剪贴板',exact:true}).click();await prompt.waitFor({state:'hidden'});assert.equal(await s.app.evaluate(({clipboard})=>clipboard.readText()),expected);assert.deepEqual(facts(),before);check('B2-16 Prompt copy works after layout change without saving editor');
 await p().getByTestId('draft-title').fill('B2 关闭时明确保存');const closed=new Promise(resolve=>s.app.once('close',resolve));await s.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());await choose('保存草稿并返回');await closed;s=null;
 s=await launch();assert.equal(new Set(report.pids).size,2);const closeSaved=drafts().find(d=>d.document.title==='B2 关闭时明确保存');assert.ok(closeSaved);assert.equal(closeSaved.document.revision,1);check('B2-17 actual window close saves only after explicit choice; new process reads same draft');
 assert.deepEqual(errors,[]);report.status='PASS';
}catch(e){report.status=s?'FAIL':'TEST_INFRA';report.error=String(e.stack??e);process.exitCode=1;if(s){writeFileSync(join(out,'failure-ui.txt'),await s.page.locator('body').innerText().catch(()=>''));await s.page.screenshot({path:join(out,'failure.png')}).catch(()=>{});}}
finally{if(s){let timer;try{await Promise.race([stop(s.app,f.data),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('CLEANUP_TIMEOUT')),5000);})]);}catch{if(s.child.exitCode===null)s.child.kill('SIGKILL');}finally{clearTimeout(timer);}}report.rendererErrors=errors;writeFileSync(join(out,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,error:report.error,pids:report.pids}));}
