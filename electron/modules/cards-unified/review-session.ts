import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import { ContentVersion, ReviewEvent } from '../../../shared/protocol/unified.ts';
import { ReviewSessionScope, OpenReviewSession, ChangeReviewSession, CommitReview, ReviewSessionView, ReviewSettlement } from '../../../shared/protocol/unified-review.ts';
import { FrozenReviewEntry, StoredReviewSession, SchedulePolicySnapshot } from '../../../shared/protocol/review-details.ts';
import { ProtocolError } from '../../../shared/protocol/data.ts';
import { ratingFromTenths, SCORE_MAPPING_VERSION } from '../../../shared/unified-rating.ts';
import { transaction } from '../../infrastructure/database.ts';
import type { Context } from '../../infrastructure/context.ts';
import { requireDraftModel } from './new-drafts.ts';
import { publishedCard, readSchedule, advanceSchedule, policySnapshot, digest } from './schedule.ts';
import { getPublishedContent } from './queries.ts';
import { getPromptContext } from './prompt.ts';
import { ENGINE } from '../review/fsrs-engine.ts';

type Session=z.infer<typeof StoredReviewSession>;
const emptyDraft=()=>({selectedOptionId:null,thought:'',scoreTenths:null,faults:[],gaps:'',reflection:'',practice:false});
function frozenEntry(ctx:Context,cardId:string,deckId:string) {
  const card=publishedCard(ctx,{cardId,deckId}),schedule=readSchedule(ctx,card);
  const content=getPublishedContent(ctx,{cardId,deckId,versionId:card.versionId});
  if(content.availability!=='known'||!content.payload) throw new ProtocolError('CONTENT_VERSION_NOT_AVAILABLE','当前版本无法安全复盘');
  if(content.payload.encoding==='legacy-question-604') throw new ProtocolError('LEGACY_OPTIONS_REQUIRE_CONFIRMATION','请先在编辑器显式整理旧选项并发布');
  const knowledge=getPromptContext(ctx,{cardId,deckId}).confirmed;
  return {entry:FrozenReviewEntry.parse({eventId:randomUUID(),cardId,versionId:card.versionId,cycleId:card.cycleId,
    scheduleRevision:schedule.revision,scheduleHash:schedule.hash,
    timezone:String(ctx.db.prepare("SELECT value FROM settings WHERE key='studyTimezone'").get()?.value??'Asia/Shanghai'),knowledge}),content};
}
function load(ctx:Context,input:z.infer<typeof ReviewSessionScope>,validateCard=true) {
  requireDraftModel(ctx);const p=ReviewSessionScope.parse(input);
  if(!ctx.db.prepare('SELECT 1 FROM decks WHERE id=? AND deleted_at IS NULL').get(p.deckId)) throw new ProtocolError('DECK_CONFLICT','卡片集不存在或已删除');
  const row=ctx.db.prepare("SELECT * FROM study_sessions WHERE deck_id=? AND json_extract(payload,'$.sessionId')=?").get(p.deckId,p.sessionId);
  if(!row) throw new ProtocolError('SESSION_NOT_FOUND','复盘会话不存在');
  const session=StoredReviewSession.parse(JSON.parse(String(row.payload)));
  if(session.deckId!==p.deckId||session.revision!==row.revision) throw new ProtocolError('SESSION_STORAGE_INVALID','会话身份或修订不一致');
  if(validateCard)publishedCard(ctx,{cardId:session.entry.cardId,deckId:p.deckId});
  return session;
}
function persist(ctx:Context,s:Session,insert=false) {
  const next=StoredReviewSession.parse(s);
  if(insert) ctx.db.prepare('INSERT INTO study_sessions VALUES(?,?,?,?)').run(s.deckId,JSON.stringify(next),ctx.now().toISOString(),s.revision);
  else ctx.db.prepare("UPDATE study_sessions SET payload=?,updated_at=?,revision=? WHERE deck_id=? AND json_extract(payload,'$.sessionId')=?")
    .run(JSON.stringify(next),ctx.now().toISOString(),s.revision,s.deckId,s.sessionId);
}
function tick(ctx:Context,s:Session) {
  if(s.resumedAt) {
    const delta=Math.max(0,ctx.now().getTime()-Date.parse(s.resumedAt));
    const used=Math.min(delta,86400000-s.elapsedMs);s.elapsedMs+=used;s.totalMs+=used;s.resumedAt=ctx.now().toISOString();
  }
}
function view(ctx:Context,s:Session) {
  const projected=structuredClone(s);tick(ctx,projected);
  const content=getPublishedContent(ctx,{cardId:s.entry.cardId,deckId:s.deckId,versionId:s.entry.versionId});
  const result=s.resultEventId?ctx.db.prepare('SELECT document FROM learning_review_events WHERE id=?').get(s.resultEventId):null;
  return ReviewSessionView.parse({sessionId:s.sessionId,deckId:s.deckId,revision:s.revision,index:s.index,total:s.ids.length,
    stage:s.stage,entry:s.entry,draft:s.draft,practiceMode:s.practiceMode,paused:s.resumedAt===null,elapsedSeconds:Math.floor(projected.elapsedMs/1000),
    totalSeconds:Math.floor(projected.totalMs/1000),completed:s.completed,content,result:result?ReviewEvent.parse(JSON.parse(String(result.document))):null});
}
export function getReviewSession(ctx:Context,input:z.infer<typeof ReviewSessionScope>) {return view(ctx,load(ctx,input));}
export function openReviewSession(ctx:Context,input:z.infer<typeof OpenReviewSession>) {
  requireDraftModel(ctx);const p=OpenReviewSession.parse(input);
  return transaction(ctx.db,()=>{
    const reserved=reservedReviewCards(ctx,p.deckId);
    if(p.cardIds.some(id=>reserved.has(id))) throw new ProtocolError('DUPLICATE_SESSION','卡片已有复盘页面，请恢复该页面');
    for(const cardId of p.cardIds) publishedCard(ctx,{cardId,deckId:p.deckId});
    const first=frozenEntry(ctx,p.cardIds[0],p.deckId);
    const session=StoredReviewSession.parse({encoding:'ganksoft.review-session/1',sessionId:randomUUID(),deckId:p.deckId,ids:p.cardIds,
      index:0,stage:first.content.mode==='direct'?'reveal':'answer',entry:first.entry,draft:emptyDraft(),revision:1,
      startedAt:ctx.now().toISOString(),practiceMode:false,elapsedMs:0,totalMs:0,resumedAt:ctx.now().toISOString(),resultEventId:null,completed:false});
    persist(ctx,session,true);return view(ctx,session);
  });
}
export function changeReviewSession(ctx:Context,input:z.infer<typeof ChangeReviewSession>) {
  const p=ChangeReviewSession.parse(input);
  return transaction(ctx.db,()=>{
    const s=load(ctx,{deckId:p.deckId,sessionId:p.sessionId});
    if(s.revision!==p.expectedRevision) throw new ProtocolError('REVISION_CONFLICT','复盘草稿已变化，请恢复最新页面');
    if(s.completed&&p.action==='next')return view(ctx,s);
    if(s.completed) throw new ProtocolError('SESSION_COMPLETED','本次复盘已完成');
    // A queued pause carries the actual foreground cutoff, even when an autosave reply was delayed.
    if(p.action==='pause'&&p.pausedAt&&s.resumedAt) {
      const cutoff=Math.min(ctx.now().getTime(),Date.parse(p.pausedAt));
      const delta=cutoff-Date.parse(s.resumedAt);
      const used=Math.max(-s.elapsedMs,Math.min(delta,86400000-s.elapsedMs));
      s.elapsedMs+=used;s.totalMs+=used;
    } else tick(ctx,s);
    if(p.draft) {
      if(s.stage==='result'||(s.stage==='reveal'&&(s.draft.selectedOptionId!==p.draft.selectedOptionId||s.draft.thought!==p.draft.thought)))
        throw new ProtocolError('ANSWER_FROZEN','独立作答和思路已冻结');
      s.draft={...p.draft,practice:false};s.practiceMode=false;
    }
    if(p.action==='reveal') {
      if(s.stage!=='answer') throw new ProtocolError('SESSION_STAGE_CONFLICT','当前不能揭示答案');
      const content=getPublishedContent(ctx,{cardId:s.entry.cardId,deckId:s.deckId,versionId:s.entry.versionId});
      if(content.payload?.encoding==='question-v1'&&(!content.payload.fields.options.some(o=>o.optionId===s.draft.selectedOptionId)||!s.draft.thought.trim()))
        throw new ProtocolError('ANSWER_INCOMPLETE','请选择选项并填写独立思路');
      s.stage='reveal';
    }
    if(p.action==='pause') s.resumedAt=null;
    if(p.action==='resume'&&s.stage!=='result') s.resumedAt=ctx.now().toISOString();
    if(p.action==='next') {
      if(s.stage!=='result') throw new ProtocolError('SESSION_STAGE_CONFLICT','请先提交当前复盘');
      if(s.index===s.ids.length-1) {s.completed=true;s.resumedAt=null;}
      else {
        const next=frozenEntry(ctx,s.ids[++s.index],s.deckId);s.entry=next.entry;s.draft={...emptyDraft(),practice:false};s.elapsedMs=0;
        s.stage=next.content.mode==='direct'?'reveal':'answer';s.resumedAt=ctx.now().toISOString();s.resultEventId=null;
      }
    }
    s.revision++;persist(ctx,s);return view(ctx,s);
  });
}
export function commitReview(ctx:Context,input:z.infer<typeof CommitReview>) {
  requireDraftModel(ctx);const p=CommitReview.parse(input),submissionHash=digest(p);
  return transaction(ctx.db,()=>{
    const existing=ctx.db.prepare('SELECT document FROM learning_review_events WHERE id=?').get(p.eventId);
    if(existing) {
      const event=ReviewEvent.parse(JSON.parse(String(existing.document)));
      if(event.deckIdAtEvent!==p.deckId||event.native?.sessionId!==p.sessionId||event.native.submissionHash!==submissionHash)
        throw new ProtocolError('ENTRY_CONFLICT','本次作答编号已用于其他提交');
      // A retry needs no live session/draft and cannot advance scheduling twice.
      return event;
    }
    const s=load(ctx,{deckId:p.deckId,sessionId:p.sessionId});
    if(s.revision!==p.expectedRevision) throw new ProtocolError('REVISION_CONFLICT','复盘草稿已变化');
    if(s.stage!=='reveal'||s.entry.eventId!==p.eventId||s.completed) throw new ProtocolError('SESSION_STAGE_CONFLICT','复盘阶段或作答编号不匹配');
    if(s.draft.scoreTenths!==p.scoreTenths||digest({faults:s.draft.faults,gaps:s.draft.gaps,reflection:s.draft.reflection,practice:s.draft.practice})!==digest({faults:p.faults,gaps:p.gaps,reflection:p.reflection,practice:p.practice}))
      throw new ProtocolError('SESSION_DRAFT_CONFLICT','请先保存本次自评和反思');
    tick(ctx,s);s.resumedAt=null;
    const content=ContentVersion.parse(getPublishedContent(ctx,{cardId:s.entry.cardId,deckId:s.deckId,versionId:s.entry.versionId}));
    const objective=content.payload?.encoding==='question-v1'?s.draft.selectedOptionId===content.payload.fields.correctOptionId:null;
    const rating=ratingFromTenths(p.scoreTenths,objective),card=publishedCard(ctx,{cardId:s.entry.cardId,deckId:s.deckId});
    const schedule=readSchedule(ctx,card),policy=policySnapshot(ctx,card);
    if(card.cycleId!==s.entry.cycleId||card.versionId!==s.entry.versionId||schedule.revision!==s.entry.scheduleRevision||schedule.hash!==s.entry.scheduleHash)
      throw new ProtocolError('REVIEW_SNAPSHOT_CONFLICT','卡片内容或排期已变化，作答已保留，请重新打开最新卡片后评分');
    if(p.practice)throw new ProtocolError('PRACTICE_REMOVED','正式评分必须更新排期，请保留作答并使用正式保存');
    const outcome='updated' as const;
    const after=advanceSchedule(ctx,card,rating,p.eventId);
    const event=ReviewEvent.parse({eventId:p.eventId,cardId:card.cardId,deckIdAtEvent:s.deckId,contentVersionId:s.entry.versionId,cycleId:s.entry.cycleId,
      mode:content.mode,createdAt:ctx.now().toISOString(),scoreTenths:p.scoreTenths,objectiveCorrect:objective,rating,mappingVersion:SCORE_MAPPING_VERSION,engineVersion:ENGINE,
      legacyScale:null,legacyScore:null,legacySelfScore:null,legacyRating:null,legacyRaw:null,knowledgeSnapshot:JSON.stringify(s.entry.knowledge),
      native:{encoding:'ganksoft.review-event/1',sessionId:s.sessionId,submissionHash,timezone:s.entry.timezone,selectedOptionId:s.draft.selectedOptionId,
        elapsedSeconds:Math.floor(s.elapsedMs/1000),thought:s.draft.thought,faults:p.faults,gaps:p.gaps,reflection:p.reflection,practice:false,policy,
        schedule:{outcome,expectedRevision:s.entry.scheduleRevision,beforeHash:schedule.hash,afterHash:after?.hash??null},knowledge:s.entry.knowledge}});
    ctx.db.prepare('INSERT INTO learning_review_events VALUES(?,?,?,?,?,?,?)').run(event.eventId,event.cardId,event.contentVersionId,event.cycleId,event.mode,event.createdAt,JSON.stringify(event));
    s.stage='result';s.resultEventId=event.eventId;s.completed=s.index===s.ids.length-1;s.revision++;persist(ctx,s);return event;
  });
}

