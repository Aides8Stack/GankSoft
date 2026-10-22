// Isolated human acceptance harness. It never marks human scenarios PASS.
import { _electron as electron } from "playwright-core";
import { createRequire } from "node:module";
import { createInterface } from "node:readline/promises";
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { createServer } from "node:http";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const verify = process.argv.includes("--verify-launcher");
if (process.argv.slice(2).some((x) => x !== "--verify-launcher"))
  throw Error(
    "Usage: node tools/editor-spike/manual-acceptance.mjs [--verify-launcher]",
  );
for (const file of [
  "dist-electron/electron/main.js",
  "dist/assets/editor-spike/tools/editor-spike/index.html",
])
  if (!existsSync(join(root, file)))
    throw Error("先执行 npm run build，再 npm run build:editor-spike");
const run = mkdtempSync(join(tmpdir(), "gank S2 人工验收 "));
const data = join(run, "data");
mkdirSync(data);
const require = createRequire(import.meta.url);
const report = {
  sha: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  platform: process.platform,
  node: process.version,
  mode: verify ? "AUTOMATED_LAUNCHER_AND_PLATFORM" : "HUMAN_PENDING",
  data,
  note: "Test-only file snapshots of the existing in-memory adapter; not production Draft persistence. No clipboard/IME injection.",
  human: {
    windowsAutomated: "NOT_RUN",
    ime: "NOT_RUN",
    clipboard: "NOT_RUN",
    drag: "NOT_RUN",
    offline: "NOT_RUN",
  },
  errors: [],
  browserErrors: [],
  external: [],
  captures: [],
};
let app, page, terminal;
let launches = 0;
const log = (name, text) => appendFileSync(join(run, name), String(text));
const saveReport = () =>
  writeFileSync(join(run, "report.json"), JSON.stringify(report, null, 2));

