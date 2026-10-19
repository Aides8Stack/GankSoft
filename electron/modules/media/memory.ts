import { all, one, run, type Context } from "../../infrastructure/context.ts";
import { transaction } from "../../infrastructure/database.ts";
import { draftImage } from "./drafts.ts";
import { imageInstance, saveImageLayout } from "./instances.ts";
import { imageLayout, type ImageLayout } from "../../../shared/image-node.ts";
export function memoryImages(ctx: Context, id: string) {
  return all(ctx, "SELECT * FROM memory_assets WHERE card_id=? ORDER BY sort_order", id).map(a => imageInstance(ctx, a));
}
export function saveMemoryImages(ctx: Context, id: string, deckId: string, refs: { id: string; role: string; layout?: ImageLayout }[]): void {
  if (!ctx.db.isTransaction) return transaction(ctx.db, () => saveMemoryImages(ctx, id, deckId, refs));
  if (!one(ctx, "SELECT id FROM memory_cards WHERE id=? AND module=? AND deleted_at IS NULL", id, deckId))
    throw Error("记忆卡不存在或不属于当前卡片集");
  if (refs.length > 40 || new Set(refs.map(r => r.id)).size !== refs.length) throw Error("图片引用重复或数量超限");
  const before = memoryImages(ctx, id);
  const resolved = refs.map(ref => {
    if (!["question", "analysis"].includes(ref.role)) throw Error("记忆图片用途不合法");
    const old = before.find(a => a.id === ref.id);
    if (old && old.role !== ref.role) throw Error("已有图片用途不能修改");
    const source = old ?? draftImage(ctx, ref.id, deckId, ref.role);
    return { ...source, id: ref.id, role: ref.role, layout: imageLayout(ref.layout ?? old?.layout) };
  });
  const changed = before.length !== resolved.length || resolved.some(a => !before.some(b => b.id === a.id));
  for (const a of before) if (!resolved.some(b => b.id === a.id)) {
    run(ctx, "DELETE FROM memory_assets WHERE id=?", a.id);
    run(ctx, "DELETE FROM settings WHERE key=?", "image-layout:" + a.id);
  }
  resolved.forEach((a, index) => {
    run(ctx, "INSERT INTO memory_assets VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET sort_order=excluded.sort_order",
      a.id, id, a.role, a.file_name, a.mime, index);
    saveImageLayout(ctx, a.id, a.layout);
    run(ctx, "DELETE FROM settings WHERE key=?", "media-draft:" + a.id);
  });
  if (changed) {
    run(ctx, "UPDATE memory_cards SET learning_version=learning_version+1,version=version+1 WHERE id=?", id);
    run(ctx, "DELETE FROM scheduling WHERE kind='memory' AND card_id=?", id);
    run(ctx, "UPDATE memory_plans SET due_at=?,interval_days=0,mastery=NULL,reason='图片内容已修改，等待重新验证' WHERE card_id=?", ctx.now().toISOString(), id);
  }
}
