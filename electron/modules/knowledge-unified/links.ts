import type { Context } from '../../infrastructure/context.ts';
import { ProtocolError } from '../../../shared/protocol/data.ts';
import { StoredCardLinks, CardLinks, SaveCardLinks } from '../../../shared/protocol/knowledge-tree.ts';
import { publishedCard, digest } from '../cards-unified/schedule.ts';
import { transaction } from '../../infrastructure/database.ts';
export const linksPrefix='unified-card-knowledge:';
/** Native cards have one explicit relation envelope. Imported cards keep their real relation table. */
export function currentCardLinks(ctx:Context,deckId:string,cardId:string,legacyKind:unknown) {
  if(legacyKind) {
    const rows=ctx.db.prepare(legacyKind==='question'?'SELECT knowledge_id FROM question_knowledge WHERE question_id=? ORDER BY knowledge_id':'SELECT knowledge_id FROM memory_knowledge WHERE card_id=? ORDER BY knowledge_id').all(cardId);
    return rows.map(r=>String(r.knowledge_id));
  }
  const row=ctx.db.prepare('SELECT value FROM settings WHERE key=?').get(linksPrefix+cardId);
  if(!row)return [];
  const value=StoredCardLinks.parse(JSON.parse(String(row.value)));
  if(value.cardId!==cardId||value.deckId!==deckId)throw new ProtocolError('LINK_STORAGE_INVALID','卡片关联身份损坏');
  return value.nodeIds;
}
export function getCardLinks(ctx:Context,p:{cardId:string;deckId:string}) {
  const card=publishedCard(ctx,p),nodeIds=currentCardLinks(ctx,p.deckId,p.cardId,card.kind==='card'?null:card.kind);
  // A deterministic relation revision works for both storage forms and legacy edits.
  const stored=ctx.db.prepare('SELECT value FROM settings WHERE key=?').get(linksPrefix+p.cardId);
  const revision=card.kind==='card'?(stored?StoredCardLinks.parse(JSON.parse(String(stored.value))).revision:0):Number.parseInt(digest({nodeIds:[...nodeIds].sort()}).slice(0,12),16);
  return CardLinks.parse({...p,nodeIds,revision});
}
export function replaceCardLinks(ctx:Context,p:{cardId:string;deckId:string;nodeIds:string[]},legacyKind:unknown,allowDeleted=false) {
  if(new Set(p.nodeIds).size!==p.nodeIds.length)throw new ProtocolError('INVALID_KNOWLEDGE_SCOPE','关联知识点重复');
  for(const id of p.nodeIds)if(!ctx.db.prepare(`SELECT 1 FROM knowledge WHERE id=? AND module=? ${allowDeleted?'':'AND deleted_at IS NULL'}`).get(id,p.deckId))throw new ProtocolError('INVALID_KNOWLEDGE_SCOPE','知识点不属于当前卡片集或已删除');
  if(legacyKind) {
    const table=legacyKind==='question'?'question_knowledge':'memory_knowledge',key=legacyKind==='question'?'question_id':'card_id';
    ctx.db.prepare(`DELETE FROM ${table} WHERE ${key}=?`).run(p.cardId);
    for(const id of p.nodeIds)ctx.db.prepare(`INSERT INTO ${table} VALUES(?,?)`).run(p.cardId,id);
  }else {
    const stored=ctx.db.prepare('SELECT value FROM settings WHERE key=?').get(linksPrefix+p.cardId);
    const revision=stored?StoredCardLinks.parse(JSON.parse(String(stored.value))).revision+1:1;
    const value=StoredCardLinks.parse({cardId:p.cardId,deckId:p.deckId,nodeIds:p.nodeIds,encoding:'ganksoft.card-knowledge/1',revision});
    ctx.db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(linksPrefix+p.cardId,JSON.stringify(value));
  }
}
export function saveCardLinks(ctx:Context,input:unknown) {
  const p=SaveCardLinks.parse(input);
  return transaction(ctx.db,()=>{
    const previous=getCardLinks(ctx,{cardId:p.cardId,deckId:p.deckId});
    if(previous.revision!==p.expectedRevision)throw new ProtocolError('REVISION_CONFLICT','卡片关联已变化，请重新读取');
    const card=publishedCard(ctx,p);replaceCardLinks(ctx,p,card.kind==='card'?null:card.kind);return getCardLinks(ctx,{cardId:p.cardId,deckId:p.deckId});
  });
}
