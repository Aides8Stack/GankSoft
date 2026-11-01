import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {join,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import yazl from 'yazl';
import {_electron as electron} from 'playwright-core';
import {freshFixture} from './scenarios/m1-support.mjs';
import {createFullRestoreSession} from '../../../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../../../shared/protocol/client.ts';
import {publishFresh} from '../../../tests/fixtures/fresh-production.ts';
import {writeAnalysisZip} from '../../../electron/modules/workspace-unified/analysis-zip.ts';
import {readSourceZip} from '../../../electron/modules/workspace-unified/adjustment-preview.ts';
import {ACTION_FORMAT} from '../../../shared/protocol/ai-adjustments.ts';
import {args,require} from '../r5/support.ts';
const out=resolve(process.env.W5_EVIDENCE_DIR??'validation-results/w5/gui');mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),errors=[];
const report={sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scriptSha256:hash(readFileSync(new URL(import.meta.url))),sourceFiles:Object.fromEntries(execFileSync('git',['ls-files','--','src','shared','electron'],{encoding:'utf8'}).trim().split('\n').map(p=>[p,hash(readFileSync(p))])),checks:[],platform:process.platform,nativeDialog:'CHOICE_INJECTED_NOT_PHYSICAL',windowsCI:'NOT_RUN',windows10:'NOT_RUN',windows11:'NOT_RUN',physical125DPI:'NOT_RUN'};
let f,owner,app,page,api,deckId,stage='seed';const save=()=>writeFileSync(join(out,'result.json'),JSON.stringify({...report,stage,rendererErrors:errors},null,2)+'\n');
const check=(name,detail={})=>{report.checks.push({name,status:'PASS',...detail});console.log('PASS '+name);save();};
function dump(){const active=JSON.parse(readFileSync(f.data+'-control606/active.json')),db=new DatabaseSync(join(active.activeDir,'ganksoft.sqlite'),{readOnly:true});try{return hash(Buffer.from(JSON.stringify(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name})=>({name,rows:db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()})))));}finally{db.close();}}
async function zip(path,body){const z=new yazl.ZipFile();z.addBuffer(Buffer.from(JSON.stringify(body)),'ai-adjustments.json');z.end();await pipeline(z.outputStream,createWriteStream(path));}
async function choose(paths){await app.evaluate((_,v)=>globalThis.w5Dialogs.set(v),paths);}
try{
 f=await freshFixture({unicode:true});owner=await createFullRestoreSession(f.data+'-control606',{workspaceParent:f.root,selectBackup:async()=>null,allowLegacyRestore:false});const seed=createClient(r=>owner.execute(r));await seed.call('app.capabilities',{});deckId=(await seed.call('workspace.catalog.save',{kind:'deck',name:'W5 只读预览',parentId:null})).id;
 const actions=[];for(let i=0;i<52;i++){const c=await publishFresh(seed,'direct',deckId);actions.push({actionId:'gui-'+i,type:'card.policy.max_interval.set',cardId:c.cardId,value:15,reason:'合成分析依据 '+i});}
 const original=join(f.root,'original.zip');await writeAnalysisZip(owner.ctx,{deckId,jobId:randomUUID(),date:{range:'all'},includeImages:false},original,{cancelled:false,progress:{phase:'idle',cardCount:0,eventCount:0,bytes:0}});const source=await readSourceZip(original),returns=join(f.root,'returns.zip'),bad=join(f.root,'bad.zip');await zip(returns,{format:ACTION_FORMAT,source,actions});await zip(bad,{format:ACTION_FORMAT,source:{...source,exportId:randomUUID()},actions});owner.close();owner=null;
 app=await electron.launch({executablePath:require('electron'),args:[...args,resolve('tools/validation/v077/w5-host.cjs')],env:{...process.env,TZ:'Asia/Shanghai',GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:f.data},timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(String(e)));await page.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();report.pid=app.process().pid;api=createClient(r=>page.evaluate(v=>window.gank.protocol(v),r));await api.call('app.capabilities',{});
 await page.locator('[data-catalog-id="'+deckId+'"] > .deck-link').click();await page.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'学习分析',exact:true}).click();await page.getByRole('button',{name:'AI 调度调整',exact:true}).click();const before=dump();
 stage='import';await choose([original,returns]);await page.getByRole('button',{name:'导入建议 ZIP',exact:true}).click();await page.getByRole('status').filter({hasText:'共 52 条 · 合法 52'}).waitFor();assert.equal(await page.locator('[data-preview-index]').count(),50);assert.equal(dump(),before);assert.equal(await page.getByRole('button',{name:'执行建议（未开放）',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'撤销（未开放）',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'下一页',exact:true}).click();await page.locator('[data-preview-index="51"]').waitFor();assert.equal(await page.locator('[data-preview-index]').count(),2);assert.equal(dump(),before);check('real UI -> gateway -> SQLite, 52 legal suggestions and all pages, disabled execution, zero writes');
 stage='widths';for(const width of [900,1366,1600]){await app.evaluate(({BrowserWindow},w)=>BrowserWindow.getAllWindows()[0].setSize(w,900),width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:join(out,'preview-'+width+'.png'),fullPage:true});}check('existing layout and return navigation at 900/1366/1600');
 stage='cancel';await page.getByRole('button',{name:'取消预览',exact:true}).click();await page.getByRole('status').filter({hasText:'已取消预览'}).waitFor();assert.equal(await page.locator('[aria-label="建议预览结果"]').count(),0);assert.equal(dump(),before);await choose([null]);await page.getByRole('button',{name:'导入建议 ZIP',exact:true}).click();await page.getByRole('status').filter({hasText:'已取消导入'}).waitFor();assert.equal(dump(),before);check('preview cancel and file-picker cancel, all DB tables unchanged');
 stage='error';await choose([original,bad]);await page.getByRole('button',{name:'导入建议 ZIP',exact:true}).click();await page.getByRole('alert').filter({hasText:'导入未完成'}).waitFor();assert.equal(await page.locator('[aria-label="建议预览结果"]').count(),0);assert.equal(await page.getByRole('status').filter({hasText:'共 52 条'}).count(),0);assert.equal(dump(),before);check('wrong export provenance visibly rejected, no stale success or DB writes');
 stage='stale';await choose([original,returns]);await page.getByRole('button',{name:'导入建议 ZIP',exact:true}).click();await page.getByRole('status').filter({hasText:'共 52 条'}).waitFor();await api.call('workspace.catalog.save',{kind:'deck',name:'GUI 真实修订变化',parentId:null});const changed=dump();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('alert').filter({hasText:'旧预览失效'}).waitFor();assert.equal(dump(),changed);check('real revision change and activation invalidate old preview without writes');
 await page.getByRole('button',{name:'取消预览',exact:true}).click();await page.getByRole('button',{name:'返回学习分析',exact:true}).click();await page.getByTestId('analytics-summary').waitFor();assert.equal(errors.length,0);check('return to analysis, zero renderer errors');report.status='PASS';stage='done';save();
}catch(e){report.status='FAIL';report.error=String(e?.stack??e);console.error(e);save();process.exitCode=1;}
finally{owner?.close();if(app)await app.close().catch(()=>{});save();}
