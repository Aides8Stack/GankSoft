import {Id} from '../../../shared/protocol/data.ts';
import type {Row} from '../cards-unified/legacy.ts';
import {AppendIdentityMap,type AppendIdentityKind} from './append-identities.ts';
import {AppendJsonMap,type SourceScheduleContext} from './append-json.ts';

const columns:Record<string,Record<string,AppendIdentityKind>>={
 knowledge_history_identities:{id:'knowledge'},
 knowledge:{id:'knowledge',module:'deck',parent_id:'knowledge'},relations:{id:'relation',source_id:'knowledge',target_id:'knowledge'},
 analyses:{id:'analysis',knowledge_id:'knowledge'},knowledge_archives:{id:'archive',archive_key:'namespace',module:'deck'},
 knowledge_keys:{archive_key:'namespace',knowledge_id:'knowledge'},question_knowledge:{question_id:'card',knowledge_id:'knowledge'},memory_knowledge:{card_id:'card',knowledge_id:'knowledge'},
 plans:{question_id:'card'},memory_plans:{card_id:'card'},question_assessment_policies:{question_id:'card'},
 deck_review_policies:{deck_id:'deck'},deck_assessment_policies:{deck_id:'deck'},deck_review_config_v2:{deck_id:'deck'},
 knowledge_specialty_prefs:{deck_id:'deck',knowledge_id:'knowledge'},card_review_policies:{card_id:'card'},
 detached_knowledge_links:{card_id:'card',knowledge_id:'knowledge',source_deck:'deck',knowledge_deck:'deck'},
 saved_filters:{id:'filter',deck_id:'deck'},review_receipts:{request_id:'request',card_id:'card'},
 review_config_operations:{id:'operation',request_id:'request'},review_due_overrides:{card_id:'card',operation_id:'operation'},
};
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('APPEND_METADATA_INVALID');return value as Record<string,unknown>;}
/** Remaining scoped metadata. Original artifact bodies/checksums and request
 * hashes remain evidence; namespaces and reference fields are independent. */
