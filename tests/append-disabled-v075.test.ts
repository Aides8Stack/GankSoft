import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {createFullRestoreSession} from '../electron/modules/storage-unified/restore-session.ts';
import {createApplicationProtocol} from '../electron/protocol/gateway.ts';
import {Application} from '../electron/application.ts';
import {createClient} from '../shared/protocol/client.ts';
import {appendMethods} from '../electron/modules/storage-unified/append-session.ts';
function files(root:string):unknown{
 return readdirSync(root,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).map(e=>[e.name,e.isDirectory()?files(join(root,e.name)):createHash('sha256').update(readFileSync(join(root,e.name))).digest('hex')]);
}
test('removed contracts cannot bind platform handlers or execute any old method',async()=>{
 const f=await unifiedWorkspaceFixture();let called=0;
 try{
  const platform=Object.fromEntries(appendMethods.map(m=>[m,async()=>{called++;throw Error('MUST_NOT_RUN');}]));
  const host=createApplicationProtocol(new Application(f.ctx),undefined,platform),client=createClient(r=>host.execute(r));
  const caps=await client.call('app.capabilities',{});assert.ok(!caps.definedMethods.some(m=>m.startsWith('storage.append.')));assert.ok(!caps.supportedMethods.some(m=>m.startsWith('storage.append.')));
  const before=files(f.source.root);
  for(const method of [...appendMethods,'storage.append.legacy'])for(const dataEpoch of [caps.dataEpoch,null,'stale']){
   const r=await host.execute({protocol:{major:2,minor:0},requestId:randomUUID(),dataEpoch,method,payload:{malformed:true}});
   assert.equal(r.ok,false);if(!r.ok){assert.equal(r.error.code,'METHOD_UNSUPPORTED');assert.equal(r.error.outcome,'rejected');}
  }
  assert.equal(called,0);assert.deepEqual(files(f.source.root),before);
 }finally{f.close();}
});
test('owned606 storage startup has no append controller/scan and legacy requests cannot bypass it',async()=>{
 const f=await unifiedWorkspaceFixture();f.release();let called=0;
 // An obsolete port supplied by an old caller must not enable the feature.
 const ports={workspaceParent:f.source.root,selectBackup:async()=>null,selectDataParent:async()=>null,selectDatabase:async()=>{called++;return null;}};
 const session=await createFullRestoreSession(f.control,ports);
 try{
  const client=createClient(r=>session.execute(r)),caps=await client.call('app.capabilities',{});
  assert.ok(caps.supportedMethods.includes('storage.restore.open'));assert.ok(caps.supportedMethods.includes('storage.relocate.open'));
  assert.ok(!caps.definedMethods.some(m=>m.startsWith('storage.append.')));assert.ok(!caps.supportedMethods.some(m=>m.startsWith('storage.append.')));
  const before=files(f.source.root);
  for(const method of appendMethods){const r=await session.execute({protocol:{major:2,minor:0},requestId:randomUUID(),dataEpoch:null,method,payload:{}});assert.equal(r.ok,false);if(!r.ok)assert.equal(r.error.code,'METHOD_UNSUPPORTED');}
  assert.equal(called,0);assert.deepEqual(files(f.source.root),before);
 }finally{session.close();f.close();}
});
test('retired S8.b entry stays absent while R6 reuses the coordinator only through606 merge port',()=>{
 assert.ok(!readFileSync('src/services.ts','utf8').includes('unifiedAppend'));
 const settings=readFileSync('src/unified/UnifiedSystemSettings.vue','utf8');assert.doesNotMatch(settings,/ExternalAppend|appendBusy|追加外部数据库/);
 const session=readFileSync('electron/modules/storage-unified/restore-session.ts','utf8');assert.match(session,/sourceSchema:606/);assert.match(session,/selectMergeDatabase/);assert.doesNotMatch(session,/isolatedExtension|TEST_EXTERNAL_APPEND/);
 const main=readFileSync('electron/main.ts','utf8');assert.doesNotMatch(main,/append-session|storage\.append\.|TEST_EXTERNAL_APPEND/);
 for(const name of ['service','session','map','provenance','metadata','legacy','graph','json'])assert.ok(readFileSync(`electron/modules/storage-unified/append-${name}.ts`,'utf8').length>0);
});
