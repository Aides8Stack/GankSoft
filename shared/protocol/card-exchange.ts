import { z } from "zod";
import { Id, Name, Revision } from "./data.ts";
import { BatchCards } from "./card-lifecycle.ts";
export const ExportCards = BatchCards.options[0].omit({ action: true }).extend({expectedDataRevision:Revision.optional()});
export const ExchangeToken = z.strictObject({ token: z.uuid() });
const Counts = {
  count: Revision.max(500),
  modes: z.strictObject({ question: Revision, qa: Revision, direct: Revision }),
  knowledgeCount: Revision.max(5000),
  bytes: Revision,
  warnings: z.array(z.string()).max(10),
};
export const CardExportPreview = ExchangeToken.extend(Counts);
export const CardImportPreview = CardExportPreview.extend({
  name: Name,
  previouslyImported: z.boolean(),
});
export const ImportCards = ExchangeToken.extend({
  name: Name,
  parentId: Id.nullable().default(null),
  allowDuplicate: z.boolean().default(false),
});
export const ImportedCards = z.strictObject({
  deckId: Id,
  count: Revision.max(500),
  skipped: z.boolean(),
});
export const ExchangeSaved = z.strictObject({
  saved: z.boolean(),
  name: z.string().nullable(),
});
