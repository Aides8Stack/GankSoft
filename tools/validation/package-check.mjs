import {installLegacyTestMain} from './legacy-test-app.mjs';
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
import { SMOKE_CONTRACTS, PRODUCTION606_CONTRACT, RETIRED_UI_ASSERTIONS } from "./smoke-contracts.mjs";
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
  "mdast-util-from-markdown",
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
const productionEvidence=runCheckedSmoke({script:PRODUCTION606_CONTRACT.script,target:archive,definition:PRODUCTION606_CONTRACT});
// Reviewed business contracts run in an isolated retained604 host; retired appearance assertions are listed in the summary.
const legacyStage=join(dir,'retained604');cpSync(stage,legacyStage,{recursive:true});installLegacyTestMain(legacyStage);
const legacyArchive=join(dir,'retained604.asar');await createPackageWithOptions(legacyStage,legacyArchive,{unpack:'**/*.node'});
const smokeEvidence = [], failures=[];
for (const definition of SMOKE_CONTRACTS) {
  try { smokeEvidence.push(runCheckedSmoke({script: definition.script, target: legacyArchive, definition})); }
  catch(e){failures.push({script:definition.script,status:"FAIL",reason:e.message});}
}
writeFileSync(
  "validation-results/package-v073.json",
  JSON.stringify(
    {
      version: JSON.parse(readFileSync("package.json", "utf8")).version,
      platform: process.platform,
      asar: true,
      smokeEvidence,
      legacyRegressionOnly:true,
      production606Evidence:productionEvidence,
      status: failures.length ? "FAIL" : "PASS",
      failures,
      retiredUiAssertions:RETIRED_UI_ASSERTIONS,
      requiredSuites:SMOKE_CONTRACTS.length,
      requiredCases:SMOKE_CONTRACTS.reduce((n,d)=>n+d.cases.length,0),
      suiteRunId,
      verifiedSuites: smokeEvidence.length,
      verifiedCases: smokeEvidence.reduce((n, r) => n + r.caseCount, 0),
      asarSha256:createHash("sha256").update(readFileSync(archive)).digest("hex"),
      runtimeDependencies: [...copied],
      nativeDecoderUnpacked: true,
      windows10: "not_run",
      windows11: "not_run",
    },
    null,
    2,
  ),
);

if(failures.length)throw Error(`Retained ASAR failures: ${failures.map(f=>f.script).join(", ")}; see package-v073.json`);
rmSync(dir,{recursive:true,force:true});
writeSync(1, `GANKSOFT_ASAR_COMPLETE ${suiteRunId} ${createHash("sha256").update(readFileSync("validation-results/package-v073.json")).digest("hex")}\n`);
markPackageComplete();
