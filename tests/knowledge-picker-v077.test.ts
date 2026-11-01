import test from 'node:test';
import assert from 'node:assert/strict';
import {createKnowledgePicker,type PickerNode} from '../src/composables/knowledgePicker.ts';
const nodes:PickerNode[]=[{nodeId:'a',parentId:null,name:'甲',position:0},{nodeId:'b',parentId:'a',name:'同名',position:0},{nodeId:'c',parentId:'b',name:'孙',position:0},{nodeId:'d',parentId:null,name:'同名',position:1}];
const request={deckId:'deck1',initialSelectedIds:[] as string[],purpose:'association' as const,allowSelectDescendants:true};
const turn=()=>new Promise<void>(done=>setImmediate(done));
test('shared API confirmation is an ID copy; repeated click/empty confirmation are distinct from cancellation',async()=>{
 const p=createKnowledgePicker(async()=>nodes),initial=['a','a','foreign'];const done=p.open({...request,initialSelectedIds:initial});initial.push('d');await turn();assert.deepEqual([...p.state.selectedIds],['a']);p.toggle('a');p.toggle('b');p.toggle('b');p.confirm();assert.deepEqual(await done,{status:'confirmed',nodeIds:[]});assert.equal(p.state.request,null);assert.equal(p.state.selectedIds.size,0);
 const cancel=p.open(request);await turn();p.toggle('a');p.cancel();assert.deepEqual(await cancel,{status:'cancelled'});
});
test('ordinary parent selection does not select children; explicit subtree on/off preserves parent and unrelated IDs',async()=>{
 const p=createKnowledgePicker(async()=>nodes),done=p.open(request);await turn();p.toggle('a');p.toggle('d');assert.equal(p.state.selectedIds.size,2);p.subtree('a');assert.equal(p.state.selectedIds.size,4);p.subtree('a');assert.deepEqual([...p.state.selectedIds],['a','d']);p.confirm();assert.deepEqual(await done,{status:'confirmed',nodeIds:['a','d']});
});
test('descendant traversal handles malformed cycle without duplicates or selecting source',async()=>{
 const p=createKnowledgePicker(async()=>[...nodes.map(n=>n.nodeId==='a'?{...n,parentId:'c'}:n)]);const done=p.open(request);await turn();assert.deepEqual(p.descendants('a'),['b','c']);p.subtree('a');assert.equal(p.state.selectedIds.size,2);p.cancel();await done;
});
test('concurrent open rejects without replacing first resolver; caller cancellation is scoped',async()=>{
 const p=createKnowledgePicker(async()=>nodes),first=Symbol(),other=Symbol(),done=p.open(request,first);await assert.rejects(p.open({...request,deckId:'deck2'},other),/已打开/);p.cancel(other);assert.equal(p.state.request?.deckId,'deck1');p.cancel(first);assert.deepEqual(await done,{status:'cancelled'});
});
test('late load after cancellation/deck change never leaks nodes or selected IDs into next session',async()=>{
 let release!:(nodes:PickerNode[])=>void;const p=createKnowledgePicker(deck=>deck==='deck1'?new Promise(done=>release=done):Promise.resolve([{nodeId:'second',parentId:null,name:'乙',position:0}]));
 const old=p.open({...request,initialSelectedIds:['a']});p.cancel();assert.deepEqual(await old,{status:'cancelled'});const next=p.open({...request,deckId:'deck2',initialSelectedIds:['second']});await turn();release(nodes);await turn();assert.deepEqual(p.state.nodes.map(n=>n.nodeId),['second']);assert.deepEqual([...p.state.selectedIds],['second']);p.confirm();assert.deepEqual(await next,{status:'confirmed',nodeIds:['second']});
});
test('loading failure cannot confirm empty success; retry reuses same isolated request',async()=>{
 let fail=true;const p=createKnowledgePicker(async()=>{if(fail)throw Error('offline');return nodes;});const done=p.open({...request,initialSelectedIds:['b']});await turn();assert.match(p.state.error,/offline/);p.confirm();assert.ok(p.state.request);fail=false;await p.retry();assert.equal(p.state.error,'');p.confirm();assert.deepEqual(await done,{status:'confirmed',nodeIds:['b']});
});
test('pending load cannot confirm or mutate; cancellation prevents late rejected load from poisoning next open',async()=>{
 let reject!:(e:Error)=>void;const p=createKnowledgePicker(()=>new Promise((_,r)=>reject=r));const done=p.open(request);p.toggle('a');p.confirm();assert.ok(p.state.request);p.cancel();reject(Error('late failure'));await turn();assert.equal(p.state.error,'');assert.deepEqual(await done,{status:'cancelled'});
});
test('subtree permission and invalid node IDs cannot create phantom associations',async()=>{
 const p=createKnowledgePicker(async()=>nodes),done=p.open({...request,allowSelectDescendants:false});await turn();p.toggle('gank-root');p.toggle('foreign');p.subtree('a');assert.equal(p.state.selectedIds.size,0);p.cancel();await done;
});
