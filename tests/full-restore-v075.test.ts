import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {previewFullBackup} from '../electron/modules/storage-unified/backup-preview.ts';
import {createBackup,stageBackup} from '../electron/infrastructure/backup.ts';
import {openUnifiedOwner,recoverUnifiedMigration,readRestoreStatus} from '../electron/infrastructure/migrations/coordinator.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
import {transaction,openDatabase} from '../electron/infrastructure/database.ts';
import {guardDatabaseAccess} from '../electron/infrastructure/write-owner.ts';
import type {FullRestoreConfirmationDTO} from '../shared/storage/full-backup.ts';

async function fixture() {
 const f=await unifiedWorkspaceFixture();await f.card('qa');
 const archive=join(f.source.root,'restore.zip');await createBackup(f.ctx.db,f.ctx.dataDir,archive);
 const p=await previewFullBackup(archive,f.source.root);await f.card('direct');f.release();
 const owner=openUnifiedOwner(f.control),before=inspectDatabaseBaseline(join(owner.dataDir,'ganksoft.sqlite'),owner.dataDir);
 const confirmation:FullRestoreConfirmationDTO={operationId:randomUUID(),previewId:p.summary.previewId,archiveSha256:p.archiveSha256,
  expectedEpoch:owner.epoch,expectedRevision:Number(owner.db.prepare('SELECT revision FROM protocol_meta').get()!.revision),replaceAll:true,migrateLegacy:false};
 return {f,p,owner,before,confirmation,close(){owner.close();p.close();f.close();}};
}
function facts(dir:string) {const b=inspectDatabaseBaseline(join(dir,'ganksoft.sqlite'),dir);return {...b,tables:b.tables.filter(t=>!['protocol_meta','learning_owner'].includes(t.name)),digest:null};}
const errorCode=(code:string)=>(e:unknown)=>e instanceof Error&&'code'in e&&e.code===code;

test('T38 controlled restore requires exact confirmation, preserves all facts/media and verified before-point, retires old epoch and persists idempotent receipt',async()=>{
 const x=await fixture();let reopened:ReturnType<typeof openUnifiedOwner>|undefined;
 try {
  const candidateFacts=facts(x.p.candidateDirectory),oldDir=x.owner.dataDir,oldEpoch=x.owner.epoch;
  const result=await x.owner.restore(x.p,x.confirmation,{checkpoint:phase=>{
   if(phase==='restore:frozen') {
    assert.throws(()=>guardDatabaseAccess(x.owner.db),errorCode('RESTORE_OWNER_UNAVAILABLE'));
    const rogue=new DatabaseSync(join(oldDir,'ganksoft.sqlite'));try{rogue.exec('PRAGMA busy_timeout=0');assert.throws(()=>rogue.exec("INSERT INTO settings VALUES('blocked','1')"),/locked/);}finally{rogue.close();}
   }
  }});
  assert.equal(result.state,'committed');assert.notEqual(result.epoch,oldEpoch);assert.notEqual(result.activeDir,oldDir);
  assert.deepEqual(facts(result.activeDir),candidateFacts);assert.deepEqual(inspectDatabaseBaseline(join(oldDir,'ganksoft.sqlite'),oldDir),x.before);
  assert.throws(()=>transaction(x.owner.db,()=>{}),errorCode('RESTORE_OWNER_UNAVAILABLE'));
  assert.throws(()=>x.owner.db.exec("INSERT INTO settings VALUES('old-write','1')"),/readonly/);
  assert.throws(()=>openUnifiedOwner(x.f.control));assert.throws(()=>openDatabase(join(oldDir,'ganksoft.sqlite')),errorCode('MIGRATION_WRITE_FENCED'));
  assert.ok(result.recoveryPoint);const recovered=join(x.f.source.root,'verify-before');await stageBackup(result.recoveryPoint!,recovered);
  assert.deepEqual(inspectDatabaseBaseline(join(recovered,'ganksoft.sqlite'),recovered),x.before);
  assert.deepEqual(await x.owner.restore(x.p,x.confirmation),result,'lost-response retry returns original receipt without another switch');
  x.owner.close();reopened=openUnifiedOwner(x.f.control);assert.equal(reopened.dataDir,result.activeDir);assert.equal(reopened.epoch,result.epoch);
  transaction(reopened.db,()=>reopened!.db.prepare("INSERT INTO settings VALUES('new-write','1')").run());
  assert.equal(readRestoreStatus(x.f.control,result.operationId)?.state,'committed');
 }finally{reopened?.close();x.close();}
});

