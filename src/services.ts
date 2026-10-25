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
// S1.b foundation only; existing Vue views keep their current entry points.
export const unifiedWorkspace = {
  saveCatalog:(p:Input<'workspace.catalog.save'>,requestId?:string)=>invoke('workspace.catalog.save',p,requestId),
  analytics:(p:Input<'workspace.analytics'>)=>invoke('workspace.analytics',p),
  catalog:(p:Input<'workspace.catalog'>)=>invoke('workspace.catalog',p),
  sessions:(p:Input<'workspace.sessions'>)=>invoke('workspace.sessions',p),
};
export const knowledgeMarkdown = {
  text:(p:Input<'knowledge.md.source.text'>)=>invoke('knowledge.md.source.text',p),
  clipboard:(p:Input<'knowledge.md.source.clipboard'>)=>invoke('knowledge.md.source.clipboard',p),
  open:(p:Input<'knowledge.md.source.open'>)=>invoke('knowledge.md.source.open',p),
  headings:(p:Input<'knowledge.md.source.headings'>)=>invoke('knowledge.md.source.headings',p),
  previewImport:(p:Input<'knowledge.md.import.preview'>)=>invoke('knowledge.md.import.preview',p),
  page:(p:Input<'knowledge.md.import.page'>)=>invoke('knowledge.md.import.page',p),
  diff:(p:Input<'knowledge.md.import.diff'>)=>invoke('knowledge.md.import.diff',p),
  confirmImport:(p:Input<'knowledge.md.import.confirm'>,requestId?:string)=>invoke('knowledge.md.import.confirm',p,requestId),
  previewExport:(p:Input<'knowledge.md.export.preview'>)=>invoke('knowledge.md.export.preview',p),
  copy:(p:Input<'knowledge.md.export.copy'>)=>invoke('knowledge.md.export.copy',p),
  save:(p:Input<'knowledge.md.export.save'>,requestId?:string)=>invoke('knowledge.md.export.save',p,requestId),
};
export const unifiedKnowledge = {
  previewMerge: (p:Input<'knowledge.merge.preview'>)=>invoke('knowledge.merge.preview',p),
  confirmMerge: (p:Input<'knowledge.merge.confirm'>,requestId?:string)=>invoke('knowledge.merge.confirm',p,requestId),
  deleteSubtree: (p:Input<'knowledge.subtree.delete'>,requestId?:string)=>invoke('knowledge.subtree.delete',p,requestId),
  recycle: (p:Input<'knowledge.recycle.list'>)=>invoke('knowledge.recycle.list',p),
  previewRestore: (p:Input<'knowledge.restore.preview'>)=>invoke('knowledge.restore.preview',p),
  confirmRestore: (p:Input<'knowledge.restore.confirm'>,requestId?:string)=>invoke('knowledge.restore.confirm',p,requestId),
  tree: (p:Input<'knowledge.tree.read'>)=>invoke('knowledge.tree.read',p),
  applyTree: (p:Input<'knowledge.tree.apply'>,requestId?:string)=>invoke('knowledge.tree.apply',p,requestId),
  create: (p:Input<'knowledge.node.create'>,requestId?:string)=>invoke('knowledge.node.create',p,requestId),
  node: (p:Input<'knowledge.node.read'>)=>invoke('knowledge.node.read',p),
  save: (p:Input<'knowledge.node.save'>,requestId?:string)=>invoke('knowledge.node.save',p,requestId),
  links: (p:Input<'knowledge.cardLinks.get'>)=>invoke('knowledge.cardLinks.get',p),
  setLinks: (p:Input<'knowledge.cardLinks.set'>,requestId?:string)=>invoke('knowledge.cardLinks.set',p,requestId),
};
export const unifiedLearning = {
  config:(p:Input<'policy.config.get'>)=>invoke('policy.config.get',p),
  setDeck:(p:Input<'policy.deck.set'>,id?:string)=>invoke('policy.deck.set',p,id),
  cardPolicy:(p:Input<'policy.card.get'>)=>invoke('policy.card.get',p),
  setCardPolicy:(p:Input<'policy.card.set'>,id?:string)=>invoke('policy.card.set',p,id),
  applyRecompute:(p:Input<'policy.config.applyExisting'>,id?:string)=>invoke('policy.config.applyExisting',p,id),
  undoRecompute:(p:Input<'policy.config.undoExisting'>,id?:string)=>invoke('policy.config.undoExisting',p,id),
  queue: (p:Input<'learning.queue.preview'>)=>invoke('learning.queue.preview',p),
  open: (p:Input<'learning.session.open'>,requestId?:string)=>invoke('learning.session.open',p,requestId),
  get: (p:Input<'learning.session.get'>)=>invoke('learning.session.get',p),
  change: (p:Input<'learning.session.change'>,requestId?:string)=>invoke('learning.session.change',p,requestId),
  submit: (p:Input<'learning.review.submit'>,requestId?:string)=>invoke('learning.review.submit',p,requestId),
  mastery: (p:Input<'learning.mastery.card'>)=>invoke('learning.mastery.card',p),
  knowledgeMastery: (p:Input<'learning.mastery.knowledge'>)=>invoke('learning.mastery.knowledge',p),
  history: (p:Input<'learning.history.list'>)=>invoke('learning.history.list',p),
  event: (p:Input<'learning.history.get'>)=>invoke('learning.history.get',p),
  previewRecompute: async (p:Omit<Input<'policy.config.preview'>,'model'>)=>{
    const result=await invoke('policy.config.preview',{...p,model:'unified'});
    if(!('encoding' in result))throw Error('POLICY_PREVIEW_MODEL_MISMATCH');
    return result;
  },
};
export const unifiedDrafts = {
  create: (p: Input<'draft.create'>, requestId?: string) => invoke('draft.create',p,requestId),
  listSummary: (p: Input<'draft.listSummary'>) => invoke('draft.listSummary',p),
  get: (p: Input<'draft.get'>) => invoke('draft.get', p),
  save: (p: Input<'draft.save'>, requestId?: string) => invoke('draft.save', p, requestId),
  previewSwitch: (p: Input<'draft.previewSwitch'>) => invoke('draft.previewSwitch', p),
  switchType: (p: Input<'draft.switchType'>, requestId?: string) => invoke('draft.switchType', p, requestId),
};
export const unifiedCardExchange = {
 preview:(p:Input<'card.exchange.preview'>)=>invoke('card.exchange.preview',p),
 save:(p:Input<'card.exchange.save'>,requestId?:string)=>invoke('card.exchange.save',p,requestId),
 open:()=>invoke('card.exchange.open',{}),
 import:(p:Input<'card.exchange.import'>,requestId?:string)=>invoke('card.exchange.import',p,requestId),
};
export const unifiedCards = {
  batch:(p:Input<'card.batch.apply'>,requestId?:string)=>invoke('card.batch.apply',p,requestId),
  recycle:(p:Input<'card.recycle.list'>)=>invoke('card.recycle.list',p),
  restore:(p:Input<'card.recycle.restore'>,requestId?:string)=>invoke('card.recycle.restore',p,requestId),
  clipboardCopy: (p: Input<'card.clipboard.copy'>, requestId?: string) => invoke('card.clipboard.copy',p,requestId),
  clipboardPreview: (p: Input<'card.clipboard.preview'>) => invoke('card.clipboard.preview',p),
  clipboardApply: (p: Input<'card.clipboard.apply'>, requestId?: string) => invoke('card.clipboard.apply',p,requestId),
  promptContext: (p: Input<'card.getPromptContext'>) => invoke('card.getPromptContext',p),
  publish: (p: Input<'card.publish'>, requestId?: string) => invoke('card.publish',p,requestId),
  listSummary: (payload: Input<'card.listSummary'>) => invoke('card.listSummary', payload),
  getPublishedContent: (payload: Input<'card.getPublishedContent'>) => invoke('card.getPublishedContent', payload),
  getVersion: (payload: Input<'content.getVersion'>) => invoke('content.getVersion', payload),
};
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
    preview: async (p:Omit<Input<"policy.config.preview">,"model">) => {
      const result=await invoke("policy.config.preview",p);
      if('encoding' in result)throw Error('POLICY_PREVIEW_MODEL_MISMATCH');
      return result;
    },
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
      purpose: "question" | "analysis" | "response" | "knowledge",
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
