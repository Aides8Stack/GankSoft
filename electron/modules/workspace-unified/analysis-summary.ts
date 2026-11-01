import type { Context } from "../../infrastructure/context.ts";
import type { ExportAnalysisInput } from "../../../shared/protocol/ai-analysis.ts";
import { resolveWindow } from "../analytics/window.ts";
import { calendarDay } from "../../../shared/calendar.ts";
import { currentCardLinks } from "../knowledge-unified/links.ts";
import { currentDue, publishedCard } from "../cards-unified/schedule.ts";
import {
  metricAccumulator,
  addEvent,
  mergeMetrics,
  finishMetrics,
} from "./analytics-metrics.ts";
/** Same W3 metrics with bounded scalar state; history and card bodies never collected. */
export async function analysisSummary(
  ctx: Context,
  p: ExportAnalysisInput,
  checkpoint: () => Promise<void>,
) {
  const db = ctx.db,
    timeZone = String(
      db.prepare("SELECT value FROM settings WHERE key='studyTimezone'").get()
        ?.value ?? "Asia/Shanghai",
    ),
    window = resolveWindow(p.date, ctx.now(), timeZone);
  const nodes = new Map<
    string,
    {
      parent: string | null;
      direct: ReturnType<typeof metricAccumulator>;
      aggregate: ReturnType<typeof metricAccumulator>;
    }
  >();
  let stateBytes = 0;
  for (const n of db
    .prepare(
      "SELECT id,parent_id FROM knowledge WHERE module=? AND deleted_at IS NULL ORDER BY id",
    )
    .iterate(p.deckId)) {
    stateBytes +=
      512 +
      Buffer.byteLength(String(n.id)) +
      Buffer.byteLength(String(n.parent_id ?? ""));
    if (stateBytes > 16 * 1024 * 1024)
      throw Error("知识点统计工作内存超过16MiB预算，请缩小卡片集范围");
    nodes.set(String(n.id), {
      parent: n.parent_id ? String(n.parent_id) : null,
      direct: metricAccumulator(),
      aggregate: metricAccumulator(),
    });
  }
  const total = metricAccumulator(),
    days = new Map<string, ReturnType<typeof metricAccumulator>>();
  let linkedCardCount = 0,
    dueCardCount = 0,
    processed = 0;
  const events = db.prepare(
    "SELECT id,created_at,json_extract(document,'$.scoreTenths') score,json_extract(document,'$.objectiveCorrect') correct,json_extract(document,'$.native.elapsedSeconds') elapsed FROM learning_review_events WHERE card_id=? ORDER BY created_at,id",
  );
  for (const c of db
    .prepare(
      "SELECT id,published_type,legacy_kind,current_version_id FROM learning_cards WHERE deck_id=? AND deleted_at IS NULL ORDER BY id",
    )
    .iterate(p.deckId)) {
    const id = String(c.id),
      m = metricAccumulator(),
      due = currentDue(
        ctx,
        publishedCard(ctx, { cardId: id, deckId: p.deckId }),
      );
    m.cardCount = 1;
    m.cardsByMode[c.published_type as "question" | "qa" | "direct"] = 1;
    const v = db
      .prepare(
        "SELECT json_extract(document,'$.availability') availability,json_extract(document,'$.payload.encoding') encoding FROM learning_content_versions WHERE id=?",
      )
      .get(c.current_version_id)!;
    m.dueCount = Number(
      v.availability === "known" &&
        v.encoding !== "legacy-question-604" &&
        !due.paused &&
        (!due.dueAt || Date.parse(due.dueAt) <= +ctx.now()),
    );
    let ec = 0;
    for (const e of events.iterate(id)) {
      const day = calendarDay(new Date(String(e.created_at)), timeZone);
      if (
        (!window.start || day >= window.start) &&
        (!window.end || day <= window.end)
      ) {
        const event = {
          id: String(e.id),
          created_at: String(e.created_at),
          score: e.score,
          correct: e.correct,
          elapsed: e.elapsed,
        };
        addEvent(m, event);
        if (!days.has(day)) {
          stateBytes += 512;
          if (stateBytes > 16 * 1024 * 1024)
            throw Error("统计工作内存超过16MiB预算");
          days.set(day, metricAccumulator());
        }
        addEvent(days.get(day)!, event);
      }
      if (++ec % 1000 === 0) await checkpoint();
    }
    mergeMetrics(total, m);
    const direct = [
        ...new Set(
          currentCardLinks(ctx, p.deckId, id, c.legacy_kind).filter((n) =>
            nodes.has(n),
          ),
        ),
      ],
      ancestors = new Set(direct);
    for (const n of direct) {
      mergeMetrics(nodes.get(n)!.direct, m);
      let parent = nodes.get(n)!.parent;
      const seen = new Set([n]);
      while (parent) {
        if (seen.has(parent) || !nodes.has(parent))
          throw Error("知识树损坏：循环或缺失祖先");
        seen.add(parent);
        ancestors.add(parent);
        parent = nodes.get(parent)!.parent;
      }
    }
    for (const n of ancestors) mergeMetrics(nodes.get(n)!.aggregate, m);
    if (direct.length) {
      linkedCardCount++;
      dueCardCount += m.dueCount;
    }
    if (++processed % 50 === 0) await checkpoint();
  }
  return {
    window,
    summary: finishMetrics(total),
    knowledgeCount: nodes.size,
    knowledgeSummary: {
      linkedCardCount,
      learnedKnowledgeCount: [...nodes.values()].filter(
        (n) => n.direct.eventCount > 0,
      ).length,
      dueCardCount,
    },
    trend: [...days]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, m]) => ({
        day,
        eventCount: m.eventCount,
        averageScoreTenths: m.gradedCount ? m.scoreSum / m.gradedCount : null,
        elapsedSeconds: m.elapsedSeconds,
      })),
    nodes,
  };
}
