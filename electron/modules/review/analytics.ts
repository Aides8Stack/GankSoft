import {
  parseAssessment,
  evidenceSummary,
} from "../../../shared/assessment.ts";
import { assessmentTarget } from "../assessment/policy.ts";
import { memoryModel } from "../assessment/read-model.ts";
import {
  all,
  one,
  required,
  type Context,
} from "../../infrastructure/context.ts";
import type {
  ReviewStatsQuery,
  CardReviewStats,
  ReviewPoint,
} from "../../../shared/review-analytics.ts";
function historicalQuestion(value: string | undefined) {
  if (!value) return null;
  try {
    const q = JSON.parse(value);
    if (
      !q ||
      typeof q.stem !== "string" ||
      typeof q.options !== "string" ||
      typeof q.answer !== "string"
    )
      return null;
    return {
      stem: q.stem,
      options: q.options,
      answer: q.answer,
      analysis: typeof q.analysis === "string" ? q.analysis : "",
      material: typeof q.material === "string" ? q.material : "",
      assets: Array.isArray(q.assets)
        ? q.assets
            .filter(
              (a: any) =>
                a &&
                typeof a.id === "string" &&
                ["question", "analysis", "response"].includes(a.role),
            )
            .map((a: any) => ({ id: a.id, role: a.role }))
        : [],
    };
  } catch {
    return null;
  }
}
/** Read model: never modifies attempts, plans, sessions or review receipts. */
export function cardReviewStats(
  ctx: Context,
  p: ReviewStatsQuery,
): CardReviewStats {
  if (!["question", "memory"].includes(p.kind))
    throw new Error("卡片类型不合法");
  const cardId = required(p.card_id, "卡片 ID"),
    question = p.kind === "question";
  const card = one(
    ctx,
    `SELECT * FROM ${question ? "questions" : "memory_cards"} WHERE id=? AND deleted_at IS NULL`,
    cardId,
  );
  if (!card) throw new Error("卡片不存在或已删除");
  const current = question ? card.content_version : card.learning_version;
  const selected = p.content_version === undefined ? null : p.content_version;
  if (selected !== null && (!Number.isInteger(selected) || selected < 0))
    throw new Error("内容版本不合法");
  const rows = all(
    ctx,
    question
      ? "SELECT * FROM attempts WHERE question_id=? ORDER BY created_at,rowid"
      : "SELECT * FROM memory_reviews WHERE card_id=? ORDER BY created_at,rowid",
    cardId,
  );
  const events = new Map(
    all(
      ctx,
      "SELECT * FROM schedule_events WHERE kind=? AND card_id=?",
      p.kind,
      cardId,
    ).map((e) => [e.id, e]),
  );
  const faults = question
    ? all(
        ctx,
        "SELECT f.* FROM attempt_faults f JOIN attempts a ON a.id=f.attempt_id WHERE a.question_id=?",
        cardId,
      )
    : [];
  const versions = [
    ...new Set<number>([
      current,
      ...rows.map((r) => (question ? r.content_version : r.card_version)),
    ]),
  ].sort((a, b) => b - a);
  if (selected !== null && !versions.includes(selected))
    throw new Error("该卡片没有所选内容版本");
  const previous = new Map<number, number>();
  const records: ReviewPoint[] = rows
    .map((r, i) => {
      const v = question ? r.content_version : r.card_version;
      const score = question ? r.self_score : null;
      const old = previous.get(v);
      const delta =
        r.effective && score != null && old != null
          ? Math.round((score - old) * 10) / 10
          : null;
      if (r.effective && score != null) previous.set(v, score);
      const event = events.get(r.id),
        after = event ? JSON.parse(event.after_state) : null;
      const log = event ? JSON.parse(event.log) : null;
      const fs = faults.filter((f) => f.attempt_id === r.id);
      return {
        id: r.id,
        ordinal: i + 1,
        createdAt: r.created_at,
        contentVersion: v,
        effective: !!r.effective,
        correct: question ? !!r.correct : null,
        answer: question ? r.answer : "",
        question: question ? historicalQuestion(r.question_snapshot) : null,
        correctAnswer: question ? r.answer_snapshot || null : null,
        selfScore: score ?? null,
        selfScoreChange: delta,
        assessment: question ? parseAssessment(r.assessment_snapshot) : null,
        schedulerGrade: r.score,
        mastery: r.mastery_after,
        elapsedSeconds: question ? r.elapsed_value : null,
        elapsedSource: question ? r.elapsed_source : null,
        intervalDays: after?.scheduled_days ?? null,
        dueAt: after?.due ?? null,
        maxIntervalDays: log?.maxIntervalDays ?? null,
        thought: question ? r.thought : r.note,
        faultDetail: question ? r.fault_detail : "",
        faults: [...new Set<string>(fs.map((f) => f.category))],
        knowledgeGaps: [
          ...new Set<string>(
            fs.map((f) => f.knowledge_snapshot).filter(Boolean),
          ),
        ],
        reflection: question ? r.improvement : "",
      };
    })
    .filter((r) => selected === null || r.contentVersion === selected);
  const effective = records.filter((r) => r.effective),
    scored = effective.filter((r) => r.selfScore !== null);
  const sum = (list: ReviewPoint[]) =>
    list.reduce((n, r) => n + (r.selfScore ?? 0), 0);
  const counts = new Map<string, number>();
  for (const r of effective)
    for (const name of r.faults) counts.set(name, (counts.get(name) ?? 0) + 1);
  const latest = scored.at(-1);
  const timed = records.filter((r) => r.elapsedSeconds !== null);
  const totalSeconds = timed.reduce((n, r) => n + r.elapsedSeconds!, 0);
  return {
    kind: p.kind,
    cardId,
    title: card.title,
    currentContentVersion: current,
    selectedVersion: selected,
    versions,
    lifetimeCount: rows.length,
    evidence: question
      ? evidenceSummary(
          rows,
          selected ?? current,
          assessmentTarget(ctx, cardId),
          String(
            one(ctx, "SELECT value FROM settings WHERE key='studyTimezone'")
              ?.value ?? "Asia/Shanghai",
          ),
        )
      : null,
    memoryModel: memoryModel(ctx, p.kind, cardId),
    summary: {
      total: records.length,
      effective: effective.length,
      practice: records.length - effective.length,
      correctRate:
        question && effective.length
          ? Math.round(
              (effective.filter((r) => r.correct).length / effective.length) *
                1000,
            ) / 10
          : null,
      scoredCount: scored.length,
      averageSelfScore: scored.length
        ? Math.round((sum(scored) / scored.length) * 10) / 10
        : null,
      latestSelfScore: latest?.selfScore ?? null,
      selfScoreChange:
        selected !== null ? (latest?.selfScoreChange ?? null) : null,
      totalSeconds,
      timedCount: timed.length,
      averageSeconds: timed.length
        ? Math.round((totalSeconds / timed.length) * 10) / 10
        : null,
      repeatedFaults: [...counts]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    },
    records,
  };
}
