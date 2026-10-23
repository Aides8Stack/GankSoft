import { z } from "zod";
import { Id, Revision, Text, Timestamp } from "./data.ts";
import { CardMode, ContentPayload, MediaReference } from "./unified.ts";

const Option = z.strictObject({
  optionId: Id,
  position: Revision,
  markdown: Text,
});
const QuestionDraft = z
  .strictObject({
    encoding: z.literal("question-v1"),
    mode: z.literal("question"),
    fields: z.strictObject({
      stem: Text,
      material: Text,
      analysis: Text,
      source: Text,
      initialThought: Text.default(""),
      options: z.array(Option).max(100),
      correctOptionId: Id.nullable(),
    }),
  })
  .superRefine((p, c) => {
    const { options, correctOptionId } = p.fields;
    if (
      new Set(options.map((o) => o.optionId)).size !== options.length ||
      new Set(options.map((o) => o.position)).size !== options.length ||
      (correctOptionId !== null &&
        !options.some((o) => o.optionId === correctOptionId))
    )
      c.addIssue({
        code: "custom",
        message: "选项身份/顺序重复或正确选项已不存在",
      });
  });
// An incomplete draft can be durable. Publication still uses ContentPayload and required-field validation.
export const DraftPayload = z.union([QuestionDraft, ContentPayload]);
export type DraftPayloadDTO = z.infer<typeof DraftPayload>;
export const DraftOrigin = z.strictObject({
  versionId: Id,
  mode: CardMode,
  strategy: z.enum(["published-target", "first-mapping"]),
  mappingVersion: z.literal("six-way/1"),
});
export const DraftFields = z
  .strictObject({
    title: z.string().max(300),
    payload: DraftPayload,
    mediaRefs: z.array(MediaReference).max(200),
  })
  .superRefine((v, c) => {
    if (
      new Set(v.mediaRefs.map((r) => r.placementId)).size !== v.mediaRefs.length
    )
      c.addIssue({ code: "custom", message: "图片放置身份重复" });
  });
export const WorkspaceDraft = z
  .strictObject({
    cardId: Id,
    draftType: CardMode,
    title: z.string().max(300),
    payload: DraftPayload,
    mediaRefs: z.array(MediaReference).max(200),
    origin: DraftOrigin,
    revision: Revision.min(1),
    basePublishedRevision: Revision.min(1),
    updatedAt: Timestamp,
  })
  .superRefine((v, c) => {
    const fields = DraftFields.safeParse({
      title: v.title,
      payload: v.payload,
      mediaRefs: v.mediaRefs,
    });
    if (v.payload.mode !== v.draftType || !fields.success)
      c.addIssue({ code: "custom", message: "草稿模式或媒体身份不一致" });
  });
export type WorkspaceDraftDTO = z.infer<typeof WorkspaceDraft>;
// Keeps the existing six-column 606 table and its mode CHECK. The explicit envelope
// distinguishes S3 metadata from the S1 bare-payload primitive without guessing.
export const StoredDraft = z
  .strictObject({
    encoding: z.literal("ganksoft.card-draft/1"),
    mode: CardMode,
    document: WorkspaceDraft,
  })
  .superRefine((v, c) => {
    if (v.mode !== v.document.draftType)
      c.addIssue({ code: "custom", message: "草稿封套模式不一致" });
  });
export const DraftScope = z.strictObject({ cardId: Id, deckId: Id });
export const DraftExpectation = DraftScope.extend({
  expectedPublishedRevision: Revision.min(1),
  expectedDraftRevision: Revision.min(1).nullable(),
});
export const DraftSaveInput = DraftExpectation.extend({ fields: DraftFields });
export const DraftPreviewInput = DraftScope.extend({ targetType: CardMode });
export const DraftPreview = z.strictObject({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  cardId: Id,
  deckId: Id,
  targetType: CardMode,
  publishedRevision: Revision.min(1),
  draftRevision: Revision.min(1).nullable(),
  fields: DraftFields,
  origin: DraftOrigin,
  requiredFields: z.array(z.string()),
  warnings: z.array(z.string()),
});
export const DraftSwitchInput = DraftExpectation.extend({
  targetType: CardMode,
  previewToken: z.string().regex(/^[a-f0-9]{64}$/),
  confirmDiscard: z.literal(true),
});
export function publicationIssues(payload: DraftPayloadDTO): string[] {
  if (payload.encoding === "legacy-question-604")
    return ["legacyOptions:explicit-conversion-required"];
  const f = payload.fields;
  if (payload.mode === "question") {
    const q = payload.fields;
    return [
      ...(!q.stem.trim() ? ["stem"] : []),
      ...(q.options.length < 2 ? ["options"] : []),
      ...(!q.correctOptionId ? ["correctOptionId"] : []),
      ...(q.options.some((o) => !o.markdown.trim()) ? ["optionText"] : []),
    ];
  }
  if (payload.mode === "qa")
    return [
      ...(!payload.fields.front.trim() ? ["front"] : []),
      ...(!payload.fields.back.trim() ? ["back"] : []),
    ];
  return !("body" in f) || !f.body.trim() ? ["body"] : [];
}
