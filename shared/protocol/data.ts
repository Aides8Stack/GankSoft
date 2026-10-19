import { z } from "zod";
import { ImageLayoutSchema } from "./image-node.ts";
export const ImageLayout = ImageLayoutSchema;

export const PROTOCOL = Object.freeze({ major: 2, minor: 0 });
// Portable source keys are opaque and never filesystem paths. New entity IDs are UUIDs.
export const Id = z
  .string()
  .min(1)
  .max(150)
  .regex(/^[A-Za-z0-9_:.-]+$/);
export const Revision = z.number().int().nonnegative();
export const ResponseImage = z.union([Id, z.strictObject({ id: Id, layout: ImageLayout.optional() })]);
export const Kind = z.enum(["question", "memory"]);
export const Timestamp = z.iso.datetime();
export const Text = z.string().max(200_000);
export const Name = z.string().trim().min(1).max(100);
export const Empty = z.strictObject({});
export const Ref = z.strictObject({
  cardId: Id,
  kind: Kind,
  contentVersion: z.uuid(),
});
export const IdResult = z.strictObject({ id: Id });
export const Changed = z.strictObject({ changed: z.boolean() });
export const Scope = z.strictObject({ deckId: Id });
export const PageInput = z.strictObject({
  deckId: Id,
  offset: Revision.default(0),
  limit: z.number().int().min(1).max(100).default(50),
});
export const Option = z.strictObject({
  key: z.enum(["A", "B", "C", "D"]),
  text: z.string().min(1).max(50_000),
});
export const QuestionContent = z
  .strictObject({
    title: z.string().max(300),
    stem: Text,
    material: Text.default(""),
    options: z.array(Option).length(4),
    answer: z.enum(["A", "B", "C", "D"]),
    analysis: Text,
    source: z.string().max(2000).default(""),
    knowledgeIds: z.array(Id).max(500).default([]),
  })
  .superRefine((v, ctx) => {
    if (new Set(v.options.map((o) => o.key)).size !== 4)
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "四个选项键必须各不相同",
      });
  });
