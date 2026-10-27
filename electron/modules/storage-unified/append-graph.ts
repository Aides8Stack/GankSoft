import {createHash} from 'node:crypto';
import {DatabaseSync,type SQLInputValue,type SQLOutputValue} from 'node:sqlite';
import {join} from 'node:path';
import type {ExternalScan} from './external-scan.ts';
import {requireClosedAppendSelection} from './append-selection.ts';
import type {MediaFingerprint,MediaReference} from '../../infrastructure/migrations/baseline.ts';
type Row=Record<string,SQLOutputValue>;
export interface AppendSourceGraph {
 sourceGeneration:string;sourceSchema:604|606;selectedDeckIds:string[];snapshotDigest:string;graphDigest:string;
 /** Owner-only rows. Never serialize full content into the renderer preview. */
 tables:Record<string,Row[]>;media:MediaFingerprint[];references:MediaReference[];
 excludedGlobalTables:string[];
}
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
function encoded(value:unknown){return JSON.stringify(value,(_key,v)=>typeof v==='bigint'?{integer:v.toString()}:v instanceof Uint8Array?{binary:Buffer.from(v).toString('base64')}:v);}
/** Collect committed source facts only. No target database is opened, no IDs are
 * rewritten and no scheduling/event replay occurs here. Confirmation must first
 * include the actual FK/archived-page deck dependencies. */
