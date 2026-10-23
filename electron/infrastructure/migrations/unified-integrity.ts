import { StoredDraft } from '../../../shared/protocol/card-draft.ts';
import { DatabaseSync } from 'node:sqlite';
import { UNIFIED_SCHEMA } from './unified-schema.ts';
import { Card, CardDraft, ContentVersion, ReviewEvent, StudyCycle } from '../../../shared/protocol/unified.ts';
import { currentLegacyContent, type Row } from '../../modules/cards-unified/legacy.ts';
import { legacyEvent, legacyProjectionDigest } from './legacy-projection.ts';
let expectedStructure: Map<string,string> | undefined;
function structure(db:DatabaseSync) {
  return new Map(db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name LIKE 'learning_%' AND sql IS NOT NULL AND name<>'learning_owner'")
    .all().map(r=>[String(r.type)+':'+r.name,String(r.sql).trim().replace(/\s+/g,' ')]));
}

/** Pure validation: no repairs or backfill on reads, backup verification or reopen. */
export function validateUnifiedData(db: DatabaseSync) {
  if(!expectedStructure){const reference=new DatabaseSync(':memory:');try{reference.exec(UNIFIED_SCHEMA);expectedStructure=structure(reference);}finally{reference.close();}}
  const actual=structure(db);
  if(actual.size!==expectedStructure.size || [...expectedStructure].some(([k,v])=>actual.get(k)!==v)) throw Error('统一模型结构/不可变约束未识别');
  const meta = db.prepare('SELECT * FROM learning_model_meta WHERE singleton=1').get();
  if (!meta || meta.source_schema !== 604 || meta.target_schema !== 606 || meta.state !== 'staged' || !/^[a-f0-9]{64}$/.test(String(meta.source_digest)))
    throw Error('统一模型迁移来源损坏');
  for (const row of db.prepare('SELECT * FROM learning_content_versions').iterate()) {
    const doc=ContentVersion.parse(JSON.parse(String(row.document)));
    if (doc.versionId!==row.id || doc.cardId!==row.card_id || doc.mode!==row.mode) throw Error('版本身份不一致');
  }
  for (const row of db.prepare('SELECT * FROM learning_cards').iterate()) {
    const card=Card.parse({cardId:row.id,deckId:row.deck_id,publishedType:row.published_type,currentVersionId:row.current_version_id,
      currentCycleId:row.current_cycle_id,revision:row.revision,deletedAt:row.deleted_at,legacyKind:row.legacy_kind});
    if (!db.prepare('SELECT 1 FROM learning_published_modes WHERE card_id=? AND mode=? AND version_id=?').get(card.cardId,card.publishedType,card.currentVersionId))
      throw Error('当前版本缺少相应模式指针');
  }
  for (const row of db.prepare('SELECT * FROM learning_study_cycles').iterate())
    StudyCycle.parse({cycleId:row.id,cardId:row.card_id,startedAt:row.started_at,provenance:row.provenance,sourceOrdinal:row.source_ordinal});
  for (const row of db.prepare('SELECT * FROM learning_card_drafts').iterate()) {
    const raw=JSON.parse(String(row.payload));
    if(raw.encoding==='ganksoft.card-draft/1') {
      const d=StoredDraft.parse(raw).document;
      if(d.cardId!==row.card_id || d.draftType!==row.mode || d.revision!==row.revision ||
         d.basePublishedRevision!==row.base_published_revision || d.updatedAt!==row.updated_at)
        throw Error('草稿封套与存储身份不一致');
      if(!db.prepare('SELECT 1 FROM learning_content_versions WHERE id=? AND card_id=?').get(d.origin.versionId,d.cardId))
        throw Error('草稿来源版本不属于当前卡片');
    } else CardDraft.parse({cardId:row.card_id,draftType:row.mode,payload:raw,revision:row.revision,
      basePublishedRevision:row.base_published_revision,updatedAt:row.updated_at});
  }
  for (const row of db.prepare('SELECT * FROM learning_review_events').iterate()) {
    const doc=ReviewEvent.parse(JSON.parse(String(row.document)));
    if(doc.eventId!==row.id || doc.cardId!==row.card_id || doc.contentVersionId!==row.version_id || doc.cycleId!==row.cycle_id || doc.mode!==row.mode || doc.createdAt!==row.created_at)
      throw Error('事件身份不一致');
  }
  // Check both directions: a missing row must not silently become an empty model.
  for (const kind of ['question','memory'] as const) {
    for(const row of db.prepare(`SELECT * FROM ${kind==='question'?'questions':'memory_cards'}`).iterate() as Iterable<Row>) {
      const doc=currentLegacyContent(db,kind,row);
      const card=db.prepare('SELECT * FROM learning_cards WHERE id=?').get(row.id!);
      const stored=db.prepare('SELECT document FROM learning_content_versions WHERE id=?').get(doc.versionId);
      const current=card?db.prepare('SELECT document FROM learning_content_versions WHERE id=?').get(card.current_version_id!):null;
      const nativeOwner=current && ContentVersion.parse(JSON.parse(String(current.document))).source.kind==='published';
      if(!card || card.legacy_kind!==kind || card.deck_id!==row.module || (!nativeOwner && card.current_version_id!==doc.versionId) || !stored || stored.document!==JSON.stringify(doc))
        throw Error('旧写入口与统一内容投影不一致');
    }
    for(const row of db.prepare(`SELECT * FROM ${kind==='question'?'attempts':'memory_reviews'}`).iterate() as Iterable<Row>) {
      const {item,document}=legacyEvent(db,kind,row);
      if(db.prepare('SELECT document FROM learning_review_events WHERE id=?').get(item.eventId)?.document!==JSON.stringify(item) ||
         db.prepare('SELECT document FROM learning_content_versions WHERE id=?').get(document.versionId)?.document!==JSON.stringify(document))
        throw Error('旧历史与不可变档案不一致');
    }
  }
  for(const row of db.prepare('SELECT id,legacy_kind FROM learning_cards WHERE legacy_kind IS NOT NULL').iterate())
    if(!db.prepare(`SELECT 1 FROM ${row.legacy_kind==='question'?'questions':'memory_cards'} WHERE id=?`).get(row.id!)) throw Error('原始卡片缺失');
  for(const row of db.prepare("SELECT id,mode FROM learning_review_events WHERE json_extract(document,'$.legacyScale') IS NOT NULL").iterate())
    if(!db.prepare(`SELECT 1 FROM ${row.mode==='question'?'attempts':'memory_reviews'} WHERE id=?`).get(row.id!)) throw Error('原始历史缺失');
  if(db.prepare("SELECT 1 FROM sqlite_master WHERE name='learning_owner'").get()) {
    const owner=db.prepare('SELECT * FROM learning_owner WHERE singleton=1').get();
    const protocol=db.prepare('SELECT epoch,revision FROM protocol_meta WHERE singleton=1').get();
    if(!owner || owner.legacy_digest!==legacyProjectionDigest(db) || owner.epoch!==protocol?.epoch || owner.revision!==protocol?.revision)
      throw Error('旧写adapter水位/epoch不一致');
  }
}
