import { startSmoke } from "./validation/smoke-evidence.mjs";
const finishSmoke = startSmoke(import.meta.url);
import { _electron as electron } from 'playwright-core';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url),
  dir = mkdtempSync(join(tmpdir(), 'gank-picker-'));
let app;
const errors = [],
  cases = [];
try {
  app = await electron.launch({
    executablePath: process.argv[3] ?? require('electron'),
    args: [
      ...(process.platform === 'linux'
        ? ['--no-sandbox', '--ozone-platform=headless', '--disable-gpu']
        : []),
      resolve(process.argv[2] ?? '.'),
    ],
    env: { ...process.env, GANKSOFT_E2E: '1', GANKSOFT_DATA_DIR: dir },
  });
  const page = await app.firstWindow();await page.addInitScript(()=>{window.confirm=()=>true});await page.evaluate(()=>{window.confirm=()=>true});
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.getByRole('heading', { name: '今天，从一次主动回忆开始。' }).waitFor();
  async function call(method, payload = {}) {
    return page.evaluate(
      async ({ method, payload }) => {
        const c = await window.gank.protocol({
          protocol: { major: 2, minor: 0 },
          requestId: crypto.randomUUID(),
          dataEpoch: null,
          method: 'app.capabilities',
          payload: {},
        });
        const r = await window.gank.protocol({
          protocol: { major: 2, minor: 0 },
          requestId: crypto.randomUUID(),
          dataEpoch: c.dataEpoch,
          method,
          payload,
        });
        if (!r.ok) throw Error(JSON.stringify(r));
        return r.data;
      },
      { method, payload },
    );
  }
  const decks = (await call('workspace.read', { sections: ['catalog'] })).decks,
    q = decks.find((d) => d.kind === 'question').id,
    m = decks.find((d) => d.kind === 'memory').id,
    parent = await call('knowledge.save', { deckId: q, name: '增长问题' }),
    child = await call('knowledge.save', { deckId: q, name: '基期量', parentId: parent });
  await call('knowledge.save', { deckId: m, name: '记忆知识点' });
  const other = await call('catalog.deck.save', { name: '空白错题集', kind: 'question' });
  await page.reload();
  await page.getByRole('heading', { name: '今天，从一次主动回忆开始。' }).waitFor();
  await page.locator('.tree-row').filter({ hasText: '错题复盘' }).click();
  await page.getByRole('button', { name: '＋ 新增错题卡', exact: true }).click();
  const editor = page
    .locator('.modal')
    .filter({ has: page.getByRole('heading', { name: '录入错题', exact: true }) });
  await editor
    .getByPlaceholder('输入题干；图片题可填写简短说明，并在下方直接添加截图。')
    .fill('知识点选择验收题');
  await editor.getByLabel('正确答案').selectOption('B');
  const open = () => editor.getByRole('button', { name: '从思维导图选择 / 新增知识点' }).click(),
    dialog = page.getByRole('dialog', { name: '从思维导图选择知识点' });
  await open();
  await dialog.getByRole('button', { name: '增长问题 / 基期量', exact: true }).waitFor();
  assert.equal(await dialog.getByText('记忆知识点', { exact: true }).count(), 0);
  await dialog.getByRole('button', { name: '增长问题 / 基期量', exact: true }).click();
  await dialog.getByRole('button', { name: '增长问题', exact: true }).click();
  await dialog.getByLabel('新增知识点名称', { exact: true }).fill('现期量');
  await dialog.getByRole('button', { name: '新增并选中', exact: true }).click();
  await dialog.getByRole('button', { name: '增长问题 / 现期量', exact: true }).waitFor();
  const created = (
    await call('workspace.read', { sections: ['knowledge'], deckId: q })
  ).knowledge.find((k) => k.name === '现期量');
  assert.equal(created.parentId, parent);
  await dialog.getByRole('button', { name: '确认关联', exact: true }).click();
  await open();
  await dialog.getByRole('button', { name: '移除选择 基期量', exact: true }).click();
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await editor.getByRole('button', { name: '保存错题', exact: true }).click();
  await editor.waitFor({ state: 'hidden' });
  const saved = (await call('workspace.read', { sections: ['content'], deckId: q })).questions[0];
  assert.deepEqual(new Set(saved.knowledgeIds), new Set([parent, child, created.id]));
  cases.push('hierarchy-multiselect-create-child-and-cancel-selection');
  await page.getByRole('button', { name: '＋ 新增错题卡', exact: true }).click();
  await open();
  await dialog.getByRole('button', { name: '增长问题', exact: true }).click();
  await dialog.getByRole('button', { name: '确认关联', exact: true }).click();
  await editor.getByLabel('所属卡片集').selectOption(other);
  assert.equal(
    await editor.getByRole('button', { name: '取消关联 增长问题', exact: true }).count(),
    0,
  );
  await open();
  await dialog
    .getByText('此卡片集暂无知识点，从下方新增一级知识点开始。', { exact: true })
    .waitFor();
  await dialog.getByLabel('新增知识点名称', { exact: true }).fill('首个知识点');
  await dialog.getByRole('button', { name: '新增并选中', exact: true }).click();
  await dialog.getByRole('button', { name: '首个知识点', exact: true }).waitFor();
  await dialog.getByRole('button', { name: '确认关联', exact: true }).click();
  assert.equal(
    (await call('workspace.read', { sections: ['knowledge'], deckId: other })).knowledge[0]
      .parentId,
    null,
  );
  await editor.getByRole('button', { name: '取消', exact: true }).click();
  cases.push('deck-switch-clears-associations-and-empty-tree-creation');
  await page.locator('.tree-row').filter({ hasText: '记忆积累' }).click();
  await page.getByRole('button', { name: /新增记忆卡/ }).click();
  const memory = page
    .locator('.modal')
    .filter({ has: page.getByRole('heading', { name: '新增记忆卡', exact: true }) });
  await memory.getByRole('button', { name: '从思维导图选择 / 新增知识点' }).click();
  await dialog.getByRole('button', { name: '记忆知识点', exact: true }).waitFor();
  await page.setViewportSize({ width: 1366, height: 768 });
  await dialog.getByLabel('搜索图谱知识点').fill('记忆');
  await page.keyboard.press('Enter');
  await dialog.getByRole('button', { name: '确认关联', exact: true }).click();
  await memory.getByRole('button', { name: '取消关联 记忆知识点', exact: true }).waitFor();
  cases.push('memory-picker-search-keyboard-and-small-viewport');
  assert.deepEqual(errors, []);
  mkdirSync('validation-results', { recursive: true });
  writeFileSync(
    'validation-results/knowledge-picker.json',
    JSON.stringify({ platform: process.platform, cases, errors }, null, 2),
  );
  finishSmoke({ platform: process.platform, cases, errors });
  console.log(JSON.stringify({ cases, errors }));
} finally {
  await app?.close();
}
