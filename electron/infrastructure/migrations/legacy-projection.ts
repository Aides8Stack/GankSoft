import type { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { Card, ReviewEvent, StudyCycle, type ContentVersionDTO } from '../../../shared/protocol/unified.ts';
import { currentLegacyContent, historicalLegacyContent, stableId, type LegacyKind, type Row } from '../../modules/cards-unified/legacy.ts';
import { DomainError } from '../../../shared/domain-error.ts';

export function legacyProjectionDigest(db: DatabaseSync) {
  const hash = createHash('sha256');
  for (const table of ['questions','memory_cards','materials','assets','attempts','memory_reviews','attempt_faults','attempt_evidence_snapshots','schedule_events']) {
    hash.update(table);
    const key=table==='attempt_evidence_snapshots'?'attempt_id':'id';
    const statement = db.prepare(`SELECT * FROM ${table} ORDER BY ${key}`);
    statement.setReadBigInts(true);
    for (const row of statement.iterate()) hash.update(JSON.stringify(row, (_,v) => typeof v === 'bigint' ? { integer: v.toString() } : v));
  }
  return hash.digest('hex');
}
export function legacyEvent(db: DatabaseSync, kind: LegacyKind, row: Row) {
  const cardId=String(kind==='question'?row.question_id:row.card_id);
  const evidence = kind === 'question' ? db.prepare('SELECT * FROM attempt_evidence_snapshots WHERE attempt_id=?').get(row.id!) ?? null : null;
  const faults = kind === 'question' ? db.prepare('SELECT * FROM attempt_faults WHERE attempt_id=? ORDER BY id').all(row.id!) : [];
  const schedule = db.prepare('SELECT * FROM schedule_events WHERE id=? AND kind=? AND card_id=?').get(row.id!, kind, cardId) ?? null;
  return legacyEventFromRows(kind,row,evidence,faults,schedule);
}
/** Same immutable projection from explicitly captured/remapped evidence rows. */
export function legacyEventFromRows(kind:LegacyKind,row:Row,evidence:Row|null,faults:Row[],schedule:Row|null) {
  const document = historicalLegacyContent(kind, row);
  const item = ReviewEvent.parse({ eventId: row.id, cardId: document.cardId, deckIdAtEvent: evidence?.deck_id ?? null,
    contentVersionId: document.versionId, cycleId: stableId('cycle', kind, document.cardId, document.source.ordinal!), mode: document.mode,
    createdAt: row.created_at, scoreTenths: null, objectiveCorrect: kind === 'question' ? !!row.correct : null,
    rating: null, mappingVersion: 'legacy-preserved', engineVersion: row.algorithm,
    legacyScale: '0-4', legacyScore: row.score, legacySelfScore: row.self_score ?? null,
    legacyRating: schedule?.rating ?? null, legacyRaw: JSON.stringify({ row, evidence, faults, schedule }),
    knowledgeSnapshot: kind === 'question' ? row.knowledge_snapshot : null });
  return { document, item };
}
function version(db: DatabaseSync, document: ContentVersionDTO) {
  const encoded = JSON.stringify(document), old = db.prepare('SELECT document FROM learning_content_versions WHERE id=?').get(document.versionId);
  if (old) {
    if (old.document !== encoded) throw new DomainError('MIGRATION_IMMUTABLE_CONFLICT', '不可变版本身份对应不同内容');
  } else db.prepare('INSERT INTO learning_content_versions VALUES(?,?,?,?)').run(document.versionId, document.cardId, document.mode, encoded);
}
/** Called by the existing outer transaction owner, before its receipt commits. No async dual writes. */
export function synchronizeLegacyModel(db: DatabaseSync, checkpoint: (phase: string) => void = () => {}) {
  if (!db.isTransaction) throw Error('投影必须与旧写入口处于同一事务');
  if (db.prepare('SELECT 1 FROM questions q JOIN memory_cards m ON m.id=q.id LIMIT 1').get() ||
      db.prepare('SELECT 1 FROM attempts a JOIN memory_reviews m ON m.id=a.id LIMIT 1').get())
    throw new DomainError('MIGRATION_ID_COLLISION', '旧类型身份冲突，禁止合并');
  if (db.prepare(`SELECT 1 FROM learning_cards c WHERE legacy_kind IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM questions q WHERE q.id=c.id AND c.legacy_kind='question') AND NOT EXISTS
    (SELECT 1 FROM memory_cards m WHERE m.id=c.id AND c.legacy_kind='memory') LIMIT 1`).get())
    throw new DomainError('LEGACY_HISTORY_PROTECTED', '新模型历史保留期间不能通过旧清空入口物理删除卡片');
  if (db.prepare(`SELECT 1 FROM learning_review_events e WHERE json_extract(document,'$.legacyScale') IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM attempts a WHERE a.id=e.id AND e.mode='question') AND NOT EXISTS
    (SELECT 1 FROM memory_reviews m WHERE m.id=e.id AND e.mode='qa') LIMIT 1`).get())
    throw new DomainError('LEGACY_HISTORY_PROTECTED', '不能删除原始复盘历史');
  let cards = 0, events = 0;
  const cycle = (cardId: string, kind: LegacyKind, ordinal: number) => {
    const item = StudyCycle.parse({cycleId:stableId('cycle',kind,cardId,ordinal),cardId,startedAt:null,provenance:'legacy-segment',sourceOrdinal:ordinal});
    const old = db.prepare('SELECT * FROM learning_study_cycles WHERE id=?').get(item.cycleId);
    if (old && (old.card_id !== cardId || old.source_ordinal !== ordinal || old.provenance !== item.provenance || old.started_at !== null))
      throw new DomainError('MIGRATION_IMMUTABLE_CONFLICT','旧cycle来源已变化');
    if (!old) db.prepare('INSERT INTO learning_study_cycles VALUES(?,?,?,?,?)').run(item.cycleId,cardId,null,item.provenance,ordinal);
    return item.cycleId;
  };
  for (const kind of ['question','memory'] as const) {
    for (const row of db.prepare(`SELECT * FROM ${kind === 'question' ? 'questions' : 'memory_cards'} ORDER BY id`).iterate() as Iterable<Row>) {
      const document = currentLegacyContent(db,kind,row);
      const card = Card.parse({cardId:row.id,deckId:row.module,publishedType:document.mode,currentVersionId:document.versionId,
        currentCycleId:cycle(String(row.id),kind,document.source.ordinal!),revision:row.version,deletedAt:row.deleted_at,legacyKind:kind});
      const old = db.prepare('SELECT legacy_kind,published_type,current_version_id FROM learning_cards WHERE id=?').get(card.cardId);
      const current=old?db.prepare('SELECT document FROM learning_content_versions WHERE id=?').get(old.current_version_id!):null;
      if(current && JSON.parse(String(current.document)).source.kind==='published') {
        const archived=db.prepare('SELECT document FROM learning_content_versions WHERE id=?').get(document.versionId);
        if(!archived || archived.document!==JSON.stringify(document))throw new DomainError('LEGACY_OWNER_CONFLICT','新内容已接管卡片，旧写入口不能覆盖');
        cards++;checkpoint('card');continue;
      }
      if (old && (old.legacy_kind !== kind || old.published_type !== document.mode))
        throw new DomainError('LEGACY_OWNER_CONFLICT','正式内容已转入新所有者，旧写入口不能覆盖');
      db.prepare(`INSERT INTO learning_cards VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
        deck_id=excluded.deck_id,title=excluded.title,current_version_id=excluded.current_version_id,
        current_cycle_id=excluded.current_cycle_id,revision=excluded.revision,deleted_at=excluded.deleted_at`)
        .run(card.cardId,card.deckId,document.title,card.publishedType,card.currentVersionId,card.currentCycleId,card.revision,card.deletedAt,kind);
      version(db,document);
      db.prepare('INSERT INTO learning_published_modes VALUES(?,?,?) ON CONFLICT(card_id,mode) DO UPDATE SET version_id=excluded.version_id')
        .run(card.cardId,document.mode,document.versionId);
      cards++; checkpoint('card');
    }
    for (const row of db.prepare(`SELECT * FROM ${kind === 'question' ? 'attempts' : 'memory_reviews'} ORDER BY id`).iterate() as Iterable<Row>) {
      const {document,item} = legacyEvent(db,kind,row); version(db,document);
      cycle(item.cardId,kind,document.source.ordinal!);
      const encoded = JSON.stringify(item), old = db.prepare('SELECT document FROM learning_review_events WHERE id=?').get(item.eventId);
      if (old && old.document !== encoded) throw new DomainError('MIGRATION_IMMUTABLE_CONFLICT','原始事件/故障/证据/排期已变化');
      if (!old) db.prepare('INSERT INTO learning_review_events VALUES(?,?,?,?,?,?,?)').run(item.eventId,item.cardId,item.contentVersionId,item.cycleId,item.mode,item.createdAt,encoded);
      events++; checkpoint('event');
    }
  }
  return {cards,events,cycles:Number(db.prepare('SELECT count(*) AS n FROM learning_study_cycles').get()?.n)};
}