export const MemoryContent = z.strictObject({
  title: Name,
  cue: Text.min(1),
  content: Text.min(1),
  source: z.string().max(2000).default(""),
  knowledgeIds: z.array(Id).max(500).default([]),
});
export const CardSummary = z.strictObject({
  cardId: Id,
  deckId: Id,
  kind: Kind,
  title: z.string(),
  contentVersion: z.uuid(),
  revision: Revision,
  dueAt: Timestamp.nullable(),
  paused: z.boolean(),
});
export const CardPage = z.strictObject({
  items: z.array(CardSummary).max(100),
  total: Revision,
  nextOffset: Revision.nullable(),
  dataRevision: Revision,
});
export const Schedule = z.strictObject({
  rating: z.enum(["again", "hard", "good", "easy"]),
  dueAt: Timestamp,
  intervalDays: z.number().finite().nonnegative(),
  algorithm: z.string().min(1),
});
export const ReviewResult = z.strictObject({
  recordId: Id,
  effective: z.boolean(),
  reason: z.string(),
  schedule: Schedule.nullable(),
  assessmentVersion: z.string().nullable(),
});
export const QuestionAnswer = z.strictObject({
  kind: z.literal("question"),
  cardId: Id,
  contentVersion: z.uuid(),
  deckId: Id,
  sessionId: Id.optional(),
  expectedSessionRevision: Revision.optional(),
  answer: z.enum(["A", "B", "C", "D"]),
  thought: Text.min(1),
  responseImages: z.array(ResponseImage).max(20).default([]),
  basis: z.enum(["independent", "guess", "remember", "hint"]),
  understanding: z.number().int().min(0).max(3),
  selfScore: z
    .number()
    .min(0)
    .max(10)
    .refine((v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-8),
  elapsedSeconds: z.number().finite().min(0).max(86400).nullable(),
  reflection: Text.default(""),
  faults: z.array(z.string().max(200)).max(100).default([]),
  knowledgeIds: z.array(Id).max(500).default([]),
  faultDetail: Text.default(""),
  practice: z.boolean().default(false),
});
export const MemoryAnswer = z.strictObject({
  kind: z.literal("memory"),
  cardId: Id,
  contentVersion: z.uuid(),
  deckId: Id,
  sessionId: Id.optional(),
  expectedSessionRevision: Revision.optional(),
  rating: z.enum(["again", "hard", "good", "easy"]),
  note: Text.default(""),
  practice: z.boolean().default(false),
});
export const ReviewInput = z
  .discriminatedUnion("kind", [QuestionAnswer, MemoryAnswer])
  .superRefine((v, c) => {
    if (v.sessionId !== undefined && v.expectedSessionRevision === undefined)
      c.addIssue({
        code: "custom",
        path: ["expectedSessionRevision"],
        message: "会话提交必须携带修订号",
      });
  });
export const Draft = z
  .strictObject({
    sessionId: Id,
    queueSnapshot: z.strictObject({ruleVersion:z.string(),configRevision:Revision,dataRevision:z.string(),seed:z.string(),calculatedAt:Timestamp}).optional(),
    entryId: Id,
    ids: z.array(Id).max(5000),
    index: Revision,
    stage: z.enum(["answer", "reveal", "result"]),
    contentVersion: z.uuid(),
    answer: z.string().max(10).default(""),
    thought: Text.default(""),
    responseImages: z.array(ResponseImage).max(20).default([]),
    basis: z
      .enum(["independent", "guess", "remember", "hint"])
      .default("independent"),
    understanding: z.number().int().min(0).max(3).default(2),
    selfScore: z.number().min(0).max(10).nullable().optional(),
    reflection: Text.default(""),
    faults: z.array(z.string().max(200)).max(100).default([]),
    knowledgeIds: z.array(Id).max(500).default([]),
    faultDetail: Text.default(""),
    note: Text.default(""),
    elapsedSeconds: z.number().int().min(0).max(86400).default(0),
    totalSeconds: z.number().int().min(0).max(31536000).default(0),
    timerPaused: z.boolean().default(true),
    pageTitle: z.string().max(500).default(""),
    pageDetail: z.string().max(4000).default(""),
    practice: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (new Set(v.ids).size !== v.ids.length || v.index > v.ids.length)
      ctx.addIssue({ code: "custom", message: "队列重复或游标越界" });
  });
export const Record = z.strictObject({
  recordId: Id,
  cardId: Id,
  kind: Kind,
  contentVersion: z.uuid(),
  createdAt: Timestamp,
  effective: z.boolean(),
  answer: z.string(),
  selfScore: z.number().nullable(),
  elapsedSeconds: z.number().nonnegative().nullable(),
  thought: z.string(),
  reflection: z.string(),
});
export const RecordPage = z.strictObject({
  items: z.array(Record).max(100),
  total: Revision,
  nextOffset: Revision.nullable(),
  dataRevision: Revision,
});

export class ProtocolError extends Error {
  code: string;
  outcome: "rejected" | "unknown";
  retryable: boolean;
  fieldErrors: { path: string; message: string }[];
  constructor(
    code: string,
    message: string,
    outcome: "rejected" | "unknown" = "rejected",
    retryable = false,
    fieldErrors: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.code = code;
    this.outcome = outcome;
    this.retryable = retryable;
    this.fieldErrors = fieldErrors;
  }
}
/** Validate the transport value before Schema parsing or JSON serialization. */
export function assertWireValue(value: unknown): void {
  const active = new WeakSet<object>();
  let nodes = 0,
    bytes = 0;
  function visit(v: unknown, depth: number): void {
    if (++nodes > 100_000 || depth > 24)
      throw new ProtocolError("RESOURCE_LIMIT", "数据结构超限");
    if (typeof v === "string") bytes += v.length * 3;
    else if (typeof v === "number") {
      if (!Number.isFinite(v))
        throw new ProtocolError("INVALID_DATA", "数值必须有限");
      bytes += 24;
    } else if (v === null || typeof v === "boolean") bytes += 5;
    else if (typeof v === "object") {
      if (active.has(v))
        throw new ProtocolError("INVALID_DATA", "数据不能循环引用");
      if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype)
        throw new ProtocolError("INVALID_DATA", "只能发送普通JSON对象");
      active.add(v);
      if (Array.isArray(v)) for (const item of v) visit(item, depth + 1);
      else
        for (const [key, item] of Object.entries(v)) {
          if (["__proto__", "prototype", "constructor"].includes(key))
            throw new ProtocolError("INVALID_DATA", "不允许保留属性名");
          bytes += key.length * 3;
          visit(item, depth + 1);
        }
      active.delete(v);
    } else
      throw new ProtocolError(
        "INVALID_DATA",
        "只能发送JSON值，不能使用undefined",
      );
    if (bytes > 2_000_000)
      throw new ProtocolError("RESOURCE_LIMIT", "单次调用数据超过2MB预算");
  }
  visit(value, 0);
}
