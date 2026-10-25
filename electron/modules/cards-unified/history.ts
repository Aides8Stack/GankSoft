import { ReviewEvent } from '../../../shared/protocol/unified.ts';
import { ProtocolError } from '../../../shared/protocol/data.ts';
import type { Context } from '../../infrastructure/context.ts';
import {HistoryPage} from '../../../shared/protocol/unified-review.ts';
import { publishedCard } from './schedule.ts';
export function reviewHistory(ctx:Context,p:{cardId:string;deckId:string;after:string|null;limit:number}) {
  publishedCard(ctx,p);
  const cursor=p.after?ctx.db.prepare('SELECT created_at FROM learning_review_events WHERE id=? AND card_id=?').get(p.after,p.cardId):null;
  if(p.after&&!cursor) throw new ProtocolError('CURSOR_INVALID','历史游标不属于当前卡片');
  // Extract only list fields in SQLite; full thought/snapshot/media evidence is
  // fetched solely by the explicit event-detail API below.
  const fields=`SELECT id AS eventId,version_id AS contentVersionId,cycle_id AS cycleId,mode,created_at AS createdAt,
    json_extract(document,'$.scoreTenths') AS scoreTenths,json_extract(document,'$.objectiveCorrect') AS objectiveCorrect,
    json_extract(document,'$.rating') AS rating,json_extract(document,'$.native.elapsedSeconds') AS elapsedSeconds FROM learning_review_events`;
  const rows=cursor?ctx.db.prepare(fields+' WHERE card_id=? AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT ?')
    .all(p.cardId,cursor.created_at!,cursor.created_at!,p.after!,p.limit+1):
    ctx.db.prepare(fields+' WHERE card_id=? ORDER BY created_at DESC,id DESC LIMIT ?').all(p.cardId,p.limit+1);
  const more=rows.length>p.limit;if(more)rows.pop();
  const items=rows.map(row=>({...row,objectiveCorrect:row.objectiveCorrect===null?null:!!row.objectiveCorrect}));
  return HistoryPage.parse({items,nextCursor:more?String(rows.at(-1)!.eventId):null});
}
export function reviewEventDetail(ctx:Context,p:{cardId:string;deckId:string;eventId:string}) {
  publishedCard(ctx,p);const row=ctx.db.prepare('SELECT document FROM learning_review_events WHERE id=? AND card_id=?').get(p.eventId,p.cardId);
  if(!row)throw new ProtocolError('REVIEW_EVENT_NOT_FOUND','没有该卡片的指定复盘事件');
  return ReviewEvent.parse(JSON.parse(String(row.document)));
}