test('T38 stale revision, wrong preview and missing destructive confirmation cannot stage or change the active pointer',async()=>{
 const x=await fixture();try{
  const pointer=readFileSync(join(x.f.control,'active.json'),'utf8');
  await assert.rejects(()=>x.owner.restore(x.p,{...x.confirmation,expectedRevision:x.confirmation.expectedRevision+1}),errorCode('DATA_EPOCH_CHANGED'));
  await assert.rejects(()=>x.owner.restore(x.p,{...x.confirmation,previewId:randomUUID()}),errorCode('RESTORE_CONFIRMATION_CHANGED'));
  await assert.rejects(()=>x.owner.restore(x.p,{...x.confirmation,replaceAll:false} as unknown as FullRestoreConfirmationDTO));
  assert.equal(readFileSync(join(x.f.control,'active.json'),'utf8'),pointer);assert.equal(readRestoreStatus(x.f.control,x.confirmation.operationId),null);
  transaction(x.owner.db,()=>x.owner.db.prepare("INSERT INTO settings VALUES('still-active','1')").run());
 }finally{x.close();}
});

for(const phase of ['restore:registered','restore:frozen','restore:recovery-point','restore:candidate-staged','restore:prepared'])test(`T42 failure at ${phase} keeps original unique owner writable and full state unchanged`,async()=>{
 const x=await fixture();try{
  await assert.rejects(()=>x.owner.restore(x.p,x.confirmation,{checkpoint:p=>{if(p===phase)throw Object.assign(Error('synthetic disk full'),{code:'ENOSPC'});}}),/synthetic disk full/);
  assert.equal(readRestoreStatus(x.f.control,x.confirmation.operationId)?.state,'aborted');
  assert.deepEqual(inspectDatabaseBaseline(join(x.owner.dataDir,'ganksoft.sqlite'),x.owner.dataDir),x.before);
  transaction(x.owner.db,()=>x.owner.db.prepare("INSERT INTO settings VALUES('after-abort','1')").run());
  assert.equal(JSON.parse(readFileSync(join(x.f.control,'active.json'),'utf8')).activeDir,x.owner.dataDir);
 }finally{x.close();}
});

for(const phase of ['restore:pointer','restore:committed'])test(`T42 response loss at ${phase} is committed once and never retries an overwrite`,async()=>{
 const x=await fixture();try{
  await assert.rejects(()=>x.owner.restore(x.p,x.confirmation,{checkpoint:p=>{if(p===phase)throw Error('response lost');}}),errorCode('RESTORE_COMMITTED'));
  const result=readRestoreStatus(x.f.control,x.confirmation.operationId)!;assert.equal(result.state,'committed');
  assert.deepEqual(await x.owner.restore(x.p,x.confirmation),result);
  assert.deepEqual(inspectDatabaseBaseline(join(x.owner.dataDir,'ganksoft.sqlite'),x.owner.dataDir),x.before);
 }finally{x.close();}
});

test('T38 explicit604 backup conversion is confined to isolated candidate and never upgrades the original source or production path',async()=>{
 const x=await fixture(),legacy=schema604Fixture();let reopened:ReturnType<typeof openUnifiedOwner>|undefined;
 try{
  legacy.db.exec("UPDATE platform_operations SET state='completed'");const before=inspectDatabaseBaseline(legacy.databasePath,legacy.dataDir);
  const file=join(legacy.root,'old.zip');await createBackup(legacy.db,legacy.dataDir,file);const p=await previewFullBackup(file,legacy.root);
  try{
   const confirmation={...x.confirmation,previewId:p.summary.previewId,archiveSha256:p.archiveSha256,migrateLegacy:true};
   await assert.rejects(()=>x.owner.restore(p,{...confirmation,migrateLegacy:false}),errorCode('RESTORE_CONFIRMATION_CHANGED'));
   const r=await x.owner.restore(p,confirmation);x.owner.close();reopened=openUnifiedOwner(x.f.control);
   assert.equal(reopened.dataDir,r.activeDir);assert.equal(inspectDatabaseBaseline(join(r.activeDir,'ganksoft.sqlite'),r.activeDir).schemaVersion,606);
   assert.deepEqual(inspectDatabaseBaseline(legacy.databasePath,legacy.dataDir),before);
   assert.equal(Number(legacy.db.prepare('PRAGMA user_version').get()!.user_version),604);
  }finally{p.close();}
 }finally{reopened?.close();legacy.close();x.close();}
});

