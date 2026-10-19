import { StudyFilters } from "../../shared/study-query.ts";
import {
  id,
  one,
  run,
  required,
  type Context,
} from "../infrastructure/context.ts";
import { DomainError } from "../../shared/domain-error.ts";
export function saveFilter(ctx: Context, p: any) {
  const deck = one(
    ctx,
    "SELECT * FROM decks WHERE id=? AND deleted_at IS NULL",
    required(p.deck_id, "卡片集"),
  );
  if (!deck) throw new Error("卡片集不存在");
  const key = p.id ? required(p.id, "筛选编号") : id();
  const old = one(ctx, "SELECT * FROM saved_filters WHERE id=?", key);
  if (old && old.deck_id !== deck.id)
    throw new DomainError("DECK_CONFLICT", "筛选不属于当前卡片集");
  if (old && p.expected_revision !== old.revision)
    throw new DomainError("REVISION_CONFLICT", "筛选版本已变化，请刷新");
  const name = required(p.name, "筛选名称");
  const parsed = StudyFilters.safeParse(p.payload);
  if (!parsed.success)
    throw new DomainError("VALIDATION_ERROR", "筛选字段不合法", {
      payload: "字段格式不合法",
    });
  const f: any = parsed.data;
  if (
    name.length > 100 ||
    !f ||
    typeof f !== "object" ||
    Array.isArray(f) ||
    JSON.stringify(f).length > 50000
  )
    throw new DomainError("VALIDATION_ERROR", "筛选格式不合法", {
      payload: "应为筛选对象",
    });
  const enums: Record<string, string[]> = {
    match: ["any", "all"],
    state: ["all", "due", "ready", "new", "learned", "unlinked"],
    performance: ["all", "last-failed", "ever-failed", "repeated", "uncertain"],
    paused: ["all", "active", "paused"],
  };
  const fields = [
    "query",
    "knowledge",
    "includeChildren",
    "minReviews",
    "date",
    "dateField",
    "sort",
    ...Object.keys(enums),
  ];
  if (
    Object.keys(f).some((k) => !fields.includes(k)) ||
    (f.query !== undefined &&
      (typeof f.query !== "string" || f.query.length > 10000)) ||
    (f.knowledge !== undefined &&
      (!Array.isArray(f.knowledge) ||
        f.knowledge.some(
          (k: unknown) =>
            typeof k !== "string" ||
            !one(
              ctx,
              "SELECT id FROM knowledge WHERE id=? AND module=? AND deleted_at IS NULL",
              k,
              deck.id,
            ),
        ))) ||
    (f.includeChildren !== undefined &&
      typeof f.includeChildren !== "boolean") ||
    (f.minReviews !== undefined &&
      (!Number.isInteger(f.minReviews) || f.minReviews < 0)) ||
    Object.entries(enums).some(
      ([k, values]) => f[k] !== undefined && !values.includes(f[k]),
    )
  )
    throw new DomainError("VALIDATION_ERROR", "筛选字段不合法", {
      payload: "筛选值或知识点归属不合法",
    });
  run(
    ctx,
    "INSERT INTO saved_filters(id,deck_id,name,payload,revision) VALUES (?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET name=excluded.name,payload=excluded.payload,revision=saved_filters.revision+1",
    key,
    deck.id,
    name,
    JSON.stringify(f),
  );
  return key;
}
export function deleteFilter(ctx: Context, p: any) {
  const row = one(
    ctx,
    "SELECT * FROM saved_filters WHERE id=?",
    required(p.id, "筛选编号"),
  );
  if (!row || row.deck_id !== p.deck_id)
    throw new DomainError("DECK_CONFLICT", "筛选不属于当前卡片集");
  if (row.revision !== p.expected_revision)
    throw new DomainError("REVISION_CONFLICT", "筛选版本已变化，请刷新");
  return run(
    ctx,
    "DELETE FROM saved_filters WHERE id=? AND deck_id=?",
    row.id,
    row.deck_id,
  );
}
