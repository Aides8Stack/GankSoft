import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync, backup } from 'node:sqlite';
import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { schema604Fixture } from './fixtures/v075-schema604.ts';
import { inspectLegacyBaseline } from '../electron/infrastructure/migrations/baseline.ts';
import { stageUnifiedModel } from '../electron/infrastructure/migrations/unified-model.ts';
import { getPublishedContent, listSummary } from '../electron/modules/cards-unified/queries.ts';
import { saveStagedDraft } from '../electron/modules/cards-unified/drafts.ts';
import { CardDraft, ContentPayload, ContentVersion, ReviewEvent, SummaryInput } from '../shared/protocol/unified.ts';
import { contentIdentity } from '../shared/protocol/identity.ts';
import { Application } from '../electron/application.ts';
import { createApplicationProtocol } from '../electron/protocol/gateway.ts';
import { createClient } from '../shared/protocol/client.ts';
import { registry } from '../shared/protocol/registry.ts';
import { PROTOCOL } from '../shared/protocol/data.ts';
import { randomUUID } from 'node:crypto';
import { transaction } from '../electron/infrastructure/database.ts';

async function fixture(pending = false) {
  const source = schema604Fixture();
  if (!pending) source.db.exec("UPDATE platform_operations SET state='completed'");
  const dir = join(source.root, 'staged'); mkdirSync(dir);
  const path = join(dir, 'ganksoft.sqlite');
  await backup(source.db, path);
  cpSync(join(source.dataDir, 'attachments'), join(dir, 'attachments'), { recursive: true });
  const db = new DatabaseSync(path); db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL');
  const ctx = { db, dataDir: dir, now: () => new Date(source.at) };
  return { source, db, ctx, path, stage: () => stageUnifiedModel(ctx, source.databasePath), close() { db.close(); source.close(); } };
}
const code = (name: string) => (e: unknown) => e instanceof Error && 'code' in e && e.code === name;
const page = (deckId: string, extra = {}) => SummaryInput.parse({ deckId, ...extra });
function documents(db: DatabaseSync, table: string) {
  return db.prepare(`SELECT document FROM ${table} ORDER BY id`).all().map(r => JSON.parse(String(r.document)));
}

