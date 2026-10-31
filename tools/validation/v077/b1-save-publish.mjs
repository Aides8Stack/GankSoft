// B1 only. Production renderer + IPC, independent readonly SQLite, distinct process restart.
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
const out=resolve(process.env.B1_EVIDENCE_DIR??'validation-results/v077/b1');mkdirSync(out,{recursive:true});
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const report={batch:'B1',platform:process.platform,sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scriptSha256:hash(readFileSync(new URL(import.meta.url))),
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
async function deck(){await s.page.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:new RegExp('^'+f.deck.name+'，')}).click();await s.page.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();await s.page.getByRole('heading',{name:'所有卡片',exact:true}).waitFor();}
async function cards(){await s.page.getByRole('button',{name:'返回上一页',exact:false}).click();await s.page.getByRole('heading',{name:'所有卡片',exact:true}).waitFor();}
const editor=field=>s.page.locator('[data-editor-field="'+field+'"] .ProseMirror[contenteditable=true]');
async function newCard(mode='question'){
 await s.page.getByRole('button',{name:'新建卡片',exact:true}).click();await editor('stem').waitFor();
 if(mode!=='question'){
  await s.page.getByRole('navigation',{name:'卡片类型'}).getByRole('button',{name:mode==='qa'?'问答记忆':'直接记忆',exact:true}).click();
  const dialog=s.page.getByRole('dialog',{name:'确认切换卡片类型',exact:true});await dialog.waitFor();await dialog.getByRole('button',{name:/确认/}).click();
  await dialog.waitFor({state:'hidden'});await editor(mode==='qa'?'front':'body').waitFor();
 }
}
async function save(){await s.page.getByTestId('save-draft').click();await s.page.locator('[data-save-state=clean]').filter({hasText:'草稿已成功保存'}).waitFor();assert.equal(await s.page.getByTestId('save-draft').isDisabled(),true);}
async function publish(){await s.page.getByTestId('publish-card').click();await s.page.getByRole('status').filter({hasText:'发布成功，历史已保留'}).waitFor();assert.equal(await s.page.getByTestId('publish-card').isDisabled(),true);assert.equal(await s.page.getByTestId('save-draft').isDisabled(),true);}
async function paste(field,text,html=''){
 const target=editor(field);await target.click();await target.evaluate((el,{text,html})=>{const d=new DataTransfer();d.setData('text/plain',text);if(html)d.setData('text/html',html);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:d,bubbles:true,cancelable:true}));},{text,html});
 await s.page.waitForTimeout(80);
}
async function fill(mode,title){
 await s.page.getByTestId('draft-title').fill(title);
 if(mode==='question'){
  await editor('stem').fill('中文题干：选出正确答案');
  await s.page.getByRole('button',{name:'批量输入选项',exact:true}).click();const d=s.page.getByRole('dialog',{name:'批量输入选项',exact:true});await d.getByLabel('批量选项正文').fill('甲正确\n乙错误');await d.getByRole('button',{name:'确认替换选项',exact:true}).click();await d.waitFor({state:'hidden'});await s.page.getByRole('radio',{name:'正确项 1',exact:true}).check();
 }else if(mode==='qa'){await editor('front').fill('中文问题');await editor('back').fill('中文答案');}
 else await editor('body').fill('直接记忆正文');
}
try{
 f=await freshFixture({unicode:true});report.fixture=f;
 // Old durable blank draft format remains visible; fixture setup is the only API write outside GUI.
 const owner=await createFullRestoreSession(f.data+'-control606',{workspaceParent:f.root,selectBackup:async()=>null,allowLegacyRestore:false});
 const seedApi=createClient(r=>owner.execute(r));await seedApi.call('app.capabilities',{});
 const legacy=await seedApi.call('draft.create',{deckId:f.deck.id,initialType:'qa'});owner.close();
 s=await launch();await deck();
 if(process.argv.includes('--media-only')) {
  const assetId=randomUUID(),bytes=Transformer.fromRgbaPixels(Buffer.from([15,40,90,255]),1,1).pngSync();
  const refs=[30,80].map(width=>({assetId,placementId:randomUUID(),fileName:assetId+'.png',mime:'image/png',role:'analysis',width}));
  const fields=blankCardFields('direct');fields.title='B1 图片直接发布';fields.mediaRefs=refs;
  fields.payload.fields.body=refs.map(r=>'![图]('+placementUrl({assetId:r.assetId,placementId:r.placementId,width:r.width})+')').join('\n\n');
  const archive='<!-- ganksoft-card:2 -->\n'+JSON.stringify({format:'ganksoft.card-clipboard',version:2,fields,images:[{assetId,mime:'image/png',base64:bytes.toString('base64')}]});
  const before=facts();await newCard('direct');
  await s.app.evaluate(({clipboard},text)=>clipboard.writeText(text),archive);
  await s.page.getByRole('button',{name:'粘贴卡片',exact:true}).click();
  await s.page.getByRole('button',{name:'从剪贴板预览（含图片）',exact:true}).click();
  await s.page.getByRole('button',{name:'确认替换编辑内容',exact:true}).click();
  await editor('body').waitFor();assert.equal(await editor('body').locator('img[data-gank-placement]').count(),2);
  assert.deepEqual(facts(),before);check('C media clipboard applies two placements to memory without durable card/draft');
  await publish();const list=await s.api.call('card.listSummary',{deckId:f.deck.id,limit:100});
  const card=list.items.find(c=>c.title===fields.title);assert.ok(card);const scope={deckId:f.deck.id,cardId:card.cardId};
  assert.equal(await s.api.call('draft.get',scope),null);const content=await s.api.call('card.getPublishedContent',scope);
  assert.deepEqual(content.mediaRefs.map(r=>r.width),[30,80]);assert.equal(new Set(content.mediaRefs.map(r=>r.assetId)).size,1);
  assert.equal(new Set(content.mediaRefs.map(r=>r.placementId)).size,2);
  const requests=await s.app.evaluate(()=>globalThis.v077Faults.events());assert.equal(requests.filter(r=>['draft.save','draft.create','draft.switchType'].includes(r.method)).length,0);
  check('C media direct publication retains independent placements with no implicit draft writes');
  await stop(s.app,f.data);s=null;s=await launch();assert.equal(new Set(report.pids).size,2);
  assert.deepEqual(await s.api.call('card.getPublishedContent',scope),content);
  const dir=JSON.parse(readFileSync(f.data+'-control606/active.json','utf8')).activeDir;
  for(const ref of content.mediaRefs)assert.deepEqual(readFileSync(join(dir,'attachments',ref.fileName)),bytes);
  check('C media publication and image bytes read back identically in a fresh Electron process');
 } else if(process.argv.includes('--recovery-only')) {
  await newCard('direct');await fill('direct','B1 原始保存快照');const original=facts();
  await s.app.evaluate(()=>globalThis.v077Faults.arm('draft.save','reject'));
  await s.page.getByTestId('save-draft').click();await s.page.locator('[data-save-state=error]').waitFor();assert.deepEqual(facts(),original);
  await s.page.getByTestId('draft-title').fill('B1 未知期间新输入');
  await s.app.evaluate(()=>globalThis.v077Faults.clear());await s.page.getByTestId('save-draft').click();await s.page.locator('[data-save-state=dirty]').waitFor();
  assert.equal(drafts().find(d=>d.document.cardId!==legacy.cardId).document.title,'B1 原始保存快照');assert.equal(await s.page.getByTestId('draft-title').inputValue(),'B1 未知期间新输入');
  const reqs=await s.app.evaluate(()=>globalThis.v077Faults.events().filter(e=>e.method==='draft.save'));assert.equal(reqs[0].requestId,reqs[1].requestId);
  await save();assert.equal(drafts().find(d=>d.document.cardId!==legacy.cardId).document.title,'B1 未知期间新输入');check('A/B7 save failure and unknown retry retain new input without implicit followup writes',{requests:reqs});
  await s.page.getByTestId('draft-title').fill('B1 冲突内存内容');await s.app.evaluate(()=>globalThis.v077Faults.arm('draft.save','conflict'));
  await s.page.getByTestId('save-draft').click();await s.page.locator('[data-save-state=conflict]').waitFor();assert.equal(await s.page.getByTestId('draft-title').inputValue(),'B1 冲突内存内容');
  await s.page.getByRole('button',{name:'复制卡片',exact:true}).click();await s.page.getByRole('status').filter({hasText:'卡片内容已复制'}).waitFor();assert.match(await s.app.evaluate(({clipboard})=>clipboard.readText()),/B1 冲突内存内容/);
  const durable=facts();await s.page.getByTestId('draft-title').fill('B1 冲突后仍可编辑');await s.page.waitForTimeout(700);assert.deepEqual(facts(),durable);assert.equal(await s.page.getByTestId('save-draft').isDisabled(),true);check('A/B7 conflict keeps editable memory and permits safe copy of local content');
  // Explicitly discard through the existing leave confirmation, never silently save.
  await s.page.evaluate(()=>window.confirm=()=>true);await cards();assert.deepEqual(facts(),durable);check('A/C explicit discard leaves durable state unchanged');
 } else {
 const before=facts();await newCard();assert.deepEqual(facts(),before);assert.equal(await s.page.getByTestId('save-draft').isEnabled(),true);assert.doesNotMatch(await s.page.locator('[data-save-state]').innerText(),/已保存/);
 check('A1 new blank editor creates no durable card/draft');
 const toast=s.page.locator('.publish-missing');
 for(let i=0;i<3;i++){await s.page.getByTestId('publish-card').click();await toast.waitFor();assert.equal(await toast.count(),1);await s.page.waitForTimeout(350);}
 await s.page.waitForTimeout(350);assert.equal(await toast.isVisible(),true);const pos=await toast.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:innerWidth,h:innerHeight,bg:getComputedStyle(el).backgroundColor};});
 assert.ok(Math.abs(pos.x-pos.w/2)<2&&Math.abs(pos.y-pos.h/2)<2);assert.match(pos.bg,/rgba\(/);await s.page.screenshot({path:join(out,'missing-fields.png')});await toast.waitFor({state:'hidden'});assert.deepEqual(facts(),before);
 const calls=await s.app.evaluate(()=>globalThis.v077Faults.events());assert.equal(calls.filter(r=>['draft.save','draft.create','card.publish'].includes(r.method)).length,0);
 assert.equal(await s.page.locator('.publish-required').count(),4);check('B3/B4 missing publish clicks reset one central red toast and write nothing',{position:pos});
 await save();const blank=drafts().find(d=>d.document.cardId!==legacy.cardId);assert.ok(blank);assert.equal(blank.document.title,'');check('A3 explicit blank draft persists once');
 await s.page.getByTestId('draft-title').fill('B1 部分草稿');await paste('stem','plain text');await paste('stem','中文粘贴');await paste('stem','<unsupported>合法富文本</unsupported>','<p><b>合法富文本</b></p>');
 await paste('stem','','<p>仅HTML中文<strong>安全正文</strong></p><script>BAD_SCRIPT</script><img src="https://invalid.test/x.png">');
 assert.match(await editor('stem').innerText(),/仅HTML中文安全正文/);assert.doesNotMatch(await editor('stem').innerText(),/BAD_SCRIPT/);assert.equal(await editor('stem').locator('img').count(),0);
 assert.match(await editor('stem').innerText(),/合法富文本/);assert.equal(await s.page.getByTestId('save-draft').isEnabled(),true);
 await s.page.waitForTimeout(800);assert.equal(drafts().find(d=>d.document.cardId===blank.document.cardId).document.title,'');
 await save();assert.equal(drafts().filter(d=>d.document.cardId===blank.document.cardId).length,1);check('A2/A4/A5/C paste and input remain in memory, manual update preserves one draft');
 const savedDraft=await s.api.call('draft.get',{deckId:f.deck.id,cardId:blank.document.cardId});
 await stop(s.app,f.data);s=null;s=await launch();assert.equal(new Set(report.pids).size,2);assert.deepEqual(await s.api.call('draft.get',{deckId:f.deck.id,cardId:blank.document.cardId}),savedDraft);
 await deck();await s.page.getByRole('button',{name:'草稿箱',exact:true}).click();await s.page.getByRole('navigation',{name:'已保存草稿'}).getByRole('button',{name:'B1 部分草稿',exact:true}).click();await editor('stem').waitFor();assert.match(await editor('stem').innerText(),/合法富文本/);
 assert.deepEqual(await s.api.call('draft.get',{deckId:f.deck.id,cardId:legacy.cardId}),legacy);check('A6/C old drafts retained and manual draft reads back in a distinct Electron process');
 await fill('question','B1 有草稿发布');await publish();assert.equal(await s.api.call('draft.get',{deckId:f.deck.id,cardId:blank.document.cardId}),null);check('B2/B5 existing draft publication clears atomically and disables both unchanged actions');
 const publishedScope={deckId:f.deck.id,cardId:blank.document.cardId};const frozen=await s.api.call('card.getPublishedContent',publishedScope),frozenFacts=facts();
 await s.page.getByTestId('draft-title').fill('B1 已发布修改草稿');assert.equal(await s.page.getByTestId('publish-card').isEnabled(),true);assert.equal(await s.page.getByTestId('save-draft').isEnabled(),true);assert.deepEqual(facts(),frozenFacts);assert.deepEqual(await s.api.call('card.getPublishedContent',publishedScope),frozen);await save();
 assert.deepEqual(await s.api.call('card.getPublishedContent',publishedScope),frozen);check('A7/B6 editing published content only changes memory/manual draft; formal version untouched');await cards();
 const published=[];
 for(const mode of ['question','qa','direct']){
  const original=facts(),eventStart=(await s.app.evaluate(()=>globalThis.v077Faults.events())).length;await newCard(mode);await fill(mode,'B1 直接发布 '+mode);await s.page.waitForTimeout(650);assert.deepEqual(facts(),original);
  await publish();const list=await s.api.call('card.listSummary',{deckId:f.deck.id,limit:100});const card=list.items.find(c=>c.title==='B1 直接发布 '+mode);assert.ok(card);assert.equal(await s.api.call('draft.get',{deckId:f.deck.id,cardId:card.cardId}),null);
  const events=await s.app.evaluate(()=>globalThis.v077Faults.events());const last=events.filter(e=>e.method==='card.publish').at(-1);assert.ok(last.ok);assert.equal(events.slice(eventStart).filter(e=>['draft.save','draft.create','draft.switchType'].includes(e.method)).length,0);
  published.push({scope:{deckId:f.deck.id,cardId:card.cardId},content:await s.api.call('card.getPublishedContent',{deckId:f.deck.id,cardId:card.cardId})});check('B1 direct publish without prior draft: '+mode);await cards();
 }
 // Unknown reply after a real commit. The UI must lock and retry the same identity.
 await newCard('direct');await fill('direct','B1 未知回执');
 await s.app.evaluate(()=>globalThis.v077Faults.arm('card.publish','drop-unknown'));await s.page.getByTestId('publish-card').click();await s.page.getByRole('alert').filter({hasText:'发布结果未知'}).waitFor();
 assert.equal(await s.page.getByTestId('draft-title').inputValue(),'B1 未知回执');const count=sql(db=>db.prepare("SELECT COUNT(*) n FROM learning_cards WHERE title='B1 未知回执'").get().n);assert.equal(count,1);
 await s.app.evaluate(()=>globalThis.v077Faults.clear());await publish();const requests=await s.app.evaluate(()=>globalThis.v077Faults.events().filter(e=>e.method==='card.publish').slice(-2));assert.equal(requests[0].requestId,requests[1].requestId);
 assert.equal(sql(db=>db.prepare("SELECT COUNT(*) n FROM learning_cards WHERE title='B1 未知回执'").get().n),1);check('B8 unknown committed reply preserves input and reconciles original request without duplication',{requests});
 await stop(s.app,f.data);s=null;s=await launch();assert.equal(new Set(report.pids).size,3);for(const p of published)assert.deepEqual(await s.api.call('card.getPublishedContent',p.scope),p.content);
 const durable=facts();report.finalDatabaseSha256=hash(durable);writeFileSync(join(out,'sqlite-final.json'),JSON.stringify(durable,null,2)+'\n');check('C final fresh process reads all published modes identically');
 }
 assert.deepEqual(errors,[]);report.status='PASS';
}catch(e){report.status=s?'FAIL':'TEST_INFRA';report.error=String(e.stack??e);process.exitCode=1;if(s){writeFileSync(join(out,'failure-ui.txt'),await s.page.locator('body').innerText().catch(()=>''));await s.page.screenshot({path:join(out,'failure.png')}).catch(()=>{});}}
finally{writeFileSync(join(out,'result.json'),JSON.stringify(report,null,2)+'\n');if(s){report.requests=await s.app.evaluate(()=>globalThis.v077Faults.events()).catch(()=>[]);let timer;try{await Promise.race([stop(s.app,f.data),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('CLEANUP_TIMEOUT')),5000);})]);}catch{if(s.child.exitCode===null)s.child.kill('SIGKILL');}finally{clearTimeout(timer);}}report.rendererErrors=errors;writeFileSync(join(out,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
