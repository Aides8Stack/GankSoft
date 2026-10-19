import { readFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Context } from "../../infrastructure/context.ts";
import { one, run } from "../../infrastructure/context.ts";
import { transaction } from "../../infrastructure/database.ts";
import { validateImage } from "../../infrastructure/images.ts";
import { mediaReferences, mediaFileReferenced } from "./references.ts";
import { digestImage, managedName, mediaKey, readMediaAsset, storeAssetMetadata, publishAssetBytes, pendingAssets, stagingDirectory, type MediaAsset } from "./repository.ts";

export function createMediaAsset(ctx: Context, bytes: Buffer, mime: string): MediaAsset {
  if (!ctx.db.isTransaction) return transaction(ctx.db, () => createMediaAsset(ctx, bytes, mime));
  const info = validateImage(bytes, mime), sha256 = digestImage(bytes);
  const metadata = one(ctx, "SELECT value FROM settings WHERE key=?", mediaKey(sha256));
  if (metadata) {
    const old = JSON.parse(metadata.value);
    // A crash during orphan cleanup can retire bytes before metadata. Repair only an unreferenced, valid identity.
    if (old.assetId === sha256 && old.sha256 === sha256 && managedName.test(old.file_name) && old.file_name.split(".")[0] === sha256 &&
      !existsSync(join(ctx.dataDir, "attachments", old.file_name)) && !mediaFileReferenced(ctx, old.file_name))
      run(ctx, "DELETE FROM settings WHERE key=?", mediaKey(sha256));
  }
  const known = readMediaAsset(ctx, sha256);
  if (known) {
    if (known.mime !== mime || known.byteSize !== bytes.length) throw Error("资源元数据冲突");
    return known;
  }
  const extension = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  const asset: MediaAsset = { assetId: sha256, sha256, file_name: sha256 + "." + extension,
    mime: mime as MediaAsset["mime"], byteSize: bytes.length, pixelWidth: info.width, pixelHeight: info.height };
  publishAssetBytes(ctx, asset, bytes);
  storeAssetMetadata(ctx, asset);
  return asset;
}

/** Explicit startup/maintenance boundary. Never clean while another DB writer can publish. */
export function recoverMediaWrites(ctx: Context) {
  if (ctx.db.isTransaction) throw Error("图片恢复必须在业务事务之外运行");
  return transaction(ctx.db, () => {
    const records = pendingAssets(ctx), refs = new Set(mediaReferences(ctx).map(r => r.fileName));
    // Validate the entire batch before any destructive compensation.
    for (const r of records) {
      const target = join(ctx.dataDir, "attachments", r.asset.file_name);
      if (refs.has(r.asset.file_name) && (!existsSync(target) || digestImage(readFileSync(target)) !== r.asset.sha256))
        throw Error("已提交的图片文件缺失或损坏，保留恢复日志");
    }
    let compensated = 0;
    for (const r of records) {
      if (refs.has(r.asset.file_name)) storeAssetMetadata(ctx, r.asset);
      else {
        rmSync(join(ctx.dataDir, "attachments", r.asset.file_name), { force: true });
        run(ctx, "DELETE FROM settings WHERE key=?", mediaKey(r.asset.assetId));
        compensated++;
      }
      rmSync(join(stagingDirectory(ctx), r.key + ".part"), { force: true });
      rmSync(r.path);
    }
    const staging = stagingDirectory(ctx);
    if (existsSync(staging) && readdirSync(staging).length === 0) rmSync(staging, { recursive: true });
    return { recovered: records.length - compensated, compensated };
  });
}

/** Returns candidates first; maintenance callers may explicitly request deletion. */
export function collectOrphanMedia(ctx: Context, remove = false) {
  if (ctx.db.isTransaction) throw Error("资源清理必须在业务事务之外运行");
  return transaction(ctx.db, () => {
    if (pendingAssets(ctx).length) throw Error("请先完成图片写入恢复");
    const refs = new Set(mediaReferences(ctx).map(r => r.fileName));
    const directory = join(ctx.dataDir, "attachments");
    const files = (existsSync(directory) ? readdirSync(directory) : [])
      .filter(n => managedName.test(n) && !refs.has(n));
    if (remove) for (const file of files) {
      rmSync(join(directory, file));
      run(ctx, "DELETE FROM settings WHERE key=?", mediaKey(file.split(".")[0]));
    }
    return files;
  });
}
