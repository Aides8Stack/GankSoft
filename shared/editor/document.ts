import { z } from "zod";

export const Asset = z.strictObject({
  id: z.uuid(),
  mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
  access: z.enum(["draft", "asset"]),
});
export type EditorAsset = z.infer<typeof Asset>;
export const Document = z.strictObject({
  encoding: z.literal("ganksoft.editor/1"),
  markdown: z.string().max(800_000),
  assets: z.array(Asset).max(200),
});
export type EditorDocument = z.infer<typeof Document>;
const Placement = z.strictObject({
  assetId: z.uuid(),
  placementId: z.uuid(),
  width: z.number().int().min(1).max(100),
});
export type ImagePlacement = z.infer<typeof Placement>;
export function placementUrl(value: ImagePlacement): string {
  const p = Placement.parse(value);
  return `gank-asset://${p.assetId}/${p.placementId}?width=${p.width}`;
}
export function parsePlacement(raw: string): ImagePlacement {
  const u = new URL(raw);
  const p = Placement.parse({
    assetId: u.hostname,
    placementId: u.pathname.slice(1),
    width: Number(u.searchParams.get("width")),
  });
  if (u.protocol !== "gank-asset:" || raw !== placementUrl(p))
    throw Error("MEDIA_REFERENCE_INVALID");
  return p;
}
export function resourceUrl(
  raw: string,
  assets: readonly EditorAsset[],
): string {
  const p = parsePlacement(raw),
    a = assets.find((a) => a.id === p.assetId);
  if (!a) throw Error("MEDIA_REFERENCE_MISSING");
  return `app-media://${a.access}/${a.id}`;
}
export function safeLink(raw: string): boolean {
  return (
    /^(https?:\/\/|mailto:)/i.test(raw) && !/[\u0000-\u0020\u007f]/.test(raw)
  );
}
export function colorValue(value: string): string {
  if (!/^#[0-9a-f]{6}$/.test(value)) throw Error("COLOR_INVALID");
  return value;
}
export function readDocument(value: unknown): EditorDocument {
  const d = Document.parse(value);
  if (new Set(d.assets.map((a) => a.id)).size !== d.assets.length)
    throw Error("MEDIA_ASSET_DUPLICATE");
  return d;
}
