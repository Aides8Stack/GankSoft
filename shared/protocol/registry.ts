import {MediaInsertionScope,MediaInsertionFinish,MediaInsertionStatus} from './media-insertion.ts';
import {PurgeScope,PurgePreview,PurgeCommand,PurgeResult} from './recycle-purge.ts';
import {RecycleImpactInput,RecycleImpact} from './recycle-impact.ts';
import * as independentImport from './merge-import.ts';
import * as mediaLibrary from './media-library.ts';
import * as relocation from './relocation.ts';
import {FullRestorePlan,FullRestoreConfirmation,FullRestoreResult} from './full-backup.ts';
import * as cardExchange from './card-exchange.ts';
import * as cardLifecycle from './card-lifecycle.ts';
import * as workspaceUnified from './workspace-unified.ts';
import * as markdown from './knowledge-markdown.ts';
import * as tree from './knowledge-tree.ts';
import { PromptContext, ClipboardPreview, ClipboardExpectation, ClipboardApply } from './card-transfer.ts';
import * as drafts from './card-draft.ts';
import * as learning from './unified-review.ts';
import { QueuePreview } from "../review-read-contract.ts";
import { DeckConfig, KnowledgePreference, ConfigView, DiagnosisRule } from "../review-config.ts";
import { StudyFilters } from "../study-query.ts";
import { z } from "zod";
import {
  DateSelection,
  ThemeMode,
  Preferences,
  Message,
} from "../workspace-contracts.ts";
import * as d from "./data.ts";
import * as unified from "./unified.ts";
import {
  KnowledgeInsightCodec,
  SnapshotCodec,
  ReviewResultCodec,
  CardReviewStatsCodec,
  DeckInsightsCodec,
  CollectionStatisticsCodec,
  ExchangePackageCodec,
} from "./models.ts";
function define<I extends z.ZodType, O extends z.ZodType>(
  module: string,
  effect: "query" | "command" | "maintenance",
  input: I,
  output: O,
) {
  return Object.freeze({ module, effect, input, output });
}
const optId = d.Id.optional();
const idInput = z.strictObject({ id: d.Id });
const mutation = { id: optId, expectedRevision: d.Revision.optional() };
const text = d.Text.default("");
const Scope = z.enum([
  "catalog",
  "content",
  "history",
  "knowledge",
  "sessions",
  "policies",
  "exchange",
  "audits",
]);
export const WorkspaceResult = SnapshotCodec.wire;
const Items = z
  .array(
    z.strictObject({
      kind: z.enum(["folder", "deck", "question", "memory", "knowledge"]),
      id: d.Id,
    }),
  )
  .min(1)
  .max(10000);
