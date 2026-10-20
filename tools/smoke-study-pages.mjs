import { startSmoke } from "./validation/smoke-evidence.mjs";
const finishSmoke = startSmoke(import.meta.url);
import { _electron as electron } from 'playwright-core';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { contentIdentity } from '../shared/protocol/identity.ts';
const require = createRequire(import.meta.url),
  dir = mkdtempSync(join(tmpdir(), 'gank-pages-'));
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
  await page.setViewportSize({ width: 1440, height: 1000 });
  const home = () => page.getByRole('heading', { name: '今天，从一次主动回忆开始。' });
  await home().waitFor();
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
  const deck = (await call('workspace.read', { sections: ['catalog'] })).decks.find(
    (d) => d.kind === 'question',
  ).id;
  const title = '资料分析：增长率与基期量的综合判断以及容易忽略的边界条件';
  const k = await call('knowledge.save', { deckId: deck, name: title });
  const ids = [];
  for (let i = 0; i < 3; i++)
    ids.push(
      await call('content.question.save', {
        deckId: deck,
        title: '复盘测试' + i,
        stem: '测试题' + i,
        answer: 'B',
        knowledgeIds: [k],
      }),
    );
  await page.reload();
  await home().waitFor();
  const openDeck = async () => {
    await page.locator('.tree-row').filter({ hasText: '错题复盘' }).click();
    await page.getByText('复盘测试0', { exact: true }).first().waitFor();
  };
  const study = async () => {
    await page.getByRole('button', { name: '学习', exact: true }).first().click();
    await page.locator('.study-main h2').waitFor();
  };
  await openDeck();
  await study();
  await page.locator('[role=tab]').waitFor();
  assert.equal(await page.locator('[role=tab]').first().getAttribute('aria-label'), title);
  assert((await page.locator('.review-page').first().getAttribute('title')).includes(title));
  await page
    .getByPlaceholder('写出判断依据、计算过程或卡住的位置。完全不会时也请记录原因。')
    .fill('独立草稿甲');
  const total = () => page.getByTestId('total-time').innerText();
  const waitTick = () => page.waitForTimeout(1150);
  await waitTick();
  assert.notEqual(await total(), '00:00:00');
  await page.getByRole('button', { name: '暂停总计时', exact: true }).click();
  const paused = await total();
  const questionTime = await page.locator('.study-controls span').innerText();
  await waitTick();
  assert.equal(await total(), paused);
  assert.equal(await page.locator('.study-controls span').innerText(), questionTime);
  await page.getByRole('button', { name: '恢复总计时', exact: true }).click();
  await waitTick();
  assert.notEqual(await total(), paused);
  cases.push('full-knowledge-title-and-manual-total-timer');
  await page.getByRole('button', { name: '主页面', exact: true }).click();
  await page.locator('.explorer-list').waitFor();
  await page.locator('[role=tab]').first().click();
  await page.getByRole('button', { name: '恢复总计时', exact: true }).waitFor();
  const resumed = await total();
  await waitTick();
  assert.equal(await total(), resumed);
  assert.equal(
    await page
      .getByPlaceholder('写出判断依据、计算过程或卡住的位置。完全不会时也请记录原因。')
      .inputValue(),
    '独立草稿甲',
  );
  await page.getByRole('button', { name: '恢复总计时', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.getByRole('button', { name: '恢复总计时', exact: true }).waitFor();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  const blurred = await total();
  await waitTick();
  assert.equal(await total(), blurred);
  cases.push('leave-and-blur-pause-with-manual-return-and-draft');
  await page.getByRole('button', { name: '主页面', exact: true }).click();
  await page.locator('.explorer-list').waitFor();
  await study();
  assert.equal(await page.locator('[role=tab]').count(), 1);
  cases.push('duplicate-single-card-reuses-page');
  await page.getByRole('button', { name: '主页面', exact: true }).click();
  await page.locator('.explorer-list').waitFor();
  await page.getByText('筛选方案', { exact: true }).click();
  await page.getByPlaceholder('保存当前筛选方案的名称').fill('我的完整复盘方案：三题综合训练');
  await page.getByRole('button', { name: '保存方案', exact: true }).click();
  await page.getByRole('button', { name: '我的完整复盘方案：三题综合训练', exact: true }).click();
  await page.getByRole('button', { name: '学习筛选结果', exact: true }).click();
  await page.getByRole('tab', { name: '我的完整复盘方案：三题综合训练', exact: true }).waitFor();
  assert.equal(await page.locator('[role=tab]').count(), 2);
  cases.push('named-plan-and-independent-same-deck-pages');
  await page.getByRole('button', { name: '主页面', exact: true }).click();
  await page.locator('.explorer-list').waitFor();
  await page.getByText('批量管理与随机卡片练习', { exact: true }).click();
  await page.getByRole('button', { name: '随机卡片练习', exact: true }).click();
  await page.locator('.study-main h2').waitFor();
  assert.equal(await page.locator('[role=tab]').count(), 2);
  cases.push('random-order-same-set-reuses-page');
  await page.reload();
  await home().waitFor();
  assert.equal(await page.locator('[role=tab]').count(), 0);
  await openDeck();
  assert.equal(await page.locator('[role=tab]').count(), 2);
  await page.locator('[role=tab]').first().click();
  await page.getByRole('button', { name: '恢复总计时', exact: true }).waitFor();
  assert.equal(
    await page
      .getByPlaceholder('写出判断依据、计算过程或卡住的位置。完全不会时也请记录原因。')
      .inputValue(),
    '独立草稿甲',
  );
  cases.push('reload-restores-pages-and-paused-draft');
  // Create many distinct queues via protocol, then verify actual layout after refresh.
  for (let i = 0; i < 10; i++) {
    const id = await call('content.question.save', {
      deckId: deck,
      title: '额外' + i,
      stem: '额外' + i,
      answer: 'B',
    });
    await call('session.draft', {
      deckId: deck,
      expectedRevision: 0,
      draft: {
        sessionId: crypto.randomUUID(),
        entryId: crypto.randomUUID(),
        ids: [id],
        index: 0,
        stage: 'answer',
        contentVersion: contentIdentity(id, 1),
        pageTitle: '长页面名称与知识点信息' + i,
      },
    });
  }
  await page.reload();
  await home().waitFor();
  await openDeck();
  await page.setViewportSize({ width: 1100, height: 900 });
  const geometry = await page.evaluate(() => {
    const strip = document.querySelector('.review-page-strip'),
      main = document.querySelector('.main-area'),
      home = document.querySelector('.home-page');
    return {
      overflow: strip.scrollWidth > strip.clientWidth,
      home: home.getBoundingClientRect().width,
      main: main.scrollWidth,
      client: main.clientWidth,
    };
  });
  assert(geometry.overflow);
  assert(geometry.home <= 44);
  assert(geometry.main <= geometry.client + 1);
  await page.getByRole('button', { name: '页面管理', exact: true }).click();
  assert.equal(await page.locator('.managed-page').count(), 12);
  await page.screenshot({ path: 'validation-results/study-pages-v065.png' });
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page
    .locator('.managed-page')
    .last()
    .getByRole('button', { name: /关闭页面/ })
    .click();
  await page.waitForFunction(() => document.querySelectorAll('[role=tab]').length === 11);
  cases.push('twelve-pages-adaptive-width-tooltip-management-and-close');
  assert(await page.locator('.page-manager').isVisible());
  await page.locator('.managed-page').first().getByRole('button').first().click();
  await page.locator('.study-main h2').waitFor();
  const active = page.locator('.review-page.active');
  await active.getByRole('button', { name: /关闭页面/ }).click();
  await page.locator('.explorer-list').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('[role=tab]').length === 10);
  await page.reload();
  await home().waitFor();
  assert.equal(await page.locator('[role=tab]').count(), 0);
  await openDeck();
  assert.equal(await page.locator('[role=tab]').count(), 10);
  cases.push('close-active-page-does-not-resurrect-or-delete-other-drafts');
  assert.deepEqual(errors, []);
  mkdirSync('validation-results', { recursive: true });
  const result = {
    version: JSON.parse((await import('node:fs')).readFileSync('package.json', 'utf8')).version,
    platform: process.platform,
    cases,
    errors,
    windowBlur: 'synthetic-event',
    closeConfirmation: 'stubbed',
    windowsExecutionTested: false,
  };
  writeFileSync('validation-results/study-pages.json', JSON.stringify(result, null, 2));
  finishSmoke(result);
  console.log(JSON.stringify(result));
} finally {
  await app?.close();
}
