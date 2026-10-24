import type { z } from 'zod';
import { CardDraft } from '../../../shared/protocol/unified.ts';
import { ProtocolError } from '../../../shared/protocol/data.ts';
import { transaction } from '../../infrastructure/database.ts';
import type { Context } from '../../infrastructure/context.ts';

/** Persistence primitive for the staged model. No public save/switch/publish API in S1.b. */
export function saveStagedDraft(ctx: Context, value: z.infer<typeof CardDraft>, expectedRevision: number | null) {
  const draft = CardDraft.parse(value), db = ctx.db;
  if (Number(db.prepare('PRAGMA user_version').get()?.user_version) !== 606)
    throw new ProtocolError('MIGRATION_NOT_ACTIVATED', '草稿持久化仅用于隔离的新模型');
  return transaction(db, () => {
    const card = db.prepare('SELECT revision,deleted_at FROM learning_cards WHERE id=?').get(draft.cardId);
    if (!card || card.deleted_at) throw new ProtocolError('CARD_NOT_FOUND', '卡片不存在或已删除');
    if (card.revision !== draft.basePublishedRevision)
      throw new ProtocolError('CONTENT_VERSION_CONFLICT', '正式内容修订已变化');
    const old = db.prepare('SELECT mode,revision FROM learning_card_drafts WHERE card_id=?').get(draft.cardId);
    if ((old ? old.revision !== expectedRevision : expectedRevision !== null) || draft.revision !== (Number(old?.revision ?? 0) + 1))
      throw new ProtocolError('DRAFT_REVISION_CONFLICT', '草稿修订已变化');
    if (old && old.mode !== draft.draftType)
      throw new ProtocolError('DRAFT_MODE_CONFLICT', '不能隐式切换并覆盖另一模式的草稿');
    db.prepare(`INSERT INTO learning_card_drafts VALUES(?,?,?,?,?,?) ON CONFLICT(card_id) DO UPDATE SET
      payload=excluded.payload,revision=excluded.revision,base_published_revision=excluded.base_published_revision,updated_at=excluded.updated_at`)
      .run(draft.cardId, draft.draftType, JSON.stringify(draft.payload), draft.revision, draft.basePublishedRevision, draft.updatedAt);
    return draft;
  });
}
