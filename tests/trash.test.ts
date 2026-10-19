import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openDatabase } from './fixture.ts';
import { Application } from '../electron/application.ts';
function fixture() {
  const db = openDatabase(':memory:'),
    dir = mkdtempSync(join(tmpdir(), 'gank-trash-'));
  const app = new Application({ db, dataDir: dir, now: () => new Date('2026-10-16T06:00:00Z') });
  return {
    db,
    dir,
    app,
    close: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
function q(app: Application, module = 'question-default', knowledge_ids: string[] = []) {
  return app.handle('question.save', {
    module,
    title: '测试错题',
    stem: '2+2=?',
    answer: 'A',
    knowledge_ids,
  });
}
function review(app: Application, id: string, errorIds: string[] = []) {
  return app.handle('review.submit', {
    question_id: id,
    question_version: 1,
    answer: 'A',
    thought: '先识别运算规则，再独立计算。',
    basis: 'independent',
    understanding: 2,
    faults: errorIds.length ? ['知识缺失'] : [],
    error_knowledge_ids: errorIds,
  });
}
function purge(app: Application, items: any[]) {
  const plan = app.handle('trash.preview', { items });
  return app.handle('trash.manage', { action: 'purge', items, expected: plan.revision });
}
test('mixed parent-first bulk restore keeps histories/plans and does not revive earlier individual deletions', () => {
  const f = fixture();
  const { app } = f;
  try {
    const folder = app.handle('folder.save', { name: '目录' });
    const deck = app.handle('deck.save', { name: '复盘', kind: 'question', folder_id: folder });
    const a = q(app, deck),
      old = q(app, deck);
    review(app, a);
    app.handle('question.delete', { id: old });
    app.handle('folder.action', { id: folder, action: 'delete', cascade: true });
    const prior = app.snapshot().scheduling[0].data;
    app.handle('trash.manage', {
      action: 'restore',
      items: [
        { kind: 'question', id: a },
        { kind: 'deck', id: deck },
        { kind: 'folder', id: folder },
      ],
    });
    const s = app.snapshot();
    assert.equal(s.folders.find((r) => r.id === folder).deleted_at, null);
    assert.equal(s.questions.find((r) => r.id === a).deleted_at, null);
    assert.ok(s.questions.find((r) => r.id === old).deleted_at);
    assert.equal(s.attempts.length, 1);
    assert.equal(s.scheduling[0].data, prior);
    assert.deepEqual(f.db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    f.close();
  }
});
test('purging a folder counts descendants, removes own reviews/schedules/images and preserves another deck history', () => {
  const f = fixture();
  const { app, db, dir } = f;
  try {
    const folder = app.handle('folder.save', { name: '目录' });
    const sub = app.handle('folder.save', { name: '子目录', parent_id: folder });
    const deck = app.handle('deck.save', { name: '错题集', kind: 'question', folder_id: sub });
    const mem = app.handle('deck.save', { name: '记忆集', kind: 'memory', folder_id: folder });
    const k = app.handle('knowledge.save', { module: deck, name: '加法' });
    const a = q(app, deck, [k]),
      other = q(app, 'question-default');
    const m = app.handle('memory.save', {
      module: mem,
      title: '概念',
      cue: '提示',
      content: '答案',
    });
    review(app, a, [k]);
    review(app, other);
    app.handle('memory.review', { id: m, version: 1, score: 3 });
    mkdirSync(join(dir, 'attachments'));
    writeFileSync(join(dir, 'attachments', 'a.png'), 'image');
    app.handle('asset.add', {
      id: 'asset-test',
      question_id: a,
      role: 'question',
      file_name: 'a.png',
      mime: 'image/png',
    });
    app.handle('folder.action', { id: folder, action: 'delete', cascade: true });
    const items = [{ kind: 'folder', id: folder }],
      plan = app.handle('trash.preview', { items });
    assert.deepEqual(plan.counts, { folder: 2, deck: 2, knowledge: 1, question: 1, memory: 1 });
    assert.equal(plan.history, 2);
    assert.equal(purge(app, items).attachmentCleanupPending, 0);
    const s = app.snapshot();
    assert.equal(s.questions.length, 1);
    assert.equal(s.questions[0].id, other);
    assert.equal(s.attempts.length, 1);
    assert.equal(s.attempts[0].question_id, other);
    assert.equal(s.attempts[0].knowledge_names, '');
    assert.equal(s.scheduling.length, 1);
    assert.equal(s.scheduleEvents.length, 1);
    assert.equal(s.memories.length, 0);
    assert.ok(!existsSync(join(dir, 'attachments', 'a.png')));
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    f.close();
  }
});
test('purging a child prunes old restore manifests and session queue; parent can subsequently restore', () => {
  const f = fixture();
  const { app, db } = f;
  try {
    const folder = app.handle('folder.save', { name: '目录' });
    const deck = app.handle('deck.save', { name: '卡片集', kind: 'question', folder_id: folder });
    const a = q(app, deck),
      b = q(app, deck);
    app.handle('session.save', {
      deck_id: deck,
      payload: {
        schemaVersion: 1,
        sessionId: 'trash-session',
        entryId: 'trash-entry',
        contentVersion: 1,
        ids: [a, b],
        index: 0,
        stage: 'answer',
        thought: '旧思路',
      },
    });
    app.handle('folder.action', { id: folder, action: 'delete', cascade: true });
    purge(app, [{ kind: 'question', id: a }]);
    const s = JSON.parse(app.snapshot().sessions[0].payload);
    assert.deepEqual(s.ids, [b]);
    assert.equal(s.thought, '');
    purge(app, [{ kind: 'deck', id: deck }]);
    app.handle('trash.manage', { action: 'restore', items: [{ kind: 'folder', id: folder }] });
    assert.equal(app.snapshot().folders.find((r) => r.id === folder).deleted_at, null);
    assert.ok(!app.snapshot().decks.some((r) => r.id === deck));
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    f.close();
  }
});
test('stale purge previews and live records are rejected; failed multi-restore rolls back earlier items', () => {
  const f = fixture();
  const { app } = f;
  try {
    const a = q(app),
      live = q(app);
    app.handle('question.delete', { id: a });
    const items = [{ kind: 'question', id: a }],
      plan = app.handle('trash.preview', { items });
    app.handle('folder.save', { name: '新目录' });
    assert.throws(
      () => app.handle('trash.manage', { action: 'purge', items, expected: plan.revision }),
      /范围已变化/,
    );
    assert.throws(() => purge(app, [{ kind: 'question', id: live }]), /已恢复或删除/);
    const md = app.handle('deck.save', { name: '记忆集', kind: 'memory' });
    const m = app.handle('memory.save', {
      module: md,
      title: '概念',
      cue: '提示',
      content: '答案',
    });
    app.handle('deck.action', { id: md, action: 'delete' });
    assert.throws(
      () =>
        app.handle('trash.manage', {
          action: 'restore',
          items: [...items, { kind: 'memory', id: m }],
        }),
      /卡片集不存在或已删除/,
    );
    assert.ok(app.snapshot().questions.find((r) => r.id === a).deleted_at);
  } finally {
    f.close();
  }
});
test('purging a knowledge parent detaches surviving children without deleting them', () => {
  const f = fixture();
  const { app, db } = f;
  try {
    const parent = app.handle('knowledge.save', { module: 'question-default', name: '父' });
    const child = app.handle('knowledge.save', {
      module: 'question-default',
      name: '子',
      parent_id: parent,
    });
    app.handle('knowledge.delete', { id: child });
    app.handle('knowledge.delete', { id: parent });
    purge(app, [{ kind: 'knowledge', id: parent }]);
    app.handle('trash.manage', { action: 'restore', items: [{ kind: 'knowledge', id: child }] });
    assert.equal(app.snapshot().knowledge.find((r) => r.id === child).parent_id, null);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    f.close();
  }
});
test('intentional reimport after purge creates only the missing card and keeps other import identities', () => {
  const f = fixture();
  const { app } = f;
  try {
    const pkg = JSON.parse(
      readFileSync(new URL('../examples/fresh-review-12.gank.json', import.meta.url), 'utf8'),
    );
    const options = { targetDeckId: 'question-default' };
    const commit = () => {
      const expected = app.handle('import.preview', { package: pkg, options });
      assert.deepEqual(expected.errors, []);
      app.handle('import.commit', { package: pkg, options, expected });
    };
    commit();
    const before = app.snapshot().questions;
    app.handle('question.delete', { id: before[0].id });
    purge(app, [{ kind: 'question', id: before[0].id }]);
    commit();
    const after = app.snapshot().questions;
    assert.equal(after.length, 12);
    assert.ok(!after.some((r) => r.id === before[0].id));
    for (const row of before.slice(1)) assert.ok(after.some((r) => r.id === row.id));
  } finally {
    f.close();
  }
});
