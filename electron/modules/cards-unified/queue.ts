import type { z } from 'zod';
import { LearningQueueInput, LearningQueue } from '../../../shared/protocol/unified-review.ts';
import { ProtocolError } from '../../../shared/protocol/data.ts';
import { filterStudyCards, sampleKnowledge, randomKnowledgeCandidates, type QueryCard } from '../../../shared/study-query.ts';
import { selectCandidates, type QueueCandidate } from '../../../shared/review-priority-v2.ts';
import { dailyReviewBudget } from '../../../shared/review-budget.ts';
import { calendarDay } from '../../../shared/calendar.ts';
import type { Context } from '../../infrastructure/context.ts';
import { resolveWindow } from '../analytics/window.ts';
import { reviewConfig } from '../review/config-service.ts';
import { requireDraftModel } from './new-drafts.ts';
import { publishedCard, currentDue, digest } from './schedule.ts';
import { liveCardLinks, cardMastery, knowledgeMastery } from './mastery.ts';
import { reservedReviewCards } from './review-session.ts';

/** Metadata-only queue. Reuse filtering, daily budgets and ranking; no parallel scheduler. */
export function previewLearningQueue(ctx:Context,input:z.infer<typeof LearningQueueInput>) {
  requireDraftModel(ctx);
  const p=LearningQueueInput.parse(input),now=ctx.now();
  if(!ctx.db.prepare('SELECT 1 FROM decks WHERE id=? AND deleted_at IS NULL').get(p.deckId))
    throw new ProtocolError('DECK_CONFLICT','卡片集不存在或已删除');
  const view=reviewConfig(ctx,p.deckId),config=view.config;
  const timezone=String(ctx.db.prepare("SELECT value FROM settings WHERE key='studyTimezone'").get()?.value??'Asia/Shanghai');
  const seed=p.seed||calendarDay(now,timezone),nodes=ctx.db.prepare('SELECT id,parent_id,name FROM knowledge WHERE module=? AND deleted_at IS NULL').all(p.deckId)
    .map(r=>({id:String(r.id),parent_id:r.parent_id?String(r.parent_id):null,name:String(r.name)}));
  if(p.filters.knowledge.some(id=>!nodes.some(n=>n.id===id)))throw new ProtocolError('DECK_CONFLICT','知识点已移动或删除，请清除失效条件');
  const rows=ctx.db.prepare(`SELECT c.id,c.title,c.published_type,c.current_cycle_id,
    json_extract(v.document,'$.availability') availability,json_extract(v.document,'$.payload.encoding') encoding,
    COALESCE(q.created_at,m.created_at,(SELECT min(started_at) FROM learning_study_cycles WHERE card_id=c.id)) createdAt,
    json_extract(v.document,'$.payload.fields') fields
    FROM learning_cards c JOIN learning_content_versions v ON v.id=c.current_version_id
    LEFT JOIN questions q ON q.id=c.id LEFT JOIN memory_cards m ON m.id=c.id
    WHERE c.deck_id=? AND c.deleted_at IS NULL ORDER BY c.id LIMIT 5001`).all(p.deckId);
  if(rows.length>5000)throw new ProtocolError('QUEUE_TOO_LARGE','请分卡片集生成复盘队列');
  const cardIds=new Set(rows.map(r=>String(r.id)));
  if(p.selectedIds?.some(id=>!cardIds.has(id)))throw new ProtocolError('DECK_CONFLICT','所选卡片不属于当前集或已删除');
  const history=ctx.db.prepare(`SELECT e.card_id,e.cycle_id,e.created_at,e.id,
    json_extract(e.document,'$.deckIdAtEvent') deckId,
    json_extract(e.document,'$.native.schedule.outcome') outcome,
    json_extract(e.document,'$.native.practice') practice,
    json_extract(e.document,'$.native.elapsedSeconds') seconds,
    json_extract(e.document,'$.objectiveCorrect') objective,
    json_extract(e.document,'$.scoreTenths') score,
    json_extract(e.document,'$.legacyScore') legacyScore,
    json_extract(e.document,'$.legacyRaw') legacyRaw
    FROM learning_review_events e JOIN learning_cards c ON c.id=e.card_id
    WHERE c.deck_id=? AND c.deleted_at IS NULL ORDER BY e.created_at,e.id`).all(p.deckId).map(r=>{
      const legacy=r.legacyRaw?JSON.parse(String(r.legacyRaw)):null;
      const effective=r.outcome?r.outcome==='updated':!!legacy?.row?.effective;
      const practice=!!r.practice||legacy?.evidence?.practice===1;
      return {card_id:String(r.card_id),cycle_id:String(r.cycle_id),created_at:String(r.created_at),
        deckId:r.deckId===null?null:String(r.deckId),seconds:Number(r.seconds??0),objective:r.objective===null?null:Number(r.objective),
        score:r.score===null?null:Number(r.score),effective,practice,failed:r.objective===0||(r.objective===null&&(r.score!==null?Number(r.score)<60:Number(r.legacyScore)<=1))};
    });
  const budget=dailyReviewBudget(history.filter(r=>r.deckId===null||r.deckId===p.deckId).filter(r=>r.effective&&!r.practice)
    .map(r=>({card_id:String(r.card_id),created_at:String(r.created_at),effective:true})),cardIds,now,timezone);
  const today=history.filter(r=>(r.deckId===null||r.deckId===p.deckId)&&calendarDay(new Date(String(r.created_at)),timezone)===calendarDay(now,timezone));
  const practice=today.filter(r=>r.practice),practiceUsed=practice.length;
  const practiceSeconds=practice.reduce((n,r)=>n+Number(r.seconds??0),0);
  const links=liveCardLinks(ctx,p.deckId),reserved=reservedReviewCards(ctx,p.deckId);
  const excluded:Record<string,number>={},skip=(reason:string)=>{excluded[reason]=(excluded[reason]??0)+1;};
  const dueMap=new Map<string,ReturnType<typeof currentDue>>();
  const ready:QueryCard[]=[];
  for(const row of rows) {
    const id=String(row.id);
    if(p.selectedIds&&!p.selectedIds.includes(id))continue;
    if(reserved.has(id)){skip('session_reserved');continue;}
    if(row.availability!=='known'||row.encoding==='legacy-question-604'){skip('needs_content_confirmation');continue;}
    const due=currentDue(ctx,publishedCard(ctx,{cardId:id,deckId:p.deckId}));dueMap.set(id,due);
    const all=history.filter(r=>r.card_id===id),active=all.filter(r=>r.cycle_id===row.current_cycle_id&&r.effective&&!r.practice);
    const kids=links.filter(l=>l.cardId===id).map(l=>l.nodeId);
    ready.push({id,title:String(row.title),text:[row.title,row.fields,...nodes.filter(n=>kids.includes(n.id)).map(n=>n.name)].join(' '),knowledgeIds:kids,
      paused:due.paused,ready:true,dueAt:due.dueAt??now.toISOString(),createdAt:row.createdAt?String(row.createdAt):null,
      firstReviewAt:all[0]?String(all[0].created_at):null,lastReviewAt:all.at(-1)?String(all.at(-1)!.created_at):null,
      reviewCount:active.length,totalReviews:all.length,failures:active.filter(r=>r.failed).length,
      lastFailed:active.at(-1)?.failed??false,repeated:active.slice(-3).filter(r=>r.failed).length>=2,
      uncertain:active.some(r=>r.objective===1&&r.score!==null&&Number(r.score)<75)});
  }
  const window=resolveWindow(p.filters.date,now,timezone);
  let filters=p.filters,selectedKnowledge:string[]=[];
  if(p.randomKnowledge) {
    const eligible=filterStudyCards(ready,filters,nodes,window,now,true);
    const ids=randomKnowledgeCandidates(p.randomKnowledge.scope,eligible,eligible,filters.knowledge);
    const weights=p.randomKnowledge.weighted?new Map(ids.map(id=>{const m=knowledgeMastery(ctx,{deckId:p.deckId,nodeId:id,scope:'direct'});return [id,(m.risk??0.5)+0.01] as const;})):undefined;
    let counter=0;
    const rng=()=>Number.parseInt(digest({seed,counter:counter++}).slice(0,8),16)/0x100000000;
    selectedKnowledge=sampleKnowledge(ids,p.randomKnowledge.count,weights,rng);
    filters={...filters,knowledge:selectedKnowledge};
  }
  const matched=p.randomKnowledge&&!selectedKnowledge.length?[]:filterStudyCards(ready,filters,nodes,window,now);
  const pools:{due:QueueCandidate[];relearn:QueueCandidate[];specialty:QueueCandidate[]}={due:[],relearn:[],specialty:[]};
  const modes=new Map(rows.map(r=>[String(r.id),String(r.published_type)]));
  const knowledgeRisk=new Map<string,ReturnType<typeof knowledgeMastery>>();
  for(const c of matched) {
    const due=dueMap.get(c.id)!;
    if(c.paused){skip('paused');continue;}
    const age=Math.max(0,(+now-Date.parse(c.dueAt!))/86400000);
    const interval=Math.max(1,(Date.parse(c.dueAt!)-Date.parse(due.lastReview??''))/86400000||1);
    const mastery=cardMastery(ctx,{cardId:c.id,deckId:p.deckId});
    const km=c.knowledgeIds.map(nodeId=>{if(!knowledgeRisk.has(nodeId))knowledgeRisk.set(nodeId,knowledgeMastery(ctx,{deckId:p.deckId,nodeId,scope:'direct'}));return knowledgeRisk.get(nodeId)!;});
    const prefs=view.knowledge.filter(k=>!k.orphan&&c.knowledgeIds.includes(k.knowledgeId)).map(k=>k.preference);
    const fatigue=today.some(r=>r.card_id===c.id);
    const candidate:QueueCandidate={cardId:c.id,kind:modes.get(c.id)==='question'?'question':'memory',dueAt:c.dueAt!,
      overdue:age/(age+interval),severe:age>=Math.max(7,interval),questionRisk:mastery.risk??0.5,
      knowledgeRisk:Math.max(0,...km.map(k=>(k.risk??0)*k.confidence)),coverage:km.length?Math.max(...km.map(k=>1-k.confidence)):1,
      knowledgeIds:c.knowledgeIds,fatigue,specialtyBoost:prefs.length?Math.max(...prefs.map(k=>k.boost*(k.mode==='prioritize'?1.25:k.mode==='reduce'?0.75:1)*(k.variantFirst&&fatigue?0.5:1))):1,
      reasonCodes:[...(c.lastFailed?['repeat_error']:[]),...(fatigue?['recent_fatigue']:[])]};
    if(Date.parse(c.dueAt!)<=+now)(budget.dueIds.has(c.id)?pools.relearn:pools.due).push(candidate);
    else if(modes.get(c.id)==='question'&&!due.explicitSnooze&&config.crossQuestionVerification&&!prefs.some(k=>k.mode==='exclude_specialty'||k.practicePaused||k.practiceTarget===0))
      pools.specialty.push({...candidate,reasonCodes:[...candidate.reasonCodes,'cross_question_practice']});
    else skip('specialty_excluded');
  }
  const dueLeft=Math.max(0,view.dailyLimit-budget.uniqueDue),relearnLeft=Math.max(0,config.sameDayRelearnBudget-budget.relearnEvents);
  const specialtyLeft=config.practiceMinutes&&practiceSeconds>=config.practiceMinutes*60?0:Math.max(0,config.specialtyDailyLimit-practiceUsed);
  const due=selectCandidates(pools.due,Math.min(p.limit,dueLeft),config,seed);
  const relearn=selectCandidates(pools.relearn,Math.min(p.limit-due.length,relearnLeft),config,seed);
  const used=new Map<string,number>();
  const specialty=selectCandidates(pools.specialty,pools.specialty.length,config,seed,true).filter(c=>{
    const prefs=view.knowledge.filter(k=>!k.orphan&&c.knowledgeIds.includes(k.knowledgeId));
    if(prefs.some(k=>k.preference.practiceTarget!==null&&(used.get(k.knowledgeId)??0)>=k.preference.practiceTarget))return false;
    for(const id of c.knowledgeIds)used.set(id,(used.get(id)??0)+1);return true;
  }).slice(0,Math.min(p.limit-due.length-relearn.length,specialtyLeft));
  const project=(items:ReturnType<typeof selectCandidates>)=>items.map(c=>({cardId:c.cardId,publishedType:modes.get(c.cardId),dueAt:c.dueAt,reasonCodes:c.reasonCodes,score:c.score,knowledgeIds:c.knowledgeIds}));
  return LearningQueue.parse({deckId:p.deckId,configRevision:view.revision,dataRevision:Number(ctx.db.prepare('SELECT revision FROM protocol_meta WHERE singleton=1').get()?.revision??0),
    calculatedAt:now.toISOString(),timezone,seed,selectedKnowledge,budgets:{uniqueDueUsed:budget.uniqueDue,relearnUsed:budget.relearnEvents,practiceUsed,dueLeft,relearnLeft,specialtyLeft,practiceMinutes:config.practiceMinutes},
    due:project(due),relearn:project(relearn),specialty:project(specialty),excluded});
}
