import { assertLegacyMutation } from './modules/cards-unified/ownership.ts';
import { APPLICATION_VERSION } from "./infrastructure/app-version.ts";
import { dueEligibility } from "./modules/review/due-eligibility.ts";
import { saveAssessmentPolicy } from "./modules/assessment/policy.ts";
import { saveFilter, deleteFilter } from "./modules/filters.ts";
import {
  saveReviewPolicy,
  saveDeckReviewPolicy,
  deckReviewPolicy,
} from "./modules/review/policy.ts";
import { cardReviewStats } from "./modules/review/analytics.ts";
import { submitReliableReview } from "./modules/review/workflow.ts";
import {
  saveSession,
  deleteSession,
  sessionPort,
} from "./modules/sessions/service.ts";
import { SCHEMA_VERSION } from "./infrastructure/database.ts";
import { saveMap } from "./modules/knowledge/map.ts";
import { previewTrash, manageTrash } from "./modules/trash.ts";
import { rmSync } from "node:fs";
import { join, basename } from "node:path";
import { bulkCards } from "./modules/cards.ts";
import { importCollection } from "./modules/imports/collection.ts";
import { exportDeck } from "./modules/export.ts";
import { saveFolder, folderAction } from "./modules/folders.ts";
import { saveDeck, deckAction } from "./modules/decks.ts";
import { transaction } from "./infrastructure/database.ts";
import {
  all,
  one,
  run,
  audit,
  type Context,
} from "./infrastructure/context.ts";
import * as knowledge from "./modules/knowledge/service.ts";
import * as questions from "./modules/questions/service.ts";
import { ENGINE as ALGORITHM_VERSION } from "./modules/review/fsrs.ts";
import { saveMemory, memoryAction } from "./modules/memory/service.ts";
import {
  previewImport,
  commitImport,
  importBatches,
} from "./modules/imports/service.ts";
export class Application {
  public ctx: Context;
  constructor(ctx: Context) {
    this.ctx = ctx;
  }
  snapshot(options?: {
    sections: string[];
    deckId: string | null;
    offset?: number;
    limit?: number;
  }) {
    const ctx = this.ctx;
    const sections = options?.sections;
    let pageHasMore = false;
    const paged = options?.limit !== undefined;
    const read = <T>(section: string, load: () => T, empty: T): T =>
      !sections || sections.includes(section) ? load() : empty;
    const query = (
      ctx: Context,
      sql: string,
      ...params: import("node:sqlite").SQLInputValue[]
    ) => {
      const deck = options?.deckId;

      let clause = "";
      if (/FROM questions q\b/.test(sql)) clause = "q.module=?";
      else if (/FROM attempts a\b/.test(sql))
        clause = "a.question_id IN (SELECT id FROM questions WHERE module=?)";
      else if (/FROM memory_cards m\b/.test(sql)) clause = "m.module=?";
      else if (/FROM memory_reviews\b/.test(sql))
        clause = "card_id IN (SELECT id FROM memory_cards WHERE module=?)";
      else if (/FROM knowledge\b/.test(sql) && !sql.includes("WHERE"))
        clause = "module=?";
      if (deck && clause && !sql.includes(" WHERE ")) {
        const point = sql.search(/ ORDER BY| LIMIT /);
        sql =
          point < 0
            ? sql + " WHERE " + clause
            : sql.slice(0, point) + " WHERE " + clause + sql.slice(point);
        params.push(deck);
      }
      if (
        paged &&
        !/FROM (question_knowledge|assets|memory_knowledge)\b/.test(sql)
      ) {
        const rows = all(
          ctx,
          "SELECT * FROM (" + sql + ") LIMIT ? OFFSET ?",
          ...params,
          (options!.limit ?? 20) + 1,
          options!.offset ?? 0,
        );
        if (rows.length > (options!.limit ?? 20)) {
          pageHasMore = true;
          rows.pop();
        }
        return rows;
      }
      return all(ctx, sql, ...params);
    };
    const links = query(ctx, "SELECT * FROM question_knowledge"),
      assets = query(ctx, "SELECT * FROM assets ORDER BY sort_order");
    const snapshot = {
      reviewPolicies: read(
        "policies",
        () => query(ctx, "SELECT * FROM card_review_policies"),
        [],
      ),
      assessmentPolicies: read(
        "policies",
        () => query(ctx, "SELECT * FROM question_assessment_policies"),
        [],
      ),
      deckAssessmentPolicies: read(
        "policies",
        () => query(ctx, "SELECT * FROM deck_assessment_policies"),
        [],
      ),
      deckReviewPolicies: read(
        "policies",
        () =>
          query(ctx, "SELECT id FROM decks").map((d) =>
            deckReviewPolicy(ctx, d.id),
          ),
        [],
      ),
      folders: read(
        "catalog",
        () => query(ctx, "SELECT * FROM folders ORDER BY sort_order,name"),
        [],
      ),
      scheduling: read(
        "policies",
        () => query(ctx, "SELECT * FROM scheduling"),
        [],
      ),
      scheduleEvents: read(
        "history",
        () =>
          query(
            ctx,
            "SELECT * FROM schedule_events ORDER BY created_at DESC,rowid DESC",
          ),
        [],
      ),
      sessions: read(
        "sessions",
        () => query(ctx, "SELECT * FROM study_sessions"),
        [],
      ),
      savedFilters: read(
        "sessions",
        () => query(ctx, "SELECT * FROM saved_filters"),
        [],
      ),
      decks: read(
        "catalog",
        () => query(ctx, "SELECT * FROM decks ORDER BY sort_order,name"),
        [],
      ),
      knowledge: read(
        "knowledge",
        () => query(ctx, "SELECT * FROM knowledge ORDER BY module,name"),
        [],
      ),
      relations: read(
        "knowledge",
        () => query(ctx, "SELECT * FROM relations"),
        [],
      ),
      questions: read(
        "content",
        () =>
          query(
            ctx,
            `SELECT q.*,coalesce(m.content,'') AS material, p.due_at,p.interval_days,p.mastery,coalesce(p.paused,0) AS paused,p.reason FROM questions q LEFT JOIN materials m ON m.id=q.material_id LEFT JOIN plans p ON p.question_id=q.id ORDER BY q.created_at DESC`,
          ).map((q) => ({
            ...q,
            knowledge_ids: links
              .filter((l) => l.question_id === q.id)
              .map((l) => l.knowledge_id),
            assets: assets.filter((a) => a.question_id === q.id),
          })),
        [],
      ),
      attempts: read(
        "history",
        () =>
          query(
            ctx,
            `SELECT a.*,a.elapsed_value AS elapsed_seconds,coalesce((SELECT group_concat(DISTINCT f.category) FROM attempt_faults f WHERE f.attempt_id=a.id),'') AS faults,coalesce((SELECT group_concat(DISTINCT f.knowledge_snapshot) FROM attempt_faults f WHERE f.attempt_id=a.id),'') AS knowledge_names,coalesce((SELECT group_concat(DISTINCT f.knowledge_id) FROM attempt_faults f WHERE f.attempt_id=a.id),'') AS error_knowledge_ids FROM attempts a ORDER BY a.created_at DESC,a.rowid DESC`,
          ),
        [],
      ),
      analyses: read(
        "knowledge",
        () => query(ctx, "SELECT * FROM analyses ORDER BY created_at DESC"),
        [],
      ),
      memories: read(
        "content",
        () =>
          query(
            ctx,
            `SELECT m.*,p.due_at,p.mastery,p.interval_days,p.paused,p.reason FROM memory_cards m LEFT JOIN memory_plans p ON m.id=p.card_id ORDER BY m.created_at DESC`,
          ).map((m) => ({
            ...m,
            knowledge_ids: query(
              ctx,
              "SELECT knowledge_id FROM memory_knowledge WHERE card_id=?",
              m.id,
            ).map((l) => l.knowledge_id),
          })),
        [],
      ),
      memoryReviews: read(
        "history",
        () =>
          query(
            ctx,
            "SELECT * FROM memory_reviews ORDER BY created_at DESC,rowid DESC",
          ),
        [],
      ),
      archives: read(
        "exchange",
        () =>
          query(
            ctx,
            "SELECT * FROM knowledge_archives ORDER BY created_at DESC,rowid DESC",
          ),
        [],
      ),
      importEntries: read(
        "exchange",
        () => query(ctx, "SELECT * FROM import_entries"),
        [],
      ),
      importBatches: read(
        "exchange",
        () => {
          const rows = importBatches(ctx);
          if (!paged) return rows;
          const offset = options?.offset ?? 0,
            limit = options?.limit ?? 20;
          if (rows.length > offset + limit) pageHasMore = true;
          return rows.slice(offset, offset + limit);
        },
        [],
      ),
      audits: read(
        "audits",
        () => query(ctx, "SELECT * FROM audits ORDER BY id DESC LIMIT 100"),
        [],
      ),
      settings: {
        ...JSON.parse(
          one(ctx, "SELECT value FROM settings WHERE key='review'").value,
        ),
        algorithm: ALGORITHM_VERSION,
        studyTimezone: String(
          one(ctx, "SELECT value FROM settings WHERE key='studyTimezone'")
            ?.value ?? "Asia/Shanghai",
        ),
      },
      meta: {
        schemaVersion: Number(ctx.db.prepare('PRAGMA user_version').get()!.user_version),
        appVersion: APPLICATION_VERSION,
        dataPath: ctx.dataDir,
        ...(paged
          ? {
              pageHasMore,
              dataRevision: Number(
                one(ctx, "SELECT revision FROM protocol_meta WHERE singleton=1")
                  ?.revision ?? 0,
              ),
            }
          : {}),
      },
    };
    for (const [kind,rows] of [['question',snapshot.questions],['memory',snapshot.memories]] as const)
      for(const card of rows) card.due_at=dueEligibility(ctx,kind,card.id).effectiveDue;
    return snapshot;
  }
  handle(command: string, p: any = {}) {
    assertLegacyMutation(this.ctx,command,p);
    if (command === "trash.preview") return previewTrash(this.ctx, p);
    if (command === "trash.manage") {
      const result = transaction(this.ctx.db, () => manageTrash(this.ctx, p));
      let attachmentCleanupPending = 0;
      for (const name of result.attachments) {
        try {
          if (basename(name) !== name) throw new Error("附件文件名不合法");
          rmSync(join(this.ctx.dataDir, "attachments", name), { force: true });
        } catch {
          attachmentCleanupPending++;
        }
      }
      return { count: result.count, attachmentCleanupPending };
    }
    if (command === "deck.package")
      return exportDeck(this.ctx, p.id, p.cardIds);
    if (command === "card.reviewStats") return cardReviewStats(this.ctx, p);
    if (command === "snapshot") return this.snapshot();
    if (command === "insight") return this.insight(p.id);
    if (command === "import.preview")
      return previewImport(this.ctx, p.package, p.options);
    if (command === "import.commit")
      return commitImport(this.ctx, p.package, p.options, p.expected);
    const handlers: Record<string, () => any> = {
      "assessment.policy.save": () => saveAssessmentPolicy(this.ctx, p),
      "deck.reviewPolicy.save": () => saveDeckReviewPolicy(this.ctx, p),
      "card.reviewPolicy.save": () => saveReviewPolicy(this.ctx, p),
      "cards.bulk": () => bulkCards(this.ctx, p),
      "folder.save": () => saveFolder(this.ctx, p),
      "folder.action": () => folderAction(this.ctx, p),
      "session.save": () => saveSession(this.ctx, p),
      "session.delete": () => deleteSession(this.ctx, p),
      "filter.save": () => saveFilter(this.ctx, p),
      "filter.delete": () => deleteFilter(this.ctx, p),
      "question.note": () => {
        questions.saveProjectNote(this.ctx, p);
        return true;
      },
      "collection.import": () => importCollection(this.ctx, p),
      "deck.save": () => saveDeck(this.ctx, p),
      "deck.action": () => deckAction(this.ctx, p),
      "knowledge.mapSave": () => saveMap(this.ctx, p),
      "knowledge.save": () => knowledge.saveKnowledge(this.ctx, p),
      "memory.save": () => saveMemory(this.ctx, p),
      "memory.review": () =>
        submitReliableReview(this.ctx, "memory", p, sessionPort(this.ctx)),
      "memory.action": () => memoryAction(this.ctx, p),
      "knowledge.merge": () => knowledge.mergeKnowledge(this.ctx, p),
      "knowledge.delete": () => knowledge.deleteKnowledge(this.ctx, p),
      "knowledge.restore": () => knowledge.restoreKnowledge(this.ctx, p),
      "question.bulkReady": () => questions.bulkReady(this.ctx, p),
      "question.save": () => questions.saveQuestion(this.ctx, p),
      "question.delete": () => questions.deleteQuestion(this.ctx, p),
      "question.restore": () => questions.restoreQuestion(this.ctx, p),
      "plan.set": () => questions.setPlan(this.ctx, p),
      "review.submit": () =>
        submitReliableReview(this.ctx, "question", p, sessionPort(this.ctx)),
      "asset.add": () => questions.addAsset(this.ctx, p),
      "asset.delete": () => questions.deleteAsset(this.ctx, p),
      "settings.save": () => {
        throw new Error("请进入对应卡片集的复盘调度设置，分别保存配置");
      },
    };
    if (!handlers[command]) throw new Error("不支持的操作");
    return transaction(this.ctx.db, handlers[command]);
  }
  insight(kid: string) {
    const ctx = this.ctx;
    const node = one(
      ctx,
      "SELECT * FROM knowledge WHERE id=? AND deleted_at IS NULL",
      kid,
    );
    if (!node) throw new Error("知识点不存在");
    const linked = all(
      ctx,
      `SELECT q.id,q.title FROM questions q JOIN question_knowledge l ON l.question_id=q.id WHERE l.knowledge_id=? AND q.deleted_at IS NULL`,
      kid,
    );
    const evidence = all(
      ctx,
      `SELECT DISTINCT a.id,a.question_id,a.created_at,a.score,a.effective,q.title,f.category,f.detail FROM attempt_faults f JOIN attempts a ON a.id=f.attempt_id JOIN questions q ON q.id=a.question_id WHERE f.knowledge_id=? AND q.deleted_at IS NULL ORDER BY a.created_at DESC LIMIT 30`,
      kid,
    );
    const attempts = all(
      ctx,
      `SELECT a.* FROM attempts a JOIN question_knowledge l ON a.question_id=l.question_id JOIN questions q ON q.id=a.question_id WHERE l.knowledge_id=? AND q.deleted_at IS NULL AND a.effective=1`,
      kid,
    );
    const memories = all(
      ctx,
      "SELECT m.* FROM memory_cards m JOIN memory_knowledge mk ON mk.card_id=m.id WHERE mk.knowledge_id=? AND m.deleted_at IS NULL",
      kid,
    );
    const memoryEvidence = all(
      ctx,
      "SELECT r.*,m.title FROM memory_reviews r JOIN memory_cards m ON m.id=r.card_id JOIN memory_knowledge mk ON mk.card_id=m.id WHERE mk.knowledge_id=? AND m.deleted_at IS NULL ORDER BY r.created_at DESC LIMIT 30",
      kid,
    );
    const categories: Record<string, number> = {};
    const counted = new Set<string>();
    for (const e of evidence) {
      const key = e.id + e.category;
      if (!counted.has(key)) {
        categories[e.category] = (categories[e.category] ?? 0) + 1;
        counted.add(key);
      }
    }
    return {
      node,
      linked,
      memories,
      memoryEvidence,
      evidence,
      verifiedQuestions: new Set(attempts.map((a) => a.question_id)).size,
      effectiveAttempts: attempts.length,
      categories,
      summary: memories.length
        ? `关联 ${memories.length} 条记忆积累，已有 ${memoryEvidence.filter((r) => r.effective).length} 次有效回忆。自评不等同于考试正确率。`
        : attempts.length
          ? `已关联 ${linked.length} 道题，其中 ${new Set(attempts.map((a) => a.question_id)).size} 道有有效复盘。${Object.keys(categories).length ? "出现的具体错因见证据列表。" : "暂无已标记的具体错因；不能仅根据答错推断原因。"}`
          : "待验证：暂无有效复盘，不能据此判断掌握情况。",
      suggestion: memories.length
        ? "按提示主动回忆，对照内容自评，并记录遗忘点。"
        : evidence.length
          ? "先查看重复错因，补充知识卡，再重做对应题目。"
          : "完成一次独立重做，并记录思路和具体错因。",
    };
  }
}
