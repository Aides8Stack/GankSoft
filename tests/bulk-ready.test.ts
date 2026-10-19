import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from './fixture.ts';
import { Application } from '../electron/application.ts';
function fixture() {
  const db = openDatabase(':memory:');
  const app = new Application({
    db,
    dataDir: ':memory:',
    now: () => new Date('2026-10-15T10:00:00Z'),
  });
  const kid = app.handle('knowledge.save', { name: '基期量', module: '资料分析' });
  const create = (title: string, extra: any = {}) =>
    app.handle('question.save', {
      title,
      module: '资料分析',
      stem: '测试题',
      answer: 'A',
      knowledge_ids: [kid],
      status: 'draft',
      ...extra,
    });
  return { db, app, create };
}
test('legacy bulk ready is idempotent for directly learnable cards without changing content or existing history/plans', () => {
  const { db, app, create } = fixture();
  try {
    const a = create('第一题'),
      b = create('第二题'),
      c = create('未选择');
    const before = app.snapshot();
    assert.deepEqual(
      app.handle('question.bulkReady', {
        items: [
          { id: a, version: 1 },
          { id: b, version: 1 },
        ],
      }),
      { updated: 0, skipped: 2 },
    );
    const after = app.snapshot();
    assert.equal(after.questions.find((q) => q.id === c).status, 'ready');
    for (const id of [a, b]) {
      const q = after.questions.find((q) => q.id === id),
        old = before.questions.find((q) => q.id === id);
      assert.equal(q.status, 'ready');
      assert.equal(q.version, 1);
      assert.ok(q.due_at);
      for (const f of ['stem', 'answer', 'analysis', 'knowledge_ids', 'source'])
        assert.deepEqual(q[f], old[f]);
    }
    app.handle('review.submit', {
      thought: '先识别条件，再独立判断选项。',
      question_id: a,
      question_version: 1,
      answer: 'A',
      basis: 'independent',
      understanding: 2,
    });
    app.handle('plan.set', { id: a, action: 'pause' });
    const reviewed = app.snapshot();
    assert.deepEqual(app.handle('question.bulkReady', { items: [{ id: a, version: 1 }] }), {
      updated: 0,
      skipped: 1,
    });
    const repeated = app.snapshot();
    assert.deepEqual(repeated.attempts, reviewed.attempts);
    assert.deepEqual(
      repeated.questions.find((q) => q.id === a),
      reviewed.questions.find((q) => q.id === a),
    );
  } finally {
    db.close();
  }
});
test('bulk ready validates missing fields and stale/deleted records atomically', () => {
  const { db, app, create } = fixture();
  try {
    const good = create('完整题'),
      bad = create('缺答案'),
      noKnowledge = create('缺知识点', { knowledge_ids: [] });
    // Simulate an incomplete record from a pre-0.4.8 database. New saves reject it.
    db.prepare("UPDATE questions SET answer='' WHERE id=?").run(bad);
    for (const id of [bad]) {
      assert.throws(() =>
        app.handle('question.bulkReady', {
          items: [
            { id: good, version: 1 },
            { id, version: 1 },
          ],
        }),
      );
      assert.equal(app.snapshot().questions.find((q) => q.id === good).status, 'ready');
      assert.equal(db.prepare('SELECT count(*) AS n FROM plans').get()!.n, 3);
    }
    assert.throws(
      () => app.handle('question.bulkReady', { items: [{ id: good, version: 0 }] }),
      /变化/,
    );
    assert.throws(() => app.handle('question.bulkReady', { items: [{ id: good }] }), /版本/);
    app.handle('question.delete', { id: bad });
    assert.throws(
      () =>
        app.handle('question.bulkReady', {
          items: [
            { id: good, version: 1 },
            { id: bad, version: 1 },
          ],
        }),
      /已删除/,
    );
    assert.equal(app.snapshot().questions.find((q) => q.id === good).status, 'ready');
  } finally {
    db.close();
  }
});
