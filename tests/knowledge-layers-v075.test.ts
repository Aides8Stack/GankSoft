import test from 'node:test';
import assert from 'node:assert/strict';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {seedLargeKnowledge} from './fixtures/large-knowledge.ts';
import {knowledgeView,type ViewNode} from '../shared/knowledge-view.ts';
const code=(name:string)=>(e:unknown)=>e instanceof Error&&'code'in e&&e.code===name;
test('T37 roots/children are bounded lean pages with sibling order and no bodies, hidden descendants or media',async()=>{
 const f=await unifiedWorkspaceFixture();try{const deckId=f.source.ids.qDeck,s=seedLargeKnowledge(f.ctx,deckId);
  const first=await f.client.call('knowledge.tree.layer',{deckId,parentId:null});assert.equal(first.nodes.length,50);assert.equal(first.totalNodes,s.added+4);assert.equal(first.totalChildren,132);assert.equal(first.nextOffset,50);assert.ok(JSON.stringify(first).length<15000);assert.doesNotMatch(JSON.stringify(first),/合成正文哨兵|markdown|assets|base64/);
  const ids=[...first.nodes.map(n=>n.nodeId)];let offset=first.nextOffset;
  while(offset!==null){const page=await f.client.call('knowledge.tree.layer',{deckId,parentId:null,expectedTreeHash:first.treeHash,offset});ids.push(...page.nodes.map(n=>n.nodeId));offset=page.nextOffset;}
  assert.equal(new Set(ids).size,132);assert.equal(ids.length,132);
  const children=await f.client.call('knowledge.tree.layer',{deckId,parentId:s.root,expectedTreeHash:first.treeHash});assert.equal(children.nodes.length,10);assert.ok(children.nodes.every(n=>n.childCount===9&&n.parentId===s.root));assert.deepEqual(children.nodes.map(n=>n.position),[0,1,2,3,4,5,6,7,8,9]);
  assert.ok(!first.nodes.some(n=>n.nodeId===s.leaf));
 }finally{f.close();}
});
test('T37 locate returns only an ancestor path, respects deck isolation and rejects revision changes between pages',async()=>{
 const f=await unifiedWorkspaceFixture();try{const deckId=f.source.ids.qDeck,s=seedLargeKnowledge(f.ctx,deckId),first=await f.client.call('knowledge.tree.layer',{deckId,parentId:null});
  const found=await f.client.call('knowledge.tree.locate',{deckId,query:'分层叶0-0-0',expectedTreeHash:first.treeHash});assert.deepEqual(found.path.map(n=>n.nodeId),[s.root,s.child,s.leaf]);assert.doesNotMatch(JSON.stringify(found),/合成正文哨兵|markdown|assets/);
  assert.equal((await f.client.call('knowledge.tree.locate',{deckId:f.source.ids.mDeck,query:'分层叶0-0-0'})).path.length,0);
  await assert.rejects(()=>f.client.call('knowledge.tree.layer',{deckId,parentId:f.source.ids.memoryNode}),code('DECK_CONFLICT'));
  await f.client.call('knowledge.node.save',{deckId,nodeId:s.leaf,expectedRevision:1,markdown:'合成新正文'});
  await assert.rejects(()=>f.client.call('knowledge.tree.layer',{deckId,parentId:s.root,expectedTreeHash:first.treeHash}),code('REVISION_CONFLICT'));
  await assert.rejects(()=>f.client.call('knowledge.tree.locate',{deckId,query:'分层叶',expectedTreeHash:first.treeHash}),code('REVISION_CONFLICT'));
  assert.notEqual((await f.client.call('knowledge.tree.layer',{deckId,parentId:null})).treeHash,first.treeHash);
 }finally{f.close();}
});
test('T37 full CAS edit preserves every hidden node and incomplete layer payload cannot silently delete descendants',async()=>{
 const f=await unifiedWorkspaceFixture();try{const deckId=f.source.ids.qDeck,s=seedLargeKnowledge(f.ctx,deckId),page=await f.client.call('knowledge.tree.layer',{deckId,parentId:null});
  await assert.rejects(()=>f.client.call('knowledge.tree.apply',{deckId,expectedTreeHash:page.treeHash,nodes:page.nodes.map(({childCount,revision,...n})=>n)}),code('SUBTREE_DELETE_REQUIRED'));
  const full=await f.client.call('knowledge.tree.read',{deckId});const applied=await f.client.call('knowledge.tree.apply',{deckId,expectedTreeHash:full.treeHash,nodes:full.nodes.map(({revision,...n})=>n.nodeId===s.root?{...n,name:'完整编辑根'}:n)});
  assert.equal(applied.nodes.length,s.added+4);assert.ok(applied.nodes.some(n=>n.nodeId===s.leaf));assert.match((await f.client.call('knowledge.node.read',{deckId,nodeId:s.leaf})).markdown,/合成正文哨兵/);f.reopen();assert.deepEqual(await f.client.call('knowledge.tree.read',{deckId}),applied);
 }finally{f.close();}
});
test('T37 linear view model keeps collapsed complete rows; lazy markers exist only in partial viewport data',()=>{
 const rows=Array.from({length:5000},(_,i)=>({id:'n'+i,name:'节点'+i,parent_id:i===0?null:'n'+Math.floor((i-1)/10)}));
 const full=knowledgeView(rows,{name:'合成',expanded:new Map()});const flat:ViewNode[]=[],stack=[full];while(stack.length){const n=stack.pop()!;flat.push(n);stack.push(...(n.children??[]));}assert.equal(flat.length,5001);assert.ok(flat.every(n=>!n.id.startsWith('gank-lazy:')));
 const partial=knowledgeView(rows.slice(0,1),{name:'合成',expanded:new Map(),partial:true,counts:new Map([['n0',10]]),pages:new Map([[null,null]])});assert.equal(partial.children?.[0].expanded,false);assert.equal(partial.children?.[0].children?.[0].lazyParent,'n0');assert.equal(partial.children?.length,1);
});
