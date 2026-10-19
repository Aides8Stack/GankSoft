import {createHash} from "node:crypto";
import { createPackageWithOptions, listPackage } from "@electron/asar";
import {
  rmSync,
  mkdtempSync,
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
rmSync("validation-results/package-v073.json",{force:true});
const dir = mkdtempSync(join(tmpdir(), "gank060-asar-")),
  stage = join(dir, "application");
mkdirSync(stage);
for (const name of ["dist", "dist-electron", "package.json"])
  cpSync(resolve(name), join(stage, name), { recursive: true });
const copied = new Set();
function copy(name) {
  if (copied.has(name)) return;
  copied.add(name);
  const from = resolve("node_modules", name),
    meta = JSON.parse(readFileSync(join(from, "package.json"), "utf8"));
  cpSync(from, join(stage, "node_modules", name), { recursive: true });
  for (const dependency of Object.keys(meta.dependencies ?? {}))
    copy(dependency);
}
for (const name of [
  "ts-fsrs",
  "zod",
  "yauzl",
  "yazl",
  "@napi-rs/image",
  "@napi-rs/image-linux-x64-gnu",
])
  copy(name);
const archive = join(dir, "app.asar");
await createPackageWithOptions(stage, archive, { unpack: "**/*.node" });
const files = listPackage(archive);
if (!files.some((f) => f.endsWith("/preload.cjs")))
  throw Error("Missing preload");
for (const script of [
  "tools/smoke-v060.mjs",
  "tools/smoke-knowledge-picker.mjs",
  "tools/smoke-knowledge-filter.mjs",
  "tools/smoke-mind-workspace.mjs",
  "tools/smoke-import-cards.mjs",
  "tools/smoke-study-pages.mjs",
  "tools/smoke-v066.mjs",
  "tools/smoke-v070.mjs",
  "tools/smoke-v071.mjs",
  "tools/smoke-v072.mjs",
  "tools/smoke-v073.mjs",
  "tools/smoke-system-v060.mjs",
]) {
  const r = spawnSync(process.execPath, [script, archive], {
    encoding: "utf8",
    timeout: 120000,
  });
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  if (r.status !== 0) throw Error("ASAR smoke failed: " + script);
}
const failure = spawnSync(
  process.execPath,
  ["tools/smoke-native-failure.mjs", archive],
  { encoding: "utf8", timeout: 120000 },
);
process.stdout.write(failure.stdout);
process.stderr.write(failure.stderr);
if (failure.status !== 0) throw Error("ASAR missing-native isolation failed");
writeFileSync(
  "validation-results/package-v073.json",
  JSON.stringify(
    {
      version: JSON.parse(readFileSync("package.json", "utf8")).version,
      platform: process.platform,
      asar: true,
      asarSha256:createHash("sha256").update(readFileSync(archive)).digest("hex"),
      runtimeDependencies: [...copied],
      nativeDecoderUnpacked: true,
      uiStudySmoke: "passed",
      knowledgePicker: "passed",
      knowledgeFilter: "passed",
      mindWorkspace: "passed",
      importCards: "passed",
      studyPages: "passed",
      v066Issues: "passed",
      v070Issues: "passed",
      v071Issues: "passed",
      v072Issues:"passed",
      v073Issues:"passed",
      systemSmoke: "passed",
      missingImageAddonIsolation: "passed",
      windows10: "not_run",
      windows11: "not_run",
    },
    null,
    2,
  ),
);
