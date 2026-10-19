/** v0.7.0 Electron integration checks with isolated synthetic data. */
import { _electron as electron } from "playwright-core";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import {
  openDatabase,
  DEFAULT_QUESTION_DECK as Q,
} from "../electron/infrastructure/database.ts";
import { Application } from "../electron/application.ts";
import { randomUUID } from "node:crypto";
const require = createRequire(import.meta.url),
  dir = mkdtempSync(join(tmpdir(), "gank070-ui-")),
  cases = [],
  errors = [];
cases.push = (...values) => {
  console.log("PASS", ...values);
  return Array.prototype.push.apply(cases, values);
};
const db = openDatabase(join(dir, "ganksoft.sqlite"));
let now = new Date("2026-10-18T08:00:00Z");
const model = new Application({ db, dataDir: dir, now: () => new Date(now) });
const other = model.handle("deck.save", { name: "目标集", kind: "question" });
const parent = model.handle("knowledge.save", {
  module: Q,
  name: "增长问题",
  principle: "独立知识栏",
});
model.handle("knowledge.save", {
  module: Q,
  name: "基期量",
  parent_id: parent,
});
const second = model.handle("knowledge.save", { module: Q, name: "比率" });
const card = model.handle("question.save", {
  module: Q,
  stem: "可读标题测试",
  answer: "B",
  knowledge_ids: [parent],
});
for (const iso of [
  "2026-10-17T15:59:59Z",
  "2026-10-17T16:00:00Z",
  "2026-10-18T15:59:59Z",
  "2026-10-18T16:00:00Z",
]) {
  now = new Date(iso);
  model.handle("review.submit", {
    request_id: randomUUID(),
    protocol_version: 2,
    question_id: card,
    content_version: 1,
    answer: "A",
    thought: "日期边界",
    self_score: 3,
    elapsed_seconds: 5,
    basis: "independent",
    understanding: 3,
  });
}
db.prepare("UPDATE settings SET value=? WHERE key='studyTimezone'").run(
  "Asia/Shanghai",
);
db.close();
let app, page;
async function call(method, payload = {}) {
  return page.evaluate(
    async ({ method, payload }) => {
      const proto = { major: 2, minor: 0 };
      const cap = await window.gank.protocol({
        protocol: proto,
        requestId: crypto.randomUUID(),
        dataEpoch: null,
        method: "app.capabilities",
        payload: {},
      });
      const r = await window.gank.protocol({
        protocol: proto,
        requestId: crypto.randomUUID(),
        dataEpoch: cap.dataEpoch,
        method,
        payload,
      });
      if (!r.ok) throw Error(JSON.stringify(r));
      return r.data;
    },
    { method, payload },
  );
}
async function waitSaved(name, exists = true) {
  await page.waitForFunction(
    async ({ deck, name, exists }) => {
      const protocol = { major: 2, minor: 0 };
      const cap = await window.gank.protocol({
        protocol,
        requestId: crypto.randomUUID(),
        dataEpoch: null,
        method: "app.capabilities",
        payload: {},
      });
      const r = await window.gank.protocol({
        protocol,
        requestId: crypto.randomUUID(),
        dataEpoch: cap.dataEpoch,
        method: "workspace.read",
        payload: { sections: ["knowledge"], deckId: deck },
      });
      return (
        r.ok &&
        r.data.knowledge.some((k) => !k.deletedAt && k.name === name) === exists
      );
    },
    { deck: Q, name, exists },
    { timeout: 10000, polling: 150 },
  );
}
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
  page = await app.firstWindow();await page.addInitScript(()=>{window.confirm=()=>true});await page.evaluate(()=>{window.confirm=()=>true});
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("heading", { name: "今天，从一次主动回忆开始。" })
    .waitFor();
  assert.equal(
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu()),
    null,
  );
  const headerBefore = await page.locator(".topbar").boundingBox();
  await page.locator(".main-area").evaluate((el) => (el.scrollTop = 600));
  const headerAfter = await page.locator(".topbar").boundingBox();
  assert.equal(headerBefore.y, headerAfter.y);
  assert.equal(headerAfter.height, 48);
  assert.equal(
    await page.getByRole("button", { name: "页面管理", exact: true }).count(),
    0,
  );
  cases.push("shared-pinned-48px-header-and-hidden-native-menu");
  await page.locator(".tree-row").filter({ hasText: "错题复盘" }).click();
  assert.equal(
    Math.round((await page.locator(".collection-nav").boundingBox()).width),
    58,
  );
  await page.getByRole("button", { name: "知识图谱", exact: true }).hover();
  assert(
    await page
      .locator(".collection-tab-label")
      .filter({ hasText: "知识图谱" })
      .isVisible(),
  );
  cases.push("58px-icon-navigation-with-full-target-tooltip");
  const nav = async (name) =>
    page.getByRole("button", { name, exact: true }).click();
  await nav("卡片集情况汇总");

  await page.getByLabel("开始日期").fill("2026-10-18");
  await page.getByLabel("结束日期").fill("2026-10-18");
  assert.equal(
    await page.locator(".stat-card").nth(1).locator("strong").innerText(),
    "1",
  );
  assert((await page.locator(".summary-grid").innerText()).includes("2 次"));
  await page.getByLabel("开始日期").fill("2026-10-19");
  await page.getByRole("alert").filter({ hasText: "请选择完整" }).waitFor();
  assert.equal(await page.locator(".stat-card").count(), 0);
  cases.push("custom-range-inclusive-study-timezone-and-invalid-range");
  await page.emulateMedia({ colorScheme: "dark" });
  await nav("知识图谱");
  const canvas = page.locator(".mind-canvas"),
    node = canvas.locator(".me-tpc").filter({ hasText: "增长问题" });
  await node.waitFor();
  await node.click();
  assert.equal(
    await page.getByRole("region", { name: "知识点细节栏" }).count(),
    0,
  );
  assert.equal(
    await canvas
      .locator(".map-container")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--bgcolor").trim(),
      ),
    "#f8faf7",
  );
  await node.dblclick();
  const detail = page.getByRole("region", { name: "知识点细节栏" });
  await detail.waitFor();
  assert.equal(await canvas.locator("#input-box").count(), 0);
  async function noOverlap() {
    const a = await canvas.boundingBox(),
      b = await detail.boundingBox();
    assert(b.x >= a.x && b.x + b.width <= a.x + a.width + 1);
  }
  await noOverlap();
  const resize = page.getByRole("separator", { name: "调整知识栏宽度" }),
    r = await resize.boundingBox();
  const oldWidth = (await detail.boundingBox()).width;
  await page.mouse.move(r.x + r.width / 2, r.y + 40);
  await page.mouse.down();
  await page.mouse.move(r.x + (oldWidth > 360 ? 65 : -65), r.y + 40, {
    steps: 6,
  });
  await page.mouse.up();
  assert(Math.abs((await detail.boundingBox()).width - oldWidth) > 40);
  await noOverlap();
  cases.push(
    "explicit-light-theme-under-dark-preference-doubleclick-floating-resizable-detail",
  );
  await page.getByRole("button", { name: "搜索知识点", exact: true }).click();
  await page.getByLabel("搜索知识点名称").fill("比率");
  await page.getByRole("button", { name: "定位", exact: true }).click();
  assert.equal(await page.locator(".map-search").count(), 0);
  await page.getByRole("button", { name: "搜索知识点", exact: true }).click();
  await page.locator(".mind-save-status").click({ force: true });
  assert.equal(await page.locator(".map-search").count(), 0);
  await page.getByRole("button", { name: "导图结构", exact: true }).click();
  await page.getByRole("button", { name: "向右展开", exact: true }).click();
  assert.equal(await page.locator(".map-structures").count(), 0);
  await page.getByRole("button", { name: "导图结构", exact: true }).click();
  await page.getByRole("button", { name: "左右展开", exact: true }).click();
  cases.push("icon-tools-search-and-structure-popovers-dismiss");
  await page
    .getByRole("button", { name: "展开思维导图工作台", exact: true })
    .click();
  await page.locator(".mind-expanded").waitFor();
  assert.equal(await page.locator(".review-page").count(), 1);
  assert(await page.locator(".topbar").isVisible());
  assert.equal(
    await page
      .locator(".mind-expanded")
      .evaluate((el) => getComputedStyle(el).position),
    "static",
  );
  await page.getByRole("button", { name: "主页面", exact: true }).click();
  await page.getByRole("heading", { name: "知识图谱", exact: true }).waitFor();
  await page.getByRole("tab", { name: "展开导图", exact: true }).click();
  await page.locator(".mind-expanded").waitFor();
  await noOverlap();
  cases.push("map-expanded-page-shares-home-tabs-and-page-manager");
  await node.click();
  await page.getByRole("button", { name: "新增下级", exact: true }).click();
  const input = canvas.locator("#input-box");
  await input.fill("五秒保存节点");
  await input.press("Enter");
  await waitSaved("五秒保存节点");
  await page.getByRole("button", { name: "图谱已保存", exact: true }).waitFor();
  cases.push("five-second-save-persists-new-node");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await page.getByRole("button", { name: "保存图谱修改", exact: true }).click();
  await waitSaved("五秒保存节点", false);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await page.getByRole("button", { name: "保存图谱修改", exact: true }).click();
  await waitSaved("五秒保存节点");
  cases.push("undo-redo-after-autosave-persists-correct-tree");
  await node.click();
  await page.getByRole("button", { name: "新增下级", exact: true }).click();
  await input.fill("快捷保存节点");
  await input.press("Control+s");
  await waitSaved("快捷保存节点");
  cases.push("ctrl-s-commits-active-node-edit");
  await node.click();
  await page.getByRole("button", { name: "新增下级", exact: true }).click();
  await input.fill("离页保存节点");
  await nav("所有卡片");
  await page.locator(".explorer-list").waitFor();
  await waitSaved("离页保存节点");
  await nav("知识图谱");
  await canvas.locator(".me-tpc").filter({ hasText: "离页保存节点" }).waitFor();
  cases.push("leave-map-flushes-active-editor-before-navigation");
  // An optimistic concurrency conflict must keep the map visible and dirty.
  await node.click();
  await page.getByRole("button", { name: "新增下级", exact: true }).click();
  await input.fill("冲突草稿");
  await input.press("Enter");
  const k = (
    await call("workspace.read", { sections: ["knowledge"], deckId: Q })
  ).knowledge.find((k) => k.id === parent);
  await call("knowledge.save", {
    id: k.id,
    expectedRevision: k.version,
    deckId: Q,
    name: k.name,
    principle: "外部变更",
  });
  await nav("所有卡片");
  await page.getByRole("alert").filter({ hasText: "图谱保存失败" }).waitFor();
  assert(await canvas.isVisible());
  assert(
    await canvas.locator(".me-tpc").filter({ hasText: "冲突草稿" }).isVisible(),
  );
  cases.push("conflict-blocks-navigation-and-retains-draft");
  // Reload only after verifying the intentional failure; no user data is involved.
  // Headless Linux has no native dialog surface; exercise both confirmation results explicitly.
  await page.evaluate(() => {
    window.confirm = () => false;
  });
  await page
    .getByRole("button", { name: "重新载入已保存图谱", exact: true })
    .click();
  assert(
    await canvas.locator(".me-tpc").filter({ hasText: "冲突草稿" }).isVisible(),
  );
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page
    .getByRole("button", { name: "重新载入已保存图谱", exact: true })
    .click();
  await page.getByRole("button", { name: "图谱已保存", exact: true }).waitFor();
  await nav("所有卡片");
  await page
    .locator(".card-row")
    .filter({ hasText: "可读标题测试" })
    .getByRole("button", { name: "编辑", exact: true })
    .click();
  await page
    .getByRole("button", { name: "从思维导图选择 / 新增知识点", exact: true })
    .click();
  const picker = page.getByRole("dialog");
  await picker.locator(".map-container").waitFor();
  assert.equal(
    await picker
      .locator(".map-container")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--bgcolor").trim(),
      ),
    "#f8faf7",
  );
  await page
    .getByRole("button", { name: "关闭知识点选择器", exact: true })
    .click();
  cases.push("association-picker-also-uses-light-theme-under-dark-preference");
  await page.getByLabel("所属卡片集").selectOption(other);
  assert.equal(
    await page.locator(".modal-footer .muted").innerText(),
    "0 个知识点已关联",
  );
  await page.getByRole("button", { name: "保存错题", exact: true }).click();
  await page.locator(".modal").waitFor({ state: "hidden" });
  const moved = await call("workspace.read", {
    sections: ["content", "history", "knowledge"],
  });
  assert.equal(moved.questions.find((q) => q.id === card).module, other);
  assert.deepEqual(moved.questions.find((q) => q.id === card).knowledgeIds, []);
  assert.equal(moved.attempts.length, 4);
  cases.push("move-card-ui-clears-old-knowledge-links-and-preserves-history");
  await nav("知识图谱");
  await node.waitFor();
  await node.dblclick();
  await detail.waitFor();
  assert.equal(
    await detail.getByText("暂无关联卡片", { exact: true }).count(),
    1,
  );
  await page
    .getByRole("button", { name: "展开思维导图工作台", exact: true })
    .click();
  await page.setViewportSize({ width: 1100, height: 768 });
  await noOverlap();
  await page.screenshot({ path: "/tmp/gank070-map.png" });
  await page.setViewportSize({ width: 740, height: 768 });
  await noOverlap();
  assert((await canvas.boundingBox()).height >= 180);
  cases.push("responsive-map-and-floating-details");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await node.click();
  await page.getByRole("button", { name: "新增下级", exact: true }).click();
  await input.fill("关闭窗口保存节点");
  const closed = app.waitForEvent("close", { timeout: 15000 });
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].close(),
  );
  await closed;
  app = undefined;
  const reopened = openDatabase(join(dir, "ganksoft.sqlite"));
  assert(
    reopened
      .prepare("SELECT id FROM knowledge WHERE name=? AND deleted_at IS NULL")
      .get("关闭窗口保存节点"),
  );
  reopened.close();
  cases.push("normal-window-close-flushes-active-node-edit");
  assert.deepEqual(errors, []);
  mkdirSync("validation-results", { recursive: true });
  const result = {
    version: JSON.parse(readFileSync("package.json", "utf8")).version,
    platform: process.platform,
    cases,
    errors,
    windows10: "not_run",
    windows11: "not_run",
  };
  writeFileSync(
    "validation-results/ui-v070.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} catch (e) {
  console.error("ORIGINAL FAILURE", e);
  if (page && !page.isClosed()) {
    console.error((await page.locator("body").innerText()).slice(-3500));
    await page.screenshot({ path: "/tmp/gank070-failure.png" });
  }
  throw e;
} finally {
  if (app) await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
}
