// Regression of the public NodeView extension; any assertion or pageerror fails.
import { _electron as electron } from "playwright-core";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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
  await page
    .getByRole("heading", { name: "今天，从一次主动回忆开始。" })
    .waitFor();
  page.on("pageerror", (e) => errors.push(e.stack ?? e.message));
  await page.goto(
    "gank-app://ui/assets/editor-spike/tools/editor-spike/index.html",
  );
  const cases = [];
  for (let repetition = 1; repetition <= 3; repetition++) {
    const rows = await page.evaluate(() =>
      window.editorSpike.tableRegression(),
    );
    cases.push(...rows.map((row) => ({ ...row, repetition })));
  }
  if (cases.length !== 57)
    throw Error(`Expected all57 table cases, got ${cases.length}`);
  const result = {
    candidate: "@milkdown/crepe@7.22.3",
    adapter:
      "public TableNodeView/$view extension only; native table UI retained",
    status: errors.length ? "FAIL" : "PASS",
    platform: process.platform,
    limitation: "Synthetic events; real OS IME and Windows editor NOT_RUN",
    cases,
    errors,
  };
  mkdirSync("validation-results", { recursive: true });
  writeFileSync(
    "validation-results/s2-table-interactions.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  mkdirSync("validation-results", { recursive: true });
  writeFileSync(
    "validation-results/s2-table-interactions.json",
    JSON.stringify({ status: "FAIL", error: error.stack, errors }, null, 2),
  );
  throw error;
} finally {
  await app?.close();
}
