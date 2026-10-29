import { startSmoke } from "./validation/smoke-evidence.mjs";
const finishSmoke = startSmoke(import.meta.url);
import { _electron as electron } from "playwright-core";
import { createRequire } from "node:module";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  openDatabase,
  DEFAULT_QUESTION_DECK as Q,
} from "../electron/infrastructure/database.ts";
import { Application } from "../electron/application.ts";
import { appendMessage } from "../electron/modules/workspace.ts";
import { readContentPackage } from "../electron/modules/imports/container.ts";
const require = createRequire(import.meta.url),
  dir = mkdtempSync(join(tmpdir(), "gank071-ui-")),
  cases = [],
  errors = [];
function passed(name) {
  cases.push(name);
  console.log("PASS", name);
}
const db = openDatabase(join(dir, "ganksoft.sqlite"));
let now = new Date();
const model = new Application({ db, dataDir: dir, now: () => new Date(now) });
db.prepare("UPDATE settings SET value=? WHERE key='studyTimezone'").run(
  "Asia/Shanghai",
);
const folder = model.handle("folder.save", { name: "导入目标" });
const root = model.handle("knowledge.save", {
  module: Q,
  name: "增长问题",
  principle: "原理内容",
});
model.handle("knowledge.save", { module: Q, name: "基期量", parent_id: root });
const card = model.handle("question.save", {
  module: Q,
  title: "测试甲",
  stem: "题目甲",
  answer: "B",
  knowledge_ids: [root],
});
model.handle("question.save", {
  module: Q,
  title: "测试乙",
  stem: "题目乙",
  answer: "B",
});
now = new Date(Date.now() - 86400000);
model.handle("review.submit", {
  request_id: randomUUID(),
  protocol_version: 2,
  question_id: card,
  content_version: 1,
  answer: "A",
  thought: "边界思路",
  self_score: 3,
  elapsed_seconds: 20,
  basis: "independent",
  understanding: 3,
});
// Message history has explicit synthetic fixtures; it must not depend on
// notices produced by the retired AI configuration form.
appendMessage(model.ctx, { kind: "success", text: "合成操作已保存" });
appendMessage(model.ctx, { kind: "error", text: "合成错误待核对" });
db.close();
let app, page;
async function call(method, payload = {}) {
  return page.evaluate(
    async ({ method, payload }) => {
      const protocol = { major: 2, minor: 0 };
      const cap = await window.gank.protocol({
        protocol,
        requestId: crypto.randomUUID(),
        dataEpoch: null,
        method: "app.capabilities",
        payload: {},
      });
      const result = await window.gank.protocol({
        protocol,
        requestId: crypto.randomUUID(),
        dataEpoch: cap.dataEpoch,
        method,
        payload,
      });
      if (!result.ok) throw Error(JSON.stringify(result));
      return result.data;
    },
    { method, payload },
  );
}
async function saveTo(path) {
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
  }, path);
}
async function openFrom(path) {
  await app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [path],
    });
  }, path);
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
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page
    .getByRole("heading", { name: "今天，从一次主动回忆开始。" })
    .waitFor();
  const capabilities = await call("app.capabilities");
  assert(!capabilities.definedMethods.includes("knowledge.archive.publish"));
  assert.equal(
    await page.getByRole("button", { name: "页面管理", exact: true }).count(),
    0,
  );
  assert.equal(await page.getByText("● 本地保存", { exact: true }).count(), 0);
  assert.equal(
    await page.getByRole("button", { name: "消息中心", exact: true }).count(),
    1,
  );
  assert.match(await page.locator(".sidebar-bottom .nav-item").last().innerText(), /设置/);
  passed("overview-message-only-and-settings-bottom");
  const settings = page.locator(".settings-bottom");
  await settings.click();
  await page.locator(".settings-index").waitFor();
  assert(await page.locator(".settings-index .list-row").count()>0);
  assert.equal(
    await page.locator(".sidebar").getByText("回收站", { exact: true }).count(),
    0,
  );
  const setting = async (title) => {
    await page.getByRole("button", { name: "主页面", exact: true }).click();
    await page
      .locator(".settings-index .list-row")
      .filter({ hasText: title })
      .click();
  };
  await page
    .locator(".settings-index .list-row")
    .filter({ hasText: "外观与主题" })
    .click();
  await page.getByRole("button", { name: "深色", exact: true }).click();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  await page.screenshot({ path: "/tmp/gank071-dark.png" });
  assert.equal((await call("preferences.get")).theme, "dark");
  assert.equal(
    await app.evaluate(({ nativeTheme }) => nativeTheme.themeSource),
    "dark",
  );
  await page.getByRole("button", { name: "跟随系统", exact: true }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  await page.getByRole("button", { name: "浅色", exact: true }).click();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  passed("settings-subpages-immediate-light-dark-system-theme");
  await setting("外部 AI 协作");
  await page.getByRole("heading", { name: "外部 AI 协作", exact: true, level: 2 }).waitFor();
  assert.equal(await page.locator(".external-ai-panel input").count(), 0);
  assert.match(await page.locator(".external-ai-panel").innerText(), /默认均不勾选/);
  assert.match(await page.locator(".external-ai-panel").innerText(), /预览并确认/);
  await assert.rejects(
    () => call("ai.config.save", { endpoint: "http://127.0.0.1:9999/v1/chat/completions", model: "合成模型" }),
    /AI_EXTERNAL_ONLY/,
  );
  await assert.rejects(() => call("ai.analyze", { id: card }), /AI_EXTERNAL_ONLY/);
  assert.equal(existsSync(join(dir, "test-ai-connection.json")), false);
  assert.equal((await call("maintenance.operations")).length, 0);
  await page.getByRole("tab", { name: "外观与主题", exact: true }).click();
  await page.getByRole("button", { name: "浅色", exact: true }).waitFor();
  passed("external-ai-guidance-no-credentials-retired-commands-reject-and-navigation-works");
  await setting("回收站");
  await page.locator(".trash-filters").waitFor();
  await page
    .getByRole("button", { name: "关闭页面 回收站", exact: true })
    .click();
  await page.locator(".settings-index").waitFor();
  passed("trash-is-settings-child-and-closes-through-common-page-bar");
  await page.getByRole("button", { name: "消息中心", exact: true }).click();
  await page.getByRole("heading", { name: "消息中心", exact: true }).waitFor();
  await page.locator(".message-row").first().waitFor();
  const messageCount = await page.locator(".message-row").count();
  assert(messageCount >= 2);
  await page.getByRole("button", { name: "全部标为已读", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector(".message-count"));
  assert((await call("messages.list")).every((m) => m.read));
  await page.getByRole("button", { name: "返回当前页面", exact: true }).click();
  await page.locator(".settings-index").waitFor();
  await page.reload();
  await page
    .getByRole("heading", { name: "今天，从一次主动回忆开始。" })
    .waitFor();
  assert((await call("messages.list")).length >= messageCount);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  passed("message-history-read-status-and-theme-survive-reload");
  const deck = async () => {
    await page.locator(".tree-row").filter({ hasText: "错题复盘" }).click();
    await page.locator(".explorer-list").waitFor();
  };
  const nav = async (name) =>
    page.locator(".collection-tab").filter({ hasText: name }).click();
  await deck();
  const header = await page.locator(".topbar").boundingBox(),
    rail = await page.locator(".collection-nav").boundingBox();
  assert(rail.y >= header.y + header.height - 1);
  for (const name of [
    "卡片集情况汇总",
    "分析与漏洞",
    "批量导入与导出",
    "复盘调度设置",
  ]) {
    await nav(name);
    assert.equal(
      await page.getByRole("button", { name: "页面管理", exact: true }).count(),
      1,
    );
  }
  await page.locator(".main-area").evaluate((el) => (el.scrollTop = 500));
  assert.equal((await page.locator(".topbar").boundingBox()).y, header.y);
  passed("global-header-above-rail-and-manager-on-every-deck-module");
  await nav("卡片集情况汇总");
  await page.locator(".stat-card").first().waitFor();
  await page.getByRole("button", { name: "全部历史", exact: true }).click();
  await page
    .locator(".stat-card")
    .nth(1)
    .locator("strong")
    .filter({ hasText: "1" })
    .waitFor();
  const total = await page
    .locator(".stat-card")
    .nth(1)
    .locator("strong")
    .innerText();
  await nav("分析与漏洞");
  await page.getByRole("button", { name: "全部历史", exact: true }).click();
  await page.locator(".stat-card").first().locator("strong").waitFor();
  assert.equal(
    (
      await page.locator(".stat-card").first().locator("strong").innerText()
    ).replace("次", ""),
    total,
  );
  assert.equal(await page.locator(".shared-date-range").count(), 1);
  await page.getByLabel("开始日期").fill("2026-10-19");
  await page.getByLabel("结束日期").fill("2026-10-18");
  await page.getByRole("alert").first().waitFor();
  assert.equal(await page.locator(".stat-card").count(), 0);
  passed("shared-date-component-and-server-statistics-match-between-views");
  await nav("知识图谱");
  const canvas = page.locator(".mind-canvas"),
    node = canvas.locator(".me-tpc").filter({ hasText: "增长问题" });
  await node.waitFor();
  const before = await canvas.boundingBox(),
    nodeBefore = await node.boundingBox();
  await node.dblclick();
  const detail = page.getByRole("region", { name: "知识点细节栏" });
  await detail.waitFor();
  const after = await canvas.boundingBox(),
    nodeAfter = await node.boundingBox();
  assert.equal(after.width, before.width);
  assert.equal(after.height, before.height);
  assert(
    Math.abs(nodeAfter.x - nodeBefore.x) < 2 &&
      Math.abs(nodeAfter.y - nodeBefore.y) < 2,
  );
  assert.equal(
    await page.getByText("知识点关系与版本存档", { exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "切换大纲模式", exact: true }).click();
  await page.getByLabel("知识点大纲").waitFor();
  assert((await page.getByLabel("知识点大纲").innerText()).includes("基期量"));
  await page.getByRole("button", { name: "切换思维导图", exact: true }).click();
  await node.waitFor({ state: "visible" });
  passed(
    "floating-detail-does-not-resize-or-reposition-canvas-and-outline-shares-tree",
  );
  await page.getByRole("button", { name: "关闭知识栏", exact: true }).click();
  await page
    .getByRole("button", { name: "展开思维导图工作台", exact: true })
    .click();
  await page.locator(".mind-expanded").waitFor();
  const mapBox = await canvas.boundingBox(), viewport = page.viewportSize();
  assert(Math.abs(mapBox.x) < 1);
  assert(Math.abs(mapBox.width - viewport.width) < 3);
  assert(Math.abs(mapBox.y + mapBox.height - viewport.height) < 3);
  assert.equal(
    await page.locator(".mind-expanded > .page-heading").isVisible(),
    false,
  );
  await page.screenshot({ path: "/tmp/gank071-map.png" });
  await node.click();
  await page.getByRole("button", { name: "新增下级", exact: true }).click();
  const input = canvas.locator("#input-box");
  await input.fill("新版导图节点");
  await input.press("Control+s");
  await page.getByRole("button", { name: "图谱已保存", exact: true }).waitFor();
  await page.getByRole("button", { name: "切换大纲模式", exact: true }).click();
  await page
    .getByLabel("知识点大纲")
    .getByRole("button", { name: "新版导图节点", exact: true })
    .waitFor();
  await page.getByRole("button", {name:"返回知识图谱",exact:true}).click();
  await nav("所有卡片");
  assert(
    (
      await call("workspace.read", { sections: ["knowledge"], deckId: Q })
    ).knowledge.some((k) => k.name === "新版导图节点"),
  );
  passed("expanded-map-fills-content-and-outline-preserves-shortcut-save");
  await page
    .getByRole("button", { name: "管理卡片集 错题复盘", exact: true })
    .click();
  const editor = page.getByRole("dialog", { name: "卡片集管理" });
  await editor.waitFor();
  assert.equal(
    await editor
      .getByRole("button", { name: "导出卡片集…", exact: true })
      .count(),
    1,
  );
  assert.equal(
    await editor
      .getByRole("button", { name: "删除卡片集", exact: true })
      .count(),
    1,
  );
  assert.equal(await editor.getByLabel("移动到文件夹").count(), 1);
  await editor.getByLabel("位置顺序（数字越小越靠前）").fill("4");
  await editor.getByRole("button", { name: "保存", exact: true }).click();
  assert.equal(
    (await call("workspace.read", { sections: ["catalog"] })).decks.find(
      (d) => d.id === Q,
    ).sortOrder,
    4,
  );
  passed("deck-more-opens-rename-move-sort-export-delete-editor");
  const exported = join(dir, "选择路径", "cards.gank.zip");
  mkdirSync(join(dir, "选择路径"));
  await saveTo(exported);
  await page
    .locator(".card-row")
    .filter({ hasText: "测试甲" })
    .getByRole("checkbox")
    .check();
  await page
    .getByRole("button", { name: "导出所选卡片…", exact: true })
    .click();
  await page.waitForFunction(() => !!document.querySelector(".notice-toast"));
  for (let n = 0; n < 50 && !existsSync(exported); n++)
    await new Promise((r) => setTimeout(r, 50));
  const pkg = await readContentPackage(exported);
  assert.equal(pkg.items.length, 1);
  assert.equal(pkg.items[0].title, "测试甲");
  assert.equal(pkg.collection.kind, "question");
  passed("selected-card-export-uses-save-dialog-path-and-valid-zip");
  await page
    .getByRole("button", { name: "新建文件夹或卡片集", exact: true })
    .click();
  for (const name of [
    "新建错题卡片集",
    "新建记忆卡片集",
    "导入卡片集",
    "新建文件夹",
  ])
    assert.equal(
      await page
        .locator(".catalog-menu")
        .getByRole("button", { name: new RegExp(name) })
        .count(),
      1,
    );
  await page.getByRole("button", { name: "导入卡片集", exact: true }).click();
  await openFrom(exported);
  const importer = page.getByRole("dialog", { name: "导入卡片集" });
  await importer
    .getByRole("button", { name: "选择卡片集 ZIP", exact: true })
    .click();
  await importer.getByLabel("卡片集名称").fill("导入验证集");
  await importer.getByLabel("导入位置").selectOption(folder);
  await importer.getByRole("button", { name: "确认导入", exact: true }).click();
  await page.locator(".tree-row").filter({ hasText: "导入验证集" }).waitFor();
  const catalog = await call("workspace.read", { sections: ["catalog"] }),
    imported = catalog.decks.find((d) => d.name === "导入验证集");
  assert.equal(imported.folderId, folder);
  assert.equal(
    (
      await call("workspace.read", {
        sections: ["content"],
        deckId: imported.id,
      })
    ).questions.length,
    1,
  );
  passed("library-menu-four-actions-and-zip-import-to-chosen-folder");
  await page
    .getByRole("button", { name: "新建文件夹或卡片集", exact: true })
    .click();
  await page.getByRole("button", { name: "导入卡片集", exact: true }).click();
  const beforeCancel = (await call("workspace.read", { sections: ["catalog"] }))
    .decks.length;
  await page.locator(".modal-backdrop").click({ position: { x: 2, y: 2 } });
  assert.equal(
    (await call("workspace.read", { sections: ["catalog"] })).decks.length,
    beforeCancel,
  );
  passed("collection-import-can-close-without-creating-deck");
  await settings.click();
  await page.locator(".settings-index").waitFor();
  await setting("外观与主题");
  await page.getByRole("button", { name: "深色", exact: true }).click();
  const closed = app.waitForEvent("close", { timeout: 15000 });
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].close(),
  );
  await closed;
  app = undefined;
  const savedDb = openDatabase(join(dir, "ganksoft.sqlite"));
  try {
    assert.equal(JSON.parse(savedDb.prepare("SELECT value FROM settings WHERE key='ui-preferences'").get().value).theme, "dark");
  } finally {
    savedDb.close();
  }
  assert.equal(existsSync(join(dir, "test-ai-connection.json")), false);
  passed("settings-theme-persisted-on-normal-window-close-without-ai-credentials");
  assert.deepEqual(errors, []);
  mkdirSync("validation-results", { recursive: true });
  const result = {
    version: JSON.parse(readFileSync("package.json","utf8")).version,
    platform: process.platform,
    cases,
    errors,
    dialogs: "stubbed-save-open; external AI guidance and retired commands rejected without saved credentials",
    windows10: "not_run",
    windows11: "not_run",
  };
  writeFileSync(
    "validation-results/ui-v071.json",
    JSON.stringify(result, null, 2),
  );
  finishSmoke(result);
  console.log(JSON.stringify(result));
} catch (e) {
  console.error("FAILURE", e);
  if (page && !page.isClosed()) {
    console.error((await page.locator("body").innerText()).slice(-4000));
    await page.screenshot({ path: "/tmp/gank071-failure.png" });
  }
  throw e;
} finally {
  if (app) await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
}
