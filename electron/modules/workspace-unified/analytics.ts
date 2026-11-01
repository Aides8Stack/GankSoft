import {z} from 'zod';
import type {SQLInputValue} from 'node:sqlite';
import type {Context} from '../../infrastructure/context.ts';
import {ProtocolError,Id,Revision} from '../../../shared/protocol/data.ts';
import {AnalyticsInput,AnalyticsPage} from '../../../shared/protocol/workspace-unified.ts';
import {requireTree} from '../knowledge-unified/storage.ts';
import {resolveWindow} from '../analytics/window.ts';
import {calendarDay} from '../../../shared/calendar.ts';
import {digest} from '../cards-unified/schedule.ts';
const Cursor=z.strictObject({scope:z.string(),epoch:Id,revision:Revision,eventId:Id,createdAt:z.string()});
/** Aggregates and scalar SQL projections only: no event/body/base64 snapshots in list reads. */
export function workspaceAnalytics(ctx:Context,input:z.infer<typeof AnalyticsInput>){
 const p=AnalyticsInput.parse(input);requireTree(ctx,p.deckId);
 const db=ctx.db,meta=db.prepare('SELECT epoch,revision FROM protocol_meta WHERE singleton=1').get()!;
 const timeZone=String(db.prepare("SELECT value FROM settings WHERE key='studyTimezone'").get()?.value??'Asia/Shanghai');
 const window=resolveWindow(p.date,ctx.now(),timeZone),scope=digest({deckId:p.deckId,date:p.date,window});
 let after:z.infer<typeof Cursor>|null=null;
 if(p.cursor){try{after=Cursor.parse(JSON.parse(p.cursor));}catch{throw new ProtocolError('CURSOR_INVALID','分析分页游标无效');}if(after.scope!==scope||after.epoch!==meta.epoch||after.revision!==meta.revision)throw new ProtocolError('DATA_REVISION_CHANGED','分析范围或数据已变化，请重新读取');}
 // Calendar filtering uses the same explicit study timezone as scheduling.
 db.function('gank_study_day',{deterministic:true},iso=>calendarDay(new Date(String(iso)),timeZone));
 const args:SQLInputValue[]=[p.deckId];let filter='c.deck_id=? AND c.deleted_at IS NULL';
 if(window.start){filter+=' AND gank_study_day(e.created_at)>=?';args.push(window.start);}
 if(window.end){filter+=' AND gank_study_day(e.created_at)<=?';args.push(window.end);}
 const from=`FROM learning_review_events e JOIN learning_cards c ON c.id=e.card_id WHERE ${filter}`;
 const counts=db.prepare(`SELECT count(*) AS eventCount,count(json_extract(e.document,'$.scoreTenths')) AS gradedCount,
  coalesce(sum(json_extract(e.document,'$.native.practice')=1),0) AS practiceCount,
 count(json_extract(e.document,'$.objectiveCorrect')) AS objectiveCount,coalesce(sum(json_extract(e.document,'$.objectiveCorrect')=1),0) AS correctCount,
  avg(json_extract(e.document,'$.scoreTenths')) AS averageScoreTenths,avg(json_extract(e.document,'$.native.elapsedSeconds')) AS averageElapsedSeconds ${from}`).get(...args)!;
 const cardsByMode={question:0,qa:0,direct:0};for(const r of db.prepare('SELECT published_type,count(*) n FROM learning_cards WHERE deck_id=? AND deleted_at IS NULL GROUP BY published_type').all(p.deckId))cardsByMode[r.published_type as keyof typeof cardsByMode]=Number(r.n);
 const rows=db.prepare(`SELECT e.id AS eventId,e.card_id AS cardId,c.title,e.version_id AS contentVersionId,e.cycle_id AS cycleId,e.mode,e.created_at AS createdAt,
  json_extract(e.document,'$.scoreTenths') AS scoreTenths,json_extract(e.document,'$.objectiveCorrect') AS objectiveCorrect,
  json_extract(e.document,'$.rating') AS rating,json_extract(e.document,'$.native.elapsedSeconds') AS elapsedSeconds ${from}
  ${after?'AND (e.created_at<? OR (e.created_at=? AND e.id<?))':''} ORDER BY e.created_at DESC,e.id DESC LIMIT ?`).all(...args,...(after?[after.createdAt,after.createdAt,after.eventId]:[]),p.limit+1);
 const more=rows.length>p.limit;if(more)rows.pop();
 return AnalyticsPage.parse({...counts,cardsByMode,cardCount:Object.values(cardsByMode).reduce((a,b)=>a+b,0),window,
  items:rows.map(r=>({...r,objectiveCorrect:r.objectiveCorrect===null?null:!!r.objectiveCorrect})),nextCursor:more?JSON.stringify({scope,epoch:meta.epoch,revision:meta.revision,eventId:rows.at(-1)!.eventId,createdAt:rows.at(-1)!.createdAt}):null});
}

