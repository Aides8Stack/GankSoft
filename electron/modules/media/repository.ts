import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, existsSync, openSync, writeFileSync, fsyncSync, closeSync, renameSync, rmSync, readdirSync, lstatSync } from "node:fs";
import { join, basename } from "node:path";
import { one, run, type Context } from "../../infrastructure/context.ts";

export interface MediaAsset {
  assetId: string;
  sha256: string;
  file_name: string;
  mime: "image/png" | "image/jpeg" | "image/webp";
  byteSize: number;
  pixelWidth: number;
  pixelHeight: number;
}
export const digestImage = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
export const managedName = /^[a-f0-9]{64}\.(png|jpg|webp)$/;
export const mediaKey = (assetId: string) => "media-asset:" + assetId;
export function readMediaAsset(ctx: Context, assetId: string): MediaAsset | null {
  if (!/^[a-f0-9]{64}$/.test(assetId)) throw Error("资源ID不合法");
  const row = one(ctx, "SELECT value FROM settings WHERE key=?", mediaKey(assetId));
  if (!row) return null;
  const asset = JSON.parse(row.value) as MediaAsset;
  if (asset.assetId !== assetId || asset.sha256 !== assetId || !managedName.test(asset.file_name))
    throw Error("资源元数据不合法");
  const path = join(ctx.dataDir, "attachments", asset.file_name);
  if (lstatSync(path).isSymbolicLink() || digestImage(readFileSync(path)) !== asset.sha256)
    throw Error("资源哈希校验失败");
  return asset;
}
export function storeAssetMetadata(ctx: Context, asset: MediaAsset) {
  run(ctx, "INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    mediaKey(asset.assetId), JSON.stringify(asset));
}
export const stagingDirectory = (ctx: Context) => join(ctx.dataDir, "attachments", ".media-staging");
function durableWrite(path: string, bytes: Buffer | string) {
  const fd = openSync(path, "wx");
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
}
/** Journal survives the outer SQLite transaction, including ambiguous commit results. */
export function publishAssetBytes(ctx: Context, asset: MediaAsset, bytes: Buffer) {
  const directory = join(ctx.dataDir, "attachments"), staging = stagingDirectory(ctx);
  mkdirSync(staging, { recursive: true });
  const key = randomUUID(), partial = join(staging, key + ".part"), journal = join(staging, key + ".json");
  durableWrite(journal, JSON.stringify({ version: 1, key, asset }));
  durableWrite(partial, bytes);
  const target = join(directory, asset.file_name);
  if (existsSync(target)) {
    if (lstatSync(target).isSymbolicLink() || digestImage(readFileSync(target)) !== asset.sha256)
      throw Error("已有原图哈希不一致，拒绝覆盖");
    rmSync(partial);
  } else renameSync(partial, target);
  // Do not remove journal here: only the outer transaction knows whether it committed.
}
export function pendingAssets(ctx: Context) {
  const directory = stagingDirectory(ctx);
  return (existsSync(directory) ? readdirSync(directory) : []).filter(n => n.endsWith(".json")).map(name => {
    const path = join(directory, name);
    if (!/^[a-f0-9-]{36}\.json$/.test(name) || lstatSync(path).isSymbolicLink())
      throw Error("图片恢复日志路径不合法");
    const record = JSON.parse(readFileSync(path, "utf8"));
    if (record.version !== 1 || name !== record.key + ".json" ||
      !managedName.test(record.asset?.file_name) ||
      record.asset.file_name.split(".")[0] !== record.asset.sha256 ||
      record.asset.assetId !== record.asset.sha256)
      throw Error("图片恢复日志损坏，保留现场并拒绝清理");
    return { ...record, path } as { version: 1; key: string; asset: MediaAsset; path: string };
  });
}

/** Deliver the exact validated bytes, including legacy scoped filenames; never serve a changed hash-named original. */
export function readMediaBytes(ctx: Context, fileName: string): Buffer {
  if (basename(fileName) !== fileName || !/^[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i.test(fileName)) throw Error("图片路径不合法");
  const path = join(ctx.dataDir, "attachments", fileName);
  if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile()) throw Error("图片不是普通文件");
  const bytes = readFileSync(path);
  if (managedName.test(fileName) && digestImage(bytes) !== fileName.split(".")[0]) throw Error("原图哈希不一致");
  return bytes;
}
