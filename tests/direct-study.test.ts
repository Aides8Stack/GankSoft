import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openDatabase } from './fixture.ts';
import { Application } from '../electron/application.ts';
const questions = JSON.parse(
  readFileSync(new URL('../examples/fresh-review-12.gank.json', import.meta.url), 'utf8'),
);
const memories = JSON.parse(
  readFileSync(new URL('../examples/fresh-memory-6.gank.json', import.meta.url), 'utf8'),
);
function commit(app: Application, pkg: any, targetDeckId: string) {
  const options = { targetDeckId };
  const preview = app.handle('import.preview', { package: pkg, options });
  assert.deepEqual(preview.errors, []);
  return app.handle('import.commit', { package: pkg, options, expected: preview });
}
test('fresh test decks import directly, stay isolated, deduplicate and schedule both card types', () => {
  const db = openDatabase(':memory:');
  const app = new Application({
    db,
    dataDir: ':memory:',
    now: () => new Date('2026-10-16T04:00:00Z'),
  });
  try {
    const a = app.handle('deck.save', { name: '全新复盘测试', kind: 'question' });
    const b = app.handle('deck.save', { name: '隔离测试', kind: 'question' });
    const m = app.handle('deck.save', { name: '全新记忆测试', kind: 'memory' });
    const legacyFlag = structuredClone(questions);
    legacyFlag.items.forEach((q: any) => (q.needsReview = true));
    commit(app, legacyFlag, a);
    const snapshot = app.snapshot();
    assert.equal(snapshot.questions.length, 12);
    assert.equal(snapshot.knowledge.length, 3);
    assert.ok(snapshot.questions.every((q) => q.module === a && q.status === 'ready' && q.due_at));
    commit(app, legacyFlag, a);
    assert.equal(app.snapshot().questions.length, 12);
    commit(app, questions, b);
    assert.equal(app.snapshot().questions.filter((q) => q.module === b).length, 12);
    for (const q of snapshot.questions.slice(0, 2)) {
      assert.throws(
        () =>
          app.handle('review.submit', {
            question_id: q.id,
            question_version: q.version,
            answer: q.answer,
            basis: 'independent',
            understanding: 3,
          }),
        /思路/,
      );
      app.handle('review.submit', {
        question_id: q.id,
        question_version: q.version,
        answer: q.answer,
        thought: '先识别题型，再依据条件判断各选项。',
        basis: 'independent',
        understanding: 3,
      });
    }
    commit(app, memories, m);
    assert.equal(app.snapshot().memories.length, 6);
    const card = app.snapshot().memories[0];
    app.handle('memory.review', { id: card.id, version: card.version, score: 3 });
    assert.equal(app.snapshot().attempts.length, 2);
    assert.equal(app.snapshot().scheduling.length, 3);
    assert.equal(app.snapshot().scheduleEvents.length, 3);
    assert.ok(app.snapshot().attempts.every((e: any) => e.algorithm.includes('FSRS')));
    assert.ok(app.snapshot().memoryReviews.every((e: any) => e.algorithm.includes('FSRS')));
    const noAnswer = structuredClone(questions);
    noAnswer.items[0].answer = '';
    const preview = app.handle('import.preview', {
      package: noAnswer,
      options: { targetDeckId: a },
    });
    assert.ok(preview.errors.some((e: string) => e.includes('正确答案')));
    assert.equal(app.snapshot().questions.length, 24);
  } finally {
    db.close();
  }
});
