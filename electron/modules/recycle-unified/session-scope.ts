import {StoredReviewSession,FrozenReviewEntry} from '../../../shared/protocol/review-details.ts';
import {ArchivedReviewSession} from '../../../shared/protocol/card-lifecycle.ts';
import {ReviewEvent} from '../../../shared/protocol/unified.ts';
import type {Row} from './purge-plan.ts';
/** Only the mutable page envelope is pruned. Published versions, event JSON,
 * thought/score, and FSRS rows of every survivor remain untouched. */
export function pruneSession(row:Row,table:string,raw:unknown,cards:Set<string>,events:Row[],mark:(t:string,r:Row,set?:Row)=>void,blockers:string[]):boolean{
 const archived=table==='settings';
 const rawSession=archived?(raw as Row)?.document:raw;
 const ids=(rawSession as Row)?.ids;
 if(!Array.isArray(ids)||!ids.some(id=>cards.has(id)))return false;
 try{
  if(!archived&&(rawSession as Row).schemaVersion===1){
   const old=rawSession as Row,allowed=['schemaVersion','sessionId','entryId','ids','index','stage','contentVersion','thought','answer','improvement','faultDetail','faults','errorIds','seconds','totalSeconds','timerPaused','understanding','selfScore','savedResult','responseImages','pendingSubmission','abandonedDrafts','practice','source'];
   if(Object.keys(old).some(k=>!allowed.includes(k))||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string')||!Number.isInteger(old.index)||old.index<0||old.index>=ids.length||!['answer','reveal','result'].includes(old.stage)||!Number.isInteger(old.contentVersion)||typeof old.sessionId!=='string'||typeof old.entryId!=='string')throw Error('旧复盘格式或归属无法证明');
   if(ids.some(id=>!cards.has(id))||(old.abandonedDrafts??[]).some((d:Row)=>!cards.has(d.cardId)))throw Error('旧混合复盘仍包含未选卡片的草稿，不自动改写');
   if(old.pendingSubmission)throw Error('旧复盘仍有未核对提交，不销毁未知结果');
   mark(table,row);return true;
  }
  const wrapper=archived?ArchivedReviewSession.parse(raw):null,s=wrapper?.document??StoredReviewSession.parse(raw);
  if(!archived&&s.deckId!==row.deck_id)throw Error('会话卡片集身份不一致');
  if(!archived&&s.revision!==row.revision)throw Error('会话修订不一致');
  const remain=s.ids.filter(id=>!cards.has(id));
  if(!remain.length){mark(table,row);return true;}
  if(!s.completed&&cards.has(s.entry.cardId))throw Error('被删卡片仍有当前复盘草稿，请先完成该页面');
  const owned=events.map(r=>ReviewEvent.parse(JSON.parse(r.document))).filter(e=>remain.includes(e.cardId)&&e.native?.sessionId===s.sessionId);
  const unique=new Map<string,typeof owned[number]>();for(const e of owned){if(unique.has(e.cardId))throw Error('剩余卡片存在重复会话事件');unique.set(e.cardId,e);}
  const completedIds=s.completed?remain:remain.filter(id=>s.ids.indexOf(id)<s.index||(id===s.entry.cardId&&s.stage==='result'));
  if(completedIds.some(id=>!unique.has(id))||owned.some(e=>!completedIds.includes(e.cardId)))throw Error('剩余页面队列与已保存事件无法一致证明');
  let next={...s,ids:remain,index:remain.indexOf(s.entry.cardId),revision:s.revision+1};
  if(cards.has(s.entry.cardId)){
   // A completed page stores only its last entry. Re-anchor to a proven retained
   // event from the same page, without synthesizing or rewriting card history.
   const survivor=remain.at(-1)!,event=unique.get(survivor),n=event?.native;
   if(!s.completed||!event||!n||remain.some(id=>!unique.has(id)))throw Error('无法从保留事件证明混合页面的剩余历史');
   next={...next,index:remain.length-1,stage:'result',completed:true,resultEventId:event.eventId,resumedAt:null,elapsedMs:n.elapsedSeconds*1000,
    entry:FrozenReviewEntry.parse({eventId:event.eventId,cardId:event.cardId,versionId:event.contentVersionId,cycleId:event.cycleId,scheduleRevision:n.schedule.expectedRevision,scheduleHash:n.schedule.beforeHash,timezone:n.timezone,knowledge:n.knowledge}),
    draft:{selectedOptionId:n.selectedOptionId,thought:n.thought,scoreTenths:event.scoreTenths,faults:n.faults,gaps:n.gaps,reflection:n.reflection,practice:n.practice}};
  }
  next.totalMs=owned.reduce((sum,e)=>sum+e.native!.elapsedSeconds*1000,0)+(next.stage==='result'?0:next.elapsedMs);
  const checked=StoredReviewSession.parse(next);
  if(archived)mark(table,row,{value:JSON.stringify(ArchivedReviewSession.parse({...wrapper,document:checked}))});
  else mark(table,row,{payload:JSON.stringify(checked),revision:checked.revision});
 }catch(e){blockers.push('复盘引用 '+table+'/'+String(row.key??row._rowid).slice(0,120)+'：'+String((e as Error).message).slice(0,230)+'；拒绝删除。');}
 return true;
}