import {GroupedAnalyticsInput,GroupedAnalyticsPage} from '../../../shared/protocol/workspace-unified.ts';
import {masteryEvidenceBatch,liveCardLinks} from '../cards-unified/mastery.ts';
import {currentDue,publishedCard,readSchedule} from '../cards-unified/schedule.ts';
/** Single read-only request. All nodes reuse one evidence read and deduplicated card sets. */
export function workspaceAnalyticsGrouped(ctx:Context,input:unknown){
 const p=GroupedAnalyticsInput.parse(input);requireTree(ctx,p.deckId);
 const db=ctx.db,meta=db.prepare('SELECT epoch,revision FROM protocol_meta WHERE singleton=1').get()!;
 if((p.expectedDataEpoch!==undefined&&p.expectedDataEpoch!==meta.epoch)||(p.expectedDataRevision!==undefined&&p.expectedDataRevision!==meta.revision))throw new ProtocolError('DATA_REVISION_CHANGED','统计数据已变化，请重新读取');
 const timeZone=String(db.prepare("SELECT value FROM settings WHERE key='studyTimezone'").get()?.value??'Asia/Shanghai');
 const window=resolveWindow(p.date,ctx.now(),timeZone),scope=digest({...p,cursor:null,limit:null,expectedDataEpoch:null,expectedDataRevision:null,window});
 let offset=0;
 if(p.cursor){let c;try{c=z.strictObject({scope:z.string(),epoch:Id,revision:Revision,offset:Revision}).parse(JSON.parse(p.cursor));}catch{throw new ProtocolError('CURSOR_INVALID','统计分页游标无效');}
  if(c.scope!==scope||c.epoch!==meta.epoch||c.revision!==meta.revision)throw new ProtocolError('DATA_REVISION_CHANGED','统计范围或数据已变化，请重新读取');offset=c.offset;}
 const cards=db.prepare(`SELECT c.id,c.title,c.published_type,json_extract(v.document,'$.availability') availability,json_extract(v.document,'$.payload.encoding') encoding FROM learning_cards c JOIN learning_content_versions v ON v.id=c.current_version_id WHERE c.deck_id=? AND c.deleted_at IS NULL ORDER BY c.id`).all(p.deckId);
 const nodes=db.prepare('SELECT id,name,parent_id FROM knowledge WHERE module=? AND deleted_at IS NULL ORDER BY id').all(p.deckId);
 const mastery=masteryEvidenceBatch(ctx,p.deckId);
 const current=new Map(cards.map(c=>{const card=publishedCard(ctx,{deckId:p.deckId,cardId:String(c.id)}),due=currentDue(ctx,card),schedule=readSchedule(ctx,card);
  return [String(c.id),{...due,fsrsState:schedule.state?.state??null,due:c.availability==='known'&&c.encoding!=='legacy-question-604'&&!due.paused&&(!due.dueAt||Date.parse(due.dueAt)<=+ctx.now())}];}));
 // Scalar projection avoids transferring reflections/media/body snapshots into analytics.
 const history=db.prepare(`SELECT e.id,e.card_id,e.created_at,json_extract(e.document,'$.scoreTenths') score,
 json_extract(e.document,'$.objectiveCorrect') correct,json_extract(e.document,'$.native.elapsedSeconds') elapsed
 FROM learning_review_events e JOIN learning_cards c ON c.id=e.card_id WHERE c.deck_id=? AND c.deleted_at IS NULL ORDER BY e.created_at,e.id`).all(p.deckId)
 .map(e=>({id:String(e.id),card_id:String(e.card_id),created_at:String(e.created_at),score:e.score,correct:e.correct,elapsed:e.elapsed,day:calendarDay(new Date(String(e.created_at)),timeZone)})).filter(e=>(!window.start||e.day>=window.start)&&(!window.end||e.day<=window.end));
 const historyByCard=new Map<string,typeof history>();for(const e of history){const id=String(e.card_id);if(!historyByCard.has(id))historyByCard.set(id,[]);historyByCard.get(id)!.push(e);}
 const cardById=new Map(cards.map(c=>[String(c.id),c]));
 function metrics(ids:Set<string>){const selected=[...ids].filter(id=>cardById.has(id)),events=selected.flatMap(id=>historyByCard.get(id)??[]).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))||String(a.id).localeCompare(String(b.id)));
  const scores=events.filter(e=>e.score!==null),objective=events.filter(e=>e.correct!==null),cardsByMode={question:0,qa:0,direct:0};for(const id of selected)cardsByMode[cardById.get(id)!.published_type as keyof typeof cardsByMode]++;
  return {cardCount:selected.length,cardsByMode,eventCount:events.length,gradedCount:scores.length,averageScoreTenths:scores.length?scores.reduce((n,e)=>n+Number(e.score),0)/scores.length:null,latestScoreTenths:scores.length?Number(scores.at(-1)!.score):null,objectiveCount:objective.length,correctCount:objective.filter(e=>!!e.correct).length,elapsedSeconds:events.reduce((n,e)=>n+Number(e.elapsed??0),0),dueCount:selected.filter(id=>current.get(id)!.due).length};
 }
 const direct=new Map(nodes.map(n=>[String(n.id),new Set<string>()]));
 for(const link of liveCardLinks(ctx,p.deckId))direct.get(link.nodeId)?.add(link.cardId);
 // Propagate each direct set through ancestors. Set union deduplicates parent/child overlap.
 const sets=new Map([...direct].map(([id,ids])=>[id,new Set(ids)])),parents=new Map(nodes.map(n=>[String(n.id),n.parent_id?String(n.parent_id):null]));
 if(p.scope==='aggregate')for(const [id,ids] of direct){const seen=new Set([id]);let parent=parents.get(id);while(parent&&!seen.has(parent)){seen.add(parent);for(const cardId of ids)sets.get(parent)?.add(cardId);parent=parents.get(parent);}}
 const groups=p.dimension==='card'?cards.map(c=>({id:String(c.id),name:String(c.title),mode:c.published_type as 'question'|'qa'|'direct',ids:new Set([String(c.id)])})):nodes.map(n=>({id:String(n.id),name:String(n.name),mode:null,ids:sets.get(String(n.id))!}));
 const allIds=new Set(cards.map(c=>String(c.id))),selectedIds=p.entityId?groups.find(g=>g.id===p.entityId)?.ids??new Set<string>():allIds,summary=metrics(selectedIds),days=new Map<string,typeof history>();
 for(const e of history.filter(e=>selectedIds.has(String(e.card_id)))){if(!days.has(e.day))days.set(e.day,[]);days.get(e.day)!.push(e);}
 const trend=[...days].sort(([a],[b])=>a.localeCompare(b)).map(([day,events])=>{const scores=events.filter(e=>e.score!==null);return {day,eventCount:events.length,averageScoreTenths:scores.length?scores.reduce((n,e)=>n+Number(e.score),0)/scores.length:null,elapsedSeconds:events.reduce((n,e)=>n+Number(e.elapsed??0),0)};});
 const rows=groups.filter(g=>(!p.entityId||g.id===p.entityId)&&g.name.toLocaleLowerCase().includes(p.search.trim().toLocaleLowerCase())).map(g=>{const m=mastery([...g.ids],p.dimension==='knowledge'),c=p.dimension==='card'?current.get(g.id):null;return {id:g.id,name:g.name,mode:g.mode,...metrics(g.ids),status:m.status,observations:m.observations,nextDueAt:c?.dueAt??null,fsrsState:c?.fsrsState??null,paused:c?.paused??false};});
 rows.sort((a,b)=>{let value=0;if(p.sort==='name')value=a.name.localeCompare(b.name,'zh-CN');else if(p.sort==='events')value=a.eventCount-b.eventCount;else if(p.sort==='due')value=a.dueCount-b.dueCount;else value=(a.averageScoreTenths??-1)-(b.averageScoreTenths??-1);return (p.direction==='asc'?value:-value)||a.id.localeCompare(b.id);});
 const linked=new Set([...direct.values()].flatMap(ids=>[...ids]));
 const knowledgeSummary={linkedCardCount:linked.size,learnedKnowledgeCount:[...direct.values()].filter(ids=>[...ids].some(id=>(historyByCard.get(id)?.length??0)>0)).length,dueCardCount:[...linked].filter(id=>current.get(id)?.due).length};
 const next=offset+p.limit;
 return GroupedAnalyticsPage.parse({dimension:p.dimension,scope:p.scope,window,dataEpoch:meta.epoch,dataRevision:meta.revision,totalCount:rows.length,knowledgeCount:nodes.length,knowledgeSummary,summary,trend,items:rows.slice(offset,next),nextCursor:next<rows.length?JSON.stringify({scope,epoch:meta.epoch,revision:meta.revision,offset:next}):null});
}
