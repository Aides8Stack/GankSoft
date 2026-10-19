import {readContainer,writeContainer} from '../electron/infrastructure/containers.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from './fixture.ts';
import { Application } from '../electron/application.ts';
import { createBackup, stageBackup } from '../electron/infrastructure/backup.ts';
import { reviewSeries } from '../shared/review-series.ts';
import { validateSelfScore } from '../shared/self-assessment.ts';
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'gank-audit-'));
  let now = new Date('2026-10-16T08:00:00Z');
  let db = openDatabase(join(dir, 'ganksoft.sqlite'));
  let app = new Application({ db, dataDir: dir, now: () => new Date(now) });
  return {
    dir,
    get db() {
      return db;
    },
    get app() {
      return app;
    },
    day(n) {
      now = new Date(Date.UTC(2026, 9, 16 + n, 8));
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
const make = (f, extra = {}) =>
  f.app.handle('question.save', {
    module: 'question-default',
    title: '审计题',
    stem: '2+2=?',
    options: 'A.3\nB.4\nC.5\nD.6',
    answer: 'B',
    analysis: '原解析',
    ...extra,
  });
const cmd = (f, id, n, extra = {}) => ({
  protocol_version: 2,
  request_id: `${id}-${n}`,
  question_id: id,
  content_version: f.db.prepare('SELECT content_version FROM questions WHERE id=?').get(id)
    .content_version,
  answer: 'B',
  self_score: 8.1,
  thought: `思路${n}`,
  basis: 'independent',
  understanding: 3,
  elapsed_seconds: n,
  improvement: n % 2 ? '' : `感悟${n}`,
  ...extra,
});
const row = (f, id) => f.app.snapshot().questions.find((q) => q.id === id);
const session = (ids, extra = {}) => ({
  schemaVersion: 1,
  sessionId: 's1',
  entryId: 'e1',
  contentVersion: 1,
  ids,
  index: 0,
  stage: 'answer',
  answer: 'B',
  thought: '原始思路',
  seconds: 10,
  ...extra,
});
function isolated(name, fn) {
  test(name, async () => {
    const f = fixture();
    try {
      await fn(f);
    } finally {
      f.close();
    }
  });
}
isolated(
  'V01: 60 independent saves, retry, analytics and chart IDs exactly match SQL; reads are pure',
  (f) => {
    const id = make(f);
    for (let n = 1; n <= 60; n++) {
      f.day(n);
      const p = cmd(f, id, n, {
        answer: n % 2 ? 'A' : 'B',
        self_score: n % 2 ? 5.9 : 8.1,
        fault_detail: `错因${n}`,
        faults: n % 2 ? ['知识缺失'] : [],
      });
      const r = f.app.handle('review.submit', p);
      assert.deepEqual(f.app.handle('review.submit', p), r);
    }
    const before = f.app.snapshot();
    const stats = f.app.handle('card.reviewStats', { kind: 'question', card_id: id });
    const sql = f.db
      .prepare('SELECT * FROM attempts WHERE question_id=? ORDER BY created_at,rowid')
      .all(id);
    assert.equal(sql.length, 60);
    for (let i = 0; i < 60; i++) {
      const r = stats.records[i],
        a = sql[i];
      assert.equal(r.id, a.id);
      assert.equal(r.selfScore, a.self_score);
      assert.equal(r.thought, a.thought);
      assert.equal(r.reflection, a.improvement);
      assert.equal(r.elapsedSeconds, a.elapsed_seconds);
      assert.equal(r.faultDetail, a.fault_detail);
    }
    for (const metric of ['selfScore', 'elapsedSeconds'])
      assert.deepEqual(
        reviewSeries(stats.records, metric).points.map((p) => p.id),
        sql.map((a) => a.id),
      );
    assert.equal(stats.summary.totalSeconds, 1830);
    assert.equal(stats.summary.averageSeconds, 30.5);
    assert.deepEqual(f.app.snapshot(), before);
    f.reopen();
    assert.equal(f.app.snapshot().attempts.length, 60);
  },
);
isolated('V02: full 0.1 score grid and invalid runtime types', (f) => {
  for (let n = 0; n <= 100; n++) {
    const score = n / 10;
    assert.equal(validateSelfScore(n >= 60, score), score);
    assert.throws(() => validateSelfScore(n < 60, score));
  }
  for (const score of [-1, 10.1, 6.05, '8', true, {}, [], NaN, Infinity])
    assert.throws(() => validateSelfScore(true, score));
  const id = make(f);
  for (const score of [null, undefined, '8', {}, [], true, Infinity, NaN])
    assert.throws(() => f.app.handle('review.submit', cmd(f, id, 1, { self_score: score })));
  assert.equal(f.app.snapshot().attempts.length, 0);
});
isolated(
  'V03: response lost retry survives reopen; different request persists; mid-transaction trigger rolls back all tables',
  (f) => {
    const id = make(f),
      p = cmd(f, id, 1),
      r = f.app.handle('review.submit', p);
    f.reopen();
    assert.deepEqual(f.app.handle('review.submit', p), r);
    assert.throws(() => f.app.handle('review.submit', { ...p, thought: 'different' }));
    f.app.handle('review.submit', cmd(f, id, 2));
    assert.equal(f.app.snapshot().attempts.length, 2);
    const before = f.app.snapshot();
    f.db.exec(
      "CREATE TRIGGER abort_receipt BEFORE INSERT ON review_receipts BEGIN SELECT RAISE(ABORT,'audit-injected'); END",
    );
    assert.throws(() => f.app.handle('review.submit', cmd(f, id, 3)), /audit-injected/);
    assert.deepEqual(f.app.snapshot(), before);
  },
);
isolated(
  'V04: each core content field and image bumps version; historic content remains original and stale submit rejects',
  (f) => {
    for (const [field, value] of Object.entries({
      stem: '新版',
      options: 'A.4\nB.3',
      answer: 'A',
      material: '新材料',
      analysis: '新解析',
    })) {
      const id = make(f);
      f.app.handle('review.submit', cmd(f, id, 1));
      const stale = cmd(f, id, 2);
      f.app.handle('question.save', { ...row(f, id), [field]: value });
      assert.equal(row(f, id).content_version, 2);
      assert.throws(() => f.app.handle('review.submit', stale), /已修改/);
      const a = f.app.handle('card.reviewStats', {
        kind: 'question',
        card_id: id,
        content_version: 1,
      }).records[0];
      assert.equal(a.question.stem, '2+2=?');
      assert.equal(a.question.analysis, '原解析');
    }
    const id = make(f);
    f.app.handle('asset.add', {
      id: 'a1',
      question_id: id,
      role: 'question',
      file_name: 'a1.png',
      mime: 'image/png',
    });
    assert.equal(row(f, id).content_version, 2);
    f.app.handle('review.submit', cmd(f, id, 1));
    f.app.handle('asset.delete', { id: 'a1' });
    assert.equal(row(f, id).content_version, 3);
    assert.equal(
      JSON.parse(f.app.snapshot().attempts.find((a) => a.question_id === id).question_snapshot)
        .assets[0].id,
      'a1',
    );
  },
);
isolated('V05: deck isolation, override, reset inheritance, move cap and all grades cap', (f) => {
  const b = f.app.handle('deck.save', { name: 'B集', kind: 'question' });
  for (const [deck_id, max] of [
    ['question-default', 2],
    [b, 1],
  ])
    f.app.handle('deck.reviewPolicy.save', { deck_id, max_interval_days: max, daily_limit: 5 });
  const id = make(f);
  f.app.handle('card.reviewPolicy.save', { kind: 'question', card_id: id, max_interval_days: 7 });
  f.app.handle('deck.reviewPolicy.save', {
    deck_id: 'question-default',
    max_interval_days: 3,
    daily_limit: 6,
  });
  assert.equal(f.app.handle('review.submit', cmd(f, id, 1)).result.maxIntervalDays, 7);
  f.app.handle('cards.bulk', { deck_id: 'question-default', ids: [id], action: 'move', target: b });
  assert.equal(f.app.snapshot().reviewPolicies[0].max_interval_days, 7);
  f.app.handle('card.reviewPolicy.save', {
    kind: 'question',
    card_id: id,
    max_interval_days: null,
  });
  assert.ok(new Date(row(f, id).due_at) <= new Date('2026-10-17T08:00:00Z'));
  for (const [i, score] of [0, 1, 2, 3, 4].entries()) {
    const q = make(f, { module: b });
    const r = f.app.handle(
      'review.submit',
      cmd(f, q, i, {
        answer: score < 2 ? 'A' : 'B',
        self_score: score < 2 ? score : score === 2 ? 6 : score === 3 ? 8 : 10,
        understanding: score === 0 ? 0 : 3,
      }),
    );
    assert.ok(
      new Date(r.result.dueAt).getTime() - new Date('2026-10-16T08:00:00Z').getTime() <= 86400000,
    );
  }
});
isolated(
  'V06: complete backup copies all business tables and historical attachments; corrupted attachment rejected without changing source',
  async (f) => {
    const id = make(f);
    mkdirSync(join(f.dir, 'attachments'));
    writeFileSync(join(f.dir, 'attachments', 'aaaaaaaa.png'), Buffer.from('audit image'));
    f.app.handle('asset.add', {
      id: 'aa',
      question_id: id,
      role: 'question',
      file_name: 'aaaaaaaa.png',
      mime: 'image/png',
    });
    f.app.handle('review.submit', cmd(f, id, 1));
    f.app.handle('asset.delete', { id: 'aa' });
    f.app.handle('session.save', {
      deck_id: 'question-default',
      payload: session([id], { contentVersion: 3 }),
    });
    f.app.handle('question.note', { id, note: '长期笔记' });
    const dump = (db) =>
      Object.fromEntries(
        db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
          )
          .all()
          .map((r) => [r.name, db.prepare('SELECT * FROM ' + r.name + ' ORDER BY rowid').all()]),
      );
    const before = dump(f.db),
      path = join(f.dir, 'backup.gankbackup');
    await createBackup(f.db, f.dir, path);
    const stage = join(f.dir, 'restored');
    await stageBackup(path, stage);
    const d = openDatabase(join(stage, 'ganksoft.sqlite'));
    assert.deepEqual(dump(d), before);
    d.close();
    assert.equal(readFileSync(join(stage, 'attachments/aaaaaaaa.png'), 'utf8'), 'audit image');
    const broken=await readContainer(path);broken.set('attachments/aaaaaaaa.png',Buffer.from('corrupt'));await writeContainer(join(f.dir,'bad.gankbackup'),broken);
    await assert.rejects(()=>stageBackup(join(f.dir,'bad.gankbackup'),join(f.dir,'bad-stage')),/完整性校验/);
    assert.deepEqual(dump(f.db), before);
    assert.equal(existsSync(join(f.dir, 'bad-stage')), false);
  },
);
isolated(
  'V07: partial import rejects, repeated and cross-deck imports isolate, batch delete/restore preserves reviews',
  (f) => {
    const b = f.app.handle('deck.save', { name: 'B集', kind: 'question' }),
      pkg = {
        format: 'ganksoft.content',
        schemaVersion: '2.0',
        packageId: 'audit',
        namespace: 'audit',
        archives: [],
        items: [
          {
            key: 'q',
            kind: 'question',
            subject: 'question-default',
            title: '导入题',
            stem: '题干',
            answer: 'B',
            knowledgeRefs: [],
          },
        ],
      };
    const commit = (target) => {
      const options = { targetDeckId: target };
      const expected = f.app.handle('import.preview', { package: pkg, options });
      return f.app.handle('import.commit', { package: pkg, options, expected });
    };
    commit('question-default');
    commit('question-default');
    commit(b);
    assert.equal(f.app.snapshot().questions.length, 2);
    assert.throws(() =>
      f.app.handle('import.preview', {
        package: { ...pkg, items: [{ ...pkg.items[0], stem: '', answer: '' }] },
      }),
    );
    const ids = f.app
      .snapshot()
      .questions.filter((q) => q.module === b)
      .map((q) => q.id);
    f.app.handle('review.submit', cmd(f, ids[0], 1));
    f.app.handle('cards.bulk', { deck_id: b, ids, action: 'delete' });
    f.app.handle('trash.manage', {
      action: 'restore',
      items: ids.map((id) => ({ kind: 'question', id })),
    });
    assert.equal(row(f, ids[0]).deleted_at, null);
    assert.equal(f.app.snapshot().attempts.length, 1);
    assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length, 0);
  },
);
test('V08: actual forced termination during review receipt insertion rolls back WAL and permits exactly one retry', async () => {
  const { spawnSync } = await import('node:child_process');
  const f = fixture();
  try {
    const id = make(f),
      p = cmd(f, id, 1),
      before = f.app.snapshot();
    const r = spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        'tools/validation/crash-worker.ts',
        join(f.dir, 'ganksoft.sqlite'),
        'kill',
        JSON.stringify(p),
      ],
      { encoding: 'utf8' },
    );
    assert.equal(r.error, undefined);
    assert.equal(r.stdout.trim(), 'AUDIT_CRASH_INSIDE_RECEIPT');
    // Windows reports TerminateProcess as exit 1; POSIX reports SIGKILL.
    if (process.platform === 'win32') {
      assert.equal(r.signal, null);
      assert.equal(r.status, 1);
    } else {
      assert.equal(r.signal, 'SIGKILL');
      assert.equal(r.status, null);
    }
    f.reopen();
    assert.deepEqual(f.app.snapshot(), before);
    f.app.handle('review.submit', p);
    f.app.handle('review.submit', p);
    assert.equal(f.app.snapshot().attempts.length, 1);
  } finally {
    f.close();
  }
});
test('V09: two independent processes with same request produce one attempt and same receipt', async () => {
  const { spawn } = await import('node:child_process');
  const f = fixture();
  try {
    const id = make(f),
      p = cmd(f, id, 1);
    const run = () =>
      new Promise((resolve, reject) => {
        const c = spawn(process.execPath, [
          '--experimental-strip-types',
          'tools/validation/crash-worker.ts',
          join(f.dir, 'ganksoft.sqlite'),
          'normal',
          JSON.stringify(p),
        ]);
        let out = '',
          err = '';
        c.stdout.on('data', (x) => (out += x));
        c.stderr.on('data', (x) => (err += x));
        c.on('exit', (code) => (code === 0 ? resolve(JSON.parse(out)) : reject(new Error(err))));
      });
    const [a, b] = await Promise.all([run(), run()]);
    assert.deepEqual(a, b);
    assert.equal(f.app.snapshot().attempts.length, 1);
  } finally {
    f.close();
  }
});
isolated('V10: late import commit failure rolls back rows and removes written attachments', (f) => {
  const pkg = {
    format: 'ganksoft.content',
    schemaVersion: '2.0',
    packageId: 'rollback-image',
    namespace: 'rollback-image',
    archives: [],
    items: [
      {
        key: 'q',
        kind: 'question',
        subject: 'question-default',
        title: '事务题',
        stem: '题干',
        answer: 'A',
        knowledgeRefs: [],
        images: [
          {
            role: 'question',
            mime: 'image/png',
            base64: Transformer.fromRgbaPixels(Buffer.from([0, 0, 0, 255]), 1, 1)
              .pngSync()
              .toString('base64'),
          },
        ],
      },
    ],
  };
  const expected = f.app.handle('import.preview', { package: pkg }),
    before = f.app.snapshot();
  f.db.exec(
    "CREATE TRIGGER fail_batch BEFORE INSERT ON import_batches BEGIN SELECT RAISE(ABORT,'audit-import-fail'); END",
  );
  assert.throws(
    () => f.app.handle('import.commit', { package: pkg, expected, options: {} }),
    /audit-import-fail/,
  );
  assert.deepEqual(f.app.snapshot(), before);
  assert.equal(requireDirectoryFiles(join(f.dir, 'attachments')).length, 0);
});
function requireDirectoryFiles(path) {
  return existsSync(path) ? readdirSync(path) : [];
}
isolated(
  'A01/A02: entry anchor, queue order, schema downgrade and stale revision cannot rewrite frozen draft',
  (f) => {
    const a = make(f),
      b = make(f),
      s = session([a, b], { stage: 'reveal' });
    f.app.handle('session.save', { deck_id: 'question-default', expected_revision: 0, payload: s });
    const before = f.app.snapshot();
    for (const payload of [
      { ...s, index: 1 },
      { ...s, ids: [b, a] },
      { ...s, schemaVersion: undefined, stage: 'answer', thought: '伪造' },
      { ...s, contentVersion: 2 },
    ])
      assert.throws(() =>
        f.app.handle('session.save', {
          deck_id: 'question-default',
          expected_revision: 1,
          payload,
        }),
      );
    assert.throws(
      () => f.app.handle('session.save', { deck_id: 'question-default', payload: s }),
      /版本/,
    );
    assert.throws(
      () =>
        f.app.handle('session.save', {
          deck_id: 'question-default',
          expected_revision: 0,
          payload: s,
        }),
      /版本/,
    );
    assert.throws(
      () =>
        f.app.handle('session.save', {
          deck_id: 'question-default',
          expected_revision: 1,
          restart: true,
          payload: { ...s, entryId: 'new', index: 1, stage: 'answer' },
        }),
      /当前题目/,
    );
    assert.deepEqual(f.app.snapshot(), before);
    f.app.handle('session.save', {
      deck_id: 'question-default',
      expected_revision: 1,
      payload: { ...s, improvement: '合法反思' },
    });
    assert.equal(JSON.parse(f.app.snapshot().sessions[0].payload).thought, s.thought);
  },
);
isolated(
  'A03/A04: moved question cannot submit through old session or write fault evidence into old deck',
  (f) => {
    const k = f.app.handle('knowledge.save', { module: 'question-default', name: '原集知识' });
    const id = make(f, { knowledge_ids: [k] }),
      b = f.app.handle('deck.save', { name: 'B', kind: 'question' });
    f.app.handle(
      'review.submit',
      cmd(f, id, 0, { error_knowledge_ids: [k], faults: ['知识缺失'] }),
    );
    const s = session([id], { stage: 'reveal' });
    f.app.handle('session.save', { deck_id: 'question-default', expected_revision: 0, payload: s });
    f.app.handle('cards.bulk', {
      deck_id: 'question-default',
      ids: [id],
      action: 'move',
      target: b,
    });
    assert.deepEqual(row(f, id).knowledge_ids, []);
    const before = f.app.snapshot(),
      oldCount = f.app.handle('insight', { id: k }).effectiveAttempts;
    assert.throws(
      () =>
        f.app.handle(
          'review.submit',
          cmd(f, id, 1, {
            request_id: 'e1',
            session_id: 's1',
            deck_id: 'question-default',
            thought: s.thought,
          }),
        ),
      /移动/,
    );
    assert.throws(
      () =>
        f.app.handle(
          'review.submit',
          cmd(f, id, 2, { error_knowledge_ids: [k], faults: ['知识缺失'] }),
        ),
      /不属于/,
    );
    assert.throws(() => make(f, { module: b, knowledge_ids: [k] }), /不属于/);
    assert.deepEqual(f.app.snapshot(), before);
    assert.equal(f.app.handle('insight', { id: k }).effectiveAttempts, oldCount);
    assert.equal(
      f.app.handle('card.reviewStats', { kind: 'question', card_id: id }).records[0]
        .knowledgeGaps[0],
      '原集知识',
    );
  },
);
isolated('A04: memory links detach on move and cannot cross decks at creation', (f) => {
  const a = f.app.handle('deck.save', { name: 'MA', kind: 'memory' }),
    b = f.app.handle('deck.save', { name: 'MB', kind: 'memory' });
  const k = f.app.handle('knowledge.save', { module: a, name: '记忆知识' });
  const p = { module: a, title: '记忆', cue: 'Q', content: 'A', knowledge_ids: [k] };
  const id = f.app.handle('memory.save', p);
  assert.throws(() => f.app.handle('memory.save', { ...p, module: b }), /不属于/);
  f.app.handle('cards.bulk', { deck_id: a, ids: [id], action: 'move', target: b });
  assert.deepEqual(f.app.snapshot().memories.find((x) => x.id === id).knowledge_ids, []);
});
isolated('A05: elapsed null/missing/zero are distinct; invalid types roll back all writes', (f) => {
  const id = make(f);
  for (const [n, elapsed_seconds] of [undefined, null, 0, 30].entries())
    f.app.handle('review.submit', cmd(f, id, n, { elapsed_seconds, practice: true }));
  const stats = f.app.handle('card.reviewStats', { kind: 'question', card_id: id });
  assert.deepEqual(
    stats.records.map((r) => r.elapsedSeconds),
    [null, null, 0, 30],
  );
  assert.equal(stats.summary.timedCount, 2);
  assert.equal(stats.summary.averageSeconds, 15);
  assert.deepEqual(
    f.app
      .snapshot()
      .attempts.slice()
      .reverse()
      .map((a) => a.elapsed_seconds),
    [null, null, 0, 30],
  );
  const before = f.app.snapshot();
  for (const elapsed_seconds of ['', false, true, {}, [], NaN, Infinity, -1, 86401])
    assert.throws(
      () => f.app.handle('review.submit', cmd(f, id, 100, { elapsed_seconds })),
      /用时/,
    );
  assert.deepEqual(f.app.snapshot(), before);
  assert.deepEqual(
    f.db
      .prepare('SELECT elapsed_source FROM attempts ORDER BY rowid')
      .all()
      .map((r) => r.elapsed_source),
    ['missing', 'missing', 'measured', 'measured'],
  );
});
isolated(
  'A06: invalid cards can be skipped, draft archived; live card cannot be skipped and no review generated',
  (f) => {
    const a = make(f),
      b = make(f),
      s = session([a, b]);
    f.app.handle('session.save', { deck_id: 'question-default', payload: s, expected_revision: 0 });
    const next = { ...s, index: 1, entryId: 'e2', thought: '', answer: '' };
    assert.throws(
      () =>
        f.app.handle('session.save', {
          deck_id: 'question-default',
          payload: next,
          expected_revision: 1,
          skip: true,
        }),
      /保存/,
    );
    f.app.handle('question.delete', { id: a });
    f.app.handle('session.save', {
      deck_id: 'question-default',
      payload: next,
      expected_revision: 1,
      skip: true,
    });
    const got = JSON.parse(f.app.snapshot().sessions[0].payload);
    assert.equal(got.index, 1);
    assert.equal(got.abandonedDrafts[0].thought, s.thought);
    assert.equal(f.app.snapshot().attempts.length, 0);
    f.app.handle('question.delete', { id: b });
    f.app.handle('session.save', {
      deck_id: 'question-default',
      payload: { ...next, index: 2, entryId: 'done' },
      expected_revision: 2,
      skip: true,
    });
    assert.equal(JSON.parse(f.app.snapshot().sessions[0].payload).index, 2);
  },
);
isolated(
  'A08: all saved versions are default; charts break version boundaries and reads stay pure',
  (f) => {
    const id = make(f);
    f.app.handle('review.submit', cmd(f, id, 1));
    f.app.handle('question.save', { ...row(f, id), stem: '新版本' });
    f.app.handle('review.submit', cmd(f, id, 2));
    const before = f.app.snapshot(),
      s = f.app.handle('card.reviewStats', { kind: 'question', card_id: id });
    assert.equal(s.selectedVersion, null);
    assert.equal(s.records.length, 2);
    assert.equal(s.summary.selfScoreChange, null);
    for (const metric of ['selfScore', 'elapsedSeconds'])
      assert.equal(reviewSeries(s.records, metric).segments.length, 0);
    assert.equal(
      f.app.handle('card.reviewStats', { kind: 'question', card_id: id, content_version: 1 })
        .records.length,
      1,
    );
    assert.deepEqual(f.app.snapshot(), before);
  },
);
isolated(
  'A09: corrupt session JSON/shape, pending identity and invalid result receipt fail backup staging; original DB remains unchanged',
  async (f) => {
    const id = make(f);
    const values = [
      '{broken',
      JSON.stringify({ ids: [id], index: 2, stage: 'answer' }),
      JSON.stringify(session([id], { stage: 'result' })),
      JSON.stringify(session([id], { pendingSubmission: { question_id: 'other' } })),
    ];
    for (let i = 0; i < values.length; i++) {
      f.db
        .prepare('INSERT OR REPLACE INTO study_sessions VALUES (?,?,?,?)')
        .run('question-default', values[i], '2026-10-16', 1);
      const p = join(f.dir, 'corrupt' + i + '.zip'),
        stage = join(f.dir, 'stage' + i),
        before = f.db.prepare('SELECT * FROM study_sessions').all();
      await createBackup(f.db, f.dir, p);
      await assert.rejects(() => stageBackup(p, stage), /会话|业务数据/);
      assert.equal(existsSync(stage), false);
      assert.deepEqual(f.db.prepare('SELECT * FROM study_sessions').all(), before);
    }
  },
);
isolated(
  'A09: valid pending UI draft and legacy draft restore without guessed versions',
  async (f) => {
    const id = make(f);
    f.app.handle('session.save', {
      deck_id: 'question-default',
      expected_revision: 0,
      payload: session([id], {
        stage: 'reveal',
        pendingSubmission: { question_id: id, answer: 'B', thought: '原始思路' },
      }),
    });
    let p = join(f.dir, 'pending.zip');
    await createBackup(f.db, f.dir, p);
    await stageBackup(p, join(f.dir, 'pending'));
    f.db
      .prepare('UPDATE study_sessions SET payload=?')
      .run(JSON.stringify({ ids: [id], index: 0, stage: 'answer', thought: '旧版原文' }));
    p = join(f.dir, 'legacy.zip');
    await createBackup(f.db, f.dir, p);
    await stageBackup(p, join(f.dir, 'legacy'));
  },
);
isolated(
  'A10: filter ownership/revisions/runtime fields are enforced; cross-deck delete rejected',
  (f) => {
    const b = f.app.handle('deck.save', { name: 'B', kind: 'question' });
    const p = { id: 'filter', deck_id: 'question-default', name: 'A', payload: { query: 'a' } };
    f.app.handle('filter.save', p);
    const before = f.app.snapshot().savedFilters;
    assert.throws(
      () => f.app.handle('filter.save', { ...p, deck_id: b, name: 'B', expected_revision: 1 }),
      /不属于/,
    );
    assert.throws(
      () => f.app.handle('filter.delete', { id: p.id, deck_id: b, expected_revision: 1 }),
      /不属于/,
    );
    assert.throws(() => f.app.handle('filter.save', { ...p, expected_revision: 0 }), /版本/);
    assert.deepEqual(f.app.snapshot().savedFilters, before);
    assert.throws(
      () => f.app.handle('filter.save', { deck_id: b, name: 'bad', payload: { minReviews: '2' } }),
      /字段/,
    );
    f.app.handle('filter.save', { ...p, name: 'A2', expected_revision: 1 });
    assert.equal(f.app.snapshot().savedFilters[0].revision, 2);
    f.app.handle('filter.delete', { id: p.id, deck_id: p.deck_id, expected_revision: 2 });
    assert.equal(f.app.snapshot().savedFilters.length, 0);
  },
);

