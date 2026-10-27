import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { DraftCreateInput, DraftListInput, DraftListPage, StoredNewDraft, WorkspaceDraft, type WorkspaceDraftDTO } from "../../../shared/protocol/card-draft.ts";
import { ProtocolError } from "../../../shared/protocol/data.ts";
import type { Context } from "../../infrastructure/context.ts";
import { guardDatabaseAccess } from "../../infrastructure/write-owner.ts";
import { transaction } from "../../infrastructure/database.ts";

export const newDraftPrefix = "new-card-draft:";
export function requireDraftModel(ctx: Context) {
  guardDatabaseAccess(ctx.db);
  if (Number(ctx.db.prepare("PRAGMA user_version").get()?.user_version) !== 606)
    throw new ProtocolError("MIGRATION_NOT_ACTIVATED", "新卡草稿仅用于已验证的隔离统一模型");
}
export function readNewDraft(ctx: Context, cardId: string) {
  const row = ctx.db.prepare("SELECT value FROM settings WHERE key=?").get(newDraftPrefix + cardId);
  if (!row) return null;
  const value = StoredNewDraft.parse(JSON.parse(String(row.value)));
  if (value.document.cardId !== cardId) throw new ProtocolError("DRAFT_STORAGE_INVALID", "新卡草稿身份不一致");
  return value;
}
export function writeNewDraft(ctx: Context, deckId: string, document: WorkspaceDraftDTO) {
  const value = StoredNewDraft.parse({ encoding: "ganksoft.new-card-draft/1", deckId, document });
  ctx.db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .run(newDraftPrefix + document.cardId, JSON.stringify(value));
  return document;
}
export function createNewDraft(ctx: Context, input: z.infer<typeof DraftCreateInput>) {
  requireDraftModel(ctx);
  const p = DraftCreateInput.parse(input);
  return transaction(ctx.db, () => {
    if (!ctx.db.prepare("SELECT 1 FROM decks WHERE id=? AND deleted_at IS NULL").get(p.deckId))
      throw new ProtocolError("DECK_CONFLICT", "卡片集不存在或已删除");
    const mode = p.initialType;
    const payload = mode === "question" ? { encoding: "question-v1", mode, fields: {
      stem: "", material: "", analysis: "", source: "", initialThought: "", options: [], correctOptionId: null,
    } } : mode === "qa" ? { encoding: "qa-v1", mode, fields: { front: "", back: "", supplement: "", source: "" } }
      : { encoding: "direct-v1", mode, fields: { body: "", source: "" } };
    const document = WorkspaceDraft.parse({ cardId: randomUUID(), draftType: mode, title: "", payload, mediaRefs: [],
      origin: { versionId: null, mode, strategy: "unpublished", mappingVersion: "six-way/1" },
      revision: 1, basePublishedRevision: 0, updatedAt: ctx.now().toISOString() });
    return writeNewDraft(ctx, p.deckId, document);
  });
}
/** Draft inbox reads only metadata, never full content or image bytes. */
export function listDraftSummaries(ctx: Context, input: z.infer<typeof DraftListInput>) {
  requireDraftModel(ctx);
  const p=DraftListInput.parse(input);
  if (!ctx.db.prepare("SELECT 1 FROM decks WHERE id=? AND deleted_at IS NULL").get(p.deckId))
    throw new ProtocolError("DECK_CONFLICT", "卡片集不存在或已删除");
  const rows=ctx.db.prepare(`SELECT * FROM (
    SELECT json_extract(value,'$.document.cardId') AS cardId,json_extract(value,'$.document.title') AS title,
      json_extract(value,'$.document.draftType') AS draftType,json_extract(value,'$.document.revision') AS revision,
      0 AS publishedRevision,json_extract(value,'$.document.updatedAt') AS updatedAt,1 AS isNew
      FROM settings WHERE key LIKE 'new-card-draft:%' AND json_extract(value,'$.deckId')=?
    UNION ALL SELECT d.card_id AS cardId,CASE WHEN json_extract(d.payload,'$.encoding')='ganksoft.card-draft/1'
      THEN json_extract(d.payload,'$.document.title') ELSE c.title END AS title,d.mode AS draftType,d.revision,
      d.base_published_revision AS publishedRevision,d.updated_at AS updatedAt,0 AS isNew
      FROM learning_card_drafts d JOIN learning_cards c ON c.id=d.card_id WHERE c.deck_id=? AND c.deleted_at IS NULL
    ) WHERE cardId>? ORDER BY cardId LIMIT ?`).all(p.deckId,p.deckId,p.after??"",p.limit+1);
  const more=rows.length>p.limit;if(more)rows.pop();
  return DraftListPage.parse({items:rows.map(r=>({...r,isNew:!!r.isNew})),nextCursor:more?rows.at(-1)!.cardId:null});
}
