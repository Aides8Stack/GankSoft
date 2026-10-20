import { startSmoke } from "./validation/smoke-evidence.mjs";
const finishSmoke = startSmoke(import.meta.url);
import { _electron as electron } from "playwright-core";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import {
  openDatabase,
  DEFAULT_QUESTION_DECK as Q,
} from "../electron/infrastructure/database.ts";
import { Application } from "../electron/application.ts";
const require = createRequire(import.meta.url),
  dir = mkdtempSync(join(tmpdir(), "gank066-ui-")),
  errors = [],
  cases = [];
// Isolated historical fixture; no user's data is read or modified.
const db = openDatabase(join(dir, "ganksoft.sqlite"));
let now = new Date();
const model = new Application({ db, dataDir: dir, now: () => new Date(now) });
const other = model.handle("deck.save", { name: "隔离乙集", kind: "question" });
const k = model.handle("knowledge.save", { module: Q, name: "甲集专属知识" }),
  foreign = model.handle("knowledge.save", {
    module: other,
    name: "乙集专属知识",
  });
const save = (deck, title, node) =>
  model.handle("question.save", {
    module: deck,
    title,
    stem: "基础题干 " + title,
    options: "A.一\nB.二\nC.三\nD.四",
    answer: "B",
    knowledge_ids: [node],
  });
const first = save(Q, "练习甲", k),
  second = save(Q, "练习乙", k),
  unified = save(Q, "统一卡片", k),
  foreignCard = save(other, "乙集专属题目", foreign);
const review = (id, n, version = 1) =>
  model.handle("review.submit", {
    request_id: randomUUID(),
    protocol_version: 2,
    question_id: id,
    content_version: version,
    answer: "A",
    thought: "历史思路" + n,
    self_score: 3,
    elapsed_seconds: 10 * n,
    basis: "independent",
    understanding: 3,
    faults: ["计算错误"],
    error_knowledge_ids: [id === foreignCard ? foreign : k],
  });