export class AppendMetadataMap {
 private readonly ids:AppendIdentityMap;
 private readonly json:AppendJsonMap;
 constructor(ids:AppendIdentityMap){this.ids=ids;this.json=new AppendJsonMap(ids);}
 private list(kind:AppendIdentityKind,value:unknown){if(!Array.isArray(value))throw Error('APPEND_METADATA_INVALID');return value.map(v=>this.ids.id(kind,Id.parse(v)));}
 private fields(value:Record<string,unknown>,mapping:Record<string,AppendIdentityKind>){
  const out={...value};for(const [key,kind]of Object.entries(mapping))if(value[key]!=null)out[key]=this.ids.id(kind,Id.parse(value[key]));return out;
 }
 deck(source:Row,selectedDeckIds:readonly string[],folderId:string|null){
  if(folderId!==null)Id.parse(folderId);return {...source,id:this.ids.id('deck',String(source.id)),folder_id:folderId,
   parent_id:source.parent_id&&selectedDeckIds.includes(String(source.parent_id))?this.ids.id('deck',String(source.parent_id)):null};
 }
 row(table:string,source:Row):Row {
  const c=columns[table];if(!c)throw Error('APPEND_METADATA_TABLE_UNSUPPORTED');
  const out=this.fields(source,c) as Row;
  if(table==='relations'&&String(out.source_id)>String(out.target_id))[out.source_id,out.target_id]=[out.target_id!,out.source_id!];
  if(table==='saved_filters'){
   const p=object(JSON.parse(String(source.payload)));
   const allowed=['query','knowledge','includeChildren','match','state','performance','paused','minReviews','date','dateField','sort','mode'];
   if(Object.keys(p).some(k=>!allowed.includes(k))||p.mode!==undefined&&p.mode!=='all')throw Error('APPEND_FILTER_UNSUPPORTED');
   out.payload=JSON.stringify({...p,...p.knowledge!==undefined?{knowledge:this.list('knowledge',p.knowledge)}:{}});
  }
  if(table==='review_receipts')out.response=JSON.stringify(this.fields(object(JSON.parse(String(source.response))),{attemptId:'event'}));
  if(table==='review_config_operations')out.response=JSON.stringify(this.fields(object(JSON.parse(String(source.response))),{operationId:'operation'}));
  if(table==='review_due_overrides'){
   const a=object(JSON.parse(String(source.anchor))),mapped=this.fields(a,{module:'deck'});
   if(a.plan!=null)mapped.plan=this.row(source.kind==='question'?'plans':'memory_plans',object(a.plan) as Row);
   if(a.fsrs!=null)mapped.fsrs=this.json.schedule(a.fsrs);out.anchor=JSON.stringify(mapped);
  }
  return out;
 }
 private abandoned(value:unknown){
  const draft=object(value),out=this.fields(draft,{cardId:'card',entryId:'request'});
  if(draft.responseImages!==undefined)out.responseImages=this.list('asset',draft.responseImages);return out;
 }
 session(source:Row,current?:SourceScheduleContext):Row {
  const s=object(JSON.parse(String(source.payload)));let mapped:unknown;
  if(s.encoding==='ganksoft.review-session/1')mapped=this.json.session(s,current);
  else{
   const out=this.fields(s,{sessionId:'session',entryId:'request'});out.ids=this.list('card',s.ids);
   for(const [key,kind]of [['responseImages','asset'],['errorIds','knowledge']]as const)if(s[key]!==undefined)out[key]=this.list(kind,s[key]);
   if(s.savedResult!=null)out.savedResult=this.fields(object(s.savedResult),{attemptId:'event'});
   if(s.pendingSubmission!=null){
    const p=object(s.pendingSubmission),pending=this.fields(p,{question_id:'card',id:'card',deck_id:'deck',session_id:'session',request_id:'request'});
    for(const [key,kind]of [['response_images','asset'],['error_knowledge_ids','knowledge']]as const)if(p[key]!==undefined)pending[key]=this.list(kind,p[key]);
    out.pendingSubmission=pending;
   }
   if(s.abandonedDrafts!==undefined){if(!Array.isArray(s.abandonedDrafts))throw Error('APPEND_METADATA_INVALID');out.abandonedDrafts=s.abandonedDrafts.map(d=>this.abandoned(d));}
   out.timerPaused=true;mapped=out;
  }
  return {...source,deck_id:this.ids.id('deck',String(source.deck_id)),payload:JSON.stringify(mapped)};
 }
 setting(source:Row):Row {
  const key=String(source.key),p=object(JSON.parse(String(source.value)));let value:Record<string,unknown>,mappedKey:string;
  if(key.startsWith('media-draft:')){value=this.fields(p,{id:'asset',deckId:'deck'});value.file_name=this.ids.fileName(String(p.file_name));mappedKey='media-draft:'+value.id;}
  else if(key.startsWith('new-card-draft:')){const d=this.json.newDraft(p);value=d;mappedKey='new-card-draft:'+d.document.cardId;}
  else if(key.startsWith('unified-knowledge-body:')){const b=this.json.knowledgeBody(p);value=b;mappedKey='unified-knowledge-body:'+b.nodeId;}
  else if(key.startsWith('unified-knowledge-order:')){const o=this.json.knowledgeOrder(p);value=o;mappedKey='unified-knowledge-order:'+o.deckId;}
  else if(key.startsWith('unified-card-knowledge:')){const l=this.json.cardLinks(p);value=l;mappedKey='unified-card-knowledge:'+l.cardId;}
  else if(key.startsWith('unified-card-policy:')){const c=this.json.cardPolicy(p);value=c;mappedKey='unified-card-policy:'+c.cardId;}
  else if(key.startsWith('unified-archived-session:')){const a=this.json.archivedSession(p);value=a;mappedKey='unified-archived-session:'+a.document.sessionId;}
  else throw Error('APPEND_SETTING_UNSUPPORTED');
  return {...source,key:mappedKey,value:JSON.stringify(value)};
 }
 recycle(source:Row):Row {
  const p=object(JSON.parse(String(source.payload)));
  if(source.kind==='unified-knowledge'){const b=this.json.knowledgeRecycle(p);return {...source,item_id:b.batchId,payload:JSON.stringify(b)};}
  if(source.kind==='deck'){
   const mapping:Record<string,AppendIdentityKind>={questions:'card',memory_cards:'card',knowledge:'knowledge'};
   if(Object.keys(p).some(k=>!mapping[k]))throw Error('APPEND_RECYCLE_UNSUPPORTED');
   return {...source,item_id:this.ids.id('deck',String(source.item_id)),payload:JSON.stringify(Object.fromEntries(Object.entries(p).map(([k,v])=>[k,this.list(mapping[k]!,v)])))};
  }
  // No guessed format for unrecognized legacy subtree/card recycle records.
  throw Error('APPEND_RECYCLE_UNSUPPORTED');
 }
}
