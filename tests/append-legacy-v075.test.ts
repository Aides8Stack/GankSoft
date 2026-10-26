import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync,type SQLInputValue} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {schema604Fixture} from './fixtures/v075-schema604.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
import {currentLegacyContent,type Row} from '../electron/modules/cards-unified/legacy.ts';
import {legacyEvent} from '../electron/infrastructure/migrations/legacy-projection.ts';
import {AppendIdentityMap} from '../electron/modules/storage-unified/append-identities.ts';
import {AppendLegacyMap} from '../electron/modules/storage-unified/append-legacy.ts';

function insert(db:DatabaseSync,table:string,row:Row){const keys=Object.keys(row);db.prepare(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...Object.values(row) as SQLInputValue[]);}
function rows(db:DatabaseSync,table:string){return db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all() as Row[];}

test('T39 legacy rows and immutable archives match actual SQL projections after mapping, with equal-sort assets/faults in original order and every FK enabled',()=>{
 const f=schema604Fixture(),target=new DatabaseSync(':memory:');try{
  f.insert('assets',{id:'zz:asset',question_id:f.ids.question,role:'analysis',file_name:f.ids.currentImage+'.png',mime:'image/png',sort_order:0});
  f.insert('attempt_faults',{id:'zz:fault',attempt_id:f.ids.attempt2,knowledge_id:f.ids.child2,knowledge_snapshot:'旧名二',category:'旧分类',detail:'保留第二项'});
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),ids=new AppendIdentityMap(randomUUID());
  ids.reserveOrdered('asset',rows(f.db,'assets').map(r=>String(r.id)));ids.reserveOrdered('fault',rows(f.db,'attempt_faults').map(r=>String(r.id)));
  const map=new AppendLegacyMap(ids);target.exec(readFileSync(new URL('./fixtures/schema604.sql',import.meta.url),'utf8').replace(/\r\n?/g,'\n'));target.exec('PRAGMA foreign_keys=ON;BEGIN;PRAGMA defer_foreign_keys=ON');
  for(const r of rows(f.db,'decks'))insert(target,'decks',{...r,id:ids.id('deck',String(r.id)),folder_id:null,parent_id:r.parent_id?ids.id('deck',String(r.parent_id)):null});
  for(const r of rows(f.db,'knowledge'))insert(target,'knowledge',{...r,id:ids.id('knowledge',String(r.id)),module:ids.id('deck',String(r.module)),parent_id:r.parent_id?ids.id('knowledge',String(r.parent_id)):null});
  for(const table of ['materials','questions','memory_cards','assets','attempts','memory_reviews','attempt_faults','attempt_evidence_snapshots','schedule_events','scheduling'])for(const r of rows(f.db,table))insert(target,table,map.row(table,r));
  assert.deepEqual(target.prepare('PRAGMA foreign_key_check').all(),[]);target.exec('COMMIT');assert.equal(target.prepare('PRAGMA foreign_keys').get()!.foreign_keys,1);
  for(const [kind,table,events]of [['question','questions','attempts'],['memory','memory_cards','memory_reviews']] as const){
   for(const r of rows(f.db,table)){
    const source=currentLegacyContent(f.db,kind,r),mapped=map.version(source),actual=currentLegacyContent(target,kind,map.row(table,r));assert.deepEqual(mapped,actual);assert.deepEqual(mapped.payload,source.payload);assert.equal(ids.resolve('version',source.versionId),actual.versionId);
   }
   for(const r of rows(f.db,events)){
    const source=legacyEvent(f.db,kind,r),actual=legacyEvent(target,kind,map.row(events,r));assert.deepEqual(map.version(source.document),actual.document);assert.deepEqual(map.event(source.item),actual.item);
    for(const key of ['legacyScore','legacySelfScore','legacyRating','rating','scoreTenths','createdAt','engineVersion','objectiveCorrect']as const)assert.equal(actual.item[key],source.item[key]);
    assert.equal(actual.document.availability,source.document.availability);assert.deepEqual(actual.document.payload,source.document.payload);
   }
  }
  const faults=JSON.parse(map.event(legacyEvent(f.db,'question',f.db.prepare('SELECT * FROM attempts WHERE id=?').get(f.ids.attempt2)!).item).legacyRaw!).faults;
  assert.deepEqual(faults.map((r:Row)=>r.detail),['不可改写','保留第二项']);assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);
 }finally{target.close();f.close();}
});

