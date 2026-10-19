import {
  id,
  text,
  required,
  moduleName,
  one,
  all,
  run,
  live,
  checkVersion,
  audit,
  invalidate,
  type Context,
} from "../../infrastructure/context.ts";
function checkParent(
  ctx: Context,
  self: string,
  parent: string | null,
  module: string,
) {
  const seen = new Set([self]);
  let cursor = parent;
  while (cursor) {
    if (seen.has(cursor)) throw new Error("父子关系不能形成循环");
    seen.add(cursor);
    const node = live(ctx, "knowledge", cursor);
    if (node.module !== module) throw new Error("父子知识点必须属于同一模块");
    cursor = node.parent_id;
  }
}
export function saveKnowledge(ctx: Context, p: any) {
  const before = p.id ? live(ctx, "knowledge", p.id) : null;
  if (before) checkVersion(before, p.version);
  const key = before?.id ?? id(),
    name = required(p.name, "知识点名称"),
    module = moduleName(p.module, ctx),
    parent = text(p.parent_id) || null;
  checkParent(ctx, key, parent, module);
  if (
    before &&
    module !== before.module &&
    (one(ctx, "SELECT 1 FROM question_knowledge WHERE knowledge_id=?", key) ||
      one(ctx, "SELECT 1 FROM memory_knowledge WHERE knowledge_id=?", key) ||
      one(
        ctx,
        "SELECT 1 FROM relations WHERE source_id=? OR target_id=?",
        key,
        key,
      ))
  )
    throw new Error("知识点仍有关联卡片或关系，请先解除关联再移动");
  if (
    before &&
    module !== before.module &&
    one(
      ctx,
      "SELECT id FROM knowledge WHERE parent_id=? AND deleted_at IS NULL",
      key,
    )
  )
    throw new Error("请先迁移下级知识点，再修改所属模块");
  if (
    one(
      ctx,
      "SELECT id FROM knowledge WHERE deleted_at IS NULL AND module=? AND coalesce(parent_id,'')=? AND name=? AND id<>?",
      module,
      parent ?? "",
      name,
      key,
    )
  )
    throw new Error("同一层级已存在同名知识点，请修改名称或合并");
  const now = ctx.now().toISOString();
  if (before)
    run(
      ctx,
      "UPDATE knowledge SET name=?,module=?,parent_id=?,aliases=?,principle=?,conditions=?,method=?,traps=?,updated_at=?,version=version+1 WHERE id=?",
      name,
      module,
      parent,
      text(p.aliases),
      text(p.principle),
      text(p.conditions),
      text(p.method),
      text(p.traps),
      now,
      key,
    );
  else
    run(
      ctx,
      "INSERT INTO knowledge(id,name,module,parent_id,aliases,principle,conditions,method,traps,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      key,
      name,
      module,
      parent,
      text(p.aliases),
      text(p.principle),
      text(p.conditions),
      text(p.method),
      text(p.traps),
      now,
      now,
    );
  invalidate(ctx);
  audit(ctx, before ? "修改知识点" : "新增知识点", {
    before,
    after: one(ctx, "SELECT * FROM knowledge WHERE id=?", key),
  });
  return key;
}
function migrateReferences(ctx: Context, source: string, target: string) {
  run(
    ctx,
    "INSERT OR IGNORE INTO question_knowledge(question_id,knowledge_id) SELECT question_id,? FROM question_knowledge WHERE knowledge_id=?",
    target,
    source,
  );
  run(ctx, "DELETE FROM question_knowledge WHERE knowledge_id=?", source);
  run(
    ctx,
    "UPDATE attempt_faults SET knowledge_id=? WHERE knowledge_id=?",
    target,
    source,
  );
  run(
    ctx,
    "INSERT OR IGNORE INTO memory_knowledge SELECT card_id,? FROM memory_knowledge WHERE knowledge_id=?",
    target,
    source,
  );
  run(ctx, "DELETE FROM memory_knowledge WHERE knowledge_id=?", source);
  run(
    ctx,
    "UPDATE knowledge_keys SET knowledge_id=? WHERE knowledge_id=?",
    target,
    source,
  );
}
export function mergeKnowledge(ctx: Context, p: any) {
  const source = live(ctx, "knowledge", p.source_id),
    target = live(ctx, "knowledge", p.target_id);
  if (source.id === target.id) throw new Error("请选择两个不同的知识点");
  if (source.module !== target.module)
    throw new Error("第一版仅支持同模块知识点合并");
  // Reject merging an ancestor into its descendant; avoids ambiguous hierarchy rewrites.
  let cursor: string | null = target.parent_id;
  while (cursor) {
    if (cursor === source.id)
      throw new Error("不能将上级合并到其下级，请先调整层级");
    cursor = live(ctx, "knowledge", cursor).parent_id;
  }
  const children = all(
    ctx,
    "SELECT * FROM knowledge WHERE parent_id=? AND deleted_at IS NULL",
    source.id,
  );
  for (const child of children)
    if (
      one(
        ctx,
        "SELECT id FROM knowledge WHERE parent_id=? AND name=? AND deleted_at IS NULL",
        target.id,
        child.name,
      )
    )
      throw new Error(`合并后下级「${child.name}」重名，请先处理`);
  const snapshot = {
    source,
    target,
    children,
    links: all(
      ctx,
      "SELECT * FROM relations WHERE source_id=? OR target_id=?",
      source.id,
      source.id,
    ),
    questionLinks: all(
      ctx,
      "SELECT * FROM question_knowledge WHERE knowledge_id=?",
      source.id,
    ),
  };
  migrateReferences(ctx, source.id, target.id);
  for (const r of snapshot.links) {
    const other = r.source_id === source.id ? r.target_id : r.source_id;
    if (other !== target.id) {
      const [a, b] = [target.id, other].sort();
      const exists = one(
        ctx,
        "SELECT * FROM relations WHERE source_id=? AND target_id=? AND kind=?",
        a,
        b,
        r.kind,
      );
      if (exists && r.note && !exists.note.includes(r.note))
        run(
          ctx,
          "UPDATE relations SET note=? WHERE id=?",
          [exists.note, r.note].filter(Boolean).join("\n"),
          exists.id,
        );
      else if (!exists)
        run(
          ctx,
          "INSERT INTO relations VALUES (?,?,?,?,?)",
          id(),
          a,
          b,
          r.kind,
          r.note,
        );
    }
  }
  run(
    ctx,
    "DELETE FROM relations WHERE source_id=? OR target_id=?",
    source.id,
    source.id,
  );
  run(
    ctx,
    "UPDATE knowledge SET parent_id=?,version=version+1 WHERE parent_id=? AND deleted_at IS NULL",
    target.id,
    source.id,
  );
  const combined = (field: string) =>
    [
      target[field],
      source[field] ? `【合并自 ${source.name}】\n${source[field]}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  run(
    ctx,
    "UPDATE knowledge SET aliases=?,principle=?,conditions=?,method=?,traps=?,version=version+1,updated_at=? WHERE id=?",
    [target.aliases, source.name, source.aliases].filter(Boolean).join("；"),
    combined("principle"),
    combined("conditions"),
    combined("method"),
    combined("traps"),
    ctx.now().toISOString(),
    target.id,
  );
  run(
    ctx,
    "UPDATE knowledge SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?",
    ctx.now().toISOString(),
    ctx.now().toISOString(),
    source.id,
  );
  invalidate(ctx);
  audit(ctx, "合并知识点", snapshot);
  return target.id;
}
export function deleteKnowledge(ctx: Context, p: any) {
  const node = live(ctx, "knowledge", p.id);
  checkVersion(node, p.version);
  if (
    one(
      ctx,
      "SELECT id FROM knowledge WHERE parent_id=? AND deleted_at IS NULL",
      node.id,
    )
  )
    throw new Error("请先迁移或删除下级知识点");
  const target = p.target_id ? live(ctx, "knowledge", p.target_id) : null;
  if (target && target.module !== node.module)
    throw new Error("迁移目标必须属于同一科目");
  if (target?.id === node.id) throw new Error("迁移目标不能是自身");
  audit(ctx, "删除知识点", {
    node,
    target: target?.id ?? null,
    questionLinks: all(
      ctx,
      "SELECT * FROM question_knowledge WHERE knowledge_id=?",
      node.id,
    ),
    relations: all(
      ctx,
      "SELECT * FROM relations WHERE source_id=? OR target_id=?",
      node.id,
      node.id,
    ),
  });
  if (target) migrateReferences(ctx, node.id, target.id);
  else {
    run(ctx, "DELETE FROM question_knowledge WHERE knowledge_id=?", node.id);
    run(ctx, "DELETE FROM memory_knowledge WHERE knowledge_id=?", node.id);
    run(
      ctx,
      "UPDATE attempt_faults SET knowledge_id=NULL WHERE knowledge_id=?",
      node.id,
    );
  }
  run(
    ctx,
    "DELETE FROM relations WHERE source_id=? OR target_id=?",
    node.id,
    node.id,
  );
  run(
    ctx,
    "UPDATE knowledge SET deleted_at=?,version=version+1 WHERE id=?",
    ctx.now().toISOString(),
    node.id,
  );
  invalidate(ctx);
}
export function restoreKnowledge(ctx: Context, p: any) {
  const node = one(
    ctx,
    "SELECT * FROM knowledge WHERE id=? AND deleted_at IS NOT NULL",
    required(p.id, "知识点 ID"),
  );
  if (!node) throw new Error("没有可恢复的知识点");
  moduleName(node.module, ctx);
  const parent =
    node.parent_id &&
    one(
      ctx,
      "SELECT id FROM knowledge WHERE id=? AND deleted_at IS NULL",
      node.parent_id,
    )
      ? node.parent_id
      : null;
  const name = text(p.name) || node.name;
  if (
    one(
      ctx,
      "SELECT id FROM knowledge WHERE deleted_at IS NULL AND module=? AND coalesce(parent_id,'')=? AND name=?",
      node.module,
      parent ?? "",
      name,
    )
  )
    throw new Error("同名知识点已存在，请填写新的恢复名称");
  run(
    ctx,
    "UPDATE knowledge SET name=?,parent_id=?,deleted_at=NULL,version=version+1 WHERE id=?",
    name,
    parent,
    node.id,
  );
  audit(ctx, "恢复知识点", {
    id: node.id,
    note: "仅恢复知识卡；历史迁移不自动撤回",
  });
  invalidate(ctx);
}
