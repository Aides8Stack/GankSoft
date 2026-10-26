import {z} from 'zod';
import {ContentVersion,ContentPayload,ReviewEvent,type ContentVersionDTO} from '../../../shared/protocol/unified.ts';
import {StoredDraft,StoredNewDraft,WorkspaceDraft,DraftPayload} from '../../../shared/protocol/card-draft.ts';
import {StoredNodeBody,StoredTreeOrder,StoredCardLinks,StoredKnowledgeRecycle} from '../../../shared/protocol/knowledge-tree.ts';
import {StoredReviewSession,NativeCardPolicy,UnifiedScheduleMetadata,KnowledgePathSnapshot} from '../../../shared/protocol/review-details.ts';
import {ArchivedReviewSession} from '../../../shared/protocol/card-lifecycle.ts';
import {parsePlacement,placementUrl} from '../../../shared/editor/document.ts';
import {mapMarkdownImages,imageMarkdown,assertKnowledgeAssets} from '../../../shared/knowledge/media.ts';
import {contentIdentity,contentOrdinal} from '../../../shared/protocol/identity.ts';
import {digest} from '../cards-unified/schedule.ts';
import {AppendIdentityMap} from './append-identities.ts';
type References=ContentVersionDTO['mediaRefs'];
export interface SourceScheduleContext {cycleId:string;state:unknown}
/** Typed fields own identity rewriting. Body text, card-local option IDs, original
 * proof hashes, scores, timestamps and FSRS numeric state are not string-replaced. */
