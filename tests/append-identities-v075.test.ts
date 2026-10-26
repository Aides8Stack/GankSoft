import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {backup,DatabaseSync} from 'node:sqlite';
import {z} from 'zod';
import {AppendIdentityMap,type AppendIdentityKind} from '../electron/modules/storage-unified/append-identities.ts';
import {currentLegacyContent,stableId,type Row} from '../electron/modules/cards-unified/legacy.ts';
import {legacyEvent} from '../electron/infrastructure/migrations/legacy-projection.ts';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';

test('T39 per-operation mapping is deterministic on retry, bijective within domains and disjoint for forced second imports',()=>{
 const operation=randomUUID(),a=new AppendIdentityMap(operation),again=new AppendIdentityMap(operation),other=new AppendIdentityMap(randomUUID());
 const kinds:AppendIdentityKind[]=['deck','card','knowledge','asset','file','placement','version','cycle','event','session','material','relation','archive','filter','recycle','fault','batch'];
 const all=[];for(const kind of kinds)for(const source of ['same-source','v075:legacy','00000000-0000-4000-8000-000000000001']){
  const dest=a.id(kind,source);all.push(dest);assert.equal(z.uuid().safeParse(dest).success,true);assert.equal(again.id(kind,source),dest);assert.notEqual(other.id(kind,source),dest);assert.notEqual(dest,source);assert.equal(a.resolve(kind,source),dest);
 }assert.equal(new Set(all).size,all.length);assert.deepEqual(a.entries(),again.entries());assert.throws(()=>a.resolve('card','missing'),/UNBOUND/);
 const view=a.entries();view[0]!.destinationId='mutated';assert.notDeepEqual(a.entries(),view);
});

test('T39 identity inputs and media paths are strict; shared files keep stable names without unsafe path or case collisions',()=>{
 const op=randomUUID(),a=new AppendIdentityMap(op),b=new AppendIdentityMap(op),asset='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 assert.equal(a.fileName(asset+'.png'),a.id('file',asset+'.png')+'.png');assert.notEqual(a.fileName(asset+'.png'),a.fileName(asset+'.PNG'));assert.notEqual(a.fileName(asset+'.png'),a.fileName(asset.toUpperCase()+'.png'));assert.equal(a.fileName(asset+'.png'),b.fileName(asset+'.png'));
 assert.throws(()=>a.fileName('../'+asset+'.png'),/APPEND_MEDIA_NAME_INVALID/);assert.throws(()=>a.fileName(asset+'.svg'),/APPEND_MEDIA_NAME_INVALID/);
 assert.throws(()=>a.id('card','../../private'));assert.throws(()=>new AppendIdentityMap('invalid'));
});

test('T39 frozen ordered reservations preserve SQL ID tie order, are retry stable and reject conflicts without partial allocation',()=>{
 const op=randomUUID(),a=new AppendIdentityMap(op),b=new AppendIdentityMap(op),other=new AppendIdentityMap(randomUUID()),source=['z:last','a:first','m:middle'];
 a.reserveOrdered('asset',source);b.reserveOrdered('asset',[...source].reverse());other.reserveOrdered('asset',source);
 const sorted=[...source].sort(),mapped=sorted.map(id=>a.resolve('asset',id));assert.deepEqual(mapped,[...mapped].sort());assert.deepEqual(a.entries(),b.entries());
 for(const id of source){assert.equal(z.uuid().safeParse(a.resolve('asset',id)).success,true);assert.notEqual(a.resolve('asset',id),other.resolve('asset',id));}
 const before=a.entries();a.reserveOrdered('asset',source);assert.deepEqual(a.entries(),before);
 assert.throws(()=>a.reserveOrdered('fault',['duplicate','duplicate']),/APPEND_ORDERED_IDS_INVALID/);assert.deepEqual(a.entries(),before);
 const conflict=new AppendIdentityMap(op);conflict.id('asset','z:last');const initial=conflict.entries();
 assert.throws(()=>conflict.reserveOrdered('asset',source),/APPEND_IDENTITY_CONFLICT/);assert.deepEqual(conflict.entries(),initial);assert.throws(()=>conflict.resolve('asset','a:first'),/UNBOUND/);
});

