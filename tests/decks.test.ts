import {readContainer,writeContainer} from '../electron/infrastructure/containers.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from './fixture.ts';
import { Application } from '../electron/application.ts';
import { createBackup, stageBackup } from '../electron/infrastructure/backup.ts';
function fixture() {
  const db = openDatabase(':memory:');
  return {
    db,
    app: new Application({ db, dataDir: ':memory:', now: () => new Date('2026-10-15T12:00:00Z') }),
  };
}
test('fresh workspace is generic; folder moves preserve stable links and history', () => {
  const { db, app } = fixture();
  try {
    assert.deepEqual(
      app
        .snapshot()
        .decks.filter(d=>!d.name.startsWith('测试/')).map((d) => d.name)
        .sort(),
      ['记忆积累', '错题复盘'].sort(),
    );
    const parent = app.handle('folder.save', { name: '自定积累' });
    const child = app.handle('deck.save', { name: '第一组', folder_id: parent, kind: 'memory' });
    assert.equal(app.snapshot().decks.find((d) => d.id === child)!.kind, 'memory');
    const k = app.handle('knowledge.save', { module: child, name: '概念' });
    const card = app.handle('memory.save', {
      module: child,
      title: '卡',
      cue: '提示',
      content: '内容',
      knowledge_ids: [k],
    });
    app.handle('memory.review', { id: card, version: 1, score: 3 });
    app.handle('deck.save', {
      id: child,
      version: 1,
      name: '第二组',
      kind: 'memory',
      parent_id: '',
    });
    assert.equal(app.snapshot().memories.find((m) => m.id === card)!.module, child);
    assert.deepEqual(app.snapshot().memories.find((m) => m.id === card)!.knowledge_ids, [k]);
    assert.equal(app.snapshot().memoryReviews.length, 1);
    assert.throws(
      () => app.handle('deck.save', { id: child, version: 1, name: '过期修改', kind: 'memory' }),
      /变化/,
    );
    assert.throws(
      () => app.handle('deck.save', { id: child, version: 2, name: '变类型', kind: 'question' }),
      /类型/,
    );
  } finally {
    db.close();
  }
});
test('folders reject cycles and deck deletion restores only its own live contents', () => {
  const { db, app } = fixture();
  try {
    const parent = app.handle('folder.save', { name: '父' }),
      child = app.handle('folder.save', { name: '子', parent_id: parent });
    assert.throws(
      () => app.handle('folder.save', { id: parent, name: '父', parent_id: child }),
      /循环/,
    );
    const deck = app.handle('deck.save', { name: '卡片集', folder_id: child, kind: 'question' });
    assert.throws(
      () => app.handle('deck.save', { name: '非法子集', parent_id: deck, kind: 'question' }),
      /子集/,
    );
    const q = app.handle('question.save', { module: deck, stem: '题目', answer: 'A' });
    app.handle('folder.action', { id: parent, action: 'delete', cascade: true });
    assert.ok(app.snapshot().questions.find((c) => c.id === q)!.deleted_at);
    app.handle('folder.action', { id: parent, action: 'restore' });
    assert.equal(app.snapshot().questions.find((c) => c.id === q)!.deleted_at, null);
    assert.equal(app.snapshot().decks.find((d) => d.id === deck)!.folder_id, child);
  } finally {
    db.close();
  }
});
test('targeted bulk import remaps knowledge and is idempotent separately for each target', () => {
  const { db, app } = fixture();
  try {
    const a = app.handle('deck.save', { name: '积累甲', kind: 'memory' }),
      b = app.handle('deck.save', { name: '积累乙', kind: 'memory' });
    const pkg = {
      format: 'ganksoft.content',
      schemaVersion: '2.0',
      packageId: 'target-test',
      namespace: 'target-test',
      archives: [
        {
          archiveId: 'concepts',
          version: 'v1',
          subject: '常识',
          nodes: [{ key: 'concept', name: '概念' }],
          relations: [],
        },
      ],
      items: [
        {
          key: 'card',
          kind: 'memory',
          title: '记忆',
          subject: '常识',
          cue: '问题',
          content: '答案',
          knowledgeRefs: [{ archiveId: 'concepts', version: 'v1', nodeKey: 'concept' }],
        },
      ],
    };
    function commit(target: string) {
      const options = { targetDeckId: target };
      const preview = app.handle('import.preview', { package: pkg, options });
      assert.deepEqual(preview.errors, []);
      return app.handle('import.commit', { package: pkg, options, expected: preview });
    }
    commit(a);
    assert.equal(app.snapshot().memories.length, 1);
    commit(a);
    assert.equal(app.snapshot().memories.length, 1);
    commit(b);
    assert.equal(app.snapshot().memories.length, 2);
    const cards = app.snapshot().memories;
    assert.notEqual(cards[0].knowledge_ids[0], cards[1].knowledge_ids[0]);
    const wrong = app.handle('deck.save', { name: '错题', kind: 'question' });
    assert.throws(() => commit(wrong), /类型/);
    assert.equal(app.snapshot().memories.length, 2);
  } finally {
    db.close();
  }
});
test('ZIP full backup restores deck hierarchy, card links and review schedule', async () => {
  const { db, app } = fixture(),
    dir = mkdtempSync(join(tmpdir(), 'gank-v3-'));
  try {
    const deck = app.handle('deck.save', { name: '自定', kind: 'memory' }),
      kid = app.handle('knowledge.save', { module: deck, name: '知识' });
    const card = app.handle('memory.save', {
      module: deck,
      title: '卡',
      cue: '前',
      content: '后',
      knowledge_ids: [kid],
    });
    app.handle('memory.review', { id: card, version: 1, score: 4 });
    const file = join(dir, 'full.zip');
    await createBackup(db, dir, file);
    assert.equal(readFileSync(file).subarray(0, 2).toString(), 'PK');
    await stageBackup(file, join(dir, 'restored'));
    const restored = openDatabase(join(dir, 'restored', 'ganksoft.sqlite'));
    try {
      const s = new Application({ db: restored, dataDir: dir, now: () => new Date() }).snapshot();
      assert.ok(s.decks.some((d) => d.id === deck));
      assert.deepEqual(s.memories[0].knowledge_ids, [kid]);
      assert.equal(s.memoryReviews.length, 1);
      assert.equal(s.memories[0].due_at, app.snapshot().memories[0].due_at);
    } finally {
      restored.close();
    }
    const bad=await readContainer(file);bad.set('database.sqlite',Buffer.from('tampered'));await writeContainer(join(dir,'bad.zip'),bad);
    await assert.rejects(()=>stageBackup(join(dir,'bad.zip'),join(dir,'bad')),/校验失败/);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
