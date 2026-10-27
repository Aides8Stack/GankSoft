import {ContentVersion,ReviewEvent,type ContentVersionDTO} from '../../../shared/protocol/unified.ts';
import {Id} from '../../../shared/protocol/data.ts';
import {legacyCurrentDocument,historicalLegacyContent,type LegacyKind,type Row} from '../cards-unified/legacy.ts';
import {legacyEventFromRows} from '../../infrastructure/migrations/legacy-projection.ts';
import {AppendIdentityMap,type AppendIdentityKind} from './append-identities.ts';
import {AppendJsonMap} from './append-json.ts';

const columns:Record<string,Record<string,AppendIdentityKind>>={
 questions:{id:'card',module:'deck',material_id:'material'},memory_cards:{id:'card',module:'deck',legacy_question_id:'card'},
 materials:{id:'material'},assets:{id:'asset',question_id:'card'},attempts:{id:'event',question_id:'card'},memory_reviews:{id:'event',card_id:'card'},
 attempt_faults:{id:'fault',attempt_id:'event',knowledge_id:'knowledge'},attempt_evidence_snapshots:{attempt_id:'event',deck_id:'deck'},
 schedule_events:{id:'event',card_id:'card'},scheduling:{card_id:'card'},
};
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('APPEND_LEGACY_RAW_INVALID');return value as Record<string,unknown>;}
function row(value:unknown):Row{return object(value) as Row;}
function same(a:unknown,b:unknown){if(JSON.stringify(a)!==JSON.stringify(b))throw Error('APPEND_LEGACY_SOURCE_UNPROVEN');}
/** Captured old rows and immutable archives share the original projection code.
 * Only declared reference fields change; raw scores, missing facts, text, hashes,
 * order and numeric scheduling state survive. No target writes or event replay. */
export class AppendLegacyMap {
 private readonly ids:AppendIdentityMap;
 private readonly json:AppendJsonMap;
 constructor(ids:AppendIdentityMap){this.ids=ids;this.json=new AppendJsonMap(ids);}
 private snapshot(text:unknown):string {
  if(text==='')return '';if(typeof text!=='string')throw Error('APPEND_LEGACY_RAW_INVALID');
  const s=object(JSON.parse(text)),out={...s};
  if(s.id!==undefined)out.id=this.ids.id('card',Id.parse(s.id));
  if(s.assets!==undefined){if(!Array.isArray(s.assets))throw Error('APPEND_LEGACY_RAW_INVALID');out.assets=s.assets.map(a=>this.row('assets',row(a)));}
  for(const field of ['stem','options','analysis','source','initialThought','material','cue','content'])if(typeof s[field]==='string')out[field]=this.json.legacyMarkdown(s[field]);
  return JSON.stringify(out);
 }
 row(table:string,source:Row):Row {
  const fields=columns[table];if(!fields)throw Error('APPEND_LEGACY_TABLE_UNSUPPORTED');
  const out={...source};
  for(const [key,kind]of Object.entries(fields))if(source[key]!=null)out[key]=this.ids.id(kind,Id.parse(source[key]));
  const markdownFields=table==='questions'?['stem','options','analysis','source','initial_thought','project_note']:table==='memory_cards'?['cue','content','source']:table==='materials'?['content']:table==='memory_reviews'?['content_snapshot']:[];
  for(const field of markdownFields)if(typeof source[field]==='string')out[field]=this.json.legacyMarkdown(source[field]);
  if(table==='assets'&&source.file_name!==undefined)out.file_name=this.ids.fileName(String(source.file_name));
  if(table==='attempts'){
   out.question_snapshot=this.snapshot(source.question_snapshot);
   const list=JSON.parse(String(source.knowledge_snapshot));if(!Array.isArray(list))throw Error('APPEND_LEGACY_RAW_INVALID');
   out.knowledge_snapshot=JSON.stringify(list.map(v=>{const k=object(v);return {...k,id:this.ids.id('knowledge',Id.parse(k.id))};}));
  }
  if(table==='memory_reviews')out.card_snapshot=this.snapshot(source.card_snapshot);
  if(table==='attempt_evidence_snapshots'){
   const list=JSON.parse(String(source.knowledge_ids));if(!Array.isArray(list))throw Error('APPEND_LEGACY_RAW_INVALID');
   out.knowledge_ids=JSON.stringify(list.map(id=>this.ids.id('knowledge',Id.parse(id))));
  }
  if(table==='scheduling')out.data=JSON.stringify(this.json.schedule(JSON.parse(String(source.data))));
  if(table==='schedule_events')for(const key of ['before_state','after_state'])out[key]=JSON.stringify(this.json.schedule(JSON.parse(String(source[key]))));
  if(table==='schedule_events')out.log=JSON.stringify(this.json.scheduleLog(JSON.parse(String(source.log))));
  return out;
 }
 version(value:unknown):ContentVersionDTO {
  const v=ContentVersion.parse(value);if(v.source.kind==='published')throw Error('APPEND_LEGACY_SOURCE_UNPROVEN');
  if(v.source.rawJson===null)throw Error('APPEND_LEGACY_RAW_INVALID');
  const kind:LegacyKind=v.mode==='question'?'question':'memory';if(v.mode==='direct')throw Error('APPEND_LEGACY_SOURCE_UNPROVEN');
  if(v.source.kind==='legacy-event'){
   const source=row(JSON.parse(v.source.rawJson));same(historicalLegacyContent(kind,source),v);
   const mapped=this.row(kind==='question'?'attempts':'memory_reviews',source);
   return this.ids.legacyArchiveRows(kind,source,mapped,null,[],null).document;
  }
  const raw=object(JSON.parse(v.source.rawJson)),source=row(raw.row);
  if(!Array.isArray(raw.assets))throw Error('APPEND_LEGACY_RAW_INVALID');
  const assets=raw.assets.map(row),material=raw.material==null?raw.material as null|undefined:row(raw.material);
  same(legacyCurrentDocument(kind,source,assets,material),v);
  const mappedAssets=assets.map(a=>this.row('assets',a)),mappedMaterial=material?{...material,content:this.json.legacyMarkdown(String(material.content))}:material;
  return this.ids.legacyCurrentRows(kind,v,this.row(kind==='question'?'questions':'memory_cards',source),mappedAssets,mappedMaterial);
 }
 event(value:unknown){
  const e=ReviewEvent.parse(value);if(e.legacyScale!=='0-4'||e.legacyRaw===null||e.native)throw Error('APPEND_LEGACY_SOURCE_UNPROVEN');
  const kind:LegacyKind=e.mode==='question'?'question':'memory';if(e.mode==='direct')throw Error('APPEND_LEGACY_SOURCE_UNPROVEN');
  const raw=object(JSON.parse(e.legacyRaw)),source=row(raw.row),evidence=raw.evidence===null?null:row(raw.evidence),schedule=raw.schedule===null?null:row(raw.schedule);
  if(!Array.isArray(raw.faults))throw Error('APPEND_LEGACY_RAW_INVALID');const faults=raw.faults.map(row);
  same(legacyEventFromRows(kind,source,evidence,faults,schedule).item,e);
  return this.ids.legacyArchiveRows(kind,source,this.row(kind==='question'?'attempts':'memory_reviews',source),
   evidence?this.row('attempt_evidence_snapshots',evidence):null,faults.map(f=>this.row('attempt_faults',f)),schedule?this.row('schedule_events',schedule):null).item;
 }
}