export class AppendJsonMap {
 private readonly ids:AppendIdentityMap;
 constructor(ids:AppendIdentityMap){this.ids=ids;}
 private knowledge(value:unknown){return z.array(KnowledgePathSnapshot).parse(value).map(p=>({...p,nodeId:this.ids.id('knowledge',p.nodeId),deckId:this.ids.id('deck',p.deckId)}));}
 references(refs:References):References {return refs.map(r=>({...r,assetId:this.ids.id('asset',r.assetId),placementId:this.ids.id('placement',r.placementId),fileName:this.ids.fileName(r.fileName)}));}
 private fields(value:unknown,refs:References):unknown {
  if(typeof value==='string')return mapMarkdownImages(value,image=>{
   const p=parsePlacement(image.url),ref=refs.find(r=>r.placementId===p.placementId);
   if(!ref||ref.assetId!==p.assetId||ref.width!==p.width)throw Error('APPEND_INLINE_MEDIA_INCOMPLETE');
   return imageMarkdown(image,placementUrl({assetId:this.ids.id('asset',p.assetId),placementId:this.ids.id('placement',p.placementId),width:p.width}));
  });
  if(Array.isArray(value))return value.map(v=>this.fields(v,refs));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,this.fields(v,refs)]));
  return value;
 }
 published(value:unknown){
  const v=ContentVersion.parse(value);if(v.source.kind!=='published'||v.source.key!==v.cardId)throw Error('APPEND_PUBLISHED_SOURCE_INVALID');
  const cardId=this.ids.id('card',v.cardId);
  return ContentVersion.parse({...v,versionId:this.ids.nativeVersion(v),cardId,payload:v.payload===null?null:ContentPayload.parse(this.fields(v.payload,v.mediaRefs)),mediaRefs:this.references(v.mediaRefs),
   source:{...v.source,key:cardId,wireToken:v.source.wireToken?contentIdentity(cardId,contentOrdinal(v.source.wireToken,v.cardId)):null}});
 }
 workspaceDraft(value:unknown){
  const d=WorkspaceDraft.parse(value);
  return WorkspaceDraft.parse({...d,cardId:this.ids.id('card',d.cardId),payload:DraftPayload.parse(this.fields(d.payload,d.mediaRefs)),mediaRefs:this.references(d.mediaRefs),
   origin:d.origin.strategy==='unpublished'?{...d.origin}:{...d.origin,versionId:this.ids.resolve('version',d.origin.versionId)}});
 }
 existingDraft(value:unknown){const d=StoredDraft.parse(value);return StoredDraft.parse({...d,document:this.workspaceDraft(d.document)});}
 newDraft(value:unknown){const d=StoredNewDraft.parse(value);return StoredNewDraft.parse({...d,deckId:this.ids.id('deck',d.deckId),document:this.workspaceDraft(d.document)});}
 knowledgeBody(value:unknown){
  const b=StoredNodeBody.parse(value);assertKnowledgeAssets(b.markdown,b.assets);
  const markdown=mapMarkdownImages(b.markdown,image=>{const p=parsePlacement(image.url);return imageMarkdown(image,placementUrl({assetId:this.ids.id('asset',p.assetId),placementId:this.ids.id('placement',p.placementId),width:p.width}));});
  const mapped=StoredNodeBody.parse({...b,nodeId:this.ids.id('knowledge',b.nodeId),deckId:this.ids.id('deck',b.deckId),markdown,
   assets:b.assets.map(a=>({...a,id:this.ids.id('asset',a.id),fileName:this.ids.fileName(a.fileName)}))});assertKnowledgeAssets(mapped.markdown,mapped.assets);return mapped;
 }
 knowledgeOrder(value:unknown){const o=StoredTreeOrder.parse(value);return StoredTreeOrder.parse({...o,deckId:this.ids.id('deck',o.deckId),nodeIds:o.nodeIds.map(id=>this.ids.id('knowledge',id))});}
 cardLinks(value:unknown){const l=StoredCardLinks.parse(value);return StoredCardLinks.parse({...l,cardId:this.ids.id('card',l.cardId),deckId:this.ids.id('deck',l.deckId),nodeIds:l.nodeIds.map(id=>this.ids.id('knowledge',id))});}
 cardPolicy(value:unknown){const p=NativeCardPolicy.parse(value);return NativeCardPolicy.parse({...p,cardId:this.ids.id('card',p.cardId)});}
 knowledgeRecycle(value:unknown){const b=StoredKnowledgeRecycle.parse(value);return StoredKnowledgeRecycle.parse({...b,batchId:this.ids.id('recycle',b.batchId),deckId:this.ids.id('deck',b.deckId),rootId:this.ids.id('knowledge',b.rootId),mergedInto:b.mergedInto?this.ids.id('knowledge',b.mergedInto):null,
  nodes:b.nodes.map(n=>({...n,nodeId:this.ids.id('knowledge',n.nodeId),parentId:n.parentId?this.ids.id('knowledge',n.parentId):null}))});}
 schedule(value:unknown):unknown {
  if(value===null)return null;if(typeof value!=='object'||Array.isArray(value))throw Error('APPEND_SCHEDULE_INVALID');
  const state=structuredClone(value) as Record<string,unknown>;if(state._gank){const g=UnifiedScheduleMetadata.parse(state._gank);state._gank={...g,cycleId:this.ids.resolve('cycle',g.cycleId),eventId:this.ids.id('event',g.eventId)};}return state;
 }
 review(value:unknown){
  const e=ReviewEvent.parse(value);if(!e.native||e.legacyScale!==null)throw Error('APPEND_LEGACY_EVENT_DERIVED_REQUIRED');
  const knowledge=e.knowledgeSnapshot===null?null:this.knowledge(JSON.parse(e.knowledgeSnapshot));
  return ReviewEvent.parse({...e,eventId:this.ids.id('event',e.eventId),cardId:this.ids.id('card',e.cardId),deckIdAtEvent:e.deckIdAtEvent?this.ids.id('deck',e.deckIdAtEvent):null,
   contentVersionId:this.ids.resolve('version',e.contentVersionId),cycleId:this.ids.resolve('cycle',e.cycleId),knowledgeSnapshot:knowledge===null?null:JSON.stringify(knowledge),
   native:{...e.native,sessionId:this.ids.id('session',e.native.sessionId),knowledge:this.knowledge(e.native.knowledge)}});
 }
 session(value:unknown,current?:SourceScheduleContext){
  const s=StoredReviewSession.parse(value);if(!s.completed&&!current)throw Error('APPEND_SCHEDULE_CONTEXT_REQUIRED');
  let scheduleHash=s.entry.scheduleHash;
  if(!s.completed&&current&&scheduleHash===digest({cycleId:current.cycleId,state:current.state}))scheduleHash=digest({cycleId:this.ids.resolve('cycle',current.cycleId),state:this.schedule(current.state)});
  return StoredReviewSession.parse({...s,sessionId:this.ids.id('session',s.sessionId),deckId:this.ids.id('deck',s.deckId),ids:s.ids.map(id=>this.ids.id('card',id)),
   entry:{...s.entry,eventId:this.ids.id('event',s.entry.eventId),cardId:this.ids.id('card',s.entry.cardId),versionId:this.ids.resolve('version',s.entry.versionId),cycleId:this.ids.resolve('cycle',s.entry.cycleId),knowledge:this.knowledge(s.entry.knowledge),scheduleHash},
   resultEventId:s.resultEventId?this.ids.id('event',s.resultEventId):null,resumedAt:s.completed?s.resumedAt:null});
 }
 archivedSession(value:unknown){const s=ArchivedReviewSession.parse(value);return ArchivedReviewSession.parse({...s,document:this.session(s.document)});}
}