const JsonObject = z.record(z.string(), z.json());
export const ImportOptions = z.strictObject({
  targetDeckId: d.Id,
  mapping: z.record(z.string(), d.Id).default({}),
  excludedKeys: z.array(z.string()).default([]),
  allowKnowledgeUpdates: z.boolean().default(false),
  allowItemUpdates: z.boolean().default(false),
  remapExisting: z.boolean().default(false),
});
const Preview = z.strictObject({
  packageId: z.string(),
  namespace: z.string(),
  checksum: z.string(),
  revision: z.string(),
  alreadyImported: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  nodes: z.array(JsonObject),
  items: z.array(JsonObject),
  mapping: z.record(z.string(), z.string()),
  counts: z.record(z.string(), z.number()),
});
export const PublicDraft = d.Draft.safeExtend({
  skippedCount: d.Revision.default(0),
});
const SessionInput = z.strictObject({
  deckId: d.Id,
  expectedRevision: d.Revision,
  draft: PublicDraft,
  replace: z.boolean().default(false),
});
const PublicReview = ReviewResultCodec.wire;
const PolicyKind = z.enum(["question","memory","card"]);
export const registry = Object.freeze({
  "recycle.native.purge.preview": define("content","query",PurgeScope,PurgePreview),
  "recycle.native.purge": define("content","command",PurgeCommand,PurgeResult),
  "recycle.native.preview": define("content","query",RecycleImpactInput,RecycleImpact),
  "card.exchange.preview": define('exchange','query',cardExchange.ExportCards,cardExchange.CardExportPreview),
  "card.exchange.save": define('exchange','command',cardExchange.ExchangeToken,cardExchange.ExchangeSaved),
  "card.exchange.open": define('exchange','query',z.strictObject({}),cardExchange.CardImportPreview.nullable()),
  "card.exchange.import": define('exchange','command',cardExchange.ImportCards,cardExchange.ImportedCards),
  "card.batch.apply": define("content","command",cardLifecycle.BatchCards,cardLifecycle.CardsChanged),
  "card.recycle.list": define("content","query",cardLifecycle.RecycleCardsInput,cardLifecycle.RecycleCardsPage),
  "card.recycle.restore": define("content","command",cardLifecycle.RestoreCards,cardLifecycle.CardsChanged),
  "knowledge.md.source.text": define("knowledge","query",markdown.StageMarkdownText,markdown.MarkdownSource),
  "knowledge.md.source.clipboard": define("knowledge","query",tree.TreeScope,markdown.MarkdownSource),
  "knowledge.md.source.open": define("knowledge","query",tree.TreeScope,markdown.MarkdownSource.nullable()),
  "knowledge.md.source.headings": define("knowledge","query",markdown.MarkdownHeadings,markdown.MarkdownHeadingsPage),
  "knowledge.md.import.preview": define("knowledge","query",markdown.ImportMarkdown,markdown.MarkdownImportPreview),
  "knowledge.md.import.page": define("knowledge","query",markdown.MarkdownPage,markdown.MarkdownImportPreview),
  "knowledge.md.import.diff": define("knowledge","query",markdown.MarkdownDiff,markdown.MarkdownDiffView),
  "knowledge.md.import.confirm": define("knowledge","command",markdown.ConfirmMarkdownImport,markdown.MarkdownImportResult),
  "knowledge.md.export.preview": define("knowledge","query",markdown.ExportMarkdown,markdown.MarkdownExportPreview),
  "knowledge.md.export.copy": define("knowledge","query",markdown.UseMarkdownExport,z.boolean()),
  "knowledge.md.export.save": define("knowledge","command",markdown.UseMarkdownExport,markdown.SaveMarkdownFile),
  "knowledge.merge.preview": define("knowledge","query",tree.MergeNodes,tree.MergePreview),
  "knowledge.merge.confirm": define("knowledge","command",tree.TreeToken,tree.TreeView),
  "knowledge.subtree.delete": define("knowledge","command",tree.DeleteSubtree,z.strictObject({batchId:d.Id,count:d.Revision})),
  "knowledge.recycle.list": define("knowledge","query",tree.TreeScope,z.array(tree.RecycleBatchView).max(500)),
  "knowledge.restore.preview": define("knowledge","query",tree.RestoreNodes,tree.RestorePreview),
  "knowledge.restore.confirm": define("knowledge","command",tree.TreeToken,tree.TreeView),
  "knowledge.tree.read": define("knowledge","query",tree.TreeScope,tree.TreeView),
  "knowledge.tree.layer": define("knowledge","query",tree.TreeLayerQuery,tree.TreeLayer),
  "knowledge.tree.locate": define("knowledge","query",tree.TreeLocateQuery,tree.TreePath),
  "knowledge.tree.apply": define("knowledge","command",tree.ApplyTree,tree.TreeView),
  "knowledge.node.create": define("knowledge","command",tree.CreateNode,tree.NodeBody),
  "knowledge.node.read": define("knowledge","query",tree.NodeScope,tree.NodeBody),
  "knowledge.node.save": define("knowledge","command",tree.SaveNode,tree.NodeBody),
  "knowledge.cardLinks.get": define("knowledge","query",drafts.DraftScope,tree.CardLinks),
  "knowledge.cardLinks.set": define("knowledge","command",tree.SaveCardLinks,tree.CardLinks),
  "learning.queue.preview": define("scheduler","query",learning.LearningQueueInput,learning.LearningQueue),
  "learning.mastery.deck": define("analytics","query",z.strictObject({deckId:d.Id}),learning.DeckMastery),
  "learning.mastery.card": define("analytics","query",drafts.DraftScope,learning.CardMastery),
  "learning.mastery.knowledge": define("analytics","query",z.strictObject({deckId:d.Id,nodeId:d.Id,scope:z.enum(['direct','aggregate'])}),learning.KnowledgeMastery),
  "learning.history.list": define("analytics","query",learning.HistoryInput,learning.HistoryPage),
  "learning.history.get": define("analytics","query",drafts.DraftScope.extend({eventId:d.Id}),unified.ReviewEvent),
  "learning.session.open": define("sessions","command",learning.OpenReviewSession,learning.ReviewSessionView),
  "learning.session.get": define("sessions","query",learning.ReviewSessionScope,learning.ReviewSessionView),
  "learning.session.change": define("sessions","command",learning.ChangeReviewSession,learning.ReviewSessionView),
  "learning.review.submit": define("review","command",learning.CommitReview,unified.ReviewEvent),
  "draft.create": define("content", "command", drafts.DraftCreateInput, drafts.WorkspaceDraft),
  "draft.listSummary": define("content", "query", drafts.DraftListInput, drafts.DraftListPage),
  // A transient OS clipboard operation has no database mutation or durable receipt.
  "card.clipboard.copy": define("content", "query", ClipboardExpectation, z.boolean()),
  "card.clipboard.preview": define("content", "query", ClipboardExpectation, ClipboardPreview),
  "card.clipboard.apply": define("content", "command", ClipboardApply, drafts.DraftFields),
  "card.getPromptContext": define("content", "query", drafts.DraftScope, PromptContext),
  "card.publish": define("content", "command", drafts.PublishInput, drafts.PublishResult),
  "draft.get": define("content", "query", drafts.DraftScope, drafts.WorkspaceDraft.nullable()),
  "draft.discard": define("content", "command", drafts.DraftDiscardInput, drafts.DraftDiscardResult),
  "draft.save": define("content", "command", drafts.DraftSaveInput, drafts.WorkspaceDraft),
  "draft.previewSwitch": define("content", "query", drafts.DraftPreviewInput, drafts.DraftPreview),
  "draft.switchType": define("content", "command", drafts.DraftSwitchInput, drafts.WorkspaceDraft),
  "card.listSummary": define("content", "query", unified.SummaryInput, unified.SummaryPage),
  "card.getPublishedContent": define("content", "query", unified.ContentInput, unified.ContentVersion),
  "content.getVersion": define("content", "query", unified.VersionInput, unified.ContentVersion),
  "app.capabilities": define(
    "system",
    "query",
    d.Empty,
    z.strictObject({
      protocol: z.strictObject({ major: z.literal(2), minor: z.literal(0) }),
      dataEpoch: d.Id,
      supportedMethods: z.array(z.string()),
      definedMethods: z.array(z.string()),
      maxRequestBytes: z.literal(2_000_000),
    }),
  ),
  "workspace.dashboard": define("workspace","query",workspaceUnified.DashboardInput,workspaceUnified.DashboardView),
  "workspace.catalog": define('workspace','query',workspaceUnified.CatalogInput,workspaceUnified.CatalogPage),
  "workspace.recycle.decks": define("catalog","query",workspaceUnified.RecycleDecksInput,workspaceUnified.RecycleDecksPage),
  "workspace.decks.batch": define("catalog","command",workspaceUnified.DeckBatch,workspaceUnified.DeckBatchResult),
  "workspace.catalog.save": define('workspace','command',workspaceUnified.CatalogSave,workspaceUnified.CatalogSaved),
  "workspace.analytics": define('analytics','query',workspaceUnified.AnalyticsInput,workspaceUnified.AnalyticsPage),
  "workspace.sessions": define('workspace','query',workspaceUnified.SessionSummariesInput,workspaceUnified.SessionSummaries),
  "workspace.read": define(
    "workspace",
    "query",
    z.strictObject({
      sections: z.array(Scope).min(1).max(8),
      deckId: d.Id.nullable().default(null),
      offset: d.Revision.default(0),
      limit: z.number().int().min(1).max(100).default(20),
    }),
    WorkspaceResult,
  ),
  "catalog.folder.save": define(
    "catalog",
    "command",
    z.strictObject({
      ...mutation,
      name: d.Name,
      parentId: d.Id.nullable().default(null),
      sortOrder: z.number().int().default(0),
    }),
    d.Id,
  ),
  "catalog.deck.save": define(
    "catalog",
    "command",
    z.strictObject({
      ...mutation,
      name: d.Name,
      kind: d.Kind,
      folderId: d.Id.nullable().default(null),
      sortOrder: z.number().int().default(0),
    }),
    d.Id,
  ),
  "catalog.folder.action": define(
    "catalog",
    "command",
    z.strictObject({
      id: d.Id,
      action: z.enum(["delete", "restore"]),
      cascade: z.boolean().default(false),
    }),
    z.literal(true),
  ),
  "catalog.deck.action": define(
    "catalog",
    "command",
    z.strictObject({
      id: d.Id,
      action: z.enum(["delete", "restore"]),
      cascade: z.boolean().default(false),
    }),
    z.literal(true),
  ),
  "content.question.save": define(
    "content",
    "command",
    z.strictObject({
      ...mutation,
      deckId: d.Id,
      title: z.string().max(300).default(""),
      stem: text,
      options: text,
      answer: z.enum(["", "A", "B", "C", "D"]),
      analysis: text,
      source: text,
      initialThought: text,
      images: z
        .array(
          z.strictObject({ id: d.Id, role: z.enum(["question", "analysis"]) }),
        )
        .max(40)
        .optional(),
      material: text,
      materialId: d.Id.nullable().optional(),
      knowledgeIds: z.array(d.Id).max(500).default([]),
    }),
    d.Id,
  ),
  "content.memory.save": define(
    "content",
    "command",
    z.strictObject({
      ...mutation,
      deckId: d.Id,
      title: d.Name,
      cue: d.Text.min(1),
      content: d.Text.min(1),
      source: text,
      knowledgeIds: z.array(d.Id).max(500).default([]),
    }),
    d.Id,
  ),
  "content.question.note": define(
    "content",
    "command",
    z.strictObject({ id: d.Id, expectedRevision: d.Revision, note: text }),
    z.literal(true),
  ),
  "content.question.delete": define(
    "content",
    "command",
    idInput,
    z.literal(true),
  ),
  "content.question.restore": define(
    "content",
    "command",
    idInput,
    z.literal(true),
  ),
  "content.memory.action": define(
    "content",
    "command",
    z.strictObject({
      id: d.Id,
      action: z.enum(["delete", "restore", "pause", "resume"]),
    }),
    z.literal(true),
  ),
  "content.plan.set": define(
    "scheduler",
    "command",
    z.strictObject({ id: d.Id, action: z.enum(["pause", "resume"]) }),
    z.literal(true),
  ),
  "content.bulk": define(
    "content",
    "command",
    z.strictObject({
      deckId: d.Id,
      ids: z.array(d.Id).min(1).max(5000),
      action: z.enum(["pause", "resume", "delete", "move"]),
      target: d.Id.optional(),
    }),
    z.literal(true),
  ),
  "knowledge.save": define(
    "knowledge",
    "command",
    z.strictObject({
      ...mutation,
      deckId: d.Id,
      name: d.Name,
      parentId: d.Id.nullable().default(null),
      aliases: text,
      principle: text,
      conditions: text,
      method: text,
      traps: text,
    }),
    d.Id,
  ),
  "knowledge.merge": define(
    "knowledge",
    "command",
    z.strictObject({ sourceId: d.Id, targetId: d.Id }),
    d.Id,
  ),
  "knowledge.delete": define(
    "knowledge",
    "command",
    z.strictObject({
      id: d.Id,
      cascade: z.boolean().default(false),
      detach: z.boolean().default(false),
    }),
    z.literal(true),
  ),
  "knowledge.restore": define("knowledge", "command", idInput, z.literal(true)),
  "knowledge.map.save": define(
    "knowledge",
    "command",
    z.strictObject({
      deckId: d.Id,
      nodes: z
        .array(
          z.strictObject({ id: d.Id, name: d.Name, parentId: d.Id.nullable() }),
        )
        .max(5000),
      expected: z.record(z.string(), d.Revision),
    }),
    z.literal(true),
  ),
  "knowledge.insight": define("analytics", "query", idInput, JsonObject),
  "cards.query": define(
    "content",
    "query",
    z.strictObject({ deckId: d.Id, filters: StudyFilters }),
    z.strictObject({
      matched: z.array(d.Id),
      eligible: z.array(
        z.object({
          id: d.Id,
          title: z.string(),
          knowledgeIds: z.array(d.Id),
          paused: z.boolean(),
          ready: z.boolean(),
          dueAt: z.string().nullable(),
          createdAt: z.string().nullable(),
          firstReviewAt: z.string().nullable(),
          lastReviewAt: z.string().nullable(),
          reviewCount: z.number(),
          totalReviews: z.number(),
          failures: z.number(),
          lastFailed: z.boolean(),
          repeated: z.boolean(),
          uncertain: z.boolean(),
        }),
      ),
      window: z.object({
        start: z.string().nullable(),
        end: z.string().nullable(),
        timeZone: z.string(),
      }),
    }),
  ),
  "cards.preflight": define(
    "content",
    "query",
    z.strictObject({
      deckId: d.Id,
      ids: z.array(d.Id).min(1).max(5000),
      includePaused: z.boolean(),
    }),
    z.object({ ids: z.array(d.Id) }),
  ),
  "filters.save": define(
    "filters",
    "command",
    z.strictObject({
      id: optId,
      deckId: d.Id,
      expectedRevision: d.Revision.optional(),
      name: d.Name,
      payload: StudyFilters,
    }),
    d.Id,
  ),
  "filters.delete": define(
    "filters",
    "command",
    z.strictObject({ id: d.Id, deckId: d.Id, expectedRevision: d.Revision }),
    z.literal(true),
  ),
  "session.draft": define(
    "sessions",
    "command",
    SessionInput,
    z.strictObject({ revision: d.Revision }),
  ),
  "session.reveal": define(
    "sessions",
    "command",
    SessionInput,
    z.strictObject({ revision: d.Revision }),
  ),
  "session.advance": define(
    "sessions",
    "command",
    SessionInput,
    z.strictObject({ revision: d.Revision }),
  ),
  "session.restart": define(
    "sessions",
    "command",
    SessionInput,
    z.strictObject({ revision: d.Revision }),
  ),
  "session.skip": define(
    "sessions",
    "command",
    SessionInput,
    z.strictObject({ revision: d.Revision }),
  ),
  "session.finish": define(
    "sessions",
    "command",
    z.strictObject({
      deckId: d.Id,
      sessionId: d.Id,
      expectedRevision: d.Revision,
    }),
    z.literal(true),
  ),
  "review.question.submit": define(
    "review",
    "command",
    d.QuestionAnswer.extend({
      requestId: z.uuid(),
      expectedSessionRevision: d.Revision.optional(),
    }),
    PublicReview,
  ),
  "review.memory.submit": define(
    "review",
    "command",
    d.MemoryAnswer.extend({
      requestId: z.uuid(),
      expectedSessionRevision: d.Revision.optional(),
    }),
    PublicReview,
  ),
  "review.receipt": define(
    "review",
    "query",
    z.strictObject({ requestId: z.uuid() }),
    PublicReview.nullable(),
  ),
  "preferences.get": define("settings", "query", d.Empty, Preferences),
  "preferences.set": define("settings", "command", Preferences, Preferences),
  "messages.list": define("messages", "query", d.Empty, z.array(Message)),
  "messages.append": define(
    "messages",
    "command",
    z.strictObject({
      kind: z.enum(["success", "info", "error"]),
      text: z.string().min(1).max(4000),
    }),
    Message,
  ),
  "messages.read": define(
    "messages",
    "command",
    z.strictObject({ ids: z.array(d.Id).optional() }),
    z.literal(true),
  ),
  "analytics.collection": define(
    "analytics",
    "query",
    DateSelection.safeExtend({ deckId: d.Id }),
    CollectionStatisticsCodec.wire,
  ),
  "analytics.deck": define(
    "analytics",
    "query",
    DateSelection.safeExtend({ deckId: d.Id }),
    DeckInsightsCodec.wire,
  ),
  "analytics.card.timeline": define(
    "analytics",
    "query",
    z.strictObject({ kind: d.Kind, cardId: d.Id }),
    CardReviewStatsCodec.wire,
  ),
  "analytics.card": define(
    "analytics",
    "query",
    z.strictObject({
      kind: d.Kind,
      cardId: d.Id,
      contentVersion: z.uuid().nullable().optional(),
    }),
    CardReviewStatsCodec.wire,
  ),
  "policy.previewQueue": define("scheduler","query",z.strictObject({deckId:d.Id,seed:z.string().max(100).optional(),cardId:d.Id.optional(),diagnosisOffset:d.Revision.default(0)}),QueuePreview),
  "policy.config.preview": define("scheduler","query",z.strictObject({deckId:d.Id,cardId:d.Id.optional(),model:z.literal("unified").optional(),offset:d.Revision.default(0),limit:z.number().int().min(1).max(100).default(50)}),
    z.union([learning.RecomputePreview,z.strictObject({previewToken:z.string(),configRevision:d.Revision,mode:z.literal("advance_existing"),calculatedAt:d.Timestamp,ruleVersion:z.string(),timezone:z.string(),dataRevision:z.string(),total:d.Revision,inheritedCount:d.Revision,overriddenCount:d.Revision,affectedCount:d.Revision,immediateDueCount:d.Revision,skipped:z.record(z.string(),d.Revision),offset:d.Revision,
      rows:z.array(z.strictObject({kind:d.Kind,cardId:d.Id,source:z.string(),maxIntervalDays:z.number(),beforeDue:d.Timestamp.nullable(),afterDue:d.Timestamp.nullable(),reason:z.string()}))})])),
  "policy.config.applyExisting": define("scheduler","command",z.strictObject({previewToken:z.string().max(5000)}),z.strictObject({operationId:d.Id,count:d.Revision})),
  "policy.config.undoExisting": define("scheduler","command",z.strictObject({deckId:d.Id,operationId:d.Id}),z.strictObject({count:d.Revision})),
  "policy.config.get": define("scheduler","query",z.strictObject({deckId:d.Id}),ConfigView),
  "policy.config.save": define("scheduler","command",z.strictObject({deckId:d.Id,expectedRevision:d.Revision,config:DeckConfig}),ConfigView),
  "policy.knowledge.set": define("scheduler","command",z.strictObject({deckId:d.Id,knowledgeId:d.Id,expectedRevision:d.Revision,preference:KnowledgePreference}),z.strictObject({revision:d.Revision})),
  "policy.diagnosis.get": define("scheduler","query",z.strictObject({}),z.strictObject({revision:d.Revision,rule:DiagnosisRule})),
  "policy.diagnosis.save": define("scheduler","command",z.strictObject({expectedRevision:d.Revision,rule:DiagnosisRule}),z.strictObject({revision:d.Revision,rule:DiagnosisRule})),
  "policy.card.get": define("scheduler","query",z.strictObject({kind:PolicyKind,cardId:d.Id}),z.strictObject({deckId:d.Id,kind:PolicyKind,cardId:d.Id,maxIntervalDays:z.number().int(),source:z.enum(['card_override','deck_default']),deck:ConfigView,revision:d.Revision.optional()})),
  "policy.card.set": define(
    "scheduler",
    "command",
    z.strictObject({
      kind: PolicyKind,
      expectedRevision:d.Revision.optional(),
      cardId: d.Id,
      maxIntervalDays: z.number().int().min(1).max(3650).nullable(),
    }),
    z.strictObject({
      adjusted: z.boolean(),
      revision:d.Revision.optional(),
      maxIntervalDays: z.number().int(),
    }),
  ),
  "policy.deck.set": define(
    "scheduler",
    "command",
    z.strictObject({
      deckId: d.Id,
      dailyLimit: z.number().int().min(1).max(200),
      maxIntervalDays: z.number().int().min(1).max(3650),
    }),
    z.strictObject({ adjusted: z.number().int() }),
  ),
  "assessment.target.set": define(
    "assessment",
    "command",
    z.strictObject({
      scope: z.enum(["card", "deck"]),
      id: d.Id,
      mode: z.enum(["inherit", "none", "custom"]).optional(),
      targetSeconds: z.number().int().min(1).max(86400).nullable(),
    }),
    z.strictObject({ targetSeconds: z.number().nullable() }),
  ),
  "exchange.open": define(
    "exchange",
    "maintenance",
    d.Empty,
    z
      .strictObject({
        name: z.string(),
        package: ExchangePackageCodec.wire,
        fileToken: d.Id,
      })
      .nullable(),
  ),
  "exchange.preview": define(
    "exchange",
    "query",
    z.strictObject({
      package: ExchangePackageCodec.wire.optional(),
      fileToken: d.Id.optional(),
      options: ImportOptions,
    }),
    Preview,
  ),
  "exchange.commit": define(
    "exchange",
    "command",
    z.strictObject({
      package: ExchangePackageCodec.wire.optional(),
      fileToken: d.Id.optional(),
      options: ImportOptions,
      expected: z.strictObject({ checksum: z.string(), revision: z.string() }),
    }),
    z.strictObject({ duplicate: z.boolean(), report: JsonObject }),
  ),
  "exchange.collection.describe": define(
    "exchange",
    "query",
    z.strictObject({ fileToken: d.Id }),
    z.strictObject({
      name: d.Name,
      kind: d.Kind,
      items: d.Revision,
      knowledge: d.Revision,
    }),
  ),
  "exchange.collection.import": define(
    "exchange",
    "maintenance",
    z.strictObject({
      fileToken: d.Id,
      name: d.Name,
      folderId: d.Id.nullable(),
    }),
    d.Id,
  ),
  "exchange.deck.export": define(
    "exchange",
    "maintenance",
    z.strictObject({
      id: d.Id,
      cardIds: z.array(d.Id).min(1).max(5000).optional(),
    }),
    z.string().nullable(),
  ),
  "media.stage": define(
    "media",
    "maintenance",
    z.strictObject({
      deckId: d.Id,
      purpose: z.enum(["question", "analysis", "response", "knowledge"]),
      source: z.enum(["file", "clipboard"]),
      insertionId: d.Id.optional(),
    }),
    z.array(z.strictObject({ id: d.Id, mime: z.string() })).max(20),
  ),
  "media.stage.finish": define("media","command",MediaInsertionFinish,MediaInsertionStatus),
  "media.stage.status": define("media","query",MediaInsertionScope,MediaInsertionStatus),
  "media.library.list": define("media","query",mediaLibrary.MediaList,mediaLibrary.MediaPage),
  "media.library.impact": define("media","query",mediaLibrary.MediaTarget,mediaLibrary.MediaImpact),
  "media.library.delete": define("media","command",mediaLibrary.MediaDelete,mediaLibrary.MediaDeleted),
  "media.remove": define("media", "command", idInput, z.literal(true)),
  "media.import": define(
    "media",
    "maintenance",
    z.strictObject({ cardId: d.Id, role: z.enum(["question", "analysis"]) }),
    z.boolean(),
  ),
  "media.paste": define(
    "media",
    "maintenance",
    z.strictObject({ cardId: d.Id, role: z.enum(["question", "analysis"]) }),
    z.boolean(),
  ),
  "trash.preview": define(
    "maintenance",
    "query",
    z.strictObject({ items: Items }),
    z.strictObject({
      counts: z.record(z.string(), z.number()),
      history: d.Revision,
      total: d.Revision,
      revision: z.string(),
    }),
  ),
  "trash.manage": define(
    "maintenance",
    "maintenance",
    z.strictObject({
      items: Items,
      action: z.enum(["restore", "purge"]),
      expected: z.string().optional(),
      name: z.string().optional(),
    }),
    z.strictObject({ count: z.number(), attachmentCleanupPending: z.number() }),
  ),
  "operation.status": define(
    "maintenance",
    "query",
    z.strictObject({ requestId: d.Id, method: z.string().min(1).max(100), payload: z.json() }),
    z.strictObject({ state: z.enum(["committed", "pending", "rejected", "unknown"]), response: z.json().nullable() }),
  ),
  "maintenance.operations": define(
    "maintenance",
    "query",
    d.Empty,
    z
      .array(
        z.strictObject({
          requestId: z.uuid(),
          method: z.string(),
          createdAt: z.string(),
        }),
      )
      .max(100),
  ),
  "maintenance.operation.resolve": define(
    "maintenance",
    "command",
    z.strictObject({
      requestId: z.uuid(),
      note: z.string().trim().min(10).max(1000),
    }),
    z.literal(true),
  ),
  "storage.relocate.info": define("maintenance","query",d.Empty,relocation.RelocationInfo),
  "storage.relocate.open": define("maintenance","query",d.Empty,relocation.RelocationPlan.nullable()),
  "storage.relocate.cancel": define("maintenance","query",z.strictObject({previewId:z.uuid()}),z.literal(true)),
  "storage.relocate.confirm": define("maintenance","maintenance",relocation.RelocationConfirmation,relocation.RelocationStatus),
  "storage.relocate.status": define("maintenance","query",z.strictObject({operationId:z.uuid()}),relocation.RelocationStatus.nullable()),
  "storage.merge.open": define("maintenance","query",d.Empty,independentImport.MergeScanSummary.nullable()),
  "storage.merge.decks": define("maintenance","query",z.strictObject({scanId:z.uuid(),limit:z.number().int().min(1).max(100),cursor:z.string().nullable()}),independentImport.MergeDeckPage),
  "storage.merge.preview": define("maintenance","query",independentImport.MergeSelection,independentImport.MergePlan),
  "storage.merge.cancel": define("maintenance","query",z.strictObject({scanId:z.uuid()}),z.literal(true)),
  "storage.merge.confirm": define("maintenance","maintenance",independentImport.MergeConfirmation,independentImport.MergeResult),
  "storage.merge.status": define("maintenance","query",z.strictObject({operationId:z.uuid()}),independentImport.MergeStatus.nullable()),
  "storage.restore.open": define("maintenance","query",d.Empty,FullRestorePlan.nullable()),
  "storage.restore.cancel": define("maintenance","query",z.strictObject({previewId:z.uuid()}),z.literal(true)),
  "storage.restore.confirm": define("maintenance","maintenance",FullRestoreConfirmation,FullRestoreResult),
  "storage.restore.status": define("maintenance","query",z.strictObject({operationId:z.uuid()}),FullRestoreResult.nullable()),
  "maintenance.backup": define(
    "maintenance",
    "maintenance",
    d.Empty,
    z.string().nullable(),
  ),
  "maintenance.restore": define(
    "maintenance",
    "maintenance",
    d.Empty,
    z.boolean(),
  ),
  "ai.config.get": define(
    "ai",
    "query",
    d.Empty,
    z.strictObject({
      endpoint: z.string(),
      model: z.string(),
      hasKey: z.boolean(),
      unavailable: z.boolean().optional(),
    }),
  ),
  "ai.config.save": define(
    "ai",
    "maintenance",
    z.strictObject({
      endpoint: z
        .string()
        .trim()
        .max(2000)
        .refine((value) => {
          try {
            const u = new URL(value);
            return (
              (u.protocol === "https:" ||
                (u.protocol === "http:" &&
                  ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname))) &&
              !u.username &&
              !u.password &&
              !u.search &&
              !u.hash
            );
          } catch {
            return false;
          }
        }, "请输入HTTPS模型接口地址，或本机HTTP地址；不能带账号或查询参数"),
      model: z.string().trim().min(1, "请填写模型名称").max(200),
      apiKey: z.string().max(2000).default(""),
      clearKey: z.boolean().default(false),
    }),
    z.strictObject({
      endpoint: z.string(),
      model: z.string(),
      hasKey: z.boolean(),
    }),
  ),
  "ai.analyze": define(
    "ai",
    "maintenance",
    z.strictObject({ id: d.Id }),
    z.strictObject({ content: z.string(), stale: z.boolean() }),
  ),
});
export type Method = keyof typeof registry;
export type Input<M extends Method> = z.input<(typeof registry)[M]["input"]>;
export type ParsedInput<M extends Method> = z.output<
  (typeof registry)[M]["input"]
