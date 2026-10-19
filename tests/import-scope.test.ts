import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from './fixture.ts';
import { Application } from '../electron/application.ts';
import { digest } from '../electron/modules/imports/protocol.ts';
const pkg = {
  format: 'ganksoft.content',
  schemaVersion: '2.0',
  packageId: 'scope-test',
  namespace: 'scope-test',
  archives: [],
  items: [
    {
      key: 'q1',
      kind: 'question',
      subject: '资料分析',
      title: '测试',
      stem: '2+2?',
      answer: 'A',
      analysis: '4',
      knowledgeRefs: [],
      needsReview: true,
    },
  ],
};
test('import reports retain deck ownership, including older reports without ownership metadata', () => {
  const db = openDatabase(':memory:');
  const app = new Application({ db, dataDir: ':memory:', now: () => new Date() });
  try {
    const a = app.handle('deck.save', { name: '资料分析', kind: 'question' }),
      b = app.handle('deck.save', { name: '言语理解', kind: 'question' });
    for (const targetDeckId of [a, b]) {
      const options = { targetDeckId };
      const preview = app.handle('import.preview', { package: pkg, options });
      assert.equal(preview.namespace, pkg.namespace + '-' + digest(targetDeckId).slice(0, 12));
      const result = app.handle('import.commit', { package: pkg, options, expected: preview });
      assert.deepEqual(result.report.deckIds, [targetDeckId]);
    }
    let batches = app.snapshot().importBatches;
    assert.equal(batches.filter((b) => b.deck_ids.includes(a)).length, 1);
    for (const batch of batches) {
      const report = JSON.parse(batch.report);
      delete report.deckIds;
      delete report.namespace;
      db.prepare('UPDATE import_batches SET report=? WHERE id=?').run(
        JSON.stringify(report),
        batch.id,
      );
    }
    batches = app.snapshot().importBatches;
    assert.equal(batches.filter((batch) => batch.deck_ids.includes(a)).length, 1);
    assert.equal(batches.filter((batch) => batch.deck_ids.includes(b)).length, 1);
    const questions = app.snapshot().questions;
    assert.throws(
      () =>
        app.handle('question.bulkReady', {
          deck_id: a,
          items: questions.map((q) => ({ id: q.id, version: q.version })),
        }),
      /当前卡片集/,
    );
    assert.ok(app.snapshot().questions.every((q) => q.status === 'ready'));
    const own = questions.find((q) => q.module === a)!;
    app.handle('question.bulkReady', { deck_id: a, items: [{ id: own.id, version: own.version }] });
    assert.equal(app.snapshot().questions.find((q) => q.module === b)!.status, 'ready');
  } finally {
    db.close();
  }
});
