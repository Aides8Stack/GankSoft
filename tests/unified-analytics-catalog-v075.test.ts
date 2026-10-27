import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {createBackup,stageBackup} from '../electron/infrastructure/backup.ts';
import {validateUnifiedData} from '../electron/infrastructure/migrations/unified-integrity.ts';
const code=(value:string)=>(e:unknown)=>(e as {code?:string}).code===value;
type Fixture=Awaited<ReturnType<typeof unifiedWorkspaceFixture>>;
async function review(f:Fixture,card:{cardId:string;deckId:string},scoreTenths:number,reflection='',practice=false){
 const scope={deckId:card.deckId},opened=await f.client.call('learning.session.open',{...scope,cardIds:[card.cardId],practice});
 f.advance(5000);
 const s=await f.client.call('learning.session.change',{...scope,sessionId:opened.sessionId,expectedRevision:opened.revision,action:'save',draft:{...opened.draft,scoreTenths,reflection}});
 const event=await f.client.call('learning.review.submit',{...scope,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths,faults:[],gaps:'',reflection,practice});
 const result=await f.client.call('learning.session.get',{...scope,sessionId:s.sessionId});
 await f.client.call('learning.session.change',{...scope,sessionId:s.sessionId,expectedRevision:result.revision,action:'next'});
 return event;
}

test('T33/T37 mixed-deck analytics aggregate real evidence, distinguish missing values and isolate current ownership',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const a=await f.card('direct'),b=await f.card('qa');await review(f,a,90);await review(f,a,70,'',true);
  const p=await f.client.call('workspace.analytics',{deckId:a.deckId,date:{range:'all'},limit:1});
  assert.equal(p.cardCount,3);assert.deepEqual(p.cardsByMode,{question:1,qa:1,direct:1});assert.equal(p.eventCount,4);assert.equal(p.gradedCount,2);assert.equal(p.practiceCount,1);assert.equal(p.averageScoreTenths,80);assert.equal(p.averageElapsedSeconds,5);
  assert.ok(p.nextCursor);const next=await f.client.call('workspace.analytics',{deckId:a.deckId,date:{range:'all'},cursor:p.nextCursor,limit:1});assert.notEqual(next.items[0].eventId,p.items[0].eventId);
  const other=await f.client.call('workspace.analytics',{deckId:f.source.ids.mDeck,date:{range:'all'}});assert.equal(other.gradedCount,0);assert.equal(other.averageScoreTenths,null);assert.equal(other.averageElapsedSeconds,null);
  assert.doesNotMatch(JSON.stringify(p),/legacyRaw|knowledgeSnapshot|mediaRefs|thought|reflection|payload/);
  await assert.rejects(()=>f.client.call('workspace.analytics',{deckId:a.deckId,date:{range:'7'},cursor:p.nextCursor}),code('DATA_REVISION_CHANGED'));
  await f.client.call('draft.create',{deckId:b.deckId,initialType:'direct'});
  await assert.rejects(()=>f.client.call('workspace.analytics',{deckId:a.deckId,date:{range:'all'},cursor:p.nextCursor}),code('DATA_REVISION_CHANGED'));
 }finally{f.close();}
});

test('T37 history/analytics SQL list projections stay small even with large original evidence; details retain exact evidence',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('direct'),reflection='原始反思证据'.repeat(20000),event=await review(f,c,75,reflection);
  const readSizes:number[]=[],prepare=f.ctx.db.prepare.bind(f.ctx.db);
  f.ctx.db.prepare=(sql:string)=>{const s=prepare(sql);if(sql.includes('FROM learning_review_events')&&!sql.includes('SELECT document')){const all=s.all.bind(s);s.all=(...args)=>{const rows=all(...args);readSizes.push(...rows.map(r=>Buffer.byteLength(JSON.stringify(r))));return rows;};}return s;};
  const h=await f.client.call('learning.history.list',{deckId:c.deckId,cardId:c.cardId});const a=await f.client.call('workspace.analytics',{deckId:c.deckId,date:{range:'all'}});
  assert.ok(readSizes.length>=2);assert.ok(Math.max(...readSizes)<2000);assert.ok(Buffer.byteLength(JSON.stringify(h))<2000);assert.ok(Buffer.byteLength(JSON.stringify(a))<5000);
  assert.equal((await f.client.call('learning.history.get',{deckId:c.deckId,cardId:c.cardId,eventId:event.eventId})).native!.reflection,reflection);
 }finally{f.close();}
});

