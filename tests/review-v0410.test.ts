import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {openDatabase} from './fixture.ts';
import {SCHEMA_VERSION} from '../electron/infrastructure/database.ts';
import { Application } from '../electron/application.ts';
import { createBackup, stageBackup } from '../electron/infrastructure/backup.ts';
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'gank-v0410-'));
  let now = new Date('2026-10-16T08:00:00Z');
  let db = openDatabase(join(dir, 'ganksoft.sqlite')),
    app = new Application({ db, dataDir: dir, now: () => new Date(now) });
  return {
    dir,
    get db() {
      return db;
    },
    get app() {
      return app;
    },
    time(value: string) {
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
function question(app: Application, module = 'question-default') {
  return app.handle('question.save', {
    module,
    title: '自评分题',
    stem: '1+1=?',
    answer: 'A',
    options: 'A.2\nB.3',
  });
}
function command(app: Application, id: string, n: number, self_score: any, extra: any = {}) {
  const q = app.snapshot().questions.find((q) => q.id === id);
  return {
    protocol_version: 2,
    request_id: `${id}-${n}`,
    question_id: id,
    content_version: q.content_version,
    answer: 'A',
    thought: `独立思路${n}`,
    basis: 'independent',
    understanding: 3,
    self_score,
    elapsed_seconds: 30,
    improvement: `反思${n}`,
    fault_detail: `错因${n}`,
    ...extra,
  };
}
const policy = (app: Application, deck_id: string, max_interval_days: number, daily_limit = 15) =>
  app.handle('deck.reviewPolicy.save', { deck_id, max_interval_days, daily_limit });
const stats = (app: Application, id: string, extra: any = {}) =>
  app.handle('card.reviewStats', { kind: 'question', card_id: id, ...extra });
test('deck policies are isolated; single-card override wins and clearing inherits its owning deck', () => {
  const f = fixture();
  try {
    const deck = f.app.handle('deck.save', { name: '独立集', kind: 'question' }),
      q1 = question(f.app),
      q2 = question(f.app, deck);
    policy(f.app, 'question-default', 1, 2);
    policy(f.app, deck, 30, 20);
    policy(f.app, 'memory-default', 90, 40);
    const r1 = f.app.handle('review.submit', command(f.app, q1, 1, 10)),
      r2 = f.app.handle('review.submit', command(f.app, q2, 1, 10));
    assert.equal(r1.result.maxIntervalDays, 1);
    assert.equal(r2.result.maxIntervalDays, 30);
    assert.equal(
      f.app.snapshot().deckReviewPolicies.find((p) => p.deck_id === deck).daily_limit,
      20,
    );
    f.app.handle('card.reviewPolicy.save', { kind: 'question', card_id: q1, max_interval_days: 7 });
    f.time(r1.result.dueAt);
    assert.equal(
      f.app.handle('review.submit', command(f.app, q1, 2, 10)).result.maxIntervalDays,
      7,
    );
    policy(f.app, 'question-default', 2, 3);
    f.app.handle('card.reviewPolicy.save', {
      kind: 'question',
      card_id: q1,
      max_interval_days: null,
    });
    f.time(f.app.snapshot().questions.find((q) => q.id === q1).due_at);
    assert.equal(
      f.app.handle('review.submit', command(f.app, q1, 3, 10)).result.maxIntervalDays,
      2,
    );
    assert.equal(
      f.app.snapshot().deckReviewPolicies.find((p) => p.deck_id === deck).max_interval_days,
      30,
    );
    assert.throws(() => f.app.handle('settings.save', { dailyLimit: 5, maxInterval: 1 }), /卡片集/);
  } finally {
    f.close();
  }
});
test('self-score boundaries, decimal precision and protocol 2 required score are validated before any writes', () => {
  const f = fixture();
  try {
    const id = question(f.app);
    let n = 0;
    for (const [answer, score] of [
      ['A', 6],
      ['A', 10],
      ['B', 0],
      ['B', 5.9],
    ] as const) {
      const r = f.app.handle(
        'review.submit',
        command(f.app, id, ++n, score, { answer, practice: true }),
      );
      assert.equal(r.selfScore, score);
    }
    const before = f.app.snapshot();
    for (const [answer, score] of [
      ['A', 5.9],
      ['A', 10.1],
      ['B', 6],
      ['B', -1],
      ['A', 6.05],
      ['A', '8'],
      ['A', NaN],
      ['A', undefined],
      ['A', null],
    ] as const)
      assert.throws(
        () => f.app.handle('review.submit', command(f.app, id, ++n, score, { answer })),
        /自评分/,
      );
    assert.deepEqual(f.app.snapshot().attempts, before.attempts);
    assert.equal(f.app.snapshot().scheduling.length, 0);
    const legacy = f.app.handle('review.submit', {
      ...command(f.app, id, ++n, undefined),
      protocol_version: 1,
    });
    assert.equal(legacy.selfScore, null);
    assert.equal(f.app.snapshot().attempts[0].self_score, null);
  } finally {
    f.close();
  }
});
test('self-score contributes to scheduling without promoting guesses, hints or wrong answers', () => {
  const f = fixture();
  try {
    const low = question(f.app),
      high = question(f.app),
      guess = question(f.app),
      wrong = question(f.app),
      hint = question(f.app);
    const l = f.app.handle('review.submit', command(f.app, low, 1, 6)),
      h = f.app.handle('review.submit', command(f.app, high, 1, 10));
    assert.equal(l.score, 2);
    assert.equal(h.score, 4);
    assert.ok(new Date(l.result.dueAt) < new Date(h.result.dueAt));
    assert.equal(
      f.app.handle('review.submit', command(f.app, guess, 1, 10, { basis: 'guess' })).score,
      2,
    );
    assert.ok(
      f.app.handle('review.submit', command(f.app, wrong, 1, 5.9, { answer: 'B' })).score <= 1,
    );
    const hi = f.app.handle('review.submit', command(f.app, hint, 1, 10, { basis: 'hint' }));
    assert.equal(hi.effective, false);
    assert.equal(hi.result, null);
  } finally {
    f.close();
  }
});
test('self-score retry is idempotent across restart, conflicting reuse rejects and scores survive full backup', async () => {
  const f = fixture();
  try {
    const id = question(f.app);
    policy(f.app, 'question-default', 14, 6);
    f.app.handle('card.reviewPolicy.save', { kind: 'question', card_id: id, max_interval_days: 9 });
    const p = command(f.app, id, 1, 8.7),
      r = f.app.handle('review.submit', p);
    f.reopen();
    assert.deepEqual(f.app.handle('review.submit', p), r);
    assert.throws(() => f.app.handle('review.submit', { ...p, self_score: 9 }), /请求编号/);
    const before = f.app.snapshot(),
      readBefore = stats(f.app, id);
    const file = join(f.dir, 'scores.zip');
    await createBackup(f.db, f.dir, file);
    await stageBackup(file, join(f.dir, 'restored'));
    const db = openDatabase(join(f.dir, 'restored/ganksoft.sqlite'));
    try {
      const app = new Application({ db, dataDir: f.dir, now: () => f.app.ctx.now() });
      assert.deepEqual(stats(app, id), readBefore);
      for (const key of [
        'deckReviewPolicies',
        'reviewPolicies',
        'attempts',
        'scheduling',
        'scheduleEvents',
      ] as const)
        assert.deepEqual(app.snapshot()[key], before[key]);
    } finally {
      db.close();
    }
  } finally {
    f.close();
  }
});
test('analytics separates practice, missing scores and content versions; deltas use prior effective scored review only', () => {
  const f = fixture();
  try {
    const id = question(f.app);
    for (const [n, score, extra] of [
      [1, 6, {}],
      [2, 9, {}],
      [3, 5, { answer: 'B', faults: ['知识缺失'] }],
      [4, 10, { practice: true }],
      [5, undefined, { protocol_version: 1, practice: true }],
    ] as const) {
      f.time(`2026-10-${15 + n}T08:00:00Z`);
      f.app.handle('review.submit', command(f.app, id, n, score, extra));
    }
    const before = f.app.snapshot(),
      s = stats(f.app, id);
    assert.equal(s.summary.total, 5);
    assert.equal(s.summary.effective, 3);
    assert.equal(s.summary.practice, 2);
    assert.equal(s.summary.scoredCount, 3);
    assert.equal(s.summary.averageSelfScore, 6.7);
    assert.equal(s.summary.correctRate, 66.7);
    assert.equal(s.summary.selfScoreChange, null);
    assert.deepEqual(
      s.records.map((r: any) => r.selfScoreChange),
      [null, 3, -4, null, null],
    );
    assert.equal(s.records[4].selfScore, null);
    assert.equal(s.records[3].intervalDays, null);
    assert.equal(s.records[2].faultDetail, '错因3');
    assert.equal(s.records[2].reflection, '反思3');
    assert.deepEqual(f.app.snapshot(), before); // Read model has no side effects.
    f.app.handle('question.save', { ...before.questions[0], stem: '新版题干' });
    assert.equal(stats(f.app, id).summary.total, 5);
    assert.equal(stats(f.app, id).lifetimeCount, 5);
    f.time('2026-11-01T08:00:00Z');
    f.app.handle('review.submit', command(f.app, id, 6, 8));
    const current = stats(f.app, id, { content_version: 2 });
    assert.equal(current.summary.selfScoreChange, null);
    assert.equal(current.summary.correctRate, 100);
    assert.equal(stats(f.app, id, { content_version: 1 }).summary.selfScoreChange, -4);
    const all = stats(f.app, id, { content_version: null });
    assert.equal(all.summary.total, 6);
    assert.equal(all.summary.selfScoreChange, null);
    assert.throws(() => stats(f.app, id, { content_version: 500 }), /版本/);
  } finally {
    f.close();
  }
});
test('moving cards inherits destination cap; explicit card policy travels with card, both move paths preserve history', () => {
  const f = fixture();
  try {
    const to = f.app.handle('deck.save', { name: '短间隔', kind: 'question' });
    policy(f.app, to, 1);
    const id = question(f.app),
      override = question(f.app);
    f.app.handle('review.submit', command(f.app, id, 1, 10));
    f.app.handle('review.submit', command(f.app, override, 1, 10));
    f.app.handle('card.reviewPolicy.save', {
      kind: 'question',
      card_id: override,
      max_interval_days: 5,
    });
    const before = f.app.snapshot();
    f.app.handle('cards.bulk', {
      deck_id: 'question-default',
      ids: [id],
      action: 'move',
      target: to,
    });
    f.app.handle('question.save', {
      ...before.questions.find((q) => q.id === override),
      module: to,
    });
    const s = f.app.snapshot();
    assert.equal(s.questions.find((q) => q.id === id).due_at, before.questions.find((q) => q.id === id).due_at);
    assert.equal(
      s.questions.find((q) => q.id === override).due_at,
      before.questions.find((q) => q.id === override).due_at,
    );
    assert.deepEqual(s.attempts, before.attempts);
  } finally {
    f.close();
  }
});
test('deck config validation and write failure roll back atomically; deleted cards cannot edit their policy', () => {
  const f = fixture();
  try {
    const id = question(f.app);
    f.app.handle('review.submit', command(f.app, id, 1, 10));
    const before = f.app.snapshot();
    for (const [days, limit] of [
      [0, 1],
      [3651, 1],
      [1, 0],
      [1, 201],
      [1.5, 15],
    ])
      assert.throws(() => policy(f.app, 'question-default', days, limit));
    assert.throws(() => policy(f.app, 'missing', 5), /不存在/);
    f.db.exec(
      "CREATE TRIGGER reject_plan BEFORE UPDATE ON deck_review_policies BEGIN SELECT RAISE(ABORT,'模拟写入失败'); END;",
    );
    assert.throws(() => policy(f.app, 'question-default', 1), /模拟写入失败/);
    assert.deepEqual(f.app.snapshot().deckReviewPolicies, before.deckReviewPolicies);
    assert.deepEqual(f.app.snapshot().scheduling, before.scheduling);
    f.app.handle('question.delete', { id });
    assert.throws(
      () =>
        f.app.handle('card.reviewPolicy.save', {
          kind: 'question',
          card_id: id,
          max_interval_days: 1,
        }),
      /不存在/,
    );
  } finally {
    f.close();
  }
});
test('memory analytics retains recall grades and notes without inventing objective correctness or ten-point scores', () => {
  const f = fixture();
  try {
    const id = f.app.handle('memory.save', {
      module: 'memory-default',
      title: '记忆数据',
      cue: '提示',
      content: '内容',
    });
    for (const [n, score, practice] of [
      [1, 2, false],
      [2, 4, false],
      [3, 0, true],
    ] as const) {
      f.time(`2026-10-${15 + n}T08:00:00Z`);
      f.app.handle('memory.review', {
        request_id: `mem-${n}`,
        id,
        content_version: 1,
        score,
        practice,
        note: `回忆笔记${n}`,
      });
    }
    const s = f.app.handle('card.reviewStats', { kind: 'memory', card_id: id });
    assert.equal(s.summary.total, 3);
    assert.equal(s.summary.effective, 2);
    assert.equal(s.summary.correctRate, null);
    assert.equal(s.summary.averageSelfScore, null);
    assert.deepEqual(
      s.records.map((r: any) => r.schedulerGrade),
      [2, 4, 0],
    );
    assert.equal(s.records[0].thought, '回忆笔记1');
    assert.ok(s.records.every((r: any) => r.correct === null && r.selfScore === null));
  } finally {
    f.close();
  }
});
