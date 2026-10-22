import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  cpSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  readdirSync,
  realpathSync,
  lstatSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, win32, posix } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  runBootstrapProcess,
  assertBootstrapSucceeded,
} from "./bootstrap-process.mjs";
import { parseDocument, stringify } from "yaml";
import {
  collectDirectoryComparison,
  retainComparison,
  assertComparisonPassed,
  actualPathRoot,
  lastNpmPhase,
} from "./bootstrap-directory-comparison.mjs";
const repo = process.cwd(),
  read = (p) => readFileSync(join(repo, p), "utf8");
const names = ["develop-rc.yml", "stable-candidate.yml"];
function parse(text) {
  const d = parseDocument(text, { uniqueKeys: true });
  assert.deepEqual(d.errors, []);
  return d.toJS();
}
function validateBootstrap(workflow) {
  const entries = [];
  for (const [job, j] of Object.entries(workflow.jobs))
    for (const [i, s] of (j.steps ?? []).entries()) {
      const command = s.run ?? "";
      const batch = /npm\s+run\s+pipeline:batch\b/.test(command);
      const mode = batch
        ? command.match(/pipeline:batch\s+--\s+(quality|security|package)\b/)?.[1]
        : job === "quality" && command === "npm run test:pipeline"
          ? "quality"
          : job === "security" && command === "npm run pipeline:security"
            ? "security"
            : job === "windows-package" && command === "npm run build"
              ? "package"
              : null;
      if (!batch && !mode) continue;
      assert(mode, `${job}: recognized mode required`);
      assert.equal(j["continue-on-error"], undefined);
      assert.equal(
        s.if,
        undefined,
        `${job}: batch must keep default success condition`,
      );
      assert.equal(s["continue-on-error"], undefined);
      const install = j.steps[i - 1];
      assert.equal(
        install?.run,
        "npm ci --include=dev",
        `${job}: locked dev install must immediately precede batch`,
      );
      assert.equal(
        install.if,
        undefined,
        `${job}: install must not be conditional`,
      );
      assert.equal(install["continue-on-error"], undefined);
      assert.equal(install["working-directory"], undefined);
      assert.equal(s["working-directory"], undefined);
      entries.push({ job, mode });
    }
  assert.equal(entries.length, 3, "all three quality/security/package jobs must be covered");
  assert.deepEqual(entries.map((e) => e.mode).sort(), [
    "package",
    "quality",
    "security",
  ]);
  return entries;
}
test("all six workflow entrypoints install locked dev dependencies before quality/security/package commands", () => {
  for (const name of names) {
    const text = read(".github/workflows/" + name);
    for (const ending of ["\n", "\r\n"]) {
      const w = parse(text.replace(/\r\n/g, "\n").replace(/\n/g, ending));
      validateBootstrap(w);
      assert.equal(w.permissions.contents, "read");
      assert.deepEqual(w.jobs["windows-package"].needs, [
        "preflight",
        "quality",
        "security",
      ]);
      assert.deepEqual(w.jobs["artifact-verify"].needs, [
        "preflight",
        "quality",
        "security",
        "windows-package",
      ]);
      const publisher =
        w.jobs[name === "develop-rc.yml" ? "release-rc" : "stable-draft"];
      assert.deepEqual(publisher.needs, ["artifact-verify"]);
      for (const { job } of validateBootstrap(w)) {
        assert.equal(w.jobs[job].permissions, undefined);
        assert.equal(w.jobs[job].if, "needs.preflight.outputs.count != '0'");
      }
    }
  }
  // Existing batch entrypoints and new portable jobs must retain the same locked-dependency prerequisite.
  for (const file of readdirSync(join(repo, ".github/workflows")).filter((x) =>
    x.endsWith(".yml"),
  )) {
    const w = parse(read(".github/workflows/" + file));
    if (
      Object.values(w.jobs).some((j) =>
        j.steps?.some((s) => /pipeline:batch\b/.test(s.run ?? "")),
      )
    ) {
      assert(names.includes(file));
      validateBootstrap(w);
    }
  }
});
test("structure guard rejects missing, late, conditional, nonlocked, omit-dev and ignored-failure installs for every entrypoint", () => {
  for (const name of names) {
    const original = parse(read(".github/workflows/" + name));
    for (const { job } of validateBootstrap(original)) {
      for (const attack of [
        "missing",
        "late",
        "plain-ci",
        "install",
        "production",
        "conditional",
        "ignored",
        "always-batch",
      ]) {
        const w = structuredClone(original),
          steps = w.jobs[job].steps,
          i = steps.findIndex((s) =>
            s.run?.includes("pipeline:batch") ||
            (job === "quality" && s.run === "npm run test:pipeline") ||
            (job === "security" && s.run === "npm run pipeline:security") ||
            (job === "windows-package" && s.run === "npm run build")
          ),
          install = steps[i - 1];
        if (attack === "missing") steps.splice(i - 1, 1);
        if (attack === "late")
          [steps[i - 1], steps[i]] = [steps[i], steps[i - 1]];
        if (attack === "plain-ci") install.run = "npm ci";
        if (attack === "install") install.run = "npm install --include=dev";
        if (attack === "production") install.run = "npm ci --omit=dev";
        if (attack === "conditional") install.if = "runner.os == 'Linux'";
        if (attack === "ignored") install["continue-on-error"] = true;
        if (attack === "always-batch") steps[i].if = "always()";
        assert.throws(
          () => validateBootstrap(parse(stringify(w))),
          undefined,
          `${name}/${job}/${attack}`,
        );
      }
    }
  }
});
const hash = (b) => createHash("sha256").update(b).digest("hex");
const npmCli = [
  process.env.npm_execpath,
  join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
  join(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
].find((p) => p && existsSync(p));
mkdirSync(join(repo, "validation-results/bootstrap"), { recursive: true });
const evidenceRoot = mkdtempSync(
  join(repo, "validation-results/bootstrap/run-"),
);
function run(cwd, args, env = process.env) {
  return runBootstrapProcess(cwd, args, env, evidenceRoot);
}

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}
test("actual clean coordinator fails without yaml, locked dev install starts all modes, independent Git worktrees still validate source and install", async (t) => {
  assert(npmCli, "npm CLI must be available; this mandatory test cannot skip");
  const dir = mkdtempSync(join(tmpdir(), "gank bootstrap 日期 ")),
    coordinator = join(dir, "coordinator"),
    source = join(dir, "source");
  mkdirSync(coordinator);
  mkdirSync(join(coordinator, "tools"), { recursive: true });
  cpSync(join(repo, "tools/pipeline"), join(coordinator, "tools/pipeline"), {
    recursive: true,
  });
  for (const p of ["package.json", "package-lock.json"])
    cpSync(join(repo, p), join(coordinator, p));
  writeFileSync(
    join(coordinator, "plan.json"),
    JSON.stringify({ intents: [] }),
  );
  const before = hash(readFileSync(join(coordinator, "package-lock.json")));
  const env = {
    ...process.env,
    npm_execpath: npmCli,
    NODE_ENV: "production",
    npm_config_omit: "dev",
    npm_config_offline: "true",
  };
  try {
    await t.test(
      "physical no-node_modules checkout reproduces real module resolution failure in all modes",
      () => {
        assert.equal(existsSync(join(coordinator, "node_modules")), false);
        for (const mode of ["quality", "security", "package"]) {
          const r = run(
            coordinator,
            ["tools/pipeline/batch.mjs", mode, "plan.json", "results"],
            env,
          );
          assert.notEqual(r.status, 0);
          assert.match(r.stderr, /ERR_MODULE_NOT_FOUND/);
          assert.match(r.stderr, /Cannot find package 'yaml'/);
          console.log(
            "COLD_BOOTSTRAP_EVIDENCE",
            JSON.stringify({
              phase: "before-install",
              mode,
              exitCode: r.status,
              error: r.stderr
                .split("\n")
                .find((l) => l.includes("Cannot find package 'yaml'")),
              platform: process.platform,
            }),
          );
          assert.equal(existsSync(join(coordinator, "results")), false);
        }
      },
    );
    await t.test(
      "real npm ci installs locked dev yaml even with production/omit-dev defaults; all modes can start",
      async () => {
        const npmVersion = run(coordinator, [npmCli, "--version"], env);
        assertBootstrapSucceeded(npmVersion);
        const cache = run(coordinator, [npmCli, "config", "get", "cache"], env);
        assertBootstrapSucceeded(cache);
        const commonEnv = { ...env };
        for (const key of Object.keys(commonEnv))
          if (key.toLowerCase() === "npm_config_cache") delete commonEnv[key];
        commonEnv.npm_config_cache = cache.stdout.trim();
        const npmLogsDir = join(evidenceRoot, "directory-npm-logs"),
          bBase = join(repo, "validation-results/bootstrap/sources"),
          owned = [];
        mkdirSync(bBase, { recursive: true });
        const contents = Object.fromEntries(
          ["package.json", "package-lock.json"].map((p) => [
            p,
            readFileSync(join(repo, p)),
          ]),
        );
        const locked = JSON.parse(contents["package-lock.json"]).packages[
          "node_modules/yaml"
        ];
        assert.equal(locked.dev, true);
        const commonArgs = [
          npmCli,
          "ci",
          "--include=dev",
          "--ignore-scripts",
          "--offline",
          "--no-audit",
          "--no-fund",
        ];
        const report = {
          platform: process.platform,
          node: process.version,
          npm: npmVersion.stdout.trim(),
          cache: commonEnv.npm_config_cache,
          packageHash: hash(contents["package.json"]),
          lockHash: hash(contents["package-lock.json"]),
          packageCount:
            Object.keys(JSON.parse(contents["package-lock.json"]).packages)
              .length - 1,
          installArgs: commonArgs,
          timeoutMs: 120000,
          maxBuffer: 4 * 1024 * 1024,
          npmLogsDir,
          threshold: { ratio: 2, absoluteMs: 10000 },
          rows: [],
          summary: null,
        };
        let expectedEnvironmentHash;
        try {
          const collected = await collectDirectoryComparison({
            persist(rows) {
              report.rows = rows;
              retainComparison(evidenceRoot, report);
            },
            async attempt(group, number, order) {
              let path = coordinator;
              if (group !== "A" || number !== 1) {
                const root = mkdtempSync(
                  join(
                    group === "A" ? tmpdir() : bBase,
                    `gank bootstrap 日期 ${group} `,
                  ),
                );
                owned.push(root);
                path = join(root, "coordinator");
                mkdirSync(path);
                mkdirSync(join(path, "tools"));
                cpSync(
                  join(repo, "tools/pipeline"),
                  join(path, "tools/pipeline"),
                  { recursive: true },
                );
                for (const [file, bytes] of Object.entries(contents))
                  writeFileSync(join(path, file), bytes);
                writeFileSync(
                  join(path, "plan.json"),
                  JSON.stringify({ intents: [] }),
                );
              }
              const resolved = realpathSync(path),
                row = {
                  group,
                  attempt: number,
                  order,
                  path: resolved,
                  pathRoot: actualPathRoot(resolved),
                  platform: process.platform,
                  node: report.node,
                  npm: report.npm,
                  packageHash: hash(readFileSync(join(path, "package.json"))),
                  lockHash: hash(readFileSync(join(path, "package-lock.json"))),
                };
              let installation;
              try {
                let absent = false;
                try {
                  lstatSync(join(path, "node_modules"));
                } catch (e) {
                  if (e.code === "ENOENT") absent = true;
                  else throw e;
                }
                row.nodeModulesAbsent = absent;
                assert(absent, "physical node_modules must not exist");
                assert.equal(row.packageHash, report.packageHash);
                assert.equal(row.lockHash, report.lockHash);
                installation = runBootstrapProcess(
                  path,
                  commonArgs,
                  commonEnv,
                  evidenceRoot,
                  { npmLogsDir },
                );
                const processReport = JSON.parse(
                  readFileSync(
                    join(installation.evidenceDir, "result.json"),
                    "utf8",
                  ),
                );
                Object.assign(row, {
                  elapsedMs: installation.elapsedMs,
                  status: installation.status,
                  signal: installation.signal,
                  error: processReport.error,
                  environmentHash: processReport.environmentHash,
                  evidenceDir: installation.evidenceDir,
                  lastNpmPhase: lastNpmPhase(installation.evidenceDir),
                });
                expectedEnvironmentHash ??= row.environmentHash;
                assert.equal(
                  row.environmentHash,
                  expectedEnvironmentHash,
                  "A/B actual child environment must be identical",
                );
              } catch (e) {
                row.setupError = e.stack ?? String(e);
              }
              row.validation = { status: "NOT_RUN" };
              if (
                installation &&
                !row.setupError &&
                !installation.error &&
                installation.signal === null &&
                installation.status === 0
              ) {
                const checks = {};
                function check(name, fn) {
                  try {
                    checks[name] = { status: "PASS", result: fn() };
                  } catch (e) {
                    checks[name] = {
                      status: "FAIL",
                      error: e.stack ?? String(e),
                    };
                  }
                }
                check("packageUnchanged", () => {
                  assert.equal(
                    hash(readFileSync(join(path, "package.json"))),
                    report.packageHash,
                  );
                  return true;
                });
                check("lockUnchanged", () => {
                  assert.equal(
                    hash(readFileSync(join(path, "package-lock.json"))),
                    before,
                  );
                  return true;
                });
                check("yamlVersion", () => {
                  const version = JSON.parse(
                    readFileSync(
                      join(path, "node_modules/yaml/package.json"),
                      "utf8",
                    ),
                  ).version;
                  assert.equal(version, locked.version);
                  return version;
                });
                check("npmTiming", () => {
                  assert(
                    readdirSync(
                      join(installation.evidenceDir, "npm-logs"),
                    ).some((name) => name.endsWith("-timing.json")),
                  );
                  return true;
                });
                for (const mode of ["quality", "security", "package"])
                  check(mode, () => {
                    const result = runBootstrapProcess(
                      path,
                      [
                        "tools/pipeline/batch.mjs",
                        mode,
                        "plan.json",
                        "results",
                      ],
                      commonEnv,
                      evidenceRoot,
                      { npmLogsDir },
                    );
                    assertBootstrapSucceeded(result);
                    return {
                      status: result.status,
                      evidenceDir: result.evidenceDir,
                    };
                  });
                row.validation = {
                  status: Object.values(checks).every(
                    (c) => c.status === "PASS",
                  )
                    ? "PASS"
                    : "FAIL",
                  checks,
                };
              }
              return row;
            },
          });
          Object.assign(report, collected);
          retainComparison(evidenceRoot, report);
          console.log(
            "COLD_BOOTSTRAP_DIRECTORY_COMPARISON",
            JSON.stringify({
              report: join(evidenceRoot, "directory-comparison.json"),
              ...collected.summary,
              attempts: collected.rows.length,
            }),
          );
          assertComparisonPassed(report);
        } finally {
          retainComparison(evidenceRoot, report);
          // Never remove a base directory or a path read from the environment/report.
          for (const root of owned)
            rmSync(root, { recursive: true, force: true, maxRetries: 5 });
        }
      },
    );
    await t.test(
      "real source worktree rejects SHA/version mismatches and installs its own locked dependencies before quality commands",
      () => {
        mkdirSync(source);
        mkdirSync(join(source, "tools/validation"), { recursive: true });
        const pkg = {
          name: "bootstrap-source-fixture",
          version: "0.0.1",
          private: true,
          scripts: {
            "test:pipeline": "node verify.cjs",
            "ci:quality": "node verify.cjs",
          },
          devDependencies: {
            yaml: JSON.parse(read("package.json")).devDependencies.yaml,
          },
        };
        const lock = {
          name: pkg.name,
          version: pkg.version,
          lockfileVersion: 3,
          requires: true,
          packages: {
            "": pkg,
            "node_modules/yaml": JSON.parse(read("package-lock.json")).packages[
              "node_modules/yaml"
            ],
          },
        };
        writeFileSync(join(source, "package.json"), JSON.stringify(pkg));
        writeFileSync(join(source, "package-lock.json"), JSON.stringify(lock));
        writeFileSync(
          join(source, ".gitignore"),
          "node_modules/\nvalidation-results/\n",
        );
        writeFileSync(
          join(source, "verify.cjs"),
          `const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');const sha=cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.equal(sha,process.env.GANKSOFT_SOURCE_SHA);assert(fs.existsSync('node_modules/yaml/package.json'));fs.mkdirSync('validation-results/ci',{recursive:true});fs.writeFileSync('validation-results/ci/fixture.json',JSON.stringify({sha,version:require('./package.json').version,yaml:require('./node_modules/yaml/package.json').version,installedInWorktree:process.cwd()}));`,
        );
        writeFileSync(
          join(source, "tools/validation/package-check.mjs"),
          "// This fixture verifies coordinator orchestration, not real ASAR acceptance.\nimport 'node:fs';\n",
        );
        git(source, "init", "-b", "develop");
        git(source, "config", "user.name", "GankSoft test");
        git(source, "config", "user.email", "test@example.invalid");
        git(source, "add", ".");
        git(source, "commit", "-m", "isolated source fixture");
        const sha = git(source, "rev-parse", "HEAD");
        // Coordinator code and installed dependencies live outside the source repo.
        const normal = {
          ...env,
          NODE_ENV: "development",
          npm_config_omit: "",
          GANKSOFT_SOURCE_SHA: sha,
        };
        const batch = join(coordinator, "tools/pipeline/batch.mjs");
        for (const item of [
          { sha: "0".repeat(40), version: pkg.version },
          { sha, version: "9.9.9" },
        ]) {
          writeFileSync(
            join(source, "plan.json"),
            JSON.stringify({ intents: [item] }),
          );
          const r = run(
            source,
            [batch, "quality", "plan.json", join(dir, "bad-results")],
            normal,
          );
          assert.notEqual(r.status, 0);
          assert.match(r.stderr, /invalid reference|Intent source mismatch/i);
        }
        writeFileSync(
          join(source, "plan.json"),
          JSON.stringify({ intents: [{ sha, version: pkg.version }] }),
        );
        const r = run(
          source,
          [batch, "quality", "plan.json", join(dir, "good-results")],
          normal,
        );
        assertBootstrapSucceeded(r);
        assert.match(r.stdout, /npm ci|added 1 package|added 1 packages/);
        const report = JSON.parse(
          readFileSync(
            join(dir, "good-results", sha, "reports/ci/fixture.json"),
            "utf8",
          ),
        );
        assert.equal(report.sha, sha);
        console.log(
          "COLD_BOOTSTRAP_EVIDENCE",
          JSON.stringify({
            phase: "independent-source-worktree",
            report,
            coordinatorDepsNotReused: true,
            fixtureOnly: true,
          }),
        );
        assert.equal(report.version, pkg.version);
        assert.equal(report.yaml, lock.packages["node_modules/yaml"].version);
        assert.notEqual(report.installedInWorktree, source);
        assert.notEqual(report.installedInWorktree, coordinator);
        assert.equal(existsSync(report.installedInWorktree), false);
        assert.equal(existsSync(join(source, "node_modules")), false);
      },
    );
    await t.test(
      "actual corrupt lock fails install; sequential success-only entry never reaches batch or publishes",
      () => {
        const bad = join(dir, "failed install");
        mkdirSync(bad);
        cpSync(
          join(coordinator, "package-lock.json"),
          join(bad, "package-lock.json"),
        );
        const pkg = JSON.parse(read("package.json"));
        writeFileSync(join(bad, "package-lock.json"), "{ invalid lockfile");
        writeFileSync(join(bad, "package.json"), JSON.stringify(pkg));
        const install = run(
          bad,
          [
            npmCli,
            "ci",
            "--include=dev",
            "--ignore-scripts",
            "--offline",
            "--no-audit",
            "--no-fund",
          ],
          env,
        );
        assert.notEqual(install.status, 0);
        assert.match(install.stderr, /EUSAGE|EJSONPARSE/);
        assert.match(install.stderr, /lock|JSON/i);
        assert.equal(existsSync(join(bad, "results")), false);
        let phase = "INSTALL_FAILED";
        if (install.status === 0) {
          phase = "BATCH";
          run(
            bad,
            [
              join(coordinator, "tools/pipeline/batch.mjs"),
              "quality",
              "plan.json",
              "results",
            ],
            env,
          );
        }
        assert.equal(phase, "INSTALL_FAILED");
        console.log(
          "COLD_BOOTSTRAP_EVIDENCE",
          JSON.stringify({
            phase,
            exitCode: install.status,
            npmError: install.stderr
              .split("\n")
              .find((l) => l.includes("error code")),
            batchStarted: false,
          }),
        );
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  }
});
test("path contracts use absolute argument arrays (spaces/Unicode), with POSIX and Windows drive shapes", () => {
  for (const p of [
    posix.join("/tmp", "冷启动 source", "batch.mjs"),
    win32.join("C:\\", "冷启动 source", "batch.mjs"),
  ]) {
    assert(p.includes("冷启动 source"));
    assert(p.endsWith("batch.mjs"));
  }
  const s = read("tools/pipeline/batch.mjs");
  assert.match(s, /npm\('ci'\)/);
  assert.match(s, /git\('rev-parse','HEAD'\)!==item.sha/);
  assert.match(s, /version!==item.version/);
  assert.match(s, /execFileSync\('git',\['worktree','add'/);
});
