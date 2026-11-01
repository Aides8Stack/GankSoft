import { startSmoke } from './validation/smoke-evidence.mjs';
import { _electron as electron } from 'playwright-core';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { createClient } from '../shared/protocol/client.ts';
import { publishFresh } from '../tests/fixtures/fresh-production.ts';
import { W6_CARD_DETAIL_CONTRACT } from './validation/smoke-contracts.mjs';

const finish = startSmoke(import.meta.url, W6_CARD_DETAIL_CONTRACT);
const require = createRequire(import.meta.url);
const data = mkdtempSync(join(tmpdir(), 'gank-w6-detail-'));
const target = resolve(process.argv[2] ?? '.');
const errors = [];
const cases = [];
let app;
let page;
let client;
const deckName = 'W6卡片详情验收';
const record = name => { cases.push(name); console.log('W6_CASE', name); };

async function launch() {
  app = await electron.launch({
    timeout: 30000,
    executablePath: process.argv[3] ?? require('electron'),
    args: [
      ...(process.platform === 'linux' ? ['--no-sandbox', '--ozone-platform=headless', '--disable-gpu'] : []),
      target,
    ],
    env: { ...process.env, GANKSOFT_E2E: '1', GANKSOFT_DATA_DIR: data },
  });
  page = await app.firstWindow({ timeout: 20000 });
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('heading', { name: '学习总览', exact: true }).waitFor();
  client = createClient(request => page.evaluate(value => window.gank.protocol(value), request));
  await client.call('app.capabilities', {});
}
async function close() {
  if (!app) return;
  const current = app;
  const child = current.process();
  app = undefined;
  const exited = child.exitCode !== null
    ? Promise.resolve(child.exitCode)
    : new Promise(resolveExit => child.once('exit', resolveExit));
  const timer = setTimeout(() => child.kill('SIGKILL'), 8000);
  try {
    await current.close();
    const code = await exited;
    assert.equal(code, 0, 'W6 Electron process must close cleanly');
  } finally {
    clearTimeout(timer);
  }
}
async function createNode(deckId, parentId, name) {
  const tree = await client.call('knowledge.tree.read', { deckId });
  return client.call('knowledge.node.create', {
    deckId, parentId, name, expectedTreeHash: tree.treeHash,
  });
}
async function openCard(title) {
  await page.locator('.r3-cards .card-title-link').filter({ hasText: title }).click();
  await page.locator('.w6-detail').waitFor();
}
async function backToCards() {
  await page.locator('.w6-detail .page-heading .heading-actions button').first().click();
  await page.locator('.r3-cards').waitFor();
}
async function activateDetail() {
  await page.locator('.catalog-grid .catalog-open').filter({ hasText: deckName }).click();
  await page.locator('.deck-subnav').getByRole('button', { name: /所有卡片/ }).click();
  await page.getByRole('heading', { name: '所有卡片', exact: true }).waitFor();
}
async function pickNode(dialog, id) {
  const node = dialog.locator('.knowledge-exchange-map [data-knowledge-id="' + id + '"]');
  await node.waitFor();
  await node.click();
}
try {
  await launch();
  const deck = await client.call('workspace.catalog.save', { kind: 'deck', name: deckName, parentId: null });
  const question = await publishFresh(client, 'question', deck.id);
  const qa = await publishFresh(client, 'qa', deck.id);
  const direct = await publishFresh(client, 'direct', deck.id);
  const root = await createNode(deck.id, null, 'W6逻辑判断');
  const keepA = await createNode(deck.id, root.nodeId, '必要条件');
  const dropB = await createNode(deck.id, root.nodeId, '逆否命题');
  const keepC = await createNode(deck.id, root.nodeId, '充分条件');
  const addD = await createNode(deck.id, root.nodeId, '条件关系辨析');
  const scope = { deckId: deck.id, cardId: question.cardId };
  const initial = await client.call('knowledge.cardLinks.get', scope);
  await client.call('knowledge.cardLinks.set', {
    ...scope,
    nodeIds: [root.nodeId, keepA.nodeId, dropB.nodeId, keepC.nodeId],
    expectedRevision: initial.revision,
  });

  let session = await client.call('learning.session.open', {
    deckId: deck.id, cardIds: [question.cardId], practice: false,
  });
  const frozenKnowledge = structuredClone(session.entry.knowledge);
  if (session.stage === 'answer') {
    session = await client.call('learning.session.change', {
      deckId: deck.id, sessionId: session.sessionId, expectedRevision: session.revision,
      action: 'reveal',
      draft: { ...session.draft, selectedOptionId: 'a', thought: 'W6关联历史快照原始思路' },
    });
  }
  session = await client.call('learning.session.change', {
    deckId: deck.id, sessionId: session.sessionId, expectedRevision: session.revision,
    action: 'save',
    draft: { ...session.draft, selectedOptionId: 'a', scoreTenths: 90, thought: 'W6关联历史快照原始思路' },
  });
  const review = await client.call('learning.review.submit', {
    deckId: deck.id, sessionId: session.sessionId, expectedRevision: session.revision,
    eventId: session.entry.eventId, scoreTenths: 90, practice: false,
    faults: [], gaps: '', reflection: '',
  });

  await page.reload();
  await page.getByRole('heading', { name: '学习总览', exact: true }).waitFor();
  await activateDetail();
  await openCard('正式合成question');
  await page.getByRole('heading', { name: '题目与选项', exact: true }).waitFor();
  await page.getByRole('heading', { name: '答案与解析', exact: true }).waitFor();
  assert.equal(await page.locator('.w6-option-row').count(), 2);
  assert.equal(await page.locator('.w6-statistics').count(), 1);
  assert.equal(await page.locator('.w6-stat-metrics > div').count(), 4);
  assert.ok((await page.locator('.w6-knowledge-links').innerText()).includes('W6逻辑判断 / 必要条件'));
  record('w6-01-question-options-answer-analysis-and-knowledge-paths');

  for (const width of [900, 1366, 1600]) {
    await page.setViewportSize({ width, height: 950 });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const geometry = await page.locator('.w6-option-grid').evaluate(element => {
      const rows = [...element.querySelectorAll('.w6-option-row')].map(row => {
        const letter = row.querySelector('.w6-option-letter').getBoundingClientRect();
        const text = row.querySelector('.w6-option-copy').getBoundingClientRect();
        return { letterTop: letter.top, textTop: text.top };
      });
      return {
        columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        rows,
      };
    });
    assert.ok(geometry.pageWidth <= geometry.viewportWidth + 1, 'no horizontal page overflow at ' + width);
    assert.ok(geometry.rows.every(row => Math.abs(row.letterTop - row.textTop) <= 3), 'option letter and text start on the same row at ' + width);
    assert.equal(geometry.columns, 2, 'desktop two-column option layout at ' + width);
    mkdirSync('validation-results/w6', { recursive: true });
    await page.screenshot({ path: join('validation-results/w6', 'card-detail-' + width + '.png') });
  }
  record('w6-02-responsive-900-1366-1600');

  await backToCards();
  await openCard('正式合成qa');
  await page.getByRole('region', { name: '问题与答案' }).waitFor();
  assert.equal(await page.locator('.w6-option-grid').count(), 0);
  record('w6-03-qa-mode-retains-question-answer-layout');

  await backToCards();
  await openCard('正式合成direct');
  await page.getByRole('region', { name: '直接记忆正文' }).waitFor();
  assert.equal(await page.locator('.w6-option-grid').count(), 0);
  record('w6-04-direct-mode-retains-markdown-body');

  await backToCards();
  await openCard('正式合成question');
  await page.getByRole('button', { name: '修改关联' }).click();
  const dialog = page.locator('dialog[data-knowledge-picker-host]');
  await dialog.waitFor({ state: 'visible' });
  await pickNode(dialog, dropB.nodeId);
  await pickNode(dialog, addD.nodeId);
  await dialog.getByRole('button', { name: '确认选择', exact: true }).click();
  await page.getByRole('button', { name: '保存关联', exact: true }).click();
  await page.getByText('关联已保存，并已重新读取数据库验证。', { exact: true }).waitFor();
  const expectedIds = [root.nodeId, keepA.nodeId, keepC.nodeId, addD.nodeId];
  const persisted = await client.call('knowledge.cardLinks.get', scope);
  assert.deepEqual(new Set(persisted.nodeIds), new Set(expectedIds));
  assert.ok((await client.call('knowledge.node.read', { deckId: deck.id, nodeId: dropB.nodeId })).nodeId);
  const history = await client.call('learning.history.get', { ...scope, eventId: review.eventId });
  assert.deepEqual(history.native.knowledge, frozenKnowledge);
  assert.equal(await page.locator('.w6-detail').count(), 1, 'picker must not navigate to knowledge graph');
  record('w6-05-existing-picker-saves-links-and-reads-back-without-navigation');

  await page.getByRole('button', { name: '修改关联' }).click();
  const dialog2 = page.locator('dialog[data-knowledge-picker-host]');
  await dialog2.waitFor({ state: 'visible' });
  await pickNode(dialog2, dropB.nodeId);
  await pickNode(dialog2, addD.nodeId);
  await dialog2.getByRole('button', { name: '确认选择', exact: true }).click();
  const current = await client.call('knowledge.cardLinks.get', scope);
  await client.call('knowledge.cardLinks.set', {
    ...scope,
    nodeIds: [root.nodeId, keepA.nodeId, keepC.nodeId],
    expectedRevision: current.revision,
  });
  await page.getByRole('button', { name: '保存关联', exact: true }).click();
  await page.locator('.w6-link-error').filter({ hasText: '其他操作修改' }).waitFor();
  assert.ok((await page.locator('.w6-link-editor').innerText()).includes('逆否命题'));
  await page.getByRole('button', { name: '重新读取当前关联', exact: true }).click();
  assert.ok((await page.locator('.w6-link-editor').innerText()).includes('逆否命题'));
  assert.ok((await page.locator('.w6-knowledge-links').innerText()).includes('W6逻辑判断 / 充分条件'));
  await page.getByRole('button', { name: '放弃修改', exact: true }).click();
  record('w6-06-cas-conflict-preserves-pending-selection-and-reload');

  await page.getByRole('button', { name: '修改关联' }).click();
  const dialog3 = page.locator('dialog[data-knowledge-picker-host]');
  await dialog3.waitFor({ state: 'visible' });
  await pickNode(dialog3, addD.nodeId);
  await dialog3.getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(await page.locator('.w6-link-editor').count(), 0);
  assert.deepEqual(new Set((await client.call('knowledge.cardLinks.get', scope)).nodeIds), new Set([root.nodeId, keepA.nodeId, keepC.nodeId]));
  record('w6-07-picker-cancel-does-not-write');

  const finalLinks = await client.call('knowledge.cardLinks.get', scope);
  await close();
  await launch();
  assert.deepEqual(new Set((await client.call('knowledge.cardLinks.get', scope)).nodeIds), new Set(finalLinks.nodeIds));
  const reopenedHistory = await client.call('learning.history.get', { ...scope, eventId: review.eventId });
  assert.deepEqual(reopenedHistory.native.knowledge, frozenKnowledge);
  record('w6-08-new-electron-process-readback-preserves-links-and-review-snapshot');

  assert.deepEqual(errors, []);
  finish({ platform: process.platform, asar: target.endsWith('.asar'), cases, errors });
} finally {
  await close();
  rmSync(data, { recursive: true, force: true });
}
