import {StoredNodeBody} from '../../shared/protocol/knowledge-tree.ts';
import {assertKnowledgeAssets} from '../../shared/knowledge/media.ts';
import {validateImage} from './images.ts';
import { validateBusinessData } from './integrity.ts';
import { readContainer, writeContainer, sha256 } from './containers.ts';
import { backup, DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, lstatSync } from 'node:fs';
import { join, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openDatabase, APPLICATION_ID } from './database.ts';
import { z } from 'zod';
const Entry = z.strictObject({
  name: z.string(),
  size: z.number().int().nonnegative(),
  checksum: z.string().regex(/^[0-9a-f]{64}$/),
});
const Manifest = z.strictObject({
  format: z.literal('ganksoft.backup'),
  version: z.literal(1),
  schemaVersion: z.union([z.literal(600), z.literal(601), z.literal(602), z.literal(603), z.literal(604), z.literal(606)]),
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
    if(schemaVersion===606){
      const mediaCheck=new DatabaseSync(temp,{readOnly:true});
      try{for(const row of mediaCheck.prepare("SELECT value FROM settings WHERE key LIKE 'unified-knowledge-body:%'").iterate()){
        const body=StoredNodeBody.parse(JSON.parse(String(row.value)));assertKnowledgeAssets(body.markdown,body.assets);
        for(const asset of body.assets){const path=join(dataDir,'attachments',asset.fileName),stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink())throw Error('知识图片路径不安全');const bytes=readFileSync(path);validateImage(bytes,asset.mime);if(sha256(bytes)!==asset.sha256)throw Error('知识图片校验失败');}
      }}finally{mediaCheck.close();}
    }
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
export async function stageBackup(source: string, staging: string, onCreated?: () => void) {
  const { files, manifest } = await readVerifiedBackup(source);
  // Never overwrite or delete a caller's existing directory on validation failure.
  mkdirSync(staging);
  try {
    onCreated?.();
    mkdirSync(join(staging, 'attachments'));
    for (const entry of manifest.entries) {
      if (
        entry.name !== 'database.sqlite' &&
        !/^attachments\/[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i.test(entry.name)
      )
        throw new Error('备份条目名称不合法');
      writeFileSync(
        join(staging, entry.name === 'database.sqlite' ? 'ganksoft.sqlite' : entry.name),
        files.get(entry.name)!, { flag: 'wx' },
      );
    }
    const path=join(staging,'ganksoft.sqlite');
    const raw=new DatabaseSync(path,{readOnly:true});
    try {
      if(Number(raw.prepare('PRAGMA user_version').get()?.user_version)!==manifest.schemaVersion ||
         Number(raw.prepare('PRAGMA application_id').get()?.application_id)!==APPLICATION_ID) throw Error('备份清单与数据库版本/标识不一致');
    } finally { raw.close(); }
    const check = manifest.schemaVersion<604 ? openDatabase(path) : new DatabaseSync(path,{readOnly:true});
    try {
      const integrity = check.prepare('PRAGMA integrity_check').get() as any;
      if (
        integrity.integrity_check !== 'ok' ||
        check.prepare('PRAGMA foreign_key_check').all().length
      )
        throw new Error('数据库完整性检查失败');
      validateBusinessData(check);
      // Reuse the complete current/history/session/staged/new-version reference closure.
      if(manifest.schemaVersion>=604) {
        const {inspectDatabaseBaseline}=await import('./migrations/baseline.ts');
        // Legacy backups preserve opaque attachment bytes, as before; migrations
        // and 606 validation additionally decode images. Both verify all refs/hashes.
        inspectDatabaseBaseline(path,staging,undefined,manifest.schemaVersion===606);
      }
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
    return { schemaVersion: manifest.schemaVersion };
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
}
