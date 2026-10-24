import { assertKnowledgeAssets } from '../../../shared/knowledge/media.ts';
import { StoredNodeBody, StoredTreeOrder, StoredCardLinks, StoredKnowledgeRecycle } from '../../../shared/protocol/knowledge-tree.ts';
import { StoredReviewSession, NativeCardPolicy, UnifiedScheduleMetadata } from '../../../shared/protocol/review-details.ts';
import { StoredDraft, StoredNewDraft } from '../../../shared/protocol/card-draft.ts';
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
  for (const row of db.prepare("SELECT key,value FROM settings WHERE key LIKE 'new-card-draft:%'").iterate()) {
    const value=StoredNewDraft.parse(JSON.parse(String(row.value))),d=value.document;
    if(row.key!=='new-card-draft:'+d.cardId ||
      !db.prepare('SELECT 1 FROM decks WHERE id=?').get(value.deckId) ||
      db.prepare('SELECT 1 FROM learning_cards WHERE id=?').get(d.cardId))
      throw Error('未发布新卡草稿身份/范围不一致或与正式卡冲突');
  }
  for (const row of db.prepare("SELECT * FROM study_sessions WHERE json_extract(payload,'$.encoding')='ganksoft.review-session/1'").iterate()) {
    const s=StoredReviewSession.parse(JSON.parse(String(row.payload)));
    if(s.deckId!==row.deck_id || s.revision!==row.revision ||
      !db.prepare('SELECT 1 FROM learning_content_versions WHERE id=? AND card_id=?').get(s.entry.versionId,s.entry.cardId) ||
      !db.prepare('SELECT 1 FROM learning_study_cycles WHERE id=? AND card_id=?').get(s.entry.cycleId,s.entry.cardId) ||
      s.ids.some(id=>!db.prepare('SELECT 1 FROM learning_cards WHERE id=? AND deck_id=?').get(id,s.deckId))) throw Error('统一会话引用身份不一致');
    if(s.resultEventId) {
      const row=db.prepare('SELECT document FROM learning_review_events WHERE id=? AND card_id=?').get(s.resultEventId,s.entry.cardId);
      if(!row || ReviewEvent.parse(JSON.parse(String(row.document))).native?.sessionId!==s.sessionId) throw Error('统一会话结果记录缺失');
    }
  }
  for(const row of db.prepare("SELECT item_id,payload FROM recycle_batches WHERE kind='unified-knowledge'").iterate()) {
    const b=StoredKnowledgeRecycle.parse(JSON.parse(String(row.payload)));
    if(row.item_id!==b.batchId || !db.prepare('SELECT 1 FROM decks WHERE id=?').get(b.deckId) || b.nodes.some(n=>{
      const node=db.prepare('SELECT module,version,deleted_at FROM knowledge WHERE id=?').get(n.nodeId);
      return !node||node.module!==b.deckId||!node.deleted_at||node.version!==n.deletedRevision;
    }))throw Error('知识回收批次身份或状态损坏');
  }
  for(const row of db.prepare("SELECT key,value FROM settings WHERE key LIKE 'unified-knowledge-body:%'").iterate()) {
    const b=StoredNodeBody.parse(JSON.parse(String(row.value)));
    if(row.key!=='unified-knowledge-body:'+b.nodeId || !db.prepare('SELECT 1 FROM knowledge WHERE id=? AND module=?').get(b.nodeId,b.deckId))throw Error('知识正文范围或资源引用损坏');
    assertKnowledgeAssets(b.markdown,b.assets);
    for(const asset of b.assets){
      const raw=db.prepare('SELECT value FROM settings WHERE key=?').get('media-draft:'+asset.id);
      const meta=raw?JSON.parse(String(raw.value)):null;
      if(!meta||meta.id!==asset.id||meta.deckId!==b.deckId||meta.purpose!=='knowledge'||meta.mime!==asset.mime||meta.file_name!==asset.fileName||meta.sha256!==asset.sha256)throw Error('知识图片归属或元数据损坏');
    }
  }
  for(const row of db.prepare("SELECT key,value FROM settings WHERE key LIKE 'unified-knowledge-order:%'").iterate()) {
    const o=StoredTreeOrder.parse(JSON.parse(String(row.value)));
    if(row.key!=='unified-knowledge-order:'+o.deckId || !db.prepare('SELECT 1 FROM decks WHERE id=?').get(o.deckId) ||
      o.nodeIds.some(id=>!db.prepare('SELECT 1 FROM knowledge WHERE id=? AND module=?').get(id,o.deckId)))throw Error('知识排序范围损坏');
  }
  for(const row of db.prepare("SELECT key,value FROM settings WHERE key LIKE 'unified-card-knowledge:%'").iterate()) {
    const l=StoredCardLinks.parse(JSON.parse(String(row.value)));
    if(row.key!=='unified-card-knowledge:'+l.cardId || l.revision<1 || !db.prepare('SELECT 1 FROM learning_cards WHERE id=? AND deck_id=? AND legacy_kind IS NULL').get(l.cardId,l.deckId) ||
      l.nodeIds.some(id=>!db.prepare('SELECT 1 FROM knowledge WHERE id=? AND module=?').get(id,l.deckId)))throw Error('原生卡片知识关联范围损坏');
  }
  for(const row of db.prepare("SELECT key,value FROM settings WHERE key LIKE 'unified-card-policy:%'").iterate()) {
    const p=NativeCardPolicy.parse(JSON.parse(String(row.value)));
    if(row.key!=='unified-card-policy:'+p.cardId || !db.prepare('SELECT 1 FROM learning_cards WHERE id=?').get(p.cardId)) throw Error('统一单卡策略身份损坏');
  }
  for(const row of db.prepare("SELECT * FROM scheduling WHERE json_extract(data,'$._gank.encoding')='ganksoft.schedule/1'").iterate()) {
    const meta=UnifiedScheduleMetadata.parse(JSON.parse(String(row.data))._gank);
    const card=db.prepare('SELECT * FROM learning_cards WHERE id=?').get(row.card_id!);
    if(!card || row.kind!==(card.legacy_kind??'card') || !db.prepare('SELECT 1 FROM learning_study_cycles WHERE id=? AND card_id=?').get(meta.cycleId,row.card_id!)) throw Error('统一排期身份损坏');
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
