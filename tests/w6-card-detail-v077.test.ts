import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unifiedWorkspaceFixture } from './fixtures/unified-workspace.ts';
import { validateUnifiedData } from '../electron/infrastructure/migrations/unified-integrity.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const detail = readFileSync(resolve(root, 'src/unified/UnifiedCardDetail.vue'), 'utf8');
const workspace = readFileSync(resolve(root, 'src/unified/UnifiedWorkspace.vue'), 'utf8');
const styles = readFileSync(resolve(root, 'src/unified/v37/pages/cards.css'), 'utf8');
const code = (name: string) => (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === name;

async function addNode(f: Awaited<ReturnType<typeof unifiedWorkspaceFixture>>, deckId: string, parentId: string | null, name: string) {
  const current = await f.client.call('knowledge.tree.read', { deckId });
  return f.client.call('knowledge.node.create', {
    deckId,
    expectedTreeHash: current.treeHash,
    parentId,
    name,
  });
}

test('W6-01 question stem and options share a compact two-column group with a fixed option letter column', () => {
  assert.match(detail, /aria-label="题目与选项"/);
  assert.match(detail, /class="w6-option-grid"/);
  assert.match(detail, /class="w6-option-letter"/);
  assert.match(styles, /w6-option-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /w6-option-row\{display:grid;grid-template-columns:28px minmax\(0,1fr\)/);
  assert.match(styles, /overflow-wrap:anywhere/);
});

test('W6-02 correct answer and analysis render in one content group', () => {
  assert.match(detail, /aria-label="答案与解析"/);
  assert.match(detail, /class="w6-correct-answer"/);
  assert.match(detail, /class="w6-analysis-copy"/);
});

test('W6-03 qa-v1 and direct-v1 retain their own content layouts', () => {
  assert.match(detail, /payload\?\.encoding === 'qa-v1'/);
  assert.match(detail, /payload\?\.encoding === 'direct-v1'/);
  assert.match(detail, /aria-label="问题与答案"/);
  assert.match(detail, /aria-label="直接记忆正文"/);
});

test('W6-04 statistics summary, trend, recent learning and full history share one section', () => {
  assert.match(detail, /aria-label="学习统计"/);
  assert.match(detail, /class="w6-stat-metrics"/);
  assert.match(detail, /class="w6-stat-columns"/);
  assert.match(detail, /class="w6-recent"/);
  assert.match(detail, /class="w6-history-panel"/);
});

test('W6-05 detail page opens the existing picker and no longer navigates to the knowledge graph', () => {
  assert.match(detail, /useKnowledgePicker/);
  assert.match(detail, /knowledgePicker\.open/);
  assert.match(detail, /purpose: 'association'/);
  assert.doesNotMatch(detail, /emit\(['"]knowledge['"]\)/);
  assert.doesNotMatch(workspace, /@knowledge="switchPage\('knowledge'\)"/);
});

test('W6-06 card link replacement adds, disconnects and preserves the exact requested IDs after SQLite readback and reopen', async () => {
  const f = await unifiedWorkspaceFixture();
  try {
    const card = await f.card('direct');
    const rootNode = await addNode(f, card.deckId, null, 'W6根节点');
    const keepA = await addNode(f, card.deckId, rootNode.nodeId, '保留甲');
    const dropB = await addNode(f, card.deckId, rootNode.nodeId, '断开乙');
    const keepC = await addNode(f, card.deckId, rootNode.nodeId, '保留丙');
    const addD = await addNode(f, card.deckId, rootNode.nodeId, '新增丁');

    const initial = await f.client.call('knowledge.cardLinks.get', card);
    const before = await f.client.call('knowledge.cardLinks.set', {
      ...card,
      nodeIds: [keepA.nodeId, dropB.nodeId, keepC.nodeId],
      expectedRevision: initial.revision,
    });
    const after = await f.client.call('knowledge.cardLinks.set', {
      ...card,
      nodeIds: [keepA.nodeId, keepC.nodeId, addD.nodeId],
      expectedRevision: before.revision,
    });
    assert.equal(after.revision, before.revision + 1);
    assert.deepEqual(after.nodeIds, [keepA.nodeId, keepC.nodeId, addD.nodeId]);

    const persisted = await f.client.call('knowledge.cardLinks.get', card);
    assert.deepEqual(persisted.nodeIds, [keepA.nodeId, keepC.nodeId, addD.nodeId]);
    assert.ok((await f.client.call('knowledge.node.read', { deckId: card.deckId, nodeId: dropB.nodeId })).nodeId);
    f.reopen();
    assert.deepEqual((await f.client.call('knowledge.cardLinks.get', card)).nodeIds, [keepA.nodeId, keepC.nodeId, addD.nodeId]);
    for (const nodeId of [keepA.nodeId, dropB.nodeId, keepC.nodeId, addD.nodeId]) {
      assert.equal((await f.client.call('knowledge.node.read', { deckId: card.deckId, nodeId })).nodeId, nodeId);
    }
    validateUnifiedData(f.ctx.db);
  } finally {
    f.close();
  }
});

test('W6-07 CAS rejects stale edits and changing current links never rewrites a frozen review knowledge snapshot', async () => {
  const f = await unifiedWorkspaceFixture();
  try {
    const card = await f.card('direct');
    const rootNode = await addNode(f, card.deckId, null, 'W6历史根节点');
    const firstNode = await addNode(f, card.deckId, rootNode.nodeId, '事件时刻关联');
    const secondNode = await addNode(f, card.deckId, rootNode.nodeId, '后来断开');

    const initial = await f.client.call('knowledge.cardLinks.get', card);
    const before = await f.client.call('knowledge.cardLinks.set', {
      ...card,
      nodeIds: [firstNode.nodeId, secondNode.nodeId],
      expectedRevision: initial.revision,
    });
    let session = await f.client.call('learning.session.open', { deckId: card.deckId, cardIds: [card.cardId] });
    const frozen = structuredClone(session.entry.knowledge);
    session = await f.client.call('learning.session.change', {
      deckId: card.deckId,
      sessionId: session.sessionId,
      expectedRevision: session.revision,
      action: 'save',
      draft: { ...session.draft, scoreTenths: 90 },
    });
    const submitted = await f.client.call('learning.review.submit', {
      deckId: card.deckId,
      sessionId: session.sessionId,
      expectedRevision: session.revision,
      eventId: session.entry.eventId,
      scoreTenths: 90,
      faults: [],
      gaps: '',
      reflection: '',
      practice: false,
    });

    const changed = await f.client.call('knowledge.cardLinks.set', {
      ...card,
      nodeIds: [firstNode.nodeId],
      expectedRevision: before.revision,
    });
    assert.deepEqual(changed.nodeIds, [firstNode.nodeId]);
    await assert.rejects(
      () => f.client.call('knowledge.cardLinks.set', {
        ...card,
        nodeIds: [secondNode.nodeId],
        expectedRevision: before.revision,
      }),
      code('REVISION_CONFLICT'),
    );

    const history = await f.client.call('learning.history.get', { ...card, eventId: submitted.eventId });
    assert.deepEqual(history.native!.knowledge, frozen);
    assert.equal((await f.client.call('knowledge.node.read', { deckId: card.deckId, nodeId: secondNode.nodeId })).nodeId, secondNode.nodeId);
    f.reopen();
    const reopenedHistory = await f.client.call('learning.history.get', { ...card, eventId: submitted.eventId });
    assert.deepEqual(reopenedHistory.native!.knowledge, frozen);
    assert.deepEqual((await f.client.call('knowledge.cardLinks.get', card)).nodeIds, [firstNode.nodeId]);
    validateUnifiedData(f.ctx.db);
  } finally {
    f.close();
  }
});

test('W6-08 detail layout stays responsive and refreshes from the authoritative data source', () => {
  assert.match(styles, /@media\(max-width:1060px\)/);
  assert.match(styles, /@media\(max-width:850px\)/);
  assert.match(styles, /@media\(max-width:620px\)/);
  assert.match(detail, /useDataRefresh\(refreshDetail/);
  assert.match(detail, /dataSync\.batch/);
  assert.match(detail, /dataSync\.assertCurrent/);
});
