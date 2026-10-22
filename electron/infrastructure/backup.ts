import { validateBusinessData } from './integrity.ts';
import { readContainer, writeContainer, sha256 } from './containers.ts';
import { backup, DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openDatabase } from './database.ts';
import { z } from 'zod';
const Entry = z.strictObject({
  name: z.string(),
  size: z.number().int().nonnegative(),
  checksum: z.string().regex(/^[0-9a-f]{64}$/),
});
const Manifest = z.strictObject({
  format: z.literal('ganksoft.backup'),
  version: z.literal(1),
  schemaVersion: z.union([z.literal(600), z.literal(601), z.literal(602), z.literal(603), z.literal(604)]),
  createdAt: z.iso.datetime(),
  entries: z.array(Entry).max(10000),
});
export async function createBackup(db: DatabaseSync, dataDir: string, destination: string) {
  const temp = join(dataDir, `backup-${randomUUID()}.sqlite`);
  try {
    await backup(db, temp);
    const snapshot = new DatabaseSync(temp, { readOnly: true });
    let schemaVersion: number;
    try { schemaVersion = Number(snapshot.prepare('PRAGMA user_version').get()?.user_version); }
    finally { snapshot.close(); }
    const files = new Map<string, Buffer>([['database.sqlite', readFileSync(temp)]]);
    const directory = join(dataDir, 'attachments');
    for (const name of existsSync(directory) ? readdirSync(directory) : []) {
      if (!/^[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i.test(name)) continue;
      files.set('attachments/' + name, readFileSync(join(directory, name)));
    }
    const manifest = Manifest.parse({
      format: 'ganksoft.backup',
      version: 1,
      schemaVersion,
      createdAt: new Date().toISOString(),
      entries: [...files].map(([name, data]) => ({
        name,
        size: data.length,
        checksum: sha256(data),
      })),
    });
    files.set('manifest.json', Buffer.from(JSON.stringify(manifest)));
    await writeContainer(destination, files);
  } finally {
    rmSync(temp, { force: true });
  }
}
/** Verify the existing container without opening (and possibly upgrading) its database. */
export async function readVerifiedBackup(source: string) {
  const files = await readContainer(source),
    manifest = Manifest.parse(JSON.parse(files.get('manifest.json')?.toString('utf8') ?? 'null'));
  if (files.size !== manifest.entries.length + 1) throw new Error('备份条目不一致');
  const names = new Set<string>();
  for (const entry of manifest.entries) {
    if (names.has(entry.name)) throw new Error('备份条目重复');
    names.add(entry.name);
    const bytes = files.get(entry.name);
    if (!bytes || bytes.length !== entry.size || sha256(bytes) !== entry.checksum)
      throw new Error('备份完整性校验失败');
  }
  if (!names.has('database.sqlite')) throw new Error('备份缺少数据库');
  for (const entry of manifest.entries)
    if (
      entry.name !== 'database.sqlite' &&
      !/^attachments\/[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i.test(entry.name)
    )
      throw new Error('备份条目名称不合法');
  return { files, manifest };
}
export async function stageBackup(source: string, staging: string) {
  const { files, manifest } = await readVerifiedBackup(source);
  mkdirSync(join(staging, 'attachments'), { recursive: true });
  try {
    for (const entry of manifest.entries) {
      if (
        entry.name !== 'database.sqlite' &&
        !/^attachments\/[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i.test(entry.name)
      )
        throw new Error('备份条目名称不合法');
      writeFileSync(
        join(staging, entry.name === 'database.sqlite' ? 'ganksoft.sqlite' : entry.name),
        files.get(entry.name)!,
      );
    }
    const check = openDatabase(join(staging, 'ganksoft.sqlite'));
    try {
      const integrity = check.prepare('PRAGMA integrity_check').get() as any;
      if (
        integrity.integrity_check !== 'ok' ||
        check.prepare('PRAGMA foreign_key_check').all().length
      )
        throw new Error('数据库完整性检查失败');
      validateBusinessData(check);
      const historicalAssets = (
        check
          .prepare("SELECT question_snapshot FROM attempts WHERE question_snapshot<>''")
          .all() as any[]
      ).flatMap((r) => {
        try {
          return JSON.parse(r.question_snapshot).assets ?? [];
        } catch {
          throw new Error('历史题目快照损坏');
        }
      });
      for (const row of [
        ...check.prepare('SELECT file_name FROM assets').all(),
        ...historicalAssets,
      ] as any[])
        if (
          basename(row.file_name) !== row.file_name ||
          !existsSync(join(staging, 'attachments', row.file_name))
        )
          throw new Error('备份缺少题目图片');
    } finally {
      check.close();
    }
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
}