export function collectAppendGraph(scan:ExternalScan,deckIds:readonly string[]):AppendSourceGraph {
 const selected=requireClosedAppendSelection(scan,deckIds),before=scan.verify(),db=new DatabaseSync(join(scan.candidateDirectory,'ganksoft.sqlite'),{readOnly:true});
 const tables:Record<string,Row[]>={},params=selected as SQLInputValue[],ph=selected.map(()=>'?').join(',');
 const q=`SELECT id FROM questions WHERE module IN (${ph})`,m=`SELECT id FROM memory_cards WHERE module IN (${ph})`,k=`SELECT id FROM knowledge WHERE module IN (${ph})`;
 const cards=before.schemaVersion===606?`SELECT id FROM learning_cards WHERE deck_id IN (${ph})`:`SELECT id FROM questions WHERE module IN (${ph}) UNION ALL SELECT id FROM memory_cards WHERE module IN (${ph})`;
 const cardParams=before.schemaVersion===606?params:[...params,...params];
 const read=(name:string,sql:string,values:SQLInputValue[]=params)=>{tables[name]=db.prepare(sql).all(...values);};
 try{
  db.exec('BEGIN');
  for(const name of ['decks'])read(name,`SELECT * FROM ${name} WHERE id IN (${ph})`);
  for(const name of ['questions','memory_cards','knowledge','knowledge_archives'])read(name,`SELECT * FROM ${name} WHERE module IN (${ph})`);
  read('materials',`SELECT * FROM materials WHERE id IN (SELECT material_id FROM questions WHERE module IN (${ph}))`);
  read('assets',`SELECT * FROM assets WHERE question_id IN (${q})`);
  read('attempts',`SELECT * FROM attempts WHERE question_id IN (${q})`);
  read('memory_reviews',`SELECT * FROM memory_reviews WHERE card_id IN (${m})`);
  for(const name of ['attempt_faults','attempt_evidence_snapshots'])read(name,`SELECT * FROM ${name} WHERE attempt_id IN (SELECT id FROM attempts WHERE question_id IN (${q}))`);
  read('question_knowledge',`SELECT * FROM question_knowledge WHERE question_id IN (${q})`);
  read('memory_knowledge',`SELECT * FROM memory_knowledge WHERE card_id IN (${m})`);
  read('relations',`SELECT * FROM relations WHERE source_id IN (${k}) OR target_id IN (${k})`,[...params,...params]);
  read('analyses',`SELECT * FROM analyses WHERE knowledge_id IN (${k})`);
  read('knowledge_keys',`SELECT * FROM knowledge_keys WHERE knowledge_id IN (${k})`);
  read('plans',`SELECT * FROM plans WHERE question_id IN (${q})`);
  read('memory_plans',`SELECT * FROM memory_plans WHERE card_id IN (${m})`);
  read('question_assessment_policies',`SELECT * FROM question_assessment_policies WHERE question_id IN (${q})`);
  for(const name of ['deck_review_policies','deck_assessment_policies','deck_review_config_v2','knowledge_specialty_prefs','saved_filters','study_sessions'])read(name,`SELECT * FROM ${name} WHERE deck_id IN (${ph})`);
  for(const name of ['scheduling','schedule_events','card_review_policies','review_due_overrides','review_receipts','detached_knowledge_links'])read(name,`SELECT * FROM ${name} WHERE card_id IN (${cards})`,cardParams);
  const operations=[...new Set((tables.review_due_overrides??[]).map(r=>String(r.operation_id)))];
  read('review_config_operations',operations.length?`SELECT * FROM review_config_operations WHERE id IN (${operations.map(()=>'?').join(',')})`:'SELECT * FROM review_config_operations WHERE 0',operations);
  if(before.schemaVersion===606){
   read('learning_cards',`SELECT * FROM learning_cards WHERE deck_id IN (${ph})`);
   for(const name of ['learning_content_versions','learning_study_cycles','learning_published_modes','learning_card_drafts','learning_review_events'])read(name,`SELECT * FROM ${name} WHERE card_id IN (${cards})`,cardParams);
  }
  const cardIds=new Set((before.schemaVersion===606?tables.learning_cards:[...tables.questions!,...tables.memory_cards!])!.map(r=>String(r.id))),nodeIds=new Set(tables.knowledge!.map(r=>String(r.id))),deckSet=new Set(selected);
  // Persistent scoped metadata only. Global preferences, credentials and transient
  // export/clipboard/preview/IPC receipts must not overwrite the target app.
  tables.settings=[];
  const scopedPrefixes=['media-draft:','new-card-draft:','unified-knowledge-body:','unified-knowledge-order:','unified-card-knowledge:','unified-card-policy:','unified-archived-session:'];
  for(const row of db.prepare("SELECT key FROM settings WHERE key LIKE 'unified-%' OR key LIKE 'new-card-%'").iterate())
   if(!scopedPrefixes.some(p=>String(row.key).startsWith(p)))throw Error('APPEND_SETTINGS_UNSUPPORTED');
  for(const prefix of ['media-draft:','new-card-draft:','unified-knowledge-body:','unified-knowledge-order:','unified-card-knowledge:','unified-card-policy:','unified-archived-session:']){
   for(const row of db.prepare('SELECT key,value FROM settings WHERE key LIKE ?').iterate(prefix+'%')){
    const value=JSON.parse(String(row.value)) as {deckId?:string;cardId?:string;nodeId?:string;document?:{deckId?:string}};
    const owns=prefix==='unified-archived-session:'?deckSet.has(value.document?.deckId??''):value.deckId!==undefined?deckSet.has(value.deckId):value.cardId!==undefined?cardIds.has(value.cardId):value.nodeId!==undefined?nodeIds.has(value.nodeId):false;
    if(owns)tables.settings.push(row);
   }
  }
  // Old abandoned answer drafts are not today's active responseImages. Reject
  // missing ownership explicitly instead of silently excluding their only image.
  for(const row of tables.study_sessions??[]){
   const page=JSON.parse(String(row.payload)) as {abandonedDrafts?:{responseImages?:unknown}[]};
   if(page.abandonedDrafts!==undefined&&!Array.isArray(page.abandonedDrafts))throw Error('APPEND_SESSION_MEDIA_INCOMPLETE');
   for(const draft of page.abandonedDrafts??[]){
    if(!draft||typeof draft!=='object')throw Error('APPEND_SESSION_MEDIA_INCOMPLETE');
    if(draft.responseImages===undefined)continue;
    if(!Array.isArray(draft.responseImages)||draft.responseImages.some(id=>typeof id!=='string'))throw Error('APPEND_SESSION_MEDIA_INCOMPLETE');
    for(const assetId of draft.responseImages){
     const metadata=tables.settings.find(r=>r.key==='media-draft:'+assetId),asset=metadata?JSON.parse(String(metadata.value)):null;
     if(!asset||asset.id!==assetId||asset.deckId!==row.deck_id||asset.purpose!=='response'||!before.media.some(m=>m.name===asset.file_name))throw Error('APPEND_SESSION_MEDIA_INCOMPLETE');
    }
   }
  }
  tables.recycle_batches=[];
  for(const row of db.prepare('SELECT * FROM recycle_batches').iterate()){
   const payload=JSON.parse(String(row.payload)) as {deckId?:string};
   if(row.kind==='deck'&&deckSet.has(String(row.item_id))||row.kind==='knowledge'&&nodeIds.has(String(row.item_id))||['question','memory','card'].includes(String(row.kind))&&cardIds.has(String(row.item_id))||row.kind==='unified-knowledge'&&deckSet.has(payload.deckId??''))tables.recycle_batches.push(row);
  }
  const owners=new Set<string>();
  for(const [table,prefix,id] of [['assets','assets/','id'],['attempts','attempts/','id'],['memory_reviews','memory_reviews/','id'],['learning_content_versions','versions/','id'],['learning_card_drafts','drafts/','card_id']] as const)
   for(const row of tables[table]??[])owners.add(prefix+String(row[id]));
  for(const row of tables.settings)owners.add(String(row.key));
  const references=before.references.filter(r=>owners.has(r.owner)),names=new Set(references.map(r=>r.fileName)),media=before.media.filter(m=>names.has(m.name));
  if(media.length!==names.size)throw Error('APPEND_MEDIA_CLOSURE_INVALID');
  const excludedGlobalTables=['folders','audits','import_batches','import_entries','diagnosis_config','protocol_meta','protocol_receipts','platform_operations','learning_model_meta','learning_owner','sqlite_sequence'];
  const recognized=new Set([...Object.keys(tables),...excludedGlobalTables]);
  if(before.tables.some(t=>!recognized.has(t.name)))throw Error('APPEND_TABLE_UNSUPPORTED');
  const canonical=Object.keys(tables).sort().map(name=>({table:name,rows:tables[name]!.map(r=>hash(encoded(Object.entries(r)))).sort()}));
  const graphDigest=hash(encoded({schema:before.schemaVersion,selected,tables:canonical,media,references}));
  db.exec('COMMIT');if(scan.verify().digest!==before.digest)throw Error('EXTERNAL_SNAPSHOT_CHANGED');
  return {sourceGeneration:scan.summary.sourceGeneration,sourceSchema:before.schemaVersion as 604|606,selectedDeckIds:selected,snapshotDigest:before.digest,graphDigest,tables,media,references,
   excludedGlobalTables:[...excludedGlobalTables,'settings(global/transient)']};
 }finally{if(db.isTransaction)db.exec('ROLLBACK');db.close();}
}
