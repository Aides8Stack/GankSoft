import {createHash} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {z} from 'zod';
import {Id} from '../../../shared/protocol/data.ts';
import type {Row} from '../cards-unified/legacy.ts';
import type {AppendSourceGraph} from './append-graph.ts';

const Hash=z.string().regex(/^[a-f0-9]{64}$/);
export const AppendProvenance=z.strictObject({
 encoding:z.literal('ganksoft.independent-append-provenance/1'),operationId:z.uuid(),
 sourceDeckId:Id,sourceVersion:Hash,sourceKey:Hash,sourceSchema:z.union([z.literal(604),z.literal(606)]),
 sourceGeneration:Id,sourceSnapshot:Hash,destinationDeckId:Id,createdAt:z.iso.datetime(),
});
export type AppendProvenanceDTO=z.infer<typeof AppendProvenance>;
export interface AppendDeckVersion {sourceDeckId:string;sourceVersion:string;sourceKey:string;dependencies:string[]}
const encode=(value:unknown)=>JSON.stringify(value,(_k,v)=>typeof v==='bigint'?{integer:v.toString()}:v instanceof Uint8Array?{binary:Buffer.from(v).toString('base64')}:v);
const hash=(value:unknown)=>createHash('sha256').update(encode(value)).digest('hex');
const sourceKey=(id:string,version:string)=>hash(['ganksoft.source-deck-version/1',id,version]);
const prefix='append-provenance:';

/** Identity means original deck ID plus its verified facts/media version. The
 * source epoch is trace evidence, not a fabricated permanent database ID. */