import { Transformer } from '@napi-rs/image';
import { validateImage } from '../electron/infrastructure/images.ts';
import { errorResponse, DomainError } from '../shared/domain-error.ts';
test('A11: shared decoder rejects truncated PNG/JPEG/WebP and MIME spoof; accepts valid encoded pixels', () => {
  const t = () => Transformer.fromRgbaPixels(Buffer.from([255, 0, 0, 255]), 1, 1);
  const images = [
    [t().pngSync(), 'image/png'],
    [t().jpegSync(), 'image/jpeg'],
    [t().webpSync(), 'image/webp'],
  ] as const;
  for (const [bytes, mime] of images) {
    assert.doesNotThrow(() => validateImage(bytes, mime));
    assert.throws(
      () => validateImage(bytes.subarray(0, Math.min(12, bytes.length / 2)), mime),
      /图片/,
    );
    assert.throws(
      () => validateImage(bytes, mime === 'image/png' ? 'image/jpeg' : 'image/png'),
      /MIME/,
    );
  }
});
isolated(
  'A11: invalid image import creates no rows/files; corrected image can retry successfully',
  (f) => {
    const pkg = {
      format: 'ganksoft.content',
      schemaVersion: '2.0',
      packageId: 'image-fix',
      namespace: 'image-fix',
      archives: [],
      items: [
        {
          key: 'q',
          kind: 'question',
          subject: 'question-default',
          title: '图片测试',
          stem: '题图',
          answer: 'A',
          knowledgeRefs: [],
          images: [
            {
              role: 'question',
              mime: 'image/png',
              base64: Buffer.from('89504e470d0a1a0a', 'hex').toString('base64'),
            },
          ],
        },
      ],
    };
    const before = f.app.snapshot();
    assert.throws(() => f.app.handle('import.preview', { package: pkg }), /图片/);
    assert.deepEqual(f.app.snapshot(), before);
    assert.equal(requireDirectoryFiles(join(f.dir, 'attachments')).length, 0);
    pkg.items[0].images[0].base64 = Transformer.fromRgbaPixels(Buffer.from([0, 0, 0, 255]), 1, 1)
      .pngSync()
      .toString('base64');
    const expected = f.app.handle('import.preview', { package: pkg });
    f.app.handle('import.commit', { package: pkg, expected });
    assert.equal(f.app.snapshot().questions.length, 1);
  },
);
test('A14: domain errors retain stable code, fieldErrors and retry behavior', () => {
  for (const code of ['CONTENT_VERSION_CONFLICT', 'REVISION_CONFLICT', 'DECK_CONFLICT']) {
    const r = errorResponse(new DomainError(code, '冲突'));
    assert.equal(r.code, code);
    assert.equal(r.definitive, true);
    assert.equal(r.retryable, false);
  }
  const r = errorResponse(new DomainError('VALIDATION_ERROR', '错误', { self_score: '范围' }));
  assert.equal(r.fieldErrors.self_score, '范围');
  assert.equal(
    errorResponse(new DomainError('MAINTENANCE_BUSY', '维护', {}, true)).retryable,
    true,
  );
});

