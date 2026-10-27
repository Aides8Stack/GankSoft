import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {createBackup} from '../electron/infrastructure/backup.ts';
import {createFullRestoreSession} from '../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../shared/protocol/client.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
async function fixture(){
 const f=await unifiedWorkspaceFixture();await f.card('qa');const path=join(f.source.root,'restore.zip');await createBackup(f.ctx.db,f.ctx.dataDir,path);const newer=await f.card('direct');f.release();
 let selected:string|null=path;const ports={selectBackup:async()=>selected,workspaceParent:f.source.root};
 const session=await createFullRestoreSession(f.control,ports),client=createClient(r=>session.execute(r));await client.call('app.capabilities',{});
 return {f,path,newer,ports,session,client,select(p:string|null){selected=p;},close(){session.close();f.close();}};
}
test('T38 typed preview/cancel is compact and read-only, cancellation is repeatable and cannot confirm a closed preview',async()=>{
 const x=await fixture();try{
  const before=inspectDatabaseBaseline(join(x.session.ctx.dataDir,'ganksoft.sqlite'),x.session.ctx.dataDir),p=await x.client.call('storage.restore.open',{});assert.ok(p);
  assert.doesNotMatch(JSON.stringify(p),/candidateDirectory|ganksoft.sqlite|rawJson|sourceDir|\/tmp\//);assert.deepEqual(inspectDatabaseBaseline(join(x.session.ctx.dataDir,'ganksoft.sqlite'),x.session.ctx.dataDir),before);
  assert.equal(await x.client.call('storage.restore.cancel',{previewId:p.summary.previewId}),true);assert.equal(await x.client.call('storage.restore.cancel',{previewId:p.summary.previewId}),true);
  await assert.rejects(()=>x.client.send(x.client.prepare('storage.restore.confirm',p.confirmation,p.confirmation.operationId)),/重新选择/);
  x.select(null);assert.equal(await x.client.call('storage.restore.open',{}),null);
 }finally{x.close();}
});
test('T38 typed confirm swaps/reopens the same control, returns new epoch, avoids old DB receipts and replays exactly after process-level session reopen',async()=>{
 const x=await fixture();let resumed:Awaited<ReturnType<typeof createFullRestoreSession>>|undefined;
 try{
  const old=x.session.ctx,p=await x.client.call('storage.restore.open',{});assert.ok(p);
  const request=x.client.prepare('storage.restore.confirm',p.confirmation,p.confirmation.operationId);
  const [result,duplicate]=await Promise.all([x.client.send(request),x.client.send(request)]);assert.deepEqual(duplicate,result);assert.equal(result.state,'committed');assert.equal(result.reopened,true);assert.equal(result.recoveryPointAvailable,true);
  assert.notEqual(x.session.ctx.dataDir,old.dataDir);assert.equal(Number(x.session.ctx.db.prepare("SELECT count(*) AS n FROM learning_cards WHERE id=?").get(x.newer.cardId)!.n),0);
  await x.client.call('app.capabilities',{});assert.equal((await x.client.call('storage.restore.status',{operationId:result.operationId}))?.state,'committed');
  assert.equal(Number(x.session.ctx.db.prepare("SELECT count(*) AS n FROM platform_operations WHERE request_id=?").get(result.operationId)!.n),0);
  assert.deepEqual(await x.client.send(request),result);assert.ok(existsSync(join(old.dataDir,'ganksoft.sqlite')));
  x.session.close();resumed=await createFullRestoreSession(x.f.control,{...x.ports,recover:true});const client=createClient(r=>resumed!.execute(r));await client.call('app.capabilities',{});
  assert.deepEqual(await client.send(request),result);await client.call('workspace.catalog',{});
 }finally{resumed?.close();x.close();}
});
test('T38 confirmation payload/wire ID conflicts and wrong protocol cannot cause a restore or corrupt response validation',async()=>{
 const x=await fixture();try{
  const p=await x.client.call('storage.restore.open',{});assert.ok(p);const request=x.client.prepare('storage.restore.confirm',p.confirmation,p.confirmation.operationId);
  const wrong=await x.session.execute({...request,payload:{operationId:'invalid'}});assert.equal(wrong.ok,false);
  const badId=await x.session.execute({...request,requestId:randomUUID()});assert.equal(badId.ok,false);
  const wrongProtocol=await x.session.execute({...request,protocol:{major:3,minor:0}});assert.equal(wrongProtocol.ok,false);
  await x.client.send(request);
  const changed=await x.session.execute({...request,payload:{...p.confirmation,expectedRevision:p.confirmation.expectedRevision+1}});assert.equal(changed.ok,false);
  assert.equal(changed.ok?null:changed.error.code,'RESTORE_OPERATION_CONFLICT');
 }finally{x.close();}
});
test('T38 UI plan becomes stale on a concurrent setting edit; reject instead of losing that edit and allow a new preview',async()=>{
 const x=await fixture();try{
  const p=await x.client.call('storage.restore.open',{});assert.ok(p);
  await x.client.call('preferences.set',{theme:'dark'});
  await assert.rejects(()=>x.client.send(x.client.prepare('storage.restore.confirm',p.confirmation,p.confirmation.operationId)),/活动库已变化/);
  await x.client.call('app.capabilities',{});assert.equal((await x.client.call('preferences.get',{})).theme,'dark');const next=await x.client.call('storage.restore.open',{});assert.ok(next);assert.notEqual(next.summary.previewId,p.summary.previewId);
 }finally{x.close();}
});
