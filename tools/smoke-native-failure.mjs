import { startSmoke } from "./validation/smoke-evidence.mjs";
const finishSmoke = startSmoke(import.meta.url);
/** Inject an absent addon in an isolated ASAR, never in the deliverable. */
import { _electron as electron } from "playwright-core";
import { extractAll, createPackageWithOptions } from "@electron/asar";
import { createRequire } from "node:module";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  dir = mkdtempSync(join(tmpdir(), "gank-native-failure-"));
const source = resolve(process.argv[2]),
  stage = join(dir, "stage"),
  archive = join(dir, "app.asar"),
  data = join(dir, "data");
extractAll(source, stage);
for (const n of ["image", "image-linux-x64-gnu", "image-win32-x64-msvc"])
  rmSync(join(stage, "node_modules/@napi-rs", n), {
    recursive: true,
    force: true,
  });
await createPackageWithOptions(stage, archive, { unpack: "**/*.node" });
let app;
try {
  app = await electron.launch({
    executablePath: require("electron"),
    args: [
      ...(process.platform === "linux"
        ? ["--no-sandbox", "--ozone-platform=headless", "--disable-gpu"]
        : []),
      archive,
    ],
    env: { ...process.env, GANKSOFT_E2E: "1", GANKSOFT_DATA_DIR: data },
  });
  const page = await app.firstWindow();await page.addInitScript(()=>{window.confirm=()=>true});await page.evaluate(()=>{window.confirm=()=>true});
  await page
    .getByRole("heading", { name: "今天，从一次主动回忆开始。" })
    .waitFor();
  async function call(method, payload = {}) {
    return page.evaluate(
      async ({ method, payload }) => {
        const cap = await window.gank.protocol({
          protocol: { major: 2, minor: 0 },
          requestId: crypto.randomUUID(),
          dataEpoch: null,
          method: "app.capabilities",
          payload: {},
        });
        return window.gank.protocol({
          protocol: { major: 2, minor: 0 },
          requestId: crypto.randomUUID(),
          dataEpoch: cap.dataEpoch,
          method,
          payload,
        });
      },
      { method, payload },
    );
  }
  const catalog = await call("workspace.read", { sections: ["catalog"] });
  assert(catalog.ok);
  const deckId = catalog.data.decks.find((d) => d.kind === "question").id;
  const card = await call("content.question.save", {
    deckId,
    title: "native failure fixture",
    stem: "题干",
    answer: "B",
  });
  assert(card.ok);
  const image = join(dir, "image.png");
  writeFileSync(
    image,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRFsAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  await app.evaluate(({ dialog }, image) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [image],
    });
  }, image);
  const failed = await call("media.stage", {
    deckId, purpose: "question", source: "file",
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.error.code, "IMAGE_DECODER_UNAVAILABLE");
  assert.match(
    readFileSync(join(data, "image-decoder-diagnostics.log"), "utf8"),
    /MODULE_NOT_FOUND/,
  );
  const state = await call("workspace.read", { sections: ["content"], deckId });
  assert(state.ok);
  assert.equal(state.data.questions[0].assets.length, 0);
  const operations = await call("maintenance.operations");
  assert(operations.ok);
  assert.deepEqual(operations.data, []);
  const backup = join(dir, "backup.zip");
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, backup);
  assert((await call("maintenance.backup")).ok);
  assert((await call("preferences.set", { theme: "dark" })).ok);
  const result = {
    version:JSON.parse(readFileSync("package.json","utf8")).version,
    revision:"v0.7.2-fault-injection",
    platform: process.platform,
    cases: [
      "boot-with-no-image-addon",
      "read-write-library-with-no-addon",
      "image-failure-is-rejected-without-write-or-pending-lock",
      "underlying-load-error-is-recorded",
      "backup-and-theme-still-work",
    ],
    windowsExecutionTested: false,
  };
  mkdirSync("validation-results/v0.7.2", { recursive: true });
  writeFileSync(
    "validation-results/v0.7.2/native-failure.json",
    JSON.stringify(result, null, 2),
  );
  finishSmoke(result);
  console.log(JSON.stringify(result));
} finally {
  await app?.close();
}
