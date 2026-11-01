import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,existsSync,readFileSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Transformer} from '@napi-rs/image';
import {mediaFixture} from './fixtures/ganksoft/media.ts';
import {createFullRestoreSession} from '../electron/modules/storage-unified/restore-session.ts';
import {createBackup} from '../electron/infrastructure/backup.ts';
import {createClient} from '../shared/protocol/client.ts';
import {stageInsertionImages,finishInsertion,insertionStatus} from '../electron/modules/media/staged-insertions.ts';
import {finalizeMediaRetirements} from '../electron/modules/media/library.ts';
import {placementUrl} from '../shared/editor/document.ts';

const png=Transformer.fromRgbaPixels(Buffer.from([90,30,160,255]),1,1).pngSync();
test('FAULT-05 scoped staging: rejection, receipt rollback, crash recovery, protected references and cleanup retry',async t=>{
 const f=await mediaFixture(join(mkdtempSync(join(tmpdir(),'gank-insertion-')),'fixture.json'));
 let selectedBackup:string|null=null;
 const open=()=>createFullRestoreSession(f.data+'-control606',{workspaceParent:f.root,selectBackup:async()=>selectedBackup,allowLegacyRestore:false});
 let owner=await open(),api=createClient(r=>owner.execute(r));await api.call('app.capabilities',{});
 const paths=(id:string)=>join(owner.ctx.dataDir,'attachments',id+'.png');
 const stage=(deckId=f.deck.id)=>{const scope={deckId,insertionId:crypto.randomUUID()},assets=stageInsertionImages(owner.ctx,scope,'question',[{bytes:png,mime:'image/png'}]);return {...scope,asset:assets[0]!};};
 const scope=(a:ReturnType<typeof stage>)=>({deckId:a.deckId,insertionId:a.insertionId});
 const images=()=>Object.fromEntries(readdirSync(join(owner.ctx.dataDir,'attachments')).map(n=>[n,readFileSync(join(owner.ctx.dataDir,'attachments',n)).toString('base64')]));
 const reopen=async()=>{owner.close();owner=await open();api=createClient(r=>owner.execute(r));await api.call('app.capabilities',{});};
 try{
  await t.test('reject only own fresh asset; active lease, accepted insertion, legacy orphan and other deck remain',async()=>{
   const rejected=stage(),active=stage(),accepted=stage(),other=stage(f.secondDeck.id),before=images();
   await api.call('media.stage.finish',{...scope(accepted),outcome:'accepted'});
   assert.equal((await api.call('media.library.list',{deckId:f.deck.id,query:active.asset.id})).total,0);
   assert.equal((await api.call('media.library.list',{deckId:f.deck.id,query:accepted.asset.id})).total,1);
   await assert.rejects(()=>api.call('media.stage.finish',{...scope(rejected),deckId:f.secondDeck.id,outcome:'rejected'}));
   const request=api.prepare('media.stage.finish',{...scope(rejected),outcome:'rejected'});
   const receipt=await api.send(request);assert.deepEqual(await api.send(request),receipt);
   assert.equal(existsSync(paths(rejected.asset.id)),false);
   assert.equal(owner.ctx.db.prepare('SELECT 1 FROM settings WHERE key=?').get('media-draft:'+rejected.asset.id),undefined);
   assert.equal((await api.call('media.stage.status',scope(rejected))).pendingCleanup,0);
   const after=images();delete before[rejected.asset.id+'.png'];assert.deepEqual(after,before);
   await assert.rejects(()=>api.call('media.stage.finish',{...scope(accepted),outcome:'rejected'}));
   await api.call('media.stage.finish',{...scope(active),outcome:'accepted'});
   await api.call('media.stage.finish',{...scope(other),outcome:'accepted'});
  });
  await t.test('receipt failure rolls journal and metadata back before unlink; exact request retry cleans once',async()=>{
   const a=stage(),before=images(),req=api.prepare('media.stage.finish',{...scope(a),outcome:'rejected'});
   owner.ctx.db.exec("CREATE TEMP TRIGGER insertion_receipt_fail BEFORE INSERT ON protocol_receipts WHEN NEW.method='media.stage.finish' BEGIN SELECT RAISE(ABORT,'insertion receipt failure'); END");
   await assert.rejects(()=>api.send(req));assert.deepEqual(images(),before);assert.equal(insertionStatus(owner.ctx,scope(a)).state,'pending');
   owner.ctx.db.exec('DROP TRIGGER insertion_receipt_fail');await api.send(req);assert.equal(existsSync(paths(a.asset.id)),false);
  });
  await t.test('draft and published history references retain bytes, including noncurrent published version',async()=>{
   const a=stage(),draft=await api.call('draft.create',{deckId:f.deck.id,initialType:'direct'}),card={deckId:f.deck.id,cardId:draft.cardId};
   const p={assetId:a.asset.id,placementId:crypto.randomUUID(),width:30};
   const saved=await api.call('draft.save',{...card,expectedDraftRevision:draft.revision,expectedPublishedRevision:0,fields:{title:'retained insertion',payload:{encoding:'direct-v1',mode:'direct',fields:{body:'![retained]('+placementUrl(p)+')',source:''}},mediaRefs:[{...p,mime:'image/png',fileName:a.asset.id+'.png',role:'question'}]}});
   await api.call('media.stage.finish',{...scope(a),outcome:'rejected'});assert.ok(existsSync(paths(a.asset.id)));assert.equal((await api.call('media.library.list',{deckId:f.deck.id,query:a.asset.id})).total,1);
   await api.call('card.publish',{...card,expectedDraftRevision:saved.revision,expectedPublishedRevision:0,resetStudyCycle:false});
   const preview=await api.call('draft.previewSwitch',{...card,targetType:'direct'});
   const next=await api.call('draft.save',{...card,expectedDraftRevision:null,expectedPublishedRevision:preview.publishedRevision,fields:{title:'replacement',payload:{encoding:'direct-v1',mode:'direct',fields:{body:'no image now',source:''}},mediaRefs:[]}});
   await api.call('card.publish',{...card,expectedDraftRevision:next.revision,expectedPublishedRevision:preview.publishedRevision,resetStudyCycle:false});
   await reopen();assert.deepEqual(readFileSync(paths(a.asset.id)),png);
   assert.ok(existsSync(paths(f.immutable.id)));assert.ok(existsSync(paths(f.shared.id)));assert.ok(existsSync(paths(f.other.id)));
  });
  await t.test('durable unlink failure is visible and retries on reopen; restored unrelated media is untouched',async()=>{
   const a=stage();finishInsertion(owner.ctx,{...scope(a),outcome:'rejected'});
   finalizeMediaRetirements(owner.ctx,()=>{throw Error('EACCES synthetic unlink boundary');});
   const status=insertionStatus(owner.ctx,scope(a));assert.equal(status.pendingCleanup,1);assert.match(status.lastError!,/EACCES/);assert.ok(existsSync(paths(a.asset.id)));
   await reopen();assert.equal(existsSync(paths(a.asset.id)),false);assert.equal(insertionStatus(owner.ctx,scope(a)).pendingCleanup,0);assert.equal(insertionStatus(owner.ctx,scope(a)).lastError,null);
  });
  await t.test('crash-window lease recovers both staged bytes and bytes written before metadata; accepted and ordinary orphan survive',async()=>{
   const pending=stage(),preMetadata=stage(),accepted=stage();await api.call('media.stage.finish',{...scope(accepted),outcome:'accepted'});
   owner.ctx.db.prepare('DELETE FROM settings WHERE key=?').run('media-draft:'+preMetadata.asset.id);
   const keep=readFileSync(paths(f.orphan.id));await reopen();
   assert.equal(existsSync(paths(pending.asset.id)),false);assert.equal(existsSync(paths(preMetadata.asset.id)),false);
   assert.deepEqual(readFileSync(paths(accepted.asset.id)),png);assert.deepEqual(readFileSync(paths(f.orphan.id)),keep);
  });
  await t.test('opaque recovery reference and changed file are protected; a later successful command retries only a repaired owned file',async()=>{
   const opaque=stage();owner.ctx.db.prepare('INSERT INTO settings VALUES(?,?)').run('synthetic-retained-recovery',JSON.stringify({asset:opaque.asset.id}));
   await api.call('media.stage.finish',{...scope(opaque),outcome:'rejected'});assert.ok(existsSync(paths(opaque.asset.id)));
   const changed=stage();writeFileSync(paths(changed.asset.id),Buffer.from('different bytes'));
   await api.call('media.stage.finish',{...scope(changed),outcome:'rejected'});assert.ok(existsSync(paths(changed.asset.id)));assert.match((await api.call('media.stage.status',scope(changed))).lastError!,/FILE_CHANGED/);
   writeFileSync(paths(changed.asset.id),png);await api.call('preferences.set',await api.call('preferences.get',{}));
   assert.equal(existsSync(paths(changed.asset.id)),false);
   owner.ctx.db.prepare('DELETE FROM settings WHERE key=?').run('synthetic-retained-recovery');
  });
  await t.test('full backup/restore retains published and other-deck bytes while recovering only pending insertion leases',async()=>{
   const a=stage(),keep=readFileSync(paths(f.immutable.id)),other=readFileSync(paths(f.other.id));
   selectedBackup=join(f.root,'lease-backup.zip');await createBackup(owner.ctx.db,owner.ctx.dataDir,selectedBackup);
   const plan=await api.call('storage.restore.open',{});assert.ok(plan);
   const request=api.prepare('storage.restore.confirm',plan.confirmation,plan.confirmation.operationId);await api.send(request);
   assert.equal(existsSync(paths(a.asset.id)),false);assert.deepEqual(readFileSync(paths(f.immutable.id)),keep);assert.deepEqual(readFileSync(paths(f.other.id)),other);
   assert.equal((await api.call('media.stage.status',scope(a))).pendingCleanup,0);
  });
  assert.equal(owner.ctx.db.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');
 }finally{owner.close();rmSync(f.root,{recursive:true,force:true});}
});
