import { z } from "zod";
import { Id, Revision } from "./data.ts";
export const ACTION_FORMAT = "ganksoft.ai-schedule-actions/1" as const;
export const Source = z.strictObject({
  exportId: z.uuid(),
  snapshotId: Id,
  deckId: Id,
  dataEpoch: Id,
  dataRevision: Revision,
});
const base = { actionId: Id, reason: z.string().min(1).max(4000) };
export const Action = z.discriminatedUnion("type", [
  z.strictObject({
    ...base,
    type: z.literal("deck.policy.retention.set"),
    deckId: Id,
    value: z.number().min(0.8).max(0.97),
  }),
  z.strictObject({
    ...base,
    type: z.literal("card.policy.max_interval.set"),
    cardId: Id,
    value: z.number().int().min(1).max(3650),
  }),
  z.strictObject({
    ...base,
    type: z.literal("knowledge.cards.max_interval.set"),
    knowledgeId: Id,
    scope: z.enum(["direct", "aggregate"]),
    value: z.number().int().min(1).max(3650),
  }),
  z.strictObject({
    ...base,
    type: z.literal("card.schedule.advance_due"),
    cardId: Id,
    dueAt: z.iso.datetime(),
  }),
]);
export const SmallPackage = z.strictObject({
  format: z.literal(ACTION_FORMAT),
  source: Source,
  actions: z.array(z.unknown()),
});
export const ActionManifest = z.strictObject({
  format: z.literal(ACTION_FORMAT),
  source: Source,
  actionCount: Revision,
  files: z.array(
    z.strictObject({
      path: z.string().regex(/^adjustments\/part-\d{4,}\.json$/),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      bytes: Revision,
      count: Revision,
    }),
  ),
});
export const Part = z.strictObject({ actions: z.array(z.unknown()) });
export const PreviewRow = z.strictObject({
  index: Revision,
  actionId: Id.nullable(),
  type: z.string(),
  target: z.string(),
  reason: z.string(),
  before: z.string(),
  after: z.string(),
  affectedCardCount: Revision,
  status: z.enum(["valid", "conflict", "rejected"]),
  rejection: z.string().nullable(),
});
export const PreviewScope = z.strictObject({
  deckId: Id,
  token: z.string().regex(/^[a-f0-9]{64}$/),
});
export const PreviewPageInput = PreviewScope.extend({
  offset: Revision.default(0),
  limit: z.number().int().min(1).max(100).default(50),
});
export const PreviewPage = z.strictObject({
  token: z.string(),
  source: Source,
  total: Revision,
  valid: Revision,
  conflict: Revision,
  rejected: Revision,
  offset: Revision,
  rows: z.array(PreviewRow),
  stale: z.boolean(),
  staleReason: z.string().nullable(),
});
export type AdjustmentSource = z.infer<typeof Source>;
export type AdjustmentRow = z.infer<typeof PreviewRow>;

// W5.2-A is read-only. A successful preflight is never permission to write.
export const PrepareSelection = PreviewScope.extend({
  source: Source,
  selection: z.discriminatedUnion("mode", [
    z.strictObject({
      mode: z.literal("explicit"),
      actionIds: z.array(Id).min(1),
    }),
    z.strictObject({
      mode: z.literal("all-valid"),
      excludedActionIds: z.array(Id),
    }),
  ]),
  confirmed: z.literal(true),
});
export const PreparedSelection = z.strictObject({
  preparationToken: z.string().regex(/^[a-f0-9]{64}$/),
  previewToken: z.string(),
  source: Source,
  selectedCount: Revision,
  targetCardCount: Revision,
  expiresAt: z.iso.datetime(),
  executable: z.boolean(),
});

const Sha = z.string().regex(/^[a-f0-9]{64}$/);
export const ApplyAdjustments = z.strictObject({
  deckId: Id,
  preparationToken: Sha,
  source: Source,
  confirmed: z.literal(true),
});
export const UndoAdjustments = z.strictObject({
  deckId: Id,
  operationId: Id,
  confirmed: z.literal(true),
});
export const AdjustmentResult = z.strictObject({
  operationId: Id,
  actionCount: Revision,
  cardCount: Revision,
  knowledgeCount: Revision,
  undone: z.boolean(),
});
export const AdjustmentLog = AdjustmentResult.extend({
  createdAt: z.iso.datetime(),
  undoneAt: z.iso.datetime().nullable(),
  types: z.array(z.string()),
  canUndo: z.boolean(),
  blockedReason: z.string().nullable(),
});
export const AdjustmentLogsInput = z.strictObject({
  deckId: Id,
  offset: Revision.default(0),
  limit: z.number().int().min(1).max(100).default(20),
});
export const AdjustmentLogs = z.strictObject({
  total: Revision,
  offset: Revision,
  rows: z.array(AdjustmentLog),
});
