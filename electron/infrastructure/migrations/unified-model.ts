import { realpathSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { transaction } from '../database.ts';
import type { Context } from '../context.ts';
import { DomainError } from '../../../shared/domain-error.ts';
import { Card, ReviewEvent, StudyCycle, type ContentVersionDTO } from '../../../shared/protocol/unified.ts';
import { currentLegacyContent, historicalLegacyContent, stableId, type LegacyKind, type Row } from '../../modules/cards-unified/legacy.ts';
import { inspectLegacyBaseline } from './baseline.ts';
import { UNIFIED_SCHEMA, UNIFIED_SCHEMA_VERSION } from './unified-schema.ts';

const known604 = '355c28a533579ffed5ad3c007bb7406eabe3c0cbff0d63950446d89b8f81c0ad';
function version(db: DatabaseSync, document: ContentVersionDTO) {
  db.prepare('INSERT INTO learning_content_versions(id,card_id,mode,document) VALUES(?,?,?,?)')
    .run(document.versionId, document.cardId, document.mode, JSON.stringify(document));
}
/** S1.b building block, ONLY on an isolated WAL-consistent copy. Not startup/cutover.
 * S1.c owns recovery verification, retry/crash coordination and activation. */
export function stageUnifiedModel(ctx: Context, sourceDatabasePath: string) {
  const db = ctx.db, path = db.location();
  if (db.isTransaction || !path || path === ':memory:' || realpathSync(path) === realpathSync(sourceDatabasePath))
    throw new DomainError('MIGRATION_STAGING_REQUIRED', '统一模型只能构建在源库以外的隔离副本');
  const baseline = inspectLegacyBaseline(path, ctx.dataDir);
  if (baseline.schemaHash !== known604)
    throw new DomainError('MIGRATION_SCHEMA_UNSUPPORTED', '仅已核实的完整schema604结构可构建；其它结构须显式适配');
  if (db.prepare("SELECT 1 FROM platform_operations WHERE state='pending' LIMIT 1").get())
    throw new DomainError('MIGRATION_OPERATION_PENDING', '必须先核对未决平台操作，不能带未知操作升级');
  return transaction(db, () => {
    // Lock the staged database and reject drift between preflight and write ownership.
    if (inspectLegacyBaseline(path, ctx.dataDir).digest !== baseline.digest)
      throw new DomainError('MIGRATION_SOURCE_CHANGED', '隔离副本在预检后发生变化');
    db.exec(UNIFIED_SCHEMA);
    let cards = 0, events = 0;
    const cycles = new Set<string>();
    const cycle = (cardId: string, kind: LegacyKind, ordinal: number) => {
      const id = stableId('cycle', kind, cardId, ordinal);
      if (!cycles.has(id)) {
        const item = StudyCycle.parse({ cycleId: id, cardId, startedAt: null, provenance: 'legacy-segment', sourceOrdinal: ordinal });
        db.prepare('INSERT INTO learning_study_cycles VALUES(?,?,?,?,?)')
          .run(item.cycleId, item.cardId, item.startedAt, item.provenance, item.sourceOrdinal);
        cycles.add(id);
      }
      return id;
    };
    for (const kind of ['question', 'memory'] as const) {
      const table = kind === 'question' ? 'questions' : 'memory_cards';
      for (const row of db.prepare(`SELECT * FROM ${table} ORDER BY id`).iterate() as Iterable<Row>) {
        const document = currentLegacyContent(db, kind, row);
        const card = Card.parse({ cardId: row.id, deckId: row.module, publishedType: document.mode,
          currentVersionId: document.versionId, currentCycleId: cycle(String(row.id), kind, document.source.ordinal!),
          revision: row.version, deletedAt: row.deleted_at, legacyKind: kind });
        db.prepare('INSERT INTO learning_cards(id,deck_id,title,published_type,current_version_id,current_cycle_id,revision,deleted_at,legacy_kind) VALUES(?,?,?,?,?,?,?,?,?)')
          .run(card.cardId, card.deckId, document.title, card.publishedType, card.currentVersionId, card.currentCycleId, card.revision, card.deletedAt, card.legacyKind);
        version(db, document);
        db.prepare('INSERT INTO learning_published_modes VALUES(?,?,?)').run(card.cardId, document.mode, document.versionId);
        cards++;
      }
      const eventTable = kind === 'question' ? 'attempts' : 'memory_reviews';
      for (const row of db.prepare(`SELECT * FROM ${eventTable} ORDER BY id`).iterate() as Iterable<Row>) {
        const document = historicalLegacyContent(kind, row);
        version(db, document);
        const evidence = kind === 'question' ? db.prepare('SELECT * FROM attempt_evidence_snapshots WHERE attempt_id=?').get(row.id!) ?? null : null;
        const faults = kind === 'question' ? db.prepare('SELECT * FROM attempt_faults WHERE attempt_id=? ORDER BY id').all(row.id!) : [];
        const schedule = db.prepare('SELECT * FROM schedule_events WHERE id=? AND kind=? AND card_id=?').get(row.id!, kind, document.cardId) ?? null;
        const item = ReviewEvent.parse({ eventId: row.id, cardId: document.cardId, deckIdAtEvent: evidence?.deck_id ?? null,
          contentVersionId: document.versionId, cycleId: cycle(document.cardId, kind, document.source.ordinal!), mode: document.mode,
          createdAt: row.created_at, scoreTenths: null, objectiveCorrect: kind === 'question' ? !!row.correct : null,
          rating: null, mappingVersion: 'legacy-preserved', engineVersion: row.algorithm,
          legacyScale: '0-4', legacyScore: row.score, legacySelfScore: row.self_score ?? null,
          legacyRating: schedule?.rating ?? null, legacyRaw: JSON.stringify({ row, evidence, faults, schedule }),
          knowledgeSnapshot: kind === 'question' ? row.knowledge_snapshot : null });
        db.prepare('INSERT INTO learning_review_events VALUES(?,?,?,?,?,?,?)')
          .run(item.eventId, item.cardId, item.contentVersionId, item.cycleId, item.mode, item.createdAt, JSON.stringify(item));
        events++;
      }
    }
    if (db.prepare('PRAGMA foreign_key_check').all().length || db.prepare('PRAGMA integrity_check').get()?.integrity_check !== 'ok')
      throw new DomainError('MIGRATION_DATA_INVALID', '统一模型完整性检查失败');
    db.prepare("INSERT INTO learning_model_meta VALUES(1,604,?,'staged',?)").run(UNIFIED_SCHEMA_VERSION, baseline.digest);
    db.exec(`PRAGMA user_version=${UNIFIED_SCHEMA_VERSION}`);
    return { sourceDigest: baseline.digest, schemaVersion: UNIFIED_SCHEMA_VERSION, cards, events, cycles: cycles.size, state: 'staged' as const };
  });
}
