import { _electron as electron } from 'playwright-core';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, cpus, totalmem, platform, release } from 'node:os';
import { resolve, join } from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import { performance } from 'node:perf_hooks';
const require = createRequire(import.meta.url);
const [baseline, candidate, seedPath] = process.argv.slice(2);
if (!seedPath)
  throw new Error('Usage: node tools/validation/performance.mjs BASELINE CANDIDATE SEED_SQLITE');
const samples = [];
for (let iteration = 0; iteration < 5; iteration++) {
  for (const project of [baseline, candidate]) {
    const dir = mkdtempSync(join(tmpdir(), 'gank-v050-bench-'));
    const db = new DatabaseSync(resolve(seedPath));
    await backup(db, join(dir, 'ganksoft.sqlite'));
    db.close();
    let app;
    try {
      const start = performance.now();
      app = await electron.launch({
        executablePath: require('electron'),
        args: ['--no-sandbox', '--ozone-platform=headless', '--disable-gpu', resolve(project)],
        env: { ...process.env, GANKSOFT_E2E: '1', GANKSOFT_DATA_DIR: dir },
      });
      const page = await app.firstWindow();
      await page.setViewportSize({ width: 1500, height: 1000 });
      await page.getByRole('heading', { name: '今天，从一次主动回忆开始。' }).waitFor();
      const startupMs = performance.now() - start,
        t = performance.now();
      await page.locator('.tree-row').filter({ hasText: '错题复盘' }).click();
      await page.locator('.card-row').first().waitFor();
      const listMs = performance.now() - t,
        renderedRows = await page.locator('.card-row').count();
      const version = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8')).version;
      const snap = await page.evaluate(() => window.gank.call('snapshot'));
      if (version === '0.5.0') {
        await page.getByRole('button', { name: '下一页', exact: true }).click();
        if ((await page.locator('.card-row').count()) !== 50)
          throw new Error('page count mismatch');
        await page.getByRole('button', { name: '全选结果', exact: true }).click();
        await page.getByText('符合条件 1000 张 · 已选 1000 张', { exact: true }).waitFor();
      }
      const row = {
        iteration,
        version,
        cards: snap.questions.length,
        attempts: snap.attempts.length,
        startupMs,
        listMs,
        renderedRows,
      };
      samples.push(row);
      console.log(JSON.stringify(row));
    } finally {
      if (app) {
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows().forEach((w) => w.destroy()),
        );
        await app.close();
      }
      rmSync(dir, { recursive: true, force: true });
    }
  }
}
const summary = {};
for (const version of [...new Set(samples.map((s) => s.version))]) {
  const group = samples.filter((s) => s.version === version);
  summary[version] = {};
  for (const metric of ['startupMs', 'listMs']) {
    const values = group.map((s) => s[metric]).sort((a, b) => a - b);
    summary[version][metric] = {
      median: values[2],
      min: values[0],
      max: values[4],
      p95: values[4],
      samples: values,
    };
  }
}
const out = {
  environment: {
    platform: platform(),
    release: release(),
    cpu: cpus()[0].model,
    logicalCpus: cpus().length,
    memoryBytes: totalmem(),
    node: process.version,
    electron: JSON.parse(readFileSync(require.resolve('electron/package.json'), 'utf8')).version,
    viewport: '1500x1000',
    cache: 'fresh process each sample, shared OS filesystem cache; alternated baseline/candidate',
    distribution: '1000 cards,10007 attempts; balanced 10-11 attempts/card; independent DB copies',
  },
  samples,
  summary,
};
writeFileSync('validation-results/performance.json', JSON.stringify(out, null, 2));
