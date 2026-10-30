import { z } from "zod";
import { Id } from "./data.ts";
import { DraftExpectation, DraftFields } from "./card-draft.ts";
export const PromptOptions = z.strictObject({
  includeDeckKnowledgeCatalog: z.boolean().default(false),
  includeConfirmedKnowledgePaths: z.boolean().default(false),
});
const Path = z.strictObject({
  nodeId: Id,
  deckId: Id,
  path: z.array(z.string().max(300)).min(1).max(100),
});
export const PromptContext = z.strictObject({
  deckId: Id,
  catalog: z.array(Path).max(10000),
  confirmed: z.array(Path).max(500),
});
export const ClipboardPreview = z.strictObject({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  fields: DraftFields,
  overwrites: z.array(z.string()),
  switchRequired: z.boolean(),
  imageCount: z.number().int().min(0).max(200),
  warnings: z.array(z.string()),
});
export const ClipboardExpectation = DraftExpectation.extend({fields:DraftFields.optional()});
export const ClipboardApply = ClipboardExpectation.extend({
  previewToken: z.string().regex(/^[a-f0-9]{64}$/),
  confirmOverwrite: z.literal(true),
});
