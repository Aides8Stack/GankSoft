import { createHash, randomUUID } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { DraftExpectation, DraftFields } from "../../../shared/protocol/card-draft.ts";
import { ClipboardApply, ClipboardPreview } from "../../../shared/protocol/card-transfer.ts";
import { ProtocolError } from "../../../shared/protocol/data.ts";
import type { Response, Handlers } from "../../../shared/protocol/registry.ts";
import { canonical } from "../../../shared/protocol/host.ts";
import { copyCardContent, parseCardContent, previewCardPaste } from "../../../shared/cards/clipboard.ts";
import { parsePlacement, placementUrl } from "../../../shared/editor/document.ts";
import type { Context } from "../../infrastructure/context.ts";
import { validateImage } from "../../infrastructure/images.ts";
import { stageImage } from "../media/drafts.ts";
import { draftCard, readWorkspaceDraft, saveWorkspaceDraft, validateDraftMedia, validateDraftPlacements } from "./draft-service.ts";
import { getPublishedContent } from "./queries.ts";

// Binary clipboard archives stay entirely in the main process. Only a bounded
// content preview and a hash token cross typed IPC; list/detail DTOs stay lean.
export interface ClipboardTextPort { readText(): string | Promise<string>; writeText(value: string): void | Promise<void> }
const marker = "<!-- ganksoft-card:2 -->\n";
const byteBudget = 30 * 1024 * 1024;
const Binary = z.strictObject({
  assetId: z.string().min(1).max(150),
  mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
  base64: z.string().max(28_000_000),
});
const Archive = z.strictObject({
  format: z.literal("ganksoft.card-clipboard"), version: z.literal(2),
  fields: DraftFields, images: z.array(Binary).max(200),
});
function decode(text: string) {
  if (text.length > 44_000_000) throw new ProtocolError("CLIPBOARD_TOO_LARGE", "剪贴板内容超过30MB预算");
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized.startsWith(marker)) return { fields: parseCardContent(text), images: [] };
  const archive = Archive.parse(JSON.parse(normalized.slice(marker.length)));
  const expected = new Map(archive.fields.mediaRefs.map(r => [r.assetId, r.mime]));
  if (expected.size !== archive.images.length || new Set(archive.images.map(i => i.assetId)).size !== archive.images.length)
    throw new ProtocolError("MEDIA_REFERENCE_INVALID", "图片资源缺失或重复");
  let total = 0;
  const images = archive.images.map(image => {
    if (expected.get(image.assetId) !== image.mime || image.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(image.base64))
      throw new ProtocolError("MEDIA_REFERENCE_INVALID", "图片身份、格式或Base64不合法");
    const bytes = Buffer.from(image.base64, "base64");
    total += bytes.length;
    if (total > byteBudget) throw new ProtocolError("CLIPBOARD_TOO_LARGE", "图片总量超过30MB");
    if (bytes.toString("base64") !== image.base64) throw new ProtocolError("MEDIA_REFERENCE_INVALID", "图片编码不规范");
    validateImage(bytes, image.mime);
    return { ...image, bytes };
  });
  for (const ref of archive.fields.mediaRefs)
    if (expected.get(ref.assetId) !== ref.mime) throw new ProtocolError("MEDIA_REFERENCE_INVALID", "同一图片格式不一致");
  return { fields: archive.fields, images };
}
const sha = (text: string) => createHash("sha256").update(text).digest("hex");

