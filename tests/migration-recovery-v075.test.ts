import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { schema604Fixture } from './fixtures/v075-schema604.ts';
import { inspectDatabaseBaseline, inspectLegacyBaseline, prepareMigrationBaseline } from '../electron/infrastructure/migrations/baseline.ts';
import { stageUnifiedModel } from '../electron/infrastructure/migrations/unified-model.ts';
import { prepareAndActivateUnified, openUnifiedOwner, recoverUnifiedMigration } from '../electron/infrastructure/migrations/coordinator.ts';
import { legacyProjectionDigest } from '../electron/infrastructure/migrations/legacy-projection.ts';
import { validateBusinessData } from '../electron/infrastructure/integrity.ts';
import { createBackup, readVerifiedBackup, stageBackup } from '../electron/infrastructure/backup.ts';
import { readContainer, writeContainer } from '../electron/infrastructure/containers.ts';
import { openDatabase, transaction } from '../electron/infrastructure/database.ts';
import { Application } from '../electron/application.ts';
import { createApplicationProtocol } from '../electron/protocol/gateway.ts';
import { createClient } from '../shared/protocol/client.ts';
import { ContentVersion } from '../shared/protocol/unified.ts';
import { contentIdentity } from '../shared/protocol/identity.ts';
import { OWNER_MARKER } from '../electron/infrastructure/write-owner.ts';
import { saveStagedDraft } from '../electron/modules/cards-unified/drafts.ts';

const code=(value:string)=>(e:unknown)=>e instanceof Error && 'code' in e && e.code===value;
function sourceFixture(pending=false) {
  const f=schema604Fixture();if(!pending)f.db.exec("UPDATE platform_operations SET state='completed'");
  return {...f,ctx:{db:f.db,dataDir:f.dataDir,now:()=>new Date(f.at)},control:join(f.root,'coordinator')};
}
async function copyFixture() {
  const source=sourceFixture(),dir=join(source.root,'copy'),archive=join(source.root,'before.zip');
  await prepareMigrationBaseline(source.db,source.dataDir,archive);await stageBackup(archive,dir);
  const path=join(dir,'ganksoft.sqlite'),db=new DatabaseSync(path);db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL');
  return {source,path,ctx:{db,dataDir:dir,now:source.ctx.now},db,stage:()=>stageUnifiedModel({db,dataDir:dir,now:source.ctx.now},source.databasePath),close(){db.close();source.close();}};
}
function logical(db:DatabaseSync) {
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  return JSON.stringify(tables.map(r=>[r.name,db.prepare(`SELECT * FROM "${r.name}" ORDER BY rowid`).all()]));
}
function addNative(db:DatabaseSync,dir:string,deckId:string,at:string) {
  const image='20000000-0000-4000-8000-000000000001.png',assetId=image.slice(0,-4);
  const old=String(db.prepare('SELECT file_name FROM assets LIMIT 1').get()!.file_name);
  writeFileSync(join(dir,'attachments',image),readFileSync(join(dir,'attachments',old)));
  transaction(db,()=>{
    for(const mode of ['question','qa','direct'] as const) {
      const id='native:'+mode,versionId=id+':v1',cycleId=id+':c1';
      const payload=mode==='question'?{encoding:'question-v1',mode,fields:{stem:'新题',material:'',analysis:'',source:'',options:[{optionId:'option:a',position:0,markdown:'A'},{optionId:'option:b',position:1,markdown:'B'}],correctOptionId:'option:a'}}
        :mode==='qa'?{encoding:'qa-v1',mode,fields:{front:'F',back:'B',supplement:'S',source:''}}:{encoding:'direct-v1',mode,fields:{body:'直接记忆',source:''}};
      const document=ContentVersion.parse({versionId,cardId:id,mode,title:mode,availability:'known',payload,
        mediaRefs:mode==='direct'?[{placementId:'native:placement',assetId,fileName:image,mime:'image/png',role:'question',width:30}]:[],publishedAt:at,
        source:{schema:606,kind:'published',key:id,ordinal:null,wireToken:null,rawJson:null}});
      db.prepare('INSERT INTO learning_study_cycles VALUES(?,?,?,\'explicit-relearn\',NULL)').run(cycleId,id,at);
      db.prepare('INSERT INTO learning_cards VALUES(?,?,?,?,?,?,1,NULL,NULL)').run(id,deckId,mode,mode,versionId,cycleId);
      db.prepare('INSERT INTO learning_content_versions VALUES(?,?,?,?)').run(versionId,id,mode,JSON.stringify(document));
      db.prepare('INSERT INTO learning_published_modes VALUES(?,?,?)').run(id,mode,versionId);
    }
  });return image;
}

