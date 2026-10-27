import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {createBackup} from '../electron/infrastructure/backup.ts';
import {previewFullBackup} from '../electron/modules/storage-unified/backup-preview.ts';
import {previewRelocation} from '../electron/modules/storage-unified/relocation-preview.ts';
import {openUnifiedOwner,readRestoreStatus,recoverUnifiedMigration} from '../electron/infrastructure/migrations/coordinator.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
import {transaction} from '../electron/infrastructure/database.ts';

async function setup(){
 const f=await unifiedWorkspaceFixture();await f.card('qa');f.release();
 const owner=openUnifiedOwner(f.control),parent=join(f.source.root,'跨盘目录-学习资料');mkdirSync(parent);
 const plan=previewRelocation(owner,f.control,parent),archive=join(f.source.root,'relocate.zip');
 await createBackup(owner.db,owner.dataDir,archive);
 const preview=await previewFullBackup(archive,f.source.root);
 const confirmation={operationId:randomUUID(),previewId:preview.summary.previewId,archiveSha256:preview.archiveSha256,
  expectedEpoch:plan.expectedEpoch,expectedRevision:plan.expectedRevision,replaceAll:true,migrateLegacy:false};
 const before=inspectDatabaseBaseline(join(owner.dataDir,'ganksoft.sqlite'),owner.dataDir,606);
 return {f,owner,plan,preview,confirmation,before,close(){owner.close();preview.close();f.close();}};
}
function facts(dir:string){const b=inspectDatabaseBaseline(join(dir,'ganksoft.sqlite'),dir,606);return {...b,digest:null,tables:b.tables.filter(t=>!['protocol_meta','learning_owner'].includes(t.name))};}

test('T40 owner relocation switches one pointer to Chinese external path; full data/media survives, source and receipt remain',async()=>{
 const x=await setup();let reopened:ReturnType<typeof openUnifiedOwner>|undefined;
 try{
  const old=x.owner.dataDir,expected=facts(old),pointer=readFileSync(join(x.f.control,'active.json'),'utf8');
  assert.ok(!existsSync(x.plan.destination));
  const result=await x.owner.restore(x.preview,x.confirmation,{},x.plan.destination);
  assert.equal(result.state,'committed');assert.equal(result.activeDir,x.plan.destination);
  assert.notEqual(readFileSync(join(x.f.control,'active.json'),'utf8'),pointer);
  assert.deepEqual(facts(result.activeDir),expected);assert.deepEqual(inspectDatabaseBaseline(join(old,'ganksoft.sqlite'),old,606),x.before);
  assert.deepEqual(await x.owner.restore(x.preview,x.confirmation,{},x.plan.destination),result);
  assert.equal(readRestoreStatus(x.f.control,x.confirmation.operationId)?.activeDir,result.activeDir);
  x.owner.close();reopened=openUnifiedOwner(x.f.control);assert.equal(reopened.dataDir,x.plan.destination);
  transaction(reopened.db,()=>reopened!.db.prepare("INSERT INTO settings VALUES('relocated-owner','yes')").run());
 }finally{reopened?.close();x.close();}
});

test('T40 target conflict and pre-pointer interruption leave the original owner writable without deleting target',async()=>{
 const x=await setup();try{
  const pointer=readFileSync(join(x.f.control,'active.json'),'utf8');mkdirSync(x.plan.destination);
  await assert.rejects(()=>x.owner.restore(x.preview,x.confirmation,{},x.plan.destination));
  assert.ok(existsSync(x.plan.destination));assert.equal(readFileSync(join(x.f.control,'active.json'),'utf8'),pointer);
  const alternate=join(x.f.source.root,'另一目标');mkdirSync(alternate);const target=join(alternate,'GankSoftData');
  await assert.rejects(()=>x.owner.restore(x.preview,x.confirmation,{checkpoint:phase=>{if(phase==='restore:prepared')throw Error('synthetic power loss');}},target),/synthetic power loss/);
  assert.equal(readRestoreStatus(x.f.control,x.confirmation.operationId)?.state,'aborted');
  assert.equal(readFileSync(join(x.f.control,'active.json'),'utf8'),pointer);
  assert.deepEqual(inspectDatabaseBaseline(join(x.owner.dataDir,'ganksoft.sqlite'),x.owner.dataDir,606),x.before);
  transaction(x.owner.db,()=>x.owner.db.prepare("INSERT INTO settings VALUES('still-owner','yes')").run());
 }finally{x.close();}
});

