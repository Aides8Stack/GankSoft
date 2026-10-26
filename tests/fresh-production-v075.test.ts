import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {prepareFreshUnified} from '../electron/infrastructure/migrations/coordinator.ts';
import {createFullRestoreSession} from '../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../shared/protocol/client.ts';
import {validateUnifiedData} from '../electron/infrastructure/migrations/unified-integrity.ts';
import {DEFAULT_QUESTION_DECK} from '../electron/infrastructure/database.ts';
import type {DraftPayloadDTO} from '../shared/protocol/card-draft.ts';

import {freshFixture,publishFresh} from './fixtures/fresh-production.ts';

test('fresh production606 initializes directly, publishes all modes, records objective FSRS and knowledge, persists after close/reopen',async()=>{
 const f=await freshFixture();try{
  assert.equal(f.ctx.db.prepare('PRAGMA user_version').get()!.user_version,606);
  assert.equal(existsSync(join(f.data,'ganksoft.sqlite')),false,'no historical/source database is created');
  assert.equal(f.ctx.db.prepare('SELECT count(*) n FROM questions').get()!.n,0);
  const catalog=await f.client.call('workspace.catalog',{});assert.equal(catalog.model,'unified');
  const made=await f.client.call('workspace.catalog.save',{kind:'deck',name:'正式新卡片集',parentId:null});
  await f.client.call('workspace.catalog.save',{kind:'deck',id:made.id,expectedRevision:made.revision,name:'已编辑卡片集',parentId:null});
  const cards=[];
  for(const mode of ['question','qa','direct'] as const){
   const c=await publishFresh(f.client,mode,made.id);cards.push(c);
   let s=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]});
   if(s.stage==='answer')s=await f.client.call('learning.session.change',{deckId:c.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'reveal',draft:{...s.draft,selectedOptionId:mode==='question'?'b':null,thought:'原始思路'}});
   s=await f.client.call('learning.session.change',{deckId:c.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:90,reflection:'保留历史'}});
   const event=await f.client.call('learning.review.submit',{deckId:c.deckId,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:90,faults:[],gaps:'',reflection:'保留历史',practice:false});
   assert.equal(event.rating,mode==='question'?'again':'easy');assert.equal(event.objectiveCorrect,mode==='question'?false:null);
   assert.equal(event.native!.schedule.outcome,'updated');
  }
  const tree=await f.client.call('knowledge.tree.read',{deckId:made.id});
  const node=await f.client.call('knowledge.node.create',{deckId:made.id,parentId:null,name:'正式知识点',expectedTreeHash:tree.treeHash});
  await f.client.call('knowledge.node.save',{deckId:made.id,nodeId:node.nodeId,expectedRevision:node.revision,markdown:'# 知识\n\n$E=mc^2$'});
  await f.client.call('knowledge.cardLinks.set',{...cards[0],nodeIds:[node.nodeId],expectedRevision:0});
  validateUnifiedData(f.ctx.db);assert.deepEqual(f.ctx.db.prepare('PRAGMA foreign_key_check').all(),[]);
  const events=f.ctx.db.prepare('SELECT * FROM learning_review_events ORDER BY id').all(),schedules=f.ctx.db.prepare('SELECT * FROM scheduling ORDER BY card_id').all();
  await f.reopen();assert.deepEqual(f.ctx.db.prepare('SELECT * FROM learning_review_events ORDER BY id').all(),events);assert.deepEqual(f.ctx.db.prepare('SELECT * FROM scheduling ORDER BY card_id').all(),schedules);
  for(const c of cards)assert.ok((await f.client.call('card.getPublishedContent',c)).versionId);
  assert.match((await f.client.call('knowledge.node.read',{deckId:made.id,nodeId:node.nodeId})).markdown,/E=mc/);
  const ptr=readFileSync(join(f.control,'active.json'),'utf8');
  // Internal retained module is never imported or registered by the production session.
  const absent=await f.client.call('app.capabilities',{});assert.ok(!JSON.stringify(absent).includes('storage.append.'));
  assert.equal(readFileSync(join(f.control,'active.json'),'utf8'),ptr);
  validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});

test('fresh admission refuses existing data byte-for-byte and partial initialization without 604 fallback',async()=>{
 const root=mkdtempSync(join(tmpdir(),'gank-fresh-refusal-'));try{
  const data=join(root,'data');mkdirSync(data);const db=join(data,'ganksoft.sqlite'),bytes=Buffer.from('synthetic existing database, must not open');writeFileSync(db,bytes);
  await assert.rejects(()=>prepareFreshUnified(data,data+'-control606'),/已有学习数据/);assert.deepEqual(readFileSync(db),bytes);assert.deepEqual(readdirSync(root),['data']);
  const empty=join(root,'empty'),control=empty+'-control606';mkdirSync(control);
  await assert.rejects(()=>prepareFreshUnified(empty,control),/不是全新606/);assert.equal(existsSync(join(empty,'ganksoft.sqlite')),false);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('native backup snapshot marks only its own read operation; unrelated pending actions and live records stay fenced',async()=>{
 const f=await freshFixture();try{
  const {createBackup,stageBackup}=await import('../electron/infrastructure/backup.ts');
  const {DatabaseSync}=await import('node:sqlite');
  const epoch=String(f.ctx.db.prepare('SELECT epoch FROM protocol_meta').get()!.epoch),id=randomUUID(),other=randomUUID();
  const add=f.ctx.db.prepare("INSERT INTO platform_operations VALUES(?,?,?,?,'pending',?)");
  add.run(id,epoch,'maintenance.backup','own-proof',new Date().toISOString());add.run(other,epoch,'exchange.deck.export','other-proof',new Date().toISOString());
  const path=join(f.root,'snapshot.zip');await createBackup(f.ctx.db,f.ctx.dataDir,path,{snapshotOperationId:id});const dir=join(f.root,'staged');await stageBackup(path,dir);
  const copy=new DatabaseSync(join(dir,'ganksoft.sqlite'),{readOnly:true});try{
   assert.equal(copy.prepare('SELECT state FROM platform_operations WHERE request_id=?').get(id)!.state,'snapshot-only');
   assert.equal(copy.prepare('SELECT state FROM platform_operations WHERE request_id=?').get(other)!.state,'pending');validateUnifiedData(copy);
  }finally{copy.close();}
  assert.equal(f.ctx.db.prepare('SELECT count(*) n FROM platform_operations WHERE state=\'pending\'').get()!.n,2);
  await assert.rejects(()=>createBackup(f.ctx.db,f.ctx.dataDir,join(f.root,'invalid.zip'),{snapshotOperationId:other}),/身份不一致/);
 }finally{f.close();}
});
