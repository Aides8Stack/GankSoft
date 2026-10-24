import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runBootstrapProcess,
  assertBootstrapSucceeded,
  BOOTSTRAP_TIMEOUT_MS,
  BOOTSTRAP_MAX_BUFFER,
} from "./bootstrap-process.mjs";
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "bootstrap process 日期 ")),
    source = join(root, "source"),
    evidence = join(root, "reports");
  mkdirSync(source);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { source, evidence };
}
function report(r) {
  return JSON.parse(readFileSync(join(r.evidenceDir, "result.json"), "utf8"));
}
test("bootstrap evidence keeps actual stdout/stderr and npm logs after source cleanup, without recording ambient env", (t) => {
  const f = fixture(t),
    r = runBootstrapProcess(
      f.source,
      [
        "-e",
        `const fs=require('node:fs');fs.mkdirSync(process.env.npm_config_logs_dir,{recursive:true});fs.writeFileSync(process.env.npm_config_logs_dir+'/fixture-timing.json','{"timer":1}');console.log('诊断stdout');console.error('诊断stderr');`,
      ],
      {
        ...process.env,
        BOOTSTRAP_PRIVATE_TEST_VALUE: "private-environment-sentinel",
      },
      f.evidence,
    );
  assertBootstrapSucceeded(r);
  rmSync(f.source, { recursive: true });
  const d = report(r);
  assert.equal(d.status, 0);
  assert.equal(d.signal, null);
  assert.equal(d.error, null);
  assert.equal(d.timeoutMs, 120000);
  assert.equal(d.maxBuffer, 4 * 1024 * 1024);
  assert(d.elapsedMs > 0);
  assert.equal(
    readFileSync(join(r.evidenceDir, "stdout.txt"), "utf8"),
    "诊断stdout\n",
  );
  assert.equal(
    readFileSync(join(r.evidenceDir, "stderr.txt"), "utf8"),
    "诊断stderr\n",
  );
  assert(existsSync(join(r.evidenceDir, "npm-logs/fixture-timing.json")));
  assert(!JSON.stringify(d).includes("private-environment-sentinel"));
});
test("bootstrap nonzero child keeps output and is never a successful install", (t) => {
  const f = fixture(t),
    r = runBootstrapProcess(
      f.source,
      [
        "-e",
        "console.log('before rejection');console.error('expected failure');process.exit(7)",
      ],
      process.env,
      f.evidence,
    );
  assert.equal(r.status, 7);
  assert.equal(report(r).status, 7);
  assert.match(
    readFileSync(join(r.evidenceDir, "stderr.txt"), "utf8"),
    /expected failure/,
  );
  assert.throws(() => assertBootstrapSucceeded(r));
});
test("bootstrap real bounded timeout retains null status, error code, signal and elapsed; rejects success", (t) => {
  const f = fixture(t),
    r = runBootstrapProcess(
      f.source,
      ["-e", "setInterval(()=>{},1000)"],
      process.env,
      f.evidence,
      { timeoutMs: 300 },
    );
  const d = report(r);
  assert.equal(r.status, null);
  assert.equal(r.error.code, "ETIMEDOUT");
  assert.equal(d.error.code, "ETIMEDOUT");
  assert.equal(d.signal, r.signal);
  assert.equal(d.status, null);
  assert(d.elapsedMs >= 200);
  assert.throws(() => assertBootstrapSucceeded(r));
});
test("bootstrap buffer exhaustion retains ENOBUFS and cannot turn captured partial output into PASS", (t) => {
  const f = fixture(t),
    r = runBootstrapProcess(
      f.source,
      [
        "-e",
        "process.stdout.write('x'.repeat(32768));setInterval(()=>{},1000)",
      ],
      process.env,
      f.evidence,
      { maxBuffer: 1024 },
    );
  assert.equal(r.error.code, "ENOBUFS");
  assert.equal(report(r).error.code, "ENOBUFS");
  assert(readFileSync(join(r.evidenceDir, "stdout.txt")).length > 0);
  assert.throws(() => assertBootstrapSucceeded(r));
});
test("bootstrap diagnostics cannot remove or expand the original timeout/buffer bound, or reuse old proof", (t) => {
  const f = fixture(t);
  assert.equal(BOOTSTRAP_TIMEOUT_MS, 120000);
  assert.equal(BOOTSTRAP_MAX_BUFFER, 4 * 1024 * 1024);
  for (const timeoutMs of [0, -1, Infinity, 120001])
    assert.throws(() =>
      runBootstrapProcess(f.source, ["-e", ""], process.env, f.evidence, {
        timeoutMs,
      }),
    );
  const a = runBootstrapProcess(f.source, ["-e", ""], process.env, f.evidence),
    b = runBootstrapProcess(f.source, ["-e", ""], process.env, f.evidence);
  assert.notEqual(a.evidenceDir, b.evidenceDir);
  assertBootstrapSucceeded(a);
  assertBootstrapSucceeded(b);
  assert.throws(() =>
    assertBootstrapSucceeded({ status: null, signal: null, error: undefined }),
  );
});

test("comparison children share the identical environment and retain only their own npm log snapshot", (t) => {
  const f = fixture(t),
    npmLogsDir = join(f.evidence, "shared-npm-logs"),
    results = [];
  for (const name of ["first", "second"]) {
    const r = runBootstrapProcess(
      f.source,
      [
        "-e",
        `require('node:fs').writeFileSync(require('node:path').join(process.env.npm_config_logs_dir,'${name}-timing.json'),'{}')`,
      ],
      process.env,
      f.evidence,
      { npmLogsDir },
    );
    assertBootstrapSucceeded(r);
    results.push(r);
    assert.deepEqual(readdirSync(join(r.evidenceDir, "npm-logs")), [
      name + "-timing.json",
    ]);
    assert.equal(report(r).timeoutMs, 120000);
    assert.equal(report(r).maxBuffer, 4194304);
  }
  assert.equal(
    report(results[0]).environmentHash,
    report(results[1]).environmentHash,
  );
  rmSync(f.source, { recursive: true });
  rmSync(npmLogsDir, { recursive: true });
  assert(
    existsSync(join(results[0].evidenceDir, "npm-logs/first-timing.json")),
  );
  assert(
    existsSync(join(results[1].evidenceDir, "npm-logs/second-timing.json")),
  );
});
