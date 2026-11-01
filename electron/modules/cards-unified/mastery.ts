import { analyzeEvidence, type EvidenceEvent } from '../../../shared/review-evidence.ts';
import { ReviewEvent } from '../../../shared/protocol/unified.ts';
import { ProtocolError } from '../../../shared/protocol/data.ts';
import { diagnosisRule } from '../review/config-service.ts';
import type { Context } from '../../infrastructure/context.ts';
import { publishedCard } from './schedule.ts';
import { requireDraftModel } from './new-drafts.ts';

/** Current associations only. Historical snapshots never recreate live links. */
export function liveCardLinks(ctx:Context,deckId:string) {
  const live=new Set(ctx.db.prepare('SELECT id FROM knowledge WHERE module=? AND deleted_at IS NULL').all(deckId).map(r=>String(r.id)));
  const rows=ctx.db.prepare(`SELECT c.id cardId,l.knowledge_id nodeId FROM learning_cards c JOIN question_knowledge l ON l.question_id=c.id WHERE c.deck_id=? AND c.deleted_at IS NULL AND c.legacy_kind='question'
 UNION ALL SELECT c.id,l.knowledge_id FROM learning_cards c JOIN memory_knowledge l ON l.card_id=c.id WHERE c.deck_id=? AND c.deleted_at IS NULL AND c.legacy_kind='memory'
 UNION ALL SELECT c.id,j.value FROM learning_cards c JOIN settings s ON s.key='unified-card-knowledge:'||c.id JOIN json_each(s.value,'$.nodeIds') j WHERE c.deck_id=? AND c.deleted_at IS NULL AND c.legacy_kind IS NULL`).all(deckId,deckId,deckId);
  return rows.filter(r=>live.has(String(r.nodeId))).map(r=>({cardId:String(r.cardId),nodeId:String(r.nodeId)}));
}
function activeEvidence(ctx:Context,cardId:string,deckId:string) {
  const card=publishedCard(ctx,{cardId,deckId});
  const timezone=String(ctx.db.prepare("SELECT value FROM settings WHERE key='studyTimezone'").get()?.value??'Asia/Shanghai');
  return {card,events:evidenceRows(ctx,cardId,timezone,[...ctx.db.prepare('SELECT document FROM learning_review_events WHERE card_id=? AND cycle_id=? ORDER BY created_at,id').iterate(cardId,card.cycleId)])};
}
function evidenceRows(ctx:Context,cardId:string,timezone:string,rows:Iterable<Record<string,unknown>>) {
  const events:EvidenceEvent[]=[];
  for(const row of rows) {
    const e=ReviewEvent.parse(JSON.parse(String(row.document)));
    if(e.native) {
      if(e.native.schedule.outcome!=='updated'||e.native.practice) continue;
      events.push({id:e.eventId,cardId,at:e.createdAt,timezone:e.native.timezone,independent:true,practice:false,credit:1,
        positive:e.objectiveCorrect!==false&&(e.scoreTenths??0)>=60,
        negative:e.objectiveCorrect===false||(e.scoreTenths??0)<60,faults:e.native.faults});
    } else if(e.legacyRaw) {
      const old=JSON.parse(e.legacyRaw),r=old.row;
      // Preserve the existing effective/independent evidence qualifications.
      if(!r?.effective || (r.basis && r.basis!=='independent')) continue;
      const positive=e.objectiveCorrect===true?Number(r.understanding)>=2:e.objectiveCorrect===null&&(e.legacyScore??0)>=3;
      events.push({id:e.eventId,cardId,at:e.createdAt,timezone:old.evidence?.study_timezone??timezone,independent:true,
        practice:old.evidence?.practice===1,credit:1,positive,negative:!positive,faults:[]});
    }
  }
  return events;
}
function result(ctx:Context,events:EvidenceEvent[],coverage:number,knowledge=false,rule=diagnosisRule(ctx).rule) {
  const value=analyzeEvidence(events,ctx.now(),rule,coverage,knowledge);
  return {status:value.effectiveEvidenceN===0?'pending' as const:value.status,risk:value.risk,confidence:value.confidence,
    effectiveEvidenceN:value.effectiveEvidenceN,observations:value.observations,distinctCards:value.distinctCards};
}
export function cardMastery(ctx:Context,scope:{cardId:string;deckId:string}) {
  const {card,events}=activeEvidence(ctx,scope.cardId,scope.deckId);
  return {cardId:card.cardId,cycleId:card.cycleId,...result(ctx,events,1),
    historyCount:Number(ctx.db.prepare('SELECT count(*) n FROM learning_review_events WHERE card_id=?').get(card.cardId)!.n)};
}
export function knowledgeMastery(ctx:Context,p:{deckId:string;nodeId:string;scope:'direct'|'aggregate'}) {
  requireDraftModel(ctx);
  const nodes=ctx.db.prepare('SELECT id,parent_id FROM knowledge WHERE module=? AND deleted_at IS NULL').all(p.deckId);
  if(!nodes.some(n=>n.id===p.nodeId)) throw new ProtocolError('DECK_CONFLICT','知识点不属于当前卡片集');
  const selected=new Set([p.nodeId]);
  if(p.scope==='aggregate') {let size=-1;while(size!==selected.size){size=selected.size;for(const n of nodes)if(n.parent_id&&selected.has(String(n.parent_id)))selected.add(String(n.id));}}
  const cardIds=[...new Set(liveCardLinks(ctx,p.deckId).filter(l=>selected.has(l.nodeId)).map(l=>l.cardId))];
  const events=cardIds.flatMap(id=>activeEvidence(ctx,id,p.deckId).events);
  return {nodeId:p.nodeId,scope:p.scope,cardIds,...result(ctx,events,cardIds.length,true)};
}

