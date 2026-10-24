import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync,
  mkdirSync, rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
import { schema604Fixture } from './fixtures/v075-schema604.ts';
import {
  inspectLegacyBaseline, prepareMigrationBaseline, type BaselineCheckpoint,
} from '../electron/infrastructure/migrations/baseline.ts';
import { createBackup, readVerifiedBackup } from '../electron/infrastructure/backup.ts';
import { readContainer, writeContainer } from '../electron/infrastructure/containers.ts';
import { DomainError } from '../shared/domain-error.ts';

const code = (expected: string) => (e: unknown) => e instanceof DomainError && e.code === expected;
const inspect = (f: ReturnType<typeof schema604Fixture>) => inspectLegacyBaseline(f.databasePath, f.dataDir);
const tempDirs = (root: string) => readdirSync(root).filter(n => n.startsWith('.gank-migration-baseline-'));

test('S1a frozen schema604 fixture matches S0, includes full old evidence and read-only fingerprint is repeatable', () => {
  const f = schema604Fixture();
  try {
    const main = readFileSync(f.databasePath), wal = readFileSync(f.databasePath + '-wal');
    const before = inspect(f);
    assert.equal(before.schemaHash, '355c28a533579ffed5ad3c007bb7406eabe3c0cbff0d63950446d89b8f81c0ad');
    assert.equal(before.tables.filter(t => t.name !== 'sqlite_sequence').length, 42);
    assert.equal(before.tables.find(t => t.name === 'attempts')!.rows, 2);
    assert.equal(before.tables.find(t => t.name === 'memory_reviews')!.rows, 2);
    assert.equal(before.media.length, 4);
    assert.equal(before.references.length, 5); // current + history + response + unbound draft
    assert.deepEqual(inspect(f), before);
    assert.deepEqual(readFileSync(f.databasePath), main);
    assert.deepEqual(readFileSync(f.databasePath + '-wal'), wal);
    assert.deepEqual(f.db.prepare('SELECT self_score FROM attempts ORDER BY id').all().map(r => r.self_score), [9.3, null]);
    assert.equal(f.db.prepare('SELECT count(*) n FROM attempts WHERE question_snapshot=?').get('')!.n, 1);
  } finally { f.close(); }
});

test('S1a old metadata is inspected and backed up without openDatabase title repair or version mutation', async () => {
  const f = schema604Fixture();
  try {
    const title = `${f.ids.qDeck} · 现期150，增长25%`;
    f.db.prepare('UPDATE questions SET title=? WHERE id=?').run(title, f.ids.question);
    const before = inspect(f);
    const result = await prepareMigrationBaseline(f.db, f.dataDir, join(f.root, 'old-metadata.zip'));
    assert.deepEqual(result.baseline, before);
    assert.equal(f.db.prepare('SELECT title FROM questions WHERE id=?').get(f.ids.question)!.title, title);
    const { files } = await readVerifiedBackup(result.backupPath);
    const path = join(f.root, 'read-only-copy.sqlite');
    writeFileSync(path, files.get('database.sqlite')!);
    const copy = new DatabaseSync(path, { readOnly: true });
    try {
      assert.equal(copy.prepare('SELECT title FROM questions WHERE id=?').get(f.ids.question)!.title, title);
      assert.equal(copy.prepare('SELECT content_version FROM questions WHERE id=?').get(f.ids.question)!.content_version, 2);
    } finally { copy.close(); }
  } finally { f.close(); }
});

test('S1a WAL-only committed rows survive two independently verified backups and restore with all table/media hashes', async () => {
  const f = schema604Fixture();
  try {
    assert(readFileSync(f.databasePath + '-wal').length > 32);
    copyFileSync(f.databasePath, join(f.root, 'unsafe-main-only.sqlite'));
    assert.throws(() => inspectLegacyBaseline(join(f.root, 'unsafe-main-only.sqlite'), f.dataDir));
    const before = inspect(f);
    for (let i = 0; i < 2; i++) {
      const output = join(f.root, `recovery-${i}.zip`);
      const result = await prepareMigrationBaseline(f.db, f.dataDir, output);
      assert.deepEqual(result.baseline, before);
      assert.match(result.backupSha256, /^[a-f0-9]{64}$/);
      const { files, manifest } = await readVerifiedBackup(output);
      assert.equal(manifest.schemaVersion, 604);
      const restore = join(f.root, 'restored-' + i);
      mkdirSync(join(restore, 'attachments'), { recursive: true });
      for (const [name, bytes] of files)
        if (name !== 'manifest.json') writeFileSync(join(restore, name === 'database.sqlite' ? 'ganksoft.sqlite' : name), bytes);
      assert.deepEqual(inspectLegacyBaseline(join(restore, 'ganksoft.sqlite'), restore), before);
    }
    assert.deepEqual(inspect(f), before);
    assert.deepEqual(tempDirs(f.root), []);
  } finally { f.close(); }
});

