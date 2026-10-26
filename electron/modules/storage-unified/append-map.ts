import {ContentVersion,ReviewEvent,StudyCycle} from '../../../shared/protocol/unified.ts';
import {UnifiedScheduleMetadata} from '../../../shared/protocol/review-details.ts';
import type {Row,LegacyKind} from '../cards-unified/legacy.ts';
import {AppendIdentityMap} from './append-identities.ts';
import {AppendJsonMap,type SourceScheduleContext} from './append-json.ts';
import {AppendLegacyMap} from './append-legacy.ts';
import {AppendMetadataMap} from './append-metadata.ts';
import type {AppendSourceGraph} from './append-graph.ts';

export interface MappedAppendGraph {
 operationId:string;sourceGraphDigest:string;selectedDeckIds:string[];tables:Record<string,Row[]>;
 media:{sourceName:string;destinationName:string;size:number;sha256:string}[];
 identities:ReturnType<AppendIdentityMap['entries']>;
}
const legacyTables=new Set(['questions','memory_cards','materials','assets','attempts','memory_reviews','attempt_faults','attempt_evidence_snapshots','schedule_events','scheduling']);
/** Build the complete independent row graph before opening a target write
 * transaction. Derived legacy archives are never random UUID substitutions. */
export function mapAppendGraph(source:AppendSourceGraph,operationId:string,folderId:string|null=null):MappedAppendGraph {
 const ids=new AppendIdentityMap(operationId),json=new AppendJsonMap(ids),legacy=new AppendLegacyMap(ids),metadata=new AppendMetadataMap(ids),tables:Record<string,Row[]>={};
 const rows=(name:string)=>source.tables[name]??[];
 const reserve=(kind:Parameters<AppendIdentityMap['reserveOrdered']>[0],values:unknown[])=>ids.reserveOrdered(kind,[...new Set(values.filter(v=>v!==null&&v!==undefined).map(String))]);
 reserve('deck',rows('decks').map(r=>r.id));reserve('card',[...rows('questions'),...rows('memory_cards'),...rows('learning_cards')].map(r=>r.id));
 reserve('knowledge',rows('knowledge').map(r=>r.id));reserve('asset',[...rows('assets').map(r=>r.id),...source.references.map(r=>r.assetId)]);
 reserve('fault',rows('attempt_faults').map(r=>r.id));reserve('event',[...rows('attempts'),...rows('memory_reviews'),...rows('learning_review_events'),...rows('schedule_events')].map(r=>r.id));
 const cards=new Map(rows('learning_cards').map(r=>[String(r.id),r]));
 for(const r of rows('learning_study_cycles')){
  const kind=cards.get(String(r.card_id))?.legacy_kind as LegacyKind|null|undefined;
  ids.cycle(StudyCycle.parse({cycleId:r.id,cardId:r.card_id,startedAt:r.started_at,provenance:r.provenance,sourceOrdinal:r.source_ordinal}),kind??undefined);
 }
 const versions=rows('learning_content_versions').map(r=>{
  const v=ContentVersion.parse(JSON.parse(String(r.document))),mapped=v.source.kind==='published'?json.published(v):legacy.version(v);
  return {...r,id:mapped.versionId,card_id:mapped.cardId,mode:mapped.mode,document:JSON.stringify(mapped)};
 });
 const scheduleContext=(cardId:string):SourceScheduleContext=>{
  const c=cards.get(cardId);if(!c)throw Error('APPEND_SESSION_CARD_MISSING');
  const cycleId=String(c.current_cycle_id),kind=c.legacy_kind??'card',r=rows('scheduling').find(r=>r.card_id===cardId&&r.kind===kind);
  let state=r?JSON.parse(String(r.data)):null;
  if(state?._gank){if(UnifiedScheduleMetadata.parse(state._gank).cycleId!==cycleId)state=null;}
  else if(state&&rows('learning_study_cycles').find(r=>r.id===cycleId)?.provenance!=='legacy-segment')state=null;
  return {cycleId,state};
 };
 for(const [table,values]of Object.entries(source.tables)){
  if(table==='learning_content_versions'){tables[table]=versions;continue;}
  tables[table]=values.map(r=>{
   if(legacyTables.has(table))return legacy.row(table,r);
   if(table==='decks')return metadata.deck(r,source.selectedDeckIds,folderId);
   if(table==='settings')return metadata.setting(r);
   if(table==='recycle_batches')return metadata.recycle(r);
   if(table==='study_sessions'){
    const s=JSON.parse(String(r.payload));return metadata.session(r,s.encoding==='ganksoft.review-session/1'&&!s.completed?scheduleContext(s.entry.cardId):undefined);
   }
   if(table==='learning_cards')return {...r,id:ids.id('card',String(r.id)),deck_id:ids.id('deck',String(r.deck_id)),current_version_id:ids.resolve('version',String(r.current_version_id)),current_cycle_id:ids.resolve('cycle',String(r.current_cycle_id))};
   if(table==='learning_study_cycles')return {...r,id:ids.resolve('cycle',String(r.id)),card_id:ids.id('card',String(r.card_id))};
   if(table==='learning_published_modes')return {...r,card_id:ids.id('card',String(r.card_id)),version_id:ids.resolve('version',String(r.version_id))};
   if(table==='learning_review_events'){
    const e=ReviewEvent.parse(JSON.parse(String(r.document))),mapped=e.legacyScale===null?json.review(e):legacy.event(e);
    return {...r,id:mapped.eventId,card_id:mapped.cardId,version_id:mapped.contentVersionId,cycle_id:mapped.cycleId,document:JSON.stringify(mapped)};
   }
   if(table==='learning_card_drafts'){
    const p=JSON.parse(String(r.payload));
    if(p.encoding!=='ganksoft.card-draft/1'){
     // Old unwrapped drafts have no media ownership/origin envelope. Preserve
     // media-free payloads only, without guessing any missing origin facts.
     const payload=json.payload(p,[]);
     return {...r,card_id:ids.id('card',String(r.card_id)),payload:JSON.stringify(payload)};
    }
    return {...r,card_id:ids.id('card',String(r.card_id)),payload:JSON.stringify(json.existingDraft(p))};
   }
   return metadata.row(table,r);
  });
 }
 return {operationId,sourceGraphDigest:source.graphDigest,selectedDeckIds:source.selectedDeckIds.map(id=>ids.resolve('deck',id)),tables,
  media:source.media.map(m=>({sourceName:m.name,destinationName:ids.fileName(m.name),size:m.size,sha256:m.sha256})),identities:ids.entries()};
}
