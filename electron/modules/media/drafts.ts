import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { one, run, type Context } from "../../infrastructure/context.ts";
import { validateImage } from "../../infrastructure/images.ts";
import { DomainError } from "../../../shared/domain-error.ts";
import { addAsset, deleteAsset } from "../questions/service.ts";
export function stageImage(
  ctx: Context,
  deckId: string,
  purpose: string,
  bytes: Buffer,
  mime: string,
  onWrite?: (fileName: string) => void,
) {
  if (
    !one(ctx, "SELECT id FROM decks WHERE id=? AND deleted_at IS NULL", deckId)
  )
    throw new DomainError("DECK_CONFLICT", "卡片集不存在");
  validateImage(bytes, mime);
  const id = randomUUID(),
    file_name =
      id +
      (mime === "image/jpeg"
        ? ".jpg"
        : mime === "image/webp"
          ? ".webp"
          : ".png");
  mkdirSync(join(ctx.dataDir, "attachments"), { recursive: true });
  onWrite?.(file_name);
  writeFileSync(join(ctx.dataDir, "attachments", file_name), bytes);
  run(
    ctx,
    "INSERT INTO settings(key,value) VALUES (?,?)",
    "media-draft:" + id,
    JSON.stringify({ id, file_name, mime, deckId, purpose, sha256:createHash('sha256').update(bytes).digest('hex') }),
  );
  return { id, mime };
}
export function draftImage(
  ctx: Context,
  id: string,
  deckId?: string,
  purpose?: string,
) {
  let meta: any;
  try {
    meta = JSON.parse(
      one(ctx, "SELECT value FROM settings WHERE key=?", "media-draft:" + id)
        ?.value ?? "null",
    );
  } catch {}
  if (
    !meta ||
    !/^[a-f0-9-]+\.(png|jpg|webp)$/.test(meta.file_name) ||
    meta.id !== id ||
    (deckId && meta.deckId !== deckId) ||
    (purpose && meta.purpose !== purpose) ||
    !existsSync(join(ctx.dataDir, "attachments", meta.file_name))
  )
    throw new DomainError(
      "VALIDATION_ERROR",
      "图片草稿不存在、已失效或不属于当前用途",
    );
  return meta;
}
export function saveQuestionImages(
  ctx: Context,
  id: string,
  deckId: string,
  refs: { id: string; role: string }[],
) {
  const before = ctx.db
      .prepare("SELECT * FROM assets WHERE question_id=?")
      .all(id) as any[],
    ids = new Set<string>();
  const resolved = refs.map((ref) => {
    if (ids.has(ref.id))
      throw new DomainError("VALIDATION_ERROR", "图片引用重复");
    ids.add(ref.id);
    const old = before.find((a) => a.id === ref.id);
    if (old) {
      if (old.role !== ref.role)
        throw new DomainError("VALIDATION_ERROR", "已有图片用途不能修改");
      return old;
    }
    const m = draftImage(ctx, ref.id, deckId, ref.role);
    validateImage(
      readFileSync(join(ctx.dataDir, "attachments", m.file_name)),
      m.mime,
    );
    return { ...m, role: ref.role, question_id: id };
  });
  for (const a of before) if (!ids.has(a.id)) deleteAsset(ctx, { id: a.id });
  for (const a of resolved)
    if (!before.some((b) => b.id === a.id)) addAsset(ctx, a);
}
export function responseImages(
  ctx: Context,
  deckId: string,
  ids: string[] = [],
) {
  if (new Set(ids).size !== ids.length || ids.length > 20)
    throw new DomainError("VALIDATION_ERROR", "作答图片数量不合法");
  return ids.map((id) => {
    const m = draftImage(ctx, id, deckId, "response");
    return { id: m.id, file_name: m.file_name, mime: m.mime, role: "response" };
  });
}