test('S1a AUTOINCREMENT high-water and duplicate rows/large integers/opaque bytes participate in the fingerprint', () => {
  const f = schema604Fixture();
  try {
    const before = inspect(f);
    f.db.exec("UPDATE sqlite_sequence SET seq=999999 WHERE name='audits'");
    assert.notEqual(inspect(f).digest, before.digest);
    f.db.exec('CREATE TABLE synthetic_extra(value); INSERT INTO synthetic_extra VALUES (9007199254740993),(9007199254740993),(X\'0001FF\')');
    const withDuplicates = inspect(f);
    assert.equal(withDuplicates.tables.find(t => t.name === 'synthetic_extra')!.rows, 3);
    f.db.exec('DELETE FROM synthetic_extra WHERE rowid=1');
    assert.notEqual(inspect(f).digest, withDuplicates.digest);
  } finally { f.close(); }
});

test('S1a backup labels the actual source schema rather than the application current schema constant', async () => {
  const f = schema604Fixture();
  try {
    f.db.exec('PRAGMA user_version=603');
    const output = join(f.root, 'schema603.zip');
    await createBackup(f.db, f.dataDir, output);
    const { manifest } = await readVerifiedBackup(output);
    assert.equal(manifest.schemaVersion, 603);
    assert.equal(f.db.prepare('PRAGMA user_version').get()!.user_version, 603);
  } finally { f.close(); }
});

for (const [name, mutate, expected] of [
  ['wrong schema', (f: ReturnType<typeof schema604Fixture>) => f.db.exec('PRAGMA user_version=999'), 'MIGRATION_SCHEMA_UNSUPPORTED'],
  ['wrong application marker', (f: ReturnType<typeof schema604Fixture>) => f.db.exec('PRAGMA application_id=0'), 'MIGRATION_SCHEMA_UNSUPPORTED'],
  ['missing required table', (f: ReturnType<typeof schema604Fixture>) => f.db.exec('DROP TABLE saved_filters'), 'MIGRATION_SCHEMA_UNSUPPORTED'],
  ['card identity collision', (f: ReturnType<typeof schema604Fixture>) => f.db.prepare('UPDATE memory_cards SET id=? WHERE id=?').run(f.ids.trashQuestion, f.ids.memory), 'MIGRATION_ID_COLLISION'],
  ['event identity collision', (f: ReturnType<typeof schema604Fixture>) => f.db.prepare('UPDATE memory_reviews SET id=? WHERE id=?').run(f.ids.attempt1, f.ids.memoryReview1), 'MIGRATION_ID_COLLISION'],
  ['missing historical-only media', (f: ReturnType<typeof schema604Fixture>) => rmSync(join(f.dataDir, 'attachments', f.ids.historicalImage + '.png')), 'MIGRATION_MEDIA_MISSING'],
  ['missing unbound draft media', (f: ReturnType<typeof schema604Fixture>) => rmSync(join(f.dataDir, 'attachments', f.ids.unboundImage + '.png')), 'MIGRATION_MEDIA_MISSING'],
  ['unknown attachment', (f: ReturnType<typeof schema604Fixture>) => writeFileSync(join(f.dataDir, 'attachments', 'unrecognized.bin'), 'do not silently omit'), 'MIGRATION_MEDIA_UNSAFE'],
  ['cross-deck association', (f: ReturnType<typeof schema604Fixture>) => f.db.prepare('UPDATE question_knowledge SET knowledge_id=? WHERE knowledge_id=?').run(f.ids.memoryNode, f.ids.child1), 'MIGRATION_SCOPE_INVALID'],
  ['parent cycle', (f: ReturnType<typeof schema604Fixture>) => f.db.prepare('UPDATE knowledge SET parent_id=? WHERE id=?').run(f.ids.child1, f.ids.root1), 'MIGRATION_TREE_INVALID'],
  ['empty identity', (f: ReturnType<typeof schema604Fixture>) => f.db.prepare("UPDATE knowledge SET id='' WHERE id=?").run(f.ids.deletedNode), 'MIGRATION_DATA_INVALID'],
  ['missing session image metadata', (f: ReturnType<typeof schema604Fixture>) => f.db.exec("UPDATE study_sessions SET payload=json_set(payload,'$.responseImages[0]','missing')"), 'MIGRATION_MEDIA_MISSING'],
] as const) test(`S1a ${name} rejects before recovery publication and never rewrites the invalid source`, async () => {
  const f = schema604Fixture();
  try {
    // Deliberate corruption fixtures may violate existing FK; the inspector must detect them.
    if (name === 'card identity collision') f.db.exec('PRAGMA foreign_keys=OFF');
    mutate(f);
    if (name === 'card identity collision') {
      // Retarget only this fixture's legitimate dependent rows so collision is the isolated defect.
      for (const [table, col] of [['memory_knowledge','card_id'],['memory_plans','card_id'],['memory_reviews','card_id']])
        f.db.prepare(`UPDATE ${table} SET ${col}=? WHERE ${col}=?`).run(f.ids.trashQuestion, f.ids.memory);
      for (const table of ['review_receipts','scheduling','schedule_events'])
        f.db.prepare(`UPDATE ${table} SET card_id=? WHERE kind='memory' AND card_id=?`).run(f.ids.trashQuestion, f.ids.memory);
      f.db.exec('PRAGMA foreign_keys=ON');
    }
    if (name === 'event identity collision')
      f.db.prepare("UPDATE review_receipts SET response=? WHERE kind='memory'")
        .run(JSON.stringify({ attemptId: f.ids.attempt1, score: 4, effective: true }));
    const wal = readFileSync(f.databasePath + '-wal');
    const output = join(f.root, 'must-not-exist.zip');
    await assert.rejects(() => prepareMigrationBaseline(f.db, f.dataDir, output), code(expected));
    assert(!existsSync(output)); assert.deepEqual(tempDirs(f.root), []);
    assert.deepEqual(readFileSync(f.databasePath + '-wal'), wal);
  } finally { f.close(); }
});

