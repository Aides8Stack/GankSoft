import type {z} from 'zod';
import type {Context} from '../../infrastructure/context.ts';
import {transaction} from '../../infrastructure/database.ts';
import {audit} from '../../infrastructure/context.ts';
import {ProtocolError} from '../../../shared/protocol/data.ts';
import {BatchCards,RestoreCards,RecycleCardsInput,RecycleCardsPage,ArchivedReviewSession} from '../../../shared/protocol/card-lifecycle.ts';
import {StoredDraft} from '../../../shared/protocol/card-draft.ts';
import {requireDraftModel} from './new-drafts.ts';
import {currentLegacyContent,type LegacyKind,type Row} from './legacy.ts';
import {replaceCardLinks} from '../knowledge-unified/links.ts';

function deck(ctx:Context,id:string,revision?:number){
 const d=ctx.db.prepare('SELECT version FROM decks WHERE id=? AND deleted_at IS NULL').get(id);
 if(!d)throw new ProtocolError('DECK_CONFLICT','卡片集不存在或已删除');
 if(revision!==undefined&&d.version!==revision)throw new ProtocolError('REVISION_CONFLICT','目标卡片集已变化，请重新选择');
}
function selected(ctx:Context,p:z.infer<typeof RestoreCards>,deleted:boolean){
 requireDraftModel(ctx);deck(ctx,p.deckId);
 return p.cards.map(c=>{
  const row=ctx.db.prepare('SELECT * FROM learning_cards WHERE id=? AND deck_id=?').get(c.cardId,p.deckId);
  if(!row||!!row.deleted_at!==deleted)throw new ProtocolError('CARD_SCOPE_CONFLICT','所选卡片已移动、删除或恢复，请刷新');
  if(row.revision!==c.expectedRevision)throw new ProtocolError('REVISION_CONFLICT','卡片已变化，请刷新后重新确认');
  return row;
 });
}
function protectOpenPages(ctx:Context,ids:Set<string>){
 const found=ctx.db.prepare(`SELECT 1 FROM study_sessions s,json_each(s.payload,'$.ids') c
  WHERE json_extract(s.payload,'$.encoding')='ganksoft.review-session/1'
  AND json_extract(s.payload,'$.completed')=0 AND c.value IN (SELECT value FROM json_each(?)) LIMIT 1`).get(JSON.stringify([...ids]));
 if(found)throw new ProtocolError('CARD_SESSION_ACTIVE','所选卡片仍在未完成复盘页面，请先完成该页面，原稿已保留');
}
function archiveCompletedPages(ctx:Context,ids:string[]){
 const pages=ctx.db.prepare(`SELECT s.rowid,s.payload FROM study_sessions s WHERE json_extract(s.payload,'$.encoding')='ganksoft.review-session/1'
  AND json_extract(s.payload,'$.completed')=1 AND EXISTS(SELECT 1 FROM json_each(s.payload,'$.ids') c WHERE c.value IN (SELECT value FROM json_each(?)))`).all(JSON.stringify(ids));
 for(const row of pages){
  const document=JSON.parse(String(row.payload));
  ctx.db.prepare('INSERT INTO settings VALUES(?,?)').run('unified-archived-session:'+document.sessionId,JSON.stringify(ArchivedReviewSession.parse({encoding:'ganksoft.archived-session/1',reason:'card-move',document})));
  ctx.db.prepare('DELETE FROM study_sessions WHERE rowid=?').run(row.rowid!);
 }
}
/** Archive changed legacy metadata before the existing projection checks ownership.
 * Published content and historical event documents are never changed. */