export function createCardClipboard(ctx: Context, port: ClipboardTextPort) {
  let createdFiles: string[] = [];
  let incomingText: string | undefined;
  function current(input: z.infer<typeof DraftExpectation>) {
    const p = DraftExpectation.parse(input), scope = { cardId: p.cardId, deckId: p.deckId };
    const card = draftCard(ctx, scope), draft = readWorkspaceDraft(ctx, scope);
    if (card.revision !== p.expectedPublishedRevision) throw new ProtocolError("CONTENT_VERSION_CONFLICT", "正式版本已变化");
    if ((draft?.revision ?? null) !== p.expectedDraftRevision) throw new ProtocolError("DRAFT_REVISION_CONFLICT", "草稿已变化，请重新预览");
    const content = draft ?? getPublishedContent(ctx, scope);
    if (!content.payload) throw new ProtocolError("CONTENT_UNAVAILABLE", "内容不可用");
    return { p, scope, draft, fields: DraftFields.parse({ title: content.title, payload: content.payload, mediaRefs: content.mediaRefs }) };
  }
  function preview(input: z.infer<typeof DraftExpectation>, text: string) {
    const state = current(input), incoming = decode(text);
    validateDraftPlacements(incoming.fields);
    const p = previewCardPaste(copyCardContent(incoming.fields), state.fields);
    if (!incoming.images.length && incoming.fields.mediaRefs.length) {
      // Version1 references are accepted only if the normal card ownership check
      // resolves them; cross-database/foreign-card IDs can never be guessed.
      validateDraftMedia(ctx, state.scope, incoming.fields);
    }
    const epoch = ctx.db.prepare("SELECT epoch FROM protocol_meta WHERE singleton=1").get()!.epoch;
    const token = sha(canonical({ expectation: state.p, current: state.fields, epoch, clipboardHash: sha(text) }));
    return { state, incoming, preview: ClipboardPreview.parse({
      token, fields: incoming.fields, overwrites: p.overwrites, switchRequired: p.switchRequired,
      imageCount: incoming.images.length,
      warnings: incoming.images.length ? ["确认后仅复制正文和图片；为目标重新建立资源与放置身份，不复制历史或知识关联。"] : [],
    }) };
  }
  async function copy(input: unknown) {
      const { scope, fields } = current(DraftExpectation.parse(input));
      validateDraftMedia(ctx, scope, fields);
      if (!fields.mediaRefs.length) { await port.writeText(copyCardContent(fields)); return true; }
      let total = 0;
      const images = [...new Map(fields.mediaRefs.map(r => [r.assetId, r])).values()].map(ref => {
        const bytes = readFileSync(join(ctx.dataDir, "attachments", ref.fileName));
        total += bytes.length;
        if (total > byteBudget) throw new ProtocolError("CLIPBOARD_TOO_LARGE", "图片总量超过30MB");
        return { assetId: ref.assetId, mime: ref.mime, base64: bytes.toString("base64") };
      });
      const text = marker + JSON.stringify(Archive.parse({ format: "ganksoft.card-clipboard", version: 2, fields, images }));
      decode(text); // Export and import enforce exactly the same completeness checks.
      await port.writeText(text);
      return true;
  }
  const handlers: Handlers = {
    "card.clipboard.apply": input => {
      if (incomingText === undefined) throw new ProtocolError("ASYNC_COORDINATOR_REQUIRED", "请通过异步剪贴板协调器确认内容");
      const text = incomingText;
      incomingText = undefined;
      const p = ClipboardApply.parse(input);
      const { state, incoming, preview: checked } = preview({ cardId: p.cardId, deckId: p.deckId,
        expectedPublishedRevision: p.expectedPublishedRevision, expectedDraftRevision: p.expectedDraftRevision }, text);
      if (checked.token !== p.previewToken) throw new ProtocolError("PREVIEW_EXPIRED", "剪贴板或草稿已变化，请重新预览");
      if (checked.switchRequired) throw new ProtocolError("MODE_SWITCH_CONFIRM_REQUIRED", "请先确认切换类型，再粘贴");
      const fields = structuredClone(incoming.fields);
      if (incoming.images.length) {
        const staged = new Map(incoming.images.map(image => {
          const asset = stageImage(ctx, p.deckId, "question", image.bytes, image.mime,
            fileName => createdFiles.push(join(ctx.dataDir, "attachments", fileName)));
          const fileName = asset.id + (asset.mime === "image/jpeg" ? ".jpg" : asset.mime === "image/webp" ? ".webp" : ".png");
          return [image.assetId, { asset, fileName }] as const;
        }));
        const placements = new Map(fields.mediaRefs.map(ref => {
          const target = staged.get(ref.assetId)!;
          return [ref.placementId, { ...ref, placementId: randomUUID(), assetId: target.asset.id,
            fileName: target.fileName, role: "question" as const }];
        }));
        function remap(value: unknown): unknown {
          if (typeof value === "string") return value.replace(/gank-asset:\/\/[^\s)<>"']+/g, raw => {
            const original = parsePlacement(raw), ref = placements.get(original.placementId);
            if (!ref || ref.assetId !== staged.get(original.assetId)?.asset.id || ref.width !== original.width)
              throw new ProtocolError("MEDIA_REFERENCE_INVALID", "图片放置与资源不一致");
            return placementUrl({ assetId: ref.assetId, placementId: ref.placementId, width: original.width });
          });
          if (Array.isArray(value)) return value.map(remap);
          if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remap(v)]));
          return value;
        }
        fields.payload = DraftFields.shape.payload.parse(remap(fields.payload));
        fields.mediaRefs = [...placements.values()];
      }
      return saveWorkspaceDraft(ctx, { ...state.p, fields });
    },
  };
  return {
    handlers,
    copy,
    async preview(input: unknown) { return preview(DraftExpectation.parse(input), await port.readText()).preview; },
    async readPaste() { return port.readText(); },
    execute(action: () => Response, text?: string): Response {
      createdFiles = [];
      incomingText = text;
      try {
      const result = action();
      // Host owns the full SQL transaction, including output/receipt validation.
      // Remove only this call's newly created UUID files after a definitive rollback.
      // Unknown commits retain resources for recovery rather than deleting live media.
      if (!result.ok && result.error.outcome !== "unknown")
        for (const path of createdFiles) rmSync(path, { force: true });
      return result;
      } finally {
        createdFiles = [];
        incomingText = undefined;
      }
    },
  };
}
