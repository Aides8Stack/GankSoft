import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {registry} from '../shared/protocol/registry.ts';
const code=(value:string)=>(e:unknown)=>(e as {code?:string}).code===value;
function snapshot(f:Awaited<ReturnType<typeof unifiedWorkspaceFixture>>){return {tables:Object.fromEntries(f.ctx.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row=>{const name=String(row.name);return [name,f.ctx.db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()];})),files:Object.fromEntries(readdirSync(join(f.ctx.dataDir,'attachments')).map(n=>[n,createHash('sha256').update(readFileSync(join(f.ctx.dataDir,'attachments',n))).digest('hex')]))};}
test('native606 preview covers mixed cards, versions/cycles/events and is exact zero-write; stale/crossdeck/duplicate rejected',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const cards=await Promise.all([f.card('question'),f.card('qa'),f.card('direct')]),deckId=cards[0].deckId;
  await f.client.call('card.batch.apply',{deckId,action:'delete',cards:cards.map(c=>({cardId:c.cardId,expectedRevision:1}))});
  const p={kind:'cards' as const,deckId,cards:cards.map(c=>({cardId:c.cardId,expectedRevision:2}))},before=snapshot(f),changes=f.ctx.db.prepare('SELECT total_changes() AS n').get()!.n;
  const view=await f.client.call('recycle.native.preview',p);assert.equal(view.counts.cards,3);assert.equal(view.counts.versions,3);assert.equal(view.counts.cycles,3);assert.equal(view.execution,'blocked');assert.equal(view.filePolicy,'retain-all');assert.equal(view.objects.length,3);assert.match(view.blockers.join(' '),/不可变/);assert.equal(f.ctx.db.prepare('SELECT total_changes() AS n').get()!.n,changes);assert.deepEqual(snapshot(f),before);assert.deepEqual(await f.client.call('recycle.native.preview',p),view);
  await assert.rejects(()=>f.client.call('recycle.native.preview',{...p,cards:[{cardId:cards[0].cardId,expectedRevision:1}]}),code('REVISION_CONFLICT'));
  await assert.rejects(()=>f.client.call('recycle.native.preview',{...p,deckId:f.source.ids.mDeck}),code('REVISION_CONFLICT'));
  await assert.rejects(()=>f.client.call('recycle.native.preview',{...p,cards:[p.cards[0],p.cards[0]]}));
  await f.client.call('card.recycle.restore',{deckId,cards:p.cards});await assert.rejects(()=>f.client.call('recycle.native.preview',p),code('REVISION_CONFLICT'));
  assert.equal('recycle.native.purge' in registry,false);f.reopen();
 }finally{f.close();}
});
test('knowledge recycle preview validates batch ownership/revisions, retains body/links/files, restores without purge',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const deckId=f.source.ids.qDeck,tree=await f.client.call('knowledge.tree.read',{deckId}),node=tree.nodes.find(n=>n.nodeId===f.source.ids.child1)!;
  const batch=await f.client.call('knowledge.subtree.delete',{deckId,nodeId:node.nodeId,expectedTreeHash:tree.treeHash}),p={kind:'knowledge' as const,deckId,batchId:batch.batchId},before=snapshot(f);
  const view=await f.client.call('recycle.native.preview',p);assert.equal(view.counts.knowledge,batch.count);assert.ok(view.objects.every(o=>o.kind==='knowledge'));assert.match(view.blockers.join(' '),/永久处置/);assert.deepEqual(snapshot(f),before);
  await assert.rejects(()=>f.client.call('recycle.native.preview',{...p,deckId:f.source.ids.mDeck}),code('DECK_CONFLICT'));
  const preview=await f.client.call('knowledge.restore.preview',{deckId,batchId:batch.batchId});assert.ok(preview.previewToken);await f.client.call('knowledge.restore.confirm',{previewToken:preview.previewToken!});await assert.rejects(()=>f.client.call('recycle.native.preview',p),code('RECYCLE_NOT_FOUND'));
 }finally{f.close();}
});
test('deleted deck preview includes native and legacy-backed cards and knowledge; concurrent restore invalidates scope',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const card=await f.card('direct'),deckId=card.deckId,revision=Number(f.ctx.db.prepare('SELECT version FROM decks WHERE id=?').get(deckId)!.version);
  const unpublished=await f.client.call('draft.create',{deckId,initialType:'qa'});
  await f.client.call('workspace.decks.batch',{action:'delete',decks:[{id:deckId,expectedRevision:revision}]});
  const row=(await f.client.call('workspace.recycle.decks',{deleted:true})).items.find(d=>d.id===deckId)!,p={kind:'deck' as const,deckId,expectedRevision:row.revision},before=snapshot(f);
  const view=await f.client.call('recycle.native.preview',p);assert.ok(view.counts.cards>=2);assert.ok(view.counts.knowledge>0);assert.ok(view.counts.events>0);assert.ok(view.objects.some(o=>o.id===card.cardId));assert.equal(view.counts.newDrafts,1);assert.ok(view.objects.some(o=>o.kind==='draft'&&o.id===unpublished.cardId));assert.deepEqual(snapshot(f),before);
  await f.client.call('workspace.decks.batch',{action:'restore',decks:[{id:deckId,expectedRevision:row.revision}]});await assert.rejects(()=>f.client.call('recycle.native.preview',p),code('REVISION_CONFLICT'));assert.deepEqual(f.ctx.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{f.close();}
});
