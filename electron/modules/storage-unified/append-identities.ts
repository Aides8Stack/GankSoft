import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {DatabaseSync} from 'node:sqlite';
import {Id} from '../../../shared/protocol/data.ts';
import {ContentVersion,type ContentVersionDTO} from '../../../shared/protocol/unified.ts';
import {currentLegacyContent,historicalLegacyContent,stableId,type LegacyKind,type Row} from '../cards-unified/legacy.ts';
import {legacyEvent} from '../../infrastructure/migrations/legacy-projection.ts';
const Kind=z.enum(['deck','card','knowledge','asset','file','placement','version','cycle','event','session','material','relation','archive','filter','recycle','fault','batch']);
export type AppendIdentityKind=z.infer<typeof Kind>;
/** A deterministic per-import UUID namespace, not a merge with source identity.
 * Force-importing a second independent copy requires a new operation ID. */
export class AppendIdentityMap {
 private readonly operationId:string;
 private readonly mappings=new Map<string,{kind:AppendIdentityKind;sourceId:string;destinationId:string}>();
 private readonly destinations=new Map<string,string>();
 constructor(operationId:string){this.operationId=z.uuid().parse(operationId);}
 private key(kind:AppendIdentityKind,sourceId:string){return JSON.stringify([Kind.parse(kind),Id.parse(sourceId)]);}
 private bind(kind:AppendIdentityKind,sourceId:string,destinationId:string){
  const key=this.key(kind,sourceId),destination=Id.parse(destinationId),old=this.mappings.get(key),reverse=this.destinations.get(JSON.stringify([kind,destination]));
  if(old&&old.destinationId!==destination || reverse&&reverse!==key)throw Error('APPEND_IDENTITY_CONFLICT');
  this.mappings.set(key,{kind,sourceId,destinationId:destination});this.destinations.set(JSON.stringify([kind,destination]),key);return destination;
 }
 id(kind:AppendIdentityKind,sourceId:string){
  const key=this.key(kind,sourceId),old=this.mappings.get(key);if(old)return old.destinationId;
  const b=createHash('sha256').update(JSON.stringify(['ganksoft.independent-append/1',this.operationId,kind,sourceId])).digest().subarray(0,16);
  b[6]=(b[6]!&0x0f)|0x80;b[8]=(b[8]!&0x3f)|0x80;
  const h=b.toString('hex'),destination=z.uuid().parse(`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`);
  return this.bind(kind,sourceId,destination);
 }
 resolve(kind:AppendIdentityKind,sourceId:string){const value=this.mappings.get(this.key(kind,sourceId));if(!value)throw Error('APPEND_IDENTITY_UNBOUND');return value.destinationId;}
 entries(){return [...this.mappings.values()].map(v=>({...v})).sort((a,b)=>{const x=JSON.stringify([a.kind,a.sourceId]),y=JSON.stringify([b.kind,b.sourceId]);return x<y?-1:x>y?1:0;});}
 /** Preserve format and shared-file identity independently of asset ownership.
  * A full filename namespace also separates case-only source files on Windows. */
 fileName(source:string){const m=/^([a-f0-9-]+)\.(png|jpg|jpeg|webp)$/i.exec(source);if(!m)throw Error('APPEND_MEDIA_NAME_INVALID');return this.id('file',source)+'.'+m[2]!.toLowerCase();}
 nativeVersion(source:ContentVersionDTO){const doc=ContentVersion.parse(source);if(doc.source.kind!=='published')throw Error('APPEND_DERIVED_VERSION_REQUIRED');return this.id('version',doc.versionId);}
 /** Caller must first construct the complete verified remapped legacy row graph
  * in an isolated candidate. This binds identities; it does not copy any rows. */
 private assertLegacyMedia(source:ContentVersionDTO,target:ContentVersionDTO){
  if(source.mediaRefs.length!==target.mediaRefs.length)throw Error('APPEND_LEGACY_MEDIA_INCOMPLETE');
  for(let i=0;i<source.mediaRefs.length;i++){
   const a=source.mediaRefs[i]!,b=target.mediaRefs[i]!,assetId=this.id('asset',a.assetId);
   if(b.assetId!==assetId||b.fileName!==this.fileName(a.fileName)||b.placementId!==stableId('placement',assetId,i)||b.mime!==a.mime||b.role!==a.role||b.width!==a.width)
    throw Error('APPEND_LEGACY_MEDIA_INCOMPLETE');
  }
 }
 legacyCurrent(destination:DatabaseSync,kind:LegacyKind,source:ContentVersionDTO,remappedRow:Row){
  const original=ContentVersion.parse(source),ordinal=Number(kind==='question'?remappedRow.content_version:remappedRow.learning_version);
  if(original.source.kind!=='legacy-current'||original.mode!==(kind==='question'?'question':'qa')||original.source.key!==original.cardId||
     remappedRow.id!==this.id('card',original.cardId)||original.source.ordinal!==ordinal)throw Error('APPEND_LEGACY_BINDING_INVALID');
  const document=currentLegacyContent(destination,kind,remappedRow);this.assertLegacyMedia(original,document);
  this.bind('version',original.versionId,document.versionId);
  const sourceCycle=stableId('cycle',kind,original.cardId,ordinal),targetCycle=stableId('cycle',kind,document.cardId,ordinal);
  this.bind('cycle',sourceCycle,targetCycle);return document;
 }
 legacyArchive(destination:DatabaseSync,kind:LegacyKind,sourceEvent:Row,remappedEvent:Row){
  const sourceCard=String(kind==='question'?sourceEvent.question_id:sourceEvent.card_id),card=kind==='question'?remappedEvent.question_id:remappedEvent.card_id;
  const ordinal=Number(kind==='question'?sourceEvent.content_version:sourceEvent.card_version),targetOrdinal=Number(kind==='question'?remappedEvent.content_version:remappedEvent.card_version);
  if(card!==this.id('card',sourceCard)||remappedEvent.id!==this.id('event',String(sourceEvent.id))||ordinal!==targetOrdinal)throw Error('APPEND_LEGACY_BINDING_INVALID');
  const result=legacyEvent(destination,kind,remappedEvent);this.assertLegacyMedia(historicalLegacyContent(kind,sourceEvent),result.document);
  this.bind('version',stableId('event-content',kind,sourceEvent.id),result.document.versionId);
  this.bind('cycle',stableId('cycle',kind,sourceCard,ordinal),result.item.cycleId);return result;
 }
}
