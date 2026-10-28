import { StoredNodeBody } from '../../../shared/protocol/knowledge-tree.ts';
import { StoredDraft, StoredNewDraft } from '../../../shared/protocol/card-draft.ts';
import { DatabaseSync, type SQLOutputValue } from 'node:sqlite';
import { createHash } from 'node:crypto';
import {
  existsSync, lstatSync, readdirSync, readFileSync, mkdirSync,
  mkdtempSync, writeFileSync, rmSync, linkSync, realpathSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { DomainError } from '../../../shared/domain-error.ts';
import { APPLICATION_ID } from '../database.ts';
import { validateBusinessData } from '../integrity.ts';
import { createBackup, readVerifiedBackup } from '../backup.ts';
import { validateImage } from '../images.ts';

// This module is deliberately not connected to startup or the public protocol yet.
// S1.a validates a recovery point before S1.b is allowed to introduce new writes.
export const LEGACY_BASELINE_SCHEMA = 604;
export interface TableFingerprint { name: string; rows: number; sha256: string }
export interface MediaFingerprint { name: string; size: number; sha256: string }
export interface MediaReference { owner: string; fileName: string; assetId: string | null }
export interface LegacyBaseline {
  schemaVersion: number;
  applicationId: number;
  schemaHash: string;
  tables: TableFingerprint[];
  media: MediaFingerprint[];
  references: MediaReference[];
  digest: string;
}
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
const filePattern = /^[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i;
const requiredTables = [
  'analyses','assets','attempt_evidence_snapshots','attempt_faults','attempts','audits',
  'card_review_policies','deck_assessment_policies','deck_review_config_v2','deck_review_policies',
  'decks','detached_knowledge_links','diagnosis_config','folders','import_batches','import_entries',
  'knowledge','knowledge_archives','knowledge_keys','knowledge_specialty_prefs','materials',
  'memory_cards','memory_knowledge','memory_plans','memory_reviews','plans',
  'question_assessment_policies','question_knowledge','questions','recycle_batches','relations',
  'review_config_operations','review_due_overrides','review_receipts','saved_filters',
  'schedule_events','scheduling','settings','study_sessions',
];
function reject(code: string, message: string): never {
  throw new DomainError(code, message);
}
function objectJson(value: unknown, owner: string): Record<string, unknown> {
  try {
    const result: unknown = JSON.parse(String(value));
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw Error();
    return result as Record<string, unknown>;
  } catch {
    return reject('MIGRATION_DATA_INVALID', `迁移前 JSON 对象损坏：${owner}`);
  }
}
function canonicalRow(row: Record<string, SQLOutputValue>) {
  // Preserve integer precision and opaque BLOBs, without rewriting the source.
  return JSON.stringify(Object.entries(row).map(([key, value]) => [key,
    typeof value === 'bigint' ? { integer: value.toString() }
      : value instanceof Uint8Array ? { binary: Buffer.from(value).toString('base64') } : value,
  ]));
}
function mediaFiles(directory: string, decodeImages = true): MediaFingerprint[] {
  if (!existsSync(directory)) return [];
  if (!lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink())
    reject('MIGRATION_MEDIA_UNSAFE', '附件目录不能是符号链接或普通文件');
  return readdirSync(directory).sort().map(name => {
    const path = join(directory, name), stat = lstatSync(path);
    if (!filePattern.test(name) || !stat.isFile() || stat.isSymbolicLink())
      reject('MIGRATION_MEDIA_UNSAFE', '附件包含未识别文件、目录或链接，禁止静默遗漏');
    if (stat.size > 20 * 1024 * 1024)
      reject('MIGRATION_MEDIA_INVALID', '附件超过现有单图20MB上限');
    const bytes = readFileSync(path);
    if (decodeImages) validateImage(bytes, /\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : 'image/jpeg');
    return { name, size: bytes.length, sha256: sha(bytes) };
  });
}

/** Read-only, stable logical fingerprints. Never call openDatabase on the source. */
export function inspectLegacyBaseline(databasePath: string, dataDir: string): LegacyBaseline {
  return inspectDatabaseBaseline(databasePath, dataDir, 604);
}
export function inspectDatabaseBaseline(databasePath: string, dataDir: string, expectedSchema?: 604 | 606, decodeImages = true): LegacyBaseline {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    db.exec('PRAGMA query_only=ON; PRAGMA foreign_keys=ON; BEGIN');
    const schemaVersion = Number(db.prepare('PRAGMA user_version').get()!.user_version);
    const applicationId = Number(db.prepare('PRAGMA application_id').get()!.application_id);
    if (![604,606].includes(schemaVersion) || (expectedSchema !== undefined && schemaVersion !== expectedSchema) || applicationId !== APPLICATION_ID)
      reject('MIGRATION_SCHEMA_UNSUPPORTED', '仅接受已核实的 GankSoft schema604/606 源库');
    const schema = db.prepare(
      "SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
    ).all();
    const tableNames = schema.filter(r => r.type === 'table').map(r => String(r.name));
    if (requiredTables.some(name => !tableNames.includes(name)))
      reject('MIGRATION_SCHEMA_UNSUPPORTED', 'schema604 必需表不完整');
    if (db.prepare('PRAGMA integrity_check').all().some(r => r.integrity_check !== 'ok') ||
        db.prepare('PRAGMA foreign_key_check').all().length)
      reject('MIGRATION_DATA_INVALID', '迁移前数据库或外键完整性检查失败');
    validateBusinessData(db);
    for (const table of ['questions','memory_cards','knowledge','decks'])
      if (db.prepare(`SELECT 1 FROM ${table} WHERE typeof(id)<>'text' OR length(trim(id))=0 LIMIT 1`).get())
        reject('MIGRATION_DATA_INVALID', '旧对象身份为空或不是文本，禁止静默生成新身份');
    for (const sql of [
      'SELECT q.id FROM questions q JOIN memory_cards m ON m.id=q.id LIMIT 1',
      'SELECT a.id FROM attempts a JOIN memory_reviews r ON r.id=a.id LIMIT 1',
    ]) if (db.prepare(sql).get())
      reject('MIGRATION_ID_COLLISION', '旧类型对象存在同 ID 冲突，禁止自动合并或重编号');
    for (const table of ['questions','memory_cards','knowledge'])
      if (db.prepare(`SELECT c.id FROM ${table} c LEFT JOIN decks d ON d.id=c.module WHERE d.id IS NULL LIMIT 1`).get())
        reject('MIGRATION_SCOPE_INVALID', '旧对象指向不存在的卡片集');
    for (const [table, key, cardTable] of [
      ['question_knowledge','question_id','questions'], ['memory_knowledge','card_id','memory_cards'],
    ]) if (db.prepare(`SELECT 1 FROM ${table} l JOIN ${cardTable} c ON c.id=l.${key} JOIN knowledge k ON k.id=l.knowledge_id WHERE c.module<>k.module LIMIT 1`).get())
      reject('MIGRATION_SCOPE_INVALID', '当前知识点关联跨卡片集');
    const parents = new Map(db.prepare('SELECT id,parent_id,module FROM knowledge').all().map(r => [String(r.id), r]));
    for (const node of parents.values()) {
      const visited = new Set([String(node.id)]);
      let parent = node.parent_id;
      while (parent) {
        const next = parents.get(String(parent));
        if (!next || next.module !== node.module || visited.has(String(parent)))
          reject('MIGRATION_TREE_INVALID', '知识层级存在缺父、跨集或循环');
        visited.add(String(parent)); parent = next.parent_id;
      }
    }
    const media = mediaFiles(join(dataDir, 'attachments'), decodeImages);
    const names = new Set(media.map(m => m.name));
    const references: MediaReference[] = [];
    const add = (owner: string, fileName: unknown, assetId: unknown) => {
      if (typeof fileName !== 'string' || !filePattern.test(fileName) || !names.has(fileName))
        reject('MIGRATION_MEDIA_MISSING', `迁移前引用图片缺失或路径非法：${owner}`);
      references.push({ owner, fileName, assetId: typeof assetId === 'string' ? assetId : null });
    };
    for (const row of db.prepare('SELECT id,file_name FROM assets').iterate())
      add(`assets/${row.id}`, row.file_name, row.id);
    for (const row of db.prepare("SELECT id,question_snapshot FROM attempts WHERE question_snapshot<>''").iterate()) {
      const snapshot = objectJson(row.question_snapshot, `attempts/${row.id}`);
      if (snapshot.assets !== undefined && !Array.isArray(snapshot.assets))
        reject('MIGRATION_DATA_INVALID', '历史图片快照不是数组');
      for (const asset of (snapshot.assets ?? []) as unknown[]) {
        if (!asset || typeof asset !== 'object' || Array.isArray(asset))
          reject('MIGRATION_DATA_INVALID', '历史图片引用损坏');
        const a = asset as Record<string, unknown>;
        add(`attempts/${row.id}`, a.file_name, a.id);
      }
    }
    for (const row of db.prepare("SELECT id,card_snapshot FROM memory_reviews WHERE card_snapshot<>''").iterate()) {
      const snapshot=objectJson(row.card_snapshot, `memory_reviews/${row.id}`);
      if(snapshot.assets!==undefined && !Array.isArray(snapshot.assets)) reject('MIGRATION_DATA_INVALID','旧记忆图片快照损坏');
      for(const asset of (snapshot.assets ?? []) as {file_name:unknown;id:unknown}[]) add(`memory_reviews/${row.id}`,asset.file_name,asset.id);
    }
    if(schemaVersion===606) for(const row of db.prepare('SELECT id,document FROM learning_content_versions').iterate()) {
      const doc=objectJson(row.document,`versions/${row.id}`);
      for(const ref of doc.mediaRefs as {fileName:unknown;assetId:unknown}[]) add(`versions/${row.id}`,ref.fileName,ref.assetId);
    }
    if(schemaVersion===606) for(const row of db.prepare('SELECT card_id,payload FROM learning_card_drafts').iterate()) {
      const raw=objectJson(row.payload,`drafts/${row.card_id}`);
      if(raw.encoding==='ganksoft.card-draft/1') for(const ref of StoredDraft.parse(raw).document.mediaRefs)
        add(`drafts/${row.card_id}`,ref.fileName,ref.assetId);
    }
    const stagedImages = new Map<string, { deckId: unknown; purpose: unknown; mime: unknown; fileName: unknown }>();
    for (const row of db.prepare("SELECT key,value FROM settings WHERE key LIKE 'media-draft:%'").iterate()) {
      const m = objectJson(row.value, String(row.key));
      if (row.key !== `media-draft:${m.id}` || !['question','analysis','response','knowledge'].includes(String(m.purpose)) ||
          !db.prepare('SELECT id FROM decks WHERE id=?').get(String(m.deckId)))
        reject('MIGRATION_DATA_INVALID', '暂存图片元数据的身份/用途/卡片集不一致');
      add(String(row.key), m.file_name, m.id);
      stagedImages.set(String(m.id), { deckId: m.deckId, purpose: m.purpose, mime: m.mime, fileName: m.file_name });
    }
    if(schemaVersion===606) for(const row of db.prepare("SELECT key,value FROM settings WHERE key LIKE 'new-card-draft:%'").iterate()) {
      const pending=StoredNewDraft.parse(objectJson(row.value,String(row.key)));
      for(const ref of pending.document.mediaRefs) {
        const staged=stagedImages.get(ref.assetId);
        if(!staged || staged.deckId!==pending.deckId || !(staged.purpose===ref.role||(staged.purpose==='knowledge'&&['question','analysis'].includes(ref.role))) || staged.mime!==ref.mime || staged.fileName!==ref.fileName)
          reject('MIGRATION_MEDIA_MISSING','新卡草稿图片归属或元数据不完整');
        add(String(row.key),ref.fileName,ref.assetId);
      }
    }
    if(schemaVersion===606) for(const row of db.prepare("SELECT key,value FROM settings WHERE key LIKE 'unified-knowledge-body:%'").iterate()) {
      const body=StoredNodeBody.parse(objectJson(row.value,String(row.key)));
      for(const ref of body.assets) {
        const staged=stagedImages.get(ref.id),file=media.find(m=>m.name===ref.fileName);
        if(!staged||staged.deckId!==body.deckId||!['knowledge','question','analysis'].includes(String(staged.purpose))||staged.mime!==ref.mime||staged.fileName!==ref.fileName||file?.sha256!==ref.sha256)
          reject('MIGRATION_MEDIA_MISSING','知识正文图片归属或校验值不完整');
        add(String(row.key),ref.fileName,ref.id);
      }
    }
    for (const row of db.prepare('SELECT deck_id,payload FROM study_sessions').iterate()) {
      const session = objectJson(row.payload, `study_sessions/${row.deck_id}`);
      const pending = session.pendingSubmission as Record<string, unknown> | undefined;
      for (const list of [session.responseImages, pending?.response_images]) {
        if (list === undefined) continue;
        if (!Array.isArray(list) || list.some(id => typeof id !== 'string'))
          reject('MIGRATION_DATA_INVALID', '作答草稿图片引用不是 ID 数组');
        for (const id of list) {
          const image = stagedImages.get(id);
          if (!image || image.deckId !== row.deck_id || image.purpose !== 'response')
            reject('MIGRATION_MEDIA_MISSING', '作答草稿图片缺元数据或不属于当前集/用途');
        }
      }
    }
    references.sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0);
    // AUTOINCREMENT high-water marks can exceed max(id); they affect future identity.
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE name='sqlite_sequence'").get())
      tableNames.push('sqlite_sequence');
    const tables = tableNames.sort().map(name => {
      const statement = db.prepare(`SELECT * FROM ${quote(name)}`);
      statement.setReadBigInts(true);
      // Sorted per-row hashes preserve multiplicity and do not buffer large text bodies.
      const rows: string[] = [];
      for (const row of statement.iterate()) rows.push(sha(canonicalRow(row)));
      rows.sort();
      return { name, rows: rows.length, sha256: sha(rows.join('\n')) };
    });
    const result = { schemaVersion, applicationId, schemaHash: sha(JSON.stringify(schema)), tables, media, references };
    db.exec('COMMIT');
    return { ...result, digest: sha(JSON.stringify(result)) };
  } finally { db.close(); }
}

