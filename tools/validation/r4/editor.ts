import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createClient} from '../../../shared/protocol/client.ts';
const require=createRequire(import.meta.url),f=JSON.parse(readFileSync('validation-results/r2-seed-v2/fixture.json','utf8'));
const report:any={status:'FAIL',cases:[],errors:[]},published:any[]=[];let app:any;
const out='docs/v076/rebuild-v37-source-first/stages/R4/evidence/editor.json';
async function start(){app=await electron.launch({executablePath:require('electron'),args:['--no-sandbox','--ozone-platform=headless','--ozone-override-screen-size=1600,1000','--disable-gpu',resolve('.')],env:{...process.env,TZ:'Asia/Shanghai',GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:f.data}});const p=await app.firstWindow();p.setDefaultTimeout(15000);p.on('pageerror',(e:Error)=>report.errors.push(e.message));await p.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();return p;}
async function stop(){if(app){await app.evaluate(({app}:any)=>app.exit(0)).catch(()=>{});await app.close();app=undefined;}}
try{
 let p=await start(),api=createClient(r=>p.evaluate((v:any)=>(window as any).gank.protocol(v),r));await api.call('app.capabilities',{});
 await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:/^言语理解，/}).click();const nav=p.getByRole('navigation',{name:'卡片集功能'});await nav.getByRole('button',{name:'所有卡片',exact:true}).click();await p.locator('.data-table tbody tr').first().waitFor();
 const rows=(await api.call('card.listSummary',{deckId:f.decks.language.id,limit:30})).items;
 for(const mode of ['question','qa','direct'] as const){
  const c=rows.find(c=>c.publishedType===mode&&c.cardId!==f.cards[1].cardId)!;assert.ok(c);
  const before=await api.call('card.getPublishedContent',{deckId:f.decks.language.id,cardId:c.cardId});
  await p.locator(`tr[data-card-id="${c.cardId}"]`).getByRole('button',{name:/^详情 /}).click();await p.locator('.r3-detail[aria-busy=false]').waitFor();await p.getByRole('button',{name:'编辑卡片',exact:true}).click();await p.getByTestId('draft-title').waitFor();await p.locator('.ProseMirror[contenteditable=true]').first().waitFor();
  const title='R4正式三模式编辑 '+mode;await p.getByTestId('draft-title').fill(title);await p.getByTestId('save-draft').click();await p.locator('[data-save-state=clean]').waitFor();
  const draft=await api.call('draft.get',{deckId:f.decks.language.id,cardId:c.cardId});assert.equal(draft?.title,title);assert.equal((await api.call('card.getPublishedContent',{deckId:f.decks.language.id,cardId:c.cardId})).versionId,before.versionId);
  const target=mode==='qa'?'直接记忆':'问答记忆';await p.getByRole('navigation',{name:'卡片类型'}).getByRole('button',{name:target,exact:true}).click();const dialog=p.getByRole('dialog',{name:'确认切换卡片类型'});await dialog.waitFor();await dialog.getByRole('button',{name:'取消',exact:true}).click();assert.equal((await api.call('draft.get',{deckId:f.decks.language.id,cardId:c.cardId}))?.draftType,mode);
  await p.getByTestId('publish-card').click();await p.getByRole('status').filter({hasText:'发布成功'}).waitFor();const after=await api.call('card.getPublishedContent',{deckId:f.decks.language.id,cardId:c.cardId});assert.equal(after.title,title);assert.equal(after.mode,mode);assert.notEqual(after.versionId,before.versionId);published.push({cardId:c.cardId,title,versionId:after.versionId,mode});
  await p.getByRole('button',{name:/返回上一页/}).click();await p.locator('.r3-cards').waitFor();report.cases.push({name:mode+' real UI draft/publish/type-switch cancel and unchanged published version before publish',status:'PASS'});
 }
 await stop();p=await start();api=createClient(r=>p.evaluate((v:any)=>(window as any).gank.protocol(v),r));await api.call('app.capabilities',{});
 for(const c of published){const current=await api.call('card.getPublishedContent',{deckId:f.decks.language.id,cardId:c.cardId});assert.equal(current.title,c.title);assert.equal(current.versionId,c.versionId);assert.equal(current.mode,c.mode);assert.equal(await api.call('draft.get',{deckId:f.decks.language.id,cardId:c.cardId}),null);}
 report.cases.push({name:'all three publications read back after new Electron process',status:'PASS'});assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.errors.push(String((e as Error).message).replaceAll(resolve('.'),'<repo>'));process.exitCode=1;}finally{await stop();writeFileSync(out,JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report));
