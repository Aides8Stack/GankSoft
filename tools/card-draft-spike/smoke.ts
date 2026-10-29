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
const record=(message:string)=>{results.push(message);console.log("CARD_DRAFT_CASE",message);};
let app: Awaited<ReturnType<typeof electron.launch>> | undefined;
async function launch(scope = { cardId: source.ids.question, deckId: source.ids.qDeck }) {
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
      GANKSOFT_DRAFT_TEST_SCOPE: JSON.stringify(scope),
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
  record("Ctrl+S writes real SQLite draft");
  await page.getByRole("button", { name: "问答记忆", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await assert.equal(await title.inputValue(), "S3 数据库草稿原文");
  record("cancel keeps current draft");
  await page.getByRole("button", { name: "问答记忆", exact: true }).click();
  await page.getByRole("button", { name: "确认切换并清除草稿", exact: true }).click();
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
  record("confirmed mode switch, native editor auto-save");
  await closeApp();
  page = await launch();
  await page.locator(".ProseMirror").first().waitFor();
  assert.ok(
    (await page.locator(".ProseMirror").first().innerText()).includes(
      "问答草稿自动保存",
    ),
  );
  record("process restart recovers draft mode and full text");
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
  record(
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
  record(
    "write failure visible, local text retained, explicit retry durable",
  );
  const published = await app!.evaluate(() => {
    return (globalThis as any).cardDraftTest.ctx.db
      .prepare("SELECT published_type,revision FROM learning_cards WHERE id=?")
      .get("10000000-0000-4000-8000-000000000010");
  });
  assert.equal(published.published_type, "question");
  assert.equal(published.revision, 1);
  record("draft UI never changes formal type/revision");
  assert.equal(await page.getByTestId("reset-cycle").isChecked(), false);
  const oldCycle = await app!.evaluate(() =>
    (globalThis as any).cardDraftTest.ctx.db.prepare("SELECT current_cycle_id FROM learning_cards WHERE id=?")
      .get("10000000-0000-4000-8000-000000000010").current_cycle_id,
  );
  // Read the actual OS clipboard after the UI copy, then paste a modified text
  // envelope through trusted Ctrl+V. No synthetic clipboard event or editor write.
  await page.getByRole("button", { name: "复制卡片", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "卡片内容已复制" }).waitFor();
  const copied = await app!.evaluate(({ clipboard }) => clipboard.readText());
  const marker = "<!-- ganksoft-card:1 -->\n";
  const copiedEnvelope = JSON.parse(copied.slice(marker.length));
  // The explicit text editor accepts v1 fields. Native card-copy can include a
  // v2 binary archive; exercise its image path separately below.
  const incoming = { format: copiedEnvelope.format, version: 1, fields: copiedEnvelope.fields };
  assert.equal(incoming.fields.payload.mode, "qa");
  assert.equal(incoming.cardId, undefined);
  incoming.fields.title = "剪贴板覆盖预览";
  incoming.fields.payload.fields.front = "粘贴后必须显示且不被旧编辑器覆盖";
  await app!.evaluate(({ clipboard }, text) => clipboard.writeText(text), marker + JSON.stringify(incoming));
  await page.getByRole("button", { name: "粘贴卡片", exact: true }).click();
  await page.getByRole("textbox", { name: "结构化卡片内容" }).press("Control+v");
  await page.getByRole("button", { name: "解析预览", exact: true }).click();
  assert.equal(await page.getByTestId("draft-title").inputValue(), "失败仍保留的原文");
  await page.getByRole("button", { name: "确认写入草稿", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(await page.getByTestId("draft-title").inputValue(), incoming.fields.title);
  assert.ok((await page.locator(".ProseMirror").first().innerText()).includes(incoming.fields.payload.fields.front));
  await page.getByTestId("save-draft").click();
  await closeApp();
  page = await launch();
  assert.ok((await page.locator(".ProseMirror").first().innerText()).includes(incoming.fields.payload.fields.front));
  record("system clipboard copy/preview/confirm redraw and restart preserve pasted content");
  await page.getByRole("button", { name: "复制 Prompt", exact: true }).click();
  const promptDialog = page.getByRole("dialog");
  const boxes = promptDialog.getByRole("checkbox");
  assert.equal(await boxes.nth(0).isChecked(), false);
  assert.equal(await boxes.nth(1).isChecked(), false);
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await page.getByRole("button", { name: "复制到剪贴板", exact: true }).click();
  await promptDialog.waitFor({ state: "hidden" });
  const prompt = await app!.evaluate(({ clipboard }) => clipboard.readText());
  assert.ok(prompt.includes("候选知识点目录（仅供匹配）"));
  assert.ok(prompt.includes("已人工确认的本卡知识点关联及父级路径"));
  record("independent Prompt defaults and both scopes copied through system clipboard");
  await app!.evaluate(() => {
    (globalThis as any).cardDraftTest.ctx.db.exec("CREATE TEMP TRIGGER fail_publish BEFORE INSERT ON learning_content_versions BEGIN SELECT RAISE(ABORT,'injected UI publish failure'); END");
  });
  await page.getByTestId("publish-card").click();
  await page.getByRole("alert").waitFor();
  const failed = await app!.evaluate(() => {
    const db = (globalThis as any).cardDraftTest.ctx.db;
    return { card: db.prepare("SELECT published_type,revision FROM learning_cards WHERE id=?").get("10000000-0000-4000-8000-000000000010"), draft: db.prepare("SELECT count(*) n FROM learning_card_drafts").get().n };
  });
  assert.equal(failed.card.published_type, "question");
  assert.equal(failed.card.revision, 1);
  assert.ok(failed.draft > 0);
  await app!.evaluate(() => {
    const t = (globalThis as any).cardDraftTest;
    t.ctx.db.exec("DROP TRIGGER fail_publish");
    const execute = t.host.execute;
    let drop = true;
    let dropStatus = true;
    t.host.execute = async (request: any) => {
      if (!drop && dropStatus && request.method === "operation.status") {
        dropStatus = false;
        throw Error("injected status response loss");
      }
      const response = await execute(request);
      if (drop && request.method === "card.publish" && response.ok) {
        drop = false;
        throw Error("injected committed publish response loss");
      }
      return response;
    };
  });
  await page.getByTestId("publish-card").click();
  await page.getByTestId("publish-card").filter({ hasText: "重试核对发布" }).waitFor();
  assert.equal(await page.evaluate(() => (window as any).cardDraftSpike.form.close()), false);
  await page.getByTestId("publish-card").click();
  await page.getByRole("status").filter({ hasText: "发布成功" }).waitFor();
  const publishedAfterRetry = await app!.evaluate(() => {
    const db = (globalThis as any).cardDraftTest.ctx.db;
    return db.prepare("SELECT published_type,revision,current_cycle_id FROM learning_cards WHERE id=?").get("10000000-0000-4000-8000-000000000010");
  });
  assert.equal(publishedAfterRetry.published_type, "qa");
  assert.equal(publishedAfterRetry.revision, 2);
  assert.equal(publishedAfterRetry.current_cycle_id, oldCycle);
  record("publish write rejection retains draft; lost response retries same receipt once and preserves cycle");
  await page.getByTestId("draft-title").fill("主动重学的新版本");
  await page.getByTestId("reset-cycle").check();
  await page.getByTestId("publish-card").click();
  await page.getByRole("status").filter({ hasText: "发布成功" }).waitFor();
  await closeApp();
  page = await launch();
  assert.equal(await page.getByTestId("draft-title").inputValue(), "主动重学的新版本");
  const final = await app!.evaluate(() => (globalThis as any).cardDraftTest.ctx.db.prepare("SELECT revision,current_cycle_id FROM learning_cards WHERE id=?").get("10000000-0000-4000-8000-000000000010"));
  assert.equal(final.revision, 3);
  assert.notEqual(final.current_cycle_id, oldCycle);
  assert.equal(await page.getByTestId("reset-cycle").isChecked(), false);
  record("explicit relearn persists new cycle/publication across restart, checkbox resets off");
  // Build a synthetic source through the same typed host used by the renderer.
  // The actual card copy, previews, confirmation and rendering below use the UI
  // and real system clipboard; no insertion API or fake clipboard event is used.
  await app!.evaluate(async (_electron, ids) => {
    const t = (globalThis as any).cardDraftTest;
    const call = async (method: string, payload: unknown) => {
      const result = await t.host.execute({ protocol: { major: 2, minor: 0 }, requestId: crypto.randomUUID(),
        dataEpoch: t.ctx.db.prepare("SELECT epoch FROM protocol_meta WHERE singleton=1").get().epoch, method, payload });
      if (!result.ok) throw Error(JSON.stringify(result.error));
      return result.data;
    };
    const scope = { cardId: ids.question, deckId: ids.qDeck };
    const preview = await call("draft.previewSwitch", { ...scope, targetType: "direct" });
    const draft = await call("draft.switchType", { ...scope, targetType: "direct", expectedPublishedRevision: preview.publishedRevision,
      expectedDraftRevision: preview.draftRevision, previewToken: preview.token, confirmDiscard: true });
    const refs = [30, 80].map(width => ({ placementId: crypto.randomUUID(), assetId: ids.unboundImage,
      fileName: ids.unboundImage + ".png", mime: "image/png", role: "analysis", width }));
    await call("draft.save", { ...scope, expectedPublishedRevision: draft.basePublishedRevision, expectedDraftRevision: draft.revision,
      fields: { title: "图片内容复制来源", payload: { encoding: "direct-v1", mode: "direct", fields: {
        body: refs.map(r => `![图](gank-asset://${r.assetId}/${r.placementId}?width=${r.width})`).join("\n\n"), source: "合成图片" } }, mediaRefs: refs } });
  }, source.ids);
  await closeApp();
  page = await launch();
  await page.getByRole("button", { name: "复制卡片", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "卡片内容已复制" }).waitFor();
  const archiveText = await app!.evaluate(async ({ clipboard }) => clipboard.readText());
  const imageArchive = JSON.parse(archiveText.split("\n").slice(1).join("\n"));
  assert.equal(imageArchive.version, 2);
  assert.equal(imageArchive.images.length, 1);
  assert.deepEqual(imageArchive.fields.mediaRefs.map((r: any) => r.width), [30, 80]);
  assert.equal(imageArchive.cardId, undefined);
  assert.equal(imageArchive.history, undefined);
  await closeApp();
  const targetScope = { cardId: source.ids.memory, deckId: source.ids.mDeck };
  page = await launch(targetScope);
  // Linux headless clipboard ownership ends with its source process. Seed the
  // captured archive through the actual system API in the target test process;
  // Windows must retain it through the OS without this fixture assistance.
  if (process.platform === "linux")
    await app!.evaluate(async ({ clipboard }, text) => { await clipboard.writeText(text); }, archiveText);
  await page.getByRole("button", { name: "直接记忆", exact: true }).click();
  await page.getByRole("button", { name: "确认切换并清除草稿", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByTestId("save-draft").click();
  await page.locator('output[data-save-state="clean"]').waitFor();
  const beforePaste = await page.evaluate(() => (window as any).cardDraftSpike.form.controller.snapshot());
  const targetDbState = () => app!.evaluate((_electron, id) => {
    const db = (globalThis as any).cardDraftTest.ctx.db;
    return { draft: db.prepare("SELECT revision FROM learning_card_drafts WHERE card_id=?").get(id).revision,
      staged: db.prepare("SELECT count(*) n FROM settings WHERE key LIKE 'media-draft:%'").get().n,
      events: db.prepare("SELECT count(*) n FROM learning_review_events").get().n,
      card: db.prepare("SELECT published_type,revision FROM learning_cards WHERE id=?").get(id) };
  }, targetScope.cardId);
  const beforePreview = await targetDbState();
  const nativePreview = async () => {
    await page.getByRole("button", { name: "粘贴卡片", exact: true }).click();
    await page.getByRole("button", { name: "从剪贴板预览（含图片）", exact: true }).click();
    await page.getByRole("button", { name: "确认写入草稿", exact: true }).waitFor();
  };
  await nativePreview();
  assert.deepEqual(await targetDbState(), beforePreview);
  await page.getByRole("dialog").getByRole("button", { name: "取消", exact: true }).click();
  assert.deepEqual(await page.evaluate(() => (window as any).cardDraftSpike.form.controller.snapshot()), beforePaste);
  record("image archive copy and target preview/cancel perform no database or file staging writes");
  await nativePreview();
  await app!.evaluate(() => {
    const t = (globalThis as any).cardDraftTest, execute = t.host.execute;
    let drop = true, dropStatus = true;
    t.host.execute = async (request: any) => {
      if (!drop && dropStatus && request.method === "operation.status") { dropStatus = false; throw Error("injected clipboard status response loss"); }
      const response = await execute(request);
      if (drop && request.method === "card.clipboard.apply" && response.ok) { drop = false; throw Error("injected clipboard commit response loss"); }
      return response;
    };
  });
  await page.getByRole("button", { name: "确认写入草稿", exact: true }).click();
  await page.getByRole("button", { name: "重试核对粘贴", exact: true }).waitFor();
  const transfer = page.getByRole("dialog");
  assert.equal(await transfer.getByRole("button", { name: "取消", exact: true }).isDisabled(), true);
  assert.equal(await transfer.getByRole("textbox", { name: "结构化卡片内容" }).getAttribute("readonly"), "");
  await page.keyboard.press("Escape");
  assert.equal(await transfer.isVisible(), true);
  assert.equal(await page.evaluate(() => (window as any).cardDraftSpike.form.close()), false);
  // The original request must replay even after another application changes the clipboard.
  await app!.evaluate(async ({ clipboard }) => { await clipboard.writeText("later clipboard content"); });
  await page.getByRole("button", { name: "重试核对粘贴", exact: true }).click();
  await transfer.waitFor({ state: "hidden" });
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>("img[data-gank-placement]")].length === 2 &&
    [...document.querySelectorAll<HTMLImageElement>("img[data-gank-placement]")].every(i => i.complete && i.naturalWidth > 0));
  const afterPaste = await targetDbState();
  assert.equal(afterPaste.draft, beforePreview.draft + 1);
  assert.equal(afterPaste.staged, beforePreview.staged + 1);
  assert.equal(afterPaste.events, beforePreview.events);
  assert.deepEqual(afterPaste.card, beforePreview.card);
  const targetFields = await page.evaluate(() => (window as any).cardDraftSpike.form.controller.snapshot());
  assert.ok(targetFields.mediaRefs.every((r: any) => r.assetId !== imageArchive.images[0].assetId));
  assert.deepEqual(await page.locator("img[data-gank-placement]").evaluateAll(images => images.map(i => (i as HTMLElement).style.width).sort()), ["30%", "80%"]);
  record("image paste unknown outcome locks editing/cancel/close; same request replays once with new Asset/Placement and 30/80 widths");
  await closeApp();
  page = await launch(targetScope);
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>("img[data-gank-placement]")].length === 2 &&
    [...document.querySelectorAll<HTMLImageElement>("img[data-gank-placement]")].every(i => i.complete && i.naturalWidth > 0));
  assert.deepEqual(await page.locator("img[data-gank-placement]").evaluateAll(images => images.map(i => (i as HTMLElement).style.width).sort()), ["30%", "80%"]);
  await page.getByTestId("publish-card").click();
  await page.getByRole("status").filter({ hasText: "发布成功" }).waitFor();
  await closeApp();
  page = await launch(targetScope);
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>("img[data-gank-placement]")].length === 2 &&
    [...document.querySelectorAll<HTMLImageElement>("img[data-gank-placement]")].every(i => i.complete && i.naturalWidth > 0));
  assert.equal(await page.getByTestId("draft-title").inputValue(), "图片内容复制来源");
  record("imported images render after draft restart and published restart, retaining independent widths");
  await page.getByTestId("new-card-draft").click();
  await page.waitForFunction(() => {
    const state = (window as any).cardDraftSpike;
    return state?.form?.controller?.publishedRevision === 0 && state.form.controller.revision === 1;
  });
  const newScope = await page.evaluate(() => (window as any).cardDraftSpike.scope);
  const newState = () => app!.evaluate((_electron, id) => {
    const db = (globalThis as any).cardDraftTest.ctx.db;
    return { cards: db.prepare("SELECT count(*) n FROM learning_cards WHERE id=?").get(id).n,
      versions: db.prepare("SELECT count(*) n FROM learning_content_versions WHERE card_id=?").get(id).n,
      cycles: db.prepare("SELECT count(*) n FROM learning_study_cycles WHERE card_id=?").get(id).n,
      events: db.prepare("SELECT count(*) n FROM learning_review_events WHERE card_id=?").get(id).n,
      legacy: db.prepare("SELECT count(*) n FROM (SELECT id FROM questions UNION ALL SELECT id FROM memory_cards) WHERE id=?").get(id).n,
      draft: !!db.prepare("SELECT 1 FROM settings WHERE key=?").get("new-card-draft:" + id) };
  }, newScope.cardId);
  assert.deepEqual(await newState(), { cards: 0, versions: 0, cycles: 0, events: 0, legacy: 0, draft: true });
  await page.getByTestId("publish-card").click();
  await page.getByRole("alert").waitFor();
  assert.deepEqual(await newState(), { cards: 0, versions: 0, cycles: 0, events: 0, legacy: 0, draft: true });
  record("new-card button creates only one unpublished draft; incomplete publish creates no formal data");
  await page.getByTestId("draft-title").fill("新建卡片草稿");
  await page.getByRole("button", { name: "直接记忆", exact: true }).click();
  await page.getByRole("button", { name: "确认切换并清除草稿", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.locator(".ProseMirror").first().fill("未发布的新卡正文");
  await page.locator(".ProseMirror").first().press("Control+s");
  await page.locator('output[data-save-state="clean"]').waitFor();
  assert.equal(await page.evaluate(() => (window as any).cardDraftSpike.form.close()), true);
  await closeApp();
  page = await launch(newScope);
  assert.equal(await page.getByTestId("draft-title").inputValue(), "新建卡片草稿");
  assert.ok((await page.locator(".ProseMirror").first().innerText()).includes("未发布的新卡正文"));
  assert.deepEqual(await newState(), { cards: 0, versions: 0, cycles: 0, events: 0, legacy: 0, draft: true });
  record("new unpublished draft switches one mode, saves through IPC and survives process restart without a published placeholder");
  await page.getByRole("button", { name: "恢复草稿", exact: true }).click();
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("navigation", { name: "已保存草稿" }).getByRole("button", { name: "新建卡片草稿", exact: true }).click(),
  ]);
  await page.waitForFunction(() => (window as any).cardDraftSpike?.form?.controller?.publishedRevision === 0);
  assert.equal(await page.getByTestId("draft-title").inputValue(), "新建卡片草稿");
  record("draft inbox metadata locates and reopens an unpublished card without loading hidden bodies or creating a duplicate");
  await app!.evaluate(async ({ clipboard }, text) => { await clipboard.writeText(text); }, archiveText);
  await nativePreview();
  await page.getByRole("button", { name: "确认写入草稿", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>("img[data-gank-placement]")].length === 2 &&
    [...document.querySelectorAll<HTMLImageElement>("img[data-gank-placement]")].every(i => i.complete && i.naturalWidth > 0));
  await page.getByTestId("draft-title").fill("新卡首次正式发布");
  assert.equal(await page.getByTestId("reset-cycle").isChecked(), false);
  await page.getByTestId("publish-card").click();
  await page.getByRole("status").filter({ hasText: "发布成功" }).waitFor();
  assert.deepEqual(await newState(), { cards: 1, versions: 1, cycles: 1, events: 0, legacy: 0, draft: false });
  await closeApp();
  page = await launch(newScope);
  assert.equal(await page.getByTestId("draft-title").inputValue(), "新卡首次正式发布");
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>("img[data-gank-placement]")].length === 2 &&
    [...document.querySelectorAll<HTMLImageElement>("img[data-gank-placement]")].every(i => i.complete && i.naturalWidth > 0));
  assert.deepEqual(await newState(), { cards: 1, versions: 1, cycles: 1, events: 0, legacy: 0, draft: false });
  record("new draft image paste and first publication atomically create one native card/version/cycle, preserve no borrowed history and reopen images");
  await closeApp();
  page = await launch();
  await page.getByRole("button", { name: "错题复盘", exact: true }).click();
  await page.getByRole("button", { name: "确认切换并清除草稿", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "整理为单选题", exact: true }).click();
  await page.getByRole("dialog", { name: "整理旧题选项" }).getByRole("button", { name: "取消", exact: true }).click();
  assert.equal(await page.evaluate(() => (window as any).cardDraftSpike.form.controller.fields.payload.encoding), "legacy-question-604");
  await page.getByRole("button", { name: "整理为单选题", exact: true }).click();
  await page.getByRole("button", { name: "确认整理", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "添加选项", exact: true }).click();
  await page.getByRole("button", { name: "添加选项", exact: true }).click();
  const optionRegion = page.locator('[aria-label="单选选项"]');
  await optionRegion.locator(".ProseMirror").nth(0).fill("人工整理选项甲");
  await optionRegion.locator(".ProseMirror").nth(1).fill("人工整理选项乙");
  await page.getByRole("radio",{name:"正确项 2",exact:true}).check();
  await optionRegion.getByRole("button", { name: "下移选项 1", exact: true }).click();
  assert.equal(await page.getByRole("radio",{name:"正确项 1",exact:true}).isChecked(), true);
  await page.getByTestId("draft-title").fill("手工整理后的原错题");
  await page.getByTestId("publish-card").click();
  await page.getByRole("status").filter({ hasText: "发布成功" }).waitFor();
  await closeApp();
  page = await launch();
  assert.equal(await page.getByTestId("draft-title").inputValue(), "手工整理后的原错题");
  assert.equal(await page.getByRole("radio",{name:"正确项 1",exact:true}).isChecked(), true);
  record("legacy question normalization cancel/confirm, manual stable options/reorder and publication reopen preserve the correct identity");
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