for (let n = 1; n <= 2; n++) {
  now = new Date(Date.now() - (3 - n) * 86400000);
  review(first, n);
  review(foreignCard, n);
  if (n === 2) {
    const q = model.snapshot().questions.find((q) => q.id === unified);
    model.handle("question.save", { ...q, stem: "唯一的当前题干" });
  }
  review(unified, n, n);
}
db.close();
let app;
try {
  app = await electron.launch({
    executablePath: process.argv[3] ?? require("electron"),
    args: [
      ...(process.platform === "linux"
        ? ["--no-sandbox", "--ozone-platform=headless", "--disable-gpu"]
        : []),
      resolve(process.argv[2] ?? "."),
    ],
    env: { ...process.env, GANKSOFT_E2E: "1", GANKSOFT_DATA_DIR: dir },
  });
  const page = await app.firstWindow();await page.addInitScript(()=>{window.confirm=()=>true});await page.evaluate(()=>{window.confirm=()=>true});
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("heading", { name: "今天，从一次主动回忆开始。" })
    .waitFor();
  assert.equal(await page.locator(".workspace-pages").count(), 0);
  const deck = async (name) => {
    await page.locator(".tree-row").filter({ hasText: name }).click();
    await page.locator(".explorer-list").waitFor();
  };
  const nav = async (name) => {
    await page.locator(".collection-tab").filter({ hasText: name }).click();
  };
  await deck("错题复盘");
  assert.equal(await page.locator(".workspace-pages").count(), 1);
  for (const name of [
    "卡片集情况汇总",
    "分析与漏洞",
    "批量导入与导出",
    "复盘调度设置",
  ]) {
    await nav(name);
    await page.waitForFunction(
      () => !!document.querySelector(".workspace-pages"),
    );
    assert.equal(
      await page.getByRole("button", { name: "页面管理", exact: true }).count(),
      1,
    );
  }
  cases.push("page-bar-keeps-manager-in-all-deck-modules");
  await nav("分析与漏洞");
  await page.getByRole("heading", { name: "知识点覆盖与分析入口" }).waitFor();
  assert.equal(
    await page.getByText("各卡片集学习情况", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("columnheader", { name: "模块", exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByText("乙集专属知识", { exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: /练习甲/ }).waitFor();
  await page.getByRole("button", { name: /练习甲/ }).click();
  await page.getByRole("heading", { name: "题目详情", exact: true }).waitFor();
  assert.equal(await page.locator(".workspace-pages").count(), 1);
  assert.equal(
    await page
      .getByRole("button", { name: "＋ 录入错题", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "移入回收站", exact: true }).count(),
    0,
  );
  await page
    .getByRole("button", { name: "← 返回上一个页面", exact: true })
    .click();
  await page.getByRole("heading", { name: "知识点覆盖与分析入口" }).waitFor();
  cases.push("detail-returns-to-analysis-and-removes-management-actions");
  await deck("隔离乙集");
  await nav("分析与漏洞");
  await page.getByRole("heading", { name: "知识点覆盖与分析入口" }).waitFor();
  await page.getByRole("button", { name: /乙集专属题目/ }).waitFor();
  assert.equal(
    await page.getByText("甲集专属知识", { exact: true }).count(),
    0,
  );
  cases.push("analysis-api-and-ui-deck-isolation");
  await deck("错题复盘");
  await page.getByPlaceholder("搜索标题、正文、来源、知识点").fill("统一卡片");
  await page.getByText("统一卡片", { exact: true }).click();
  await page.getByRole("heading", { name: "题目详情", exact: true }).waitFor();
  await page.getByText("唯一的当前题干", { exact: true }).waitFor();
  assert.equal(await page.locator(".historical-question").count(), 0);
  await page
    .getByRole("button", { name: "查看复盘数据与变化", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "单卡复盘数据与变化" });
  await dialog.locator(".analytics-table tbody tr").first().waitFor();
  assert.equal(await dialog.locator("select").count(), 0);
  assert.equal(await dialog.locator(".analytics-table tbody tr").count(), 2);
  assert(!(await dialog.innerText()).includes("内容版本"));
  await dialog
    .getByRole("button", { name: "查看详情", exact: true })
    .first()
    .click();
  assert.equal(
    await dialog.getByText("当时题目选项", { exact: true }).count(),
    0,
  );
  await dialog
    .getByRole("button", { name: "关闭复盘数据", exact: true })
    .click();
  await page
    .getByRole("button", { name: "← 返回上一个页面", exact: true })
    .click();
  assert.equal(
    await page.getByPlaceholder("搜索标题、正文、来源、知识点").inputValue(),
    "统一卡片",
  );
  cases.push("one-base-card-all-records-no-version-picker-and-list-return");
  await page.getByPlaceholder("搜索标题、正文、来源、知识点").fill("练习");
  await page.getByRole("button", { name: "学习筛选结果", exact: true }).click();
  await page.locator(".study-main h2").waitFor();
  const submit = async (thought) => {
    await page.getByRole("button", { name: "B", exact: true }).click();
    await page
      .getByPlaceholder(
        "写出判断依据、计算过程或卡住的位置。完全不会时也请记录原因。",
      )
      .fill(thought);
    await page
      .getByRole("button", { name: "提交答案和思路，查看解析", exact: true })
      .click();
    await page
      .getByRole("button", { name: "确认并保存本次复盘", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "本次学习已记录", exact: true })
      .waitFor();
  };
  await submit("本轮第一题原稿");
  await page.getByRole("button", { name: "下一张 →", exact: true }).click();
  await submit("本轮第二题原稿");
  const title = await page.locator(".study-main h2").innerText();
  const tab = await page
    .locator(".review-page.active [role=tab]")
    .getAttribute("aria-label");
  await page.getByRole("button", { name: "打开题目详情", exact: true }).click();
  await page.getByRole("heading", { name: "题目详情", exact: true }).waitFor();
  await page
    .getByRole("button", { name: "← 返回上一个页面", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "本次学习已记录", exact: true })
    .waitFor();
  assert.equal(await page.locator(".study-main h2").innerText(), title);
  assert.equal(
    await page
      .locator(".review-page.active [role=tab]")
      .getAttribute("aria-label"),
    tab,
  );
  const returned = await page.evaluate(async () => {
    const c = await window.gank.protocol({
      protocol: { major: 2, minor: 0 },
      requestId: crypto.randomUUID(),
      dataEpoch: null,
      method: "app.capabilities",
      payload: {},
    });
    const r = await window.gank.protocol({
      protocol: { major: 2, minor: 0 },
      requestId: crypto.randomUUID(),
      dataEpoch: c.dataEpoch,
      method: "workspace.read",
      payload: { sections: ["sessions"], deckId: null, offset: 0, limit: 20 },
    });
    return r.data.sessions
      .map((s) => JSON.parse(s.payload))
      .find((s) => s.ids.length === 2);
  });
  assert.equal(returned.index, 1);
  assert.equal(returned.stage, "result");
  assert.equal(returned.thought, "本轮第二题原稿");
  await page.getByRole("button", { name: "恢复总计时", exact: true }).waitFor();
  cases.push(
    "detail-returns-to-exact-review-page-question-result-and-paused-timer",
  );
  const toggle = page.getByRole("button", { name: "页面管理", exact: true });
  await toggle.click();
  await page.locator(".page-manager").waitFor();
  await page
    .getByRole("heading", { name: "错题复盘", level: 1, exact: true })
    .click();
  assert.equal(await page.locator(".page-manager").count(), 0);
  await toggle.click();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".page-manager").count(), 0);
  await toggle.click();
  await nav("卡片集情况汇总");
  assert.equal(await page.locator(".page-manager").count(), 0);
  await nav("所有卡片");
  assert.equal(await page.locator(".page-manager").count(), 0);
  cases.push("page-manager-outside-escape-and-navigation-dismiss");
  await page.locator(".nav-item").filter({ hasText: "学习总览" }).click();
  await page
    .getByRole("heading", { name: "今天，从一次主动回忆开始。" })
    .waitFor();
  await page.locator(".table-scroll table tbody tr").first().waitFor();
  assert.equal(
    await page
      .locator(".table-scroll table")
      .getByRole("button", { name: "隔离乙集", exact: true })
      .count(),
    1,
  );
  assert.equal(
    await page
      .locator(".table-scroll table")
      .getByRole("button", { name: "错题复盘", exact: true })
      .count(),
    1,
  );
  assert.equal(
    await page.locator(".tree-row").filter({ hasText: "隔离乙集" }).count(),
    1,
  );
  assert.equal(await page.locator(".workspace-pages").count(), 0);
  cases.push("overview-keeps-global-summary");
  assert.deepEqual(errors, []);
  const result = {
    version: JSON.parse(readFileSync("package.json", "utf8")).version,
    platform: process.platform,
    cases,
    errors,
    windows10: "not_run",
    windows11: "not_run",
  };
  writeFileSync(
    "validation-results/ui-v066.json",
    JSON.stringify(result, null, 2),
  );
  finishSmoke(result);
  console.log(JSON.stringify(result));
} finally {
  await app?.close();
}