test('T39 captured older current archives retain their own material and assets rather than being reconstructed from today',()=>{
 const f=schema604Fixture();try{
  const row=f.db.prepare('SELECT * FROM questions WHERE id=?').get(f.ids.question)! as Row,source=currentLegacyContent(f.db,'question',row),raw=JSON.parse(source.source.rawJson!);
  f.db.prepare('UPDATE materials SET content=?').run('今日材料不能补写旧档案');f.db.prepare('UPDATE questions SET content_version=content_version+1,title=? WHERE id=?').run('今日题名',row.id!);
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),ids=new AppendIdentityMap(randomUUID()),map=new AppendLegacyMap(ids),mapped=map.version(source),captured=JSON.parse(mapped.source.rawJson!);
  assert.deepEqual(mapped.payload,source.payload);assert.equal(mapped.title,source.title);assert.deepEqual(captured.material,raw.material);assert.equal(mapped.source.ordinal,source.source.ordinal);assert.notEqual(mapped.versionId,source.versionId);
  const current=currentLegacyContent(f.db,'question',f.db.prepare('SELECT * FROM questions WHERE id=?').get(row.id!)!);assert.notDeepEqual(current.payload,mapped.payload);assert.notEqual(map.version(current).versionId,mapped.versionId);assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);
 }finally{f.close();}
});

test('T39 unknown/partial historical facts remain missing; text and proof fields are never blanket ID-replaced',()=>{
 const f=schema604Fixture();try{
  f.db.prepare('UPDATE attempts SET thought=?,parameters=?,assessment_snapshot=? WHERE id=?').run(f.ids.question,JSON.stringify({originalProof:f.ids.question}),'',f.ids.attempt2);
  const before=inspectDatabaseBaseline(f.databasePath,f.dataDir),ids=new AppendIdentityMap(randomUUID()),map=new AppendLegacyMap(ids);
  for(const r of rows(f.db,'attempts')){
   const original=legacyEvent(f.db,'question',r),mapped=map.event(original.item),doc=map.version(original.document),raw=JSON.parse(mapped.legacyRaw!);
   assert.equal(doc.availability,original.document.availability);assert.deepEqual(doc.payload,original.document.payload);assert.equal(raw.row.thought,r.thought);assert.equal(raw.row.parameters,r.parameters);assert.equal(raw.row.assessment_snapshot,r.assessment_snapshot);assert.equal(raw.row.elapsed_source,r.elapsed_source);assert.equal(raw.row.self_score,r.self_score);
   if(r.id===f.ids.attempt2){assert.equal(doc.availability,'unknown');assert.equal(doc.payload,null);assert.equal(raw.row.question_snapshot,'');assert.equal(raw.row.thought,f.ids.question);}
  }assert.deepEqual(inspectDatabaseBaseline(f.databasePath,f.dataDir),before);
 }finally{f.close();}
});

test('T39 contradictory captured documents/events and unsupported tables reject before any target database is opened',()=>{
 const f=schema604Fixture();try{
  const map=new AppendLegacyMap(new AppendIdentityMap(randomUUID())),r=f.db.prepare('SELECT * FROM questions WHERE id=?').get(f.ids.question)!,v=currentLegacyContent(f.db,'question',r),e=legacyEvent(f.db,'question',f.db.prepare('SELECT * FROM attempts LIMIT 1').get()!);
  assert.throws(()=>map.version({...v,title:'伪造档案标题'}),/APPEND_LEGACY_SOURCE_UNPROVEN/);assert.throws(()=>map.event({...e.item,legacyScore:2}),/APPEND_LEGACY_SOURCE_UNPROVEN/);
  assert.throws(()=>map.row('settings',{key:'private',value:'not imported'}),/APPEND_LEGACY_TABLE_UNSUPPORTED/);
  assert.throws(()=>map.row('attempts',{...JSON.parse(e.document.source.rawJson!),question_snapshot:'[]'}),/APPEND_LEGACY_RAW_INVALID/);
 }finally{f.close();}
});
