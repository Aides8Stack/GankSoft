import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {existsSync,mkdirSync,readdirSync,writeFileSync,readFileSync} from 'node:fs';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {createBackup} from '../electron/infrastructure/backup.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
import {previewFullBackup} from '../electron/modules/storage-unified/backup-preview.ts';
import {readContainer,writeContainer} from '../electron/infrastructure/containers.ts';
test('T38 full606 preview preserves every table/media fingerprint, three published modes, original history and unpublished draft without touching active data',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  for(const mode of ['question','qa','direct'] as const)await f.card(mode);await f.client.call('draft.create',{deckId:f.source.ids.qDeck,initialType:'direct'});
  const before=inspectDatabaseBaseline(join(f.ctx.dataDir,'ganksoft.sqlite'),f.ctx.dataDir),file=join(f.source.root,'full.zip');await createBackup(f.ctx.db,f.ctx.dataDir,file);
  const preview=await previewFullBackup(file,f.source.root);try{
   assert.equal(preview.summary.schemaVersion,606);assert.equal(preview.summary.requiresUnifiedMigration,false);assert.ok(preview.summary.unifiedCards!.question>=1&&preview.summary.unifiedCards!.qa>=1&&preview.summary.unifiedCards!.direct>=1);assert.equal(preview.summary.drafts.unpublishedCard,1);assert.ok(preview.summary.reviewEvents>=4);assert.ok(preview.summary.media.files>=4);
   assert.deepEqual(await preview.verify(),before);assert.deepEqual(inspectDatabaseBaseline(join(f.ctx.dataDir,'ganksoft.sqlite'),f.ctx.dataDir),before);
   assert.doesNotMatch(JSON.stringify(preview.summary),/rawJson|markdown|dataDir|candidateDirectory|\/tmp\//);
  }finally{preview.close();preview.close();}assert.equal(existsSync(preview.candidateDirectory),false);await assert.rejects(()=>preview.verify(),/BACKUP_PREVIEW_CLOSED/);
 }finally{f.close();}
});
test('T38 legacy604 backup is inspected without upgrade, fabricated mode mapping or active-library writes',async()=>{
 const f=schema604Fixture();try{const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),file=join(f.root,'old.zip');await createBackup(f.db,f.dataDir,file);const p=await previewFullBackup(file,f.root);try{assert.equal(p.summary.requiresUnifiedMigration,true);assert.equal(p.summary.unifiedCards,null);assert.ok(p.summary.legacy.questions>0);assert.deepEqual(await p.verify(),before);assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);}finally{p.close();}}
 finally{f.close();}
});
test('T42 damaged full backup removes only its private staging folder and preserves caller/source files',async()=>{
 const f=schema604Fixture();try{const source=join(f.root,'good.zip'),bad=join(f.root,'bad.zip'),parent=join(f.root,'previews');mkdirSync(parent);writeFileSync(join(parent,'keep.txt'),'synthetic sentinel');await createBackup(f.db,f.dataDir,source);const bytes=readFileSync(source),files=await readContainer(source);files.set('database.sqlite',Buffer.from('corrupt'));await writeContainer(bad,files);
  await assert.rejects(()=>previewFullBackup(bad,parent),/校验/);assert.deepEqual(readdirSync(parent),['keep.txt']);assert.deepEqual(readFileSync(source),bytes);assert.equal(readFileSync(join(parent,'keep.txt'),'utf8'),'synthetic sentinel');
 }finally{f.close();}
});
test('T38/T42 preview is bound to its captured backup; changed staged media fails verification and source replacement cannot change the approved snapshot',async()=>{
 const f=await unifiedWorkspaceFixture();try{const file=join(f.source.root,'full.zip');await createBackup(f.ctx.db,f.ctx.dataDir,file);const p=await previewFullBackup(file,f.source.root);try{writeFileSync(file,'source replaced after capture');assert.equal((await p.verify()).digest,p.baseline.digest);const image=p.baseline.media[0];assert.ok(image);writeFileSync(join(p.candidateDirectory,'attachments',image.name),'broken image');await assert.rejects(()=>p.verify());assert.ok(existsSync(join(f.ctx.dataDir,'attachments',image.name)));}finally{p.close();}}
 finally{f.close();}
});