export function appendDeckVersions(graph:AppendSourceGraph):AppendDeckVersion[]{
 const rows=(t:string)=>graph.tables[t]??[],selected=new Set(graph.selectedDeckIds);
 const cards=new Map([...rows('questions'),...rows('memory_cards')].map(r=>[String(r.id),String(r.module)]));
 for(const r of rows('learning_cards'))cards.set(String(r.id),String(r.deck_id));
 const nodes=new Map(rows('knowledge').map(r=>[String(r.id),String(r.module)]));
 const events=new Map<string,string|undefined>([...rows('attempts').map(r=>[String(r.id),cards.get(String(r.question_id))]as const),...rows('memory_reviews').map(r=>[String(r.id),cards.get(String(r.card_id))]as const)]);
 const materialDecks=new Map<string,Set<string>>(),operationDecks=new Map<string,Set<string>>();
 for(const r of rows('questions'))if(r.material_id){let set=materialDecks.get(String(r.material_id));if(!set){set=new Set();materialDecks.set(String(r.material_id),set);}set.add(String(r.module));}
 for(const r of rows('review_due_overrides')){const deck=cards.get(String(r.card_id));if(deck){let set=operationDecks.get(String(r.operation_id));if(!set){set=new Set();operationDecks.set(String(r.operation_id),set);}set.add(deck);}}
 const owners=(table:string,r:Row):string[]=>{
  if(table==='knowledge_history_identities')return [...new Set([nodes.get(String(r.id)),...rows('attempt_faults').filter(f=>f.knowledge_id===r.id).map(f=>events.get(String(f.attempt_id)))].filter((v):v is string=>!!v))];
  if(table==='decks')return [String(r.id)];
  if(['questions','memory_cards','knowledge','knowledge_archives'].includes(table))return [String(r.module)];
  if(table==='materials')return [...materialDecks.get(String(r.id))??[]];
  if(table==='assets'||table==='attempts'||table==='plans'||table==='question_knowledge'||table==='question_assessment_policies')return [cards.get(String(r.question_id))??''];
  if(table==='attempt_faults'||table==='attempt_evidence_snapshots')return [events.get(String(r.attempt_id))??''];
  if(['relations'].includes(table))return [...new Set([nodes.get(String(r.source_id))??'',nodes.get(String(r.target_id))??''])];
  if(table==='analyses'||table==='knowledge_keys')return [nodes.get(String(r.knowledge_id))??''];
  if(table==='review_config_operations')return [...operationDecks.get(String(r.id))??[]];
  if(table==='settings'){
   const p=JSON.parse(String(r.value));return [p.deckId??p.document?.deckId??cards.get(p.cardId)??nodes.get(p.nodeId)??''];
  }
  if(table==='recycle_batches'){
   const p=JSON.parse(String(r.payload));return [r.kind==='deck'?String(r.item_id):p.deckId??nodes.get(String(r.item_id))??cards.get(String(r.item_id))??''];
  }
  if(r.deck_id!==undefined)return [String(r.deck_id)];
  if(r.card_id!==undefined)return [cards.get(String(r.card_id))??''];
  throw Error('APPEND_PROVENANCE_OWNER_UNKNOWN');
 };
 const buckets=new Map(graph.selectedDeckIds.map(id=>[id,{tables:new Map<string,string[]>(),owners:new Set<string>(),dependencies:new Set<string>()}]));
 const dependency=(from:string|undefined,to:string|undefined)=>{if(from&&to&&from!==to){if(!selected.has(to))throw Error('APPEND_SELECTION_INCOMPLETE');buckets.get(from)!.dependencies.add(to);}};
 for(const r of rows('memory_cards'))if(r.legacy_question_id)dependency(String(r.module),cards.get(String(r.legacy_question_id)));
 for(const r of rows('attempt_evidence_snapshots'))dependency(events.get(String(r.attempt_id)),String(r.deck_id));
 for(const r of rows('relations')){dependency(nodes.get(String(r.source_id)),nodes.get(String(r.target_id)));dependency(nodes.get(String(r.target_id)),nodes.get(String(r.source_id)));}
 for(const r of rows('knowledge_specialty_prefs'))dependency(String(r.deck_id),nodes.get(String(r.knowledge_id)));
 for(const r of rows('study_sessions'))for(const id of JSON.parse(String(r.payload)).ids)dependency(String(r.deck_id),cards.get(id));
 for(const r of rows('settings'))if(String(r.key).startsWith('unified-archived-session:')){const s=JSON.parse(String(r.value)).document;for(const id of s.ids)dependency(s.deckId,cards.get(id));}
 const refPrefix:Record<string,[string,string]>={assets:['assets/','id'],attempts:['attempts/','id'],memory_reviews:['memory_reviews/','id'],learning_content_versions:['versions/','id'],learning_card_drafts:['drafts/','card_id']};
 for(const [table,values]of Object.entries(graph.tables))for(const r of values){
  const decks=owners(table,r);if(!decks.length||decks.some(id=>!selected.has(id)))throw Error('APPEND_PROVENANCE_OWNER_UNKNOWN');
  for(const id of decks){const bucket=buckets.get(id)!;let list=bucket.tables.get(table);if(!list){list=[];bucket.tables.set(table,list);}list.push(hash(Object.entries(r)));
   const ref=refPrefix[table];if(ref)bucket.owners.add(ref[0]+r[ref[1]]);if(table==='settings')bucket.owners.add(String(r.key));}
 }
 return graph.selectedDeckIds.map(sourceDeckId=>{
  const bucket=buckets.get(sourceDeckId)!,references=graph.references.filter(r=>bucket.owners.has(r.owner)),names=new Set(references.map(r=>r.fileName));
  const tables=[...bucket.tables].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([table,values])=>({table,rows:values.sort()}));
  const dependencies=[...bucket.dependencies].sort(),sourceVersion=hash({format:'ganksoft.source-deck-facts/1',schema:graph.sourceSchema,sourceDeckId,tables,media:graph.media.filter(m=>names.has(m.name)),references,dependencies});
  return {sourceDeckId,sourceVersion,sourceKey:sourceKey(sourceDeckId,sourceVersion),dependencies};
 });
}
export function appendProvenanceSetting(value:AppendProvenanceDTO):Row {
 const record=AppendProvenance.parse(value);if(record.sourceKey!==sourceKey(record.sourceDeckId,record.sourceVersion))throw Error('APPEND_PROVENANCE_INVALID');
 return {key:prefix+record.sourceKey+':'+record.operationId,value:JSON.stringify(record)};
}
export function readAppendProvenance(db:DatabaseSync){
 return db.prepare('SELECT key,value FROM settings WHERE key LIKE ? ORDER BY key').all(prefix+'%').map(row=>{
  const record=AppendProvenance.parse(JSON.parse(String(row.value)));if(appendProvenanceSetting(record).key!==row.key)throw Error('APPEND_PROVENANCE_INVALID');return record;
 });
}
/** Duplicate defaults never attach new foreign IDs to a possibly edited old
 * target copy. A dependent new deck is blocked until explicit independent import. */
export function planAppendDuplicates(db:DatabaseSync,versions:readonly AppendDeckVersion[],forceIndependent=false){
 if(typeof forceIndependent!=='boolean')throw Error('APPEND_DUPLICATE_MODE_INVALID');
 const records=readAppendProvenance(db).filter(r=>db.prepare('SELECT 1 FROM decks WHERE id=?').get(r.destinationDeckId));
 const skipped=forceIndependent?[]:versions.filter(v=>records.some(r=>r.sourceKey===v.sourceKey)).map(v=>v.sourceDeckId),blocked=new Set<string>(),unavailable=new Set(skipped);
 let size=-1;while(size!==unavailable.size){size=unavailable.size;for(const v of versions)if(!unavailable.has(v.sourceDeckId)&&v.dependencies.some(id=>unavailable.has(id))){unavailable.add(v.sourceDeckId);blocked.add(v.sourceDeckId);}}
 return {importDeckIds:versions.filter(v=>!unavailable.has(v.sourceDeckId)).map(v=>v.sourceDeckId),skippedDeckIds:skipped,blockedDeckIds:[...blocked].sort(),forceIndependent};
}
