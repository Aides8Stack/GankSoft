import { createHash } from "node:crypto";
import { getImageTransformer } from "../../infrastructure/image-binding.ts";
import { validateImage } from "../../infrastructure/images.ts";
// Rebuildable, bounded process cache. Never part of content, backups or resource identity.
const cache = new Map<string, Buffer>();
let size = 0;
const limit = 16 * 1024 * 1024;
export function mediaThumbnail(bytes: Buffer, mime: string): Buffer {
  const key = createHash("sha256").update(bytes).digest("hex") + ":preview-v1";
  const cached = cache.get(key);
  if (cached) { cache.delete(key); cache.set(key, cached); return cached; }
  const dimensions = validateImage(bytes, mime);
  const Transformer = getImageTransformer();
  const value = new Transformer(bytes).resize({ width: Math.min(1280, dimensions.width), height: Math.min(1280, dimensions.height), fit: 2 }).webpSync(82);
  while (size + value.length > limit && cache.size) {
    const oldest = cache.keys().next().value!; size -= cache.get(oldest)!.length; cache.delete(oldest);
  }
  if (value.length <= limit) { cache.set(key, value); size += value.length; }
  return value;
}
