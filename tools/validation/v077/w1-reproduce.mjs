import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {_electron as electron} from 'playwright-core';
import {freshFixture} from './scenarios/m1-support.mjs';
import {createFullRestoreSession} from '../../../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../../../shared/protocol/client.ts';
import {blankCardFields} from '../../../shared/cards/mapping.ts';
import {args,require} from '../r5/support.ts';
const out='docs/v077/workstreams/W1/evidence';mkdirSync(out,{recursive:true});
const report={source:'2f7cf4858b530b3a7c1ee1c8d743f0c9016b7e4f',checks:[]};let app;
try{
 const f=await freshFixture();const owner=await createFullRestoreSession(f.data+'-control606',{workspaceParent:f.root,selectBackup:async()=>null,allowLegacyRestore:false});
 const seed=createClient(r=>owner.execute(r));await seed.call('app.capabilities',{});const deckId=f.deck.id,cardId=randomUUID(),fields=blankCardFields('direct');fields.title='W1 根因卡';fields.payload.fields.body='W1 independent';await seed.call('card.publish',{deckId,cardId,expectedPublishedRevision:0,expectedDraftRevision:null,resetStudyCycle:false,fields});owner.close();
 app=await electron.launch({executablePath:require('electron'),args:[...args,resolve('tools/validation/v077/host.cjs')],env:{...process.env,TZ:'Asia/Shanghai',GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:f.data,GANK_R6_MAIN:resolve('dist-electron/electron/main.js')},timeout:20000});
 const p=await app.firstWindow();p.setDefaultTimeout(12000);await p.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();await p.locator('[data-catalog-id="'+deckId+'"] > .deck-link').click();await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();const row=p.locator('tr').filter({hasText:'W1 根因卡'});report.before=await row.innerText();await p.getByRole('checkbox',{name:'选择 W1 根因卡',exact:true}).check();await p.getByRole('button',{name:'学习选中卡片',exact:true}).click();await p.getByRole('slider').waitFor();
 await app.evaluate(()=>globalThis.v077Faults.holdAfter('learning.session.change'));await p.getByRole('slider').press('End');
 await p.waitForFunction(()=>document.querySelector('[data-testid="review-save-state"]')?.textContent==='待核对保存结果');
 const button=p.getByRole('button',{name:'保存本次复盘',exact:true}),box=await button.boundingBox();assert.ok(box);report.disabledDuringAutosave=await button.isDisabled();await p.mouse.click(box.x+box.width/2,box.y+box.height/2);await app.evaluate(()=>globalThis.v077Faults.release());await p.getByTestId('review-save-state').filter({hasText:'草稿已保存'}).waitFor();
 report.afterFirstClick=await app.evaluate(()=>globalThis.v077Faults.events());assert.equal(report.afterFirstClick.filter(e=>e.method==='learning.review.submit').length,0);report.checks.push('Real mouse click during held autosave produces no review.submit');
 await button.click();await p.getByRole('status').filter({hasText:'复盘已保存 · 自评'}).waitFor();
 const active=JSON.parse(readFileSync(f.data+'-control606/active.json')),db=new DatabaseSync(join(active.activeDir,'ganksoft.sqlite'),{readOnly:true});report.tables={events:db.prepare('SELECT * FROM learning_review_events').all(),schedule:db.prepare('SELECT * FROM schedule_events').all(),latest:db.prepare('SELECT * FROM scheduling').all()};db.close();assert.equal(report.tables.events.length,1);assert.equal(report.tables.schedule.length,1);
 await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();await p.getByRole('heading',{name:'所有卡片',exact:true}).waitFor();report.after=await row.innerText();assert.equal(report.after,report.before);report.checks.push('DB submitted three tables but returned list still shows pre-review row');
 await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'学习分析',exact:true}).click();await p.locator('[aria-label="学习分析"][aria-busy=false]').waitFor();report.analysis=await p.locator('[aria-label="学习分析"]').innerText();await p.screenshot({path:resolve('validation-results/w1-baseline.png')});report.status='REPRODUCED';report.events=await app.evaluate(()=>globalThis.v077Faults.events());
}catch(e){report.status='FAIL';report.error=String(e.stack??e);process.exitCode=1;}finally{writeFileSync(join(out,'baseline.json'),JSON.stringify(report,null,2)+'\n');if(app){await app.evaluate(()=>globalThis.v077Faults.release()).catch(()=>{});app.process().kill('SIGKILL');}console.log(JSON.stringify(report));}
