import { createHash } from 'node:crypto';
import { Rating, type Card as FsrsCard } from 'ts-fsrs';
import { canonical } from '../../../shared/protocol/host.ts';
import { ProtocolError } from '../../../shared/protocol/data.ts';
import { NativeDueOverride, NativeCardPolicy, SchedulePolicySnapshot, UnifiedScheduleMetadata } from '../../../shared/protocol/review-details.ts';
import { SCORE_MAPPING_VERSION, type UnifiedRating } from '../../../shared/unified-rating.ts';
import type { Context } from '../../infrastructure/context.ts';
import { requireDraftModel } from './new-drafts.ts';
import { draftCard } from './draft-service.ts';
import { reviewConfig } from '../review/config-service.ts';
import { clearDueOverrides, dueEligibility } from '../review/due-eligibility.ts';
import { nextFsrsCard, ENGINE } from '../review/fsrs-engine.ts';

export const digest = (value: unknown) => createHash('sha256').update(canonical(JSON.parse(JSON.stringify(value)))).digest('hex');
export function publishedCard(ctx: Context, scope: {cardId:string;deckId:string}) {
  const row=draftCard(ctx,scope);
  if(row.unpublished) throw new ProtocolError('CARD_NOT_PUBLISHED','请先发布卡片');
  return { cardId:scope.cardId,deckId:scope.deckId,versionId:String(row.current_version_id),
    cycleId:String(row.current_cycle_id),kind:row.legacy_kind ? String(row.legacy_kind) : 'card' };
}
export type PublishedCard = ReturnType<typeof publishedCard>;
/** Exactly one existing scheduling row per card, including legacy-backed cards. */
export function readSchedule(ctx: Context, card: PublishedCard) {
  const row=ctx.db.prepare('SELECT data FROM scheduling WHERE kind=? AND card_id=?').get(card.kind,card.cardId);
  let state=row ? JSON.parse(String(row.data)) as FsrsCard & {_gank?: unknown} : null;
  let revision=0;
  if(state?._gank) {
    const meta=UnifiedScheduleMetadata.parse(state._gank);
    if(meta.cycleId!==card.cycleId) state=null;
    else revision=meta.revision;
  } else if(state && ctx.db.prepare('SELECT provenance FROM learning_study_cycles WHERE id=?').get(card.cycleId)?.provenance!=='legacy-segment') {
    state=null; // A new cycle cannot borrow the preceding legacy FSRS state.
  }
  return {state,revision,hash:digest({cycleId:card.cycleId,state})};
}
export function schedulePolicy(ctx: Context, card: PublishedCard, deck=reviewConfig(ctx,card.deckId)) {
  const own=ctx.db.prepare('SELECT value FROM settings WHERE key=?').get('unified-card-policy:'+card.cardId);
  const policy=own ? NativeCardPolicy.parse(JSON.parse(String(own.value))) : null;
  if(policy && policy.cardId!==card.cardId) throw new ProtocolError('POLICY_STORAGE_INVALID','单卡配置身份不一致');
  const legacy=!policy && card.kind!=='card' ? ctx.db.prepare('SELECT max_interval_days FROM card_review_policies WHERE kind=? AND card_id=?').get(card.kind,card.cardId) : null;
  const max=policy ? policy.maxIntervalDays : legacy ? Number(legacy.max_interval_days) : null;
  return { ...SchedulePolicySnapshot.parse({revision:deck.revision,cardRevision:policy?.revision??0,maxIntervalDays:max??deck.maxIntervalDays,
    desiredRetention:deck.config.desiredRetention,source:max===null?'deck_default':'card_override'}),
    overrideRevision:policy?.revision??0,deck };
}
export function setCardSchedulePolicy(ctx: Context, card: PublishedCard, maxIntervalDays:number|null, expectedRevision:number) {
  const before=schedulePolicy(ctx,card);
  if(before.overrideRevision!==expectedRevision) throw new ProtocolError('REVISION_CONFLICT','单卡配置已变化');
  const value=NativeCardPolicy.parse({encoding:'ganksoft.card-policy/1',cardId:card.cardId,maxIntervalDays,revision:expectedRevision+1});
  ctx.db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run('unified-card-policy:'+card.cardId,JSON.stringify(value));
  // Preserve the current plan. The override takes effect at the next review.
  return {maxIntervalDays:schedulePolicy(ctx,card).maxIntervalDays,adjusted:false,revision:value.revision};
}
export function advanceSchedule(ctx: Context, card:PublishedCard, rating:UnifiedRating, eventId:string) {
  const current=readSchedule(ctx,card),policy=schedulePolicy(ctx,card),now=ctx.now();
  const grades={again:Rating.Again,hard:Rating.Hard,good:Rating.Good,easy:Rating.Easy} as const;
  const grade=grades[rating];
  const next=nextFsrsCard(current.state,now,grade,policy.maxIntervalDays,policy.desiredRetention);
  const state={...next.card,_gank:UnifiedScheduleMetadata.parse({encoding:'ganksoft.schedule/1',cycleId:card.cycleId,revision:current.revision+1,eventId})};
  const hash=digest({cycleId:card.cycleId,state});
  ctx.db.prepare('INSERT INTO scheduling VALUES(?,?,?,?) ON CONFLICT(kind,card_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at')
    .run(card.kind,card.cardId,JSON.stringify(state),now.toISOString());
  ctx.db.prepare('INSERT INTO schedule_events VALUES(?,?,?,?,?,?,?,?)').run(eventId,card.kind,card.cardId,grade,
    JSON.stringify(next.before),JSON.stringify(state),JSON.stringify({...next.log,engine:ENGINE,cycleId:card.cycleId,versionId:card.versionId,
      sourcePolicyRev:policy.revision,maxIntervalDays:policy.maxIntervalDays,desiredRetention:policy.desiredRetention,
      mappingVersion:SCORE_MAPPING_VERSION,beforeHash:current.hash,afterHash:hash}),now.toISOString());
  ctx.db.prepare('DELETE FROM settings WHERE key=?').run('unified-ai-due:'+card.cardId);
  if(card.kind!=='card') clearDueOverrides(ctx,card.kind,card.cardId);
  return {state,hash};
}

