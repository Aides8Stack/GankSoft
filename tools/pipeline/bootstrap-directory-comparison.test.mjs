import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectDirectoryComparison,
  assertComparisonPassed,
  actualPathRoot,
  lastNpmPhase,
  retainComparison,
} from "./bootstrap-directory-comparison.mjs";
const pass = (group, elapsedMs = 1000) => ({
  group,
  platform: "win32",
  path: `${group === "A" ? "C" : "D"}:\\fixture 日期\\coordinator`,
  pathRoot: group === "A" ? "C:\\" : "D:\\",
  status: 0,
  signal: null,
  error: null,
  elapsedMs,
  validation: { status: "PASS" },
});
const timeout = (group) => ({
  ...pass(group, 120001),
  status: null,
  signal: "SIGTERM",
  error: { code: "ETIMEDOUT" },
  validation: { status: "NOT_RUN" },
});
test("A timeout still executes B; reverse B/A only once and never erases an initial failure", async () => {
  const order = [],
    persisted = [];
  let active = false;
  const report = await collectDirectoryComparison({
    async attempt(group, number) {
      assert.equal(active, false);
      active = true;
      order.push(group + number);
      await Promise.resolve();
      active = false;
      return group === "A" && number === 1 ? timeout(group) : pass(group);
    },
    persist(rows) {
      persisted.push(rows.map((r) => r.group + r.attempt));
    },
  });
  assert.deepEqual(order, ["A1", "B1", "B2", "A2"]);
  assert.deepEqual(persisted[0], ["A1"]);
  assert.equal(persisted.length, 4);
  assert.equal(report.summary.status, "FAIL");
  assert.equal(report.summary.directoryDifference, "NOT_ESTABLISHED");
  assert.throws(
    () => assertComparisonPassed(report),
    /all failed attempts remain gated/,
  );
});
test("both timeouts execute exactly twice; pending root cause is not a platform outage conclusion", async () => {
  const report = await collectDirectoryComparison({
    attempt: async (g) => timeout(g),
  });
  assert.equal(report.rows.length, 2);
  assert.equal(report.summary.installConclusion, "BOTH_LOCATIONS_TIMED_OUT");
  assert.equal(report.summary.directoryDifference, "NOT_ESTABLISHED");
  assert.throws(() => assertComparisonPassed(report));
});
test("two comparable successes mean not reproduced, without a speculative fix or reverse retry", async () => {
  const report = await collectDirectoryComparison({
    attempt: async (g) => pass(g, g === "A" ? 6000 : 5000),
  });
  assert.equal(report.rows.length, 2);
  assert.equal(report.summary.installConclusion, "FAILURE_NOT_REPRODUCED");
  assert.equal(report.summary.directoryDifference, "NOT_ESTABLISHED");
  assertComparisonPassed(report);
});
test("repeated direction with a twofold/10s difference is only directory associated", async () => {
  const report = await collectDirectoryComparison({
    attempt: async (g) => pass(g, g === "A" ? 30000 : 5000),
  });
  assert.deepEqual(
    report.rows.map((r) => r.group + r.attempt),
    ["A1", "B1", "B2", "A2"],
  );
  assert.equal(
    report.summary.directoryDifference,
    "DIRECTORY_ASSOCIATED_DIFFERENCE",
  );
  assert.equal(report.summary.slowerGroup, "A");
  assert.equal(report.summary.expectedCD, true);
  assert.match(
    report.summary.interpretation,
    /does not identify a physical disk or antivirus/,
  );
  assertComparisonPassed(report);
});
test("setup failure cannot stop B or count as success; validation failure stays gated", async () => {
  const report = await collectDirectoryComparison({
    attempt: async (g, n) => {
      if (g === "A" && n === 1) throw Error("fixture setup failed");
      return {
        ...pass(g),
        ...(g === "B" ? { setupError: "environment mismatch" } : {}),
      };
    },
  });
  assert.deepEqual(
    report.rows.map((r) => r.group),
    ["A", "B"],
  );
  assert.equal(report.summary.status, "FAIL");
  assert.throws(() => assertComparisonPassed(report));
  const failed = await collectDirectoryComparison({
    attempt: async (g) => ({
      ...pass(g),
      validation: { status: "FAIL", checks: { lock: { status: "FAIL" } } },
    }),
  });
  assert.equal(failed.rows.length, 2);
  assert.equal(failed.summary.status, "FAIL");
  assert.throws(() => assertComparisonPassed(failed));
});
test("timing difference below either threshold does not cause extra full-lock installs", async () => {
  for (const times of [
    [15000, 9000],
    [18000, 9000],
  ]) {
    const report = await collectDirectoryComparison({
      attempt: async (g) => pass(g, times[g === "A" ? 0 : 1]),
    });
    assert.equal(report.rows.length, 2);
  }
});
test("actual roots and reports do not pretend Linux or same-drive paths are C/D evidence", async (t) => {
  assert.equal(actualPathRoot("c:\\Temp\\日期", "win32"), "C:\\");
  assert.equal(actualPathRoot("/tmp/日期", "linux"), "/");
  for (const row of [
    { platform: "linux", pathRoot: "/" },
    { platform: "win32", pathRoot: "C:\\" },
  ]) {
    const report = await collectDirectoryComparison({
      attempt: async (g) => ({ ...pass(g), ...row }),
    });
    assert.equal(report.summary.expectedCD, false);
  }
  const root = mkdtempSync(join(tmpdir(), "directory evidence 日期 "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(
    join(root, "stderr.txt"),
    "npm timing reifyNode:node_modules/yaml Completed in 2ms\nnpm timing reifyNode:node_modules/@milkdown/crepe Completed in 112667ms\npartial unfinished output\n",
  );
  const phase = lastNpmPhase(root);
  assert.deepEqual(phase, {
    stage: "reifyNode:node_modules/@milkdown/crepe",
    durationMs: 112667,
  });
  const report = await collectDirectoryComparison({
    attempt: async (g) => ({
      ...timeout(g),
      lastNpmPhase: phase,
      pathRoot: "/",
      platform: "linux",
      packageHash: "pkg",
      lockHash: "lock",
      environmentHash: "env",
    }),
  });
  retainComparison(root, {
    ...report,
    platform: "linux",
    node: "fixture-node",
    npm: "fixture-npm",
    cache: "fixture-cache",
  });
  assert.equal(
    JSON.parse(readFileSync(join(root, "directory-comparison.json"))).rows
      .length,
    2,
  );
  const table = readFileSync(join(root, "directory-comparison.md"), "utf8");
  for (const field of [
    "Actual path",
    "Order/group",
    "lock SHA256",
    "ETIMEDOUT / SIGTERM / null",
    "NOT_RUN",
    "112667ms",
    "NO (see actual roots",
  ])
    assert(table.includes(field), field);
});

test("C/D classification uses the actual path parser, including Windows forward slash spelling", async () => {
  const report = await collectDirectoryComparison({
    attempt: async (group) => ({
      ...pass(group),
      pathRoot: actualPathRoot(
        group === "A" ? "C:/Temp/日期" : "D:/work/日期",
        "win32",
      ),
    }),
  });
  assert.equal(report.summary.expectedCD, true);
});
