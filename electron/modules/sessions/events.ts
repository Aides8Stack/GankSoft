import { contentOrdinal } from "../../../shared/protocol/identity.ts";
import type { Context } from "../../infrastructure/context.ts";
import { saveSession } from "./service.ts";
import { ProtocolError } from "../../../shared/protocol/data.ts";
import type { ParsedInput } from "../../../shared/protocol/registry.ts";
export function sessionEvent(
  ctx: Context,
  event: "draft" | "reveal" | "advance" | "restart" | "skip",
  p: ParsedInput<"session.draft">,
  _requestId: string,
) {
  const row = ctx.db
    .prepare(
      "SELECT payload,revision FROM study_sessions WHERE deck_id=? AND json_extract(payload,'$.sessionId')=?",
    )
    .get(p.deckId, p.draft.sessionId);
  const before = row ? JSON.parse(String(row.payload)) : null;
  if (row && row.revision !== p.expectedRevision)
    throw new ProtocolError("REVISION_CONFLICT", "会话已变化");
  const draft = p.draft;
  if (
    event === "draft" &&
    before &&
    before.entryId === draft.entryId &&
    before.stage !== draft.stage
  )
    throw new ProtocolError("INVALID_STUDY_STATE", "草稿保存不能改变学习阶段");
  if (
    event === "reveal" &&
    (!before || before.stage !== "answer" || before.entryId !== draft.entryId)
  )
    throw new ProtocolError("INVALID_STUDY_STATE", "仅作答阶段可揭示");
  const stage =
    event === "reveal"
      ? "reveal"
      : event === "advance" || event === "restart" || event === "skip"
        ? "answer"
        : (before?.stage ?? "answer");
  return saveSession(ctx, {
    deck_id: p.deckId,
    expected_revision: p.expectedRevision,
    replace: p.replace,
    restart: event === "restart",
    skip: event === "skip",
    payload: {
      schemaVersion: 1,
      sessionId: draft.sessionId,
      ...(draft.queueSnapshot?{queueSnapshot:draft.queueSnapshot}:{}),
      entryId: draft.entryId,
      ids: draft.ids,
      index: draft.index,
      stage,
      contentVersion: contentOrdinal(
        draft.contentVersion,
        draft.ids[Math.min(draft.index, draft.ids.length - 1)],
      ),
      answer: draft.answer,
      thought: draft.thought,
      responseImages: draft.responseImages,
      basis: draft.basis,
      understanding: draft.understanding,
      selfScore: draft.selfScore ?? null,
      improvement: draft.reflection,
      faults: draft.faults,
      errorIds: draft.knowledgeIds,
      faultDetail: draft.faultDetail,
      note: draft.note,
      seconds: draft.elapsedSeconds,
      totalSeconds: draft.totalSeconds,
      timerPaused: draft.timerPaused,
      pageTitle: draft.pageTitle,
      pageDetail: draft.pageDetail,
      practice: draft.practice,
      skippedCount: draft.skippedCount,
    },
  });
}
