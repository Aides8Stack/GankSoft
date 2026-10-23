// Remaining S2 operations through OS clipboard and browser UI, never editor commands.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { version, release } from "node:os";
import { spawnSync, execFileSync } from "node:child_process";
import { Transformer } from "@napi-rs/image";
import {
  checkTableMouseDrag,
  compareTableMouseDrag,
} from "./table-mouse-drag.mjs";

export async function platformAcceptance({ getApp, getPage, restart }) {
  const output = "validation-results/s2-platform-acceptance";
  mkdirSync(output, { recursive: true });
  const report = {
    sha: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    worktreeHashes: Object.fromEntries(
      [
        "src/editor/table-interaction.ts",
        "tools/editor-spike/table-regression.ts",
        "tools/editor-spike/manual-acceptance.mjs",
        "tools/editor-spike/platform-acceptance.mjs",
        "tools/editor-spike/table-mouse-drag.mjs",
        "src/editor-spike/EditorSpike.vue",
      ].map((path) => [
        path,
        createHash("sha256").update(readFileSync(path)).digest("hex"),
      ]),
    ),
    platform: process.platform,
    versions: await getApp().evaluate(() => ({
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
    })),
    os: version(),
    release: release(),
    cases: [],
  };
  const read = () =>
    getPage().evaluate(() => window.editorSpike.handle.snapshot());
  const persist = () =>
    writeFileSync(
      "validation-results/s2-platform-acceptance.json",
      JSON.stringify(report, null, 2),
    );
  async function run(name, action) {
    const row = { name, status: "NOT_RUN" };
    report.cases.push(row);
    try {
      Object.assign(row, await action());
      row.status ??= "PASS";
    } catch (error) {
      row.status = "FAIL";
      row.error = error.stack ?? String(error);
      try {
        row.diagnostics = await getPage().evaluate(() => ({
          drags: window.s2NativeDrags,
          rows: Array.from(document.querySelectorAll("table.children tr")).map(
            (r) => Array.from(r.children).map((c) => c.textContent),
          ),
          alerts: Array.from(document.querySelectorAll('[role="alert"]')).map(
            (e) => e.textContent,
          ),
          online: navigator.onLine,
        }));
        writeFileSync(join(output, name + ".html"), await getPage().content());
      } catch (captureError) {
        row.captureError = String(captureError);
      }
    }
    try {
      await getPage().screenshot({
        path: join(output, name + ".png"),
        fullPage: true,
      });
    } catch (error) {
      row.screenshotError = String(error);
    }
    persist();
    return row;
  }
  const fixture = {
    encoding: "ganksoft.editor/1",
    assets: [],
    markdown:
      "# 平台验收\n\n行内 $x^2+1$。\n\n$$\n\\frac{a}{b}\n$$\n\n| 列甲 | 列乙 | 列丙 |\n| --- | --- | --- |\n| 甲1 | 甲2 | 甲3 |\n| 乙1 | 乙2 | 乙3 |\n| 丙1 | 丙2 | 丙3 |\n\n图片区\n",
  };
  await getPage().evaluate(
    (doc) => window.editorSpike.setInitial(doc),
    fixture,
  );
  await getPage().waitForFunction(() =>
    window.editorSpike?.handle?.snapshot().markdown.includes("丙3"),
  );

  const clipboard = await run("system-clipboard-png", async () => {
    const png = Transformer.fromRgbaPixels(
      Buffer.from([10, 100, 200, 255]),
      1,
      1,
    )
      .pngSync()
      .toString("base64");
    // Uses the actual Electron44 system API. No assignment/wrapper of clipboard.read.
    const system = await getApp().evaluate(
      async ({ clipboard, ClipboardItem }, base64) => {
        if (globalThis.__s2ClipboardTrace)
          throw Error("Injected clipboard detected");
        const read = clipboard.read;
        await clipboard.write([
          new ClipboardItem({
            "image/png": new Blob([Buffer.from(base64, "base64")], {
              type: "image/png",
            }),
          }),
        ]);
        const items = await clipboard.read();
        return {
          types: items.map((item) => item.types),
          readUnchanged: read === clipboard.read,
        };
      },
      png,
    );
    if (
      process.platform !== "win32" &&
      !system.types.some((types) => types.includes("image/png"))
    )
      return {
        status: "NOT_RUN",
        system,
        reason:
          "No PNG from this Linux headless OS clipboard; Windows required",
      };
    assert.equal(system.readUnchanged, true);
    assert.ok(system.types.some((types) => types.includes("image/png")));
    await getPage().evaluate(() => {
      window.s2NativePastes = [];
      document.addEventListener(
        "paste",
        (event) =>
          window.s2NativePastes.push({
            trusted: event.isTrusted,
            types: Array.from(event.clipboardData?.items ?? []).map(
              (item) => item.type,
            ),
          }),
        true,
      );
    });
    for (const count of [1, 2]) {
      await getPage().locator(".ProseMirror").first().focus();
      await getPage().keyboard.press("Control+End");
      await getPage().keyboard.press("Control+v");
      await getPage().waitForFunction(
        (n) =>
          document.querySelectorAll("img[data-gank-placement]").length === n,
        count,
      );
    }
    const events = await getPage().evaluate(() => window.s2NativePastes);
    assert.equal(events.length, 2);
    assert.ok(
      events.every(
        (event) => event.trusted && event.types.includes("image/png"),
      ),
    );
    await getPage().getByLabel("图片 1 宽度", { exact: true }).fill("30");
    await getPage().getByLabel("图片 1 宽度", { exact: true }).press("Tab");
    assert.deepEqual(
      await getPage()
        .locator("img[data-gank-placement]")
        .evaluateAll((es) => es.map((e) => e.style.width)),
      ["30%", "80%"],
    );
    await getPage().locator(".ProseMirror").first().focus();
    await getPage().keyboard.press("Control+s");
    await getPage().locator('[data-save-state="clean"]').waitFor();
    const saved = await read();
    await restart();
    assert.deepEqual(await read(), saved);
    await getPage().waitForFunction(
      () =>
        Array.from(document.querySelectorAll("img[data-gank-placement]"))
          .length === 2 &&
        Array.from(document.querySelectorAll("img[data-gank-placement]")).every(
          (e) => e.complete && e.naturalWidth > 0,
        ),
    );
    assert.deepEqual(
      await getPage()
        .locator("img[data-gank-placement]")
        .evaluateAll((es) => es.map((e) => e.style.width)),
      ["30%", "80%"],
    );
    return {
      status: "PASS",
      system,
      events,
      placements: saved.markdown.match(/gank-asset:\/\/[^)]+/g),
      assetCount: saved.assets.length,
      scope:
        "Actual system clipboard bytes + trusted Ctrl+V events + real media IPC + test-adapter save/restart; not screenshot-tool human acceptance",
    };
  });
  report.tableComparison = await compareTableMouseDrag(getPage());
  persist();
  await run("table-mouse-drag", async () => {
    const page = getPage();
    assert.equal(
      report.tableComparison.results[1].status,
      "PASS",
      "Adapted isolated table drag failed; see tableComparison",
    );
    const drag = await checkTableMouseDrag(page, page.locator(".gank-editor"));
    assert.equal(await page.locator('[role="alert"]').count(), 0);
    await page.locator(".ProseMirror").first().focus();
    await page.keyboard.press("Control+s");
    await page.locator('[data-save-state="clean"]').waitFor();
    return {
      status: "PASS",
      ...drag,
      scope:
        "Playwright mouse path, native trusted drag/drop, no internal editor command calls; not human drag sign-off",
    };
  });
  await run("offline-local-resources", async () => {
    await getPage().locator(".ProseMirror").first().focus();
    await getPage().keyboard.press("Control+s");
    await getPage().locator('[data-save-state="clean"]').waitFor();
    const saved = await read();
    const network = await restart({ offline: true });
    const page = getPage();
    assert.match(network.failure, /ERR_INTERNET_DISCONNECTED/);
    await page.locator(".katex").first().waitFor();
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return Array.from(document.fonts).map((f) => ({
        family: f.family,
        status: f.status,
      }));
    });
    assert.ok(
      fonts.some((f) => f.status === "loaded" && /KaTeX/.test(f.family)),
    );
    assert.ok(fonts.every((f) => f.status !== "error"));
    assert.deepEqual(await read(), saved);
    const imageCount = await page.locator("img[data-gank-placement]").count();
    if (clipboard.status === "PASS") {
      assert.equal(imageCount, 2);
      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll("img[data-gank-placement]")).every(
          (e) => e.complete && e.naturalWidth > 0,
        ),
      );
    }
    return {
      status: clipboard.status === "PASS" ? "PASS" : "NOT_RUN",
      fonts,
      network,
      navigatorOnline: await page.evaluate(() => navigator.onLine),
      math: "PASS",
      imageCount,
      images: clipboard.status === "PASS" ? "PASS" : "NOT_RUN",
      scope:
        "Fresh Chromium profile with browser-context network offline before editor load and external requests blocked; OS adapter stays enabled. Not portable ASAR/Win10-11 cable-unplug acceptance",
    };
  });
  const probe =
    process.platform === "win32"
      ? spawnSync(
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); Get-WinUserLanguageList | Select-Object LanguageTag,InputMethodTips | ConvertTo-Json -Depth 4",
          ],
          { encoding: "utf8", timeout: 10000, maxBuffer: 1024 * 1024 },
        )
      : null;
  report.cases.push({
    name: "native-chinese-ime",
    status: "NOT_RUN",
    reason:
      "No reliable TSF/IME composition and candidate-window driver in the existing Playwright runner. Synthetic insertText/composition is excluded.",
    languageProbe: probe
      ? {
          status: probe.status,
          error: probe.error?.message,
          stdout: probe.stdout,
          stderr: probe.stderr,
        }
      : "Non-Windows environment",
  });
  persist();
  console.log(JSON.stringify(report, null, 2));
  if (report.cases.some((row) => row.status === "FAIL"))
    throw Error(
      "S2 platform acceptance failed; see validation-results/s2-platform-acceptance.json",
    );
  return report;
}
