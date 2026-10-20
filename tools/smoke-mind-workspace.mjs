import { startSmoke } from "./validation/smoke-evidence.mjs";
const finishSmoke = startSmoke(import.meta.url);
import { _electron as electron } from "playwright-core";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  dir = mkdtempSync(join(tmpdir(), "gank063-map-"));
let app;
const errors = [],
  cases = [];
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
  page.setDefaultTimeout(12000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page
    .getByRole("heading", { name: "今天，从一次主动回忆开始。" })
    .waitFor();
  async function call(method, payload = {}) {
    return page.evaluate(
      async ({ method, payload }) => {
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
          method,
          payload,
        });
        if (!r.ok) throw Error(JSON.stringify(r));
        return r.data;
      },
      { method, payload },
    );
  }
  const deck = (
    await call("workspace.read", { sections: ["catalog"] })
  ).decks.find((d) => d.kind === "question").id;
  const parent = await call("knowledge.save", {
    deckId: deck,
    name: "增长问题",
    principle: "知识栏验收",
  });
  await call("knowledge.save", {
    deckId: deck,
    parentId: parent,
    name: "基期量",
  });
  const other = await call("knowledge.save", { deckId: deck, name: "比率" });
  await page.reload();
  await page
    .getByRole("heading", { name: "今天，从一次主动回忆开始。" })
    .waitFor();
  await page.locator(".tree-row").filter({ hasText: "错题复盘" }).click();
  await page.getByRole("button", { name: "知识图谱", exact: false }).click();
  const canvas = page.locator(".mind-canvas"),
    node = canvas.locator(".me-tpc").filter({ hasText: "增长问题" });
  await node.waitFor();
  await node.dblclick();
  const detail = page.getByRole("region", { name: "知识点细节栏" });
  // section with accessible name is a region.
  await detail.waitFor();
  async function noOverlap() {
    const a = await canvas.boundingBox(),
      b = await detail.boundingBox();
    assert(a && b);
    assert(
      b.x >= a.x && b.x + b.width <= a.x + a.width + 1,
      "knowledge panel floats within canvas",
    );
  }
  await noOverlap();
  cases.push("detail-floats-within-canvas-without-resizing");
  async function pan() {
    const area = await canvas.boundingBox(),
      before = await node.boundingBox();
    const x = area.x + area.width / 2,
      y = area.y + area.height - 45;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 65, y - 35, { steps: 8 });
    await page.mouse.up();
    const after = await node.boundingBox();
    assert(
      Math.abs(after.x - before.x - 65) < 3,
      "left drag moves map horizontally",
    );
    assert(
      Math.abs(after.y - before.y + 35) < 3,
      "left drag moves map vertically",
    );
    assert.equal(
      await canvas.evaluate((el) => el.classList.contains("is-panning")),
      false,
    );
  }
  await pan();
  assert(
    await page
      .getByRole("button", { name: "图谱已保存", exact: true })
      .isDisabled(),
  );
  cases.push("left-background-drag-does-not-dirty-tree");
  const cancelArea = await canvas.boundingBox();
  await page.mouse.move(
    cancelArea.x + 200,
    cancelArea.y + cancelArea.height - 100,
  );
  await page.mouse.down();
  await page.mouse.move(
    cancelArea.x + 220,
    cancelArea.y + cancelArea.height - 110,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.equal(
    await canvas.evaluate((el) => el.classList.contains("is-panning")),
    false,
  );
  await page.mouse.up();
  cases.push("window-blur-releases-pan-capture");
  await page.getByRole("button", { name: "关闭知识栏", exact: true }).click();
  await detail.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "打开知识栏", exact: true }).click();
  await detail.waitFor();
  await page
    .getByRole("button", { name: "展开思维导图工作台", exact: true })
    .click();
  await page.locator(".mind-expanded").waitFor();
  assert.equal(
    await page
      .locator(".mind-expanded")
      .evaluate((el) => getComputedStyle(el).position),
    "static",
  );
  assert(await page.locator(".topbar").isVisible());
  await noOverlap();
  await pan();
  await page.getByRole("button", { name: "关闭知识栏", exact: true }).click();
  await page.getByRole("button", { name: "打开知识栏", exact: true }).click();
  await detail.waitFor();
  await page
    .getByRole("button", { name: "编辑知识点详情", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "编辑知识点", exact: true })
    .waitFor();
  await page
    .locator(".modal")
    .getByRole("button", { name: "×", exact: true })
    .click();
  assert(await page.locator(".mind-expanded").isVisible());
  cases.push("expanded-workspace-with-details-and-editor");
  // Page switches flush the same editor before leaving the expanded page.
  await page.getByRole("button", { name: "新增下级", exact: true }).click();
  const input = canvas.locator("#input-box");
  await input.waitFor();
  await input.fill("新工作台节点");
  await input.press("Enter");
  await page
    .getByRole("button", { name: "保存图谱修改", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "主页面", exact: true }).click();
  assert.equal(await page.locator(".mind-expanded").count(), 0);
  await canvas.locator(".me-tpc").filter({ hasText: "新工作台节点" }).waitFor();
  await page
    .getByRole("button", { name: "展开思维导图工作台", exact: true })
    .click();
  await page
    .getByRole("button", { name: "主页面", exact: true })
    .press("Escape");
  assert.equal(await page.locator(".mind-expanded").count(), 0);
  await canvas.locator(".me-tpc").filter({ hasText: "新工作台节点" }).waitFor();
  await page.getByRole("button", { name: "图谱已保存", exact: true }).waitFor();
  const saved = (
    await call("workspace.read", { sections: ["knowledge"], deckId: deck })
  ).knowledge.find((n) => n.name === "新工作台节点");
  assert.equal(saved.parentId, parent);
  cases.push("draft-and-hierarchy-survive-expand-return-escape-and-save");
  // Node drag remains MindElixir's original reparent gesture.
  await page
    .getByRole("button", { name: "展开思维导图工作台", exact: true })
    .click();
  await page.getByRole("button", { name: "适应窗口", exact: true }).click();
  await page.getByRole("button", { name: "关闭知识栏", exact: true }).click();
  const childNode = canvas.locator(".me-tpc").filter({ hasText: "基期量" }),
    otherNode = canvas.locator(".me-tpc").filter({ hasText: "比率" });
  await childNode.hover();
  await otherNode.hover();
  const from = await childNode.boundingBox(),
    to = await otherNode.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    from.x + from.width / 2 + 12,
    from.y + from.height / 2 + 12,
    { steps: 4 },
  );
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 20,
  });
  await page.mouse.up();
  await page.getByRole("button", { name: "保存图谱修改", exact: true }).click();
  await page.getByRole("button", { name: "图谱已保存", exact: true }).waitFor();
  assert.equal(
    (
      await call("workspace.read", { sections: ["knowledge"], deckId: deck })
    ).knowledge.find((n) => n.name === "基期量").parentId,
    other,
  );
  cases.push("node-drag-reparents-and-persists");
  await page.getByRole("button", { name: "主页面", exact: true }).click();
  await page.setViewportSize({ width: 1100, height: 768 });
  await node.dblclick();
  await detail.waitFor();
  await noOverlap();
  await page
    .getByRole("button", { name: "展开思维导图工作台", exact: true })
    .click();
  await page.setViewportSize({ width: 740, height: 768 });
  await noOverlap();
  const box = await canvas.boundingBox();
  assert(box.height >= 180);
  const db = await detail.boundingBox();
  assert(db.height <= box.height, "floating panel stays within map height");
  cases.push("narrow-window-retains-map-and-bounds-floating-detail");
  await page.getByRole("button", { name: "主页面", exact: true }).click();
  assert.deepEqual(errors, []);
  mkdirSync("validation-results", { recursive: true });
  const result = {
    version: JSON.parse(readFileSync("package.json", "utf8")).version,
    platform: process.platform,
    cases,
    errors,
  };
  writeFileSync(
    "validation-results/mind-workspace.json",
    JSON.stringify(result, null, 2),
  );
  finishSmoke(result);
  console.log(JSON.stringify(result));
} catch (e) {
  console.error(e);
  if (app) {
    const p = await app.firstWindow();
    console.error((await p.locator("body").innerText()).slice(-4000));
    await p.screenshot({ path: "/tmp/gank063-failure.png" });
  }
  throw e;
} finally {
  if (app) await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
}
