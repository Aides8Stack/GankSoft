import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { DomainError } from '../../shared/domain-error.ts';

export const OWNER_MARKER = 'ganksoft-write-owner.json';
interface Owner { active: boolean; guard: () => void; beforeCommit: () => void }
const owners = new WeakMap<DatabaseSync,Owner>();
export function bindWriteOwner(db: DatabaseSync, owner: Owner) { owners.set(db,owner); }
export function hasWriteOwner(db: DatabaseSync) { return owners.get(db)?.active === true; }
export function guardUnmanagedPath(path: string) {
  if(path!==':memory:' && existsSync(join(dirname(path),OWNER_MARKER)))
    throw new DomainError('MIGRATION_WRITE_FENCED','目录已冻结或迁移，必须通过恢复日志核实唯一活动库');
}
export function guardDatabaseAccess(db: DatabaseSync) {
  const owner=owners.get(db);
  if(owner) owner.guard();
  else { const path=db.location(); if(path) guardUnmanagedPath(path); }
}
export function beforeOwnedCommit(db: DatabaseSync) { guardDatabaseAccess(db); owners.get(db)?.beforeCommit(); guardDatabaseAccess(db); }
