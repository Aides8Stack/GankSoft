import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from './fixture.ts';
import { Application } from '../electron/application.ts';
import { createBackup, stageBackup } from '../electron/infrastructure/backup.ts';
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'gank-policy-'));
  let now = new Date('2026-10-16T06:00:00Z');
  let db = openDatabase(join(dir, 'ganksoft.sqlite'));
  let app = new Application({ db, dataDir: dir, now: () => new Date(now) });
  return {
    dir,
    get app() {
      return app;
    },
    get db() {
      return db;
    },
    get now() {
      return now;
    },
    time(date: string) {
      now = new Date(date);
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
function add(app: Application, kind: string) {
  return app.handle(
    kind === 'question' ? 'question.save' : 'memory.save',
    kind === 'question'
      ? { module: 'question-default', title: '多轮复盘题', stem: '2+2=?', answer: 'A' }
      : { module: 'memory-default', title: '多轮回忆卡', cue: '提示', content: '答案' },
  );
}
function review(
  app: Application,
  kind: string,
  id: string,
  n: number,
  score = 4,
  practice = false,
) {
  return app.handle(
    kind === 'question' ? 'review.submit' : 'memory.review',
    kind === 'question'
      ? {
          request_id: `${id}-${n}`,
          question_id: id,
          content_version: 1,
          answer: score === 0 ? 'B' : 'A',
          basis: 'independent',
          understanding: score === 4 ? 2 : 1,
          thought: `独立思路${n}`,
          fault_detail: `具体错因${n}`,
          improvement: `反思${n}`,
          practice,
        }
      : { request_id: `${id}-${n}`, id, content_version: 1, score, note: `回忆记录${n}`, practice },
  );
}
function policy(app: Application, kind: string, id: string, days: number | null) {
  return app.handle('card.reviewPolicy.save', { kind, card_id: id, max_interval_days: days });
}
test('both card kinds continue for 60 rounds with independent records, capped intervals, idempotency and restore', async () => {
  const f = fixture();
  try {
    for (const kind of ['question', 'memory']) {
      const id = add(f.app, kind);
      policy(f.app, kind, id, 7);
      for (let n = 1; n <= 60; n++) {
        const score = n % 11 === 0 ? 0 : n % 5 === 0 ? 2 : 4;
        const r = review(f.app, kind, id, n, score);
        assert.equal(r.effective, true);
        assert.equal(r.result.maxIntervalDays, 7);
        assert.ok(new Date(r.result.dueAt).getTime() - f.now.getTime() <= 7 * 86400000);
        assert.ok(new Date(r.result.dueAt).getTime() > f.now.getTime());
        assert.deepEqual(review(f.app, kind, id, n, score), r);
        f.time(r.result.dueAt);
        if (n === 30) f.reopen();
      }
    }
    const before = f.app.snapshot();
    assert.equal(before.attempts.length, 60);
    assert.equal(before.memoryReviews.length, 60);
    assert.equal(before.scheduleEvents.length, 120);
    assert.equal(new Set(before.attempts.map((a) => a.thought)).size, 60);
    assert.equal(new Set(before.attempts.map((a) => a.fault_detail)).size, 60);
    assert.equal(new Set(before.attempts.map((a) => a.improvement)).size, 60);
    const file = join(f.dir, 'multi-round.zip');
    await createBackup(f.db, f.dir, file);
    const restoredDir = join(f.dir, 'restored');
    await stageBackup(file, restoredDir);
    const db = openDatabase(join(restoredDir, 'ganksoft.sqlite'));
    try {
      const after = new Application({ db, dataDir: restoredDir, now: () => f.now }).snapshot();
      for (const key of [
        'reviewPolicies',
        'attempts',
        'memoryReviews',
        'scheduling',
        'scheduleEvents',
      ] as const)
        assert.deepEqual(after[key], before[key]);
    } finally {
      db.close();
    }
  } finally {
    f.close();
  }
});
test('policy changes retain current plans, pause and history; next review uses updated overrides', () => {
  const f = fixture();
  try {
    const id = add(f.app, 'question'),
      other = add(f.app, 'question');
    let r;
    for (let n = 1; n <= 12; n++) {
      r = review(f.app, 'question', id, n);
      f.time(r.result.dueAt);
    }
    const before = f.app.snapshot();
    assert.ok(before.questions.find((q) => q.id === id).interval_days > 3);
    f.app.handle('plan.set', { id, action: 'pause' });
    assert.equal(policy(f.app, 'question', id, 3).adjusted, false);
    let s = f.app.snapshot();
    const q = s.questions.find((q) => q.id === id),
      fsrs = JSON.parse(s.scheduling.find((c) => c.card_id === id).data);
    assert.equal(q.due_at, fsrs.due);
    assert.equal(q.interval_days, before.questions.find(q=>q.id===id).interval_days);
    assert.equal(q.paused, 1);
    assert.equal(q.due_at,before.questions.find(q=>q.id===id).due_at);
    assert.deepEqual(s.attempts, before.attempts);
    assert.deepEqual(s.scheduleEvents, before.scheduleEvents);
    const due = q.due_at;
    policy(f.app, 'question', id, 90); // Can exceed the global default of 60.
    assert.equal(f.app.snapshot().questions.find((q) => q.id === id).due_at, due);
    f.app.handle('deck.reviewPolicy.save', {
      deck_id: 'question-default',
      daily_limit: 15,
      max_interval_days: 1,
    });
    assert.equal(f.app.snapshot().questions.find((q) => q.id === id).due_at, due);
    assert.equal(f.app.snapshot().questions.find((q) => q.id === other).interval_days, 0);
    f.app.handle('plan.set', { id, action: 'resume' });
    r = review(f.app, 'question', id, 13);
    assert.equal(r.result.maxIntervalDays, 90);
    policy(f.app, 'question', id, null);
    s = f.app.snapshot();
    assert.equal(s.reviewPolicies.length, 0);
    f.time(s.questions.find((q) => q.id === id).due_at);
    assert.equal(review(f.app, 'question', id, 14).result.maxIntervalDays, 1);
    // Existing first-study task was never delayed or fabricated into a review.
    assert.equal(s.attempts.filter((a) => a.question_id === other).length, 0);
  } finally {
    f.close();
  }
});
test('deck policy changes and practice preserve existing scheduling for both card kinds', () => {
  const f = fixture();
  try {
    for (const kind of ['question', 'memory']) {
      const id = add(f.app, kind);
      for (let n = 1; n <= 10; n++) {
        const r = review(f.app, kind, id, n);
        f.time(r.result.dueAt);
      }
      const before = f.app.snapshot().scheduling.find((c) => c.card_id === id);
      assert.equal(review(f.app, kind, id, 100, 4, true).effective, false);
      assert.deepEqual(
        f.app.snapshot().scheduling.find((c) => c.card_id === id),
        before,
      );
    }
    const count = f.app.snapshot().scheduleEvents.length;
    const scheduling = f.app.snapshot().scheduling;
    for (const deck_id of ['question-default', 'memory-default'])
      assert.equal(
        f.app.handle('deck.reviewPolicy.save', { deck_id, daily_limit: 15, max_interval_days: 1 })
          .adjusted,
        0,
      );
    const s = f.app.snapshot();
    assert.deepEqual(s.scheduling,scheduling);
    assert.equal(s.scheduleEvents.length, count);
  } finally {
    f.close();
  }
});
test('invalid policies reject atomically; content edits retain policy, restore keeps it and purge removes it', () => {
  const f = fixture();
  try {
    const id = add(f.app, 'question');
    policy(f.app, 'question', id, 10);
    for (const days of [0, -1, 3651, 1.5, '7', undefined])
      assert.throws(() => policy(f.app, 'question', id, days as any), /1—365/);
    assert.throws(() => policy(f.app, 'memory', id, 1), /不存在/);
    assert.throws(() => policy(f.app, 'bad', id, 1), /类型/);
    const q = f.app.snapshot().questions[0];
    f.app.handle('question.save', { ...q, stem: '新题干' });
    assert.equal(f.app.snapshot().reviewPolicies[0].max_interval_days, 10);
    f.app.handle('question.delete', { id });
    f.app.handle('question.restore', { id });
    f.reopen();
    assert.equal(f.app.snapshot().reviewPolicies[0].max_interval_days, 10);
    f.app.handle('question.delete', { id });
    const p = { action: 'purge', items: [{ kind: 'question', id }] };
    const expected = f.app.handle('trash.preview', p);
    f.app.handle('trash.manage', { ...p, expected: expected.revision });
    assert.equal(f.app.snapshot().reviewPolicies.length, 0);
  } finally {
    f.close();
  }
});
test('boundary caps 1 and 365 days remain hard ceilings across repeated ratings for both card kinds', () => {
  const f = fixture();
  try {
    for (const kind of ['question', 'memory'])
      for (const cap of [1, 365]) {
        const id = add(f.app, kind);
        policy(f.app, kind, id, cap);
        for (let n = 1; n <= 24; n++) {
          const r = review(f.app, kind, id, n, n % 6 === 0 ? 0 : n % 4 === 0 ? 2 : 4);
          assert.equal(r.result.maxIntervalDays, cap);
          assert.ok(new Date(r.result.dueAt).getTime() - f.now.getTime() <= cap * 86400000);
          assert.ok(r.result.days <= cap);
          const event = f.app.snapshot().scheduleEvents.find((e) => e.id === r.attemptId);
          assert.equal(JSON.parse(event.log).maxIntervalDays, cap);
          assert.equal(JSON.parse(event.after_state).due, r.result.dueAt);
          f.time(r.result.dueAt);
        }
      }
  } finally {
    f.close();
  }
});