export type BaselineCheckpoint = 'backup-written' | 'backup-verified' | 'before-publish';
/** Internal fault-injection seam; no UI/API or schema writes are enabled in S1.a. */
export interface BaselineHooks { checkpoint?: (phase: BaselineCheckpoint) => void | Promise<void> }
function within(parent: string, child: string) {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith('..' + sep) && path !== '..' && !isAbsolute(path));
}
// Caller must keep application/media writers frozen until return. Comparing source,
// backup and source again detects drift; it is not a cross-process filesystem lock.
export async function prepareMigrationBaseline(
  db: DatabaseSync, dataDir: string, destination: string, hooks: BaselineHooks = {},
) {
  if (db.isTransaction) reject('MIGRATION_SOURCE_BUSY', '请先结束源库事务再制作迁移恢复点');
  const main = db.prepare('PRAGMA database_list').all().find(r => r.name === 'main');
  if (!main?.file) reject('MIGRATION_SOURCE_INVALID', '恢复点要求真实文件源库');
  const databasePath = realpathSync(String(main.file));
  const sourceDir = realpathSync(dataDir);
  if (!within(sourceDir, databasePath))
    reject('MIGRATION_SOURCE_INVALID', '源库文件不在指定数据目录内');
  const output = resolve(destination), parent = realpathSync(dirname(output));
  if (existsSync(output) || within(sourceDir, parent) || output === databasePath)
    reject('MIGRATION_DESTINATION_INVALID', '恢复点必须另存到源目录外的新文件，禁止覆盖');
  const before = inspectDatabaseBaseline(databasePath, sourceDir);
  const temp = mkdtempSync(join(parent, '.gank-migration-baseline-'));
  try {
    const archive = join(temp, 'recovery.zip');
    await createBackup(db, sourceDir, archive);
    await hooks.checkpoint?.('backup-written');
    const { files, manifest } = await readVerifiedBackup(archive);
    if (manifest.schemaVersion !== before.schemaVersion)
      reject('MIGRATION_SCHEMA_UNSUPPORTED', '备份与源库 schema 版本不一致');
    const staged = join(temp, 'verify');
    mkdirSync(join(staged, 'attachments'), { recursive: true });
    for (const entry of manifest.entries)
      writeFileSync(join(staged, entry.name === 'database.sqlite' ? 'ganksoft.sqlite' : entry.name), files.get(entry.name)!, { flag: 'wx' });
    const restored = inspectDatabaseBaseline(join(staged, 'ganksoft.sqlite'), staged);
    if (restored.digest !== before.digest)
      reject('MIGRATION_BACKUP_MISMATCH', '恢复点与源库的行/历史/媒体指纹不一致');
    await hooks.checkpoint?.('backup-verified');
    await hooks.checkpoint?.('before-publish');
    if (inspectDatabaseBaseline(databasePath, sourceDir).digest !== before.digest)
      reject('MIGRATION_SOURCE_CHANGED', '制作恢复点期间源库或图片已变化，请冻结写入后重试');
    // Same-filesystem hard link publishes atomically and refuses an existing destination.
    linkSync(archive, output);
    return { baseline: before, backupPath: output, backupSha256: sha(readFileSync(archive)) };
  } finally { rmSync(temp, { recursive: true, force: true }); }
}
