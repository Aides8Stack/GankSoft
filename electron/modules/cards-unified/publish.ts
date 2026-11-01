import { publicationFeedback } from '../../../shared/cards/publication-feedback.ts';
import { replaceCardLinks } from '../knowledge-unified/links.ts';
import { randomUUID } from "node:crypto";
import { newDraftPrefix } from "./new-drafts.ts";
import type { z } from "zod";
import {
  DraftFields,
  PublishInput,
  PublishResult,
  publicationIssues,
} from "../../../shared/protocol/card-draft.ts";
import {
  ContentPayload,
  ContentVersion,
} from "../../../shared/protocol/unified.ts";
import { ProtocolError } from "../../../shared/protocol/data.ts";
import { transaction } from "../../infrastructure/database.ts";
import type { Context } from "../../infrastructure/context.ts";
import {
  draftCard,
  readWorkspaceDraft,
  validateDraftMedia,
} from "./draft-service.ts";

/** One atomic owner: a frozen version, current mode, optional links/cycle, draft removal and outer protocol receipt. */
export function publishDraft(
  ctx: Context,
  input: z.infer<typeof PublishInput>,
) {
  const p = PublishInput.parse(input),
    scope = { cardId: p.cardId, deckId: p.deckId };
  return transaction(ctx.db, () => {
    const c = draftCard(ctx, scope, true),
      stored = readWorkspaceDraft(ctx, scope);
    if (c.revision !== p.expectedPublishedRevision)
      throw new ProtocolError("CONTENT_VERSION_CONFLICT", "正式内容已变化");
    if ((stored?.revision ?? null) !== p.expectedDraftRevision)
      throw new ProtocolError(
        "DRAFT_REVISION_CONFLICT",
        "草稿已变化，请重新确认发布",
      );
    if (stored && stored.basePublishedRevision !== c.revision)
      throw new ProtocolError("CONTENT_VERSION_CONFLICT", "草稿基于旧正式内容");
    // Inline snapshot is the publication source; no temporary draft is written.
    const draft = p.fields ?? (stored ? DraftFields.parse({title:stored.title,payload:stored.payload,mediaRefs:stored.mediaRefs}) : null);
    if (!draft) throw new ProtocolError("PUBLISH_INCOMPLETE", "请填写卡片内容");
    const issues = publicationIssues(draft.payload);
    if (!draft.title.trim() || issues.length)
      throw new ProtocolError(
        "PUBLISH_INCOMPLETE",
        publicationFeedback([...(!draft.title.trim() ? ["title"] : []), ...issues]),
      );
    const payload = ContentPayload.parse(draft.payload);
    validateDraftMedia(ctx, scope, draft);
    if (p.knowledgeIds) {
      if (new Set(p.knowledgeIds).size !== p.knowledgeIds.length)
        throw new ProtocolError("INVALID_KNOWLEDGE_SCOPE", "知识点关联重复");
      for (const id of p.knowledgeIds)
        if (
          !ctx.db
            .prepare(
              "SELECT 1 FROM knowledge WHERE id=? AND module=? AND deleted_at IS NULL",
            )
            .get(id, p.deckId)
        )
          throw new ProtocolError(
            "INVALID_KNOWLEDGE_SCOPE",
            "知识点不属于当前卡片集",
          );

    }
    const now = ctx.now().toISOString(),
      versionId = randomUUID(),
      cycleId = p.resetStudyCycle || c.unpublished ? randomUUID() : String(c.current_cycle_id);
    const document = ContentVersion.parse({
      versionId,
      cardId: p.cardId,
      mode: payload.mode,
      title: draft.title,
      availability: "known",
      payload,
      mediaRefs: draft.mediaRefs,
      publishedAt: now,
      source: {
        schema: 606,
        kind: "published",
        key: p.cardId,
        ordinal: null,
        wireToken: null,
        rawJson: null,
      },
    });
    if (c.unpublished) {
      ctx.db.prepare("INSERT INTO learning_cards VALUES(?,?,?,?,?,?,1,NULL,NULL)")
        .run(p.cardId, p.deckId, draft.title, payload.mode, versionId, cycleId);
      // The existing606 token denotes an explicitly opened cycle. The initial
      // publication audit distinguishes it from the unchecked relearn choice.
      ctx.db.prepare("INSERT INTO learning_study_cycles VALUES(?,?,?,'explicit-relearn',NULL)")
        .run(cycleId, p.cardId, now);
      ctx.db.prepare("INSERT INTO audits(action,detail,created_at) VALUES(?,?,?)")
        .run("首次发布卡片", JSON.stringify({ reason: "initial-publication", cardId: p.cardId, resetStudyCycle: p.resetStudyCycle }), now);
    }
    ctx.db
      .prepare("INSERT INTO learning_content_versions VALUES(?,?,?,?)")
      .run(versionId, p.cardId, payload.mode, JSON.stringify(document));
    ctx.db
      .prepare(
        "INSERT INTO learning_published_modes VALUES(?,?,?) ON CONFLICT(card_id,mode) DO UPDATE SET version_id=excluded.version_id",
      )
      .run(p.cardId, payload.mode, versionId);
    if (p.resetStudyCycle && !c.unpublished) {
      ctx.db
        .prepare(
          "INSERT INTO learning_study_cycles VALUES(?,?,?,'explicit-relearn',NULL)",
        )
        .run(cycleId, p.cardId, now);
      if (c.legacy_kind) {
        ctx.db
          .prepare("DELETE FROM scheduling WHERE kind=? AND card_id=?")
          .run(c.legacy_kind, p.cardId);
        const table = c.legacy_kind === "question" ? "plans" : "memory_plans",
          key = c.legacy_kind === "question" ? "question_id" : "card_id";
        ctx.db
          .prepare(
            `UPDATE ${table} SET due_at=?,interval_days=0,mastery=NULL,reason=? WHERE ${key}=?`,
          )
          .run(now, "用户选择重新开始学习", p.cardId);
      }
    }
    if (!c.unpublished) ctx.db
      .prepare(
        "UPDATE learning_cards SET title=?,published_type=?,current_version_id=?,current_cycle_id=?,revision=revision+1 WHERE id=?",
      )
      .run(draft.title, payload.mode, versionId, cycleId, p.cardId);
    if(p.knowledgeIds) replaceCardLinks(ctx,{...scope,nodeIds:p.knowledgeIds},c.legacy_kind);
    if (c.unpublished) ctx.db.prepare("DELETE FROM settings WHERE key=?").run(newDraftPrefix + p.cardId);
    else ctx.db
      .prepare("DELETE FROM learning_card_drafts WHERE card_id=?")
      .run(p.cardId);
    return PublishResult.parse({
      cardId: p.cardId,
      versionId,
      publishedType: payload.mode,
      revision: Number(c.revision) + 1,
      cycleId,
      resetStudyCycle: p.resetStudyCycle,
    });
  });
}
