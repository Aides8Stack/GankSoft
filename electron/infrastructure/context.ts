import { DomainError } from '../../shared/domain-error.ts';
import { randomUUID } from 'node:crypto';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { MODULES, isMemoryModule } from '../../shared/types.ts';
export interface Context {
  db: DatabaseSync;
  now: () => Date;
  dataDir: string;
}
export const id = () => randomUUID();
export const text = (value: unknown, limit = 200000): string => {
  if (value == null) return '';
  if (typeof value !== 'string' || value.length > limit)
    throw new Error('输入内容类型或长度不合法');
  return value.trim();
};
export const required = (value: unknown, name: string): string => {
  const v = text(value);
  if (!v) throw new Error(`请填写${name}`);
  return v;
};
export function moduleName(value: unknown, ctx: Context): string {
  const key = required(value, '卡片集');
  let deck = one(ctx, 'SELECT * FROM decks WHERE id=?', key);
  if (!deck || deck.deleted_at) throw new Error('卡片集不存在或已删除');
  return key;
}
export function deckKind(ctx: Context, key: string) {
  return one(ctx, 'SELECT kind FROM decks WHERE id=? AND deleted_at IS NULL', key)?.kind;
}
export function one(ctx: Context, sql: string, ...params: SQLInputValue[]): any {
  return ctx.db.prepare(sql).get(...params);
}
export function all(ctx: Context, sql: string, ...params: SQLInputValue[]): any[] {
  return ctx.db.prepare(sql).all(...params);
}
export function run(ctx: Context, sql: string, ...params: SQLInputValue[]) {
  return ctx.db.prepare(sql).run(...params);
}
export function live(ctx: Context, table: 'knowledge' | 'questions', value: unknown): any {
  const row = one(
    ctx,
    `SELECT * FROM ${table} WHERE id=? AND deleted_at IS NULL`,
    required(value, '记录 ID'),
  );
  if (!row) throw new Error('记录不存在或已删除，请刷新后重试');
  return row;
}
export function checkVersion(row: any, version: unknown) {
  if (version != null && row.version !== version)
    throw new DomainError('CONTENT_VERSION_CONFLICT', '内容已发生变化，请刷新后重新操作');
}
export function audit(ctx: Context, action: string, detail: unknown) {
  run(
    ctx,
    'INSERT INTO audits(action,detail,created_at) VALUES (?,?,?)',
    action,
    JSON.stringify(detail),
    ctx.now().toISOString(),
  );
}
export function invalidate(ctx: Context) {
  run(ctx, 'UPDATE analyses SET stale=1');
}
