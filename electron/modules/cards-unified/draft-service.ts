import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import { ProtocolError } from "../../../shared/protocol/data.ts";
import { CardDraft, ContentVersion } from "../../../shared/protocol/unified.ts";
import {
  DraftScope,
  DraftExpectation,
  DraftSaveInput,
  DraftPreviewInput,
  DraftPreview,
  DraftSwitchInput,
  StoredDraft,
  WorkspaceDraft,
  type WorkspaceDraftDTO,
} from "../../../shared/protocol/card-draft.ts";
import { mapPublishedContent } from "../../../shared/cards/mapping.ts";
import { canonical } from "../../../shared/protocol/host.ts";
import { parsePlacement } from "../../../shared/editor/document.ts";
import type { Context } from "../../infrastructure/context.ts";
import { transaction } from "../../infrastructure/database.ts";
import { guardDatabaseAccess } from "../../infrastructure/write-owner.ts";
import { validateImage } from "../../infrastructure/images.ts";

export function draftCard(ctx: Context, p: z.infer<typeof DraftScope>) {
  guardDatabaseAccess(ctx.db);
  if (Number(ctx.db.prepare("PRAGMA user_version").get()?.user_version) !== 606)
    throw new ProtocolError(
      "MIGRATION_NOT_ACTIVATED",
      "新草稿服务仅用于已验证的隔离统一模型",
    );
  const c = ctx.db
    .prepare(
      `SELECT c.* FROM learning_cards c JOIN decks d ON d.id=c.deck_id
    WHERE c.id=? AND c.deck_id=? AND c.deleted_at IS NULL AND d.deleted_at IS NULL`,
    )
    .get(p.cardId, p.deckId);
  if (!c)
    throw new ProtocolError("DECK_CONFLICT", "卡片不属于当前卡片集或已删除");
  return c;
}
export function readWorkspaceDraft(
  ctx: Context,
  input: z.infer<typeof DraftScope>,
): WorkspaceDraftDTO | null {
  const p = DraftScope.parse(input),
    c = draftCard(ctx, p);
  const r = ctx.db
    .prepare("SELECT * FROM learning_card_drafts WHERE card_id=?")
    .get(p.cardId);
  if (!r) return null;
  const raw = JSON.parse(String(r.payload));
  if (raw.encoding === "ganksoft.card-draft/1") {
    const d = StoredDraft.parse(raw).document;
    if (
      d.cardId !== r.card_id ||
      d.draftType !== r.mode ||
      d.revision !== r.revision ||
      d.basePublishedRevision !== r.base_published_revision ||
      d.updatedAt !== r.updated_at
    )
      throw new ProtocolError(
        "DRAFT_STORAGE_INVALID",
        "草稿封套与存储身份不一致",
      );
    return d;
  }
  // S1 bare drafts remain readable; no write or automatic migration on get.
  const d = CardDraft.parse({
    cardId: r.card_id,
    draftType: r.mode,
    payload: raw,
    revision: r.revision,
    basePublishedRevision: r.base_published_revision,
    updatedAt: r.updated_at,
  });
  const current = version(ctx, String(c.current_version_id), p.cardId);
  return WorkspaceDraft.parse({
    ...d,
    title: c.title,
    mediaRefs: [],
    origin: {
      versionId: current.versionId,
      mode: current.mode,
      strategy: "first-mapping",
      mappingVersion: "six-way/1",
    },
  });
}
function version(ctx: Context, id: string, cardId: string) {
  const row = ctx.db
    .prepare(
      "SELECT document FROM learning_content_versions WHERE id=? AND card_id=?",
    )
    .get(id, cardId);
  if (!row)
    throw new ProtocolError("CONTENT_VERSION_NOT_FOUND", "内容版本不存在");
  return ContentVersion.parse(JSON.parse(String(row.document)));
}
function check(ctx: Context, p: z.infer<typeof DraftExpectation>) {
  const c = draftCard(ctx, p),
    d = readWorkspaceDraft(ctx, { cardId: p.cardId, deckId: p.deckId });
  if (c.revision !== p.expectedPublishedRevision)
    throw new ProtocolError(
      "CONTENT_VERSION_CONFLICT",
      "正式内容已变化，请保留本地草稿并重新载入",
    );
  if ((d?.revision ?? null) !== p.expectedDraftRevision)
    throw new ProtocolError(
      "DRAFT_REVISION_CONFLICT",
      "草稿已被其他窗口修改，请保留本地内容",
    );
  if (d && d.basePublishedRevision !== c.revision)
    throw new ProtocolError(
      "CONTENT_VERSION_CONFLICT",
      "草稿基于旧正式版本，需人工处理",
    );
  return { c, d };
}
export function previewDraftSwitch(
  ctx: Context,
  input: z.infer<typeof DraftPreviewInput>,
) {
  const p = DraftPreviewInput.parse(input),
    c = draftCard(ctx, p),
    d = readWorkspaceDraft(ctx, { cardId: p.cardId, deckId: p.deckId });
  const target = ctx.db
    .prepare(
      "SELECT version_id FROM learning_published_modes WHERE card_id=? AND mode=?",
    )
    .get(p.cardId, p.targetType);
  const source = version(
    ctx,
    String(target?.version_id ?? c.current_version_id),
    p.cardId,
  );
  const suggestion = mapPublishedContent(source, p.targetType, !!target);
  if (d)
    suggestion.warnings.push(
      "确认后将清除当前未发布草稿；取消不会修改任何内容。",
    );
  const state = {
    ...p,
    publishedRevision: Number(c.revision),
    draftRevision: d?.revision ?? null,
    ...suggestion,
  };
  const token = createHash("sha256")
    .update(
      canonical({
        state,
        currentVersion: c.current_version_id,
        draft: d,
        epoch:
          ctx.db
            .prepare("SELECT epoch FROM protocol_meta WHERE singleton=1")
            .get()?.epoch ?? "none",
      }),
    )
    .digest("hex");
  return DraftPreview.parse({ ...state, token });
}
export function validateDraftMedia(
  ctx: Context,
  p: z.infer<typeof DraftScope>,
  d: Pick<WorkspaceDraftDTO, "payload" | "mediaRefs">,
) {
  const known = ctx.db
    .prepare("SELECT document FROM learning_content_versions WHERE card_id=?")
    .all(p.cardId)
    .flatMap(
      (r) => ContentVersion.parse(JSON.parse(String(r.document))).mediaRefs,
    );
  known.push(
    ...(readWorkspaceDraft(ctx, { cardId: p.cardId, deckId: p.deckId })
      ?.mediaRefs ?? []),
  );
  for (const ref of d.mediaRefs) {
    const owned = known.some(
      (r) =>
        r.assetId === ref.assetId &&
        r.fileName === ref.fileName &&
        r.mime === ref.mime,
    );
    const row = ctx.db
      .prepare("SELECT value FROM settings WHERE key=?")
      .get("media-draft:" + ref.assetId);
    const staged = row ? JSON.parse(String(row.value)) : null;
    if (
      !owned &&
      !(
        staged &&
        staged.id === ref.assetId &&
        staged.deckId === p.deckId &&
        staged.purpose === ref.role &&
        staged.file_name === ref.fileName &&
        staged.mime === ref.mime &&
        ["question", "analysis"].includes(ref.role)
      )
    )
      throw new ProtocolError(
        "MEDIA_SCOPE_CONFLICT",
        "图片不属于当前卡片或当前卡片集的编辑暂存资源",
      );
    validateImage(
      readFileSync(join(ctx.dataDir, "attachments", ref.fileName)),
      ref.mime,
    );
  }
  validateDraftPlacements(d);
}
/** Read-only clipboard preflight reuses the same placement invariant as saves. */
export function validateDraftPlacements(d: Pick<WorkspaceDraftDTO, "payload" | "mediaRefs">) {
  const refs = new Map(d.mediaRefs.map((r) => [r.placementId, r]));
  // Every canonical editor placement must have matching independently stored metadata.
  const placements = new Set<string>();
  function scan(value: unknown) {
    if (typeof value === "string") {
      for (const m of value.matchAll(/gank-asset:\/\/[^\s)<>"']+/g)) {
        const placement = parsePlacement(m[0]),
          ref = refs.get(placement.placementId);
        if (placements.has(placement.placementId))
          throw new ProtocolError(
            "MEDIA_REFERENCE_INVALID",
            "同一放置身份不能出现在两个位置",
          );
        placements.add(placement.placementId);
        if (
          !ref ||
          ref.assetId !== placement.assetId ||
          ref.width !== placement.width
        )
          throw new ProtocolError(
            "MEDIA_REFERENCE_INVALID",
            "正文图片与放置身份/宽度不一致",
          );
      }
    } else if (Array.isArray(value)) value.forEach(scan);
    else if (value && typeof value === "object")
      Object.values(value).forEach(scan);
  }
  scan(d.payload);
}
function write(ctx: Context, d: WorkspaceDraftDTO) {
  const encoded = StoredDraft.parse({
    encoding: "ganksoft.card-draft/1",
    mode: d.draftType,
    document: d,
  });
  ctx.db
    .prepare(
      `INSERT INTO learning_card_drafts VALUES(?,?,?,?,?,?) ON CONFLICT(card_id) DO UPDATE SET
    mode=excluded.mode,payload=excluded.payload,revision=excluded.revision,
    base_published_revision=excluded.base_published_revision,updated_at=excluded.updated_at`,
    )
    .run(
      d.cardId,
      d.draftType,
      JSON.stringify(encoded),
      d.revision,
      d.basePublishedRevision,
      d.updatedAt,
    );
  return d;
}
export function saveWorkspaceDraft(
  ctx: Context,
  input: z.infer<typeof DraftSaveInput>,
) {
  const p = DraftSaveInput.parse(input);
  return transaction(ctx.db, () => {
    const { c, d } = check(ctx, p);
    if (p.fields.payload.mode !== (d?.draftType ?? c.published_type))
      throw new ProtocolError(
        "DRAFT_MODE_CONFLICT",
        "切换类型必须先预览并明确确认",
      );
    const origin =
      d?.origin ??
      previewDraftSwitch(ctx, {
        cardId: p.cardId,
        deckId: p.deckId,
        targetType: p.fields.payload.mode,
      }).origin;
    const next = WorkspaceDraft.parse({
      ...p.fields,
      cardId: p.cardId,
      draftType: p.fields.payload.mode,
      origin,
      revision: (d?.revision ?? 0) + 1,
      basePublishedRevision: Number(c.revision),
      updatedAt: ctx.now().toISOString(),
    });
    validateDraftMedia(ctx, p, next);
    return write(ctx, next);
  });
}
export function switchWorkspaceDraft(
  ctx: Context,
  input: z.infer<typeof DraftSwitchInput>,
) {
  const p = DraftSwitchInput.parse(input);
  return transaction(ctx.db, () => {
    const { c, d } = check(ctx, p),
      preview = previewDraftSwitch(ctx, {
        cardId: p.cardId,
        deckId: p.deckId,
        targetType: p.targetType,
      });
    if (preview.token !== p.previewToken)
      throw new ProtocolError(
        "PREVIEW_EXPIRED",
        "预览内容已变化，请重新预览确认",
      );
    const next = WorkspaceDraft.parse({
      ...preview.fields,
      cardId: p.cardId,
      draftType: p.targetType,
      origin: preview.origin,
      revision: (d?.revision ?? 0) + 1,
      basePublishedRevision: Number(c.revision),
      updatedAt: ctx.now().toISOString(),
    });
    validateDraftMedia(ctx, p, next);
    return write(ctx, next);
  });
}