async function launch(saved, { offline = false } = {}) {
  app = await electron.launch({
    executablePath: require("electron"),
    args: [
      `--user-data-dir=${join(run, `profile-${++launches}`)}`,
      ...(verify && process.platform === "linux"
        ? ["--no-sandbox", "--ozone-platform=headless", "--disable-gpu"]
        : []),
      root,
    ],
    cwd: root,
    env: { ...process.env, GANKSOFT_E2E: "1", GANKSOFT_DATA_DIR: data },
  });
  app.process().stdout?.on("data", (s) => log("electron-stdout.log", s));
  app.process().stderr?.on("data", (s) => log("electron-stderr.log", s));
  page = await app.firstWindow();
  if (offline) {
    const server = createServer((_request, response) =>
      response.end("S2 probe"),
    );
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    let probe;
    try {
      [probe] = await Promise.all([
        app.waitForEvent("window", { timeout: 5000 }),
        app.evaluate(async ({ BrowserWindow }, url) => {
          await new BrowserWindow({ show: false }).loadURL(url);
        }, `http://127.0.0.1:${server.address().port}/`),
      ]);
      const url = `http://127.0.0.1:${server.address().port}/`;
      const control = await probe.goto(url, { timeout: 5000 });
      const body = await probe.locator("body").innerText();
      await page.context().setOffline(true);
      let failure = null;
      try {
        await probe.goto(url + "?offline", { timeout: 5000 });
      } catch (error) {
        failure = String(error);
      }
      report.offlineProbe = { control: control.status(), body, failure };
      assert.equal(report.offlineProbe.control, 200);
      assert.equal(body, "S2 probe");
      assert.match(failure ?? "", /ERR_INTERNET_DISCONNECTED/);
    } finally {
      await probe?.close();
      server.closeAllConnections();
      server.close();
    }
  }
  await page.route(/^(https?|wss?):/, (route) => route.abort());
  page.on("pageerror", (e) => {
    report.errors.push(e.stack ?? e.message);
    saveReport();
  });
  page.on("console", (m) => {
    log("browser.log", `[${m.type()}] ${m.text()}\n`);
    if (m.type() === "error") {
      report.browserErrors.push(m.text());
      saveReport();
    }
  });
  page.on("request", (r) => {
    if (/^(https?|wss?):/.test(r.url())) {
      report.external.push(r.url());
      saveReport();
    }
  });
  page.on("requestfailed", (r) =>
    log("request-failed.log", `${r.url()} ${r.failure()?.errorText}\n`),
  );
  await page
    .getByRole("heading", { name: "今天，从一次主动回忆开始。" })
    .waitFor();
  await page.goto(
    "gank-app://ui/assets/editor-spike/tools/editor-spike/index.html",
  );
  await page.getByRole("button", { name: "开始隔离验证" }).click();
  await page.waitForFunction(() => !!window.editorSpike?.handle);
  if (saved) {
    await page.evaluate((value) => window.editorSpike.setInitial(value), saved);
    await page.waitForFunction(() => !!window.editorSpike?.handle);
    const actual = await page.evaluate(() =>
      window.editorSpike.handle.snapshot(),
    );
    assert.deepEqual(actual, saved, "Reopened full document differs");
  }
}
async function capture() {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const snapshot = await page.evaluate(() => ({
    current: window.editorSpike.handle.snapshot(),
    saved: window.editorSpike.saved,
    revision: window.editorSpike.revision,
    saveState: document
      .querySelector("[data-save-state]")
      ?.getAttribute("data-save-state"),
    alerts: [...document.querySelectorAll('[role="alert"]')].map(
      (e) => e.textContent,
    ),
    failedFonts: [...document.fonts]
      .filter((font) => font.status === "error")
      .map((font) => font.family),
  }));
  const name = `capture-${report.captures.length + 1}`;
  writeFileSync(join(run, `${name}.json`), JSON.stringify(snapshot, null, 2));
  writeFileSync(
    join(run, "saved-document.json"),
    JSON.stringify(snapshot.saved, null, 2),
  );
  await page.screenshot({ path: join(run, `${name}.png`), fullPage: true });
  report.captures.push({
    name,
    saveState: snapshot.saveState,
    at: new Date().toISOString(),
  });
  saveReport();
  console.log(
    `${name}: ${snapshot.saveState}; pageerrors=${report.errors.length}; ${run}`,
  );
  return snapshot;
}
async function restart(options) {
  const before = await capture();
  // Preserve unsaved evidence. Restart always reloads the last successfully saved value.
  await app.close();
  await launch(
    JSON.parse(readFileSync(join(run, "saved-document.json"), "utf8")),
    options,
  );
  const after = await page.evaluate(() => window.editorSpike.handle.snapshot());
  assert.deepEqual(after, before.saved);
  console.log(
    "Electron进程已重启，完整已保存文档一致；未保存内容另留在capture文件中。",
  );
  return report.offlineProbe;
}
try {
  console.log(`独立测试目录（请保留）：${run}\n当前SHA：${report.sha}`);
  await launch();
  if (verify) {
    const previous = await capture();
    await page.getByLabel("注入保存失败").check();
    await page.locator(".ProseMirror h1").click();
    await page.keyboard.press("End");
    await page.keyboard.insertText("启动工具自检");
    await page.locator(".ProseMirror").first().focus();
    await page.keyboard.press("Control+s");
    await page.locator('[data-save-state="error"]').waitFor();
    const failed = await capture();
    assert.deepEqual(failed.saved, previous.saved);
    assert.match(failed.current.markdown, /启动工具自检/);
    await page.getByLabel("注入保存失败").uncheck();
    await page.locator(".ProseMirror").first().focus();
    await page.keyboard.press("Control+s");
    await page.locator('[data-save-state="clean"]').waitFor();
    const recovered = await capture();
    assert.deepEqual(recovered.saved, recovered.current);
    await restart();
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.browserErrors, []);
    assert.deepEqual(recovered.failedFonts, []);
    assert.deepEqual(report.external, []);
    report.launcherSelfTest =
      "PASS: capture/failure retention/retry/Electron restart; synthetic, not human acceptance";
    const { platformAcceptance } = await import("./platform-acceptance.mjs");
    report.platformAcceptance = await platformAcceptance({
      getApp: () => app,
      getPage: () => page,
      restart,
    });
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.browserErrors, []);
    assert.deepEqual(report.external, []);
  } else {
    terminal = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    console.log(
      "在窗口中真实操作。终端命令：capture 保存证据；restart 重启并读取最近成功保存内容；quit 保存证据后退出。不要直接点窗口X；测试快照不是正式草稿保存。",
    );
    for (;;) {
      const command = (await terminal.question("S2> ")).trim();
      if (command === "capture") await capture();
      else if (command === "restart") await restart();
      else if (command === "quit") {
        await capture();
        break;
      } else console.log("capture / restart / quit");
    }
  }
} catch (error) {
  report.errors.push(error.stack ?? String(error));
  console.error(error);
  process.exitCode = 1;
} finally {
  terminal?.close();
  try {
    await app?.close();
  } catch (e) {
    report.errors.push(String(e));
  }
  if (
    report.errors.length ||
    report.browserErrors.length ||
    report.external.length
  )
    process.exitCode = 1;
  saveReport();
  if (verify) {
    const output = join(root, "validation-results/s2-platform-acceptance");
    mkdirSync(output, { recursive: true });
    for (const file of [
      "browser.log",
      "electron-stdout.log",
      "electron-stderr.log",
      "request-failed.log",
    ])
      if (existsSync(join(run, file)))
        copyFileSync(join(run, file), join(output, file));
    writeFileSync(
      join(root, "validation-results/s2-launcher-selftest.json"),
      JSON.stringify(report, null, 2),
    );
  }
  console.log(
    `报告/截图/进程及浏览器日志：${run}；人工结果须另填清单，工具不自动标PASS。`,
  );
}
