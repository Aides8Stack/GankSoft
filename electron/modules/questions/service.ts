import { clampCardToPolicy } from "../review/policy.ts";
import { ImageRole } from "../../../shared/image-node.ts";
import { resetQuestionContent } from "./content.ts";
import {
  automaticQuestionTitle,
  isLegacyQuestionTitle,
} from "../../../shared/question-title.ts";
import { isMemoryModule } from "../../../shared/types.ts";
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
export function saveProjectNote(ctx: Context, p: any) {
  const q = live(ctx, "questions", p.id);
  checkVersion(q, p.version);
  run(
    ctx,
    "UPDATE questions SET project_note=?,version=version+1 WHERE id=?",
    text(p.note),
    q.id,
  );
  audit(ctx, "保存题目项目笔记", { id: q.id });
}
export function saveQuestion(ctx: Context, p: any) {
  const before = p.id ? live(ctx, "questions", p.id) : null;
  if (before) checkVersion(before, p.version);
  const key = before?.id ?? id(),
    module = moduleName(p.module, ctx),
    now = ctx.now().toISOString(),
    stem = text(p.stem);
  if (deckKind(ctx, module) === "memory")
    throw new Error("该卡片集请使用记忆卡录入");
  const hasImage =
    before &&
    one(
      ctx,
      "SELECT id FROM assets WHERE question_id=? AND role='question'",
      key,
    );
  if (!stem && !hasImage)
    throw new Error("请先输入题目文字（图片题可先填写简短说明，再添加图片）");
  let knowledgeIds: string[] = [
    ...new Set<string>(Array.isArray(p.knowledge_ids) ? p.knowledge_ids : []),
  ];
  if (before && before.module !== module)
    knowledgeIds = knowledgeIds.filter(
      (k) => live(ctx, "knowledge", k).module !== before.module,
    );
  knowledgeIds.forEach((k) => {
    if (live(ctx, "knowledge", k).module !== module)
      throw new Error("知识点不属于当前卡片集");
  });
  const answer = text(p.answer).toUpperCase();
  if (!/^[A-D]$/.test(answer)) throw new Error("请填写有效正确答案 A—D");
  const requestedTitle = text(p.title, 300);
  const title =
    !requestedTitle ||
    (before &&
      isLegacyQuestionTitle(requestedTitle, before.module, before.stem))
      ? automaticQuestionTitle(stem)
      : requestedTitle;
  let materialId = before?.material_id ?? null;
  if (p.material_id) {
    if (!one(ctx, "SELECT id FROM materials WHERE id=?", p.material_id))
      throw new Error("公共材料不存在");
    materialId = p.material_id;
  } else if (text(p.material)) {
    materialId = id();
    run(
      ctx,
      "INSERT INTO materials VALUES (?,?)",
      materialId,
      text(p.material),
    );
  } else materialId = null;
  if (before)
    run(
      ctx,
      "UPDATE questions SET title=?,module=?,stem=?,options=?,answer=?,analysis=?,source=?,initial_thought=?,material_id=?,status=?,updated_at=?,version=version+1 WHERE id=?",
      title,
      module,
      stem,
      text(p.options),
      answer,
      text(p.analysis),
      text(p.source),
      text(p.initial_thought),
      materialId,
      "ready",
      now,
      key,
    );
  else
    run(
      ctx,
      "INSERT INTO questions(id,title,module,stem,options,answer,analysis,source,initial_thought,material_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      key,
      title,
      module,
      stem,
      text(p.options),
      answer,
      text(p.analysis),
      text(p.source),
      text(p.initial_thought),
      materialId,
      "ready",
      now,
      now,
    );
  run(ctx, "DELETE FROM question_knowledge WHERE question_id=?", key);
  knowledgeIds.forEach((k) =>
    run(ctx, "INSERT INTO question_knowledge VALUES (?,?)", key, k),
  );
  run(
    ctx,
    "INSERT OR IGNORE INTO plans VALUES (?,?,0,NULL,0,?,'rules-v1.0')",
    key,
    now,
    "新错题，等待首次复盘",
  );
  const oldMaterial = before?.material_id
    ? (one(ctx, "SELECT content FROM materials WHERE id=?", before.material_id)
        ?.content ?? "")
    : "";
  const newMaterial = materialId
    ? (one(ctx, "SELECT content FROM materials WHERE id=?", materialId)
        ?.content ?? "")
    : "";
  if (
    before &&
    (before.answer !== answer ||
      before.stem !== stem ||
      before.options !== text(p.options) ||
      before.analysis !== text(p.analysis) ||
      oldMaterial !== newMaterial)
  ) {
    resetQuestionContent(ctx, key);
  }
  if (before && before.module !== module)
    clampCardToPolicy(ctx, "question", key);
  invalidate(ctx);
  audit(ctx, before ? "修改错题" : "新增错题", {
    id: key,
    before,
    after: one(ctx, "SELECT * FROM questions WHERE id=?", key),
  });
  return key;
}
export function deleteQuestion(ctx: Context, p: any) {
  const row = live(ctx, "questions", p.id);
  run(
    ctx,
    "UPDATE questions SET deleted_at=?,version=version+1 WHERE id=?",
    ctx.now().toISOString(),
    row.id,
  );
  audit(ctx, "删除错题", row);
  invalidate(ctx);
}
export function restoreQuestion(ctx: Context, p: any) {
  const row = one(
    ctx,
    "SELECT * FROM questions WHERE id=? AND deleted_at IS NOT NULL",
    required(p.id, "错题 ID"),
  );
  if (!row) throw new Error("没有可恢复的错题");
  moduleName(row.module, ctx);
  run(
    ctx,
    "UPDATE questions SET deleted_at=NULL,version=version+1 WHERE id=?",
    row.id,
  );
  audit(ctx, "恢复错题", { id: row.id });
  invalidate(ctx);
}
export function setPlan(ctx: Context, p: any) {
  live(ctx, "questions", p.id);
  const plan = one(ctx, "SELECT * FROM plans WHERE question_id=?", p.id);
  if (!plan) throw new Error("该题尚未进入复盘计划");
  if (p.action === "pause")
    run(ctx, "UPDATE plans SET paused=1 WHERE question_id=?", p.id);
  else if (p.action === "resume")
    run(ctx, "UPDATE plans SET paused=0 WHERE question_id=?", p.id);
  else if (p.action === "tomorrow") {
    const due = ctx.now();
    due.setDate(due.getDate() + 1);
    run(
      ctx,
      "UPDATE plans SET due_at=?,reason=? WHERE question_id=?",
      due.toISOString(),
      "手动延期一天；保留掌握情况",
      p.id,
    );
  } else throw new Error("不支持的计划操作");
  audit(ctx, "调整复盘计划", { id: p.id, action: p.action, before: plan });
}
export function addAsset(ctx: Context, p: any) {
  live(ctx, "questions", p.question_id);
  if (!ImageRole.safeParse(p.role).success)
    throw new Error("附件用途不合法");
  run(
    ctx,
    "INSERT INTO assets VALUES (?,?,?,?,?,?)",
    p.id,
    p.question_id,
    p.role,
    required(p.file_name, "文件名"),
    p.mime,
    all(ctx, "SELECT id FROM assets WHERE question_id=?", p.question_id).length,
  );
  resetQuestionContent(ctx, p.question_id, true);
  audit(ctx, "添加图片", { question: p.question_id, id: p.id });
}
export function deleteAsset(ctx: Context, p: any) {
  const asset = one(
    ctx,
    "SELECT * FROM assets WHERE id=?",
    required(p.id, "附件 ID"),
  );
  if (!asset) throw new Error("附件不存在");
  live(ctx, "questions", asset.question_id);
  run(ctx, "DELETE FROM assets WHERE id=?", asset.id);
  resetQuestionContent(ctx, asset.question_id, true);
  audit(ctx, "解除图片引用", asset);
}

