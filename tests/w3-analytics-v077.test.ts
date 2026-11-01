import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {freshFixture,publishFresh} from './fixtures/fresh-production.ts';
type F=Awaited<ReturnType<typeof freshFixture>>;
async function review(f:F,c:{cardId:string;deckId:string},score:number,correct?:boolean){
 let s=await f.client.call('learning.session.open',{deckId:c.deckId,cardIds:[c.cardId],practice:false});
 if(s.stage==='answer')s=await f.client.call('learning.session.change',{deckId:c.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'reveal',draft:{...s.draft,selectedOptionId:correct?'a':'b',thought:'独立思路'}});
 s=await f.client.call('learning.session.change',{deckId:c.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:score,...(correct!==undefined?{selectedOptionId:correct?'a':'b',thought:'独立思路'}:{})}});
 return f.client.call('learning.review.submit',{deckId:c.deckId,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:score,practice:false,faults:[],gaps:'',reflection:''});
}
async function seed(){const f=await freshFixture(),d=await f.client.call('workspace.catalog.save',{kind:'deck',name:'W3独立合成',parentId:null});return {f,deckId:d.id};}
test('W3-01 real events: zero learning, mixed types, null objective denominator, score mean and current mastery',async()=>{
 const {f,deckId}=await seed();try{
 const a=await publishFresh(f.client,'direct',deckId),b=await publishFresh(f.client,'qa',deckId),q=await publishFresh(f.client,'question',deckId);
 let p=await f.client.call('workspace.analytics.grouped',{deckId,dimension:'card',date:{range:'all'}});
 assert.equal(p.summary.eventCount,0);assert.equal(p.summary.averageScoreTenths,null);assert.equal(p.summary.objectiveCount,0);assert.ok(p.items.every(i=>i.status==='pending'));
 await review(f,a,80);await review(f,a,60);await review(f,q,90,true);await review(f,q,30,false);
 p=await f.client.call('workspace.analytics.grouped',{deckId,dimension:'card',date:{range:'all'}});
 assert.equal(p.summary.cardCount,3);assert.deepEqual(p.summary.cardsByMode,{question:1,qa:1,direct:1});assert.equal(p.summary.eventCount,4);assert.equal(p.summary.gradedCount,4);assert.equal(p.summary.averageScoreTenths,65);assert.equal(p.summary.objectiveCount,2);assert.equal(p.summary.correctCount,1);
 const row=p.items.find(i=>i.id===a.cardId)!;assert.equal(row.eventCount,2);assert.equal(row.latestScoreTenths,60);assert.equal(row.averageScoreTenths,70);assert.equal(row.objectiveCount,0);assert.equal(p.items.find(i=>i.id===b.cardId)!.status,'pending');
 assert.equal(row.status,(await f.client.call('learning.mastery.card',a)).status);assert.equal(row.fsrsState,JSON.parse(String(f.ctx.db.prepare('SELECT data FROM scheduling WHERE card_id=?').get(a.cardId)!.data)).state);
 assert.doesNotMatch(JSON.stringify(p),/reflection|legacyRaw|payload|mediaRefs/);
 }finally{f.close();}
});
test('W3-02 7/30/90/all, timezone midnight and historical range independent of current due',async()=>{
 const {f,deckId}=await seed();try{f.ctx.db.prepare("INSERT INTO settings VALUES('studyTimezone','Asia/Shanghai') ON CONFLICT(key) DO UPDATE SET value=excluded.value").run();const c=await publishFresh(f.client,'direct',deckId);await review(f,c,80);
 const base=f.ctx.now();const event=JSON.parse(String(f.ctx.db.prepare('SELECT document FROM learning_review_events WHERE card_id=?').get(c.cardId)!.document));
 for(const days of [0,6,7,29,30,89,90]){const e={...event,eventId:'w3-date-'+days,createdAt:new Date(+base-days*86400000).toISOString()};f.ctx.db.prepare('INSERT INTO learning_review_events VALUES(?,?,?,?,?,?,?)').run(e.eventId,c.cardId,e.contentVersionId,e.cycleId,e.mode,e.createdAt,JSON.stringify(e));}
 const expected=[['7',3],['30',5],['90',7],['all',8]] as const;
 let due:number|undefined;for(const [range,n] of expected){const p=await f.client.call('workspace.analytics.grouped',{deckId,dimension:'card',date:{range}});assert.equal(p.summary.eventCount,n);due??=p.summary.dueCount;assert.equal(p.summary.dueCount,due);}
 const e={...event,eventId:'w3-midnight',createdAt:'2026-10-18T16:01:00.000Z'};f.ctx.db.prepare('INSERT INTO learning_review_events VALUES(?,?,?,?,?,?,?)').run(e.eventId,c.cardId,e.contentVersionId,e.cycleId,e.mode,e.createdAt,JSON.stringify(e));
 const local=await f.client.call('workspace.analytics.grouped',{deckId,dimension:'card',date:{range:'custom',start:'2026-10-19',end:'2026-10-19'}});assert.ok(local.trend.some(d=>d.day==='2026-10-19'));assert.equal(local.summary.dueCount,due);
 }finally{f.close();}
});
test('W3-03 direct/aggregate parent-child overlap card/event dedup and existing mastery agreement',async()=>{
 const {f,deckId}=await seed();try{const a=await publishFresh(f.client,'direct',deckId),b=await publishFresh(f.client,'qa',deckId);await review(f,a,80);await review(f,b,60);
 let t=await f.client.call('knowledge.tree.read',{deckId});for(const [id,parentId] of [['parent',null],['child','parent'],['sibling','parent']] as const){await f.client.call('knowledge.node.create',{deckId,expectedTreeHash:t.treeHash,parentId:parentId?t.nodes.find(n=>n.name===parentId)!.nodeId:null,name:id});t=await f.client.call('knowledge.tree.read',{deckId});}
 const ids=Object.fromEntries(t.nodes.map(n=>[n.name,n.nodeId]));await f.client.call('knowledge.cardLinks.set',{cardId:a.cardId,deckId,expectedRevision:0,nodeIds:[ids.parent,ids.child,ids.sibling]});await f.client.call('knowledge.cardLinks.set',{cardId:b.cardId,deckId,expectedRevision:0,nodeIds:[ids.child]});
 const agg=await f.client.call('workspace.analytics.grouped',{deckId,dimension:'knowledge',date:{range:'all'},scope:'aggregate'}),direct=await f.client.call('workspace.analytics.grouped',{deckId,dimension:'knowledge',date:{range:'all'},scope:'direct'});
 assert.equal(agg.summary.eventCount,2);assert.equal(agg.items.find(i=>i.id===ids.parent)!.eventCount,2);assert.equal(direct.items.find(i=>i.id===ids.parent)!.eventCount,1);assert.equal(agg.items.find(i=>i.id===ids.parent)!.cardCount,2);
 for(const row of agg.items){const m=await f.client.call('learning.mastery.knowledge',{deckId,nodeId:row.id,scope:'aggregate'});assert.equal(row.status,m.status);assert.equal(row.observations,m.observations);}
 }finally{f.close();}
});
test('W3-04 105 cards: stable sorting, search, pagination, full-range trend and one grouped request per page',async()=>{
 const {f,deckId}=await seed();try{for(let i=0;i<105;i++)await publishFresh(f.client,'direct',deckId);
 const start=performance.now(),first=await f.client.call('workspace.analytics.grouped',{deckId,dimension:'card',limit:20,sort:'events',direction:'desc'});assert.equal(first.totalCount,105);assert.equal(first.items.length,20);const ids=new Set(first.items.map(i=>i.id));let cursor=first.nextCursor;
 while(cursor){const next=await f.client.call('workspace.analytics.grouped',{deckId,dimension:'card',limit:20,sort:'events',direction:'desc',cursor});assert.deepEqual(next.trend,first.trend);for(const i of next.items){assert.ok(!ids.has(i.id));ids.add(i.id);}cursor=next.nextCursor;}assert.equal(ids.size,105);assert.ok(performance.now()-start<5000);
 const missing=await f.client.call('workspace.analytics.grouped',{deckId,dimension:'card',search:'不存在'});assert.equal(missing.totalCount,0);assert.equal(missing.summary.cardCount,105);
 }finally{f.close();}
});
test('W3-08 revision/epoch/filter cursors reject old pages, independent reopen consistent',async()=>{
 const {f,deckId}=await seed();try{const c=await publishFresh(f.client,'direct',deckId);await publishFresh(f.client,'direct',deckId);const first=await f.client.call('workspace.analytics.grouped',{deckId,dimension:'card',limit:1});assert.ok(first.nextCursor);
 await review(f,c,90);for(const extra of [{cursor:first.nextCursor},{expectedDataEpoch:first.dataEpoch,expectedDataRevision:first.dataRevision},{expectedDataEpoch:'other-epoch'}])await assert.rejects(()=>f.client.call('workspace.analytics.grouped',{deckId,dimension:'card',...extra}),(e:unknown)=>(e as {code:string}).code==='DATA_REVISION_CHANGED');
 const latest=await f.client.call('workspace.analytics.grouped',{deckId,dimension:'card'});await f.reopen();const read=await f.client.call('workspace.analytics.grouped',{deckId,dimension:'card'});assert.deepEqual(read.summary,latest.summary);assert.deepEqual(read.items,latest.items);
 }finally{f.close();}
});
