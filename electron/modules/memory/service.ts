import { dueEligibility } from "../review/due-eligibility.ts";
import { effectiveMaxInterval, clampCardToPolicy } from "../review/policy.ts";
import {
  id,
  text,
  required,
  moduleName,
  deckKind,
  one,
  all,
  run,
  live,
  checkVersion,
  audit,
  invalidate,
  type Context,
} from "../../infrastructure/context.ts";
import { isMemoryModule } from "../../../shared/types.ts";
import {
  advance,
  schedulingDue,
  ENGINE as ALGORITHM_VERSION,
} from "../review/fsrs.ts";
import { localDay } from "../review/scoring.ts";
export function saveMemory(ctx: Context, p: any) {
  const before = p.id
    ? one(
        ctx,
        "SELECT * FROM memory_cards WHERE id=? AND deleted_at IS NULL",
        p.id,
      )
    : null;
  if (p.id && !before) throw new Error("记忆卡不存在");
  if (before) checkVersion(before, p.version);
  const module = moduleName(p.module, ctx);
  if (deckKind(ctx, module) !== "memory")
    throw new Error("请选择记忆积累类卡片集");
  const key = before?.id ?? id(),
    now = ctx.now().toISOString(),
    title = required(p.title, "标题"),
    cue = required(p.cue, "记忆提示"),
    content = required(p.content, "记忆内容");
  let ids = [
    ...new Set<string>(Array.isArray(p.knowledge_ids) ? p.knowledge_ids : []),
  ];
  if (before && before.module !== module)
    ids = ids.filter(
      (kid) => live(ctx, "knowledge", kid).module !== before.module,
    );
  for (const kid of ids)
    if (live(ctx, "knowledge", kid).module !== module)
      throw new Error("知识点不属于当前卡片集");
  const changed = before && (before.content !== content || before.cue !== cue);
  if (before)
    run(
      ctx,
      "UPDATE memory_cards SET module=?,title=?,cue=?,content=?,source=?,version=version+1,learning_version=learning_version+?,updated_at=? WHERE id=?",
      module,
      title,
      cue,
      content,
      text(p.source),
      changed ? 1 : 0,
      now,
      key,
    );
  else
    run(
      ctx,
      "INSERT INTO memory_cards(id,module,title,cue,content,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
      key,
      module,
      title,
      cue,
      content,
      text(p.source),
      now,
      now,
    );
  run(ctx, "DELETE FROM memory_knowledge WHERE card_id=?", key);
  for (const kid of ids)
    run(ctx, "INSERT INTO memory_knowledge VALUES (?,?)", key, kid);
  const oldPause =
    one(ctx, "SELECT paused FROM memory_plans WHERE card_id=?", key)?.paused ??
    0;
  if (changed) {
    run(ctx, "DELETE FROM memory_plans WHERE card_id=?", key);
    run(ctx, "DELETE FROM scheduling WHERE kind='memory' AND card_id=?", key);
  }
  run(
    ctx,
    "INSERT OR IGNORE INTO memory_plans VALUES (?,?,0,NULL,0,?)",
    key,
    now,
    changed ? "内容已修改，等待重新验证" : "新积累，等待首次回忆",
  );
  if (changed)
    run(ctx, "UPDATE memory_plans SET paused=? WHERE card_id=?", oldPause, key);
  if (before && before.module !== module) clampCardToPolicy(ctx, "memory", key);
  invalidate(ctx);
  audit(ctx, before ? "修改记忆卡" : "新增记忆卡", { id: key, before });
  return key;
}
export function reviewMemory(ctx: Context, p: any) {
  const card = one(
    ctx,
    "SELECT * FROM memory_cards WHERE id=? AND deleted_at IS NULL",
    required(p.id, "记忆卡 ID"),
  );
  if (!card) throw new Error("记忆卡不存在");
  if (p.content_version != null) {
    if (p.content_version !== card.learning_version)
      throw new Error("记忆内容在复盘期间已修改，请重新开始本张");
  } else checkVersion(card, p.version);
  const score = Number(p.score);
  if (!Number.isInteger(score) || score < 0 || score > 4)
    throw new Error("评分应为0—4");
  const now = ctx.now(),
    last = one(
      ctx,
      "SELECT * FROM memory_reviews WHERE card_id=? AND effective=1 AND card_version=? ORDER BY created_at DESC,rowid DESC LIMIT 1",
      card.id,
      card.learning_version,
    );
  const eligibility=dueEligibility(ctx,"memory",card.id);
  const effective =
    !eligibility.paused && (!eligibility.explicitSnooze || eligibility.eligible) && !p.practice &&
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
      schedulingDue(ctx, "memory", card.id));
  const plan = one(ctx, "SELECT * FROM memory_plans WHERE card_id=?", card.id),
    settings = { maxInterval: effectiveMaxInterval(ctx, "memory", card.id) };
  const reviewId = id();
  const result = effective
    ? advance(
        ctx,
        "memory",
        card.id,
        score,
        settings.maxInterval,
        reviewId,
        plan?.mastery ?? null,
      )
    : null;
  run(
    ctx,
    "INSERT INTO memory_reviews(id,card_id,created_at,score,effective,mastery_after,content_snapshot,card_version,algorithm,note,card_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    reviewId,
    card.id,
    now.toISOString(),
    score,
    effective ? 1 : 0,
    result?.mastery ?? null,
    card.content,
    card.learning_version,
    ALGORITHM_VERSION,
    text(p.note),
    JSON.stringify({
      schemaVersion: 1,
      id: card.id,
      title: card.title,
      cue: card.cue,
      content: card.content,
      contentVersion: card.learning_version,
    }),
  );
  if (result)
    run(
      ctx,
      "INSERT INTO memory_plans VALUES (?,?,?,?,0,?) ON CONFLICT(card_id) DO UPDATE SET due_at=excluded.due_at,interval_days=excluded.interval_days,mastery=excluded.mastery,reason=excluded.reason",
      card.id,
      result.dueAt,
      result.days,
      result.mastery,
      result.reason,
    );
  invalidate(ctx);
  audit(ctx, "记忆复盘", { id: card.id, score, effective });
  return { attemptId: reviewId, score, effective, result };
}
export function memoryAction(ctx: Context, p: any) {
  const card = one(
    ctx,
    "SELECT * FROM memory_cards WHERE id=?",
    required(p.id, "记忆卡 ID"),
  );
  if (!card) throw new Error("记忆卡不存在");
  if (p.action === "restore") moduleName(card.module, ctx);
  if (p.action === "delete")
    run(
      ctx,
      "UPDATE memory_cards SET deleted_at=?,version=version+1 WHERE id=?",
      ctx.now().toISOString(),
      card.id,
    );
  else if (p.action === "restore")
    run(
      ctx,
      "UPDATE memory_cards SET deleted_at=NULL,version=version+1 WHERE id=?",
      card.id,
    );
  else if (p.action === "pause" || p.action === "resume")
    run(
      ctx,
      "UPDATE memory_plans SET paused=? WHERE card_id=?",
      p.action === "pause" ? 1 : 0,
      card.id,
    );
  else throw new Error("记忆卡操作不合法");
  invalidate(ctx);
  audit(ctx, "调整记忆卡", { id: card.id, action: p.action });
}
