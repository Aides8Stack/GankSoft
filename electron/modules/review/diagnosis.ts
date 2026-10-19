import { createHash } from "node:crypto";
import { all, one, type Context } from "../../infrastructure/context.ts";
import {
  analyzeEvidence,
  type EvidenceEvent,
} from "../../../shared/review-evidence.ts";
import { diagnosisRule } from "./config-service.ts";
import { RULE_VERSION } from "../../../shared/review-config.ts";
/** Scoped read model. Unknown legacy links never grant retroactive positive credit. */
export function deckDiagnosis(ctx: Context, deckId: string) {
  const rule = diagnosisRule(ctx);
  const now = ctx.now();
  const timezone = String(
    one(ctx, "SELECT value FROM settings WHERE key='studyTimezone'")?.value ??
      "Asia/Shanghai",
  );
  const questions = all(
    ctx,
    "SELECT * FROM questions WHERE module=? AND deleted_at IS NULL ORDER BY id",
    deckId,
  );
  const ks = all(
    ctx,
    "SELECT * FROM knowledge WHERE module=? AND deleted_at IS NULL ORDER BY id",
    deckId,
  );
  const links = all(
    ctx,
    "SELECT l.* FROM question_knowledge l JOIN questions q ON q.id=l.question_id WHERE q.module=?",
    deckId,
  );
  const attempts = all(
    ctx,
    `SELECT a.*,e.knowledge_ids,e.study_timezone,e.practice AS practice_snapshot FROM attempts a JOIN questions q ON q.id=a.question_id LEFT JOIN attempt_evidence_snapshots e ON e.attempt_id=a.id WHERE q.module=? AND q.deleted_at IS NULL AND a.content_version=q.content_version ORDER BY a.created_at,a.id`,
    deckId,
  );
  const faults = all(
    ctx,
    "SELECT f.* FROM attempt_faults f JOIN attempts a ON a.id=f.attempt_id JOIN questions q ON q.id=a.question_id WHERE q.module=?",
    deckId,
  );
  const questionEvents = new Map<string, EvidenceEvent[]>(),
    knowledgeEvents = new Map<string, EvidenceEvent[]>();
  const ancestry = (kid: string) => {
    const ids = new Set<string>();
    let k = ks.find((k) => k.id === kid);
    while (k && !ids.has(k.id)) {
      ids.add(k.id);
      k = ks.find((n) => n.id === k.parent_id);
    }
    return ids;
  };
  const knownCards = new Map(ks.map((k) => [k.id, new Set<string>()]));
  for (const l of links)
    for (const kid of ancestry(l.knowledge_id))
      knownCards.get(kid)?.add(l.question_id);
  let unknownLinkHistoryCount = 0,
    unattributedFailureCount = 0;
  for (const a of attempts) {
    const fs = faults.filter((f) => f.attempt_id === a.id);
    let assessment: any = {};
    try {
      assessment = JSON.parse(a.assessment_snapshot || "{}");
    } catch {}
    const practice =
      a.practice_snapshot === 1 || assessment.contribution === "practice";
    const positive =
      !!a.correct && a.basis === "independent" && a.understanding >= 2;
    const negative =
      a.basis === "independent" && (!a.correct || a.understanding < 2);
    const event: EvidenceEvent = {
      id: a.id,
      cardId: a.question_id,
      at: a.created_at,
      timezone: a.study_timezone ?? timezone,
      independent: a.basis === "independent",
      positive,
      negative,
      practice,
      credit: 1,
      faults: fs.map((f) => f.category),
    };
    questionEvents.set(a.question_id, [
      ...(questionEvents.get(a.question_id) ?? []),
      event,
    ]);
    const snapshot: string[] | null = a.knowledge_ids
      ? JSON.parse(a.knowledge_ids)
      : null;
    if (!snapshot) unknownLinkHistoryCount++;
    const attributable = [
      ...new Set(fs.map((f) => f.knowledge_id).filter(Boolean)),
    ] as string[];
    if (negative && !attributable.length) unattributedFailureCount++;
    const ids = negative
      ? attributable
      : positive && !practice
        ? (snapshot ?? [])
        : [];
    const unique = [...new Set(ids)].filter((kid) =>
      knownCards.get(kid)?.has(a.question_id),
    );
    const contributions = new Map<string, number>();
    for (const kid of unique)
      for (const parent of ancestry(kid))
        contributions.set(
          parent,
          Math.min(
            1,
            (contributions.get(parent) ?? 0) + 1 / Math.max(1, unique.length),
          ),
        );
    for (const [kid, credit] of contributions)
      knowledgeEvents.set(kid, [
        ...(knowledgeEvents.get(kid) ?? []),
        { ...event, credit },
      ]);
  }
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        questions: questions.map((q) => [q.id, q.content_version]),
        links,
        attempts,
        faults,
        rule,
        timezone,
      }),
    )
    .digest("hex");
  return {
    ruleVersion: RULE_VERSION,
    ruleRevision: rule.revision,
    calculatedAt: now.toISOString(),
    timezone,
    dataRevision: fingerprint,
    unknownLinkHistoryCount,
    unattributedFailureCount,
    questions: questions.map((q) => ({
      cardId: q.id,
      ...analyzeEvidence(questionEvents.get(q.id) ?? [], now, rule.rule),
    })),
    knowledge: ks.map((k) => ({
      knowledgeId: k.id,
      name: k.name,
      parentId: k.parent_id,
      ...analyzeEvidence(
        knowledgeEvents.get(k.id) ?? [],
        now,
        rule.rule,
        knownCards.get(k.id)?.size ?? 0,
        true,
      ),
    })),
  };
}