/** Same current-cycle evidence model as knowledge, deduplicated over the entire active deck. */
export function deckMastery(ctx:Context,p:{deckId:string}){
 requireDraftModel(ctx);
 if(!ctx.db.prepare('SELECT 1 FROM decks WHERE id=? AND deleted_at IS NULL').get(p.deckId))throw new ProtocolError('DECK_CONFLICT','卡片集不存在');
 const ids=ctx.db.prepare('SELECT id FROM learning_cards WHERE deck_id=? AND deleted_at IS NULL').all(p.deckId).map(r=>String(r.id));
 const events=ids.flatMap(id=>activeEvidence(ctx,id,p.deckId).events);
 return {deckId:p.deckId,cardCount:ids.length,...result(ctx,events,ids.length,true)};
}

/** One deck evidence read; shared qualification and mastery model, no per-node IPC. */
export function masteryEvidenceBatch(ctx:Context,deckId:string) {
 const timezone=String(ctx.db.prepare("SELECT value FROM settings WHERE key='studyTimezone'").get()?.value??'Asia/Shanghai');
 const rows=ctx.db.prepare(`SELECT e.card_id,e.document FROM learning_review_events e JOIN learning_cards c ON c.id=e.card_id
 WHERE c.deck_id=? AND c.deleted_at IS NULL AND e.cycle_id=c.current_cycle_id ORDER BY e.created_at,e.id`).all(deckId);
 const grouped=new Map<string,Record<string,unknown>[]>();
 for(const row of rows){const id=String(row.card_id);if(!grouped.has(id))grouped.set(id,[]);grouped.get(id)!.push(row);}
 const rule=diagnosisRule(ctx).rule;
 const evidence=new Map([...grouped].map(([id,rows])=>[id,evidenceRows(ctx,id,timezone,rows)]));
 return (ids:string[],knowledge=false)=>result(ctx,ids.flatMap(id=>evidence.get(id)??[]),knowledge?ids.length:1,knowledge,rule);
}
