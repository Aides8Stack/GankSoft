import { z } from "zod";
import { DraftFields } from "../protocol/card-draft.ts";
const Envelope = z.strictObject({
  format: z.literal("ganksoft.card-clipboard"),
  version: z.literal(1),
  fields: DraftFields,
});
export type CardFields = z.infer<typeof DraftFields>;
const marker = "<!-- ganksoft-card:1 -->\n";
const limit = 900_000;
export function copyCardContent(fields: CardFields) {
  const body =
    marker +
    JSON.stringify(
      Envelope.parse({ format: "ganksoft.card-clipboard", version: 1, fields }),
      null,
      2,
    );
  if (body.length > limit) throw Error("CLIPBOARD_TOO_LARGE");
  return body;
}
export function parseCardContent(text: string): CardFields {
  if (text.length > limit) throw Error("CLIPBOARD_TOO_LARGE");
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized.startsWith(marker))
    throw Error("CLIPBOARD_FORMAT_UNSUPPORTED");
  return Envelope.parse(JSON.parse(normalized.slice(marker.length))).fields;
}
export function previewCardPaste(text: string, current: CardFields) {
  const target = DraftFields.parse(current),
    incoming = parseCardContent(text),
    overwrites: string[] = [];
  if (target.title !== incoming.title) overwrites.push("title");
  if (target.payload.mode !== incoming.payload.mode) overwrites.push("mode");
  for (const [key, value] of Object.entries(incoming.payload.fields))
    if (
      JSON.stringify(value) !==
      JSON.stringify((target.payload.fields as Record<string, unknown>)[key])
    )
      overwrites.push(key);
  if (JSON.stringify(incoming.mediaRefs) !== JSON.stringify(target.mediaRefs))
    overwrites.push("mediaRefs");
  return {
    fields: incoming,
    overwrites,
    switchRequired: target.payload.mode !== incoming.payload.mode,
    source: copyCardContent(target),
    warnings: incoming.mediaRefs.length
      ? ["图片为本地资源引用；保存时必须校验归属，跨数据库图片需要独立导入。"]
      : [],
  };
}
export function confirmCardPaste(
  preview: ReturnType<typeof previewCardPaste>,
  current: CardFields,
  confirmed: boolean,
) {
  if (!confirmed) return structuredClone(current);
  if (copyCardContent(current) !== preview.source)
    throw Error("CLIPBOARD_PREVIEW_EXPIRED");
  if (preview.switchRequired) throw Error("MODE_SWITCH_CONFIRM_REQUIRED");
  return DraftFields.parse(structuredClone(preview.fields));
}