test('T33 analytics custom dates use the study timezone including the last local calendar day',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('direct');f.advance(Date.parse('2026-10-18T23:59:00.000Z')-f.ctx.now().getTime());await review(f,c,90);
  const local=await f.client.call('workspace.analytics',{deckId:c.deckId,date:{range:'custom',start:'2026-10-19',end:'2026-10-19'}});assert.equal(local.eventCount,1);assert.equal(local.averageScoreTenths,90);assert.equal(local.window.timeZone,'Asia/Shanghai');
  const before=await f.client.call('workspace.analytics',{deckId:c.deckId,date:{range:'custom',start:'2026-10-18',end:'2026-10-18'}});assert.equal(before.gradedCount,0);
 }finally{f.close();}
});

test('T33 catalog create/rename/move uses existing CAS, sibling and cycle rules without card mode restrictions',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const folder=await f.client.call('workspace.catalog.save',{kind:'folder',name:'专项目录',parentId:null});
  const req=f.client.prepare('workspace.catalog.save',{kind:'deck',name:'混合学习',parentId:folder.id});const d=await f.client.send(req);assert.deepEqual(await f.client.send(req),d);
  f.ctx.db.prepare('UPDATE decks SET sort_order=17 WHERE id=?').run(d.id);
  for(const mode of ['direct','qa','question'] as const)await f.card(mode,d.id);
  assert.equal((await f.client.call('workspace.catalog',{folderId:folder.id})).items.find(i=>i.id===d.id)!.cardCount,3);
  const renamed=await f.client.call('workspace.catalog.save',{kind:'deck',id:d.id,expectedRevision:d.revision,name:'已移动混合集',parentId:null});assert.equal(renamed.revision,d.revision+1);
  assert.equal(f.ctx.db.prepare('SELECT sort_order FROM decks WHERE id=?').get(d.id)!.sort_order,17);
  assert.equal((await f.client.call('workspace.catalog',{})).items.find(i=>i.id===d.id)!.name,'已移动混合集');
  await assert.rejects(()=>f.client.call('workspace.catalog.save',{kind:'deck',id:d.id,expectedRevision:d.revision,name:'不能覆盖',parentId:null}));
  await assert.rejects(()=>f.client.call('workspace.catalog.save',{kind:'folder',id:folder.id,expectedRevision:folder.revision,name:'循环',parentId:folder.id}));
  await assert.rejects(()=>f.client.call('workspace.catalog.save',{kind:'deck',name:'已移动混合集',parentId:null}));
  f.reopen();validateUnifiedData(f.ctx.db);assert.equal((await f.client.call('card.listSummary',{deckId:d.id})).items.length,3);
 }finally{f.close();}
});

test('T34 lifecycle archive, history, policy and media closure survive a full synthetic backup/staged restore',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('direct'),event=await review(f,c,90,'备份必须保留');
  await f.client.call('policy.card.set',{kind:'card',cardId:c.cardId,expectedRevision:0,maxIntervalDays:99});
  const target=f.source.ids.mDeck,revision=Number(f.ctx.db.prepare('SELECT version FROM decks WHERE id=?').get(target)!.version);
  await f.client.call('card.batch.apply',{deckId:c.deckId,action:'move',targetDeckId:target,expectedTargetRevision:revision,cards:[{cardId:c.cardId,expectedRevision:1}]});
  const path=join(f.source.root,'lifecycle-backup.zip'),restored=join(f.source.root,'lifecycle-restored');await createBackup(f.ctx.db,f.ctx.dataDir,path);await stageBackup(path,restored);
  const db=new DatabaseSync(join(restored,'ganksoft.sqlite'),{readOnly:true});try{
   validateUnifiedData(db);assert.equal(db.prepare('SELECT deck_id FROM learning_cards WHERE id=?').get(c.cardId)!.deck_id,target);
   assert.equal(JSON.parse(String(db.prepare('SELECT document FROM learning_review_events WHERE id=?').get(event.eventId)!.document)).native.reflection,'备份必须保留');
   assert.equal(Number(db.prepare("SELECT count(*) n FROM settings WHERE key LIKE 'unified-archived-session:%'").get()!.n),1);
   assert.deepEqual(readFileSync(join(restored,'attachments',f.source.ids.currentImage+'.png')),readFileSync(join(f.ctx.dataDir,'attachments',f.source.ids.currentImage+'.png')));
  }finally{db.close();}
 }finally{f.close();}
});
