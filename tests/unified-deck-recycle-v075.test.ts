import test from 'node:test';
import assert from 'node:assert/strict';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
const facts=(f:Awaited<ReturnType<typeof unifiedWorkspaceFixture>>)=>{
 const db=f.ctx.db;return ['learning_review_events','learning_content_versions','learning_study_cycles','scheduling','schedule_events','attempts','memory_reviews','assets','learning_card_knowledge'].filter(t=>db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t)).map(t=>[t,db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()]);
};
const revision=(f:Awaited<ReturnType<typeof unifiedWorkspaceFixture>>,id:string)=>Number(f.ctx.db.prepare('SELECT version FROM decks WHERE id=?').get(id)!.version);
test('T41 whole mixed deck deletion/restoration keeps prior recycled cards, immutable history, FSRS/media/links and identity',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const deckId=f.source.ids.qDeck,a=await f.card('question'),b=await f.card('qa'),c=await f.card('direct');
  await f.client.call('knowledge.cardLinks.set',{deckId,cardId:b.cardId,nodeIds:[f.source.ids.child1],expectedRevision:0});
  await f.client.call('policy.card.set',{kind:'card',cardId:c.cardId,expectedRevision:0,maxIntervalDays:99});
  let session=await f.client.call('learning.session.open',{deckId,cardIds:[c.cardId]});
  session=await f.client.call('learning.session.change',{deckId,sessionId:session.sessionId,expectedRevision:session.revision,action:'save',draft:{...session.draft,scoreTenths:85,reflection:'合成复盘证据'}});
  await f.client.call('learning.review.submit',{deckId,sessionId:session.sessionId,expectedRevision:session.revision,eventId:session.entry.eventId,scoreTenths:85,faults:[],gaps:'',reflection:'合成复盘证据',practice:false});
  session=await f.client.call('learning.session.get',{deckId,sessionId:session.sessionId});await f.client.call('learning.session.change',{deckId,sessionId:session.sessionId,expectedRevision:session.revision,action:'next'});
  const preview=await f.client.call('draft.previewSwitch',{deckId,cardId:b.cardId,targetType:'qa'});await f.client.call('draft.save',{deckId,cardId:b.cardId,expectedPublishedRevision:1,expectedDraftRevision:null,fields:{...preview.fields,title:'回收后仍有草稿'}});
  const unpublished=await f.client.call('draft.create',{deckId,initialType:'direct'}),unpublishedBefore=await f.client.call('draft.get',{deckId,cardId:unpublished.cardId});
  await f.client.call('card.batch.apply',{deckId,action:'delete',cards:[{cardId:c.cardId,expectedRevision:Number(f.ctx.db.prepare('SELECT revision FROM learning_cards WHERE id=?').get(c.cardId)!.revision)}]});
  const before=facts(f),prior=String(f.ctx.db.prepare('SELECT deleted_at FROM learning_cards WHERE id=?').get(c.cardId)!.deleted_at);
  await f.client.call('workspace.decks.batch',{action:'delete',decks:[{id:deckId,expectedRevision:revision(f,deckId)}]});
  assert.equal(f.ctx.db.prepare('SELECT count(*) AS n FROM learning_cards WHERE deck_id=? AND deleted_at IS NULL').get(deckId)!.n,0);
  const list=await f.client.call('workspace.recycle.decks',{deleted:true});assert.ok(list.items.some(d=>d.id===deckId));for(const [table,rows] of before as [string,unknown[]][]){const current=f.ctx.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();for(const row of rows)assert.ok(current.some(r=>JSON.stringify(r)===JSON.stringify(row)),table+' original fact changed');}
  await f.client.call('workspace.decks.batch',{action:'restore',decks:[{id:deckId,expectedRevision:revision(f,deckId)}]});
  for(const id of [a.cardId,b.cardId])assert.equal(f.ctx.db.prepare('SELECT deleted_at FROM learning_cards WHERE id=?').get(id)!.deleted_at,null);
  assert.equal(f.ctx.db.prepare('SELECT deleted_at FROM learning_cards WHERE id=?').get(c.cardId)!.deleted_at,prior);assert.equal((await f.client.call('draft.get',{deckId,cardId:b.cardId}))!.title,'回收后仍有草稿');assert.deepEqual(await f.client.call('draft.get',{deckId,cardId:unpublished.cardId}),unpublishedBefore);assert.deepEqual((await f.client.call('knowledge.cardLinks.get',{deckId,cardId:b.cardId})).nodeIds,[f.source.ids.child1]);const {validateUnifiedData}=await import('../electron/infrastructure/migrations/unified-integrity.ts');validateUnifiedData(f.ctx.db);for(const [table,rows] of before as [string,unknown[]][]){const current=f.ctx.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();for(const row of rows)assert.ok(current.some(r=>JSON.stringify(r)===JSON.stringify(row)),table+' original fact changed');}
 }finally{f.close();}
});
test('T41 deck batch rollback and stale revision prevent partial deletion or restoration',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const ids=[f.source.ids.qDeck,f.source.ids.mDeck],decks=ids.map(id=>({id,expectedRevision:revision(f,id)}));
  f.ctx.db.exec(`CREATE TRIGGER reject_deck_recycle BEFORE UPDATE OF deleted_at ON decks WHEN NEW.id='${ids[1]}' BEGIN SELECT RAISE(ABORT,'synthetic rollback'); END;`);
  await assert.rejects(()=>f.client.call('workspace.decks.batch',{action:'delete',decks}),(e:unknown)=>(e as {code:string}).code==='INTERNAL_ERROR');
  for(const d of decks){assert.equal(revision(f,d.id),d.expectedRevision);assert.equal(f.ctx.db.prepare('SELECT deleted_at FROM decks WHERE id=?').get(d.id)!.deleted_at,null);}
  f.ctx.db.exec('DROP TRIGGER reject_deck_recycle');
  await assert.rejects(()=>f.client.call('workspace.decks.batch',{action:'delete',decks:[{...decks[0]!,expectedRevision:999}]}),/状态已变化/);
  assert.equal((await f.client.call('workspace.recycle.decks',{deleted:false})).items.some(d=>d.id===ids[0]),true);
 }finally{f.close();}
});