test('T42 relocation process exit at sole pointer commit recovers external owner without fallback',async()=>{
 const x=await setup();try{
  x.owner.close();
  const script=`import {openUnifiedOwner} from ${JSON.stringify(new URL('../electron/infrastructure/migrations/coordinator.ts',import.meta.url).href)};
   import {previewFullBackup} from ${JSON.stringify(new URL('../electron/modules/storage-unified/backup-preview.ts',import.meta.url).href)};
   const owner=openUnifiedOwner(process.argv[1]),p=await previewFullBackup(process.argv[2],process.argv[3]);
   await owner.restore(p,{...JSON.parse(process.argv[4]),previewId:p.summary.previewId,archiveSha256:p.archiveSha256},{checkpoint:phase=>{if(phase==='restore:pointer')process.exit(43);}},process.argv[5]);`;
  const child=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',script,x.f.control,join(x.f.source.root,'relocate.zip'),x.f.source.root,JSON.stringify(x.confirmation),x.plan.destination],{encoding:'utf8'});
  assert.equal(child.status,43,child.stderr);
  await recoverUnifiedMigration(x.f.control);
  const receipt=readRestoreStatus(x.f.control,x.confirmation.operationId);
  assert.equal(receipt?.state,'committed');assert.equal(receipt.activeDir,x.plan.destination);
  const reopened=openUnifiedOwner(x.f.control);try{assert.equal(reopened.dataDir,x.plan.destination);assert.deepEqual(facts(reopened.dataDir),facts(x.f.ctx.dataDir));}
  finally{reopened.close();}
 }finally{x.close();}
});

for(const phase of ['restore:frozen','restore:prepared'])test('T42 external-path process exit before pointer at '+phase+' recovers original writable owner',async()=>{
 const x=await setup();try{
  const pointer=readFileSync(join(x.f.control,'active.json'),'utf8'),old=x.owner.dataDir;x.owner.close();
  const script=`import {openUnifiedOwner} from ${JSON.stringify(new URL('../electron/infrastructure/migrations/coordinator.ts',import.meta.url).href)};
   import {previewFullBackup} from ${JSON.stringify(new URL('../electron/modules/storage-unified/backup-preview.ts',import.meta.url).href)};
   const owner=openUnifiedOwner(process.argv[1]),p=await previewFullBackup(process.argv[2],process.argv[3]);
   await owner.restore(p,{...JSON.parse(process.argv[4]),previewId:p.summary.previewId,archiveSha256:p.archiveSha256},{checkpoint:stage=>{if(stage===process.argv[6])process.exit(44);}},process.argv[5]);`;
  const child=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',script,x.f.control,join(x.f.source.root,'relocate.zip'),x.f.source.root,JSON.stringify(x.confirmation),x.plan.destination,phase],{encoding:'utf8',timeout:30000});
  assert.equal(child.status,44,child.stderr);await recoverUnifiedMigration(x.f.control);
  assert.equal(readFileSync(join(x.f.control,'active.json'),'utf8'),pointer);assert.equal(readRestoreStatus(x.f.control,x.confirmation.operationId)?.state,'aborted');
  const recovered=openUnifiedOwner(x.f.control);try{assert.equal(recovered.dataDir,old);assert.deepEqual(inspectDatabaseBaseline(join(old,'ganksoft.sqlite'),old,606),x.before);transaction(recovered.db,()=>recovered.db.prepare("INSERT INTO settings VALUES('recovered-write','yes')").run());}finally{recovered.close();}
 }finally{x.close();}
});
