import { SCHEMA_VERSION as CURRENT_SCHEMA } from "../electron/infrastructure/database.ts";
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, DEFAULT_QUESTION_DECK as Q } from '../electron/infrastructure/database.ts';
import { Application } from '../electron/application.ts';
import { createApplicationProtocol } from '../electron/protocol/gateway.ts';
import { createClient } from '../shared/protocol/client.ts';
import { contentIdentity } from '../shared/protocol/identity.ts';
import { queueIdentity, formatStudyTime } from '../shared/study-pages.ts';
import { createBackup, stageBackup } from '../electron/infrastructure/backup.ts';

test('page identity ignores order but distinguishes subsets and decks', () => {
  assert.equal(queueIdentity('a', ['1', '2']), queueIdentity('a', ['2', '1']));
  assert.notEqual(queueIdentity('a', ['1']), queueIdentity('a', ['1', '2']));
  assert.notEqual(queueIdentity('a', ['1']), queueIdentity('b', ['1']));
  assert.equal(formatStudyTime(3661), '01:01:01');
});
test('same-deck pages isolate revisions, submissions, timers and close; duplicate sets rejected by host', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gank-pages-test-')),
    db = openDatabase(join(dir, 'ganksoft.sqlite'));
  const app = new Application({ db, dataDir: dir, now: () => new Date('2026-10-17T08:00:00Z') });
  const gateway = createApplicationProtocol(app),
    client = createClient((r) => gateway.execute(r));
  try {
    await client.call('app.capabilities', {});
    const a = await client.call('content.question.save', {
      deckId: Q,
      title: '甲',
      stem: '甲题',
      answer: 'B',
    });
    const b = await client.call('content.question.save', {
      deckId: Q,
      title: '乙',
      stem: '乙题',
      answer: 'B',
    });
    const draft = (ids: string[]) => ({
      sessionId: randomUUID(),
      entryId: randomUUID(),
      ids,
      index: 0,
      stage: 'answer' as const,
      contentVersion: contentIdentity(ids[0], 1),
      answer: 'B',
      thought: '独立推导',
      totalSeconds: 45,
      timerPaused: true,
      pageTitle: '完整方案名称',
    });
    const first = draft([a, b]),
      second = draft([b]);
    const r1 = await client.call('session.draft', { deckId: Q, expectedRevision: 0, draft: first });
    const r2 = await client.call('session.draft', {
      deckId: Q,
      expectedRevision: 0,
      draft: second,
    });
    await assert.rejects(
      client.call('session.draft', { deckId: Q, expectedRevision: 0, draft: draft([b, a]) }),
      { code: 'DUPLICATE_SESSION' },
    );
    const reveal = await client.call('session.reveal', {
      deckId: Q,
      expectedRevision: r1.revision,
      draft: { ...first, stage: 'reveal', selfScore: 9 },
    });
    const result = await client.send(
      client.prepare(
        'review.question.submit',
        {
          requestId: first.entryId,
          kind: 'question',
          cardId: a,
          deckId: Q,
          sessionId: first.sessionId,
          expectedSessionRevision: reveal.revision,
          contentVersion: first.contentVersion,
          answer: 'B',
          thought: '独立推导',
          basis: 'independent',
          understanding: 3,
          selfScore: 9,
          elapsedSeconds: 12,
        },
        first.entryId,
      ),
    );
    assert(result.attemptId);
    const rows = db.prepare('SELECT * FROM study_sessions').all();
    const other = rows.find((r) => JSON.parse(String(r.payload)).sessionId === second.sessionId)!;
    assert.equal(other.revision, r2.revision);
    assert.equal(JSON.parse(String(other.payload)).stage, 'answer');
    assert.equal(JSON.parse(String(other.payload)).totalSeconds, 45);
    await client.call('session.finish', {
      deckId: Q,
      sessionId: first.sessionId,
      expectedRevision: reveal.revision + 1,
    });
    assert.equal(db.prepare('SELECT count(*) n FROM study_sessions').get()!.n, 1);
    assert.equal(app.snapshot().attempts.length, 1);
    await createBackup(db, dir, join(dir, 'backup.zip'));
    await stageBackup(join(dir, 'backup.zip'), join(dir, 'restored'));
    const restored = openDatabase(join(dir, 'restored/ganksoft.sqlite'));
    assert.equal(
      JSON.parse(String(restored.prepare('SELECT payload FROM study_sessions').get()!.payload))
        .sessionId,
      second.sessionId,
    );
    restored.close();
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test('schema600 migration preserves original draft bytes and revision across reopen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gank-pages-migrate-')),
    path = join(dir, 'ganksoft.sqlite');
  let db = openDatabase(path);
  const payload = JSON.stringify({
    schemaVersion: 1,
    sessionId: randomUUID(),
    entryId: randomUUID(),
    ids: [],
    index: 0,
    stage: 'answer',
    contentVersion: 1,
    thought: '原始草稿',
  });
  try {
    db.exec(
      'DROP TABLE study_sessions; CREATE TABLE study_sessions(deck_id TEXT PRIMARY KEY REFERENCES decks(id),payload TEXT NOT NULL,updated_at TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1);PRAGMA user_version=600;',
    );
    db.prepare('INSERT INTO study_sessions VALUES(?,?,?,?)').run(Q, payload, '2026-10-17', 7);
    db.close();
    db = openDatabase(path);
    const r = db.prepare('SELECT * FROM study_sessions').get()!;
    assert.equal(r.payload, payload);
    assert.equal(r.revision, 7);
    assert.equal(db.prepare('PRAGMA user_version').get()!.user_version, CURRENT_SCHEMA);
    db.close();
    db = openDatabase(path);
    assert.equal(db.prepare('SELECT count(*) n FROM study_sessions').get()!.n, 1);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
