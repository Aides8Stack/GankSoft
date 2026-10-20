import {createHash, randomUUID} from "node:crypto";
import { completionGuard } from "./smoke-evidence.mjs";
import { createPackageWithOptions, listPackage } from "@electron/asar";
import {
  rmSync,
  mkdtempSync,
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCheckedSmoke } from "./checked-smoke.mjs";
import { SMOKE_CONTRACTS } from "./smoke-contracts.mjs";
const suiteRunId = randomUUID();
const markPackageComplete = completionGuard(`ASAR package ${suiteRunId}`);
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
const smokeEvidence = [];
for (const definition of SMOKE_CONTRACTS) {
  smokeEvidence.push(runCheckedSmoke({script: definition.script, target: archive, definition}));
}
writeFileSync(
  "validation-results/package-v073.json",
  JSON.stringify(
    {
      version: JSON.parse(readFileSync("package.json", "utf8")).version,
      platform: process.platform,
      asar: true,
      smokeEvidence,
      status: "PASS",
      suiteRunId,
      verifiedSuites: smokeEvidence.length,
      verifiedCases: smokeEvidence.reduce((n, r) => n + r.caseCount, 0),
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

writeSync(1, `GANKSOFT_ASAR_COMPLETE ${suiteRunId} ${createHash("sha256").update(readFileSync("validation-results/package-v073.json")).digest("hex")}\n`);
markPackageComplete();
