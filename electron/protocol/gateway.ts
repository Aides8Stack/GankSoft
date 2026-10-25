import {previewCardExport,importCardPackage,executeCardExchange} from '../modules/cards-unified/exchange.ts';
import {applyCardBatch,listRecycledCards,restoreCards} from '../modules/cards-unified/lifecycle.ts';
import {workspaceAnalytics} from '../modules/workspace-unified/analytics.ts';
import {saveUnifiedCatalog} from '../modules/workspace-unified/catalog.ts';
import {workspaceCatalog,workspaceSessionSummaries} from '../modules/workspace-unified/queries.ts';
import {executeKnowledgeMedia} from '../modules/knowledge-unified/media.ts';
import { stageMarkdownSource, previewMarkdownImport, confirmMarkdownImport, previewMarkdownExport, preparedMarkdownExport, markdownImportPage, markdownImportDiff, markdownHeadingPage } from '../modules/knowledge-unified/markdown-exchange.ts';
import { previewMerge, confirmMerge } from '../modules/knowledge-unified/merge.ts';
import { deleteSubtree, listKnowledgeRecycle, previewRestore, confirmRestore } from '../modules/knowledge-unified/recycle.ts';
import { readTree, readNode } from '../modules/knowledge-unified/storage.ts';
import { applyTree, createNode, saveNode } from '../modules/knowledge-unified/tree.ts';
import { getCardLinks, saveCardLinks } from '../modules/knowledge-unified/links.ts';
import { previewLearningQueue } from '../modules/cards-unified/queue.ts';
import { previewUnifiedRecompute, applyUnifiedRecompute, undoUnifiedRecompute, isUnifiedRecompute, isUnifiedOperation } from '../modules/cards-unified/recompute.ts';
import { nativePolicyView, cardPolicyById, setCardSchedulePolicy } from '../modules/cards-unified/schedule.ts';
import { cardMastery, knowledgeMastery } from '../modules/cards-unified/mastery.ts';
import { reviewHistory, reviewEventDetail } from '../modules/cards-unified/history.ts';
import { openReviewSession, getReviewSession, changeReviewSession, commitReview } from '../modules/cards-unified/review-session.ts';
import { createNewDraft, listDraftSummaries } from '../modules/cards-unified/new-drafts.ts';
import { createCardClipboard, type ClipboardTextPort } from '../modules/cards-unified/clipboard.ts';
import { getPromptContext } from '../modules/cards-unified/prompt.ts';
import { publishDraft } from '../modules/cards-unified/publish.ts';
import { readWorkspaceDraft, saveWorkspaceDraft, previewDraftSwitch, switchWorkspaceDraft } from '../modules/cards-unified/draft-service.ts';
import { previewQueue } from "../modules/review/review-queue.ts";
import { listSummary, getPublishedContent } from "../modules/cards-unified/queries.ts";
import { guardDatabaseAccess, hasWriteOwner } from '../infrastructure/write-owner.ts';
import { previewExisting, applyExisting, undoExisting } from "../modules/review/due-preview.ts";
import { cardConfig, reviewConfig, saveConfig, setKnowledgePreference, diagnosisRule, saveDiagnosisRule } from "../modules/review/config-service.ts";
import { saveQuestionImages } from "../modules/media/drafts.ts";
import {
  studyQuery,
  studyPreflight,
} from "../modules/analytics/study-query.ts";
import {
  getPreferences,
  setPreferences,
  listMessages,
  appendMessage,
  markMessages,
} from "../modules/workspace.ts";
import { collectionSummary } from "../modules/analytics/window.ts";
import { deckInsights } from "../modules/analytics/deck.ts";
import { cardTimeline } from "../modules/analytics/timeline.ts";
import { contentOrdinal } from "../../shared/protocol/identity.ts";
import { createHash } from "node:crypto";
import type { Application } from "../application.ts";
import { DomainError } from "../../shared/domain-error.ts";
import { assertWireValue, ProtocolError } from "../../shared/protocol/data.ts";
import {
  registry,
  type Handlers,
  type Method,
  type Response,
} from "../../shared/protocol/registry.ts";
import {
  KnowledgeInsightCodec,
  SnapshotCodec,
  ReviewResultCodec,
  CardReviewStatsCodec,
  DeckInsightsCodec,
  CollectionStatisticsCodec,
  ExchangePackageCodec,
} from "../../shared/protocol/models.ts";
import { createHost, canonical } from "../../shared/protocol/host.ts";
import { sqliteProtocolStore } from "./sqlite-store.ts";
import { sessionEvent } from "../modules/sessions/events.ts";
const clean = (v: unknown): unknown => JSON.parse(JSON.stringify(v));
function stored(
  p: object,
  overrides: Record<string, string> = {},
): Record<string, unknown> {
  const defaults: Record<string, string> = {
    deckId: "module",
    expectedRevision: "version",
  };
  return Object.fromEntries(
    Object.entries(p)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [
        overrides[k] ??
          defaults[k] ??
          k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()),
        v,
      ]),
  );
}
export type PlatformHandlers = Partial<{
  [M in Method]: (payload: unknown, requestId: string) => Promise<unknown>;
}>;
export function createApplicationProtocol(
  app: Application,
  guard: () => void = () => {},
  platform: PlatformHandlers = {},
  currentStore?: () => ReturnType<typeof sqliteProtocolStore>,
  clipboard?: ClipboardTextPort,
) {
  // A staged 606 copy is not an active application database. S1.c must establish
  // atomic recovery and the legacy write adapter before enabling it here.
  if (Number(app.ctx.db.prepare('PRAGMA user_version').get()?.user_version) === 606 && !hasWriteOwner(app.ctx.db))
    throw new DomainError('MIGRATION_NOT_ACTIVATED', '隔离的新模型尚未通过S1.c，不能作为活动库写入');
  const store = sqliteProtocolStore(app.ctx.db);
  const runtimeGuard = () => { guard(); guardDatabaseAccess(app.ctx.db); };
  app.ctx.db.exec(
    "CREATE TABLE IF NOT EXISTS platform_operations(request_id TEXT PRIMARY KEY,epoch TEXT NOT NULL,method TEXT NOT NULL,digest TEXT NOT NULL,state TEXT NOT NULL,created_at TEXT NOT NULL)",
  );
  const call = (name: string, p: object = {}) => app.handle(name, p);
  const owned = (kind: string, id: string, deckId: string) => {
    const card = app.ctx.db
      .prepare(
        `SELECT module,deleted_at FROM ${kind === "question" ? "questions" : "memory_cards"} WHERE id=?`,
      )
      .get(id);
    const deck = app.ctx.db
      .prepare("SELECT kind,deleted_at FROM decks WHERE id=?")
      .get(deckId);
    if (
      !card ||
      card.deleted_at ||
      !deck ||
      deck.deleted_at ||
      deck.kind !== kind ||
      card.module !== deckId
    )
      throw new ProtocolError(
        "DECK_CONFLICT",
        "卡片已移动或删除，请刷新后重试",
      );
  };
  const update = (
    name: string,
    p: { id?: string; expectedRevision?: number },
  ) => {
    if (p.id && p.expectedRevision === undefined)
      throw new ProtocolError("REVISION_REQUIRED", "修改时必须携带版本");
    return call(name, stored(p));
  };
  const cardClipboard = clipboard ? createCardClipboard(app.ctx, clipboard) : undefined;
  if (cardClipboard) platform = { ...platform,
    "card.clipboard.copy": p => cardClipboard.copy(p),
    "card.clipboard.preview": p => cardClipboard.preview(p),
  };
  if(clipboard)platform={...platform,
    "knowledge.md.source.clipboard":async p=>stageMarkdownSource(app.ctx,(p as {deckId:string}).deckId,await clipboard.readText(),'剪贴板Markdown'),
    "knowledge.md.export.copy":async p=>{await clipboard.writeText(preparedMarkdownExport(app.ctx,p as {deckId:string;exportToken:string}));return true;},
  };
  const handlers: Handlers = {
    "knowledge.md.source.text":p=>stageMarkdownSource(app.ctx,p.deckId,p.markdown),
    "knowledge.md.source.clipboard":()=>{throw new ProtocolError('PLATFORM_UNAVAILABLE','当前环境未连接系统剪贴板');},
    "knowledge.md.source.open":()=>{throw new ProtocolError('PLATFORM_UNAVAILABLE','当前环境未连接Markdown文件选择');},
    "knowledge.md.source.headings":p=>markdownHeadingPage(app.ctx,p),
    "knowledge.md.import.preview":p=>previewMarkdownImport(app.ctx,p),
    "knowledge.md.import.page":p=>markdownImportPage(app.ctx,p),
    "knowledge.md.import.diff":p=>markdownImportDiff(app.ctx,p),
    "knowledge.md.import.confirm":p=>confirmMarkdownImport(app.ctx,p),
    "knowledge.md.export.preview":p=>previewMarkdownExport(app.ctx,p),
    "knowledge.md.export.copy":()=>{throw new ProtocolError('PLATFORM_UNAVAILABLE','当前环境未连接系统剪贴板');},
    "knowledge.md.export.save":()=>{throw new ProtocolError('PLATFORM_UNAVAILABLE','当前环境未连接Markdown保存对话框');},
    "knowledge.merge.preview": p=>previewMerge(app.ctx,p),
    "knowledge.merge.confirm": p=>confirmMerge(app.ctx,p),
    "knowledge.subtree.delete": p=>deleteSubtree(app.ctx,p),
    "knowledge.recycle.list": p=>listKnowledgeRecycle(app.ctx,p.deckId),
    "knowledge.restore.preview": p=>previewRestore(app.ctx,p),
    "knowledge.restore.confirm": p=>confirmRestore(app.ctx,p),
    "knowledge.tree.read": p=>readTree(app.ctx,p.deckId),
    "knowledge.tree.apply": p=>applyTree(app.ctx,p),
    "knowledge.node.create": p=>createNode(app.ctx,p),
    "knowledge.node.read": p=>readNode(app.ctx,p.deckId,p.nodeId),
    "knowledge.node.save": p=>saveNode(app.ctx,p),
    "knowledge.cardLinks.get": p=>getCardLinks(app.ctx,p),
    "knowledge.cardLinks.set": p=>saveCardLinks(app.ctx,p),
    "learning.queue.preview": p=>previewLearningQueue(app.ctx,p),
    "learning.mastery.card": p=>cardMastery(app.ctx,p),
    "learning.mastery.knowledge": p=>knowledgeMastery(app.ctx,p),
    "learning.history.list": p=>reviewHistory(app.ctx,p),
    "learning.history.get": p=>reviewEventDetail(app.ctx,p),
    "learning.session.open": p=>openReviewSession(app.ctx,p),
    "learning.session.get": p=>getReviewSession(app.ctx,p),
    "learning.session.change": p=>changeReviewSession(app.ctx,p),
    "learning.review.submit": p=>commitReview(app.ctx,p),
    "draft.create": p => createNewDraft(app.ctx,p),
    "draft.listSummary": p => listDraftSummaries(app.ctx,p),
    ...cardClipboard?.handlers,
    "card.getPromptContext": p => getPromptContext(app.ctx,p),
    "ai.analyze": () => {throw new ProtocolError('AI_EXTERNAL_ONLY','请复制Prompt到外部AI，软件不再内置模型调用');},
    "ai.config.save": () => {throw new ProtocolError('AI_EXTERNAL_ONLY','本版不再配置内置AI服务');},
    "card.exchange.preview":p=>previewCardExport(app.ctx,p),
    "card.exchange.import":p=>importCardPackage(app.ctx,p),
    "card.exchange.save":()=>{throw new ProtocolError('PLATFORM_UNAVAILABLE','未连接卡片内容保存对话框');},
    "card.exchange.open":()=>{throw new ProtocolError('PLATFORM_UNAVAILABLE','未连接卡片内容选择对话框');},
    "card.batch.apply":p=>applyCardBatch(app.ctx,p),
    "card.recycle.list":p=>listRecycledCards(app.ctx,p),
    "card.recycle.restore":p=>restoreCards(app.ctx,p),
    "card.publish": p => publishDraft(app.ctx,p),
    "draft.get": p => readWorkspaceDraft(app.ctx,p),
    "draft.save": p => saveWorkspaceDraft(app.ctx,p),
    "draft.previewSwitch": p => previewDraftSwitch(app.ctx,p),
    "draft.switchType": p => switchWorkspaceDraft(app.ctx,p),
    "card.listSummary": (p) => listSummary(app.ctx, p),
    "card.getPublishedContent": (p) => getPublishedContent(app.ctx, p),
    "content.getVersion": (p) => getPublishedContent(app.ctx, p),
    "preferences.get": () => getPreferences(app.ctx),
    "preferences.set": (p) => setPreferences(app.ctx, p),
    "messages.list": () => listMessages(app.ctx),
    "messages.append": (p) => appendMessage(app.ctx, p),
    "messages.read": (p) => markMessages(app.ctx, p),
    "analytics.collection": (p) =>
      CollectionStatisticsCodec.encode(collectionSummary(app.ctx, p)),
    "workspace.catalog":p=>workspaceCatalog(app.ctx,p),
    "workspace.catalog.save":p=>saveUnifiedCatalog(app.ctx,p),
    "workspace.analytics":p=>workspaceAnalytics(app.ctx,p),
    "workspace.sessions":p=>workspaceSessionSummaries(app.ctx,p),
    "workspace.read": (p) => SnapshotCodec.encode(app.snapshot(p)),
    "catalog.folder.save": (p) => update("folder.save", p),
    "catalog.deck.save": (p) => update("deck.save", p),
    "catalog.folder.action": (p) => {
      call("folder.action", p);
      return true;
    },
    "catalog.deck.action": (p) => {
      call("deck.action", p);
      return true;
    },
    "content.question.save": (p) => {
      const id = update("question.save", p);
      if (p.images) saveQuestionImages(app.ctx, id, p.deckId, p.images);
      return id;
    },
    "content.memory.save": (p) => update("memory.save", p),
    "content.question.note": (p) => {
      call("question.note", stored(p));
      return true;
    },
    "content.question.delete": (p) => {
      call("question.delete", p);
      return true;
    },
    "content.question.restore": (p) => {
      call("question.restore", p);
      return true;
    },
    "content.memory.action": (p) => {
      call("memory.action", p);
      return true;
    },
    "content.plan.set": (p) => {
      call("plan.set", p);
      return true;
    },
    "content.bulk": (p) => {
      call("cards.bulk", stored(p, { deckId: "deck_id" }));
      return true;
    },
    "knowledge.save": (p) => update("knowledge.save", p),
    "knowledge.merge": (p) => call("knowledge.merge", stored(p)),
    "knowledge.delete": (p) => {
      call("knowledge.delete", p);
      return true;
    },
    "knowledge.restore": (p) => {
      call("knowledge.restore", p);
      return true;
    },
    "knowledge.map.save": (p) =>
      call("knowledge.mapSave", {
        module: p.deckId,
        expected: p.expected,
        nodes: p.nodes.map((n) => stored(n)),
      }),
    "knowledge.insight": (p) =>
      KnowledgeInsightCodec.encode(call("insight", p)),
    "cards.query": (p) => studyQuery(app.ctx, p),
    "cards.preflight": (p) => studyPreflight(app.ctx, p),
    "filters.save": (p) =>
      call("filter.save", {
        ...stored(p, {
          deckId: "deck_id",
          expectedRevision: "expected_revision",
        }),
        payload: p.payload,
      }),
    "filters.delete": (p) => {
      call(
        "filter.delete",
        stored(p, { deckId: "deck_id", expectedRevision: "expected_revision" }),
      );
      return true;
    },
    "session.draft": (p, c) => sessionEvent(app.ctx, "draft", p, c.requestId),
    "session.reveal": (p, c) => sessionEvent(app.ctx, "reveal", p, c.requestId),
    "session.advance": (p, c) =>
      sessionEvent(app.ctx, "advance", p, c.requestId),
    "session.restart": (p, c) =>
      sessionEvent(app.ctx, "restart", p, c.requestId),
    "session.skip": (p, c) => sessionEvent(app.ctx, "skip", p, c.requestId),
    "session.finish": (p) => {
      const r = app.ctx.db
        .prepare(
          "SELECT revision,payload FROM study_sessions WHERE deck_id=? AND json_extract(payload,'$.sessionId')=?",
        )
        .get(p.deckId, p.sessionId);
      if (r && r.revision !== p.expectedRevision)
        throw new ProtocolError("REVISION_CONFLICT", "会话已变化");
      if(r && JSON.parse(String(r.payload)).encoding==='ganksoft.review-session/1' && !JSON.parse(String(r.payload)).completed)
        throw new ProtocolError('UNIFIED_SESSION_PROTECTED','未完成的统一复盘请暂停并恢复，不能通过旧入口删除');
      call(
        "session.delete",
        stored(p, {
          deckId: "deck_id",
          sessionId: "session_id",
          expectedRevision: "expected_revision",
        }),
      );
      return true;
    },
    "review.question.submit": (p, c) => {
      owned("question", p.cardId, p.deckId);
      if (p.requestId !== c.requestId)
        throw new ProtocolError("REQUEST_CONFLICT", "作答编号与请求编号不一致");
      if (p.sessionId) {
        const s = app.ctx.db
          .prepare(
            "SELECT revision,payload FROM study_sessions WHERE deck_id=? AND json_extract(payload,'$.sessionId')=?",
          )
          .get(p.deckId, p.sessionId);
        if (!s || s.revision !== p.expectedSessionRevision)
          throw new ProtocolError("REVISION_CONFLICT", "会话已变化");
      }
      const payload: Record<string, unknown> = {
        ...stored(p, {
          deckId: "deck_id",
          cardId: "question_id",
          reflection: "improvement",
          knowledgeIds: "error_knowledge_ids",
        }),
        protocol_version: 2,
        content_version: contentOrdinal(p.contentVersion, p.cardId),
      };
      delete payload.kind;
      delete payload.expected_session_revision;
      return ReviewResultCodec.encode(call("review.submit", payload));
    },
    "review.memory.submit": (p, c) => {
      owned("memory", p.cardId, p.deckId);
      if (p.sessionId) {
        const s = app.ctx.db
          .prepare(
            "SELECT revision,payload FROM study_sessions WHERE deck_id=? AND json_extract(payload,'$.sessionId')=?",
          )
          .get(p.deckId, p.sessionId);
        if (!s || s.revision !== p.expectedSessionRevision)
          throw new ProtocolError("REVISION_CONFLICT", "会话已变化");
      }
      if (p.requestId !== c.requestId)
        throw new ProtocolError("REQUEST_CONFLICT", "作答编号与请求编号不一致");
      const payload = {
        request_id: p.requestId,
        id: p.cardId,
        content_version: contentOrdinal(p.contentVersion, p.cardId),
        deck_id: p.deckId,
        session_id: p.sessionId,
        score: { again: 1, hard: 2, good: 3, easy: 4 }[p.rating],
        note: p.note,
        practice: p.practice,
      };
      return ReviewResultCodec.encode(call("memory.review", payload));
    },
    "review.receipt": (p) => {
      const r = store.getReceipt(p.requestId);
      return r?.response.ok ? (r.response.data as never) : null;
    },
    "analytics.deck": (p) => DeckInsightsCodec.encode(deckInsights(app.ctx, p)),
    "analytics.card.timeline": (p) =>
      CardReviewStatsCodec.encode(cardTimeline(app.ctx, p)),
    "analytics.card": (p) =>
      CardReviewStatsCodec.encode(
        call("card.reviewStats", {
          ...stored(p),
          content_version:
            p.contentVersion == null
              ? p.contentVersion
              : contentOrdinal(p.contentVersion, p.cardId),
        }),
      ),
    "policy.previewQueue": p => previewQueue(app.ctx,p),
    "policy.config.preview": p => p.model==='unified'?previewUnifiedRecompute(app.ctx,p):previewExisting(app.ctx,p),
    "policy.config.applyExisting": (p,c) => isUnifiedRecompute(p.previewToken)?applyUnifiedRecompute(app.ctx,p.previewToken,c.requestId):applyExisting(app.ctx,p,c.requestId),
    "policy.config.undoExisting": p => isUnifiedOperation(app.ctx,p.operationId)?undoUnifiedRecompute(app.ctx,p):undoExisting(app.ctx,p),
    "policy.config.get": p => reviewConfig(app.ctx,p.deckId),
    "policy.config.save": p => saveConfig(app.ctx,p),
    "policy.knowledge.set": p => setKnowledgePreference(app.ctx,p),
    "policy.diagnosis.get": () => diagnosisRule(app.ctx),
    "policy.diagnosis.save": p => saveDiagnosisRule(app.ctx,p),
    "policy.card.get": p => p.kind==='card'?nativePolicyView(app.ctx,p.cardId):cardConfig(app.ctx,p.kind,p.cardId),
    "policy.card.set": (p) => {
      if(p.kind!=='card')return call("card.reviewPolicy.save", stored(p));
      if(p.expectedRevision===undefined)throw new ProtocolError('REVISION_CONFLICT','请携带单卡配置修订');
      return setCardSchedulePolicy(app.ctx,cardPolicyById(app.ctx,p.cardId),p.maxIntervalDays,p.expectedRevision);
    },
    "policy.deck.set": (p) =>
      call("deck.reviewPolicy.save", stored(p, { deckId: "deck_id" })),
    "assessment.target.set": (p) => call("assessment.policy.save", stored(p)),
    "exchange.preview": (p) =>
      clean(
        call("import.preview", {
          package: ExchangePackageCodec.decode(p.package),
          options: p.options,
        }),
      ) as never,
    "exchange.commit": (p) =>
      clean(
        call("import.commit", {
          package: ExchangePackageCodec.decode(p.package),
          options: p.options,
          expected: p.expected,
        }),
      ) as never,
    "media.remove": () => { throw new ProtocolError("METHOD_RETIRED", "请在卡片编辑器保存图片变更"); },
    "media.import": () => { throw new ProtocolError("METHOD_RETIRED", "请在卡片编辑器导入图片"); },
    "media.paste": () => { throw new ProtocolError("METHOD_RETIRED", "请在卡片编辑器粘贴图片"); },
    "trash.preview": (p) => call("trash.preview", p),
    "operation.status": (p) => {
      if (!Object.hasOwn(registry, p.method))
        throw new ProtocolError("METHOD_UNSUPPORTED", "未定义的方法");
      const definition = registry[p.method as Method];
      if (definition.effect === "query")
        throw new ProtocolError("VALIDATION_ERROR", "只核验有副作用的操作");
      const payload = definition.input.parse(p.payload);
      const digest = createHash("sha256").update(canonical({ method: p.method, payload })).digest("hex");
      const receipt = store.getReceipt(p.requestId);
      const operation = app.ctx.db.prepare("SELECT * FROM platform_operations WHERE epoch=? AND request_id=?").get(store.epoch(), p.requestId) as any;
      const record = receipt ?? operation;
      if (record && (record.method !== p.method || record.digest !== digest))
        throw new ProtocolError("IDEMPOTENCY_CONFLICT", "请求编号与原操作不一致");
      if (receipt) return { state: "committed", response: clean(receipt.response) } as never;
      return { state: operation?.state === "pending" ? "pending" : operation?.state === "rejected" ? "rejected" : "unknown", response: null } as never;
    },
    "maintenance.operations": () =>
      clean(
        app.ctx.db
          .prepare(
            "SELECT request_id AS requestId,method,created_at AS createdAt FROM platform_operations p WHERE epoch=? AND state='pending' AND NOT EXISTS(SELECT 1 FROM protocol_receipts r WHERE r.request_id=p.request_id AND r.epoch=p.epoch) ORDER BY created_at DESC LIMIT 100",
          )
          .all(store.epoch()),
      ) as never,
    "maintenance.operation.resolve": (p) => {
      const result = app.ctx.db
        .prepare(
          "UPDATE platform_operations SET state='acknowledged' WHERE epoch=? AND request_id=? AND state='pending'",
        )
        .run(store.epoch(), p.requestId);
      if (!result.changes)
        throw new ProtocolError("OPERATION_NOT_PENDING", "操作不在待核对状态");
      app.ctx.db
        .prepare("INSERT INTO audits(action,detail,created_at) VALUES(?,?,?)")
        .run(
          "人工核对系统操作",
          JSON.stringify(p),
          app.ctx.now().toISOString(),
        );
      return true;
    },
  };
  // The single public registry advertises only actual bindings, including platform coordinators.
  for (const method of Object.keys(platform) as Method[]) {
    // Retired network/configuration methods must never replace their rejection handlers.
    if (method === "ai.analyze" || method === "ai.config.save") continue;
    (handlers as Record<string, unknown>)[method] = () => {
      throw new ProtocolError(
        "ASYNC_COORDINATOR_REQUIRED",
        "异步方法需要协调器",
      );
    };
  }
  const translate = (e: unknown) => {
    if (e instanceof ProtocolError) return e;
    if (e instanceof DomainError)
      return new ProtocolError(
        e.code,
        e.message,
        "rejected",
        e.retryable,
        Object.entries(e.fieldErrors).map(([path, message]) => ({
          path,
          message,
        })),
      );
    if (e instanceof Error && "transactionOutcome" in e)
      return new ProtocolError(
        "COMMIT_UNKNOWN",
        "提交状态未知，请查询原回执",
        "unknown",
        true,
      );
    if (e instanceof Error && !("errcode" in e) && !("code" in e))
      return new ProtocolError("OPERATION_REJECTED", e.message);
    return new ProtocolError("INTERNAL_ERROR", "数据操作失败");
  };
  const hash = (s: string) => createHash("sha256").update(s).digest("hex");
  const host = createHost(store, handlers, hash, translate, runtimeGuard);
  const executeLocal = (raw: unknown, text?: string) => executeCardExchange(app.ctx,()=>executeKnowledgeMedia(app.ctx,()=>cardClipboard
    ? cardClipboard.execute(() => host.execute(raw), text) : host.execute(raw)));
  const pending = new Map<
    string,
    { digest: string; promise: Promise<Response> }
  >();
  const execute = async (raw: unknown): Promise<Response> => {
    // The synchronous host is also the authoritative validator for unsupported and ordinary methods.
    try {
      assertWireValue(raw);
    } catch {
      return executeLocal(raw);
    }
    const request = (
      await import("../../shared/protocol/registry.ts")
    ).RequestSchema.safeParse(raw);
    if(request.success && ['ai.analyze','ai.config.save'].includes(request.data.method)) return executeLocal(raw);
    if (request.success && request.data.method === 'card.clipboard.apply' && cardClipboard) {
      const p = request.data;
      try {
        runtimeGuard();
        if (p.protocol.major !== 2 || p.protocol.minor !== 0 || p.dataEpoch !== store.epoch() ||
            !registry['card.clipboard.apply'].input.safeParse(p.payload).success)
          return executeLocal(raw);
      } catch { return executeLocal(raw); }
      // A committed request replays independently of later clipboard contents or OS failures.
      if (store.getReceipt(request.data.requestId)) return executeLocal(raw);
      try { return executeLocal(raw, await cardClipboard.readPaste()); }
      catch (e) {
        const error = translate(e);
        return { ok: false, requestId: request.data.requestId, dataEpoch: store.epoch(), error: {
          code: error.code, message: error.message, outcome: error.outcome, retryable: error.retryable, fieldErrors: error.fieldErrors,
        } };
      }
    }
    if (!request.success || !Object.hasOwn(platform, request.data.method))
      return executeLocal(raw);
    const req = request.data;
    let active = store;
    let started = false;
    try {
      runtimeGuard();
      if (req.protocol.major !== 2 || req.protocol.minor !== 0)
        throw new ProtocolError("CONTRACT_UNSUPPORTED", "不支持的协议版本");
      if (req.dataEpoch !== store.epoch())
        throw new ProtocolError("DATA_EPOCH_CHANGED", "数据代次已变化");
      const method = req.method as Method,
        definition = registry[method],
        input = definition.input.parse(req.payload),
        digest = hash(canonical({ method, payload: input }));
      const previous = store.getReceipt(req.requestId);
      if (previous) {
        if (previous.digest !== digest || previous.method !== method)
          throw new ProtocolError("IDEMPOTENCY_CONFLICT", "请求编号冲突");
        return previous.response;
      }
      const inFlight = pending.get(req.requestId);
      if (inFlight) {
        if (inFlight.digest !== digest)
          throw new ProtocolError("IDEMPOTENCY_CONFLICT", "请求编号冲突");
        return inFlight.promise;
      }
      const durable =
        definition.effect !== "query" && method !== "exchange.preview";
      if (durable) {
        const old = app.ctx.db
          .prepare(
            "SELECT request_id FROM platform_operations WHERE epoch=? AND (request_id=? OR (method=? AND digest=?)) AND state='pending' AND NOT EXISTS(SELECT 1 FROM protocol_receipts r WHERE r.request_id=platform_operations.request_id AND r.epoch=platform_operations.epoch)",
          )
          .get(store.epoch(), req.requestId, method, digest);
        if (old)
          throw new ProtocolError(
            "OPERATION_UNKNOWN",
            "上次系统操作结果未知，请核对文件或数据后处理，禁止自动重复执行",
            "unknown",
          );
        app.ctx.db
          .prepare(
            "INSERT INTO platform_operations VALUES(?,?,?,?,'pending',?)",
          )
          .run(
            req.requestId,
            store.epoch(),
            method,
            digest,
            new Date().toISOString(),
          );
      }
      const promise = (async () => {
        started = durable;
        const result = await platform[method]!(input, req.requestId);
        active = currentStore?.() ?? store;
        const data = definition.output.parse(clean(result)) as never;
        if (definition.effect === "query")
          return {
            ok: true,
            requestId: req.requestId,
            dataEpoch: active.epoch(),
            dataRevision: active.revision(),
            data,
          } as Response;
        return active.atomic(() => {
          const reply: Response = {
            ok: true,
            requestId: req.requestId,
            dataEpoch: active.epoch(),
            dataRevision: active.bumpRevision(),
            data,
          };
          active.putReceipt(req.requestId, { method, digest, response: reply });
          const db = currentStore ? undefined : app.ctx.db;
          if (db && durable)
            db.prepare(
              "UPDATE platform_operations SET state='completed' WHERE request_id=?",
            ).run(req.requestId);
          return reply;
        });
      })();
      pending.set(req.requestId, { digest, promise });
      try {
        return await promise;
      } finally {
        pending.delete(req.requestId);
      }
    } catch (e) {
      active = currentStore?.() ?? active;
      let knownRejected = false;
      if (
        started &&
        e instanceof DomainError &&
        ((req.method === "card.exchange.save" && e.code === "CARD_EXPORT_REJECTED") ||
          (req.method === "knowledge.md.export.save" && e.code === "MARKDOWN_EXPORT_REJECTED") ||
          (req.method === "exchange.collection.import" &&
          e.code === "COLLECTION_IMPORT_REJECTED") ||
          (["media.import", "media.paste", "media.stage"].includes(
            req.method,
          ) &&
            ["IMAGE_DECODER_UNAVAILABLE", "MEDIA_REJECTED"].includes(e.code)))
      ) {
        try {
          app.ctx.db
            .prepare(
              "UPDATE platform_operations SET state='rejected' WHERE request_id=? AND state='pending'",
            )
            .run(req.requestId);
          knownRejected = true;
        } catch {}
      }
      const error =
        started && !knownRejected
          ? new ProtocolError(
              "OPERATION_UNKNOWN",
              "系统操作结果待核对。请在设置中查看待核对操作，并检查数据或导出文件后处理。",
              "unknown",
              false,
            )
          : translate(e);
      return {
        ok: false,
        requestId: req.requestId,
        dataEpoch: active.epoch(),
        error: {
          code: error.code,
          message: error.message,
          outcome: error.outcome,
          retryable: error.retryable,
          fieldErrors: error.fieldErrors,
        },
      };
    }
  };
  return { execute, executeSync: executeLocal, store };
}