test('S1a corrupt JSON/foreign keys/image bytes are rejected rather than backed up as an acceptable migration baseline', async () => {
  for (const defect of ['json','fk','image']) {
    const f = schema604Fixture();
    try {
      if (defect === 'json') f.db.prepare('UPDATE memory_reviews SET card_snapshot=? WHERE id=?').run('{broken', f.ids.memoryReview1);
      if (defect === 'fk') { f.db.exec('PRAGMA foreign_keys=OFF'); f.db.prepare('UPDATE assets SET question_id=?').run('missing-question'); }
      if (defect === 'image') writeFileSync(join(f.dataDir, 'attachments', f.ids.currentImage + '.png'), 'not an image');
      await assert.rejects(() => prepareMigrationBaseline(f.db, f.dataDir, join(f.root, 'invalid.zip')));
      assert(!existsSync(join(f.root, 'invalid.zip')));
    } finally { f.close(); }
  }
});

for (const phase of ['backup-written','backup-verified','before-publish'] as BaselineCheckpoint[])
  test(`S1a injected failure at ${phase} leaves source unchanged and retry can produce a complete recovery point`, async () => {
    const f = schema604Fixture();
    try {
      const before = inspect(f), output = join(f.root, 'recovery.zip');
      await assert.rejects(() => prepareMigrationBaseline(f.db, f.dataDir, output, {
        checkpoint: reached => { if (reached === phase) throw Error('injected disk/copy failure'); },
      }), /injected/);
      assert.deepEqual(inspect(f), before); assert(!existsSync(output));
      assert.deepEqual(tempDirs(f.root), []);
      await prepareMigrationBaseline(f.db, f.dataDir, output);
      assert.deepEqual(inspect(f), before);
    } finally { f.close(); }
  });

