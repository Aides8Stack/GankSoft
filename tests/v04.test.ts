import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {openDatabase} from './fixture.ts';
import {SCHEMA_VERSION} from '../electron/infrastructure/database.ts';
import { Application } from '../electron/application.ts';
function fixture() {
  const db = openDatabase(':memory:');
  let now = new Date('2026-10-15T12:00:00Z');
  return {
    db,
    app: new Application({ db, dataDir: ':memory:', now: () => new Date(now) }),
    set: (date: string) => (now = new Date(date)),
  };
}
function memory(app: Application) {
  return app.handle('memory.save', {
    module: 'memory-default',
    title: '概念',
    cue: '是什么',
    content: '内容',
  });
}
function question(app: Application) {
  return app.handle('question.save', {
    module: 'question-default',
    title: '计算',
    stem: '2+2',
    answer: 'A',
    status: 'ready',
  });
}
test('wrong-question review requires a thought before any history or FSRS changes', () => {
  const { db, app } = fixture();
  try {
    const q = question(app);
    assert.throws(
      () =>
        app.handle('review.submit', {
          question_id: q,
          question_version: 1,
          answer: 'A',
          basis: 'independent',
          understanding: 3,
        }),
      /思路/,
    );
    assert.equal(app.snapshot().attempts.length, 0);
    assert.equal(app.snapshot().scheduling.length, 0);
    app.handle('review.submit', {
      question_id: q,
      question_version: 1,
      answer: 'A',
      thought: '先计算二加二等于四',
      basis: 'independent',
      understanding: 3,
    });
    assert.equal(app.snapshot().attempts[0].thought, '先计算二加二等于四');
    assert.match(app.snapshot().attempts[0].algorithm, /FSRS/);
  } finally {
    db.close();
  }
});
test('FSRS persists per-card state, permits due relearning and keeps practice out of scheduling', () => {
  const { db, app, set } = fixture();
  try {
    const card = memory(app);
    app.handle('memory.review', { id: card, version: 1, score: 0 });
    let s = app.snapshot();
    const before = s.scheduling[0].data;
    assert.equal(s.scheduleEvents.length, 1);
    assert.equal(s.scheduleEvents[0].rating, 1);
    app.handle('memory.review', { id: card, version: 1, score: 4, practice: true });
    assert.equal(app.snapshot().scheduling[0].data, before);
    set(JSON.parse(before).due);
    const r = app.handle('memory.review', { id: card, version: 1, score: 3 });
    assert.ok(r.effective);
    assert.equal(app.snapshot().scheduleEvents.length, 2);
    assert.equal(app.snapshot().memoryReviews.length, 3);
  } finally {
    db.close();
  }
});
test('folder-only deletion lifts content and cascade restore excludes previously deleted cards', () => {
  const { db, app } = fixture();
  try {
    const root = app.handle('folder.save', { name: '根' }),
      sub = app.handle('folder.save', { name: '子', parent_id: root }),
      deck = app.handle('deck.save', { name: '集', kind: 'memory', folder_id: sub });
    const a = app.handle('memory.save', { module: deck, title: 'a', cue: 'a', content: 'a' }),
      b = app.handle('memory.save', { module: deck, title: 'b', cue: 'b', content: 'b' });
    app.handle('memory.action', { id: b, action: 'delete' });
    app.handle('folder.action', { id: root, action: 'delete' });
    assert.equal(app.snapshot().folders.find((f) => f.id === sub)!.parent_id, null);
    app.handle('folder.action', { id: sub, action: 'delete', cascade: true });
    app.handle('folder.action', { id: sub, action: 'restore' });
    assert.equal(app.snapshot().memories.find((m) => m.id === a)!.deleted_at, null);
    assert.ok(app.snapshot().memories.find((m) => m.id === b)!.deleted_at);
  } finally {
    db.close();
  }
});
test('import update reuses the original card and preserves historical reviews and scheduling on metadata edits', () => {
  const { db, app } = fixture();
  try {
    const pkg: any = {
      format: 'ganksoft.content',
      schemaVersion: '2.0',
      packageId: 'first',
      namespace: 'persistent-source',
      archives: [],
      items: [
        {
          key: 'one',
          kind: 'memory',
          subject: 'memory-default',
          title: '原标题',
          cue: '提示',
          content: '内容',
          knowledgeRefs: [],
        },
      ],
    };
    const options = { targetDeckId: 'memory-default' };
    function commit(p: any, o: any) {
      const expected = app.handle('import.preview', { package: p, options: o });
      assert.deepEqual(expected.errors, []);
      return app.handle('import.commit', { package: p, options: o, expected });
    }
    commit(pkg, options);
    const card = app.snapshot().memories[0];
    app.handle('memory.review', { id: card.id, version: card.version, score: 3 });
    const state = app.snapshot().scheduling[0].data;
    const changed = structuredClone(pkg);
    changed.packageId = 'revision';
    changed.items[0].title = '更新标题';
    assert.ok(app.handle('import.preview', { package: changed, options }).errors.length);
    const allowed = { ...options, allowItemUpdates: true };
    const preview = app.handle('import.preview', { package: changed, options: allowed });
    assert.equal(preview.counts.itemsUpdated, 1);
    commit(changed, allowed);
    const s = app.snapshot();
    assert.equal(s.memories.length, 1);
    assert.equal(s.memories[0].id, card.id);
    assert.equal(s.memories[0].title, '更新标题');
    assert.equal(s.memoryReviews.length, 1);
    assert.equal(s.scheduling[0].data, state);
    commit(changed, allowed);
    assert.equal(app.snapshot().memories.length, 1);
  } finally {
    db.close();
  }
});
test('mind map saves stable IDs and reparenting atomically; stale snapshots cannot overwrite edits', () => {
  const { db, app } = fixture();
  try {
    const a = app.handle('knowledge.save', { module: 'question-default', name: '父' }),
      b = app.handle('knowledge.save', { module: 'question-default', name: '子', parent_id: a });
    const q = app.handle('question.save', {
      module: 'question-default',
      stem: '题', answer: 'A',
      knowledge_ids: [a, b],
    });
    const expected = Object.fromEntries(app.snapshot().knowledge.map((k) => [k.id, k.version]));
    app.handle('knowledge.mapSave', {
      module: 'question-default',
      expected,
      nodes: [
        { id: b, name: '新的根', parent_id: null },
        { id: a, name: '新的子', parent_id: b },
        { id: 'new-node', name: '新增', parent_id: b },
      ],
    });
    const s = app.snapshot();
    assert.equal(s.knowledge.find((k) => k.id === a)!.parent_id, b);
    assert.deepEqual(s.questions.find((c) => c.id === q)!.knowledge_ids.sort(), [a, b].sort());
    assert.equal(s.knowledge.filter((k) => !k.deleted_at).length, 3);
    assert.throws(
      () => app.handle('knowledge.mapSave', { module: 'question-default', expected, nodes: [] }),
      /变化/,
    );
  } finally {
    db.close();
  }
});
test('collection export can be parsed and imported into another collection', () => {
  const { db, app } = fixture();
  try {
    memory(app);
    const pkg = app.handle('deck.package', { id: 'memory-default' });
    assert.equal(pkg.items.length, 1);
    const target = app.handle('deck.save', { name: '目标', kind: 'memory' }),
      options = { targetDeckId: target };
    const expected = app.handle('import.preview', { package: pkg, options });
    assert.deepEqual(expected.errors, []);
    app.handle('import.commit', { package: pkg, options, expected });
    assert.equal(app.snapshot().memories.filter((m) => m.module === target).length, 1);
  } finally {
    db.close();
  }
});

test('deleting knowledge keeps unrelated unlinked questions learnable and does not alter their schedule', () => {
  const { db, app } = fixture();
  try {
    const unrelated = question(app);
    const k = app.handle('knowledge.save', { module: 'question-default', name: '待删除知识点' });
    const linked = app.handle('question.save', {
      module: 'question-default',
      stem: '有知识点题',
      answer: 'A',
      status: 'ready',
      knowledge_ids: [k],
    });
    const before = app.snapshot().questions.find((q) => q.id === unrelated)!;
    app.handle('knowledge.delete', { id: k });
    const s = app.snapshot();
    assert.equal(s.questions.find((q) => q.id === unrelated)!.status, 'ready');
    assert.equal(s.questions.find((q) => q.id === unrelated)!.due_at, before.due_at);
    assert.equal(s.questions.find((q) => q.id === linked)!.status, 'ready');
    assert.deepEqual(s.questions.find((q) => q.id === linked)!.knowledge_ids, []);
  } finally {
    db.close();
  }
});
