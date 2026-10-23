import { _electron as electron } from "playwright-core";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import assert from "node:assert/strict";
import { schema604Fixture } from "../../tests/fixtures/v075-schema604.ts";
import { prepareAndActivateUnified } from "../../electron/infrastructure/migrations/coordinator.ts";
const source = schema604Fixture();
source.db.exec("UPDATE platform_operations SET state='completed'");
const control = join(source.root, "control");
await prepareAndActivateUnified(
  { db: source.db, dataDir: source.dataDir, now: () => new Date(source.at) },
  control,
  join(source.root, "active"),
);
const require = createRequire(import.meta.url),
  errors: string[] = [],
  external: string[] = [],
  results: string[] = [];
let app: Awaited<ReturnType<typeof electron.launch>> | undefined;
async function launch() {
  app = await electron.launch({
    timeout: 20000,
    executablePath: require("electron"),
    args: [
      ...(process.platform === "linux"
        ? ["--no-sandbox", "--ozone-platform=headless", "--disable-gpu"]
        : []),
      resolve("tools/card-draft-spike/main.cjs"),
    ],
    env: {
      ...process.env,
      GANKSOFT_DRAFT_TEST_CONTROL: control,
      GANKSOFT_DRAFT_TEST_SCOPE: JSON.stringify({
        cardId: source.ids.question,
        deckId: source.ids.qDeck,
      }),
    },
  });
  mkdirSync("validation-results", { recursive: true });
  app
    .process()
    .stderr?.on("data", (s) =>
      appendFileSync("validation-results/card-draft-main.log", s),
    );
  app
    .process()
    .stdout?.on("data", (s) =>
      appendFileSync("validation-results/card-draft-main.log", s),
    );
  const page = await app.firstWindow({ timeout: 15000 });
  await page.setViewportSize({ width: 1366, height: 900 });
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.stack ?? String(e)));
  await page.route(/^https?:/, (r) => {
    external.push(r.request().url());
    return r.abort();
  });
  await page.getByTestId("card-draft-form").waitFor();
  await page.waitForFunction(
    () => !!(window as any).cardDraftSpike?.form?.controller,
  );
  return page;
}
async function closeApp() {
  if (!app) return;
  const current = app;
  app = undefined;
  let forced = false;
  const timer = setTimeout(() => {
    forced = true;
    current.process().kill("SIGKILL");
  }, 5000);
  try {
    await current.close();
  } finally {
    clearTimeout(timer);
  }
  if (forced) throw Error("DRAFT_TEST_APP_CLOSE_TIMEOUT");
}
try {
  let page = await launch();
  const status = () => page.locator("output[data-save-state]");
  const title = page.getByTestId("draft-title");
  await title.fill("S3 数据库草稿原文");
  await title.press("Control+s");
  await status().filter({ hasText: "已保存" }).waitFor();
  results.push("Ctrl+S writes real SQLite draft");
  await page.getByRole("button", { name: "问答记忆", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await assert.equal(await title.inputValue(), "S3 数据库草稿原文");
  results.push("cancel keeps current draft");
  await page.getByRole("button", { name: "问答记忆", exact: true }).click();
  await page.getByRole("button", { name: "确认切换", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.locator(".ProseMirror").first().waitFor();
  await page.locator(".ProseMirror").first().fill("问答草稿自动保存");
  await page.waitForFunction(() => {
    const c = (window as any).cardDraftSpike.form.controller;
    return (
      c.fields.payload.fields.front.includes("问答草稿自动保存") &&
      c.state === "clean"
    );
  });
  results.push("confirmed mode switch, native editor auto-save");
  await closeApp();
  page = await launch();
  await page.locator(".ProseMirror").first().waitFor();
  assert.ok(
    (await page.locator(".ProseMirror").first().innerText()).includes(
      "问答草稿自动保存",
    ),
  );
  results.push("process restart recovers draft mode and full text");
  await page.locator(".ProseMirror").first().fill("立即保存的新中文");
  await page.locator(".ProseMirror").first().press("Control+s");
  await page.waitForFunction(() => {
    const c = (window as any).cardDraftSpike.form.controller;
    return (
      c.fields.payload.fields.front.includes("立即保存的新中文") &&
      c.state === "clean"
    );
  });
  assert.equal(
    await page.evaluate(() => (window as any).cardDraftSpike.form.close()),
    true,
  );
  await closeApp();
  page = await launch();
  await page.locator(".ProseMirror").first().waitFor();
  assert.ok(
    (await page.locator(".ProseMirror").first().innerText()).includes(
      "立即保存的新中文",
    ),
  );
  results.push(
    "immediate native input + Ctrl+S + guarded close is durable before listener debounce",
  );
  await app!.evaluate(() => {
    (globalThis as any).cardDraftTest.ctx.db.exec(
      "CREATE TEMP TRIGGER fail_draft BEFORE UPDATE ON learning_card_drafts BEGIN SELECT RAISE(ABORT,'injected disk full'); END",
    );
  });
  await page.getByTestId("draft-title").fill("失败仍保留的原文");
  await page.getByTestId("save-draft").click();
  await page.getByRole("alert").waitFor();
  assert.equal(
    await page.getByTestId("draft-title").inputValue(),
    "失败仍保留的原文",
  );
  await app!.evaluate(() => {
    (globalThis as any).cardDraftTest.ctx.db.exec("DROP TRIGGER fail_draft");
  });
  await page.getByTestId("save-draft").click();
  await page.locator('output[data-save-state="clean"]').waitFor();
  results.push(
    "write failure visible, local text retained, explicit retry durable",
  );
  const published = await app!.evaluate(() => {
    return (globalThis as any).cardDraftTest.ctx.db
      .prepare("SELECT published_type,revision FROM learning_cards WHERE id=?")
      .get("10000000-0000-4000-8000-000000000010");
  });
  assert.equal(published.published_type, "question");
  assert.equal(published.revision, 1);
  results.push("draft UI never changes formal type/revision");
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
} catch (e) {
  errors.push(String(e));
  console.error(e);
  throw e;
} finally {
  await closeApp();
  source.close();
  mkdirSync("validation-results", { recursive: true });
  writeFileSync(
    "validation-results/card-draft-v075.json",
    JSON.stringify(
      {
        platform: process.platform,
        node: process.version,
        results,
        errors,
        external,
      },
      null,
      2,
    ),
  );
}
console.log(JSON.stringify({ results, errors, external }));
