import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { branchKey, runSteps } from "./core.mjs";

test("branch identities remain isolated after sanitizing and truncation", () => {
  for (const [a, b] of [
    ["feature/a/b", "feature/a-b"],
    ["x".repeat(70) + "a", "x".repeat(70) + "b"],
  ])
    assert.notEqual(branchKey(a), branchKey(b));
  assert.match(branchKey("feature/图片"), /^[a-zA-Z0-9._-]+$/);
});
test("a real failing child blocks subsequent build and retains its failure log", () => {
  const dir = mkdtempSync(join(tmpdir(), "gank-ci-failure-")),
    report = join(dir, "report.json"),
    artifact = join(dir, "should-not-exist");
  assert.throws(
    () =>
      runSteps(
        [
          {
            name: "failure",
            command: process.execPath,
            args: [
              "-e",
              "console.error('intentional gate probe');process.exit(7)",
            ],
          },
          {
            name: "build",
            command: process.execPath,
            args: [
              "-e",
              `require('node:fs').writeFileSync(${JSON.stringify(artifact)},'invalid')`,
            ],
          },
        ],
        report,
      ),
    /Quality gate failed/,
  );
  const r = JSON.parse(readFileSync(report));
  assert.equal(r.status, "FAIL");
  assert.equal(r.steps[0].exitCode, 7);
  assert.equal(r.steps[1].status, "NOT_RUN");
  assert.equal(existsSync(artifact), false);
  assert.match(
    readFileSync(join(dir, r.steps[0].log), "utf8"),
    /intentional gate probe/,
  );
});
test("successful steps produce PASS only after all subprocesses finish", () => {
  const path = join(
    mkdtempSync(join(tmpdir(), "gank-ci-pass-")),
    "report.json",
  );
  assert.equal(
    runSteps(
      [
        {
          name: "test",
          command: process.execPath,
          args: ["-e", "process.exit(0)"],
        },
      ],
      path,
    ).status,
    "PASS",
  );
});

test("new branch task initialization archives history without reusing progress, and refuses destructive retries", () => {
  const cwd = mkdtempSync(join(tmpdir(), "gank-task-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  git("init", "-b", "feature/new-task");
  const dir = join(cwd, "docs/development");
  mkdirSync(dir, { recursive: true });
  for (const name of ["PLAN", "PROGRESS", "HANDOFF", "TEST_REPORT"])
    writeFileSync(join(dir, name + ".md"), "old task DONE\n");
  writeFileSync(
    join(dir, "TASK.json"),
    JSON.stringify({ branch: "feature/old-task" }),
  );
  git("add", ".");
  git(
    "-c",
    "user.name=CI Fixture",
    "-c",
    "user.email=ci@example.invalid",
    "commit",
    "-m",
    "fixture baseline",
  );
  const baseline = git("rev-parse", "HEAD");
  const script = resolve("tools/development/init-task.mjs");
  const run = () =>
    spawnSync(process.execPath, [script, baseline, "new feature"], {
      cwd,
      encoding: "utf8",
    });
  assert.equal(run().status, 0);
  const task = JSON.parse(readFileSync(join(dir, "TASK.json")));
  assert.equal(task.branch, "feature/new-task");
  assert.equal(task.baselineSha, baseline);
  assert.equal(task.status, "NOT_STARTED");
  assert.doesNotMatch(
    readFileSync(join(dir, "PROGRESS.md"), "utf8"),
    /old task DONE/,
  );
  const history = join(dir, "history", readdirSync(join(dir, "history"))[0]);
  assert.equal(
    readFileSync(join(history, "PROGRESS.md"), "utf8"),
    "old task DONE\n",
  );
  assert.notEqual(run().status, 0); // dirty inherited-state edits are preserved
  git("add", ".");
  git(
    "-c",
    "user.name=CI Fixture",
    "-c",
    "user.email=ci@example.invalid",
    "commit",
    "-m",
    "initialize task",
  );
  assert.match(run().stderr, /already initialized/);
  git("checkout", "-b", "main");
  assert.match(run().stderr, /named task branch/);
});

// Deliberately failing isolated branch: proves needs blocks Windows packaging.
test('intentional remote gate probe - never merge this branch', () => { assert.fail('EXPECTED_GATE_PROBE_FAILURE'); });
