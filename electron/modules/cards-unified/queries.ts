import { currentCardLinks } from '../knowledge-unified/links.ts';
import { publishedCard, currentDue } from './schedule.ts';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { z } from 'zod';
import { ProtocolError, Id, Revision } from '../../../shared/protocol/data.ts';
import { ContentVersion, SummaryPage, SummaryInput, ContentInput, type SummaryInputDTO, type SummaryPageDTO } from '../../../shared/protocol/unified.ts';
import { dueEligibility } from '../review/due-eligibility.ts';
import type { Context } from '../../infrastructure/context.ts';
import { currentLegacyContent, stableId, type LegacyKind, type Row } from './legacy.ts';

function snapshot<T>(db: DatabaseSync, read: () => T): T {
  const own = !db.isTransaction;
  if (own) db.exec('BEGIN');
  try { const value = read(); if (own) db.exec('COMMIT'); return value; }
  catch (e) { if (own && db.isTransaction) db.exec('ROLLBACK'); throw e; }
}
const revision = (db: DatabaseSync) => Number(db.prepare('SELECT revision FROM protocol_meta WHERE singleton=1').get()?.revision ?? 0);
const epoch = (db: DatabaseSync) => String(db.prepare('SELECT epoch FROM protocol_meta WHERE singleton=1').get()?.epoch ?? 'none');
const liveId = (cardId: string, dataRevision: number, dataEpoch: string) => stableId('legacy-live', cardId, dataRevision, dataEpoch);
const Cursor = z.strictObject({ deckId: Id, mode: z.enum(['question','qa','direct']).nullable(), query:z.string().max(300).default(''), after: Id, revision: Revision, epoch: Id });
function activeDeck(db: DatabaseSync, deckId: string) {
  if (!db.prepare('SELECT id FROM decks WHERE id=? AND deleted_at IS NULL').get(deckId))
    throw new ProtocolError('DECK_CONFLICT', '卡片集不存在或已删除');
}
function unified(db: DatabaseSync) {
  const version = Number(db.prepare('PRAGMA user_version').get()?.user_version);
  if (version !== 604 && version !== 606) throw new ProtocolError('CONTRACT_UNSUPPORTED', '未支持的数据模型版本');
  return version === 606;
}
export function listSummary(ctx: Context, input: SummaryInputDTO): SummaryPageDTO {
  const p = SummaryInput.parse(input), db = ctx.db;
  return snapshot(db, () => {
    activeDeck(db, p.deckId);
    const rev = revision(db), currentEpoch = epoch(db);
    let after = '';
    if (p.cursor) {
      let cursor: z.infer<typeof Cursor>;
      try { cursor = Cursor.parse(JSON.parse(p.cursor)); }
      catch { throw new ProtocolError('CURSOR_INVALID', '分页游标不合法'); }
      if (cursor.deckId !== p.deckId || cursor.mode !== (p.filters.mode ?? null) || cursor.query !== p.filters.query)
        throw new ProtocolError('CURSOR_INVALID', '分页范围已变化');
      if (cursor.revision !== rev || cursor.epoch !== currentEpoch)
        throw new ProtocolError('DATA_REVISION_CHANGED', '数据已变化，请从第一页重新读取');
      after = cursor.after;
    }
    const staged = unified(db), args: SQLInputValue[] = [p.deckId, after];
    if (p.filters.mode) args.push(p.filters.mode);
    args.push(p.filters.query,p.limit + 1);
    // No bodies, assets, or review history are selected by a list query.
    const source = staged ? `SELECT c.id,c.deck_id AS module,c.title,
      c.published_type AS mode,c.revision AS version,c.legacy_kind AS kind,c.current_version_id AS version_id
      FROM learning_cards c WHERE c.deleted_at IS NULL`
      : `SELECT id,module,title,'question' AS mode,version,'question' AS kind,NULL AS version_id FROM questions WHERE deleted_at IS NULL
         UNION ALL SELECT id,module,title,'qa' AS mode,version,'memory' AS kind,NULL AS version_id FROM memory_cards WHERE deleted_at IS NULL`;
    const rows = db.prepare(`SELECT * FROM (${source}) WHERE module=? AND id>? ${p.filters.mode ? 'AND mode=?' : ''} AND instr(lower(title),lower(?))>0 ORDER BY id LIMIT ?`).all(...args);
    if (new Set(rows.map(r => r.id)).size !== rows.length || db.prepare('SELECT 1 FROM questions q JOIN memory_cards m ON m.id=q.id LIMIT 1').get())
      throw new ProtocolError('MIGRATION_ID_COLLISION', '跨类型卡片身份冲突，必须先处理');
    const hasMore = rows.length > p.limit;
    if (hasMore) rows.pop();
    const items = rows.map(row => {
      const kind = row.kind as LegacyKind | null, cardId = String(row.id);
      const due = kind ? dueEligibility(ctx, kind, cardId) : null;
      const current=staged?currentDue(ctx,publishedCard(ctx,{cardId,deckId:p.deckId})):null;
      const dueAt=current?current.dueAt:due?.effectiveDue??null;
      const count = staged ? currentCardLinks(ctx,p.deckId,cardId,kind).filter(id=>db.prepare('SELECT 1 FROM knowledge WHERE id=? AND deleted_at IS NULL').get(id)).length : kind ? Number(db.prepare(kind === 'question'
        ? 'SELECT count(*) AS n FROM question_knowledge WHERE question_id=?'
        : 'SELECT count(*) AS n FROM memory_knowledge WHERE card_id=?').get(cardId)?.n ?? 0) : 0;
      const reviewCount=staged?Number(db.prepare('SELECT count(*) n FROM learning_review_events WHERE card_id=?').get(cardId)!.n):0;
      const lastScore=staged?db.prepare("SELECT json_extract(document,'$.scoreTenths') score FROM learning_review_events WHERE card_id=? ORDER BY created_at DESC,id DESC LIMIT 1").get(cardId)?.score:null;
      const knowledgeNames=staged?currentCardLinks(ctx,p.deckId,cardId,kind).flatMap(id=>{const n=db.prepare('SELECT name FROM knowledge WHERE id=? AND deleted_at IS NULL').get(id);return n?[String(n.name)]:[];}).slice(0,6):[];
      return { reviewCount,lastScoreTenths:lastScore??null,knowledgeNames,cardId, deckId: p.deckId, title: row.title, publishedType: row.mode,
        contentVersionId: staged ? row.version_id : liveId(cardId, rev, currentEpoch), revision: row.version,
        dueAt, paused: current?.paused ?? due?.paused ?? false, knowledgeCount: count };
    });
    return SummaryPage.parse({ items, dataRevision: rev, nextCursor: hasMore ? JSON.stringify({
      deckId: p.deckId, mode: p.filters.mode ?? null, query:p.filters.query, after: rows.at(-1)!.id, revision: rev, epoch: currentEpoch,
    }) : null });
  });
}
export function getPublishedContent(ctx: Context, input: z.infer<typeof ContentInput>) {
  const p = ContentInput.parse(input), db = ctx.db;
  return snapshot(db, () => {
    activeDeck(db, p.deckId);
    if (unified(db)) {
      const card = db.prepare('SELECT * FROM learning_cards WHERE id=? AND deck_id=? AND deleted_at IS NULL').get(p.cardId, p.deckId);
      if (!card) throw new ProtocolError('DECK_CONFLICT', '卡片不属于当前卡片集或已删除');
      let row = db.prepare('SELECT document FROM learning_content_versions WHERE id=? AND card_id=?').get(p.versionId ?? card.current_version_id!, p.cardId);
      if (!row && p.versionId) {
        const aliases = db.prepare("SELECT document FROM learning_content_versions WHERE card_id=? AND json_extract(document,'$.source.wireToken')=? LIMIT 2").all(p.cardId, p.versionId);
        if (aliases.length > 1) throw new ProtocolError('CONTENT_VERSION_AMBIGUOUS', '旧版本序号对应多个来源快照，请使用明确的档案版本身份');
        row = aliases[0];
      }
      if (!row) throw new ProtocolError('CONTENT_VERSION_NOT_FOUND', '没有该卡片的指定版本');
      return ContentVersion.parse(JSON.parse(String(row.document)));
    }
    const found = (['question', 'memory'] as const).flatMap(kind => {
      const row = db.prepare(`SELECT * FROM ${kind === 'question' ? 'questions' : 'memory_cards'} WHERE id=?`).get(p.cardId);
      return row ? [{ kind, row }] : [];
    });
    if (found.length > 1) throw new ProtocolError('MIGRATION_ID_COLLISION', '跨类型卡片身份冲突');
    const card = found[0];
    if (!card || card.row.deleted_at || card.row.module !== p.deckId)
      throw new ProtocolError('DECK_CONFLICT', '卡片不属于当前卡片集或已删除');
    const versionId = liveId(p.cardId, revision(db), epoch(db));
    if (p.versionId && p.versionId !== versionId)
      throw new ProtocolError('CONTENT_VERSION_NOT_AVAILABLE', '旧模型只提供当前快照；历史档案待S1.c激活，不能用当前正文冒充旧版本');
    return currentLegacyContent(db, card.kind, card.row as Row, versionId);
  });
}
