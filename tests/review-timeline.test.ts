import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openDatabase } from './fixture.ts';
import { Application } from '../electron/application.ts';
import { reviewSeries } from '../shared/review-series.ts';
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'gank-timeline-')),
    db = openDatabase(join(dir, 'db.sqlite'));
  let now = new Date('2026-10-16T08:00:00Z');
  const app = new Application({ db, dataDir: dir, now: () => new Date(now) });
  return {
    app,
    db,
    time(day: number) {
      now = new Date(`2026-10-${day}T08:00:00Z`);
    },
    close() {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
const create = (app: Application) =>
  app.handle('question.save', {
    module: 'question-default',
    title: '同题逐次记录',
    stem: '2+2=?',
    options: 'A.3\nB.4\nC.5\nD.6',
    answer: 'B',
    analysis: '二加二等于四',
  });
const command = (id: string, n: number) => ({
  protocol_version: 2,
  request_id: `timeline-${n}`,
  question_id: id,
  content_version: 1,
  answer: n === 1 ? 'A' : 'B',
  self_score: n === 1 ? 3 : n === 2 ? 8 : 9,
  thought: `第${n}次独立思路`,
  elapsed_seconds: n === 1 ? 90 : n === 2 ? 60 : 30,
  improvement: n === 2 ? '' : `第${n}次感悟`,
  basis: 'independent',
  understanding: 3,
  practice: n === 3,
});
test('fixed question content survives multiple independent attempts; score, choice, duration, thought and optional reflection all remain per-review', () => {
  const f = fixture();
  try {
    const id = create(f.app),
      fixed = f.app.snapshot().questions[0];
    for (let n = 1; n <= 3; n++) {
      f.time(15 + n);
      const p = command(id, n);
      const result = f.app.handle('review.submit', p);
      assert.deepEqual(f.app.handle('review.submit', p), result);
    }
    const before = f.app.snapshot(),
      s = f.app.handle('card.reviewStats', { kind: 'question', card_id: id });
    for (const key of ['stem', 'options', 'answer', 'analysis', 'content_version'])
      assert.equal(before.questions[0][key], fixed[key]);
    assert.deepEqual(
      s.records.map((r: any) => [r.answer, r.selfScore, r.elapsedSeconds, r.thought, r.reflection]),
      [
        ['A', 3, 90, '第1次独立思路', '第1次感悟'],
        ['B', 8, 60, '第2次独立思路', ''],
        ['B', 9, 30, '第3次独立思路', '第3次感悟'],
      ],
    );
    assert.equal(s.summary.totalSeconds, 180);
    assert.equal(s.summary.averageSeconds, 60);
    assert.equal(s.summary.timedCount, 3);
    assert.ok(
      s.records.every((r: any) => r.question.options === fixed.options && r.correctAnswer === 'B'),
    );
    assert.deepEqual(f.app.snapshot(), before);
  } finally {
    f.close();
  }
});
test('historical options come only from the attempt snapshot, never from edited current content; legacy missing content remains unknown', () => {
  const f = fixture();
  try {
    const id = create(f.app);
    f.app.handle('review.submit', command(id, 1));
    const q = f.app.snapshot().questions[0];
    f.app.handle('question.save', {
      ...q,
      options: 'A.4\nB.3\nC.5\nD.6',
      answer: 'A',
      analysis: '新版解析',
    });
    let s = f.app.handle('card.reviewStats', { kind: 'question', card_id: id, content_version: 1 });
    assert.equal(s.records[0].question.options, q.options);
    assert.equal(s.records[0].question.answer, 'B');
    assert.equal(s.records[0].question.analysis, q.analysis);
    f.db.exec("UPDATE attempts SET question_snapshot='',self_score=NULL");
    s = f.app.handle('card.reviewStats', { kind: 'question', card_id: id, content_version: 1 });
    assert.equal(s.records[0].question, null);
    assert.equal(s.records[0].correctAnswer, 'B');
    assert.equal(s.records[0].selfScore, null);
  } finally {
    f.close();
  }
});
function point(id: string, value: number | null, time: number | null) {
  return {
    id,
    ordinal: Number(id),
    createdAt: '2026-10-16T08:00:00Z',
    selfScore: value,
    elapsedSeconds: time,
    correct: value == null ? null : value >= 6,
    effective: true,
  };
}
test('chart model keeps missing values as gaps and supports zero, a single sample and unbounded review counts', () => {
  const records = [point('1', 0, 0), point('2', null, 60), point('3', 10, 120)];
  const score = reviewSeries(records, 'selfScore'),
    time = reviewSeries(records, 'elapsedSeconds');
  assert.equal(score.ceiling, 10);
  assert.equal(score.segments.length, 0);
  assert.equal(score.points[0].y, 210);
  assert.equal(score.points[1].y, null);
  assert.equal(score.points[2].y, 30);
  assert.equal(time.ceiling, 120);
  assert.equal(time.segments.length, 2);
  assert.equal(reviewSeries([records[0]], 'elapsedSeconds').points[0].x, 355);
  assert.equal(reviewSeries([], 'selfScore').hasValues, false);
  assert.equal(
    reviewSeries(
      Array.from({ length: 120 }, (_, i) => point(String(i), 8, i)),
      'elapsedSeconds',
    ).points.length,
    120,
  );
});
test('chart derivation is pure and separate for seconds and score; missing durations do not turn into zero', () => {
  const records = [point('1', 6, null), point('2', 8, null)],
    before = structuredClone(records);
  const a = reviewSeries(records, 'selfScore'),
    b = reviewSeries(records, 'elapsedSeconds');
  assert.equal(a.hasValues, true);
  assert.equal(b.hasValues, false);
  assert.equal(b.segments.length, 0);
  assert.ok(b.points.every((p) => p.y === null));
  assert.deepEqual(records, before);
});