test('T02 606 repeat/no-op and independent repeated copies preserve every row, identity and media fingerprint',async()=>{
  const f=await copyFixture();
  try {
    const old=inspectLegacyBaseline(f.source.databasePath,f.source.dataDir);
    assert.equal(f.stage().noOp,false);
    const before=inspectDatabaseBaseline(f.path,f.ctx.dataDir),rows=logical(f.db);
    assert.equal(f.stage().noOp,true);assert.equal(f.stage().noOp,true);
    assert.equal(inspectDatabaseBaseline(f.path,f.ctx.dataDir).digest,before.digest);assert.equal(logical(f.db),rows);
    assert.equal(inspectLegacyBaseline(f.source.databasePath,f.source.dataDir).digest,old.digest);
    const second=join(f.source.root,'second');await stageBackup(join(f.source.root,'before.zip'),second);
    const db=new DatabaseSync(join(second,'ganksoft.sqlite'));db.exec('PRAGMA foreign_keys=ON');
    try{stageUnifiedModel({db,dataDir:second,now:f.ctx.now},f.source.databasePath);assert.equal(logical(db),rows);}
    finally{db.close();}
  }finally{f.close();}
});

for(const phase of ['ddl','card','event','before-commit'])test(`T04 model transaction exception at ${phase} rolls back schema/data and retry is exact`,async()=>{
  const f=await copyFixture();try{
    const before=inspectLegacyBaseline(f.path,f.ctx.dataDir).digest;
    assert.throws(()=>stageUnifiedModel(f.ctx,f.source.databasePath,{checkpoint:p=>{if(p===phase)throw Error('injected:'+p);}}),new RegExp('injected:'+phase));
    assert.equal(f.db.isTransaction,false);assert.equal(inspectLegacyBaseline(f.path,f.ctx.dataDir).digest,before);
    assert.equal(f.db.prepare("SELECT name FROM sqlite_master WHERE name='learning_cards'").get(),undefined);
    assert.equal(f.stage().noOp,false);const built=logical(f.db);assert.equal(f.stage().noOp,true);assert.equal(logical(f.db),built);
  }finally{f.close();}
});

for(const phase of ['ddl','card','event','before-commit'])test(`T04 model process exit at ${phase} reopens original WAL transaction state`,async()=>{
  const f=await copyFixture();try{
    const before=inspectLegacyBaseline(f.path,f.ctx.dataDir).digest;
    const module=new URL('../electron/infrastructure/migrations/unified-model.ts',import.meta.url).href;
    const script=`import {DatabaseSync} from 'node:sqlite';import {stageUnifiedModel} from ${JSON.stringify(module)};
      const db=new DatabaseSync(process.argv[1]);db.exec('PRAGMA foreign_keys=ON;PRAGMA journal_mode=WAL');
      stageUnifiedModel({db,dataDir:process.argv[2],now:()=>new Date()},process.argv[3],{checkpoint:p=>{if(p===process.argv[4])process.exit(43);}});`;
    const child=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',script,f.path,f.ctx.dataDir,f.source.databasePath,phase],{encoding:'utf8',timeout:30000});
    assert.equal(child.status,43,child.stderr);assert.equal(inspectLegacyBaseline(f.path,f.ctx.dataDir).digest,before);
    f.stage();assert.equal(f.stage().noOp,true);
  }finally{f.close();}
});

