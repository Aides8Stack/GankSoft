import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Application } from '../electron/application.ts';
import { openDatabase } from './fixture.ts';
import { createBackup, stageBackup } from '../electron/infrastructure/backup.ts';
import { evaluateQuestion, parseAssessment, EVALUATION_VERSION } from '../shared/assessment.ts';
const input = {
  correct: true,
  basis: 'independent' as const,
  understanding: 3,
  selfScore: 10,
  elapsedSeconds: 60,
  targetSeconds: null,
  practice: false,
};
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'gank-assess-'));
  let db = openDatabase(join(dir, 'ganksoft.sqlite')),
    now = new Date('2026-10-16T08:00:00Z');
  let app = new Application({ db, dataDir: dir, now: () => new Date(now) });
  return {
    dir,
    get db() {
      return db;
    },
    get app() {
      return app;
    },
    time(v: string) {
      now = new Date(v);
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
function isolated(name: string, fn: (f: ReturnType<typeof fixture>) => unknown) {
  test(name, async () => {
    const f = fixture();
    try {
      await fn(f);
    } finally {
      f.close();
    }
  });
}
function question(f: ReturnType<typeof fixture>, extra: any = {}) {
  return f.app.handle('question.save', {
    module: 'question-default',
    stem: '题干',
    answer: 'B',
    options: 'A\nB\nC\nD',
    ...extra,
  });
}
function command(f: ReturnType<typeof fixture>, id: string, n: number, extra: any = {}) {
  return {
    protocol_version: 2,
    request_id: id + '-' + n,
    question_id: id,
    content_version: f.app.snapshot().questions.find((q) => q.id === id)!.content_version,
    answer: 'B',
    self_score: 10,
    thought: '独立列式' + n,
    basis: 'independent',
    understanding: 3,
    elapsed_seconds: 60,
    ...extra,
  };
}
function stats(f: ReturnType<typeof fixture>, id: string) {
  return f.app.handle('card.reviewStats', { kind: 'question', card_id: id });
}
test('assessment: evidence qualification across every basis and self-score never promotes guesses or remembered answers', () => {
  for (const basis of ['independent', 'guess', 'remember', 'hint'] as const)
    for (let u = 0; u <= 3; u++) {
      const a = evaluateQuestion({ ...input, basis, understanding: u });
      assert.equal(a.eligible, basis === 'independent');
      if (basis === 'independent' && u < 2) {
        assert.ok(a.grade <= 1);
        assert.equal(a.methodSuccessful, false);
      }
      if (basis === 'independent' && u >= 2) assert.equal(a.methodSuccessful, true);
    }
  for (let n = 0; n <= 100; n++) {
    const correct = n >= 60,
      a = evaluateQuestion({ ...input, correct, selfScore: n / 10 });
    if (!correct) assert.ok(a.grade <= 1);
  }
});
test('assessment: timing can only cap Easy to Good; no target, zero, missing, wrong and weak-method cases are not confused', () => {
  assert.equal(evaluateQuestion({ ...input, targetSeconds: 90, elapsedSeconds: 90 }).grade, 4);
  const slow = evaluateQuestion({ ...input, targetSeconds: 90, elapsedSeconds: 91 });
  assert.equal(slow.grade, 3);
  assert.equal(slow.gradeBeforeEfficiency, 4);
  assert.equal(slow.efficiency, 'overtime');
  for (const elapsedSeconds of [null, 0]) {
    const a = evaluateQuestion({ ...input, targetSeconds: 90, elapsedSeconds });
    assert.equal(a.efficiency, 'unmeasured');
    assert.equal(a.grade, 4);
    assert.equal(a.timeRatio, null);
  }
  assert.equal(evaluateQuestion({ ...input, targetSeconds: null, elapsedSeconds: 86400 }).grade, 4);
  for (const selfScore of [6, 7, 8])
    assert.equal(
      evaluateQuestion({ ...input, selfScore, targetSeconds: 1, elapsedSeconds: 100 }).grade,
      evaluateQuestion({ ...input, selfScore }).grade,
    );
  assert.ok(
    evaluateQuestion({
      ...input,
      correct: false,
      selfScore: 5.9,
      targetSeconds: 1,
      elapsedSeconds: 100,
    }).grade <= 1,
  );
  assert.equal(
    evaluateQuestion({ ...input, understanding: 1, targetSeconds: 1, elapsedSeconds: 100 }).grade,
    1,
  );
});
test('assessment: strict numeric boundary and all runtime types reject; objects are pure', () => {
  const before = structuredClone(input);
  evaluateQuestion(input);
  assert.deepEqual(input, before);
  for (const targetSeconds of [0, -1, 86401, 1.5, '90', true, {}, undefined, NaN, Infinity])
    assert.throws(() => evaluateQuestion({ ...input, targetSeconds: targetSeconds as any }));
  for (const elapsedSeconds of [-1, 86401, '3', true, {}, NaN, Infinity])
    assert.throws(() => evaluateQuestion({ ...input, elapsedSeconds: elapsedSeconds as any }));
  for (const understanding of ['3', true, 4, -1, NaN])
    assert.throws(() => evaluateQuestion({ ...input, understanding: understanding as any }));
});
isolated(
  'integration: observations never create or mutate FSRS/plans, but retain complete assessment snapshots',
  (f) => {
    const id = question(f);
    const before = f.app.snapshot();
    for (const [n, basis] of ['guess', 'remember', 'hint'].entries()) {
      const r = f.app.handle('review.submit', command(f, id, n, { basis }));
      assert.equal(r.effective, false);
      assert.equal(r.result, null);
      assert.equal(r.assessment.contribution, basis);
    }
    const practice = f.app.handle('review.submit', command(f, id, 99, { practice: true }));
    assert.equal(practice.assessment.contribution, 'practice');
    const after = f.app.snapshot();
    assert.deepEqual(after.scheduling, before.scheduling);
    assert.deepEqual(after.scheduleEvents, before.scheduleEvents);
    assert.equal(after.questions[0].due_at, before.questions[0].due_at);
    assert.equal(after.questions[0].mastery, null);
    assert.equal(after.attempts.length, 4);
    assert.equal(stats(f, id).evidence.days, 0);
    assert.ok(
      after.attempts.every(
        (a) => parseAssessment((a as any).assessment_snapshot)?.version === EVALUATION_VERSION,
      ),
    );
  },
);
isolated(
  'integration: failed method retrieval is Again even when the chosen answer and self-score are correct',
  (f) => {
    const id = question(f),
      r = f.app.handle('review.submit', command(f, id, 1, { understanding: 0 }));
    assert.equal(r.score, 1);
    assert.equal(r.result.rating, 1);
    assert.equal(r.effective, true);
    assert.equal(r.assessment.correct, true);
    assert.equal(r.assessment.methodSuccessful, false);
    assert.match(r.reason, /解释主要步骤/);
    const s = stats(f, id);
    assert.equal(s.evidence.answerCorrectRate, 100);
    assert.equal(s.evidence.methodSuccessRate, 0);
  },
);
isolated(
  'integration: a same-day independent regression reschedules immediately; additional off-due failures and successes cannot inflate',
  (f) => {
    const id = question(f);
    const first = f.app.handle('review.submit', command(f, id, 1));
    f.time('2026-10-16T08:00:30Z');
    const failure = f.app.handle(
      'review.submit',
      command(f, id, 2, { answer: 'A', self_score: 2 }),
    );
    assert.equal(failure.effective, true);
    assert.equal(failure.assessment.contribution, 'early_regression');
    assert.ok(new Date(failure.result.dueAt) < new Date(first.result.dueAt));
    f.time('2026-10-16T08:00:31Z');
    const second = f.app.handle('review.submit', command(f, id, 3, { answer: 'A', self_score: 2 }));
    assert.equal(second.effective, false);
    assert.equal(second.assessment.contribution, 'same_day');
    const before = f.app.snapshot().scheduling;
    f.app.handle('review.submit', command(f, id, 4));
    assert.deepEqual(f.app.snapshot().scheduling, before);
    assert.equal(stats(f, id).evidence.days, 1);
    assert.equal(stats(f, id).evidence.methodSuccessRate, 0);
  },
);
isolated(
  'integration: same-day due relearning still counts; practice never triggers early regression',
  (f) => {
    const id = question(f);
    f.app.handle('review.submit', command(f, id, 1, { answer: 'A', self_score: 1 }));
    f.time('2026-10-16T08:20:00Z');
    const r = f.app.handle('review.submit', command(f, id, 2, { self_score: 8 }));
    assert.equal(r.effective, true);
    const before = f.app.snapshot().scheduling;
    const p = f.app.handle(
      'review.submit',
      command(f, id, 3, { answer: 'A', self_score: 1, practice: true }),
    );
    assert.equal(p.effective, false);
    assert.deepEqual(f.app.snapshot().scheduling, before);
  },
);
isolated(
  'policies: deck isolation, per-card custom/off/inherit, movement, settings do not rewrite histories or schedules',
  (f) => {
    const a = 'question-default',
      b = f.app.handle('deck.save', { name: 'B', kind: 'question' }),
      id = question(f);
    const save = (p: any) => f.app.handle('assessment.policy.save', p);
    save({ scope: 'deck', id: a, target_seconds: 90 });
    save({ scope: 'deck', id: b, target_seconds: 120 });
    save({ scope: 'card', id, mode: 'custom', target_seconds: 60 });
    assert.equal(
      f.app.handle('review.submit', command(f, id, 1, { elapsed_seconds: 61 })).score,
      3,
    );
    const before = f.app.snapshot(),
      history = before.attempts;
    save({ scope: 'deck', id: a, target_seconds: 100 });
    assert.deepEqual(f.app.snapshot().attempts, history);
    assert.deepEqual(f.app.snapshot().scheduling, before.scheduling);
    f.time('2026-10-17T08:00:00Z');
    assert.equal(f.app.handle('review.submit', command(f, id, 2)).assessment.targetSeconds, 60);
    save({ scope: 'card', id, mode: 'none', target_seconds: null });
    save({ scope: 'deck', id: a, target_seconds: 50 });
    f.time('2026-10-18T08:00:00Z');
    assert.equal(f.app.handle('review.submit', command(f, id, 3)).assessment.targetSeconds, null);
    f.app.handle('cards.bulk', { deck_id: a, ids: [id], action: 'move', target: b });
    save({ scope: 'card', id, mode: 'inherit' });
    f.time('2026-10-19T08:00:00Z');
    assert.equal(f.app.handle('review.submit', command(f, id, 4)).assessment.targetSeconds, 120);
    assert.equal(stats(f, id).records[0].assessment.targetSeconds, 60);
  },
);
isolated(
  'policies: invalid/missing values roll back and memory decks cannot receive question efficiency settings',
  (f) => {
    const id = question(f),
      before = f.app.snapshot();
    for (const target_seconds of [0, -1, 86401, '90', true, {}, NaN, undefined, null])
      assert.throws(() =>
        f.app.handle('assessment.policy.save', {
          scope: 'card',
          id,
          mode: 'custom',
          target_seconds,
        }),
      );
    assert.throws(() =>
      f.app.handle('assessment.policy.save', {
        scope: 'deck',
        id: 'memory-default',
        target_seconds: 90,
      }),
    );
    assert.deepEqual(f.app.snapshot(), before);
  },
);
isolated(
  'read models: daily evidence resists cramming; legacy/content versions/targets stay separate; memory estimate declines without writes',
  (f) => {
    const id = question(f);
    f.app.handle('assessment.policy.save', {
      scope: 'card',
      id,
      mode: 'custom',
      target_seconds: 90,
    });
    for (let day = 16; day <= 18; day++) {
      f.time('2026-10-' + day + 'T08:00:00Z');
      f.app.handle('review.submit', command(f, id, day));
      for (let n = 0; n < 5; n++) f.app.handle('review.submit', command(f, id, day * 10 + n));
    }
    let s = stats(f, id);
    assert.equal(s.evidence.days, 3);
    assert.equal(s.evidence.sufficient, true);
    assert.equal(s.evidence.methodSuccessRate, 100);
    assert.equal(s.evidence.timedDays, 3);
    assert.equal(s.evidence.withinTargetDays, 3);
    const before = f.app.snapshot(),
      r = s.memoryModel.retrievability;
    f.time('2026-10-28T08:00:00Z');
    s = stats(f, id);
    assert.ok(s.memoryModel.retrievability < r);
    assert.deepEqual(f.app.snapshot(), before);
    f.app.handle('question.save', { ...f.app.snapshot().questions[0], stem: '新题干' });
    s = stats(f, id);
    assert.equal(s.evidence.days, 0);
    assert.equal(s.memoryModel, null);
    assert.equal(
      f.app.handle('card.reviewStats', { kind: 'question', card_id: id, content_version: 1 })
        .evidence.days,
      3,
    );
  },
);
isolated(
  'versioning: legacy assessment stays unknown and old serialized receipt is returned without re-evaluation',
  (f) => {
    const id = question(f),
      p = command(f, id, 1),
      r = f.app.handle('review.submit', p);
    f.db.prepare("UPDATE attempts SET assessment_snapshot=''").run();
    const legacy = {
      attemptId: r.attemptId,
      score: r.score,
      effective: true,
      result: r.result,
      selfScore: r.selfScore,
    };
    f.db
      .prepare('UPDATE review_receipts SET response=? WHERE request_id=?')
      .run(JSON.stringify(legacy), p.request_id);
    const before = f.app.snapshot();
    assert.deepEqual(f.app.handle('review.submit', p), legacy);
    assert.deepEqual(f.app.snapshot(), before);
    assert.equal(stats(f, id).records[0].assessment, null);
    assert.equal(stats(f, id).evidence.days, 0);
    assert.equal(stats(f, id).memoryModel.legacyHistory, true);
    f.app.handle('question.save', { ...f.app.snapshot().questions[0], stem: '内容版本重置' });
    f.time('2026-10-17T08:00:00Z');
    f.app.handle('review.submit', command(f, id, 2));
    assert.equal(stats(f, id).memoryModel.legacyHistory, false);
  },
);
isolated(
  'atomicity and restore: policy, assessment snapshot, receipt and FSRS survive backup; interrupted write rolls back all tables',
  async (f) => {
    const id = question(f);
    f.app.handle('assessment.policy.save', {
      scope: 'card',
      id,
      mode: 'custom',
      target_seconds: 90,
    });
    const before = f.app.snapshot();
    f.db.exec(
      "CREATE TRIGGER reject_assessment_receipt BEFORE INSERT ON review_receipts BEGIN SELECT RAISE(ABORT,'assessment rollback'); END;",
    );
    assert.throws(() => f.app.handle('review.submit', command(f, id, 1)), /rollback/);
    assert.deepEqual(f.app.snapshot(), before);
    f.db.exec('DROP TRIGGER reject_assessment_receipt');
    const p = command(f, id, 1),
      r = f.app.handle('review.submit', p);
    f.reopen();
    assert.deepEqual(f.app.handle('review.submit', p), r);
    const file = join(f.dir, 'full.zip'),
      stage = join(f.dir, 'stage');
    await createBackup(f.db, f.dir, file);
    await stageBackup(file, stage);
    const db = openDatabase(join(stage, 'ganksoft.sqlite'));
    const restored = new Application({
      db,
      dataDir: stage,
      now: () => new Date('2026-10-16T08:00:00Z'),
    });
    const restoredSnapshot = restored.snapshot();
    restoredSnapshot.meta.dataPath = f.dir;
    assert.deepEqual(restoredSnapshot, f.app.snapshot());
    assert.equal(
      restored.handle('card.reviewStats', { kind: 'question', card_id: id }).records[0].assessment
        .version,
      EVALUATION_VERSION,
    );
    db.close();
    f.db.prepare("UPDATE attempts SET assessment_snapshot='{}'").run();
    await createBackup(f.db, f.dir, file);
    await assert.rejects(() => stageBackup(file, join(f.dir, 'bad-stage')), /评估快照/);
    assert.equal(existsSync(join(f.dir, 'bad-stage')), false);
  },
);
isolated(
  'purge: target policy follows soft delete/restore and is removed by permanent deletion',
  (f) => {
    const id = question(f);
    f.app.handle('assessment.policy.save', {
      scope: 'card',
      id,
      mode: 'custom',
      target_seconds: 90,
    });
    f.app.handle('question.delete', { id });
    assert.equal(f.app.snapshot().assessmentPolicies.length, 1);
    f.app.handle('question.restore', { id });
    assert.equal(f.app.snapshot().assessmentPolicies.length, 1);
    f.app.handle('question.delete', { id });
    const items = [{ kind: 'question', id }],
      preview = f.app.handle('trash.preview', { items });
    f.app.handle('trash.manage', { action: 'purge', items, expected: preview.revision });
    assert.equal(f.app.snapshot().assessmentPolicies.length, 0);
    assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length, 0);
  },
);