/** Both encodings share one reservation table; previews never claim ownership. */
export function reservedReviewCards(ctx:Context,deckId:string) {
  const reserved=new Set<string>();
  for(const row of ctx.db.prepare('SELECT payload FROM study_sessions WHERE deck_id=?').iterate(deckId)) {
    const raw=JSON.parse(String(row.payload));
    const ids=raw.encoding==='ganksoft.review-session/1'?(raw.completed?[]:StoredReviewSession.parse(raw).ids):Array.isArray(raw.ids)?raw.ids:[];
    for(const id of ids)reserved.add(String(id));
  }
  return reserved;
}

/** Exclusive owner startup: an old active anchor cannot count shutdown/background time.
 * Keep the last durable milliseconds and draft; the user must explicitly resume. */
export function recoverReviewTimers(ctx:Context) {
  transaction(ctx.db,()=>{
    const changed=ctx.db.prepare(`UPDATE study_sessions SET
      payload=json_set(payload,'$.resumedAt',NULL,'$.revision',revision+1),revision=revision+1
      WHERE json_extract(payload,'$.encoding')='ganksoft.review-session/1'
      AND json_extract(payload,'$.resumedAt') IS NOT NULL`).run();
    if(changed.changes)ctx.db.prepare('UPDATE protocol_meta SET revision=revision+1 WHERE singleton=1').run();
  });
}

