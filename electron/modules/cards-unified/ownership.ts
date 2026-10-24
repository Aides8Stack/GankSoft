import type { Context } from "../../infrastructure/context.ts";
import { DomainError } from "../../../shared/domain-error.ts";
import { newDraftPrefix } from "./new-drafts.ts";
/** Legacy UI may still be open while a new published version takes ownership. */
export function assertLegacyMutation(
  ctx: Context,
  command: string,
  payload: Record<string, unknown>,
) {
  if(Number(ctx.db.prepare('PRAGMA user_version').get()?.user_version)===606 && /^knowledge\.(save|merge|delete|restore|mapSave)$/.test(command)) {
    const decks=new Set<string>();
    if(typeof payload.module==='string')decks.add(payload.module);
    for(const field of ['id','source_id','target_id'])if(typeof payload[field]==='string') {
      const node=ctx.db.prepare('SELECT module FROM knowledge WHERE id=?').get(payload[field] as string);if(node)decks.add(String(node.module));
    }
    for(const deckId of decks)if(ctx.db.prepare('SELECT 1 FROM settings WHERE key=?').get('unified-knowledge-order:'+deckId)||ctx.db.prepare("SELECT 1 FROM settings s JOIN knowledge k ON s.key='unified-knowledge-body:'||k.id WHERE k.module=? LIMIT 1").get(deckId))
      throw new DomainError('LEGACY_KNOWLEDGE_OWNER_CONFLICT','该图谱已由知识工作台管理，请保留旧草稿并使用新接口');
  }
  if (
    !/^(question\.|memory\.|review\.submit|plan\.set|asset\.|cards\.bulk)/.test(
      command,
    ) ||
    Number(ctx.db.prepare("PRAGMA user_version").get()?.user_version) !== 606
  )
    return;
  const ids = new Set<string>();
  for (const k of ["id", "question_id", "card_id", "cardId"])
    if (typeof payload[k] === "string") ids.add(payload[k] as string);
  if (Array.isArray(payload.ids))
    for (const id of payload.ids) if (typeof id === "string") ids.add(id);
  if (Array.isArray(payload.items))
    for (const item of payload.items)
      if (
        item &&
        typeof item === "object" &&
        "id" in item &&
        typeof item.id === "string"
      )
        ids.add(item.id);
  if (command.startsWith("asset.") && typeof payload.id === "string") {
    const asset = ctx.db
      .prepare("SELECT question_id FROM assets WHERE id=?")
      .get(payload.id);
    if (asset) ids.add(String(asset.question_id));
  }
  for (const id of ids)
    if (
      ctx.db.prepare("SELECT 1 FROM settings WHERE key=?").get(newDraftPrefix + id) ||
      ctx.db.prepare("SELECT 1 FROM learning_review_events WHERE card_id=? AND json_extract(document,'$.native.encoding')='ganksoft.review-event/1' LIMIT 1").get(id) ||
      ctx.db
        .prepare(
          `SELECT 1 FROM learning_cards c JOIN learning_content_versions v ON v.id=c.current_version_id
    WHERE c.id=? AND json_extract(v.document,'$.source.kind')='published'`,
        )
        .get(id)
    )
      throw new DomainError(
        "LEGACY_OWNER_CONFLICT",
        "该卡片已由新发布模型管理，请使用当前卡片接口",
      );
}
