import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import fs,{mkdirSync,readFileSync,statSync,mkdtempSync,rmSync} from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {join,resolve} from 'node:path';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {createFullRestoreSession} from '../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../shared/protocol/client.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
import {openUnifiedOwner} from '../electron/infrastructure/migrations/coordinator.ts';
import {previewRelocation} from '../electron/modules/storage-unified/relocation-preview.ts';

async function fixture(parentOverride?:string){
 const f=await unifiedWorkspaceFixture();await f.card('qa');f.release();const parent=parentOverride??join(f.source.root,'中文 and spaces');mkdirSync(parent,{recursive:true});
 const session=await createFullRestoreSession(f.control,{workspaceParent:f.source.root,selectBackup:async()=>null,selectDataParent:async()=>parent});
 const client=createClient(r=>session.execute(r));await client.call('app.capabilities',{});
 return {f,parent,session,client,close(){session.close();f.close();}};
}
test('T40 no-space preflight and capacity loss after preview reject without target/pointer writes',async()=>{
 const x=await fixture(),originalStatfs=fs.statfsSync;try{
  const pointer=readFileSync(join(x.f.control,'active.json'),'utf8'),data=x.session.ctx.dataDir;
  const before=inspectDatabaseBaseline(join(data,'ganksoft.sqlite'),data);
  let noSpace=true;
  const stub=mock.method(fs,'statfsSync',(...args:Parameters<typeof fs.statfsSync>)=>{
   if(noSpace&&String(args[0])===x.parent)return {...originalStatfs(x.parent,{bigint:true}),bavail:0n};
   return Reflect.apply(originalStatfs,fs,args);
  });syncBuiltinESMExports();
  await assert.rejects(()=>x.client.call('storage.relocate.open',{}),/空间不足/);
  assert.equal(fs.existsSync(join(x.parent,'GankSoftData')),false);assert.equal(readFileSync(join(x.f.control,'active.json'),'utf8'),pointer);
  noSpace=false;const p=await x.client.call('storage.relocate.open',{});assert.ok(p);noSpace=true;
  await assert.rejects(()=>x.client.send(x.client.prepare('storage.relocate.confirm',p.confirmation,p.confirmation.operationId)),/空间不足/);
  assert.equal(readFileSync(join(x.f.control,'active.json'),'utf8'),pointer);assert.deepEqual(inspectDatabaseBaseline(join(data,'ganksoft.sqlite'),data),before);
  stub.mock.restore();syncBuiltinESMExports();
 }finally{mock.restoreAll();syncBuiltinESMExports();x.close();}
});
test('T40 missing media after preview and conflicting destination do not switch active data',async()=>{
 const x=await fixture();try{
  const p=await x.client.call('storage.relocate.open',{});assert.ok(p);const pointer=readFileSync(join(x.f.control,'active.json'),'utf8');
  mkdirSync(p.destination);fs.writeFileSync(join(p.destination,'keep'),'unrelated synthetic file');
  await assert.rejects(()=>x.client.send(x.client.prepare('storage.relocate.confirm',p.confirmation,p.confirmation.operationId)));
  assert.equal(readFileSync(join(p.destination,'keep'),'utf8'),'unrelated synthetic file');
  rmSync(p.destination,{recursive:true,force:true});
  const data=x.session.ctx.dataDir,b=inspectDatabaseBaseline(join(data,'ganksoft.sqlite'),data);assert.ok(b.media.length);
  rmSync(join(data,'attachments',b.media[0]!.name));
  await assert.rejects(()=>x.client.send(x.client.prepare('storage.relocate.confirm',p.confirmation,p.confirmation.operationId)));
  assert.equal(readFileSync(join(x.f.control,'active.json'),'utf8'),pointer);
 }finally{x.close();}
});
test('T40 lost confirmation response replays original operation; old owner cannot write after switch',async()=>{
 const x=await fixture();const old=x.session.ctx;
 try{
  const p=await x.client.call('storage.relocate.open',{});assert.ok(p);assert.throws(()=>openUnifiedOwner(x.f.control),/EEXIST/);
  let drop=true;const client=createClient(async q=>{const r=await x.session.execute(q);if(drop&&(q as {method:string}).method==='storage.relocate.confirm'){drop=false;throw Error('synthetic lost response');}return r;});await client.call('app.capabilities',{});
  const req=client.prepare('storage.relocate.confirm',p.confirmation,p.confirmation.operationId);
  await assert.rejects(()=>client.send(req),/提交结果未知/);
  const first=await client.send(req);assert.equal(first.state,'committed');assert.equal(first.destination,p.destination);assert.deepEqual(await client.send(req),first);
  const {transaction}=await import('../electron/infrastructure/database.ts');
  assert.throws(()=>transaction(old.db,()=>old.db.prepare("INSERT INTO settings VALUES('retired-write','no')").run()));
  assert.equal(x.session.ctx.db.prepare("SELECT value FROM settings WHERE key='retired-write'").get(),undefined);
 }finally{x.close();}
});
test('T40 actual different-filesystem copy retains complete facts/media and old directory',async()=>{
 const f=await unifiedWorkspaceFixture();const sourceDevice=statSync(f.ctx.dataDir).dev;f.close();
 const candidates=process.platform==='win32'?[resolve('validation-results')]:['/dev/shm'];
 let parent:string|undefined;
 for(const root of candidates){try{mkdirSync(root,{recursive:true});if(statSync(root).dev!==sourceDevice){parent=mkdtempSync(join(root,'gank-relocation-test-'));break;}}catch{}}
 assert.ok(parent,'CROSS_DISK_NOT_AVAILABLE: required second mounted filesystem missing');
 const x=await fixture(parent);try{
  const old=x.session.ctx.dataDir,b=inspectDatabaseBaseline(join(old,'ganksoft.sqlite'),old);assert.notEqual(statSync(parent).dev,statSync(old).dev);
  const p=await x.client.call('storage.relocate.open',{});assert.ok(p);await x.client.send(x.client.prepare('storage.relocate.confirm',p.confirmation,p.confirmation.operationId));
  const after=inspectDatabaseBaseline(join(p.destination,'ganksoft.sqlite'),p.destination);
  const facts=(v:typeof b)=>({...v,digest:null,tables:v.tables.filter(r=>!['protocol_meta','learning_owner'].includes(r.name))});
  assert.deepEqual(facts(after),facts(b));assert.deepEqual(inspectDatabaseBaseline(join(old,'ganksoft.sqlite'),old),b);
 }finally{x.close();rmSync(parent,{recursive:true,force:true});}
});