>;
export type Output<M extends Method> = z.output<(typeof registry)[M]["output"]>;
export type Handlers = {
  [M in Method]?: (payload: ParsedInput<M>, context: CallContext) => Output<M>;
};
export interface CallContext {
  requestId: string;
  dataEpoch: string;
}
export interface Request<M extends Method> {
  protocol: typeof d.PROTOCOL;
  requestId: string;
  dataEpoch: string | null;
  method: M;
  payload: Input<M>;
}
export const RequestSchema = z.strictObject({
  protocol: z.strictObject({
    major: z.number().int(),
    minor: z.number().int().nonnegative(),
  }),
  requestId: z.uuid(),
  dataEpoch: d.Id.nullable(),
  method: z.string().min(1).max(100),
  payload: z.json(),
});
export const ErrorSchema = z.strictObject({
  code: z.string(),
  message: z.string(),
  outcome: z.enum(["rejected", "unknown"]),
  retryable: z.boolean(),
  fieldErrors: z.array(
    z.strictObject({ path: z.string(), message: z.string() }),
  ),
});
export const Envelope = z.discriminatedUnion("ok", [
  z.strictObject({
    ok: z.literal(true),
    requestId: z.string().nullable(),
    dataEpoch: d.Id,
    dataRevision: d.Revision,
    data: z.json(),
  }),
  z.strictObject({
    ok: z.literal(false),
    requestId: z.string().nullable(),
    dataEpoch: d.Id,
    error: ErrorSchema,
  }),
]);
export type Response = z.output<typeof Envelope>;