test('S1a changes while backing up invalidate publication, and destination races never overwrite another file', async () => {
  for (const target of ['database','media','destination']) {
    const f = schema604Fixture();
    try {
      const output = join(f.root, 'recovery.zip');
      await assert.rejects(() => prepareMigrationBaseline(f.db, f.dataDir, output, {
        checkpoint: phase => {
          if (phase !== 'before-publish') return;
          if (target === 'database') f.db.prepare('UPDATE questions SET analysis=? WHERE id=?').run('concurrent change', f.ids.question);
          if (target === 'media') copyFileSync(join(f.dataDir, 'attachments', f.ids.currentImage + '.png'), join(f.dataDir, 'attachments', 'ffff.png'));
          if (target === 'destination') writeFileSync(output, 'other writer wins');
        },
      }), target === 'destination' ? { code: 'EEXIST' } : code('MIGRATION_SOURCE_CHANGED'));
      if (target === 'destination') assert.equal(readFileSync(output, 'utf8'), 'other writer wins');
      else assert(!existsSync(output));
      assert.deepEqual(tempDirs(f.root), []);
    } finally { f.close(); }
  }
});

test('S1a outstanding transaction and source-directory/existing outputs reject before copying', async () => {
  const f = schema604Fixture();
  try {
    const output = join(f.root, 'existing.zip'); writeFileSync(output, 'keep');
    await assert.rejects(() => prepareMigrationBaseline(f.db, f.dataDir, output), code('MIGRATION_DESTINATION_INVALID'));
    await assert.rejects(() => prepareMigrationBaseline(f.db, f.dataDir, join(f.dataDir, 'bad.zip')), code('MIGRATION_DESTINATION_INVALID'));
    const unrelated = join(f.root, 'unrelated'); mkdirSync(unrelated);
    await assert.rejects(() => prepareMigrationBaseline(f.db, unrelated, join(f.root, 'wrong-root.zip')), code('MIGRATION_SOURCE_INVALID'));
    f.db.exec('BEGIN IMMEDIATE');
    try { await assert.rejects(() => prepareMigrationBaseline(f.db, f.dataDir, join(f.root, 'busy.zip')), code('MIGRATION_SOURCE_BUSY')); }
    finally { f.db.exec('ROLLBACK'); }
    assert.equal(readFileSync(output, 'utf8'), 'keep');
    assert.deepEqual(tempDirs(f.root), []);
  } finally { f.close(); }
});

test('S1a shared ZIP verifier rejects tampering and traversal without opening or extracting database', async () => {
  const f = schema604Fixture();
  try {
    const output = join(f.root, 'recovery.zip');
    await prepareMigrationBaseline(f.db, f.dataDir, output);
    const files = await readContainer(output);
    files.set('database.sqlite', Buffer.from('tampered'));
    await writeContainer(output, files);
    await assert.rejects(() => readVerifiedBackup(output), /完整性校验/);
    const malicious = new Map([['database.sqlite', Buffer.from('unused')]]);
    malicious.set('manifest.json', Buffer.from(JSON.stringify({ format: 'ganksoft.backup', version: 1, schemaVersion: 604, createdAt: f.at, entries: [{ name: '../outside', size: 0, checksum: '0'.repeat(64) }] })));
    await writeContainer(output, malicious);
    await assert.rejects(() => readVerifiedBackup(output));
    assert(!existsSync(join(f.root, 'outside')));
  } finally { f.close(); }
});

test('S1a process exit after SQLite backup cannot publish a partial recovery point or modify the source', async () => {
  const f = schema604Fixture();
  try {
    const before = inspect(f), output = join(f.root, 'recovery.zip');
    const source = `import {DatabaseSync} from 'node:sqlite';
      import {prepareMigrationBaseline} from ${JSON.stringify(new URL('../electron/infrastructure/migrations/baseline.ts', import.meta.url).href)};
      const db=new DatabaseSync(process.argv[1]);
      await prepareMigrationBaseline(db,process.argv[2],process.argv[3],{checkpoint:p=>{if(p==='backup-written')process.exit(37)}});`;
    const child = spawnSync(process.execPath, ['--experimental-strip-types','--input-type=module','-e',source,f.databasePath,f.dataDir,output], { encoding: 'utf8', timeout: 30000 });
    assert.equal(child.status, 37, child.stderr);
    assert(!existsSync(output)); assert.deepEqual(inspect(f), before);
    assert.equal(tempDirs(f.root).length, 1); // retained diagnostic staging, never treated as success
    const retry = await prepareMigrationBaseline(f.db, f.dataDir, output);
    assert.deepEqual(retry.baseline, before);
  } finally { f.close(); }
});
