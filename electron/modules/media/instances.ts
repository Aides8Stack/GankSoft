import { imageLayout } from "../../../shared/image-node.ts";
import { one, run, type Context } from "../../infrastructure/context.ts";
export function imageInstance<T extends { id: string; file_name?: string }>(ctx: Context, ref: T) {
  const stored = one(ctx, "SELECT value FROM settings WHERE key=?", "image-layout:" + ref.id);
  return { ...ref, instanceId: ref.id, assetId: ref.file_name?.split(".")[0] ?? ref.id,
    layout: imageLayout(stored ? JSON.parse(stored.value) : undefined) };
}
export function saveImageLayout(ctx: Context, id: string, value: unknown) {
  const layout = imageLayout(value);
  run(ctx, "INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    "image-layout:" + id, JSON.stringify(layout));
  return layout;
}