test('S1.b staged model preserves all legacy tables, raw scores, unknown facts and media', async () => {
  const f = await fixture();
  try {
    const before = inspectLegacyBaseline(f.source.databasePath, f.source.dataDir);
    const result = f.stage();
    assert.equal(result.schemaVersion, 606); assert.equal(result.state, 'staged');
    assert.equal(result.cards, 3); assert.equal(result.events, 4); assert.equal(result.cycles, 5);
    assert.equal(inspectLegacyBaseline(f.source.databasePath, f.source.dataDir).digest, before.digest);
    for (const table of before.tables) {
      // Compare every original row, including protocol/FSRS/recycle/session/sequence, not just counts.
      const old = f.source.db.prepare(`SELECT * FROM "${table.name}" ORDER BY rowid`).all();
      assert.deepEqual(f.db.prepare(`SELECT * FROM "${table.name}" ORDER BY rowid`).all(), old, table.name);
    }
    for (const media of before.media) assert.deepEqual(readFileSync(join(f.ctx.dataDir,'attachments',media.name)), readFileSync(join(f.source.dataDir,'attachments',media.name)));
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM learning_card_drafts').get()?.n, 0, 'session drafts are not editing drafts');
    const events = documents(f.db, 'learning_review_events').map(e => ReviewEvent.parse(e));
    assert.deepEqual(events.map(e => e.eventId).sort(), [f.source.ids.attempt1,f.source.ids.attempt2,f.source.ids.memoryReview1,f.source.ids.memoryReview2].sort());
    assert.equal(events.find(e => e.eventId === f.source.ids.attempt1)?.legacySelfScore, 9.3);
    assert.ok(events.every(e => e.scoreTenths === null && e.rating === null && e.legacyScale === '0-4'));
    assert.equal(events.find(e => e.eventId === f.source.ids.memoryReview1)?.deckIdAtEvent, null);
    const failed = events.find(e => e.eventId === f.source.ids.attempt2)!;
    assert.equal(JSON.parse(failed.legacyRaw!).faults[0].knowledge_snapshot, '当时名称');
    const versions = documents(f.db, 'learning_content_versions').map(v => ContentVersion.parse(v));
    assert.equal(versions.length, 7);
    assert.equal(versions.find(v => v.source.key === f.source.ids.attempt2)?.availability, 'unknown');
    assert.equal(versions.find(v => v.source.key === f.source.ids.attempt2)?.payload, null);
    assert.equal(versions.find(v => v.source.key === f.source.ids.memoryReview2)?.availability, 'partial');
    const oldQ = versions.find(v => v.source.key === f.source.ids.attempt1)!;
    assert.ok(oldQ.source.rawJson!.includes('历史120增长20%'));
    assert.deepEqual(oldQ.mediaRefs.map(m => m.assetId), [f.source.ids.historicalImage,f.source.ids.responseImage]);
    assert.ok(oldQ.mediaRefs.every(m => m.width === null));
    assert.equal(f.db.prepare('PRAGMA integrity_check').get()?.integrity_check, 'ok');
    assert.deepEqual(f.db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { f.close(); }
});

test('S1.b pending operations, source reuse and unknown same-version structures reject before DDL', async () => {
  const f = await fixture(true);
  try {
    assert.throws(f.stage, code('MIGRATION_OPERATION_PENDING'));
    assert.equal(f.db.prepare('PRAGMA user_version').get()?.user_version, 604);
    assert.equal(f.db.prepare("SELECT name FROM sqlite_master WHERE name='learning_cards'").get(), undefined);
    assert.throws(() => stageUnifiedModel({ ...f.ctx, db: f.source.db, dataDir: f.source.dataDir }, f.source.databasePath), code('MIGRATION_STAGING_REQUIRED'));
    f.db.exec("UPDATE platform_operations SET state='completed'; CREATE TABLE unexpected_private_extension(id TEXT)");
    assert.throws(f.stage, code('MIGRATION_SCHEMA_UNSUPPORTED'));
  } finally { f.close(); }
});

test('S1.b immutable versions/cycles/events and cross-card/mode references are database constraints', async () => {
  const f = await fixture();
  try {
    f.stage();
    for (const table of ['learning_content_versions','learning_study_cycles','learning_review_events']) {
      assert.throws(() => f.db.exec(`UPDATE ${table} SET id=id`), /immutable/);
      assert.throws(() => f.db.exec(`DELETE FROM ${table}`), /immutable/);
    }
    const other = f.db.prepare('SELECT current_version_id,current_cycle_id FROM learning_cards WHERE id=?').get(f.source.ids.memory)!;
    assert.throws(() => transaction(f.db, () => f.db.prepare('UPDATE learning_cards SET current_version_id=? WHERE id=?').run(other.current_version_id!, f.source.ids.question)), /FOREIGN KEY/);
    assert.throws(() => transaction(f.db, () => f.db.prepare('UPDATE learning_cards SET current_cycle_id=? WHERE id=?').run(other.current_cycle_id!, f.source.ids.question)), /FOREIGN KEY/);
    assert.throws(() => f.db.prepare('INSERT INTO learning_published_modes VALUES(?,?,?)').run(f.source.ids.question,'qa',other.current_version_id!), /FOREIGN KEY/);
    const event = f.db.prepare('SELECT * FROM learning_review_events LIMIT 1').get()!;
    assert.throws(() => f.db.prepare('INSERT INTO learning_review_events VALUES(?,?,?,?,?,?,?)').run(...Object.values(event) as (string|number|null)[]), /UNIQUE/);
  } finally { f.close(); }
});

test('S1.b single-mode draft CAS rejects stale revisions and implicit type changes without publishing', async () => {
  const f = await fixture();
  try {
    f.stage();
    const cardId = f.source.ids.question;
    const draft = CardDraft.parse({ cardId, draftType:'qa', payload:{ encoding:'qa-v1',mode:'qa',fields:{front:'问',back:'答',supplement:'补',source:''}}, revision:1,basePublishedRevision:1,updatedAt:f.source.at });
    const before = f.db.prepare('SELECT * FROM learning_cards WHERE id=?').get(cardId);
    saveStagedDraft(f.ctx, draft, null);
    assert.throws(() => saveStagedDraft(f.ctx,draft,null), code('DRAFT_REVISION_CONFLICT'));
    assert.throws(() => saveStagedDraft(f.ctx,{...draft,revision:2,basePublishedRevision:99},1), code('CONTENT_VERSION_CONFLICT'));
    const direct = { ...draft,revision:2,draftType:'direct' as const,payload:{encoding:'direct-v1' as const,mode:'direct' as const,fields:{body:'另一类型',source:''}} };
    assert.throws(() => saveStagedDraft(f.ctx,direct,1), code('DRAFT_MODE_CONFLICT'));
    saveStagedDraft(f.ctx,{...draft,revision:2},1);
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM learning_card_drafts WHERE card_id=?').get(cardId)?.n,1);
    assert.deepEqual(f.db.prepare('SELECT * FROM learning_cards WHERE id=?').get(cardId),before);
    assert.throws(() => f.db.prepare('INSERT INTO learning_card_drafts VALUES(?,?,?,?,?,?)').run(cardId,'qa',JSON.stringify(draft.payload),3,1,f.source.at), /UNIQUE/);
    assert.throws(() => f.db.prepare("UPDATE learning_card_drafts SET mode='direct' WHERE card_id=?").run(cardId), /CHECK/);
  } finally { f.close(); }
});

test('S1.b mixed deck holds three independent published modes; current pointer and per-mode archives remain separate', async () => {
  const f = await fixture();
  try {
    f.stage();
    const cardId=f.source.ids.question;
    const current=f.db.prepare('SELECT * FROM learning_cards WHERE id=?').get(cardId)!;
    for (const mode of ['qa','direct'] as const) {
      const payload = mode==='qa' ? {encoding:'qa-v1',mode,fields:{front:'F',back:'B',supplement:'',source:''}} : {encoding:'direct-v1',mode,fields:{body:'D',source:''}};
      const doc=ContentVersion.parse({versionId:'test:'+mode,cardId,mode,title:mode,availability:'known',payload,mediaRefs:[],publishedAt:f.source.at,source:{schema:606,kind:'published',key:cardId,ordinal:null,wireToken:null,rawJson:null}});
      f.db.prepare('INSERT INTO learning_content_versions VALUES(?,?,?,?)').run(doc.versionId,cardId,mode,JSON.stringify(doc));
      f.db.prepare('INSERT INTO learning_published_modes VALUES(?,?,?)').run(cardId,mode,doc.versionId);
    }
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM learning_published_modes WHERE card_id=?').get(cardId)?.n,3);
    // A deck's old kind does not constrain the unified card model.
    f.db.prepare('UPDATE learning_cards SET deck_id=? WHERE id=?').run(f.source.ids.qDeck,f.source.ids.memory);
    const items=listSummary(f.ctx,page(f.source.ids.qDeck)).items;
    assert.deepEqual(new Set(items.map(i=>i.publishedType)),new Set(['question','qa']));
    // A third independently scheduled card can coexist in that very same deck.
    const nativeId='native:direct', nativeVersion='native:direct:v1', nativeCycle='native:direct:c1';
    transaction(f.db,()=>{
      f.db.prepare('INSERT INTO learning_study_cycles VALUES(?,?,?,\'explicit-relearn\',NULL)').run(nativeCycle,nativeId,f.source.at);
      f.db.prepare('INSERT INTO learning_cards VALUES(?,?,?,?,?,?,?,NULL,NULL)').run(nativeId,f.source.ids.qDeck,'直接记忆','direct',nativeVersion,nativeCycle,1);
      const doc=ContentVersion.parse({versionId:nativeVersion,cardId:nativeId,mode:'direct',title:'直接记忆',availability:'known',payload:{encoding:'direct-v1',mode:'direct',fields:{body:'独立正文',source:''}},mediaRefs:[],publishedAt:f.source.at,source:{schema:606,kind:'published',key:nativeId,ordinal:null,wireToken:null,rawJson:null}});
      f.db.prepare('INSERT INTO learning_content_versions VALUES(?,?,?,?)').run(nativeVersion,nativeId,'direct',JSON.stringify(doc));
      f.db.prepare('INSERT INTO learning_published_modes VALUES(?,?,?)').run(nativeId,'direct',nativeVersion);
    });
    assert.deepEqual(new Set(listSummary(f.ctx,page(f.source.ids.qDeck)).items.map(i=>i.publishedType)),new Set(['question','qa','direct']));
    f.db.prepare("UPDATE learning_cards SET published_type='direct',current_version_id='test:direct' WHERE id=?").run(cardId);
    assert.equal(getPublishedContent(f.ctx,{cardId,deckId:f.source.ids.qDeck}).mode,'direct');
    const archived=getPublishedContent(f.ctx,{cardId,deckId:f.source.ids.qDeck,versionId:String(current.current_version_id)});
    assert.equal(archived.mode,'question');
    assert.equal(getPublishedContent(f.ctx,{cardId,deckId:f.source.ids.qDeck,versionId:'test:qa'}).mode,'qa');
    assert.equal(f.db.prepare('SELECT current_cycle_id FROM learning_cards WHERE id=?').get(cardId)?.current_cycle_id,current.current_cycle_id);
    assert.deepEqual(new Set(listSummary(f.ctx,page(f.source.ids.qDeck)).items.map(i=>i.publishedType)),new Set(['direct','qa']));
  } finally { f.close(); }
});

test('S1.b historical version aliases are card-scoped and ambiguous ordinals never choose a snapshot', async () => {
  const f=await fixture();
  try {
    f.stage(); const cardId=f.source.ids.question,deckId=f.source.ids.qDeck;
    assert.throws(()=>getPublishedContent(f.ctx,{cardId,deckId,versionId:contentIdentity(cardId,1)}),code('CONTENT_VERSION_AMBIGUOUS'));
    const item=f.db.prepare('SELECT version_id FROM learning_review_events WHERE id=?').get(f.source.ids.attempt1)!;
    assert.equal(getPublishedContent(f.ctx,{cardId,deckId,versionId:String(item.version_id)}).source.key,f.source.ids.attempt1);
    assert.throws(()=>getPublishedContent(f.ctx,{cardId,deckId,versionId:contentIdentity(f.source.ids.memory,2)}),code('CONTENT_VERSION_NOT_FOUND'));
    assert.throws(()=>getPublishedContent(f.ctx,{cardId,deckId:f.source.ids.mDeck}),code('DECK_CONFLICT'));
    assert.throws(()=>createApplicationProtocol(new Application(f.ctx)),code('MIGRATION_NOT_ACTIVATED'));
  } finally { f.close(); }
});

test('S1.b payload codecs reject duplicate options, invalid answers, mixed modes and fractional scores', () => {
  const payload={encoding:'question-v1',mode:'question',fields:{stem:'Q',material:'',analysis:'',source:'',options:[{optionId:'a',position:0,markdown:'A'},{optionId:'b',position:1,markdown:'B'}],correctOptionId:'b'}};
  assert.ok(ContentPayload.safeParse(payload).success);
  assert.ok(!ContentPayload.safeParse({...payload,fields:{...payload.fields,correctOptionId:'c'}}).success);
  assert.ok(!ContentPayload.safeParse({...payload,fields:{...payload.fields,options:[payload.fields.options[0],payload.fields.options[0]]}}).success);
  assert.ok(!ContentPayload.safeParse({...payload,fields:{...payload.fields,options:[{...payload.fields.options[0],position:1},payload.fields.options[1]]}}).success);
  assert.ok(!ContentPayload.safeParse({...payload,mode:'qa'}).success);
  assert.ok(!ContentPayload.safeParse({...payload,qa:{front:'hidden'}}).success);
  assert.ok(!ReviewEvent.shape.scoreTenths.safeParse(8.3).success);
  assert.ok(ReviewEvent.shape.scoreTenths.safeParse(100).success);
});

test('S1.b new event storage accepts independent objective result and score without enabling new grading', async () => {
  const f=await fixture();
  try {
    f.stage();
    const card=f.db.prepare('SELECT * FROM learning_cards WHERE id=?').get(f.source.ids.question)!;
    const event=ReviewEvent.parse({eventId:'new:event',cardId:card.id,deckIdAtEvent:card.deck_id,contentVersionId:card.current_version_id,cycleId:card.current_cycle_id,mode:'question',createdAt:f.source.at,
      scoreTenths:100,objectiveCorrect:false,rating:'again',mappingVersion:'future-test-only',engineVersion:'test',legacyScale:null,legacyScore:null,legacySelfScore:null,legacyRating:null,legacyRaw:null,knowledgeSnapshot:null});
    f.db.prepare('INSERT INTO learning_review_events VALUES(?,?,?,?,?,?,?)').run(event.eventId,event.cardId,event.contentVersionId,event.cycleId,event.mode,event.createdAt,JSON.stringify(event));
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM attempts').get()?.n,2, 'no legacy scoring or scheduler writes');
    assert.throws(()=>f.db.prepare('INSERT INTO learning_review_events VALUES(?,?,?,?,?,?,?)').run('bad:event',event.cardId,event.contentVersionId,event.cycleId,event.mode,event.createdAt,JSON.stringify({...event,eventId:'bad:event',scoreTenths:101})),/CHECK/);
    const plan=f.db.prepare('EXPLAIN QUERY PLAN SELECT id,title FROM learning_cards WHERE deck_id=? AND deleted_at IS NULL AND published_type=? AND id>? ORDER BY id LIMIT 51').all(f.source.ids.qDeck,'question','');
    assert.ok(plan.some(r=>String(r.detail).includes('learning_cards_deck')));
    assert.ok(!plan.some(r=>String(r.detail).includes('learning_content_versions')));
  } finally { f.close(); }
});

test('S1.b live typed query adapters remain read-only, bounded, revision-scoped and see legacy writes', async () => {
  const f=schema604Fixture();
  try {
    const app=new Application({db:f.db,dataDir:f.dataDir,now:()=>new Date(f.at)});
    const gateway=createApplicationProtocol(app), client=createClient(r=>gateway.execute(r));
    const caps=await client.call('app.capabilities',{});
    for(const method of ['card.listSummary','card.getPublishedContent','content.getVersion'])assert.ok(caps.supportedMethods.includes(method));
    const before=inspectLegacyBaseline(f.databasePath,f.dataDir);
    const first=await client.call('card.listSummary',{deckId:f.ids.qDeck,limit:1});
    assert.equal(first.items.length,1);assert.equal(first.nextCursor,null);assert.equal(first.dataRevision,7);
    assert.deepEqual(Object.keys(first.items[0]).sort(),['cardId','deckId','title','publishedType','contentVersionId','revision','dueAt','paused','knowledgeCount'].sort());
    const content=await client.call('card.getPublishedContent',{deckId:f.ids.qDeck,cardId:f.ids.question,versionId:first.items[0].contentVersionId});
    assert.equal(content.mode,'question');assert.equal(content.payload?.encoding,'legacy-question-604');
    assert.ok(!('qa' in content) && !('history' in content));
    assert.equal((await client.call('content.getVersion',{deckId:f.ids.qDeck,cardId:f.ids.question,versionId:content.versionId})).versionId,content.versionId);
    assert.equal(inspectLegacyBaseline(f.databasePath,f.dataDir).digest,before.digest);
    await assert.rejects(client.call('content.getVersion',{deckId:f.ids.qDeck,cardId:f.ids.question,versionId:contentIdentity(f.ids.question,1)}),code('CONTENT_VERSION_NOT_AVAILABLE'));
    await assert.rejects(client.call('card.getPublishedContent',{deckId:f.ids.mDeck,cardId:f.ids.question}),code('DECK_CONFLICT'));
    const badLimit=await gateway.execute({protocol:PROTOCOL,requestId:randomUUID(),dataEpoch:caps.dataEpoch,method:'card.listSummary',payload:{deckId:f.ids.qDeck,limit:101}});
    assert.equal(badLimit.ok,false);if(!badLimit.ok)assert.equal(badLimit.error.code,'VALIDATION_ERROR');
    await assert.rejects(client.call('card.listSummary',{deckId:f.ids.qDeck,cursor:'bad'}),code('CURSOR_INVALID'));
    const saved=await client.call('content.question.save',{id:f.ids.question,expectedRevision:1,deckId:f.ids.qDeck,title:'通过旧写入口更新',stem:'新正文',options:'A\nB\nC\nD',answer:'B',analysis:'新解析',source:'',initialThought:'',knowledgeIds:[f.ids.child1]});
    assert.equal(saved,f.ids.question);
    const fresh=await client.call('card.listSummary',{deckId:f.ids.qDeck});
    assert.equal(fresh.items[0].title,'通过旧写入口更新');
    assert.notEqual(fresh.items[0].contentVersionId,content.versionId);
    await assert.rejects(client.call('content.getVersion',{deckId:f.ids.qDeck,cardId:f.ids.question,versionId:content.versionId}),code('CONTENT_VERSION_NOT_AVAILABLE'));
    assert.equal((await client.call('card.getPublishedContent',{deckId:f.ids.qDeck,cardId:f.ids.question})).payload?.mode,'question');
    assert.equal(f.db.prepare('PRAGMA user_version').get()?.user_version,604);
    assert.equal(f.db.prepare("SELECT name FROM sqlite_master WHERE name='learning_cards'").get(),undefined);
    assert.ok(Object.values(registry).filter((_,i)=>Object.keys(registry)[i].startsWith('card.') || Object.keys(registry)[i]==='content.getVersion').every(d=>d.effect==='query'));
  } finally { f.close(); }
});

test('S1.b pagination has no duplicates or body budget growth and rejects scope/revision/epoch drift', async () => {
  const f=schema604Fixture();
  try {
    const ctx={db:f.db,dataDir:f.dataDir,now:()=>new Date(f.at)};
    for(let n=0;n<105;n++)f.insert('questions',{id:'paged-'+String(n).padStart(3,'0'),module:f.ids.qDeck,title:'题'+n,stem:'大正文'.repeat(10000),created_at:f.at,updated_at:f.at});
    const before=inspectLegacyBaseline(f.databasePath,f.dataDir).digest;
    let cursor:string|null=null;const seen=new Set<string>();let budget=0;
    do{
      const result=listSummary(ctx,page(f.ids.qDeck,{limit:50,cursor}));
      budget=Math.max(budget,Buffer.byteLength(JSON.stringify(result)));
      for(const item of result.items){assert.ok(!seen.has(item.cardId));seen.add(item.cardId);assert.ok(!JSON.stringify(item).includes('大正文'));}
      cursor=result.nextCursor;
    }while(cursor);
    assert.equal(seen.size,106);assert.ok(budget<30_000,`summary bytes ${budget}`);
    assert.equal(inspectLegacyBaseline(f.databasePath,f.dataDir).digest,before);
    const first=listSummary(ctx,page(f.ids.qDeck,{limit:1}));assert.ok(first.nextCursor);
    assert.throws(()=>listSummary(ctx,page(f.ids.mDeck,{cursor:first.nextCursor})),code('CURSOR_INVALID'));
    assert.throws(()=>listSummary(ctx,page(f.ids.qDeck,{cursor:first.nextCursor,filters:{mode:'qa'}})),code('CURSOR_INVALID'));
    f.db.exec('UPDATE protocol_meta SET revision=revision+1');
    assert.throws(()=>listSummary(ctx,page(f.ids.qDeck,{cursor:first.nextCursor})),code('DATA_REVISION_CHANGED'));
    const next=listSummary(ctx,page(f.ids.qDeck,{limit:1}));
    f.db.exec("UPDATE protocol_meta SET epoch='other-epoch'");
    assert.throws(()=>listSummary(ctx,page(f.ids.qDeck,{cursor:next.nextCursor})),code('DATA_REVISION_CHANGED'));
    assert.equal(listSummary(ctx,page(f.ids.qDeck,{filters:{mode:'direct'}})).items.length,0);
    console.log(`S1B_SUMMARY_BUDGET cards=106 page=50 maxBytes=${budget}`);
  } finally { f.close(); }
});