test('T02/T03 full 604 and 606 backups restore all tables, unknown facts, mixed modes, media-only archives and drafts',async()=>{
  const f=await copyFixture();try{
    const old=inspectLegacyBaseline(f.path,f.ctx.dataDir);assert.equal(old.digest,inspectLegacyBaseline(f.source.databasePath,f.source.dataDir).digest);
    f.stage();
    const mixedDeck='native:mixed-deck';f.db.prepare("INSERT INTO decks(id,name,kind) VALUES(?,'三模式新集','question')").run(mixedDeck);
    const image=addNative(f.db,f.ctx.dataDir,mixedDeck,f.source.at);
    assert.deepEqual(new Set(f.db.prepare('SELECT published_type FROM learning_cards WHERE deck_id=?').all(mixedDeck).map(r=>r.published_type)),new Set(['question','qa','direct']));
    assert.equal(f.db.prepare('SELECT deck_id FROM learning_cards WHERE id=?').get(f.source.ids.question)?.deck_id,f.source.ids.qDeck);
    assert.equal(f.db.prepare('SELECT deck_id FROM learning_cards WHERE id=?').get(f.source.ids.memory)?.deck_id,f.source.ids.mDeck);
    saveStagedDraft(f.ctx,{cardId:'native:qa',draftType:'qa',payload:{encoding:'qa-v1',mode:'qa',fields:{front:'草稿问题',back:'未发布答案',supplement:'草稿补充',source:''}},revision:1,basePublishedRevision:1,updatedAt:f.source.at},null);
    validateBusinessData(f.db);
    const before=inspectDatabaseBaseline(f.path,f.ctx.dataDir),rows=logical(f.db),file=join(f.source.root,'606.zip');
    assert.ok(before.references.some(r=>r.fileName===image&&r.owner.startsWith('versions/')));
    const recovery=await prepareMigrationBaseline(f.db,f.ctx.dataDir,file);
    assert.equal(recovery.baseline.digest,before.digest);assert.equal((await readVerifiedBackup(file)).manifest.schemaVersion,606);
    const restored=join(f.source.root,'restored606');assert.equal((await stageBackup(file,restored)).schemaVersion,606);
    assert.equal(inspectDatabaseBaseline(join(restored,'ganksoft.sqlite'),restored).digest,before.digest);
    const db=new DatabaseSync(join(restored,'ganksoft.sqlite'),{readOnly:true});try{assert.equal(logical(db),rows);validateBusinessData(db);}finally{db.close();}
    assert.equal(f.stage().noOp,true);assert.equal(logical(f.db),rows);
    assert.throws(()=>openDatabase(f.path),/不能打开或迁移/,'uncoordinated 606 is still fenced');
    const restoredDb=new DatabaseSync(join(restored,'ganksoft.sqlite'));
    try{
      const control=join(f.source.root,'mixed-restored-control');
      await prepareAndActivateUnified({db:restoredDb,dataDir:restored,now:f.ctx.now},control);
      const owner=openUnifiedOwner(control);
      try{
        const gateway=createApplicationProtocol(new Application({...owner,now:f.ctx.now})),client=createClient(r=>gateway.execute(r));
        await client.call('app.capabilities',{});
        const summary=await client.call('card.listSummary',{deckId:mixedDeck});
        assert.deepEqual(new Set(summary.items.map(r=>r.publishedType)),new Set(['question','qa','direct']));
        const direct=await client.call('card.getPublishedContent',{deckId:mixedDeck,cardId:'native:direct'});
        assert.equal(direct.mode,'direct');assert.equal(direct.mediaRefs[0].width,30);
        assert.equal(owner.db.prepare('SELECT count(*) AS n FROM learning_card_drafts').get()?.n,1);
      }finally{owner.close();}
    }finally{restoredDb.close();}
  }finally{f.close();}
});