export function bulkReady(ctx: Context, p: any) {
  if (!Array.isArray(p.items) || !p.items.length || p.items.length > 5000)
    throw new Error("请选择 1—5000 道题目");
  const seen = new Set<string>();
  const rows: any[] = p.items.map((item: any) => {
    const q = live(ctx, "questions", item.id);
    if (p.deck_id && q.module !== p.deck_id)
      throw new Error("所选题目不属于当前卡片集");
    if (seen.has(q.id)) throw new Error("选择中存在重复题目");
    seen.add(q.id);
    if (!Number.isInteger(item.version))
      throw new Error("缺少题目版本，请刷新后重试");
    checkVersion(q, item.version);
    if (deckKind(ctx, q.module) === "memory")
      throw new Error("该卡片集请使用记忆卡");
    if (!/^[A-D]$/.test(q.answer))
      throw new Error(`${q.title}：缺少有效正确答案`);
    const links = all(
      ctx,
      "SELECT k.* FROM question_knowledge l JOIN knowledge k ON k.id=l.knowledge_id WHERE l.question_id=?",
      q.id,
    );
    if (links.some((k) => k.deleted_at))
      throw new Error(`${q.title}：请补齐有效知识点`);
    if (
      !q.stem &&
      !one(
        ctx,
        "SELECT id FROM assets WHERE question_id=? AND role='question'",
        q.id,
      )
    )
      throw new Error(`${q.title}：缺少题干或题目图片`);
    return q;
  });
  const changed = rows.filter((q) => q.status !== "ready");
  const now = ctx.now().toISOString();
  for (const q of changed) {
    run(
      ctx,
      "UPDATE questions SET status='ready',updated_at=?,version=version+1 WHERE id=?",
      now,
      q.id,
    );
    run(
      ctx,
      "INSERT OR IGNORE INTO plans VALUES (?,?,0,NULL,0,?,'rules-v1.0')",
      q.id,
      now,
      "卡片可学习，等待复盘",
    );
  }
  if (changed.length) {
    invalidate(ctx);
    audit(ctx, "批量整理错题", {
      items: changed.map((q) => ({
        id: q.id,
        version: q.version,
        beforeStatus: q.status,
      })),
      confirmed: true,
    });
  }
  return { updated: changed.length, skipped: rows.length - changed.length };
}
