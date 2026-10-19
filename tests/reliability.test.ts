import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {openDatabase} from './fixture.ts';
import {SCHEMA_VERSION} from '../electron/infrastructure/database.ts';
import { Application } from '../electron/application.ts';
import { createBackup, stageBackup } from '../electron/infrastructure/backup.ts';
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'gank-reliable-'));
  let db = openDatabase(join(dir, 'ganksoft.sqlite')),
    now = new Date('2026-10-16T06:30:00Z');
  let app = new Application({ db, dataDir: dir, now: () => new Date(now) });
  return {
    dir,
    get app() {
      return app;
    },
    get db() {
      return db;
    },
    setTime(value: string) {
      now = new Date(value);
    },
    reopen() {
      db.close();
      db = openDatabase(join(dir, 'ganksoft.sqlite'));
      app = new Application({ db, dataDir: dir, now: () => new Date(now) });
    },
    close() {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
function question(app: Application) {
  return app.handle('question.save', {
    module: 'question-default',
    title: '可靠性测试',
    stem: '现期120，增长20%，基期多少？',
    options: 'A. 80\nB. 100\nC. 120\nD. 144',
    answer: 'B',
    analysis: '120 / 1.2 = 100',
  });
}
function payload(app: Application, id: string, n = 1) {
  const q = app.snapshot().questions.find((q) => q.id === id);
  return {
    request_id: `reliable-request-${n}`,
    question_id: id,
    question_version: q.version,
    content_version: q.content_version,
    answer: 'B',
    thought: `独立思路${n}：先识别基期再列式。`,
    fault_detail: `具体卡点${n}`,
    improvement: `解析后反思${n}`,
    basis: 'independent',
    understanding: 2,
    faults: [] as string[],
    error_knowledge_ids: [] as string[],
  };
}
test('three independent reviews retain all fields, full content and knowledge snapshots after restart and ZIP restore', async () => {
  const f = fixture();
  try {
    const id = question(f.app),
      k = f.app.handle('knowledge.save', { module: 'question-default', name: '基期量' });
    let q = f.app.snapshot().questions[0];
    f.app.handle('question.save', { ...q, knowledge_ids: [k] });
    for (let n = 1; n <= 3; n++) {
      f.setTime(`2026-10-${15 + n}T06:30:00Z`);
      f.app.handle('review.submit', {
        ...payload(f.app, id, n),
        answer: n === 1 ? 'A' : 'B',
        faults: ['知识缺失'],
        error_knowledge_ids: [k],
      });
    }
    const before = f.app.snapshot();
    assert.equal(before.attempts.length, 3);
    assert.deepEqual(before.attempts.map((a) => a.fault_detail).sort(), [
      '具体卡点1',
      '具体卡点2',
      '具体卡点3',
    ]);
    for (const a of before.attempts) {
      assert.equal(JSON.parse(a.question_snapshot).stem, before.questions[0].stem);
      assert.equal(JSON.parse(a.knowledge_snapshot)[0].name, '基期量');
    }
    const originalKnowledge = f.app.snapshot().knowledge.find((node) => node.id === k);
    f.app.handle('knowledge.save', { ...originalKnowledge, name: '基期量（新名称）' });
    q = f.app.snapshot().questions[0];
    f.app.handle('question.save', {
      ...q,
      stem: '现期150，增长25%，基期多少？',
      options: 'A. 100\nB. 120\nC. 130\nD. 150',
    });
    f.app.handle('session.save', {
      deck_id: 'question-default',
      payload: {
        schemaVersion: 1,
        sessionId: 'backup-draft',
        entryId: 'backup-draft-entry',
        ids: [id],
        index: 0,
        stage: 'answer',
        contentVersion: f.app.snapshot().questions[0].content_version,
        thought: '备份前尚未提交的独立草稿',
      },
    });
    const sessionsBefore = f.app.snapshot().sessions;
    f.reopen();
    assert.deepEqual(f.app.snapshot().attempts, before.attempts);
    assert.deepEqual(f.app.snapshot().sessions, sessionsBefore);
    const file = join(f.dir, 'full.zip');
    await createBackup(f.db, f.dir, file);
    await stageBackup(file, join(f.dir, 'restored'));
    const restored = openDatabase(join(f.dir, 'restored/ganksoft.sqlite'));
    try {
      const s = new Application({ db: restored, dataDir: f.dir, now: () => new Date() }).snapshot();
      assert.deepEqual(s.attempts, before.attempts);
      assert.deepEqual(s.sessions, sessionsBefore);
      assert.deepEqual(s.scheduleEvents, before.scheduleEvents);
      assert.deepEqual(s.scheduling, f.app.snapshot().scheduling);
    } finally {
      restored.close();
    }
  } finally {
    f.close();
  }
});
test('retry uses one receipt and one record, including after reopen; conflicting request reuse rejects', () => {
  const f = fixture();
  try {
    const id = question(f.app),
      p = payload(f.app, id);
    const first = f.app.handle('review.submit', p);
    assert.deepEqual(f.app.handle('review.submit', p), first);
    f.reopen();
    assert.deepEqual(f.app.handle('review.submit', p), first);
    assert.equal(f.app.snapshot().attempts.length, 1);
    assert.equal(f.app.snapshot().scheduleEvents.length, 1);
    assert.throws(() => f.app.handle('review.submit', { ...p, thought: '篡改原稿' }), /请求编号/);
  } finally {
    f.close();
  }
});
test('free-text fault detail persists without classification and a failed submit leaves no receipt or schedule', () => {
  const f = fixture();
  try {
    const id = question(f.app);
    f.app.handle('review.submit', payload(f.app, id));
    assert.equal(f.app.snapshot().attempts[0].fault_detail, '具体卡点1');
    const p = payload(f.app, id, 2);
    assert.throws(() => f.app.handle('review.submit', { ...p, faults: ['不存在的分类'] }));
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM review_receipts').get().n, 1);
    assert.equal(f.app.snapshot().attempts.length, 1);
  } finally {
    f.close();
  }
});
test('core content includes options/material; reset retains pause, metadata edit does not invalidate content', () => {
  const f = fixture();
  try {
    const id = question(f.app);
    f.app.handle('review.submit', payload(f.app, id));
    f.app.handle('plan.set', { id, action: 'pause' });
    let q = f.app.snapshot().questions[0];
    const v = q.content_version;
    f.app.handle('question.note', { id, version: q.version, note: '长期笔记' });
    q = f.app.snapshot().questions[0];
    assert.equal(q.content_version, v);
    f.app.handle('question.save', { ...q, options: 'A. 100\nB. 80\nC. 120\nD. 144' });
    q = f.app.snapshot().questions[0];
    assert.equal(q.content_version, v + 1);
    assert.equal(q.paused, 1);
    assert.equal(f.app.snapshot().scheduling.length, 0);
    assert.throws(
      () => f.app.handle('review.submit', { ...payload(f.app, id, 2), content_version: v }),
      /版本|修改/,
    );
    assert.throws(() => f.app.handle('question.save', { ...q, answer: '' }), /正确答案/);
  } finally {
    f.close();
  }
});
test('session schema rejects invalid/cross-deck queue and stale writes; reveal freezes original thought', () => {
  const f = fixture();
  try {
    const id = question(f.app);
    assert.throws(
      () =>
        f.app.handle('session.save', {
          deck_id: 'question-default',
          payload: { ids: [id], index: -1, stage: 'answer' },
        }),
      /会话|进度/,
    );
    const m = f.app.handle('memory.save', {
      module: 'memory-default',
      title: '记忆',
      cue: '提示',
      content: '答案',
    });
    assert.throws(
      () =>
        f.app.handle('session.save', {
          deck_id: 'question-default',
          payload: { ids: [m], index: 0, stage: 'answer' },
        }),
      /卡片|会话/,
    );
    const s = {
      schemaVersion: 1,
      sessionId: 'test-session',
      entryId: 'entry-1',
      ids: [id],
      index: 0,
      stage: 'answer',
      contentVersion: 1,
      answer: 'B',
      thought: '原始独立思路',
    };
    const saved = f.app.handle('session.save', {
      deck_id: 'question-default',
      payload: s,
      expected_revision: 0,
    });
    assert.throws(
      () =>
        f.app.handle('session.save', {
          deck_id: 'question-default',
          payload: s,
          expected_revision: 0,
        }),
      /版本|变化/,
    );
    f.app.handle('session.save', {
      deck_id: 'question-default',
      payload: { ...s, stage: 'reveal' },
      expected_revision: saved.revision,
    });
    const row = f.app.snapshot().sessions[0];
    assert.throws(
      () =>
        f.app.handle('session.save', {
          deck_id: 'question-default',
          payload: { ...JSON.parse(row.payload), thought: '解析后的想法冒充原稿' },
          expected_revision: row.revision,
        }),
      /思路|原稿/,
    );
  } finally {
    f.close();
  }
});
test('review commit and session progress succeed together or roll back together', () => {
  const f = fixture();
  try {
    const id = question(f.app);
    const draft = {
      schemaVersion: 1,
      sessionId: 'test-session',
      entryId: 'entry-commit',
      ids: [id],
      index: 0,
      stage: 'reveal',
      contentVersion: 1,
      answer: 'B',
      thought: '独立计算过程',
    };
    f.app.handle('session.save', { deck_id: 'question-default', payload: draft });
    const p = {
      ...payload(f.app, id),
      request_id: 'entry-commit',
      thought: draft.thought,
      session_id: 'test-session',
      deck_id: 'question-default',
    };
    assert.throws(() => f.app.handle('review.submit', { ...p, thought: '其他原稿' }), /思路|会话/);
    assert.equal(f.app.snapshot().attempts.length, 0);
    const r = f.app.handle('review.submit', p);
    const s = JSON.parse(f.app.snapshot().sessions[0].payload);
    assert.equal(s.stage, 'result');
    assert.equal(s.savedResult.attemptId, r.attemptId);
    assert.deepEqual(f.app.handle('review.submit', p), r);
  } finally {
    f.close();
  }
});
test('failed backup leaves existing destination untouched', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gank-backup-failure-')),
    file = join(dir, 'existing.zip');
  const db = openDatabase(join(dir, 'db.sqlite'));
  db.close();
  writeFileSync(file, 'existing-backup');
  try {
    await assert.rejects(() => createBackup(db, dir, file));
    assert.equal(readFileSync(file, 'utf8'), 'existing-backup');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('session storage failure rolls back review, receipt and FSRS together; same request can retry', () => {
  const f = fixture();
  try {
    const id = question(f.app);
    const s = {
      schemaVersion: 1,
      sessionId: 'session-failure',
      entryId: 'entry-failure',
      ids: [id],
      index: 0,
      stage: 'reveal',
      contentVersion: 1,
      answer: 'B',
      thought: '独立作答',
    };
    f.app.handle('session.save', { deck_id: 'question-default', payload: s });
    f.db.exec(
      "CREATE TRIGGER reject_session_update BEFORE UPDATE ON study_sessions BEGIN SELECT RAISE(ABORT,'模拟会话存储失败'); END;",
    );
    const p = {
      ...payload(f.app, id),
      request_id: s.entryId,
      thought: s.thought,
      session_id: s.sessionId,
      deck_id: 'question-default',
    };
    assert.throws(() => f.app.handle('review.submit', p), /模拟会话/);
    assert.equal(f.app.snapshot().attempts.length, 0);
    assert.equal(f.app.snapshot().scheduling.length, 0);
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM review_receipts').get().n, 0);
    f.db.exec('DROP TRIGGER reject_session_update');
    f.app.handle('review.submit', p);
    assert.equal(f.app.snapshot().attempts.length, 1);
  } finally {
    f.close();
  }
});
test('memory review uses the same idempotent workflow; content edits retain pause', () => {
  const f = fixture();
  try {
    const id = f.app.handle('memory.save', {
      module: 'memory-default',
      title: '记忆卡',
      cue: '提示',
      content: '答案',
    });
    const p = {
      request_id: 'memory-retry',
      id,
      content_version: 1,
      score: 3,
      note: '本次回忆笔记',
    };
    const r = f.app.handle('memory.review', p);
    assert.deepEqual(f.app.handle('memory.review', p), r);
    assert.equal(f.app.snapshot().memoryReviews.length, 1);
    f.app.handle('memory.action', { id, action: 'pause' });
    const m = f.app.snapshot().memories[0];
    f.app.handle('memory.save', { ...m, content: '新版答案' });
    assert.equal(f.app.snapshot().memories[0].paused, 1);
    assert.throws(
      () => f.app.handle('memory.review', { ...p, request_id: 'new-memory-request' }),
      /修改/,
    );
  } finally {
    f.close();
  }
});
test('image changes invalidate old drafts and original image remains available to historical snapshot', async () => {
  const f = fixture();
  try {
    const id = question(f.app),
      name = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png';
    mkdirSync(join(f.dir, 'attachments'));
    writeFileSync(join(f.dir, 'attachments', name), 'image-original');
    f.app.handle('asset.add', {
      id: 'history-image',
      question_id: id,
      role: 'question',
      file_name: name,
      mime: 'image/png',
    });
    const p = payload(f.app, id);
    f.app.handle('review.submit', p);
    f.app.handle('asset.delete', { id: 'history-image' });
    assert.throws(
      () => f.app.handle('review.submit', { ...p, request_id: 'after-image-deletion' }),
      /修改/,
    );
    const a = f.app.snapshot().attempts[0];
    assert.equal(JSON.parse(a.question_snapshot).assets[0].file_name, name);
    const file = join(f.dir, 'with-history.zip');
    await createBackup(f.db, f.dir, file);
    await stageBackup(file, join(f.dir, 'recovered'));
    assert.equal(
      readFileSync(join(f.dir, 'recovered/attachments', name), 'utf8'),
      'image-original',
    );
  } finally {
    f.close();
  }
});
test('content export/import preserves long-term project notes', () => {
  const f = fixture();
  try {
    const id = question(f.app);
    f.app.handle('question.note', { id, version: 1, note: '长期笔记：注意先识别指标。' });
    const pkg = f.app.handle('deck.package', { id: 'question-default' });
    assert.equal(pkg.items[0].projectNote, '长期笔记：注意先识别指标。');
    const target = f.app.handle('deck.save', { name: '接收测试', kind: 'question' });
    const options = { targetDeckId: target };
    const expected = f.app.handle('import.preview', { package: pkg, options });
    assert.deepEqual(expected.errors, []);
    f.app.handle('import.commit', { package: pkg, options, expected });
    assert.equal(
      f.app.snapshot().questions.find((q) => q.module === target).project_note,
      '长期笔记：注意先识别指标。',
    );
  } finally {
    f.close();
  }
});