for(const missing of ['historicalImage','responseImage','unboundImage','versionOnly'] as const)test(`T04 606 valid-checksum backup rejects missing ${missing} reference`,async()=>{
  const f=await copyFixture();try{
    f.stage();const versionOnly=addNative(f.db,f.ctx.dataDir,f.source.ids.qDeck,f.source.at);
    const file=join(f.source.root,'606.zip');await createBackup(f.db,f.ctx.dataDir,file);
    const files=await readContainer(file),name='attachments/'+(missing==='versionOnly'?versionOnly:f.source.ids[missing]+'.png');
    const manifest=JSON.parse(files.get('manifest.json')!.toString());files.delete(name);manifest.entries=manifest.entries.filter((e:{name:string})=>e.name!==name);
    files.set('manifest.json',Buffer.from(JSON.stringify(manifest)));await writeContainer(file,files);
    const target=join(f.source.root,'invalid');await assert.rejects(stageBackup(file,target),/图片缺失|引用图片|缺少题目图片/);
    assert.equal(existsSync(target),false);assert.ok(existsSync(join(f.ctx.dataDir,name)));
  }finally{f.close();}
});

test('T04 manifest/schema mismatch, changed immutable guards and existing restore targets fail closed',async()=>{
  const f=await copyFixture();try{
    f.stage();const file=join(f.source.root,'606.zip');await createBackup(f.db,f.ctx.dataDir,file);
    const files=await readContainer(file),manifest=JSON.parse(files.get('manifest.json')!.toString());manifest.schemaVersion=604;
    files.set('manifest.json',Buffer.from(JSON.stringify(manifest)));await writeContainer(file,files);
    await assert.rejects(stageBackup(file,join(f.source.root,'wrong-version')),/版本\/标识/);
    const target=join(f.source.root,'existing');mkdirSync(target);writeFileSync(join(target,'keep'),'keep');
    await assert.rejects(stageBackup(file,target),code('EEXIST'));assert.equal(readFileSync(join(target,'keep'),'utf8'),'keep');
    f.db.exec('DROP TRIGGER learning_review_events_immutable_update');
    assert.throws(()=>validateBusinessData(f.db),/结构\/不可变约束/);
    await createBackup(f.db,f.ctx.dataDir,join(f.source.root,'damaged.zip'));
    await assert.rejects(stageBackup(join(f.source.root,'damaged.zip'),join(f.source.root,'damaged')),/结构\/不可变约束/);
  }finally{f.close();}
});

test('T02/T04 coordinated activation freezes source, renews epoch, preserves history, and fences all old handles',async()=>{
  const f=sourceFixture();let owner:ReturnType<typeof openUnifiedOwner>|undefined;
  try{
    const oldGateway=createApplicationProtocol(new Application(f.ctx)),oldClient=createClient(r=>oldGateway.execute(r));await oldClient.call('app.capabilities',{});
    const stale=oldClient.prepare('messages.read',{}),before=inspectLegacyBaseline(f.databasePath,f.dataDir);
    const result=await prepareAndActivateUnified(f.ctx,f.control,{checkpoint:phase=>{
      if(phase==='frozen'){
        assert.throws(()=>transaction(f.db,()=>f.db.exec("UPDATE questions SET title='forbidden'")),code('MIGRATION_WRITE_FENCED'));
        assert.throws(()=>openDatabase(f.databasePath),code('MIGRATION_WRITE_FENCED'));
        const external=new DatabaseSync(f.databasePath);external.exec('PRAGMA busy_timeout=0');
        try{assert.throws(()=>external.exec("UPDATE questions SET title='external forbidden'"),/locked|busy/);}finally{external.close();}
      }
    }});
    assert.equal(result.state,'committed');assert.notEqual(result.epoch,stale.dataEpoch);
    assert.equal(inspectLegacyBaseline(f.databasePath,f.dataDir).digest,before.digest);
    await assert.rejects(oldClient.call('messages.read',{}),code('MIGRATION_WRITE_FENCED'));
    assert.throws(()=>f.db.exec("UPDATE questions SET title='raw forbidden'"),/readonly/);
    assert.throws(()=>openDatabase(join(result.activeDir,'ganksoft.sqlite')),code('MIGRATION_WRITE_FENCED'));
    owner=openUnifiedOwner(f.control);const client=createClient(r=>createApplicationProtocol(new Application({...owner!,now:f.ctx.now})).execute(r));
    await client.call('app.capabilities',{});
    const gateway=createApplicationProtocol(new Application({...owner,now:f.ctx.now}));const rejected=await gateway.execute(stale);
    assert.equal(rejected.ok,false);if(!rejected.ok)assert.equal(rejected.error.code,'DATA_EPOCH_CHANGED');
    assert.throws(()=>openUnifiedOwner(f.control),code('EEXIST'));
    await assert.rejects(recoverUnifiedMigration(f.control),code('MIGRATION_BUSY'));
    const ownerModule=new URL('../electron/infrastructure/migrations/coordinator.ts',import.meta.url).href;
    const contender=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',
      `import {openUnifiedOwner} from ${JSON.stringify(ownerModule)};try{openUnifiedOwner(process.argv[1]);process.exit(3);}catch(e){if(e.code==='EEXIST')process.exit(0);throw e;}`,f.control],{encoding:'utf8',timeout:30000});
    assert.equal(contender.status,0,contender.stderr);
    const summary=await client.call('card.listSummary',{deckId:f.ids.qDeck});
    assert.equal(summary.items[0].cardId,f.ids.question);
    validateBusinessData(owner.db);
    owner.close();owner=undefined;
    assert.equal((await recoverUnifiedMigration(f.control)).state,'committed');
    owner=openUnifiedOwner(f.control);validateBusinessData(owner.db);
  }finally{owner?.close();f.close();}
});

