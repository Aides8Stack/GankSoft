import { dueEligibility } from "./due-eligibility.ts";
import { createHash } from "node:crypto";
import { responseImages } from "../media/drafts.ts";
import {
  evaluateQuestion,
  elapsedSeconds,
  EVALUATION_VERSION,
} from "../../../shared/assessment.ts";
import { assessmentTarget } from "../assessment/policy.ts";
import { DomainError } from "../../../shared/domain-error.ts";
import { validateSelfScore } from "../../../shared/self-assessment.ts";
import { effectiveMaxInterval } from "./policy.ts";
import { questionContentSnapshot } from "../questions/content.ts";
import {
  id,
  text,
  required,
  one,
  all,
  run,
  live,
  audit,
  invalidate,
  type Context,
} from "../../infrastructure/context.ts";
import { advance, schedulingDue, ENGINE as ALGORITHM_VERSION } from "./fsrs.ts";
import { localDay } from "./scoring.ts";
import { FAULTS } from "../../../shared/types.ts";
export function submitReview(ctx: Context, p: any) {
  const q = live(ctx, "questions", p.question_id);
  if (!q.answer) throw new Error("本题缺少正确答案，请在题目详情补充后复盘");
  if (
    p.content_version != null
      ? p.content_version !== q.content_version
      : p.question_version !== q.version
  )
    throw new DomainError(
      "CONTENT_VERSION_CONFLICT",
      "题目在复盘期间已修改，请重新开始本题",
    );
  required(p.thought, "本次做题思路");
  const thought = p.thought as string;
  const basis = required(p.basis, "作答依据");
  if (!["independent", "guess", "remember", "hint"].includes(basis))
    throw new Error("作答依据不合法");
  const answer = text(p.answer).toUpperCase();
  if (!/^[A-D]$/.test(answer)) throw new Error("请选择本次答案");
  const understanding = p.understanding,
    correct = answer === q.answer;
  const selfScore = validateSelfScore(correct, p.self_score);
  const responseAssets = responseImages(ctx, q.module, p.response_images ?? []);
  const now = ctx.now();
  const assessment = evaluateQuestion({
    correct,
    basis: basis as any,
    understanding,
    selfScore,
    elapsedSeconds: elapsedSeconds(p.elapsed_seconds),
    targetSeconds: assessmentTarget(ctx, q.id),
    practice: !!p.practice,
  });
  const score = assessment.grade;
  const last = one(
    ctx,
    "SELECT * FROM attempts WHERE question_id=? AND effective=1 AND content_version=? ORDER BY created_at DESC,rowid DESC LIMIT 1",
    q.id,
    q.content_version,
  );
  const earlyRegression =
    assessment.eligible &&
    score <= 1 &&
    last &&
    last.score >= 2 &&
    localDay(
      new Date(last.created_at),
      String(
        one(ctx, "SELECT value FROM settings WHERE key='studyTimezone'")
          ?.value ?? "Asia/Shanghai",
      ),
    ) ===
      localDay(
        now,
        String(
          one(ctx, "SELECT value FROM settings WHERE key='studyTimezone'")
            ?.value ?? "Asia/Shanghai",
        ),
      ) &&
    now.getTime() > new Date(last.created_at).getTime();
  const eligibility=dueEligibility(ctx,"question",q.id);
  const effective =
    !eligibility.paused && (!eligibility.explicitSnooze || eligibility.eligible) && assessment.eligible &&
    (!last ||
      localDay(
        new Date(last.created_at),
        String(
          one(ctx, "SELECT value FROM settings WHERE key='studyTimezone'")
            ?.value ?? "Asia/Shanghai",
        ),
      ) !==
        localDay(
          now,
          String(
            one(ctx, "SELECT value FROM settings WHERE key='studyTimezone'")
              ?.value ?? "Asia/Shanghai",
          ),
        ) ||
      schedulingDue(ctx, "question", q.id) ||
      !!earlyRegression);
  if (effective)
    assessment.contribution = earlyRegression
      ? "early_regression"
      : "effective";
  else if (assessment.eligible) {
    assessment.contribution = "same_day";
    assessment.reasons.push("同日尚未再次到期的巩固：保存记录，不重复增长排期");
  }
  if (earlyRegression && effective)
    assessment.reasons.push(
      "同日独立表现由成功转为失败，立即重学，不等待原到期日",
    );
  if (eligibility.paused || (eligibility.explicitSnooze && !eligibility.eligible)) {
    assessment.contribution='practice';
    assessment.reasons.push('暂停或显式延期保护：本次仅保存观察，不更新 FSRS');
  }
  const plan = one(ctx, "SELECT * FROM plans WHERE question_id=?", q.id);
  const settings = { maxInterval: effectiveMaxInterval(ctx, "question", q.id) };
  const key = id();
  const result = effective
    ? advance(
        ctx,
        "question",
        q.id,
        score,
        settings.maxInterval,
        key,
        plan?.mastery ?? null,
        {
          evaluationVersion: EVALUATION_VERSION,
        },
      )
    : null;
  const elapsed = assessment.elapsedSeconds;
  run(
    ctx,
    "INSERT INTO attempts(id,question_id,created_at,answer,correct,basis,understanding,score,effective,elapsed_seconds,thought,improvement,mastery_after,algorithm,parameters,question_version,answer_snapshot,content_version,fault_detail,question_snapshot,knowledge_snapshot,self_score) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    key,
    q.id,
    now.toISOString(),
    answer,
    correct ? 1 : 0,
    basis,
    understanding,
    score,
    effective ? 1 : 0,
    elapsed === null ? 0 : Math.round(elapsed),
    thought,
    text(p.improvement),
    result?.mastery ?? null,
    ALGORITHM_VERSION,
    JSON.stringify({
      ...settings,
      selfAssessmentVersion: p.self_score == null ? null : 1,
      evaluationVersion: EVALUATION_VERSION,
      effectiveMaxInterval: result?.maxIntervalDays ?? null,
    }),
    q.version,
    q.answer,
    q.content_version,
    text(p.fault_detail),
    JSON.stringify(
      (() => {
        const s = questionContentSnapshot(ctx, q);
        return { ...s, assets: [...s.assets, ...responseAssets] };
      })(),
    ),
    JSON.stringify(
      (Array.isArray(p.error_knowledge_ids)
        ? [...new Set(p.error_knowledge_ids)]
        : []
      ).map((kid) => {
        const k = live(ctx, "knowledge", kid);
        return { id: k.id, name: k.name };
      }),
    ),
    selfScore,
  );
  run(
    ctx,
    "UPDATE attempts SET elapsed_value=?,elapsed_source=?,assessment_snapshot=? WHERE id=?",
    elapsed === null ? null : Math.round(elapsed),
    elapsed === null ? "missing" : "measured",
    JSON.stringify(assessment),
    key,
  );
  const faults = Array.isArray(p.faults) ? p.faults : [];
  const errorIds: string[] = [
    ...new Set<string>(
      Array.isArray(p.error_knowledge_ids) ? p.error_knowledge_ids : [],
    ),
  ];
  if (errorIds.length && !faults.length)
    throw new Error("标记出错知识点时，请同时选择至少一种错因");
  for (const kid of errorIds) {
    if (live(ctx, "knowledge", kid).module !== q.module)
      throw new Error("出错知识点不属于当前卡片集");
    if (
      !one(
        ctx,
        "SELECT * FROM question_knowledge WHERE question_id=? AND knowledge_id=?",
        q.id,
        kid,
      )
    )
      throw new Error("出错知识点必须关联本题");
  }
  for (const f of faults) {
    if (!(FAULTS as readonly unknown[]).includes(f))
      throw new Error("错因分类不合法");
    for (const kid of errorIds.length ? errorIds : [null]) {
      const k = kid ? live(ctx, "knowledge", kid) : null;
      run(
        ctx,
        "INSERT INTO attempt_faults VALUES (?,?,?,?,?,?)",
        id(),
        key,
        kid,
        k?.name ?? "",
        f,
        text(p.fault_detail),
      );
    }
  }
  const linkedIds=all(ctx,'SELECT knowledge_id FROM question_knowledge WHERE question_id=? ORDER BY knowledge_id',q.id).map(r=>r.knowledge_id);
  run(ctx,'INSERT INTO attempt_evidence_snapshots VALUES (?,?,?,?,?,?)',key,q.module,JSON.stringify(linkedIds),
    createHash('sha256').update(JSON.stringify(linkedIds)).digest('hex'),
    String(one(ctx,"SELECT value FROM settings WHERE key='studyTimezone'")?.value??'Asia/Shanghai'),p.practice?1:0);
  if (result)
    run(
      ctx,
      "INSERT INTO plans VALUES (?,?,?,?,0,?,?) ON CONFLICT(question_id) DO UPDATE SET due_at=excluded.due_at,interval_days=excluded.interval_days,mastery=excluded.mastery,reason=excluded.reason,algorithm=excluded.algorithm",
      q.id,
      result.dueAt,
      result.days,
      result.mastery,
      result.reason,
      ALGORITHM_VERSION,
    );
  invalidate(ctx);
  audit(ctx, "提交复盘", {
    question: q.id,
    attempt: key,
    score,
    effective,
    reason:
      assessment.reasons.join("；") + (result ? "；" + result.reason : ""),
  });
  const reason =
    assessment.reasons.join("；") + (result ? "；" + result.reason : "");
  return {
    attemptId: key,
    selfScore,
    score,
    effective,
    result,
    assessment,
    reason,
  };
}