test('T39 legacy current version and cycle IDs use existing content-derived rules, preserving payload/unknown widths and source bytes',async()=>{
 const f=schema604Fixture();let db:DatabaseSync|undefined;try{
  const path=join(f.root,'identity-target.sqlite');await backup(f.db,path);db=new DatabaseSync(path);db.exec('BEGIN;PRAGMA defer_foreign_keys=ON');
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),map=new AppendIdentityMap(randomUUID());
  const row=f.db.prepare('SELECT * FROM questions WHERE id=?').get(f.ids.question)! as Row,source=currentLegacyContent(f.db,'question',row),target={...row,id:map.id('card',String(row.id)),module:map.id('deck',String(row.module))};
  const assets=f.db.prepare('SELECT * FROM assets WHERE question_id=? ORDER BY sort_order,id').all(row.id!) as Row[];
  for(const a of assets)db.prepare('UPDATE assets SET id=?,question_id=?,file_name=? WHERE id=?').run(map.id('asset',String(a.id)),target.id,map.fileName(String(a.file_name)),a.id!);
  const document=map.legacyCurrent(db,'question',source,target),expected=currentLegacyContent(db,'question',target);
  assert.deepEqual(document,expected);assert.deepEqual(document.payload,source.payload);assert.equal(document.availability,source.availability);assert.equal(document.publishedAt,null);assert.notEqual(document.versionId,map.id('version','unrelated-native'));
  assert.equal(map.resolve('version',source.versionId),expected.versionId);assert.equal(map.resolve('cycle',stableId('cycle','question',source.cardId,source.source.ordinal)),stableId('cycle','question',target.id,source.source.ordinal));
  assert.ok(source.mediaRefs.length>0);assert.equal(document.mediaRefs.length,source.mediaRefs.length);assert.ok(document.mediaRefs.every(r=>r.width===null));assert.deepEqual(map.legacyCurrent(db,'question',source,target),document);assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);
 }finally{if(db?.isTransaction)db.exec('ROLLBACK');db?.close();f.close();}
});

test('T39 legacy event/version/cycle references bind to the exact existing archive projection without inventing missing historical content',async()=>{
 const f=schema604Fixture();let db:DatabaseSync|undefined;try{
  const path=join(f.root,'identity-target.sqlite');await backup(f.db,path);db=new DatabaseSync(path);db.exec('BEGIN;PRAGMA defer_foreign_keys=ON');
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),map=new AppendIdentityMap(randomUUID());
  const event=f.db.prepare('SELECT * FROM attempts ORDER BY id LIMIT 1').get()! as Row,source=legacyEvent(f.db,'question',event);
  const snapshot=event.question_snapshot?JSON.parse(String(event.question_snapshot)):null;
  if(snapshot?.assets)snapshot.assets=snapshot.assets.map((a:Row)=>({...a,id:map.id('asset',String(a.id)),file_name:map.fileName(String(a.file_name))}));
  const target={...event,id:map.id('event',String(event.id)),question_id:map.id('card',String(event.question_id)),question_snapshot:snapshot?JSON.stringify(snapshot):event.question_snapshot};
  db.prepare('UPDATE attempt_evidence_snapshots SET attempt_id=? WHERE attempt_id=?').run(target.id,event.id!);
  db.prepare('UPDATE attempt_faults SET attempt_id=? WHERE attempt_id=?').run(target.id,event.id!);
  db.prepare('UPDATE schedule_events SET id=?,card_id=? WHERE id=?').run(target.id,target.question_id,event.id!);
  const result=map.legacyArchive(db,'question',event,target),expected=legacyEvent(db,'question',target);
  assert.deepEqual(result,expected);assert.equal(result.document.availability,source.document.availability);assert.deepEqual(result.document.payload,source.document.payload);assert.equal(result.item.legacyScore,source.item.legacyScore);assert.equal(result.item.rating,null);assert.equal(result.item.mappingVersion,'legacy-preserved');
  assert.equal(map.resolve('version',source.document.versionId),result.document.versionId);assert.equal(map.resolve('event',String(event.id)),result.item.eventId);assert.equal(map.resolve('cycle',source.item.cycleId),result.item.cycleId);assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);
 }finally{if(db?.isTransaction)db.exec('ROLLBACK');db?.close();f.close();}
});

test('T39 binding an arbitrary UUID to a derived legacy version fails instead of changing or weakening immutable projection rules',()=>{
 const f=schema604Fixture(),db=new DatabaseSync(':memory:');try{
  const map=new AppendIdentityMap(randomUUID()),row=f.db.prepare('SELECT * FROM memory_cards LIMIT 1').get()! as Row,source=currentLegacyContent(f.db,'memory',row),target={...row,id:map.id('card',String(row.id)),module:map.id('deck',String(row.module))};
  map.id('version',source.versionId);assert.throws(()=>map.legacyCurrent(db,'memory',source,target),/APPEND_IDENTITY_CONFLICT/);
  assert.throws(()=>map.nativeVersion(source),/APPEND_DERIVED_VERSION_REQUIRED/);
  assert.throws(()=>map.legacyCurrent(db,'memory',source,{...target,id:randomUUID()}),/APPEND_LEGACY_BINDING_INVALID/);
 }finally{db.close();f.close();}
});

test('T39 incomplete legacy media mapping is rejected before binding any derived version',()=>{
 const f=schema604Fixture(),empty=new DatabaseSync(':memory:');try{
  for(const name of ['assets','materials'])empty.exec(String(f.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(name)!.sql));
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),map=new AppendIdentityMap(randomUUID()),row=f.db.prepare('SELECT * FROM questions WHERE id=?').get(f.ids.question)! as Row,source=currentLegacyContent(f.db,'question',row);
  assert.ok(source.mediaRefs.length>0);
  assert.throws(()=>map.legacyCurrent(empty,'question',source,{...row,id:map.id('card',String(row.id))}),/APPEND_LEGACY_MEDIA_INCOMPLETE/);
  assert.throws(()=>map.resolve('version',source.versionId),/APPEND_IDENTITY_UNBOUND/);
  assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);
 }finally{empty.close();f.close();}
});
