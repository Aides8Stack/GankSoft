import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {createFullRestoreSession} from './fixtures/isolated-append-session.ts';
import {createClient} from '../shared/protocol/client.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
async function fixture(){
 const f=await unifiedWorkspaceFixture(),source=schema604Fixture();await f.card('direct');f.release();let selected:string|null=source.databasePath;
 const ports={workspaceParent:f.source.root,selectBackup:async()=>null,selectDatabase:async()=>selected};
 const session=await createFullRestoreSession(f.control,ports),client=createClient(r=>session.execute(r));await client.call('app.capabilities',{});
 return {f,source,ports,session,client,select:(v:string|null)=>{selected=v;},close(){session.close();source.close();f.close();}};
}
const baseline=(x:Awaited<ReturnType<typeof fixture>>)=>inspectDatabaseBaseline(join(x.session.ctx.dataDir,'ganksoft.sqlite'),x.session.ctx.dataDir);
async function plan(x:Awaited<ReturnType<typeof fixture>>){
 const scan=await x.client.call('storage.append.open',{});assert.ok(scan);
 return {scan,p:await x.client.call('storage.append.preview',{scanId:scan.scanId,selectedDeckIds:[x.source.ids.qDeck,x.source.ids.mDeck],forceIndependent:false,folderId:null})};
}
test('T39 typed source cancellation, bounded metadata, dependencies and preview disposal leave target/source unchanged',async()=>{
 const x=await fixture();try{
  const before=baseline(x),sourceBefore=inspectDatabaseBaseline(x.source.databasePath,x.source.dataDir);
  const scan=await x.client.call('storage.append.open',{});assert.ok(scan);
  const page=await x.client.call('storage.append.decks',{scanId:scan.scanId,limit:1,cursor:null});assert.equal(page.items.length,1);assert.ok(page.nextCursor);
  assert.doesNotMatch(JSON.stringify({scan,page}),/candidateDirectory|databasePath|rawJson|\/tmp\//);
  const selection=await x.client.call('storage.append.preview',{scanId:scan.scanId,selectedDeckIds:[x.source.ids.mDeck],forceIndependent:false,folderId:null});assert.equal(selection.confirmation,null);assert.equal(selection.selection.closed,false);assert.ok(selection.selection.requiredDecks.some(d=>d.sourceDeckId===x.source.ids.qDeck));
  assert.equal(await x.client.call('storage.append.cancel',{scanId:scan.scanId}),true);assert.equal(await x.client.call('storage.append.cancel',{scanId:scan.scanId}),true);
  await assert.rejects(()=>x.client.call('storage.append.decks',{scanId:scan.scanId,limit:1,cursor:null}),/已失效/);
  x.select(null);assert.equal(await x.client.call('storage.append.open',{}),null);assert.deepEqual(baseline(x),before);assert.deepEqual(inspectDatabaseBaseline(x.source.databasePath,x.source.dataDir),sourceBefore);
 }finally{x.close();}
});
test('T39 typed confirm reopens the same owner, survives concurrent exact retries and lost transport response, and queries/replays after session restart',async()=>{
 const x=await fixture();let resumed:Awaited<ReturnType<typeof createFullRestoreSession>>|undefined;
 try{
  const {p}=await plan(x);assert.ok(p.confirmation);const c=p.confirmation,request=x.client.prepare('storage.append.confirm',c,c.operationId),old=x.session.ctx;
  const [r,replay]=await Promise.all([x.client.send(request),x.client.send(request)]);assert.deepEqual(replay,r);assert.equal(r.imported.length,2);assert.equal(r.reopened,true);assert.notEqual(old.dataDir,x.session.ctx.dataDir);
  assert.equal(x.session.ctx.db.prepare('SELECT count(*) AS n FROM platform_operations WHERE request_id=?').get(c.operationId)!.n,0);
  const changed=await x.session.execute({...request,payload:{...c,forceIndependent:true}});assert.equal(changed.ok,false);
  const status=await x.client.call('storage.append.status',{operationId:c.operationId});assert.deepEqual(status?.result,r);
  const lost=createClient(async q=>{await x.session.execute(q);throw Error('synthetic response loss');});await assert.rejects(()=>lost.send(request),/结果未知/);assert.deepEqual(await x.client.send(request),r);
  x.session.close();resumed=await createFullRestoreSession(x.f.control,{...x.ports,recover:true});const next=createClient(q=>resumed!.execute(q));await next.call('app.capabilities',{});assert.deepEqual(await next.send(request),r);assert.equal((await next.call('storage.append.status',{operationId:c.operationId}))?.state,'committed');await next.call('workspace.catalog',{});
  const s=await next.call('storage.append.open',{});assert.ok(s);const dup=await next.call('storage.append.preview',{scanId:s.scanId,selectedDeckIds:c.selectedDeckIds,forceIndependent:false,folderId:null});assert.equal(dup.confirmation,null);assert.equal(dup.duplicates!.skippedDeckIds.length,2);
  const force=await next.call('storage.append.preview',{scanId:s.scanId,selectedDeckIds:c.selectedDeckIds,forceIndependent:true,folderId:null});assert.ok(force.confirmation);
  const newer=await next.send(next.prepare('storage.append.confirm',force.confirmation,force.confirmation.operationId));assert.notEqual(newer.epoch,r.epoch);
  const older=await next.send(request);assert.equal(older.epoch,r.epoch);assert.equal(older.reopened,false);await next.call('workspace.catalog',{});

 }finally{resumed?.close();x.close();}
});
test('T39 typed confirmation rejects wrong envelope, stale target and cancelled preview without suppressing successful existing edits',async()=>{
 const x=await fixture();try{
  const {scan,p}=await plan(x);assert.ok(p.confirmation);const c=p.confirmation,request=x.client.prepare('storage.append.confirm',c,c.operationId);
  for(const bad of [{...request,requestId:randomUUID()},{...request,protocol:{major:3,minor:0}},{...request,payload:{...c,folderId:'forged'}}])assert.equal((await x.session.execute(bad)).ok,false);
  await x.client.call('preferences.set',{theme:'dark'});await assert.rejects(()=>x.client.send(request),/已变化/);assert.equal((await x.client.call('preferences.get',{})).theme,'dark');
  await x.client.call('storage.append.cancel',{scanId:scan.scanId});await assert.rejects(()=>x.client.send(request),/重新选择/);
  assert.equal(await x.client.call('storage.append.status',{operationId:randomUUID()}),null);
 }finally{x.close();}
});
