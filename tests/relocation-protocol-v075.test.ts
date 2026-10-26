import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdirSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {createFullRestoreSession} from '../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../shared/protocol/client.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';

async function fixture(){
 const f=await unifiedWorkspaceFixture();await f.card('qa');f.release();const parent=join(f.source.root,'外部数据盘');mkdirSync(parent);
 let selected:string|null=parent;const ports={selectBackup:async()=>null,selectDataParent:async()=>selected,workspaceParent:f.source.root};
 const session=await createFullRestoreSession(f.control,ports),client=createClient(r=>session.execute(r));await client.call('app.capabilities',{});
 return {f,parent,ports,session,client,select:(v:string|null)=>{selected=v;},close(){session.close();f.close();}};
}
test('T40 typed target selection, snapshot preview and cancel do not change active data',async()=>{
 const x=await fixture();try{
  const before=inspectDatabaseBaseline(join(x.session.ctx.dataDir,'ganksoft.sqlite'),x.session.ctx.dataDir,606);
  const pointer=readFileSync(join(x.f.control,'active.json'),'utf8');
  const plan=await x.client.call('storage.relocate.open',{});assert.ok(plan);
  assert.equal(plan.destination,join(x.parent,'GankSoftData'));assert.equal(plan.confirmation.sourceDigest,before.digest);
  assert.ok(!existsSync(plan.destination));assert.equal(readFileSync(join(x.f.control,'active.json'),'utf8'),pointer);
  assert.equal(await x.client.call('storage.relocate.cancel',{previewId:plan.confirmation.previewId}),true);
  await assert.rejects(()=>x.client.send(x.client.prepare('storage.relocate.confirm',plan.confirmation,plan.confirmation.operationId)),/重新预检/);
  x.select(null);assert.equal(await x.client.call('storage.relocate.open',{}),null);
  assert.deepEqual(inspectDatabaseBaseline(join(x.session.ctx.dataDir,'ganksoft.sqlite'),x.session.ctx.dataDir,606),before);
 }finally{x.close();}
});
test('T40 typed commit persists the external target, reopens and replays exact receipt after session restart',async()=>{
 const x=await fixture();let resumed:Awaited<ReturnType<typeof createFullRestoreSession>>|undefined;
 try{
  const old=x.session.ctx.dataDir,plan=await x.client.call('storage.relocate.open',{});assert.ok(plan);
  const request=x.client.prepare('storage.relocate.confirm',plan.confirmation,plan.confirmation.operationId);
  const [result,replay]=await Promise.all([x.client.send(request),x.client.send(request)]);
  assert.deepEqual(replay,result);assert.equal(result.state,'committed');assert.equal(result.destination,plan.destination);
  assert.equal(x.session.ctx.dataDir,plan.destination);assert.ok(existsSync(join(old,'ganksoft.sqlite')));
  assert.equal((await x.client.call('storage.relocate.status',{operationId:result.operationId}))?.state,'committed');
  const bad=await x.session.execute({...request,payload:{...plan.confirmation,destination:join(x.parent,'changed')}});assert.equal(bad.ok,false);
  const forged=await x.session.execute({...request,payload:{...plan.confirmation,sourceDigest:'0'.repeat(64)}});assert.equal(forged.ok,false);
  x.session.close();resumed=await createFullRestoreSession(x.f.control,{...x.ports,recover:true});const next=createClient(q=>resumed!.execute(q));await next.call('app.capabilities',{});
  assert.deepEqual(await next.send(request),result);await next.call('workspace.catalog',{});
 }finally{resumed?.close();x.close();}
});
test('T40 stale revision, mismatched request and existing target reject without moving the pointer',async()=>{
 const x=await fixture();try{
  const plan=await x.client.call('storage.relocate.open',{});assert.ok(plan);
  const request=x.client.prepare('storage.relocate.confirm',plan.confirmation,plan.confirmation.operationId),pointer=readFileSync(join(x.f.control,'active.json'),'utf8');
  assert.equal((await x.session.execute({...request,requestId:randomUUID()})).ok,false);
  await x.client.call('preferences.set',{theme:'dark'});
  await assert.rejects(()=>x.client.send(request),/活动数据在预览后发生变化/);
  assert.equal(readFileSync(join(x.f.control,'active.json'),'utf8'),pointer);assert.ok(!existsSync(plan.destination));
 }finally{x.close();}
});

test('T40 settings-only info follows actual owner and target capacity is present without first-launch initialization',async()=>{
 const x=await fixture();try{
  const before=await x.client.call('storage.relocate.info',{});assert.equal(before.currentDirectory,x.session.ctx.dataDir);
  const p=await x.client.call('storage.relocate.open',{});assert.ok(p);assert.ok(BigInt(p.availableBytes)>=BigInt(p.requiredBytes));
  await x.client.send(x.client.prepare('storage.relocate.confirm',p.confirmation,p.confirmation.operationId));
  assert.equal((await x.client.call('storage.relocate.info',{})).currentDirectory,p.destination);
 }finally{x.close();}
});