export function policySnapshot(ctx:Context,card:PublishedCard,deck?:ReturnType<typeof reviewConfig>) {
  const {revision,cardRevision,maxIntervalDays,desiredRetention,source}=schedulePolicy(ctx,card,deck);
  return SchedulePolicySnapshot.parse({revision,cardRevision,maxIntervalDays,desiredRetention,source});
}

export function cardPolicyById(ctx:Context,cardId:string) {
  requireDraftModel(ctx);
  const row=ctx.db.prepare('SELECT deck_id FROM learning_cards WHERE id=? AND deleted_at IS NULL').get(cardId);
  if(!row)throw new ProtocolError('CARD_NOT_FOUND','卡片不存在');
  return publishedCard(ctx,{cardId,deckId:String(row.deck_id)});
}
export function nativePolicyView(ctx:Context,cardId:string) {
  const card=cardPolicyById(ctx,cardId),policy=schedulePolicy(ctx,card);
  return {deckId:card.deckId,kind:'card' as const,cardId,maxIntervalDays:policy.maxIntervalDays,source:policy.source,deck:policy.deck,revision:policy.overrideRevision};
}

/** Native FSRS wins over a legacy plan; explicit new cycles never borrow old due dates. */
export function currentDue(ctx:Context,card:PublishedCard,schedule=readSchedule(ctx,card)) {
  const legacy=card.kind==='card'?null:dueEligibility(ctx,card.kind,card.cardId);
  const isLegacy=ctx.db.prepare('SELECT provenance FROM learning_study_cycles WHERE id=?').get(card.cycleId)?.provenance==='legacy-segment';
  const native=!!schedule.state?._gank;
  const base={dueAt:native?new Date(schedule.state!.due).toISOString():isLegacy?legacy?.effectiveDue??null:null,
    lastReview:schedule.state?.last_review?new Date(schedule.state.last_review).toISOString():null,
    paused:legacy?.paused??false,explicitSnooze:!native&&isLegacy&&(legacy?.explicitSnooze??false)};
  const raw=ctx.db.prepare('SELECT value FROM settings WHERE key=?').get('unified-ai-due:'+card.cardId);
  if(raw){const v=NativeDueOverride.parse(JSON.parse(String(raw.value)));if(v.cardId!==card.cardId)throw Error('到期覆盖身份损坏');
    if(base.dueAt&&!base.paused&&(v.anchor===dueOverrideAnchor(card,schedule.hash,base)||legacyDueOverrideMatches(ctx,v.anchor,card,schedule.hash,base)))
      base.dueAt=new Date(Math.min(Date.parse(base.dueAt),Date.parse(v.dueAt))).toISOString();}
  return base;
}

export function dueOverrideAnchor(card:PublishedCard,scheduleHash:string,base:{dueAt:string|null;paused:boolean;explicitSnooze:boolean}) {
 const {versionId,...identity}=card;
 return digest({card:identity,scheduleHash,base});
}

/** Old overrides included a content version. Recognize their original frozen
 * version without rewriting the override or relaxing cycle/schedule checks. */
function legacyDueOverrideMatches(ctx:Context,anchor:string,card:PublishedCard,scheduleHash:string,base:{dueAt:string|null;paused:boolean;explicitSnooze:boolean}) {
 if(anchor===digest({card,scheduleHash,base}))return true;
 for(const row of ctx.db.prepare('SELECT id FROM learning_content_versions WHERE card_id=?').iterate(card.cardId))
  if(anchor===digest({card:{...card,versionId:String(row.id)},scheduleHash,base}))return true;
 return false;
}

/** One scope/owner check for a bounded batch within the caller's read or write transaction. */
export function publishedDeckCards(ctx:Context,deckId:string,charge:(n:number)=>void){
 requireDraftModel(ctx);
 const cards=new Map<string,PublishedCard>();
 for(const r of ctx.db.prepare('SELECT c.id,c.current_version_id,c.current_cycle_id,c.legacy_kind FROM learning_cards c JOIN decks d ON d.id=c.deck_id WHERE c.deck_id=? AND c.deleted_at IS NULL AND d.deleted_at IS NULL AND c.current_version_id IS NOT NULL').iterate(deckId)){
  const card={cardId:String(r.id),deckId,versionId:String(r.current_version_id),cycleId:String(r.current_cycle_id),kind:r.legacy_kind?String(r.legacy_kind):'card'};
  charge(Buffer.byteLength(JSON.stringify(card))+128);cards.set(card.cardId,card);
 }
 return cards;
}
