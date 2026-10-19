import { _electron as electron } from 'playwright-core';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const data = mkdtempSync(join(tmpdir(), 'ganksoft-e2e-'));
const errors = [];
let desktop;
async function launch() {
  const args = [resolve('.')];
  if (process.platform === 'linux')
    args.unshift('--no-sandbox', '--ozone-platform=headless', '--disable-gpu');
  desktop = await electron.launch({
    executablePath: require('electron'),
    args,
    env: { ...process.env, GANKSOFT_E2E: '1', GANKSOFT_DATA_DIR: data },
  });
  const page = await desktop.firstWindow();
  await page.setViewportSize({ width: 1460, height: 960 });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.getByText('把每一次错误，变成下一次进步。').waitFor();
  return page;
}
async function nav(page, text) {
  await page.locator('.nav-item').filter({ hasText: text }).click();
}
try {
  let page = await launch();
  await nav(page, '知识图谱');
  await page.getByRole('button', { name: '＋ 新增知识点', exact: true }).click();
  await page.getByLabel('知识点名称').fill('增长相关');
  await page.getByLabel('所属模块').selectOption('资料分析');
  await page.getByLabel('原理／核心理解').fill('识别现期、基期及增长条件。');
  await page.getByRole('button', { name: '保存知识点', exact: true }).click();
  await page.waitForFunction(
    () => !document.querySelector('.modal') || !!document.querySelector('.banner.error'),
  );
  if (await page.locator('.banner.error').count())
    throw new Error(await page.locator('.banner.error').innerText());
  const parent = await page.evaluate(async () => (await window.gank.call('snapshot')).knowledge[0]);
  assert.equal(parent.name, '增长相关');
  const seeded = await page.evaluate(async (parentId) => {
    const a = await window.gank.call('knowledge.save', {
      name: '基期量计算',
      module: '资料分析',
      parent_id: parentId,
      principle: '基期量 = 现期量 / (1 + 增长率)',
      traps: '区分增长量与增长率。',
    });
    const b = await window.gank.call('knowledge.save', {
      name: '增长率辨析',
      module: '资料分析',
      parent_id: parentId,
    });
    await window.gank.call('relation.save', {
      source_id: a,
      target_id: b,
      kind: '公式关联',
      note: '计算基期量需要识别增长率。',
    });
    const question = await window.gank.call('question.save', {
      title: '基期量练习 · 识别增长条件',
      module: '资料分析',
      stem: '现期量为120，同比增长20%，基期量为多少？',
      options: 'A. 80\nB. 100\nC. 120\nD. 144',
      answer: 'B',
      analysis: '120 ÷ (1+20%) = 100。',
      knowledge_ids: [a, b],
      status: 'ready',
    });
    return { a, b, question };
  }, parent.id);
  const imagePath = join(data, 'test-source.png');
  writeFileSync(
    imagePath,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  await desktop.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
  }, imagePath);
  await page.evaluate((id) => window.gank.importImages(id, 'question'), seeded.question);
  await page.reload();
  await nav(page, '知识图谱');
  await page.locator('.graph-canvas canvas').first().waitFor();
  await page.screenshot({ path: process.env.GANKSOFT_QA_GRAPH || join(data, 'graph.png') });
  await page.getByRole('button', { name: '列表视图', exact: true }).click();
  await page.locator('.knowledge-list .list-row').filter({ hasText: '基期量计算' }).click();
  await page.getByRole('button', { name: '查看知识点复盘分析', exact: true }).click();
  await page.getByText('待验证：暂无有效复盘，不能据此判断掌握情况。').waitFor();
  await nav(page, '错题库');
  await page.getByRole('button', { name: '＋ 录入错题', exact: true }).click();
  await page.getByLabel('题目内容／图片题说明').fill('用于验证录入表单的草稿题。');
  await page.getByRole('button', { name: '保存错题', exact: true }).click();
  await page.locator('.modal').waitFor({ state: 'hidden' });
  await page.locator('.question-card').filter({ hasText: '基期量练习' }).click();
  await page.waitForFunction(() => {
    const image = document.querySelector('.detail-panel img');
    return image && image.complete && image.naturalWidth > 0;
  });
  await page.getByRole('button', { name: '↻ 重做本题', exact: true }).click();
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await page.getByLabel('本次独立思路（选填）').fill('识别增长率，使用基期公式。');
  await page.getByRole('button', { name: '提交答案并查看解析', exact: true }).click();
  await page.getByLabel('看答案前的方法理解').selectOption('3');
  await page.getByRole('button', { name: '保存复盘并安排下次', exact: true }).click();
  await page.getByText('有效复盘已记录', { exact: true }).waitFor();
  let snapshot = await page.evaluate(() => window.gank.call('snapshot'));
  assert.equal(snapshot.attempts.length, 1);
  assert.equal(snapshot.attempts[0].score, 4);
  assert.equal(snapshot.questions.find((q) => q.id === seeded.question).interval_days, 7);
  await nav(page, '分析与漏洞');
  await page.getByText('知识点覆盖与分析入口', { exact: true }).waitFor();
  await nav(page, '设置与数据');
  await page.getByLabel('每日到期任务上限').fill('12');
  await page.getByRole('button', { name: '保存参数', exact: true }).click();
  await page.waitForFunction(
    async () => (await window.gank.call('snapshot')).settings.dailyLimit === 12,
  );
  const backupPath = join(data, 'roundtrip.gankbackup');
  await desktop.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
  }, backupPath);
  const backed = await page.evaluate(() => window.gank.backup());
  assert.equal(backed, backupPath);
  assert.ok(existsSync(backupPath));
  await desktop.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
    dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
  }, backupPath);
  assert.equal(await page.evaluate(() => window.gank.restore()), true);
  await desktop.close();
  page = await launch();
  snapshot = await page.evaluate(() => window.gank.call('snapshot'));
  assert.equal(
    snapshot.questions.some((q) => q.id === seeded.question),
    true,
  );
  assert.equal(snapshot.questions.length, 2);
  assert.equal(snapshot.knowledge.length, 3);
  assert.equal(snapshot.attempts.length, 1);
  assert.equal(snapshot.questions.find((q) => q.id === seeded.question).assets.length, 1);
  assert.equal(snapshot.settings.dailyLimit, 12);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: desktop startup, knowledge form, graph, local insight, question detail, review, scheduling, settings, image protocol, full backup/restore and restart persistence',
  );
} finally {
  await desktop?.close().catch(() => {});
  rmSync(data, { recursive: true, force: true });
}
