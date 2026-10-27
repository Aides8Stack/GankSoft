// Diagnostic: a current candidate failure is an exit-1 result, never an accepted regression.
import { _electron as electron } from "playwright-core";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { waitForProductionOverview } from "./production-startup.mjs";
const require = createRequire(import.meta.url),
  errors = [];
let app;
try {
  app = await electron.launch({
    executablePath: require("electron"),
    args: [
      ...(process.platform === "linux"
        ? ["--no-sandbox", "--ozone-platform=headless", "--disable-gpu"]
        : []),
      resolve("."),
    ],
    env: {
      ...process.env,
      GANKSOFT_E2E: "1",
      GANKSOFT_DATA_DIR: mkdtempSync(join(tmpdir(), "gank-native-crepe-")),
    },
  });
  const page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.stack ?? e.message));
  const startup = await waitForProductionOverview(page);
  await page.goto(
    "gank-app://ui/assets/editor-spike/tools/editor-spike/index.html",
  );
  const document = await page.evaluate(() =>
    window.editorSpike.nativeTableRace(),
  );
  const result = {
    candidate: "@milkdown/crepe@7.22.3",
    adapter: "none; native Crepe defaults only",
    status: errors.length ? "FAIL" : "PASS",
    startup,
    steps: [
      "create native Crepe with heading + GFM table",
      "mousedown into body cell queues native selection transaction",
      "insert text before next animation frame",
      "observe native delayed dispatch",
    ],
    document,
    errors,
  };
  mkdirSync("validation-results", { recursive: true });
  writeFileSync(
    "validation-results/s2-native-table-race.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) process.exitCode = 1;
} finally {
  await app?.close();
}
