import {readContainer,writeContainer} from '../electron/infrastructure/containers.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from './fixture.ts';
import { Application } from '../electron/application.ts';
import { schedule } from '../electron/modules/review/legacy-scheduler.ts';
import { grade } from '../electron/modules/review/scoring.ts';
import { createBackup, stageBackup } from '../electron/infrastructure/backup.ts';
function fixture() {
  const db = openDatabase(':memory:');
  let now = new Date('2026-10-15T08:00:00Z');
  const app = new Application({ db, dataDir: ':memory:', now: () => new Date(now) });
  return {
    app,
    db,
    next: (days = 1) => {
      now = new Date(+now + days * 86400000);
    },
    close: () => db.close(),
  };
}
function k(app: Application, name: string, parent_id?: string) {
  return app.handle('knowledge.save', {
    name,
    module: '资料分析',
    parent_id,
    principle: name + '原理',
  });
}
function q(app: Application, ids: string[]) {
  return app.handle('question.save', {
    module: '资料分析',
    stem: '某值为多少？',
    answer: 'B',
    analysis: '使用基期公式。',
    knowledge_ids: ids,
    status: 'ready',
  });
}
function attempt(app: Application, qid: string, extra: any = {}) {
  const version = app.snapshot().questions.find((q: any) => q.id === qid)!.version;
  return app.handle('review.submit', {
    thought: '先识别条件，再独立判断选项。',
    question_id: qid,
    question_version: version,
    answer: 'B',
    basis: 'independent',
    understanding: 3,
    ...extra,
  });
}
test('many-to-many links and knowledge rename remain consistent', () => {
  const { app, close } = fixture();
  try {
    const a = k(app, '基期量'),
      b = k(app, '百分数'),
      x = q(app, [a, b]),
      y = q(app, [a]);
    assert.equal(app.snapshot().questions.find((q: any) => q.id === x)!.knowledge_ids.length, 2);
    const node = app.snapshot().knowledge.find((k: any) => k.id === a)!;
    app.handle('knowledge.save', { ...node, name: '基期量计算' });
    assert.equal(app.snapshot().questions.find((q: any) => q.id === y)!.knowledge_ids[0], a);
    assert.equal(app.snapshot().knowledge.find((k: any) => k.id === a)!.name, '基期量计算');
  } finally {
    close();
  }
});
test('hierarchy rejects cycles and transaction rolls back', () => {
  const { app, close } = fixture();
  try {
    const a = k(app, '增长'),
      b = k(app, '基期', a);
    const before = app.snapshot().knowledge.find((k: any) => k.id === a)!;
    assert.throws(() => app.handle('knowledge.save', { ...before, parent_id: b }), /循环/);
    assert.equal(app.snapshot().knowledge.find((k: any) => k.id === a)!.parent_id, null);
    assert.throws(() => q(app, [a, 'missing']), /不存在/);
    assert.equal(app.snapshot().questions.length, 0);
  } finally {
    close();
  }
});
test('merge migrates question links, fault references and related edges without duplicates', () => {
  const { app, db, close } = fixture();
  try {
    const a = k(app, '基期'),
      b = k(app, '基期量'),
      c = k(app, '增长率');
    const x = q(app, [a, b]);
    app.ctx.db.prepare('INSERT INTO relations VALUES (?,?,?,?,?)').run('legacy-a', ...[a,c].sort(), '公式关联', '一');
    app.ctx.db.prepare('INSERT INTO relations VALUES (?,?,?,?,?)').run('legacy-b', ...[b,c].sort(), '公式关联', '二');
    attempt(app, x, {
      answer: 'A',
      understanding: 0,
      faults: ['知识缺失'],
      error_knowledge_ids: [a],
    });
    app.handle('knowledge.merge', { source_id: a, target_id: b });
    assert.deepEqual(app.snapshot().questions[0].knowledge_ids, [b]);
    assert.equal(app.snapshot().relations.length, 1);
    assert.match(app.snapshot().relations[0].note, /一/);
    assert.equal(
      (db.prepare('SELECT knowledge_id FROM attempt_faults').get() as any).knowledge_id,
      b,
    );
    assert.equal(
      (db.prepare('SELECT knowledge_snapshot FROM attempt_faults').get() as any).knowledge_snapshot,
      '基期',
    );
    assert.equal(app.snapshot().knowledge.find((k: any) => k.id === a)!.deleted_at !== null, true);
  } finally {
    close();
  }
});
test('ancestor merge and conflicting child names do not partially modify data', () => {
  const { app, close } = fixture();
  try {
    const a = k(app, '增长'),
      b = k(app, '基期', a);
    assert.throws(() => app.handle('knowledge.merge', { source_id: a, target_id: b }), /上级/);
    const c = k(app, '另一个增长');
    k(app, '基期', c);
    assert.throws(() => app.handle('knowledge.merge', { source_id: a, target_id: c }), /重名/);
    assert.equal(app.snapshot().knowledge.filter((k: any) => !k.deleted_at).length, 4);
  } finally {
    close();
  }
});
test('delete removes live references but preserves question, attempt and fault text', () => {
  const { app, db, close } = fixture();
  try {
    const a = k(app, '基期量'),
      x = q(app, [a]);
    attempt(app, x, {
      answer: 'A',
      understanding: 0,
      faults: ['知识缺失'],
      error_knowledge_ids: [a],
    });
    app.handle('knowledge.delete', { id: a });
    assert.equal(app.snapshot().questions[0].status, 'ready');
    assert.equal(app.snapshot().questions[0].knowledge_ids.length, 0);
    assert.equal(app.snapshot().attempts.length, 1);
    assert.equal(
      (db.prepare('SELECT knowledge_id FROM attempt_faults').get() as any).knowledge_id,
      null,
    );
    app.handle('knowledge.restore', { id: a });
    assert.equal(app.snapshot().knowledge[0].deleted_at, null);
    assert.equal(app.snapshot().questions[0].knowledge_ids.length, 0);
  } finally {
    close();
  }
});
test('optimistic versions reject stale edits', () => {
  const { app, close } = fixture();
  try {
    const a = k(app, '基期');
    const node = app.snapshot().knowledge[0];
    app.handle('knowledge.save', { ...node, name: '基期量' });
    assert.throws(() => app.handle('knowledge.save', { ...node, name: '旧页修改' }), /已发生变化/);
  } finally {
    close();
  }
});
test('grading never treats guessing or remembered answers as independent mastery', () => {
  assert.equal(grade(true, 'guess', 3), 2);
  assert.equal(grade(true, 'remember', 3), 2);
  assert.equal(grade(true, 'hint', 3), 1);
  assert.equal(grade(true, 'independent', 3), 4);
  assert.equal(grade(false, 'independent', 3), 1);
});
test('review history is append-only and same-day consolidation cannot inflate mastery', () => {
  const { app, next, close } = fixture();
  try {
    const a = k(app, '基期'),
      x = q(app, [a]);
    const first = attempt(app, x);
    assert.ok(first.result.days > 0);
    assert.equal(first.result.mastery, null);
    const second = attempt(app, x);
    assert.equal(second.effective, false);
    assert.equal(app.snapshot().attempts.length, 2);
    assert.equal(app.snapshot().questions[0].interval_days, first.result.days);
    next(7);
    const failed = attempt(app, x, { answer: 'A', understanding: 0 });
    assert.ok(failed.result.days <= 1);
    assert.equal(failed.result.mastery, null);
    assert.equal(app.snapshot().attempts.length, 3);
  } finally {
    close();
  }
});
test('foreign fault knowledge rejects and rolls back attempt', () => {
  const { app, close } = fixture();
  try {
    const a = k(app, '基期'),
      b = k(app, '增长率'),
      x = q(app, [a]);
    assert.throws(
      () => attempt(app, x, { faults: ['知识缺失'], error_knowledge_ids: [b] }),
      /必须关联/,
    );
    assert.equal(app.snapshot().attempts.length, 0);
  } finally {
    close();
  }
});
test('correct answer change resets plan while retaining historical answer snapshots', () => {
  const { app, db, close } = fixture();
  try {
    const a = k(app, '基期'),
      x = q(app, [a]);
    attempt(app, x);
    const question = app.snapshot().questions[0];
    app.handle('question.save', { ...question, answer: 'C' });
    assert.equal(app.snapshot().questions[0].mastery, null);
    assert.equal(app.snapshot().attempts.length, 1);
    assert.equal(
      (db.prepare('SELECT answer_snapshot FROM attempts').get() as any).answer_snapshot,
      'B',
    );
    const r = attempt(app, x, { answer: 'C' });
    assert.equal(r.effective, true);
  } finally {
    close();
  }
});
test('scheduler enforces interval bounds and repeated-error rule', () => {
  const base = {
    previousInterval: 30,
    previousMastery: 80,
    now: new Date('2026-10-15T08:00:00Z'),
    maxInterval: 60,
  };
  assert.equal(schedule({ ...base, score: 4, recentScores: [4, 4] }).days, 60);
  assert.equal(schedule({ ...base, score: 3, recentScores: [0, 1] }).days, 1);
  assert.throws(() => schedule({ ...base, score: 5, recentScores: [] }), /评分/);
});
test('removed relation editing is unavailable',()=>{const f=fixture();try{assert.throws(()=>f.app.handle('relation.save',{}));assert.throws(()=>f.app.handle('relation.delete',{}));}finally{f.close();}});
test('backup roundtrip preserves data and image bytes; checksum rejects corruption', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gank-test-'));
  const data = join(dir, 'data');
  mkdirSync(join(data, 'attachments'), { recursive: true });
  const db = openDatabase(join(data, 'ganksoft.sqlite'));
  try {
    const app = new Application({ db, dataDir: data, now: () => new Date() });
    const a = k(app, '基期'),
      x = q(app, [a]);
    const file = '00000000-0000-0000-0000-000000000000.png';
    writeFileSync(join(data, 'attachments', file), Buffer.from('example-image'));
    app.handle('asset.add', {
      id: 'asset',
      question_id: x,
      role: 'question',
      file_name: file,
      mime: 'image/png',
    });
    const backup = join(dir, 'backup.gankbackup');
    await createBackup(db, data, backup);
    const staging = join(dir, 'restored');
    await stageBackup(backup, staging);
    const recovered = openDatabase(join(staging, 'ganksoft.sqlite'));
    assert.equal((recovered.prepare('SELECT count(*) AS n FROM questions').get() as any).n, 1);
    recovered.close();
    assert.equal(readFileSync(join(staging, 'attachments', file), 'utf8'), 'example-image');
    const files=await readContainer(backup);files.set('database.sqlite',Buffer.from('bad'));await writeContainer(backup,files);
    await assert.rejects(()=>stageBackup(backup,join(dir,'bad')),/校验失败/);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
