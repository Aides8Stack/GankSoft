import { basename, join } from "node:path";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { all, one, type Context } from "../../infrastructure/context.ts";
import { imageLayout, ImageRole } from "../../../shared/image-node.ts";
import { mediaReferences } from "./references.ts";
import { draftImage, responseImages } from "./drafts.ts";
import { managedName, digestImage, readMediaAsset } from "./repository.ts";

/** Read-only validation against a SQLite snapshot and its immutable original files. No native decoder needed. */
export function validateMediaIntegrity(ctx: Context) {
  const refs = mediaReferences(ctx), files = new Set(refs.map(r => r.fileName));
  for (const file of files) {
    if (basename(file) !== file || !/^[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i.test(file)) throw Error("备份图片引用路径不合法");
    const path = join(ctx.dataDir, "attachments", file);
    if (!existsSync(path) || lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile()) throw Error("备份缺少图片或图片不是普通文件");
    const bytes = readFileSync(path);
    if (!bytes.length || bytes.length > 20 * 1024 * 1024) throw Error("备份图片大小不合法");
    if (managedName.test(file)) {
      const hash = file.split(".")[0];
      const asset = readMediaAsset(ctx, hash);
      if (!asset || asset.file_name !== file || digestImage(bytes) !== hash || asset.byteSize !== bytes.length ||
        !Number.isInteger(asset.pixelWidth) || !Number.isInteger(asset.pixelHeight) || asset.pixelWidth < 1 || asset.pixelHeight < 1 || asset.pixelWidth * asset.pixelHeight > 40000000)
        throw Error("备份图片资源清单或哈希不一致");
      const mime = file.endsWith(".png") ? "image/png" : file.endsWith(".webp") ? "image/webp" : "image/jpeg";
      if (asset.mime !== mime) throw Error("备份图片MIME不一致");
    }
  }
  for (const row of all(ctx, "SELECT key,value FROM settings WHERE key LIKE 'image-layout:%'")) imageLayout(JSON.parse(row.value));
  for (const row of all(ctx, "SELECT key,value FROM settings WHERE key LIKE 'media-draft:%'")) {
    const meta = JSON.parse(row.value);
    if (row.key !== "media-draft:" + meta.id || !one(ctx, "SELECT id FROM decks WHERE id=?", meta.deckId) ||
      (meta.purpose !== "response" && !ImageRole.safeParse(meta.purpose).success)) throw Error("备份图片草稿作用域不合法");
    draftImage(ctx, meta.id, meta.deckId, meta.purpose);
  }
  for (const row of all(ctx, "SELECT question_snapshot AS value FROM attempts WHERE question_snapshot<>'' UNION ALL SELECT card_snapshot AS value FROM memory_reviews WHERE card_snapshot<>''")) {
    const snapshot = JSON.parse(row.value), ids = new Set<string>();
    for (const asset of snapshot.assets ?? []) {
      if (ids.has(asset.id)) throw Error("备份历史图片实例重复");
      ids.add(asset.id); imageLayout(asset.layout);
      if (asset.assetId && managedName.test(asset.file_name) && asset.assetId !== asset.file_name.split(".")[0]) throw Error("备份历史资源身份不一致");
    }
  }
  for (const row of all(ctx, "SELECT deck_id,payload FROM study_sessions")) {
    const session = JSON.parse(row.payload);
    if (session.responseImages !== undefined) responseImages(ctx, row.deck_id, session.responseImages);
    const pendingImages = session.pendingSubmission?.responseImages ?? session.pendingSubmission?.response_images;
    if (pendingImages !== undefined) responseImages(ctx, row.deck_id, pendingImages);
  }
  return { references: refs.length, files: files.size };
}
