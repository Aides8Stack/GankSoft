import type { DateSelectionInput } from "../shared/workspace-contracts";
import { contentIdentity } from "../shared/protocol/identity";
import { z } from "zod";
import { createClient, CallFailure } from "../shared/protocol/client";
import {
  registry,
  type Method,
  type Input,
  type Output,
} from "../shared/protocol/registry";
import {
  KnowledgeInsightCodec,
  SnapshotCodec,
  ReviewResultCodec,
  CardReviewStatsCodec,
  DeckInsightsCodec,
  CollectionStatisticsCodec,
  ExchangePackageCodec,
} from "../shared/protocol/models";
const client = createClient((request) => window.gank.protocol(request));
let ready: Promise<unknown> | null = null;
let importToken: string | undefined;
const sessionCache = new Map<
  string,
  {
    revision: number;
    payload: { stage: string; entryId: string; index: number };
  }
>();
const camel = (k: string) =>
  k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
function mapped(
  value: unknown,
  overrides: Record<string, string> = {},
): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  const rename: Record<string, string> = {
    module: "deckId",
    version: "expectedRevision",
    subject: "deckId",
    ...overrides,
  };
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [rename[k] ?? camel(k), v]),
  );
}
function input<M extends Method>(
  method: M,
  value: unknown,
  overrides: Record<string, string> = {},
): Input<M> {
  const schema = registry[method].input as z.ZodObject;
  const obj = mapped(value, overrides);
  const keys = schema.shape;
  return schema.parse(
    Object.fromEntries(
      Object.entries(obj).filter(([k]) => Object.hasOwn(keys, k)),
    ),
  ) as Input<M>;
}
async function invoke<M extends Method>(
  method: M,
  payload: Input<M>,
  id?: string,
): Promise<Output<M>> {
  if (!ready)
    ready = client.call("app.capabilities", {}).catch((e) => {
      ready = null;
      throw e;
    });
  await ready;
  try {
    return await client.send(client.prepare(method, payload, id));
  } catch (e) {
    if (e instanceof CallFailure) {
      if (e.outcome === "unknown" && registry[method].effect !== "query") {
        const original = e.request as { requestId: string; payload: never; dataEpoch: string };
        try {
          const status = await client.call("operation.status", {
            requestId: original.requestId, method, payload: original.payload,
          });
          if (status.state === "committed") {
            const response = status.response as { ok?: boolean; requestId?: string; dataEpoch?: string; data?: unknown } | null;
            if (response?.ok && response.requestId === original.requestId && response.dataEpoch === original.dataEpoch)
              return registry[method].output.parse(response.data) as Output<M>;
          }
          if (status.state === "rejected")
            Object.assign(e, { outcome: "rejected" });
        } catch {
          // A failed read cannot establish the outcome; keep the original request unknown.
        }
      }
      Object.assign(e, { definitive: e.outcome === "rejected" });
      if (e.code === "DATA_EPOCH_CHANGED") ready = null;
    }
    throw e;
  }
}
function mutation<M extends Method>(
  method: M,
  rename: Record<string, string> = {},
) {
  return (value: unknown) => invoke(method, input(method, value, rename));
}
const draftInput = (value: Record<string, unknown>) => {
  const d = mapped(value, {
    improvement: "reflection",
    errorIds: "knowledgeIds",
    seconds: "elapsedSeconds",
  });
  // Empty text values are meaningful in a draft.
  for (const k of ["answer", "thought", "basis", "note", "faultDetail"])
    if (value[k] !== undefined) d[k] = value[k];
  return d;
};
async function persistSession(raw: unknown) {
  const p = raw as {
    deck_id: string;
    expected_revision: number;
    payload: Record<string, unknown>;
    replace?: boolean;
    restart?: boolean;
    skip?: boolean;
  };
  const old = sessionCache.get(String(p.payload.sessionId)),
    d = draftInput(p.payload);
  d.contentVersion = contentIdentity(
    String(
      (d.ids as string[])[
        Math.min(Number(d.index), (d.ids as string[]).length - 1)
      ],
    ),
    Number(d.contentVersion),
  );
  const event = p.restart
    ? "restart"
    : p.skip
      ? "skip"
      : old && old.payload.entryId !== d.entryId
        ? "advance"
        : old && old.payload.stage === "answer" && d.stage === "reveal"
          ? "reveal"
          : "draft";
  const method = `session.${event}` as "session.draft";
  const payload = registry[method].input.parse({
    deckId: p.deck_id,
    expectedRevision: p.expected_revision,
    draft: (registry[method].input.shape.draft as z.ZodObject).parse(
      Object.fromEntries(
        Object.entries(d).filter(([k]) =>
          Object.hasOwn(
            (registry[method].input.shape.draft as z.ZodObject).shape,
            k,
          ),
        ),
      ),
    ),
    replace: !!p.replace,
  });
  const result = await invoke(method, payload);
  sessionCache.set(String(p.payload.sessionId), {
    revision: result.revision,
    payload: {
      stage: String(d.stage),
      entryId: String(d.entryId),
      index: Number(d.index),
    },
  });
  return result;
}
async function review(raw: unknown, memory: boolean) {
  const p = mapped(raw, {
    questionId: "cardId",
    id: "cardId",
    improvement: "reflection",
    errorKnowledgeIds: "knowledgeIds",
  });
  // Input keys originating from underscore forms are renamed after normalization.
  const source = raw as Record<string, unknown>;
  p.cardId = source.question_id ?? source.id;
  p.deckId = source.deck_id ?? p.deckId;
  p.requestId = source.request_id ?? crypto.randomUUID();
  p.kind = memory ? "memory" : "question";
  p.contentVersion = contentIdentity(
    String(p.cardId),
    Number(source.content_version ?? p.contentVersion),
  );
  p.sessionId = source.session_id;
  if (memory)
    p.rating = (
      { 0: "again", 1: "again", 2: "hard", 3: "good", 4: "easy" } as Record<
        number,
        string
      >
    )[Number(source.score)];
  if (!memory) {
    p.reflection = source.improvement ?? "";
    p.knowledgeIds = source.error_knowledge_ids ?? [];
    p.elapsedSeconds = source.elapsed_seconds ?? null;
  }
  const session = sessionCache.get(String(p.sessionId));
  if (p.sessionId && session) p.expectedSessionRevision = session.revision;
  const method = memory ? "review.memory.submit" : "review.question.submit";
  const fields = registry[method].input.shape;
  const payload = registry[method].input.parse(
    Object.fromEntries(
      Object.entries(p).filter(
        ([k, v]) => v !== undefined && Object.hasOwn(fields, k),
      ),
    ),
  );
  const receipt = await invoke("review.receipt", {
    requestId: String(p.requestId),
  });
  const result = ReviewResultCodec.decode(
    receipt ?? (await invoke(method, payload, String(p.requestId))),
  );
  if (session) session.revision++;
  return result;
}
export const services = {
  workspace: {
    async read(
      sections: Input<"workspace.read">["sections"],
      deckId: string | null,
    ) {
      let result: ReturnType<typeof SnapshotCodec.decode> | undefined;
      for (let offset = 0; ; offset += 20) {
        const part = SnapshotCodec.decode(
          await invoke("workspace.read", {
            sections,
            deckId,
            offset,
            limit: 20,
          }),
        );
        if (!result) result = part;
        else {
          if (part.meta.dataRevision !== result.meta.dataRevision)
            throw new Error("读取期间数据已变化，请刷新后重试");
          for (const key of Object.keys(part) as (keyof typeof part)[]) {
            if (Array.isArray(part[key]))
              (result[key] as unknown[]).push(...(part[key] as unknown[]));
          }
        }
        if (!part.meta.pageHasMore) break;
      }
      if (!result) throw new Error("读取工作区失败");
      for (const s of result.sessions) {
        try {
          sessionCache.set(JSON.parse(s.payload).sessionId, {
            revision: s.revision,
            payload: JSON.parse(s.payload),
          });
        } catch {}
      }
      return result;
    },
  },
  folder: {
    save: mutation("catalog.folder.save"),
    action: mutation("catalog.folder.action"),
  },
  deck: {
    save: mutation("catalog.deck.save"),
    action: mutation("catalog.deck.action"),
    export: mutation("exchange.deck.export"),
  },
  question: {
    save: mutation("content.question.save"),
    note: mutation("content.question.note"),
    delete: mutation("content.question.delete"),
    restore: mutation("content.question.restore"),
  },
  memory: {
    save: mutation("content.memory.save"),
    action: mutation("content.memory.action"),
    review: (p: unknown) => review(p, true),
  },
  plan: { set: mutation("content.plan.set") },
  collection: {
    open: () => invoke("exchange.open", {}),
    describe: (fileToken: string) =>
      invoke("exchange.collection.describe", { fileToken }),
    import: (fileToken: string, name: string, folderId: string | null) =>
      invoke("exchange.collection.import", { fileToken, name, folderId }),
  },
  preferences: {
    get: () => invoke("preferences.get", {}),
    set: (theme: "light" | "dark" | "system") =>
      invoke("preferences.set", { theme }),
  },
  messages: {
    list: () => invoke("messages.list", {}),
    append: (kind: "success" | "info" | "error", text: string) =>
      invoke("messages.append", { kind, text }),
    read: (ids?: string[]) => invoke("messages.read", ids ? { ids } : {}),
  },
  analytics: {
    collection: async (deckId: string, selection: DateSelectionInput) =>
      CollectionStatisticsCodec.decode(
        await invoke("analytics.collection", { deckId, ...selection }),
      ),
    async deck(deckId: string, range: "7" | "30" | "all" | DateSelectionInput) {
      return DeckInsightsCodec.decode(
        await invoke("analytics.deck", {
          deckId,
          ...(typeof range === "string" ? { range } : range),
        }),
      );
    },
  },
  cards: {
    async timeline(p: { kind: "question" | "memory"; card_id: string }) {
      return CardReviewStatsCodec.decode(
        await invoke("analytics.card.timeline", {
          kind: p.kind,
          cardId: p.card_id,
        }),
      );
    },
    bulk: mutation("content.bulk"),
    async stats(p: unknown) {
      return CardReviewStatsCodec.decode(
        await invoke(
          "analytics.card",
          (() => {
            const payload = input("analytics.card", {
              ...(p as object),
              content_version: undefined,
              contentVersion: undefined,
            });
            const raw = p as {
              content_version?: number | null;
              card_id: string;
            };
            if (raw.content_version != null)
              payload.contentVersion = contentIdentity(
                raw.card_id,
                raw.content_version,
              );
            return payload;
          })(),
        ),
      );
    },
  },
  knowledge: {
    save: mutation("knowledge.save"),
    merge: mutation("knowledge.merge"),
    delete: mutation("knowledge.delete"),
    restore: mutation("knowledge.restore"),
    async mapSave(raw: unknown) {
      const p = raw as {
        module: string;
        nodes: { id: string; name: string; parent_id: string | null }[];
        expected: Record<string, number>;
      };
      return invoke("knowledge.map.save", {
        deckId: p.module,
        nodes: p.nodes.map((n) => ({
          id: n.id,
          name: n.name,
          parentId: n.parent_id ?? null,
        })),
        expected: p.expected,
      });
    },
    async insight(p: unknown) {
      return KnowledgeInsightCodec.decode(
        await invoke("knowledge.insight", input("knowledge.insight", p)),
      );
    },
  },

  studyQuery: (
    deckId: string,
    filters: import("../shared/study-query").StudyFilter,
  ) => invoke("cards.query", { deckId, filters }),
  studyPreflight: (deckId: string, ids: string[], includePaused: boolean) =>
    invoke("cards.preflight", { deckId, ids, includePaused }),
  filter: {
    save: mutation("filters.save"),
    delete: mutation("filters.delete"),
  },
  session: {
    save: persistSession,
    async delete(raw: unknown) {
      const p = raw as { deck_id: string; session_id: string };
      const revision = sessionCache.get(p.session_id)?.revision ?? 0;
      const result = await invoke("session.finish", {
        deckId: p.deck_id,
        sessionId: p.session_id,
        expectedRevision: revision,
      });
      sessionCache.delete(p.session_id);
      return result;
    },
  },
  review: { submit: (p: unknown) => review(p, false) },
  policy: {
    previewQueue: (deckId:string,seed?:string,cardId?:string,diagnosisOffset=0) => invoke("policy.previewQueue",{deckId,diagnosisOffset,...(seed?{seed}:{}),...(cardId?{cardId}:{})}),
    preview: (p:Input<"policy.config.preview">) => invoke("policy.config.preview",p),
    applyExisting: (previewToken:string) => invoke("policy.config.applyExisting",{previewToken}),
    undoExisting: (deckId:string,operationId:string) => invoke("policy.config.undoExisting",{deckId,operationId}),
    configGet: (deckId:string) => invoke("policy.config.get",{deckId}),
    configSave: (p:Input<"policy.config.save">) => invoke("policy.config.save",p),
    knowledgeSet: (p:Input<"policy.knowledge.set">) => invoke("policy.knowledge.set",p),
    diagnosisGet: () => invoke("policy.diagnosis.get",{}),
    diagnosisSave: (p:Input<"policy.diagnosis.save">) => invoke("policy.diagnosis.save",p),
    cardGet: (kind:'question'|'memory',cardId:string) => invoke("policy.card.get",{kind,cardId}),
    card: mutation("policy.card.set"),
    deck: mutation("policy.deck.set"),
    target: mutation("assessment.target.set"),
  },
  exchange: {
    async open() {
      const r = await invoke("exchange.open", {});
      importToken = r?.fileToken;
      return r
        ? { ...r, package: ExchangePackageCodec.decode(r.package) }
        : null;
    },
    async preview(raw: unknown) {
      const p = raw as {
        package: unknown;
        options: Input<"exchange.preview">["options"];
      };
      return invoke("exchange.preview", {
        ...(importToken
          ? { fileToken: importToken }
          : { package: ExchangePackageCodec.encode(p.package) }),
        options: p.options,
      });
    },
    async commit(raw: unknown) {
      const p = raw as {
        package: unknown;
        options: Input<"exchange.commit">["options"];
        expected: Input<"exchange.commit">["expected"];
      };
      return invoke("exchange.commit", {
        ...(importToken
          ? { fileToken: importToken }
          : { package: ExchangePackageCodec.encode(p.package) }),
        options: p.options,
        expected: p.expected,
      });
    },
  },
  media: {
    stage: (
      deckId: string,
      purpose: "question" | "analysis" | "response",
      source: "file" | "clipboard",
    ) => invoke("media.stage", { deckId, purpose, source }),
  },
  trash: {
    preview: mutation("trash.preview"),
    manage: mutation("trash.manage"),
  },
  maintenance: {
    operations: () => invoke("maintenance.operations", {}),
    resolve: mutation("maintenance.operation.resolve"),
    backup: () => invoke("maintenance.backup", {}),
    async restore() {
      const ok = await invoke("maintenance.restore", {});
      if (ok) {
        sessionCache.clear();
        for (const k of Object.keys(localStorage))
          if (k.startsWith("gank-study-")) localStorage.removeItem(k);
      }
      return ok;
    },
  },
  ai: {
    config: () => invoke("ai.config.get", {}),
    save: mutation("ai.config.save"),
    analyze: mutation("ai.analyze"),
  },
};
