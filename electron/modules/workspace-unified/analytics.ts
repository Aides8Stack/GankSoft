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