test('T41 restore handles missing folder and duplicate name, and legacy deck entry uses unified lifecycle',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const folder=await f.client.call('workspace.catalog.save',{kind:'folder',name:'待删除文件夹',parentId:null});
  const deck=await f.client.call('workspace.catalog.save',{kind:'deck',name:'恢复冲突',parentId:folder.id});
  const card=await f.card('direct',deck.id);
  await f.client.call('catalog.deck.action',{id:deck.id,action:'delete'});assert.ok(f.ctx.db.prepare('SELECT deleted_at FROM learning_cards WHERE id=?').get(card.cardId)!.deleted_at);
  await f.client.call('catalog.folder.action',{id:folder.id,action:'delete',cascade:false});
  await f.client.call('workspace.catalog.save',{kind:'deck',name:'恢复冲突',parentId:null});
  await f.client.call('workspace.decks.batch',{action:'restore',decks:[{id:deck.id,expectedRevision:revision(f,deck.id)}]});
  const restored=f.ctx.db.prepare('SELECT name,folder_id FROM decks WHERE id=?').get(deck.id)!;assert.equal(restored.folder_id,null);assert.equal(restored.name,'恢复冲突（恢复）');
  assert.equal(f.ctx.db.prepare('SELECT deleted_at FROM learning_cards WHERE id=?').get(card.cardId)!.deleted_at,null);
 }finally{f.close();}
});
test('T41 deleting a deck with an unfinished review refuses atomically and preserves the review draft',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const c=await f.card('direct'),s=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId]});
  await assert.rejects(()=>f.client.call('workspace.decks.batch',{action:'delete',decks:[{id:c.deckId,expectedRevision:revision(f,c.deckId)}]}),(e:unknown)=>(e as {code:string}).code==='CARD_SESSION_ACTIVE');
  assert.equal(f.ctx.db.prepare('SELECT deleted_at FROM decks WHERE id=?').get(c.deckId)!.deleted_at,null);assert.deepEqual(await f.client.call('learning.session.get',{deckId:c.deckId,sessionId:s.sessionId}),s);
 }finally{f.close();}
});

test('T41 whole-deck recycle manifest and all media survive complete backup and staged restore',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const made=await f.client.call('workspace.catalog.save',{kind:'deck',name:'备份中的回收集',parentId:null}),c=await f.card('qa',made.id);
  await f.client.call('workspace.decks.batch',{action:'delete',decks:[{id:made.id,expectedRevision:revision(f,made.id)}]});
  const {createBackup,stageBackup}=await import('../electron/infrastructure/backup.ts'),{inspectDatabaseBaseline}=await import('../electron/infrastructure/migrations/baseline.ts'),{join}=await import('node:path');
  const before=inspectDatabaseBaseline(join(f.ctx.dataDir,'ganksoft.sqlite'),f.ctx.dataDir),archive=join(f.source.root,'recycle-backup.zip'),target=join(f.source.root,'recycle-restore');
  await createBackup(f.ctx.db,f.ctx.dataDir,archive);await stageBackup(archive,target);
  assert.deepEqual(inspectDatabaseBaseline(join(target,'ganksoft.sqlite'),target),before);
  const batch=JSON.parse(String(f.ctx.db.prepare("SELECT payload FROM recycle_batches WHERE kind='deck' AND item_id=?").get(made.id)!.payload));assert.deepEqual(batch.learning_cards,[c.cardId]);
  await f.client.call('workspace.decks.batch',{action:'restore',decks:[{id:made.id,expectedRevision:revision(f,made.id)}]});assert.equal((await f.client.call('card.getPublishedContent',{deckId:made.id,cardId:c.cardId})).versionId,c.publication.versionId);
 }finally{f.close();}
});
