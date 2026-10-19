import { _electron as electron } from 'playwright-core';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url),
  dir = mkdtempSync(join(tmpdir(), 'gank-import-cards-'));
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
  page.setDefaultTimeout(15000);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.getByRole('heading', { name: '今天，从一次主动回忆开始。' }).waitFor();
  const nav = (name) => page.locator('.collection-tab').filter({ hasText: name });
  const rows = page.locator('.explorer-list .card-row');
  const expectRows = async (n) => {
    await page.waitForFunction(
      (n) => document.querySelectorAll('.explorer-list .card-row').length === n,
      n,
    );
    assert.equal(await rows.count(), n);
  };
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
  async function importFile(file, duplicate = false) {
    await nav('批量导入与导出').click();
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async (_window, options) => {
        globalThis.__importFilters = options.filters;
        return { canceled: false, filePaths: [file] };
      };
    }, file);
    await page.getByRole('button', { name: '选择数据包文件（JSON / ZIP）', exact: true }).click();
    const filters = await app.evaluate(() => globalThis.__importFilters);
    assert(filters[0].extensions.includes('json') && filters[0].extensions.includes('zip'));
    await page.getByRole('button', { name: '确认导入', exact: true }).click();
    await page
      .getByRole('heading', {
        name: duplicate ? '本包已导入，未重复写入' : '导入完成',
        exact: true,
      })
      .waitFor();
  }
  const catalog = await call('workspace.read', { sections: ['catalog'] });
  const deck = catalog.decks.find((d) => d.kind === 'question').id;
  const memory = catalog.decks.find((d) => d.kind === 'memory').id;
  await page.locator('.tree-row').filter({ hasText: '错题复盘' }).click();
  if(!await page.getByLabel('学习状态').isVisible())await page.getByRole('button',{name:'高级筛选',exact:true}).click();
  await page.getByLabel('学习状态').selectOption('learned');
  await page.getByPlaceholder('搜索标题、正文、来源、知识点').fill('不匹配的旧筛选');
  await importFile(resolve('examples/fresh-review-12.gank.zip'));
  await nav('卡片集情况汇总').click();
  assert.match(await page.locator('.stat-card').first().innerText(), /卡片总数\s+12/);
  await nav('所有卡片').click();
  await expectRows(12);
  assert.equal(await page.getByLabel('学习状态').inputValue(), 'all');
  assert.equal(await page.getByPlaceholder('搜索标题、正文、来源、知识点').inputValue(), '');
  cases.push('zip-import-clears-retained-filters-and-matches-summary');
  // Explicit filters remain useful, and an empty view must explain where the cards went.
  if(!await page.getByLabel('学习状态').isVisible())await page.getByRole('button',{name:'高级筛选',exact:true}).click();
  await page.getByLabel('学习状态').selectOption('learned');
  await expectRows(0);
  await page.getByText('当前筛选隐藏了 12 张卡片。', { exact: false }).waitFor();
  await page.getByRole('button', { name: '显示本集全部卡片', exact: true }).click();
  await expectRows(12);
  cases.push('filtered-empty-view-explains-hidden-cards-and-can-reset');
  const old = (await call('workspace.read', { sections: ['content'], deckId: deck })).questions[0];
  await call('content.bulk', { deckId: deck, ids: [old.id], action: 'pause' });
  const pkg = JSON.parse(readFileSync('examples/fresh-review-12.gank.json', 'utf8'));
  pkg.packageId = 'ui-import-json-55';
  pkg.namespace = 'ui-import-json-55';
  const template = pkg.items[0];
  pkg.items = Array.from({ length: 55 }, (_, i) => ({
    ...template,
    key: `json-${i}`,
    title: `JSON导入卡片${i}`,
  }));
  const json = join(dir, '中文 空格.gank.json');
  writeFileSync(json, '\uFEFF' + JSON.stringify(pkg));
  await importFile(json);
  await page.getByRole('button', { name: '查看卡片', exact: true }).click();
  await expectRows(50);
  assert.match(await page.locator('.explorer-list h2').innerText(), /66/);
  await page.getByRole('button', { name: '下一页', exact: true }).click();
  await expectRows(16);
  await page.getByRole('button', { name: '上一页', exact: true }).click();
  await expectRows(50);
  assert.equal(
    (await call('workspace.read', { sections: ['content'], deckId: deck, limit: 100 })).questions
      .length,
    67,
  );
  cases.push('json-bom-chinese-space-path-and-multiple-data-and-ui-pages');
  await importFile(json, true);
  await page.getByRole('button', { name: '查看卡片', exact: true }).click();
  await expectRows(50);
  assert.match(await page.locator('.explorer-list h2').innerText(), /66/);
  cases.push('duplicate-import-does-not-add-cards-and-default-excludes-paused');
  await page.locator('.tree-row').filter({ hasText: '记忆积累' }).click();
  await expectRows(0);
  await importFile(resolve('examples/fresh-memory-6.gank.json'));
  await page.getByRole('button', { name: '查看卡片', exact: true }).click();
  await expectRows(6);
  assert.equal(
    (await call('workspace.read', { sections: ['content'], deckId: memory })).questions.length,
    0,
  );
  await page.locator('.tree-row').filter({ hasText: '错题复盘' }).click();
  await expectRows(50);
  cases.push('memory-json-import-and-deck-isolation');
  await nav('批量导入与导出').click();
  await app.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] });
  });
  await page.getByRole('button', { name: '选择数据包文件（JSON / ZIP）', exact: true }).click();
  await page.getByText('操作已取消', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: '确认导入', exact: true }).count(), 0);
  cases.push('cancel-does-not-offer-a-commit');
  assert.deepEqual(errors, []);
  mkdirSync('validation-results', { recursive: true });
  const result = {
    version: JSON.parse(readFileSync('package.json', 'utf8')).version,
    platform: process.platform,
    cases,
    errors,
  };
  writeFileSync('validation-results/import-cards.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await app?.close();
}