isolated('A02: session entry cannot omit session identity to submit a rewritten original', (f) => {
  const id = make(f),
    s = session([id], { stage: 'reveal' });
  f.app.handle('session.save', { deck_id: 'question-default', expected_revision: 0, payload: s });
  assert.throws(
    () => f.app.handle('review.submit', cmd(f, id, 1, { request_id: s.entryId, thought: '伪造' })),
    /会话身份/,
  );
  assert.equal(f.app.snapshot().attempts.length, 0);
});
isolated('A04: moving linked knowledge cannot silently introduce cross-deck associations', (f) => {
  const b = f.app.handle('deck.save', { name: 'B', kind: 'question' }),
    k = f.app.handle('knowledge.save', { module: 'question-default', name: '知识' });
  make(f, { knowledge_ids: [k] });
  const node = f.app.snapshot().knowledge.find((v) => v.id === k);
  assert.throws(() => f.app.handle('knowledge.save', { ...node, module: b }), /关联/);
  assert.equal(f.app.snapshot().knowledge.find((v) => v.id === k).module, 'question-default');
});

isolated(
  'A09: valid JSON with invalid question snapshot structure is rejected before replacement',
  async (f) => {
    const id = make(f);
    f.app.handle('review.submit', cmd(f, id, 1));
    f.db.prepare("UPDATE attempts SET question_snapshot='[]'").run();
    const source = join(f.dir, 'invalid-shape.zip'),
      stage = join(f.dir, 'stage-shape');
    await createBackup(f.db, f.dir, source);
    await assert.rejects(() => stageBackup(source, stage), /结构损坏/);
    assert.equal(existsSync(stage), false);
    assert.equal(
      f.db.prepare('SELECT question_snapshot FROM attempts').get().question_snapshot,
      '[]',
    );
  },
);
