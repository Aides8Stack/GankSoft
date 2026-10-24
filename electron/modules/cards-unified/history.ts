import { ReviewEvent } from '../../../shared/protocol/unified.ts';
import { ProtocolError } from '../../../shared/protocol/data.ts';
import type { Context } from '../../infrastructure/context.ts';
import { publishedCard } from './schedule.ts';
export function reviewHistory(ctx:Context,p:{cardId:string;deckId:string;after:string|null;limit:number}) {
  publishedCard(ctx,p);
  const cursor=p.after?ctx.db.prepare('SELECT created_at FROM learning_review_events WHERE id=? AND card_id=?').get(p.after,p.cardId):null;
  if(p.after&&!cursor) throw new ProtocolError('CURSOR_INVALID','历史游标不属于当前卡片');
  const rows=cursor?ctx.db.prepare('SELECT id,document FROM learning_review_events WHERE card_id=? AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT ?')
    .all(p.cardId,cursor.created_at!,cursor.created_at!,p.after!,p.limit+1):
    ctx.db.prepare('SELECT id,document FROM learning_review_events WHERE card_id=? ORDER BY created_at DESC,id DESC LIMIT ?').all(p.cardId,p.limit+1);
  const more=rows.length>p.limit;if(more)rows.pop();
  const items=rows.map(row=>{const e=ReviewEvent.parse(JSON.parse(String(row.document)));return {
    eventId:e.eventId,contentVersionId:e.contentVersionId,cycleId:e.cycleId,mode:e.mode,createdAt:e.createdAt,
    scoreTenths:e.scoreTenths,objectiveCorrect:e.objectiveCorrect,rating:e.rating,elapsedSeconds:e.native?.elapsedSeconds??null,
  };});
  return {items,nextCursor:more?String(rows.at(-1)!.id):null};
}
export function reviewEventDetail(ctx:Context,p:{cardId:string;deckId:string;eventId:string}) {
  publishedCard(ctx,p);const row=ctx.db.prepare('SELECT document FROM learning_review_events WHERE id=? AND card_id=?').get(p.eventId,p.cardId);
  if(!row)throw new ProtocolError('REVIEW_EVENT_NOT_FOUND','没有该卡片的指定复盘事件');
  return ReviewEvent.parse(JSON.parse(String(row.document)));
}
