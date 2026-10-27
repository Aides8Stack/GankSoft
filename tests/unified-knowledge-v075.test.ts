import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { unifiedWorkspaceFixture } from './fixtures/unified-workspace.ts';
import { schema604Fixture } from './fixtures/v075-schema604.ts';
import { Application } from '../electron/application.ts';
import { createApplicationProtocol } from '../electron/protocol/gateway.ts';
import { createClient } from '../shared/protocol/client.ts';
import { validateUnifiedData } from '../electron/infrastructure/migrations/unified-integrity.ts';
import { createBackup, stageBackup } from '../electron/infrastructure/backup.ts';
const code=(name:string)=>(e:unknown)=>e instanceof Error&&'code' in e&&e.code===name;
type Fixture=Awaited<ReturnType<typeof unifiedWorkspaceFixture>>;
const tree=(f:Fixture)=>f.client.call('knowledge.tree.read',{deckId:f.source.ids.qDeck});
async function add(f:Fixture,parentId:string|null=null,name?:string){const t=await tree(f);return f.client.call('knowledge.node.create',{deckId:t.deckId,expectedTreeHash:t.treeHash,parentId,...(name?{name}:{})});}
test('T23 multiple real roots, scoped default numbers, stable identities, duplicate names and foreign parents',async()=>{
 const f=await unifiedWorkspaceFixture();try {
  const a=await add(f),b=await add(f);assert.equal(a.name,'新知识点1');assert.equal(b.name,'新知识点2');assert.equal(a.parentId,null);assert.notEqual(a.nodeId,b.nodeId);
  const child=await add(f,a.nodeId);assert.equal(child.name,'新知识点1');
  const t=await tree(f);assert.equal(t.nodes.some(n=>n.nodeId==='gank-root'),false);assert.equal('markdown' in t.nodes[0],false);
  await assert.rejects(()=>f.client.call('knowledge.node.create',{deckId:t.deckId,expectedTreeHash:t.treeHash,parentId:null,name:a.name}),code('TREE_CONFLICT'));
  await assert.rejects(()=>f.client.call('knowledge.node.create',{deckId:t.deckId,expectedTreeHash:t.treeHash,parentId:f.source.ids.memoryNode}),code('DECK_CONFLICT'));
  await assert.rejects(()=>f.client.call('knowledge.node.create',{deckId:t.deckId,expectedTreeHash:'0'.repeat(64),parentId:null}),code('REVISION_CONFLICT'));
  validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
test('T24 reorder and reparent use complete CAS, preserve sibling order after reopen and reject cycles/cross-deck IDs',async()=>{
 const f=await unifiedWorkspaceFixture();try {
  const a=await add(f,null,'顺序甲'),b=await add(f,null,'顺序乙'),child=await add(f,a.nodeId,'子节点');
  let t=await tree(f);
  const nodes=t.nodes.map(({revision,...n})=>n.nodeId===child.nodeId?{...n,parentId:b.nodeId,position:0}:n.nodeId===a.nodeId?{...n,position:b.position}:n.nodeId===b.nodeId?{...n,position:a.position}:n);
  const applied=await f.client.call('knowledge.tree.apply',{deckId:t.deckId,expectedTreeHash:t.treeHash,nodes});
  f.reopen();assert.deepEqual(await tree(f),applied);assert.equal((await f.client.call('knowledge.node.read',{deckId:t.deckId,nodeId:child.nodeId})).parentId,b.nodeId);
  t=await tree(f);const before=JSON.stringify(t);
  await assert.rejects(()=>f.client.call('knowledge.tree.apply',{deckId:t.deckId,expectedTreeHash:t.treeHash,nodes:t.nodes.map(({revision,...n})=>n.nodeId===b.nodeId?{...n,parentId:child.nodeId,position:0}:n)}));
  assert.equal(JSON.stringify(await tree(f)),before);
  await assert.rejects(()=>f.client.call('knowledge.tree.apply',{deckId:t.deckId,expectedTreeHash:t.treeHash,nodes:[...t.nodes.map(({revision,...n})=>n),{nodeId:f.source.ids.memoryNode,name:'越界',parentId:null,position:t.nodes.filter(n=>!n.parentId).length}]}),code('DECK_CONFLICT'));
  validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
test('T24 child-before-parent request is topologically applied, synthetic failure rolls back tree and receipt atomically',async()=>{
 const f=await unifiedWorkspaceFixture();try {
  const t=await tree(f),parent=randomUUID(),child=randomUUID(),nodes=[...t.nodes.map(({revision,...n})=>n),{nodeId:child,name:'后父先子',parentId:parent,position:0},{nodeId:parent,name:'新根',parentId:null,position:t.nodes.filter(n=>!n.parentId).length}];
  const req=f.client.prepare('knowledge.tree.apply',{deckId:t.deckId,expectedTreeHash:t.treeHash,nodes});
  f.ctx.db.exec("CREATE TEMP TRIGGER reject_tree_receipt BEFORE INSERT ON protocol_receipts WHEN NEW.method='knowledge.tree.apply' BEGIN SELECT RAISE(ABORT,'synthetic tree receipt failure'); END");
  await assert.rejects(()=>f.client.send(req));assert.deepEqual(await tree(f),t);assert.equal(f.ctx.db.prepare('SELECT 1 FROM knowledge WHERE id=?').get(parent),undefined);
  f.ctx.db.exec('DROP TRIGGER reject_tree_receipt');const result=await f.client.send(req);assert.deepEqual(await f.client.send(req),result);assert.equal(result.nodes.find(n=>n.nodeId===child)!.parentId,parent);
 }finally{f.close();}
});
test('S5 Markdown saves are revision guarded, preserve legacy facts, reject untracked images and survive restart/backup',async()=>{
 const f=await unifiedWorkspaceFixture();try {
  const scope={deckId:f.source.ids.qDeck,nodeId:f.source.ids.root1},initial=await f.client.call('knowledge.node.read',scope);
  assert.match(initial.markdown,/原理/);const original=f.ctx.db.prepare('SELECT principle FROM knowledge WHERE id=?').get(scope.nodeId)!.principle;
  const saved=await f.client.call('knowledge.node.save',{...scope,expectedRevision:initial.revision,markdown:'# 正文中的标题\n\n$E=mc^2$\n\n```ts\nconst n=1\n```'});
  await assert.rejects(()=>f.client.call('knowledge.node.save',{...scope,expectedRevision:initial.revision,markdown:'过期覆盖'}),code('REVISION_CONFLICT'));
  await assert.rejects(()=>f.client.call('knowledge.node.save',{...scope,expectedRevision:saved.revision,markdown:'![不能丢失的图片](gank-asset://x)'}),code('MEDIA_REFERENCE_INVALID'));
  assert.equal(f.ctx.db.prepare('SELECT principle FROM knowledge WHERE id=?').get(scope.nodeId)!.principle,original);
  f.reopen();assert.deepEqual(await f.client.call('knowledge.node.read',scope),saved);
  const archive=join(f.source.root,'s5-backup.zip');await createBackup(f.ctx.db,f.ctx.dataDir,archive);const restored=join(f.source.root,'s5-restored');await stageBackup(archive,restored);
  const db=new DatabaseSync(join(restored,'ganksoft.sqlite'));try{validateUnifiedData(db);assert.match(String(db.prepare('SELECT value FROM settings WHERE key=?').get('unified-knowledge-body:'+scope.nodeId)!.value),/正文中的标题/);}finally{db.close();}
 }finally{f.close();}
});
test('T27 native card relations serve publish, prompt, review snapshots, current mastery and queue without fake carriers',async()=>{
 const f=await unifiedWorkspaceFixture();try {
  const root=await add(f,null,'原生根'),a=await add(f,root.nodeId,'甲'),b=await add(f,root.nodeId,'乙');
  const made=await f.card('direct'),card={cardId:made.cardId,deckId:made.deckId};
  const initial=await f.client.call('knowledge.cardLinks.get',card);assert.equal(initial.revision,0);
  const links=await f.client.call('knowledge.cardLinks.set',{...card,nodeIds:[a.nodeId,b.nodeId],expectedRevision:0});assert.equal(links.revision,1);
  assert.equal(f.ctx.db.prepare('SELECT 1 FROM questions WHERE id=?').get(card.cardId),undefined);assert.equal(f.ctx.db.prepare('SELECT 1 FROM memory_cards WHERE id=?').get(card.cardId),undefined);
  const prompt=await f.client.call('card.getPromptContext',card);assert.equal(prompt.confirmed.length,2);
  const queue=await f.client.call('learning.queue.preview',{deckId:card.deckId,filters:{knowledge:[root.nodeId]},selectedIds:[card.cardId]});assert.equal(queue.due[0].cardId,card.cardId);
  let s=await f.client.call('learning.session.open',{deckId:card.deckId,cardIds:[card.cardId]});const frozen=structuredClone(s.entry.knowledge);
  s=await f.client.call('learning.session.change',{deckId:card.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:90}});
  const e=await f.client.call('learning.review.submit',{deckId:card.deckId,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:90,faults:[],gaps:'',reflection:'',practice:false});
  const aggregate=await f.client.call('learning.mastery.knowledge',{deckId:card.deckId,nodeId:root.nodeId,scope:'aggregate'});assert.deepEqual(aggregate.cardIds,[card.cardId]);assert.equal(aggregate.distinctCards,1);
  await f.client.call('knowledge.cardLinks.set',{...card,nodeIds:[],expectedRevision:links.revision});assert.deepEqual((await f.client.call('learning.mastery.knowledge',{deckId:card.deckId,nodeId:root.nodeId,scope:'aggregate'})).cardIds,[]);
  assert.deepEqual((await f.client.call('learning.history.get',{...card,eventId:e.eventId})).native!.knowledge,frozen);
  await assert.rejects(()=>f.client.call('knowledge.cardLinks.set',{...card,nodeIds:[a.nodeId],expectedRevision:links.revision}),code('REVISION_CONFLICT'));
  validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
test('S5 first native publication can attach confirmed nodes atomically; cross-deck links and receipt failure retain the draft',async()=>{
 const f=await unifiedWorkspaceFixture();try {
  const node=await add(f),d=await f.client.call('draft.create',{deckId:node.deckId,initialType:'direct'}),scope={cardId:d.cardId,deckId:node.deckId};
  const saved=await f.client.call('draft.save',{...scope,expectedPublishedRevision:0,expectedDraftRevision:1,fields:{title:'含原生关联的首次发布',payload:{encoding:'direct-v1',mode:'direct',fields:{body:'合成正文',source:''}},mediaRefs:[]}});
  const input={...scope,expectedPublishedRevision:0,expectedDraftRevision:saved.revision,resetStudyCycle:false};
  await assert.rejects(()=>f.client.call('card.publish',{...input,knowledgeIds:[f.source.ids.memoryNode]}),code('INVALID_KNOWLEDGE_SCOPE'));
  const req=f.client.prepare('card.publish',{...input,knowledgeIds:[node.nodeId]});
  f.ctx.db.exec("CREATE TEMP TRIGGER reject_link_receipt BEFORE INSERT ON protocol_receipts WHEN NEW.method='card.publish' BEGIN SELECT RAISE(ABORT,'synthetic linked publish receipt failure'); END");
  await assert.rejects(()=>f.client.send(req));assert.equal(f.ctx.db.prepare('SELECT 1 FROM learning_cards WHERE id=?').get(d.cardId),undefined);assert.ok(await f.client.call('draft.get',scope));
  f.ctx.db.exec('DROP TRIGGER reject_link_receipt');await f.client.send(req);assert.deepEqual((await f.client.call('knowledge.cardLinks.get',scope)).nodeIds,[node.nodeId]);
  assert.equal((await f.client.call('card.listSummary',{deckId:node.deckId,filters:{}})).items.find(c=>c.cardId===d.cardId)!.knowledgeCount,1);validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
test('S5 typed tree ownership fences old destructive editors and rejects production604',async()=>{
 const f=await unifiedWorkspaceFixture();try {
  await add(f);const app=new Application(f.ctx);
  assert.throws(()=>app.handle('knowledge.merge',{source_id:f.source.ids.child1,target_id:f.source.ids.child2}),code('LEGACY_KNOWLEDGE_OWNER_CONFLICT'));
 }finally{f.close();}
 const old=schema604Fixture();try{const host=createApplicationProtocol(new Application({db:old.db,dataDir:old.dataDir,now:()=>new Date(old.at)})),c=createClient(r=>host.execute(r));await c.call('app.capabilities',{});await assert.rejects(()=>c.call('knowledge.tree.read',{deckId:old.ids.qDeck}));}finally{old.close();}
});
test('T26 merge previews default to keep, use explicit body policies, deduplicate live links and never rewrite historical faults/events',async()=>{
 for(const policy of ['keep','replace','append'] as const){
  const f=await unifiedWorkspaceFixture();try {
   const source=await add(f,null,'待合并'),target=await add(f,null,'合并目标'),child=await add(f,source.nodeId,'需迁移子节点');
   const s=await f.client.call('knowledge.node.save',{deckId:source.deckId,nodeId:source.nodeId,expectedRevision:source.revision,markdown:'来源正文'});
   const t=await f.client.call('knowledge.node.save',{deckId:target.deckId,nodeId:target.nodeId,expectedRevision:target.revision,markdown:'目标正文'});
   const made=await f.card('direct'),card={cardId:made.cardId,deckId:made.deckId};await f.client.call('knowledge.cardLinks.set',{...card,nodeIds:[source.nodeId,target.nodeId],expectedRevision:0});
   const events=JSON.stringify(f.ctx.db.prepare('SELECT * FROM learning_review_events ORDER BY id').all()),faults=JSON.stringify(f.ctx.db.prepare('SELECT * FROM attempt_faults ORDER BY id').all());
   const preview=await f.client.call('knowledge.merge.preview',{deckId:source.deckId,sourceId:source.nodeId,targetId:target.nodeId,bodyPolicy:policy});
   assert.deepEqual(preview.conflicts,[]);assert.equal(preview.children,1);assert.equal(preview.linkedCards,1);assert.ok(preview.previewToken);
   assert.equal((await f.client.call('knowledge.node.read',{deckId:source.deckId,nodeId:source.nodeId})).markdown,'来源正文');
   const req=f.client.prepare('knowledge.merge.confirm',{previewToken:preview.previewToken!});const result=await f.client.send(req);assert.deepEqual(await f.client.send(req),result);
   assert.equal(result.nodes.some(n=>n.nodeId===source.nodeId),false);assert.equal(result.nodes.find(n=>n.nodeId===child.nodeId)!.parentId,target.nodeId);
   assert.deepEqual((await f.client.call('knowledge.cardLinks.get',card)).nodeIds,[target.nodeId]);
   const body=(await f.client.call('knowledge.node.read',{deckId:source.deckId,nodeId:target.nodeId})).markdown;assert.equal(body,policy==='keep'?'目标正文':policy==='replace'?'来源正文':'目标正文\n\n来源正文');
   assert.equal(JSON.stringify(f.ctx.db.prepare('SELECT * FROM learning_review_events ORDER BY id').all()),events);assert.equal(JSON.stringify(f.ctx.db.prepare('SELECT * FROM attempt_faults ORDER BY id').all()),faults);
   const recycle=await f.client.call('knowledge.recycle.list',{deckId:source.deckId});assert.equal(recycle[0].mergedInto,target.nodeId);assert.equal(recycle[0].count,1);validateUnifiedData(f.ctx.db);
  }finally{f.close();}
 }
});
test('T26 merge rejects descendant/colliding children and stale scopes; receipt failure rolls back every mutation',async()=>{
 const f=await unifiedWorkspaceFixture();try {
  const source=await add(f,null,'源'),target=await add(f,null,'目标'),child=await add(f,source.nodeId,'子');
  let p=await f.client.call('knowledge.merge.preview',{deckId:source.deckId,sourceId:source.nodeId,targetId:child.nodeId});assert.equal(p.previewToken,null);assert.ok(p.conflicts.length);
  await add(f,target.nodeId,'子');p=await f.client.call('knowledge.merge.preview',{deckId:source.deckId,sourceId:source.nodeId,targetId:target.nodeId});assert.equal(p.previewToken,null);
  const other=await add(f,null,'无冲突目标');p=await f.client.call('knowledge.merge.preview',{deckId:source.deckId,sourceId:source.nodeId,targetId:other.nodeId});
  await f.client.call('knowledge.node.save',{deckId:source.deckId,nodeId:source.nodeId,expectedRevision:(await f.client.call('knowledge.node.read',{deckId:source.deckId,nodeId:source.nodeId})).revision,markdown:'已变更'});
  await assert.rejects(()=>f.client.call('knowledge.merge.confirm',{previewToken:p.previewToken!}),code('PREVIEW_STALE'));
  p=await f.client.call('knowledge.merge.preview',{deckId:source.deckId,sourceId:source.nodeId,targetId:other.nodeId});const before=await tree(f),req=f.client.prepare('knowledge.merge.confirm',{previewToken:p.previewToken!});
  f.ctx.db.exec("CREATE TEMP TRIGGER reject_merge_receipt BEFORE INSERT ON protocol_receipts WHEN NEW.method='knowledge.merge.confirm' BEGIN SELECT RAISE(ABORT,'synthetic merge receipt failure'); END");
  await assert.rejects(()=>f.client.send(req));assert.deepEqual(await tree(f),before);assert.equal((await f.client.call('knowledge.recycle.list',{deckId:source.deckId})).length,0);
  f.ctx.db.exec('DROP TRIGGER reject_merge_receipt');await f.client.send(req);validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
test('T26 complete subtree soft delete hides current evidence but restores original IDs, links, body and sibling order',async()=>{
 const f=await unifiedWorkspaceFixture();try {
  const root=await add(f,null,'整棵子树'),a=await add(f,root.nodeId,'甲'),b=await add(f,root.nodeId,'乙');
  await f.client.call('knowledge.node.save',{deckId:a.deckId,nodeId:a.nodeId,expectedRevision:a.revision,markdown:'必须恢复的正文'});
  const made=await f.card('direct'),card={cardId:made.cardId,deckId:made.deckId};await f.client.call('knowledge.cardLinks.set',{...card,nodeIds:[a.nodeId,b.nodeId],expectedRevision:0});
  let t=await tree(f);const expected=t.nodes.filter(n=>[root.nodeId,a.nodeId,b.nodeId].includes(n.nodeId)).map(n=>({id:n.nodeId,parent:n.parentId,position:n.position}));
  const d=await f.client.call('knowledge.subtree.delete',{deckId:t.deckId,nodeId:root.nodeId,expectedTreeHash:t.treeHash});assert.equal(d.count,3);
  assert.equal((await tree(f)).nodes.some(n=>n.nodeId===a.nodeId),false);assert.equal((await f.client.call('card.getPromptContext',card)).confirmed.length,0);
  f.reopen();const p=await f.client.call('knowledge.restore.preview',{deckId:t.deckId,batchId:d.batchId});assert.deepEqual(p.conflicts,[]);assert.ok(p.previewToken);
  const restored=await f.client.call('knowledge.restore.confirm',{previewToken:p.previewToken!});assert.deepEqual(restored.nodes.filter(n=>[root.nodeId,a.nodeId,b.nodeId].includes(n.nodeId)).map(n=>({id:n.nodeId,parent:n.parentId,position:n.position})),expected);
  assert.equal((await f.client.call('knowledge.node.read',{deckId:a.deckId,nodeId:a.nodeId})).markdown,'必须恢复的正文');assert.equal((await f.client.call('card.getPromptContext',card)).confirmed.length,2);validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
test('T26 restore missing parent/name collisions needs explicit remount or rename, cancel is read-only and receipt failure is atomic',async()=>{
 const f=await unifiedWorkspaceFixture();try {
  const root=await add(f,null,'原父'),child=await add(f,root.nodeId,'待恢复');let t=await tree(f);
  const deleted=await f.client.call('knowledge.subtree.delete',{deckId:t.deckId,nodeId:child.nodeId,expectedTreeHash:t.treeHash});t=await tree(f);
  await f.client.call('knowledge.subtree.delete',{deckId:t.deckId,nodeId:root.nodeId,expectedTreeHash:t.treeHash});
  let p=await f.client.call('knowledge.restore.preview',{deckId:t.deckId,batchId:deleted.batchId});assert.equal(p.previewToken,null);assert.ok(p.conflicts.some(c=>c.includes('父节点')));
  await add(f,null,'待恢复');p=await f.client.call('knowledge.restore.preview',{deckId:t.deckId,batchId:deleted.batchId,parentId:null});assert.equal(p.previewToken,null);
  const before=await tree(f);p=await f.client.call('knowledge.restore.preview',{deckId:t.deckId,batchId:deleted.batchId,parentId:null,rootName:'恢复后新名'});assert.deepEqual(await tree(f),before);
  const req=f.client.prepare('knowledge.restore.confirm',{previewToken:p.previewToken!});f.ctx.db.exec("CREATE TEMP TRIGGER reject_restore_receipt BEFORE INSERT ON protocol_receipts WHEN NEW.method='knowledge.restore.confirm' BEGIN SELECT RAISE(ABORT,'synthetic restore receipt failure'); END");
  await assert.rejects(()=>f.client.send(req));assert.deepEqual(await tree(f),before);f.ctx.db.exec('DROP TRIGGER reject_restore_receipt');
  const result=await f.client.send(req);assert.equal(result.nodes.find(n=>n.nodeId===child.nodeId)!.name,'恢复后新名');assert.equal(result.nodes.find(n=>n.nodeId===child.nodeId)!.parentId,null);validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