for(const phase of ['restore:registered','restore:frozen','restore:recovery-point','restore:candidate-staged','restore:prepared','restore:pointer','restore:committed'])test(`T42 actual process exit at ${phase} recovers solely from the durable pointer`,async()=>{
 const x=await fixture();let reopened:ReturnType<typeof openUnifiedOwner>|undefined;
 try{
  x.owner.close();
  const coordinator=new URL('../electron/infrastructure/migrations/coordinator.ts',import.meta.url).href,preview=new URL('../electron/modules/storage-unified/backup-preview.ts',import.meta.url).href;
  const script=`import {openUnifiedOwner} from ${JSON.stringify(coordinator)};import {previewFullBackup} from ${JSON.stringify(preview)};
   const owner=openUnifiedOwner(process.argv[1]),p=await previewFullBackup(process.argv[2],process.argv[3]);
   const c=JSON.parse(process.argv[4]);c.previewId=p.summary.previewId;
   await owner.restore(p,c,{checkpoint:phase=>{if(phase===process.argv[5])process.exit(43);}});`;
  const child=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',script,x.f.control,join(x.f.source.root,'restore.zip'),x.f.source.root,JSON.stringify(x.confirmation),phase],{encoding:'utf8',timeout:30000});
  assert.equal(child.status,43,child.stderr);
  assert.throws(()=>openUnifiedOwner(x.f.control),'dead lease is not silently stolen');
  const r=await recoverUnifiedMigration(x.f.control),committed=['restore:pointer','restore:committed'].includes(phase);
  assert.equal(readRestoreStatus(x.f.control,x.confirmation.operationId)?.state,committed?'committed':'aborted');
  reopened=openUnifiedOwner(x.f.control);assert.equal(reopened.dataDir,r.activeDir);assert.equal(reopened.epoch,r.epoch);
  if(committed){assert.deepEqual(facts(r.activeDir),facts(x.p.candidateDirectory));assert.notEqual(r.epoch,x.confirmation.expectedEpoch);}
  else assert.deepEqual(inspectDatabaseBaseline(join(r.activeDir,'ganksoft.sqlite'),r.activeDir),x.before);
  transaction(reopened.db,()=>reopened!.db.prepare("INSERT INTO settings VALUES('after-recovery','1')").run());
 }finally{reopened?.close();x.close();}
});

test('T42 missing committed candidate blocks restart instead of silently reopening old data',async()=>{
 const x=await fixture();try{
  const r=await x.owner.restore(x.p,x.confirmation);x.owner.close();
  writeFileSync(join(r.activeDir,'ganksoft.sqlite'),'corrupt synthetic database');
  await assert.rejects(()=>recoverUnifiedMigration(x.f.control));assert.throws(()=>openUnifiedOwner(x.f.control));
  assert.deepEqual(inspectDatabaseBaseline(join(x.f.ctx.dataDir,'ganksoft.sqlite'),x.f.ctx.dataDir),x.before);
  assert.ok(existsSync(r.recoveryPoint!));
 }finally{x.close();}
});

test('T38 successive restores keep the same control lease/domain and old operation receipts cannot replace the newer generation',async()=>{
 const x=await fixture();let owner:ReturnType<typeof openUnifiedOwner>|undefined;
 try {
  const first=await x.owner.restore(x.p,x.confirmation);x.owner.close();owner=openUnifiedOwner(x.f.control);
  const next={...x.confirmation,operationId:randomUUID(),expectedEpoch:owner.epoch,expectedRevision:0};
  const second=await owner.restore(x.p,next);assert.notEqual(first.epoch,second.epoch);assert.notEqual(first.activeDir,second.activeDir);
  assert.deepEqual(await owner.restore(x.p,x.confirmation),first);assert.equal(JSON.parse(readFileSync(join(x.f.control,'active.json'),'utf8')).activeDir,second.activeDir);
  owner.close();owner=openUnifiedOwner(x.f.control);assert.equal(owner.dataDir,second.activeDir);assert.deepEqual(facts(second.activeDir),facts(x.p.candidateDirectory));
  await assert.rejects(()=>owner!.restore(x.p,{...next,archiveSha256:'0'.repeat(64)}),errorCode('RESTORE_OPERATION_CONFLICT'));
 }finally{owner?.close();x.close();}
});

test('T42 candidate media changed after staging is rejected before the sole commit point without repairing or dropping source facts',async()=>{
 const x=await fixture();try{
  await assert.rejects(()=>x.owner.restore(x.p,x.confirmation,{checkpoint:phase=>{
   if(phase==='restore:prepared'){
    const candidate=join(x.f.control,'restores',x.confirmation.operationId,'candidate');
    const media=inspectDatabaseBaseline(join(candidate,'ganksoft.sqlite'),candidate).media[0];writeFileSync(join(candidate,'attachments',media.name),'synthetic corruption');
   }
  }}));
  assert.equal(readRestoreStatus(x.f.control,x.confirmation.operationId)?.state,'aborted');
  assert.deepEqual(inspectDatabaseBaseline(join(x.owner.dataDir,'ganksoft.sqlite'),x.owner.dataDir),x.before);
  transaction(x.owner.db,()=>x.owner.db.prepare("INSERT INTO settings VALUES('safe-after-bad-media','1')").run());
 }finally{x.close();}
});