function legacyMetadata(ctx:Context,row:Row,target:string|null,deletedAt:string|null){
 if(!row.legacy_kind)return;
 const kind=row.legacy_kind as LegacyKind,table=kind==='question'?'questions':'memory_cards';
 ctx.db.prepare(`UPDATE ${table} SET module=coalesce(?,module),deleted_at=?,version=version+1 WHERE id=?`).run(target,deletedAt,row.id!);
 const updated=ctx.db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(row.id!)!;
 const v=currentLegacyContent(ctx.db,kind,updated);
 ctx.db.prepare('INSERT OR IGNORE INTO learning_content_versions VALUES(?,?,?,?)').run(v.versionId,v.cardId,v.mode,JSON.stringify(v));
}
function retainDraft(ctx:Context,cardId:string,revision:number){
 const d=ctx.db.prepare('SELECT payload FROM learning_card_drafts WHERE card_id=?').get(cardId);
 if(!d)return;
 const value=JSON.parse(String(d.payload));
 if(value.encoding==='ganksoft.card-draft/1'){
  const stored=StoredDraft.parse(value);stored.document.basePublishedRevision=revision;stored.document.revision++;
  ctx.db.prepare('UPDATE learning_card_drafts SET payload=?,revision=revision+1,base_published_revision=? WHERE card_id=?').run(JSON.stringify(StoredDraft.parse(stored)),revision,cardId);
 }else ctx.db.prepare('UPDATE learning_card_drafts SET revision=revision+1,base_published_revision=? WHERE card_id=?').run(revision,cardId);
}
export function applyCardBatch(ctx:Context,input:z.infer<typeof BatchCards>){
 const p=BatchCards.parse(input);
 return transaction(ctx.db,()=>{
  const rows=selected(ctx,p,false);protectOpenPages(ctx,new Set(p.cards.map(c=>c.cardId)));
  if(p.action==='move'){
   if(p.targetDeckId===p.deckId)throw new ProtocolError('DECK_CONFLICT','请选择其他目标卡片集');
   deck(ctx,p.targetDeckId,p.expectedTargetRevision);
   archiveCompletedPages(ctx,p.cards.map(c=>c.cardId));
  }
  const deletedAt=p.action==='delete'?ctx.now().toISOString():null;
  for(const row of rows){
   const id=String(row.id),target=p.action==='move'?p.targetDeckId:p.deckId;
   if(p.action==='move')replaceCardLinks(ctx,{deckId:target,cardId:id,nodeIds:[]},row.legacy_kind);
   legacyMetadata(ctx,row,p.action==='move'?target:null,deletedAt);
   ctx.db.prepare('UPDATE learning_cards SET deck_id=?,deleted_at=?,revision=revision+1 WHERE id=?').run(target,deletedAt,id);
   retainDraft(ctx,id,Number(row.revision)+1);
  }
  audit(ctx,'统一卡片批量操作',{deckId:p.deckId,action:p.action,cardIds:p.cards.map(c=>c.cardId),...(p.action==='move'?{targetDeckId:p.targetDeckId}:{})});
  return {count:rows.length,action:p.action};
 });
}
export function listRecycledCards(ctx:Context,input:z.infer<typeof RecycleCardsInput>){
 requireDraftModel(ctx);const p=RecycleCardsInput.parse(input);deck(ctx,p.deckId);
 const rows=ctx.db.prepare('SELECT id AS cardId,title,published_type AS publishedType,revision,deleted_at AS deletedAt FROM learning_cards WHERE deck_id=? AND deleted_at IS NOT NULL AND id>? ORDER BY id LIMIT ?').all(p.deckId,p.after??'',p.limit+1);
 const more=rows.length>p.limit;if(more)rows.pop();return RecycleCardsPage.parse({items:rows,nextCursor:more?rows.at(-1)!.cardId:null});
}
export function restoreCards(ctx:Context,input:z.infer<typeof RestoreCards>){
 const p=RestoreCards.parse(input);
 return transaction(ctx.db,()=>{
  const rows=selected(ctx,p,true);
  for(const row of rows){legacyMetadata(ctx,row,null,null);ctx.db.prepare('UPDATE learning_cards SET deleted_at=NULL,revision=revision+1 WHERE id=?').run(row.id!);retainDraft(ctx,String(row.id),Number(row.revision)+1);}
  audit(ctx,'恢复统一卡片',{deckId:p.deckId,cardIds:p.cards.map(c=>c.cardId)});return {count:rows.length,action:'restore' as const};
 });
}
