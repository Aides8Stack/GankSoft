import type {Context} from '../../infrastructure/context.ts';
import {DashboardInput,DashboardView} from '../../../shared/protocol/workspace-unified.ts';
import {requireDraftModel} from '../cards-unified/new-drafts.ts';
import {currentDue,publishedCard} from '../cards-unified/schedule.ts';
import {calendarDay} from '../../../shared/calendar.ts';
import {requireTree} from '../knowledge-unified/storage.ts';
/** Read-only projections: no content/media hydration, no session drafts or event documents leave the DB. */
export function workspaceDashboard(ctx:Context,input:unknown){
 requireDraftModel(ctx);const p=DashboardInput.parse(input),db=ctx.db;
 if(p.deckId)requireTree(ctx,p.deckId);
 const now=ctx.now(),timeZone=String(db.prepare("SELECT value FROM settings WHERE key='studyTimezone'").get()?.value??'Asia/Shanghai'),today=calendarDay(now,timeZone);
 db.function('gank_dashboard_day',{deterministic:true},iso=>calendarDay(new Date(String(iso)),timeZone));
 const args=p.deckId?[p.deckId]:[],scope=p.deckId?' AND c.deck_id=?':'';
 const live=`FROM learning_cards c JOIN decks d ON d.id=c.deck_id AND d.deleted_at IS NULL WHERE c.deleted_at IS NULL${scope}`;
 let dueCount=0;
 // Iterate scalar identities only. Reuse the authoritative due/paused/cycle policy.
 for(const row of db.prepare(`SELECT c.id,c.deck_id ${live.replace(' WHERE'," JOIN learning_content_versions v ON v.id=c.current_version_id WHERE")} AND json_extract(v.document,'$.availability')='known' AND json_extract(v.document,'$.payload.encoding')!='legacy-question-604' `).iterate(...args)){
  const due=currentDue(ctx,publishedCard(ctx,{cardId:String(row.id),deckId:String(row.deck_id)}));
  if(!due.paused&&(!due.dueAt||Date.parse(due.dueAt)<=+now))dueCount++;
 }
 const events=`FROM learning_review_events e JOIN learning_cards c ON c.id=e.card_id JOIN decks d ON d.id=c.deck_id AND d.deleted_at IS NULL WHERE c.deleted_at IS NULL${scope}`;
 const stats=db.prepare(`SELECT count(*) eventCount,count(json_extract(e.document,'$.scoreTenths')) gradedCount,avg(json_extract(e.document,'$.scoreTenths')) averageScoreTenths,
 count(CASE WHEN json_extract(e.document,'$.objectiveCorrect') IS NOT NULL THEN 1 END) objectiveCount,
 coalesce(sum(json_extract(e.document,'$.objectiveCorrect')=1),0) correctCount,
 coalesce(sum(gank_dashboard_day(e.created_at)=?),0) todayCount ${events}`).get(today,...args)!;
 const recent=db.prepare(`SELECT e.id eventId,e.card_id cardId,c.deck_id deckId,d.name deckName,c.title,e.mode,e.created_at createdAt,json_extract(e.document,'$.scoreTenths') scoreTenths ${events} ORDER BY e.created_at DESC,e.id DESC LIMIT 6`).all(...args);
 const recentCards=db.prepare(`SELECT c.id cardId,c.deck_id deckId,c.title,c.published_type mode,json_extract(v.document,'$.publishedAt') publishedAt ${live.replace(' WHERE',' JOIN learning_content_versions v ON v.id=c.current_version_id WHERE')} ORDER BY json_extract(v.document,'$.publishedAt') DESC,c.id DESC LIMIT 6`).all(...args);
 const sessions=db.prepare(`SELECT json_extract(s.payload,'$.sessionId') sessionId,s.deck_id deckId,d.name deckName,coalesce(c.title,'复盘') title,json_extract(s.payload,'$.index') 'index',json_array_length(s.payload,'$.ids') total
 FROM study_sessions s JOIN decks d ON d.id=s.deck_id AND d.deleted_at IS NULL LEFT JOIN learning_cards c ON c.id=json_extract(s.payload,'$.entry.cardId')
 WHERE json_extract(s.payload,'$.encoding')='ganksoft.review-session/1' AND json_extract(s.payload,'$.completed')=0${p.deckId?' AND s.deck_id=?':''} ORDER BY s.updated_at DESC,sessionId DESC LIMIT 4`).all(...args);
 return DashboardView.parse({deckCount:Number(db.prepare(`SELECT count(*) n FROM decks WHERE deleted_at IS NULL${p.deckId?' AND id=?':''}`).get(...args)!.n),cardCount:Number(db.prepare(`SELECT count(*) n ${live}`).get(...args)!.n),knowledgeCount:Number(db.prepare(`SELECT count(*) n FROM knowledge k JOIN decks d ON d.id=k.module AND d.deleted_at IS NULL WHERE k.deleted_at IS NULL${p.deckId?' AND k.module=?':''}`).get(...args)!.n),dueCount,...stats,timeZone,today,recent,recentCards,sessions});
}
