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
  await assert.rejects(()=>f.client.call('knowledge.node.save',{...scope,expectedRevision:saved.revision,markdown:'![不能丢失的图片](gank-asset://x)'}),code('KNOWLEDGE_MEDIA_NOT_READY'));
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
