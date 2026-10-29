import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import {
  runCheckedSmoke,
  verifySmokeEvidence,
} from "../validation/checked-smoke.mjs";
import { digest, contractDigest } from "../validation/smoke-evidence.mjs";
import { SMOKE_CONTRACTS, RETIRED_UI_ASSERTIONS } from "../validation/smoke-contracts.mjs";
const helper = pathToFileURL(
  resolve("tools/validation/smoke-evidence.mjs"),
).href;
const definition = {
  script: "fixture.mjs",
  resultField: "cases",
  cases: ["first", "last"],
  errorsRequired: true,
  asarRequired: true,
};
const good = {
  platform: process.platform,
  asar: true,
  cases: ["first", "last"],
  errors: [],
};
function fixture(body, guard = true) {
  const dir = mkdtempSync(join(tmpdir(), "gank-integrity 日期 ")),
    script = join(dir, "fixture.mjs"),
    target = join(dir, "test app.asar"),
    root = join(dir, "reports");
  writeFileSync(target, "synthetic archive; never executed");
  writeFileSync(
    script,
    `import {startSmoke} from ${JSON.stringify(helper)};import{readFileSync,writeFileSync,unlinkSync}from'node:fs';\n${guard ? `const finish=startSmoke(import.meta.url,${JSON.stringify(definition)});` : ""}\n${body}`,
  );
  return {
    dir,
    script,
    target,
    root,
    close() {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
function invoke(f, options = {}) {
  return runCheckedSmoke({
    script: f.script,
    target: f.target,
    root: f.root,
    definition,
    ...options,
  });
}
function receipts(f) {
  return readdirSync(f.root).map((n) =>
    JSON.parse(readFileSync(join(f.root, n, "verification.json"), "utf8")),
  );
}
function rejected(body, reason, guard = true, options = {}) {
  const f = fixture(body, guard);
  try {
    assert.throws(() => invoke(f, options), reason);
    const r = receipts(f);
    assert.equal(r.length, 1);
    assert.equal(r[0].status, "FAIL");
    return r[0];
  } finally {
    f.close();
  }
}
test("original status-only gate accepts actual exit0 with partial log; new gate rejects missing current result despite stale legacy JSON", () => {
  const f = fixture(`console.log('PASS first');process.exit(0);`, false);
  try {
    writeFileSync(join(f.dir, "legacy.json"), JSON.stringify(good));
    const old = spawnSync(process.execPath, [f.script, f.target], {
      encoding: "utf8",
    });
    assert.equal(old.status, 0);
    assert.match(old.stdout, /PASS first/);
    assert.throws(() => invoke(f), /Missing\/invalid current result/);
    assert.equal(receipts(f)[0].status, "FAIL");
    assert(existsSync(join(f.dir, "legacy.json")));
  } finally {
    f.close();
  }
});
test("recorder converts explicit early exit0 and natural fallthrough without completion into nonzero", () => {
  for (const body of [
    "console.log('PASS first');process.exit(0);",
    "console.log('PASS first');",
  ]) {
    const r = rejected(body, /Smoke process failed: 1/);
    assert.equal(r.exitCode, 1);
  }
});
test("valid complete subprocess has exact case identities, nonce/file/hash/marker and durable PASS receipt", () => {
  const f = fixture(`finish(${JSON.stringify(good)});`);
  try {
    const r = invoke(f);
    assert.equal(r.status, "PASS");
    assert.equal(r.caseCount, 2);
    const p = JSON.parse(readFileSync(resolve(r.resultFile), "utf8"));
    assert.deepEqual(p.cases, ["first", "last"]);
    assert.equal(p.runId, r.runId);
    assert.equal(digest(readFileSync(resolve(r.resultFile))), r.resultSha256);
    assert.equal(receipts(f)[0].status, "PASS");
  } finally {
    f.close();
  }
});
for (const [name, result] of [
  ["insufficient cases", { ...good, cases: ["first"] }],
  ["duplicate case", { ...good, cases: ["first", "first"] }],
  [
    "wrong identity with correct count",
    { ...good, cases: ["first", "unknown"] },
  ],
  ["reordered cases", { ...good, cases: ["last", "first"] }],
  ["errors present", { ...good, errors: ["renderer crash"] }],
  ["errors malformed", { ...good, errors: "none" }],
  ["wrong platform", { ...good, platform: "invalid" }],
  ["wrong target type", { ...good, asar: false }],
  ["wrong version", { ...good, version: "0.0.0" }],
])
  test(`recorder rejects ${name} and retains failed invocation evidence`, () => {
    rejected(`finish(${JSON.stringify(result)});`, /Smoke process failed:/);
  });
test("exceptions/nonzero after complete evidence still reject", () => {
  rejected(
    `finish(${JSON.stringify(good)});throw Error('after completion');`,
    /Smoke process failed: 1/,
  );
});
test("signal termination cannot be converted into PASS even after valid completion", () => {
  const r = rejected(
    `finish(${JSON.stringify(good)});process.kill(process.pid,'SIGTERM');`,
    /Smoke process failed:/,
  );
  assert(r.signal !== null || r.exitCode !== 0);
});
test("timeout is rejected with retained timeout code, never accepted as partial success", () => {
  const r = rejected(
    "setInterval(()=>{},1000);",
    /Smoke process failed: ETIMEDOUT/,
    false,
    { timeout: 100 },
  );
  assert.equal(r.error, "ETIMEDOUT");
});
test("missing and malformed final JSON reject even with authentic completion marker", () => {
  rejected(
    `finish(${JSON.stringify(good)});unlinkSync(process.env.GANKSOFT_SMOKE_RESULT);`,
    /Missing\/invalid current result/,
  );
  rejected(
    `finish(${JSON.stringify(good)});writeFileSync(process.env.GANKSOFT_SMOKE_RESULT,'{');`,
    /Invalid result JSON/,
  );
});
test("parent independently rejects tampered nonce/source/target/contract/count/result/marker with valid child exit0", () => {
  const f = fixture(`finish(${JSON.stringify(good)});`);
  try {
    const r = invoke(f),
      output = resolve(r.resultFile),
      original = readFileSync(output, "utf8"),
      proof = JSON.parse(original);
    const expected = Object.fromEntries(
      [
        "version",
        "runId",
        "script",
        "scriptSha256",
        "targetSha256",
        "contractSha256",
        "platform",
      ].map((k) => [k, r[k]]),
    );
    const verify = (text, stdout) => {
      writeFileSync(output, text);
      return verifySmokeEvidence({
        execution: { status: 0, signal: null, stdout },
        output,
        expected,
        definition,
      });
    };
    const marker = `GANKSOFT_SMOKE_COMPLETE ${r.runId} ${digest(original)}`;
    assert.throws(() => verify(original, ""), /completion marker/);
    assert.throws(
      () => verify(original, marker + "\n" + marker),
      /completion marker/,
    );
    for (const key of [
      "version",
      "runId",
      "script",
      "scriptSha256",
      "targetSha256",
      "contractSha256",
      "platform",
    ]) {
      const p = { ...proof, [key]: "stale" };
      const text = JSON.stringify(p);
      assert.throws(
        () =>
          verify(text, `GANKSOFT_SMOKE_COMPLETE ${r.runId} ${digest(text)}`),
        new RegExp("binding mismatch: " + key),
      );
    }
    assert.throws(
      () => verify(JSON.stringify({ ...proof, caseCount: 1 }), marker),
      /case count/,
    );
    assert.throws(
      () => verify(JSON.stringify({ ...proof, status: "FAIL" }), marker),
      /schema\/status/,
    );
    assert.throws(
      () =>
        verify(
          JSON.stringify({ ...proof, result: { ...good, cases: ["first"] } }),
          marker,
        ),
      /Incomplete case count/,
    );
    assert.throws(() => verify(original + " ", marker), /completion marker/);
    assert.equal(verify(original, marker + "\r\n").caseCount, 2);
  } finally {
    f.close();
  }
});
test("consecutive invocations have fresh directories and cannot reuse previous proof or log", () => {
  const f = fixture(`finish(${JSON.stringify(good)});`);
  try {
    const first = invoke(f),
      old = readFileSync(resolve(first.resultFile), "utf8");
    writeFileSync(
      f.script,
      `import{writeFileSync}from'node:fs';writeFileSync(process.env.GANKSOFT_SMOKE_RESULT,${JSON.stringify(old)});console.log(${JSON.stringify(`GANKSOFT_SMOKE_COMPLETE ${first.runId} ${digest(old)}`)});`,
    );
    assert.throws(() => invoke(f), /binding mismatch/);
    const rr = receipts(f);
    assert.deepEqual(rr.map((r) => r.status).sort(), ["FAIL", "PASS"]);
    assert.notEqual(rr[0].runId, rr[1].runId);
    assert.equal(readFileSync(resolve(first.resultFile), "utf8"), old);
  } finally {
    f.close();
  }
});
test("reviewed retained business manifest has 13 suites and 107 current semantic case identities", () => {
  assert.equal(SMOKE_CONTRACTS.length, 13);
  assert.equal(
    SMOKE_CONTRACTS.reduce((n, d) => n + d.cases.length, 0),
    107,
  );
  for (const d of SMOKE_CONTRACTS) {
    assert.equal(new Set(d.cases).size, d.cases.length);
    const s = readFileSync(d.script, "utf8");
    assert.match(s, /startSmoke\(import.meta.url\)/);
    assert.match(s, /finishSmoke\(/);
    for (const id of d.cases)
      assert(s.includes(id), `Missing source case: ${id}`);
  }
  assert.equal(
    SMOKE_CONTRACTS.find((d) => d.script.endsWith("smoke-v070.mjs")).cases
      .length,
    15,
  );
  assert.equal(contractDigest(definition).length, 64);
});

test("aggregate completion guard refuses parent exit0 before all suites/summary, permits explicit final completion", () => {
  for (const complete of [false, true]) {
    const r = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import{completionGuard}from ${JSON.stringify(helper)};const done=completionGuard('aggregate');${complete ? "done();" : ""}`,
      ],
      { encoding: "utf8" },
    );
    assert.equal(r.status, complete ? 0 : 1);
    if (!complete) assert.match(r.stderr, /SMOKE_INCOMPLETE aggregate/);
  }
});

test('retired appearance assertions cannot silently return; reviewed business contracts remain complete',()=>{
 assert.equal(RETIRED_UI_ASSERTIONS.length,5);
 const v070=readFileSync('tools/smoke-v070.mjs','utf8');
 assert.doesNotMatch(v070,/--bgcolor|#f8faf7|headerAfter.height, 48/);
 assert.doesNotMatch(readFileSync('tools/smoke-v071.mjs','utf8'),/header.height, 48/);
 assert.doesNotMatch(readFileSync('tools/smoke-study-pages.mjs','utf8'),/geometry.home <= 44/);
 for(const item of RETIRED_UI_ASSERTIONS){assert(SMOKE_CONTRACTS.some(d=>d.script===item.script));assert(item.replacement.length>0);}
});
