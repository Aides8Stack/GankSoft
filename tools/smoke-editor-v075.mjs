import { _electron as electron } from "playwright-core";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import { Transformer } from "@napi-rs/image";
const require = createRequire(import.meta.url),
  dir = mkdtempSync(join(tmpdir(), "gank-s2-"));
const results = [],
  errors = [],
  external = [];
let app,
  page,
  phase = "boot";
const image = Transformer.fromRgbaPixels(Buffer.from([0, 0, 0, 255]), 1, 1)
  .pngSync()
  .toString("base64");
async function launch() {
  app = await electron.launch({
    executablePath: require("electron"),
    args: [
      ...(process.platform === "linux"
        ? ["--no-sandbox", "--ozone-platform=headless", "--disable-gpu"]
        : []),
      resolve("."),
    ],
    env: { ...process.env, GANKSOFT_E2E: "1", GANKSOFT_DATA_DIR: dir },
  });
  page = await app.firstWindow();
  await page
    .getByRole("heading", { name: "今天，从一次主动回忆开始。" })
    .waitFor();
  page.on("pageerror", (e) => {
    errors.push({ phase, error: e.stack ?? e.message });
    console.error("PAGEERROR", e.stack);
  });
  await page.route(/^https?:/, (route) => {
    external.push(route.request().url());
    return route.abort();
  });
  await page.goto(
    "gank-app://ui/assets/editor-spike/tools/editor-spike/index.html",
  );
  await page.getByRole("button", { name: "开始隔离验证" }).click();
  await page.locator(".ProseMirror").first().waitFor();
  await page.waitForFunction(() => !!window.editorSpike?.handle);
}
const get = () => page.evaluate(() => window.editorSpike.handle.snapshot());
try {
  await launch();
  await page.locator('span[data-gank-color="#b91c1c"]').waitFor();
  assert.equal(await page.locator(".ProseMirror table.children").count(), 1);
  assert.equal(await page.locator(".ProseMirror table.children tr").count(), 2);
  assert.equal(await page.locator(".ProseMirror li").count(), 2);
  assert.ok((await page.locator(".katex").count()) >= 1);
  const initialHeight = await page
    .locator(".editor-body")
    .evaluate((e) => e.getBoundingClientRect().height);
  let initial = await get();
  assert.match(initial.markdown, /\$x\^2\+1\$/);
  assert.match(initial.markdown, /\$\$[\s\S]*\\frac\{a\}\{b\}/);
  assert.match(initial.markdown, /data-gank-color/);
  phase = "inline-math-edit";
  await page.locator('[data-type="math_inline"]').first().click();
  await page.locator(".milkdown-latex-inline-edit .ProseMirror").fill("y^3+2");
  await page.locator(".milkdown-latex-inline-edit .ProseMirror").press("Enter");
  assert.match((await get()).markdown, /\$y\^3\+2\$/);
  phase = "block-math-edit";
  await page.locator(".cm-content").first().fill("\\frac{c}{d}");
  await page.locator(".ProseMirror h1").click();
  await page.waitForFunction(() =>
    window.editorSpike.handle.snapshot().markdown.includes("\\frac{c}{d}"),
  );
  phase = "color-edit";
  await page.evaluate(() => {
    const h = window.editorSpike.handle;
    h.select(1, 3);
    h.setColor("#15803d");
  });
  assert.match((await get()).markdown, /data-gank-color="#15803d"/);
  await page.locator(".ProseMirror h1").click();
  assert.equal(
    await page
      .locator(".editor-focus-toolbar")
      .evaluate((e) => getComputedStyle(e).opacity),
    "1",
  );
  await page
    .getByRole("heading", { name: "MarkdownEditor + Media 独立验证" })
    .click();
  assert.equal(
    await page
      .locator(".editor-focus-toolbar")
      .evaluate((e) => getComputedStyle(e).opacity),
    "0",
  );
  const native = await page.evaluate(() =>
    window.editorSpike.nativeProbe(
      '<span data-gank-color="#b91c1c">彩色文字</span>',
    ),
  );
  results.push({
    case: "native-crepe-color-probe",
    markdown: native.markdown,
    computedColor: native.color,
    hasSemanticColorMark: native.color === "rgb(185, 28, 28)",
  });
  results.push({
    case: "T07-markdown-list-table-inline-block-math-color",
    status: "PASS",
  });
  // Real input operations and composition events are synthetic, never a real OS IME claim.
  await page.locator(".ProseMirror h1").click();
  await page.keyboard.press("End");
  await page
    .locator(".ProseMirror")
    .first()
    .evaluate((el) =>
      el.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true, data: "" }),
      ),
    );
  await page.keyboard.insertText("中文连续输入");
  await page
    .locator(".ProseMirror")
    .first()
    .evaluate((el) =>
      el.dispatchEvent(
        new CompositionEvent("compositionend", {
          bubbles: true,
          data: "中文连续输入",
        }),
      ),
    );
  assert.match((await get()).markdown, /中文连续输入/);
  await page.keyboard.press("Control+z");
  assert.doesNotMatch((await get()).markdown, /中文连续输入/);
  await page.keyboard.press("Control+Shift+z");
  assert.match((await get()).markdown, /中文连续输入/);
  phase = "synthetic-composition";
  for (const selector of [".ProseMirror li p", ".ProseMirror td p"]) {
    const before = (await get()).markdown,
      beforeText = await page.locator(selector).first().innerText();
    await page.locator(selector).first().click();
    await page.keyboard.press("End");
    await page
      .locator(".gank-editor")
      .dispatchEvent("compositionstart", { data: "" });
    await page.keyboard.insertText("中文长文".repeat(80));
    await page
      .locator(".gank-editor")
      .dispatchEvent("compositionend", { data: "中文长文".repeat(80) });
    const after = (await get()).markdown;
    assert.equal(
      await page.locator(selector).first().innerText(),
      beforeText + "中文长文".repeat(80),
    );
    await page.keyboard.press("Control+z");
    assert.equal((await get()).markdown, before);
    await page.keyboard.press("Control+Shift+z");
    assert.equal((await get()).markdown, after);
  }
  const grownHeight = await page
    .locator(".editor-body")
    .evaluate((e) => e.getBoundingClientRect().height);
  assert.ok(grownHeight > initialHeight);
  results.push({
    case: "focus-toolbar-and-auto-growing-height",
    status: "PASS",
    initialHeight,
    grownHeight,
  });
  results.push({
    case: "T05-synthetic-composition-undo-redo",
    status: "PASS",
    limitation: "NOT_RUN: real Chinese OS IME, Win10/11",
  });
  // Clipboard bytes are consumed and validated by the existing main-process media.stage API.
  phase = "paste";
  await app.evaluate(({ clipboard }, base64) => {
    clipboard.read = async () => [
      {
        types: ["image/png"],
        getType: async () =>
          new Blob([Buffer.from(base64, "base64")], { type: "image/png" }),
      },
    ];
  }, image);
  await page.locator(".ProseMirror").first().click();
  await page.keyboard.press("Control+End");
  await page
    .locator(".ProseMirror")
    .first()
    .evaluate((el, base64) => {
      const b = Uint8Array.from(atob(base64), (x) => x.charCodeAt(0));
      const data = new DataTransfer();
      data.items.add(new File([b], "p.png", { type: "image/png" }));
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    }, image);
  await page.locator("img[data-gank-placement]").waitFor();
  await page.evaluate(() => {
    const h = window.editorSpike.handle,
      a = h.snapshot().assets[0];
    h.insertImage(a, 80);
  });
  await page.waitForFunction(
    () => document.querySelectorAll("img[data-gank-placement]").length === 2,
  );
  phase = "width-ui";
  await page.getByLabel("图片 1 宽度", { exact: true }).fill("30");
  await page.getByLabel("图片 1 宽度", { exact: true }).press("Tab");

  assert.deepEqual(
    await page
      .locator("img[data-gank-placement]")
      .evaluateAll((elements) => elements.map((e) => e.style.width).sort()),
    ["30%", "80%"],
  );
  await page.locator(".ProseMirror").first().focus();
  await page.keyboard.press("Control+s");
  await page.waitForFunction(
    () =>
      document.querySelector("[data-save-state]").dataset.saveState ===
        "clean" && window.editorSpike.saved.assets.length === 1,
  );
  let saved = await page.evaluate(() => window.editorSpike.saved);
  writeFileSync(join(dir, "s2-editor-document.json"), JSON.stringify(saved));
  phase = "destroy-recreate";
  await page.getByRole("button", { name: "销毁并重建" }).click();
  await page.waitForFunction(
    () => document.querySelectorAll("img[data-gank-placement]").length === 2,
  );
  assert.deepEqual(await get(), saved);
  assert.deepEqual(
    await page
      .locator("img[data-gank-placement]")
      .evaluateAll((elements) => elements.map((e) => e.style.width).sort()),
    ["30%", "80%"],
  );
  assert.ok(
    await page
      .locator("img[data-gank-placement]")
      .evaluateAll((es) => es.every((e) => e.complete && e.naturalWidth > 0)),
  );
  results.push({
    case: "T06-platform-boundary-injected-paste-real-IPC-decoder-resources-two-placements-30-80",
    status: "PASS",
    limitation:
      "NOT_RUN: system clipboard; headless clipboard.read returned no image",
  });
  phase = "peer";
  await page.evaluate(async () => {
    window.peer = await window.editorSpike.mountPeer();
  });
  const peer = await page.evaluate(() => window.peer.snapshot());
  assert.equal(peer.markdown.trim(), "独立实例");
  assert.equal(peer.assets.length, 0);
  await page.evaluate(() => window.peer.destroy());
  assert.equal(await page.locator("#peer").count(), 0);
  results.push({ case: "multi-instance-disposal", status: "PASS" });
  phase = "save-failure";
  await page.getByLabel("注入保存失败").check();
  await page.locator(".ProseMirror").first().focus();
  await page.keyboard.press("Control+End");
  await page.keyboard.insertText("保留失败草稿");
  await page.keyboard.press("Control+s");
  await page.waitForFunction(
    () =>
      document.querySelector("[data-save-state]").dataset.saveState === "error",
  );
  assert.match((await get()).markdown, /保留失败草稿/);
  assert.doesNotMatch(
    (await page.evaluate(() => window.editorSpike.saved)).markdown,
    /保留失败草稿/,
  );
  await page.getByLabel("注入保存失败").uncheck();
  await page.locator(".ProseMirror").first().focus();
  await page.keyboard.press("Control+s");
  await page.waitForFunction(
    () =>
      document.querySelector("[data-save-state]").dataset.saveState === "clean",
  );
  results.push({ case: "autosave-ctrl-s-failure-retry", status: "PASS" });
  phase = "security";
  const before = await get();
  for (const markdown of [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "[x](javascript:alert%281%29)",
    "![x](https://example.org/x.png)",
    "![x](data:image/svg+xml;base64,AA)",
    '<span style="color:red">x</span>',
  ]) {
    await page
      .locator(".ProseMirror")
      .first()
      .evaluate((el, text) => {
        const data = new DataTransfer();
        data.setData("text/plain", text);
        data.setData("text/html", text);
        el.dispatchEvent(
          new ClipboardEvent("paste", {
            clipboardData: data,
            bubbles: true,
            cancelable: true,
          }),
        );
      }, markdown);
    assert.deepEqual(await get(), before);
    results.push({
      case: "reject-untrusted-markdown",
      input: markdown,
      status: "PASS",
    });
  }
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  results.push({
    case: "T08-linux-offline-csp-safe-media-no-network",
    status: "PASS",
    limitation: "NOT_RUN: Windows portable Win10/11 offline",
  });
  // Process restart uses the same isolated media DB and a saved validation JSON fixture, not production Draft APIs.
  phase = "restart";
  await app.close();
  app = null;
  await launch();
  await page.evaluate(
    (d) => window.editorSpike.setInitial(d),
    JSON.parse(readFileSync(join(dir, "s2-editor-document.json"), "utf8")),
  );
  await page.waitForFunction(
    () => document.querySelectorAll("img[data-gank-placement]").length === 2,
  );
  assert.deepEqual(await get(), saved);
  assert.ok(
    await page
      .locator("img[data-gank-placement]")
      .evaluateAll((es) => es.every((e) => e.complete && e.naturalWidth > 0)),
  );
  results.push({
    case: "T06-process-restart-json-fixture-and-real-staged-resources",
    status: "PASS",
  });
  console.log(JSON.stringify({ results, errors, external }, null, 2));
} catch (e) {
  results.push({ case: "execution", status: "FAIL", error: e.stack });
  console.error(e);
  if (page)
    writeFileSync("/tmp/gank-editor-failure.html", await page.content());
  process.exitCode = 1;
} finally {
  await app?.close();
  mkdirSync("validation-results", { recursive: true });
  writeFileSync(
    "validation-results/editor-v075.json",
    JSON.stringify(
      { platform: process.platform, dir, results, errors, external },
      null,
      2,
    ),
  );
}
