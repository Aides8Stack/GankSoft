import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {Transformer} from '@napi-rs/image';
import {createClient} from '../shared/protocol/client.ts';
import {publishFresh} from '../tests/fixtures/fresh-production.ts';
import {placementUrl} from '../shared/editor/document.ts';
import {stageBackup} from '../electron/infrastructure/backup.ts';
import {validateUnifiedData} from '../electron/infrastructure/migrations/unified-integrity.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
import {startSmoke} from './validation/smoke-evidence.mjs';
import {PRODUCTION606_CONTRACT} from './validation/smoke-contracts.mjs';
const finish=startSmoke(import.meta.url,PRODUCTION606_CONTRACT),require=createRequire(import.meta.url);
const root=mkdtempSync(join(tmpdir(),'gank-production-ui-')),data=join(root,'中文 空白数据'),target=resolve(process.argv[2]??'.');
const cases:string[]=[],errors:string[]=[];let app:Awaited<ReturnType<typeof electron.launch>>|undefined,page:any,client:ReturnType<typeof createClient>;
const record=(s:string)=>{cases.push(s);console.log('PRODUCTION606_CASE',s);};
async function launch(){
 app=await electron.launch({timeout:30000,executablePath:process.argv[3]??require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[]),target],env:{...process.env,GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:data}});
 app.process().stderr?.on('data',s=>{mkdirSync('validation-results',{recursive:true});require('node:fs').appendFileSync('validation-results/production606-main.log',s);});
 page=await app.firstWindow({timeout:20000});page.setDefaultTimeout(15000);page.on('pageerror',(e:Error)=>errors.push(e.message));
 await page.getByRole('heading',{name:'学习总览',exact:true}).waitFor();
 client=createClient(r=>page.evaluate((request:any)=>(window as any).gank.protocol(request),r));await client.call('app.capabilities',{});
}
async function close(){if(!app)return;const current=app,child=current.process();app=undefined;const exited=child.exitCode!==null?Promise.resolve(child.exitCode):new Promise<number|null>(resolve=>child.once('exit',resolve));const timer=setTimeout(()=>child.kill('SIGKILL'),8000);let code:number|null;try{await current.close();code=await exited;}finally{clearTimeout(timer);}assert.equal(code,0,'production process must close cleanly');}
const imageLoaded=(url:string)=>page.evaluate((src:string)=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth);img.onerror=()=>reject(Error('production media image failed'));img.src=src+'?verification='+crypto.randomUUID();}),url);
const activeDir=()=>JSON.parse(readFileSync(data+'-control606/active.json','utf8')).activeDir as string;
function inspect(){const dir=activeDir();return inspectDatabaseBaseline(join(dir,'ganksoft.sqlite'),dir,606);}
function rows(table:string){const db=new DatabaseSync(join(activeDir(),'ganksoft.sqlite'),{readOnly:true});try{return db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all();}finally{db.close();}}
async function choose(path:string){await app!.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},path);}
async function save(path:string){await app!.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},path);}
try{
 await launch();assert.equal((await client!.call('workspace.catalog',{})).model,'unified');assert.equal(inspect().schemaVersion,606);assert.equal(rows('questions').length,0);record('fresh-production-startup');
 const deck=await client!.call('workspace.catalog.save',{kind:'deck',name:'正式模式验收',parentId:null});
 const cards=[];
 for(const mode of ['question','qa','direct'] as const){
  const c=await publishFresh(client!,mode,deck.id);cards.push(c);let s=await client!.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]});
  if(s.stage==='answer')s=await client!.call('learning.session.change',{deckId:c.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'reveal',draft:{...s.draft,selectedOptionId:mode==='question'?'b':null,thought:'正式进程原始思路'}});
  s=await client!.call('learning.session.change',{deckId:c.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:90}});
  const e=await client!.call('learning.review.submit',{deckId:c.deckId,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:90,faults:[],gaps:'',reflection:'',practice:false});
  assert.equal(e.rating,mode==='question'?'again':'easy');assert.equal(e.native!.schedule.outcome,'updated');
  s=await client!.call('learning.session.get',{deckId:c.deckId,sessionId:s.sessionId});await client!.call('learning.session.change',{deckId:c.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'next'});
 }
 record('three-mode-publication-and-fsrs');
 const image=join(root,'合成 图片.png');writeFileSync(image,Transformer.fromRgbaPixels(Buffer.from([20,40,80,255]),1,1).pngSync());await choose(image);
 const [asset]=await client!.call('media.stage',{deckId:deck.id,purpose:'question',source:'file'});const ref={assetId:asset.id,placementId:randomUUID(),fileName:asset.id+'.png',mime:'image/png' as const,role:'question' as const,width:60};
 const c=cards[2],body='# 正式正文\n\n$E=mc^2$\n\n![]('+placementUrl({assetId:ref.assetId,placementId:ref.placementId,width:ref.width})+')';
 const d=await client!.call('draft.save',{...c,expectedPublishedRevision:1,expectedDraftRevision:null,fields:{title:'含图正式记忆',payload:{encoding:'direct-v1',mode:'direct',fields:{body,source:''}},mediaRefs:[ref]}});
 await client!.call('card.publish',{...c,expectedPublishedRevision:1,expectedDraftRevision:d.revision,resetStudyCycle:false});
 const tree=await client!.call('knowledge.tree.read',{deckId:deck.id});const node=await client!.call('knowledge.node.create',{deckId:deck.id,parentId:null,name:'正式知识',expectedTreeHash:tree.treeHash});
 await client!.call('knowledge.node.save',{deckId:deck.id,nodeId:node.nodeId,expectedRevision:node.revision,markdown:'# 正式知识\n\n$E=mc^2$'});await client!.call('knowledge.cardLinks.set',{...c,nodeIds:[node.nodeId],expectedRevision:0});
 const mediaUrl='app-media://asset/'+asset.id;assert.equal(await imageLoaded(mediaUrl),1);record('image-markdown-latex-and-knowledge');
 const events=rows('learning_review_events'),schedule=rows('scheduling');await close();await launch();assert.deepEqual(rows('learning_review_events'),events);assert.deepEqual(rows('scheduling'),schedule);assert.equal(await imageLoaded(mediaUrl),1);assert.match(JSON.stringify(await client!.call('card.getPublishedContent',c)),/E=mc/);record('production-restart-persistence');
 // Existing content import/export runs through the real production native-dialog ports.
 const zip=join(root,'正式卡片.zip');await save(zip);const preview=await client!.call('card.exchange.preview',{deckId:deck.id,cards:cards.map(c=>({cardId:c.cardId,expectedRevision:Number(rows('learning_cards').find(r=>r.id===c.cardId)!.revision)}))});
 assert.equal((await client!.call('card.exchange.save',{token:preview.token})).saved,true);await choose(zip);const p=await client!.call('card.exchange.open',{});assert.ok(p);assert.equal((await client!.call('card.exchange.import',{token:p!.token,name:'ZIP副本'})).count,3);
 await choose(resolve('examples/fresh-memory-6.gank.json'));const pkg=await client!.call('exchange.open',{});assert.ok(pkg);await client!.call('exchange.collection.import',{fileToken:pkg!.fileToken,name:'普通JSON导入',folderId:null});record('zip-json-exchange');
 const ver=Number(rows('decks').find(r=>r.id===deck.id)!.version);await client!.call('workspace.decks.batch',{action:'delete',decks:[{id:deck.id,expectedRevision:ver}]});assert.ok((await client!.call('workspace.recycle.decks',{})).items.some(r=>r.id===deck.id));
 await client!.call('workspace.decks.batch',{action:'restore',decks:[{id:deck.id,expectedRevision:ver+1}]});assert.deepEqual(rows('learning_review_events').filter(r=>events.some(e=>e.id===r.id)),events);record('recycle-preserves-history');
 const backup=join(root,'整库备份.zip');await save(backup);assert.equal(await client!.call('maintenance.backup',{}),backup);const expected=join(root,'verified-backup');await stageBackup(backup,expected);const before=inspectDatabaseBaseline(join(expected,'ganksoft.sqlite'),expected,606);await publishFresh(client!,'direct',deck.id);await choose(backup);const restore=await client!.call('storage.restore.open',{});assert.ok(restore);assert.equal(restore!.summary.schemaVersion,606);
 const restored=await client!.send(client!.prepare('storage.restore.confirm',restore!.confirmation,restore!.confirmation.operationId));assert.equal(restored.state,'committed');
 const facts=(b:ReturnType<typeof inspect>)=>({...b,tables:b.tables.filter(t=>!['protocol_meta','learning_owner'].includes(t.name)),digest:null});assert.deepEqual(facts(inspect()),facts(before));assert.equal(await imageLoaded(mediaUrl),1);record('full-backup-restore');
 const parent=join(root,'迁移 目标');mkdirSync(parent);await choose(parent);const relocation=await client!.call('storage.relocate.open',{});assert.ok(relocation);const moved=await client!.send(client!.prepare('storage.relocate.confirm',relocation!.confirmation,relocation!.confirmation.operationId));assert.equal(moved.state,'committed');assert.equal((await client!.call('storage.relocate.info',{})).currentDirectory,relocation!.destination);
 await choose(image);const [postMoveAsset]=await client!.call('media.stage',{deckId:deck.id,purpose:'question',source:'file'});assert.equal(await imageLoaded('app-media://asset/'+postMoveAsset.id),1);const postMoveCard=await publishFresh(client!,'direct',deck.id);
 const movedFacts=inspect();await close();await launch();assert.deepEqual(inspect(),movedFacts);assert.ok((await client!.call('card.getPublishedContent',postMoveCard)).versionId);assert.equal(await imageLoaded('app-media://asset/'+postMoveAsset.id),1);assert.equal((await client!.call('storage.relocate.info',{})).currentDirectory,relocation!.destination);assert.equal(await imageLoaded(mediaUrl),1);record('directory-relocation-and-restart');
 const capabilities=await client!.call('app.capabilities',{});assert.ok(!JSON.stringify(capabilities).includes('storage.append.'));const untouched=inspect();const epoch=JSON.parse(readFileSync(data+'-control606/active.json','utf8')).epoch;
 for(const method of ['storage.append.open','storage.append.select','storage.append.preview','storage.append.confirm','storage.append.cancel','storage.append.status']){const r=await page.evaluate((request:any)=>(window as any).gank.protocol(request),{protocol:{major:2,minor:0},dataEpoch:epoch,requestId:randomUUID(),method,payload:{}});assert.equal(r.ok,false);assert.equal(r.error.code,'METHOD_UNSUPPORTED');}
 assert.deepEqual(inspect(),untouched);const db=new DatabaseSync(join(activeDir(),'ganksoft.sqlite'),{readOnly:true});try{validateUnifiedData(db);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);}finally{db.close();}record('external-append-unreachable');
 assert.deepEqual(errors,[]);await close();const result={platform:process.platform,cases,errors,asar:target.endsWith('.asar'),windows10Manual:'NOT_RUN',windows11Manual:'NOT_RUN'};mkdirSync('validation-results',{recursive:true});writeFileSync('validation-results/production606.json',JSON.stringify(result,null,2));finish(result);
}finally{await close();rmSync(root,{recursive:true,force:true});}