test('T02 single legacy transaction updates projection/watermark/receipt once; adapter fault rolls back all writes',async()=>{
  const f=sourceFixture();let owner:ReturnType<typeof openUnifiedOwner>|undefined;let inject=false,partialInject=false;
  try{
    await prepareAndActivateUnified(f.ctx,f.control);owner=openUnifiedOwner(f.control,()=>{if(inject)throw Error('adapter injected');},p=>{if(partialInject&&p==='card')throw Error('partial adapter injected');});
    const gateway=createApplicationProtocol(new Application({...owner,now:f.ctx.now})),client=createClient(r=>gateway.execute(r));await client.call('app.capabilities',{});
    const originalEvents=owner.db.prepare('SELECT * FROM learning_review_events ORDER BY id').all();
    const input={id:f.ids.question,expectedRevision:1,deckId:f.ids.qDeck,title:'旧入口同步更新',stem:'新正文',options:'A\nB\nC\nD',answer:'B' as const,analysis:'新解析',source:'',initialThought:'',knowledgeIds:[f.ids.child1]};
    const request=client.prepare('content.question.save',input);
    await client.send(request);const after=logical(owner.db);await client.send(request);assert.equal(logical(owner.db),after);
    const read=await client.call('card.getPublishedContent',{deckId:f.ids.qDeck,cardId:f.ids.question});assert.equal(read.title,input.title);
    assert.equal(owner.db.prepare('SELECT legacy_digest FROM learning_owner').get()?.legacy_digest,legacyProjectionDigest(owner.db));
    assert.equal(owner.db.prepare('SELECT revision FROM learning_owner').get()?.revision,owner.db.prepare('SELECT revision FROM protocol_meta').get()?.revision);
    inject=true;const failed=client.prepare('content.question.save',{...input,expectedRevision:2,title:'不得提交'});
    await assert.rejects(client.send(failed),/adapter injected/);inject=false;assert.equal(logical(owner.db),after);
    assert.equal(owner.db.prepare('SELECT 1 FROM protocol_receipts WHERE request_id=?').get(failed.requestId),undefined);
    partialInject=true;const partial=client.prepare('content.question.save',{...input,expectedRevision:2,title:'投影中途失败'});
    await assert.rejects(client.send(partial),/partial adapter injected/);partialInject=false;
    assert.equal(logical(owner.db),after);assert.equal(owner.db.prepare('SELECT 1 FROM protocol_receipts WHERE request_id=?').get(partial.requestId),undefined);
    const requestId=randomUUID(),review=client.prepare('review.memory.submit',{kind:'memory',deckId:f.ids.mDeck,cardId:f.ids.memory,contentVersion:contentIdentity(f.ids.memory,2),rating:'good',requestId},requestId);
    await client.send(review);const withEvent=logical(owner.db);await client.send(review);assert.equal(logical(owner.db),withEvent);
    assert.equal(owner.db.prepare('SELECT count(*) AS n FROM learning_review_events').get()?.n,5);
    for(const row of originalEvents)assert.deepEqual(owner.db.prepare('SELECT * FROM learning_review_events WHERE id=?').get(row.id!),row);
    assert.throws(()=>transaction(owner!.db,()=>owner!.db.prepare('DELETE FROM attempts WHERE id=?').run(f.ids.attempt1)),/FOREIGN KEY|不能删除/);
    validateBusinessData(owner.db);
    owner.close();owner=undefined;owner=openUnifiedOwner(f.control);validateBusinessData(owner.db);
    const file=join(f.root,'active606.zip');await createBackup(owner.db,owner.dataDir,file);
    const restored=join(f.root,'restored-active606');await stageBackup(file,restored);
    const db=new DatabaseSync(join(restored,'ganksoft.sqlite'));db.exec('PRAGMA foreign_keys=ON;PRAGMA journal_mode=WAL');
    try{
      const nextControl=join(f.root,'restored-control');const next=await prepareAndActivateUnified({db,dataDir:restored,now:f.ctx.now},nextControl);
      assert.notEqual(next.epoch,owner.epoch);const restoredOwner=openUnifiedOwner(nextControl);try{validateBusinessData(restoredOwner.db);assert.equal(restoredOwner.db.prepare('SELECT count(*) AS n FROM learning_review_events').get()?.n,5);}finally{restoredOwner.close();}
    }finally{db.close();}
  }finally{owner?.close();f.close();}
});