/** Immutable content + the SAME eventId's schedule snapshot, independent of today's scheduling row. */
function projectSession(ctx:Context,input:z.infer<typeof ReviewSessionScope>,includeRows:boolean) {
  const s=load(ctx,input,false),events=ctx.db.prepare(`SELECT e.document,h.after_state FROM learning_review_events e
    LEFT JOIN schedule_events h ON h.id=e.id AND h.card_id=e.card_id
    WHERE json_extract(e.document,'$.native.sessionId')=? AND json_extract(e.document,'$.deckIdAtEvent')=?
    ORDER BY e.created_at,e.id`).all(s.sessionId,s.deckId);
  const byCard=new Map(events.map(r=>{const event=ReviewEvent.parse(JSON.parse(String(r.document)));
    return [event.cardId,{event,dueAt:r.after_state?String(JSON.parse(String(r.after_state)).due):null}] as const;}));
  const rows=s.ids.map(cardId=>{
    const saved=byCard.get(cardId),versionId=saved?.event.contentVersionId??(cardId===s.entry.cardId?s.entry.versionId:null);
    const raw=!includeRows?null:versionId?ctx.db.prepare('SELECT document FROM learning_content_versions WHERE id=? AND card_id=?').get(versionId,cardId):
      ctx.db.prepare('SELECT v.document FROM learning_cards c JOIN learning_content_versions v ON v.id=c.current_version_id WHERE c.id=?').get(cardId);
    const content=raw?ContentVersion.parse(JSON.parse(String(raw.document))):null;
    return {cardId,title:content?.title??'已移除卡片',mode:content?.mode??'direct',event:saved?.event??null,dueAt:saved?.dueAt??null};
  });
  const done=rows.flatMap(r=>r.event?[r.event]:[]),scores=done.flatMap(e=>e.scoreTenths===null?[]:[e.scoreTenths]);
  const ratings={again:0,hard:0,good:0,easy:0};for(const e of done)if(e.rating)ratings[e.rating]++;
  const objective=done.filter(e=>e.objectiveCorrect!==null),due=rows.flatMap(r=>r.dueAt?[r.dueAt]:[]).sort();
  const projected=structuredClone(s);tick(ctx,projected);
  const fallback=ctx.db.prepare("SELECT updated_at FROM study_sessions WHERE deck_id=? AND json_extract(payload,'$.sessionId')=?").get(s.deckId,s.sessionId)!;
  const result={sessionId:s.sessionId,deckId:s.deckId,completed:s.completed,total:s.ids.length,
    startedAt:s.startedAt??done[0]?.createdAt??String(fallback.updated_at),completedCount:done.length,
    averageScoreTenths:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null,
    totalSeconds:Math.floor(projected.totalMs/1000),objectiveCount:objective.length,correctCount:objective.filter(e=>e.objectiveCorrect).length,
    ratings,nextDue:due[0]??null,rows};
  return result;
}
export function reviewSettlement(ctx:Context,input:z.infer<typeof ReviewSessionScope>) {
  return ReviewSettlement.parse(projectSession(ctx,input,true));
}
export function reviewSessionMetrics(ctx:Context,input:z.infer<typeof ReviewSessionScope>) {
  const {rows,sessionId,deckId,completed,total,...metrics}=projectSession(ctx,input,false);return metrics;
}
