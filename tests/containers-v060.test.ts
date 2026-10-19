import { SCHEMA_VERSION as CURRENT_SCHEMA } from "../electron/infrastructure/database.ts";
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  renameSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase, DEFAULT_QUESTION_DECK as Q } from '../electron/infrastructure/database.ts';
import { writeContainer, readContainer } from '../electron/infrastructure/containers.ts';
import { writeContentPackage, readContentPackage } from '../electron/modules/imports/container.ts';
import { createBackup, stageBackup } from '../electron/infrastructure/backup.ts';
import {
  writeRestoreJournal,
  recoverInterruptedRestore,
  finishRestoreJournal,
} from '../electron/infrastructure/restore-journal.ts';
import type { ExchangePackage } from '../shared/import-protocol.ts';
import { Transformer } from '@napi-rs/image';
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'gank-container-'));
  return {
    dir,
    close() {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
test('new content ZIP carries binary images and validates content/reference/checksums', async () => {
  const f = fixture();
  try {
    const pkg: ExchangePackage = {
      format: 'ganksoft.content',
      schemaVersion: '2.0',
      packageId: 'test',
      namespace: 'test',
      archives: [],
      items: [
        {
          key: 'one',
          kind: 'question',
          subject: Q,
          title: '题目',
          stem: '计算题',
          answer: 'A',
          knowledgeRefs: [],
          images: [
            {
              role: 'question',
              mime: 'image/png',
              base64: Transformer.fromRgbaPixels(Buffer.from([0, 0, 0, 255]), 1, 1)
                .pngSync()
                .toString('base64'),
            },
          ],
        },
      ],
    };
    const file = join(f.dir, 'content.zip');
    await writeContentPackage(file, pkg);
    assert.deepEqual(await readContentPackage(file), pkg);
    const entries = await readContainer(file);
    assert(entries.has('assets/0-0.bin'));
    assert(!entries.get('content.json')!.toString().includes('base64'));
    entries.set('assets/0-0.bin', Buffer.from('tampered'));
    await writeContainer(file, entries);
    await assert.rejects(() => readContentPackage(file), /校验失败/);
  } finally {
    f.close();
  }
});
test('ZIP writer rejects escaping and overlarge entry names; malformed archives do not extract', async () => {
  const f = fixture();
  try {
    for (const name of ['../outside', '/absolute', 'a\\b', 'a/../b', 'C:/file', 'a//b'])
      await assert.rejects(
        () => writeContainer(join(f.dir, 'bad.zip'), new Map([[name, Buffer.from('x')]])),
        /路径/,
      );
    writeFileSync(join(f.dir, 'bad.zip'), 'not a zip');
    await assert.rejects(() => readContainer(join(f.dir, 'bad.zip')));
    assert(!existsSync(join(f.dir, 'outside')));
  } finally {
    f.close();
  }
});
test('new backup rejects old JSON and tampering without replacing source', async () => {
  const f = fixture();
  const data = join(f.dir, 'data');
  mkdirSync(data);
  const db = openDatabase(join(data, 'ganksoft.sqlite'));
  try {
    const file = join(f.dir, 'backup.zip');
    await createBackup(db, data, file);
    await stageBackup(file, join(f.dir, 'restored'));
    const restored = openDatabase(join(f.dir, 'restored', 'ganksoft.sqlite'));
    assert.equal(restored.prepare('PRAGMA user_version').get()!.user_version, CURRENT_SCHEMA);
    restored.close();
    const files = await readContainer(file);
    files.set('database.sqlite', Buffer.from('bad'));
    await writeContainer(file, files);
    await assert.rejects(() => stageBackup(file, join(f.dir, 'bad')), /完整性校验/);
    assert(!existsSync(join(f.dir, 'bad')));
    writeFileSync(file, JSON.stringify({ format: 'GankSoftBackup', version: 2 }));
    await assert.rejects(() => stageBackup(file, join(f.dir, 'old')));
    assert.equal(db.prepare('SELECT count(*) n FROM decks').get()!.n, 2);
  } finally {
    db.close();
    f.close();
  }
});
test('old or unknown database is rejected with no schema takeover', () => {
  const f = fixture();
  try {
    const file = join(f.dir, 'old.sqlite');
    const db = new DatabaseSync(file);
    db.exec('CREATE TABLE old_data(id TEXT);PRAGMA user_version=9');
    db.close();
    assert.throws(() => openDatabase(file), /不能打开或迁移/);
    const check = new DatabaseSync(file);
    assert.equal(check.prepare('PRAGMA user_version').get()!.user_version, 9);
    check.close();
  } finally {
    f.close();
  }
});
test('interrupted restore recovers original directory at every swap boundary', () => {
  const f = fixture();
  try {
    for (const phase of ['prepared', 'old-moved', 'new-moved']) {
      const data = join(f.dir, phase),
        stage = data + '-staging-id',
        old = data + '-before-restore-1';
      mkdirSync(data);
      mkdirSync(stage);
      writeFileSync(join(data, 'marker'), 'original');
      writeFileSync(join(stage, 'marker'), 'restored');
      writeRestoreJournal(data, stage, old);
      if (phase !== 'prepared') renameSync(data, old);
      if (phase === 'new-moved') renameSync(stage, data);
      assert(recoverInterruptedRestore(data));
      assert.equal(readFileSync(join(data, 'marker'), 'utf8'), 'original');
      assert(!existsSync(stage));
      assert(!recoverInterruptedRestore(data));
    }
    const done = join(f.dir, 'done');
    mkdirSync(done);
    writeRestoreJournal(done, done + '-staging-id', done + '-before-restore-1');
    finishRestoreJournal(done);
    assert(!recoverInterruptedRestore(done));
  } finally {
    f.close();
  }
});

test('JSON and ZIP import use the same content protocol and reject invalid JSON/schema/images', async () => {
  const f = fixture();
  try {
    const pkg = JSON.parse(
      readFileSync(new URL('../examples/fresh-review-12.gank.json', import.meta.url), 'utf8'),
    );
    const json = join(f.dir, '中文 空格.gank.json');
    writeFileSync(json, '\uFEFF' + JSON.stringify(pkg));
    assert.deepEqual(await readContentPackage(json), pkg);
    const zip = join(f.dir, 'content.zip');
    await writeContentPackage(zip, pkg);
    assert.deepEqual(await readContentPackage(json), await readContentPackage(zip));
    writeFileSync(json, '{bad json');
    await assert.rejects(() => readContentPackage(json), /JSON 文件格式错误/);
    writeFileSync(json, JSON.stringify({ ...pkg, schemaVersion: '1.0' }));
    await assert.rejects(() => readContentPackage(json), /2.0/);
    pkg.items[0].images = [{ role: 'question', mime: 'image/png', base64: 'bm90IGFuIGltYWdl' }];
    writeFileSync(json, JSON.stringify(pkg));
    await assert.rejects(() => readContentPackage(json));
  } finally {
    f.close();
  }
});