for(const phase of ['frozen','source-backed-up','model:card','model:event','model:before-commit','model-ready','prepared','pointer','committed'])test(`T04 process interruption at ${phase} recovers exactly one active path and reopens`,async()=>{
  const f=sourceFixture();try{
    const before=inspectLegacyBaseline(f.databasePath,f.dataDir).digest;
    const module=new URL('../electron/infrastructure/migrations/coordinator.ts',import.meta.url).href;
    const script=`import {DatabaseSync} from 'node:sqlite';import {prepareAndActivateUnified} from ${JSON.stringify(module)};
      const db=new DatabaseSync(process.argv[1]);db.exec('PRAGMA foreign_keys=ON;PRAGMA journal_mode=WAL');
      await prepareAndActivateUnified({db,dataDir:process.argv[2],now:()=>new Date()},process.argv[3],{checkpoint:p=>{if(p===process.argv[4])process.exit(47);}});`;
    const child=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',script,f.databasePath,f.dataDir,f.control,phase],{encoding:'utf8',timeout:30000});
    assert.equal(child.status,47,child.stderr);assert.equal(inspectLegacyBaseline(f.databasePath,f.dataDir).digest,before);
    const result=await recoverUnifiedMigration(f.control),committed=['pointer','committed'].includes(phase);
    assert.equal(result.state,committed?'committed':'aborted');
    assert.equal((await recoverUnifiedMigration(f.control)).state,result.state);
    if(committed){assert.throws(()=>openDatabase(f.databasePath),code('MIGRATION_WRITE_FENCED'));const owner=openUnifiedOwner(f.control);try{validateBusinessData(owner.db);}finally{owner.close();}}
    else{const original=openDatabase(f.databasePath);original.close();assert.equal(existsSync(join(f.dataDir,OWNER_MARKER)),false);assert.throws(()=>openUnifiedOwner(f.control),code('MIGRATION_NOT_ACTIVATED'));}
  }finally{f.close();}
});

test('T04 pending operation, target errors and precommit failure retain recoverable source without overwriting files',async()=>{
  const f=sourceFixture(true);try{
    await assert.rejects(prepareAndActivateUnified(f.ctx,f.control),code('MIGRATION_OPERATION_PENDING'));assert.equal(existsSync(f.control),false);
    f.db.exec("UPDATE platform_operations SET state='acknowledged'");
    const before=inspectLegacyBaseline(f.databasePath,f.dataDir).digest;
    const target=join(f.root,'existing-file');writeFileSync(target,'keep');await assert.rejects(prepareAndActivateUnified(f.ctx,target),code('MIGRATION_DESTINATION_INVALID'));assert.equal(readFileSync(target,'utf8'),'keep');
    await assert.rejects(prepareAndActivateUnified(f.ctx,f.control,{checkpoint:phase=>{if(phase==='source-backed-up')throw Object.assign(Error('simulated disk full'),{code:'ENOSPC'});}}),code('ENOSPC'));
    assert.equal(inspectLegacyBaseline(f.databasePath,f.dataDir).digest,before);assert.equal(existsSync(join(f.dataDir,OWNER_MARKER)),false);
    transaction(f.db,()=>f.db.exec("UPDATE questions SET project_note='source still writable'"));
    const retry=await prepareAndActivateUnified(f.ctx,join(f.root,'retry'));assert.equal(retry.state,'committed');
  }finally{f.close();}
});

test('T04 committed target loss or epoch tampering never falls back to the retained source',async()=>{
  const f=sourceFixture();let owner:ReturnType<typeof openUnifiedOwner>|undefined;try{
    await prepareAndActivateUnified(f.ctx,f.control);owner=openUnifiedOwner(f.control);
    const pointer=join(f.control,'active.json'),original=readFileSync(pointer,'utf8');
    writeFileSync(pointer,JSON.stringify({...JSON.parse(original),epoch:randomUUID()}));
    assert.throws(()=>transaction(owner!.db,()=>owner!.db.exec("UPDATE questions SET title='forbidden'")),code('DATA_EPOCH_CHANGED'));
    writeFileSync(pointer,original);owner.close();owner=undefined;
    renameSync(join(f.control,'target'),join(f.control,'missing-target'));
    await assert.rejects(recoverUnifiedMigration(f.control));assert.throws(()=>openDatabase(f.databasePath),code('MIGRATION_WRITE_FENCED'));
    assert.equal(JSON.parse(readFileSync(pointer,'utf8')).state,'target');
  }finally{owner?.close();f.close();}
});

test('T04 actual target-file EEXIST during extraction preserves foreign file and unfreezes source',async()=>{
  const f=sourceFixture();try{
    const before=inspectLegacyBaseline(f.databasePath,f.dataDir).digest;
    await assert.rejects(prepareAndActivateUnified(f.ctx,f.control,{checkpoint:p=>{if(p==='source-backed-up')writeFileSync(join(f.control,'target'),'foreign file');}}),code('EEXIST'));
    assert.equal(readFileSync(join(f.control,'target'),'utf8'),'foreign file');
    assert.equal(inspectLegacyBaseline(f.databasePath,f.dataDir).digest,before);
    assert.equal((await recoverUnifiedMigration(f.control)).state,'aborted');
    transaction(f.db,()=>f.db.exec("UPDATE questions SET project_note='recovered'"));
  }finally{f.close();}
});

test('T04 exception after the pointer commit reports committed and never reopens source writes',async()=>{
  const f=sourceFixture();try{
    await assert.rejects(prepareAndActivateUnified(f.ctx,f.control,{checkpoint:p=>{if(p==='pointer')throw Error('response lost after commit');}}),code('MIGRATION_COMMITTED'));
    assert.equal((await recoverUnifiedMigration(f.control)).state,'committed');
    assert.throws(()=>openDatabase(f.databasePath),code('MIGRATION_WRITE_FENCED'));
    const owner=openUnifiedOwner(f.control);try{validateBusinessData(owner.db);}finally{owner.close();}
  }finally{f.close();}
});
