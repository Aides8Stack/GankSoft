// Explicit historical performance experiment. Not matched by the daily top-level test glob.
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
  realpathSync,
  lstatSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import {
  runBootstrapProcess,
  assertBootstrapSucceeded,
} from "../bootstrap-process.mjs";
import {
  collectDirectoryComparison,
  retainComparison,
  assertComparisonPassed,
  actualPathRoot,
  lastNpmPhase,
} from "../bootstrap-directory-comparison.mjs";
const repo = process.cwd(),
  hash = (b) => createHash("sha256").update(b).digest("hex");
const npmCli = [
  process.env.npm_execpath,
  join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
  join(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
].find((p) => p && existsSync(p));
test("explicit bounded historical C/D performance comparison (B is not isolation acceptance)", async () => {
  assert(npmCli);
  const dir = mkdtempSync(join(tmpdir(), "gank bootstrap 日期 ")),
    coordinator = join(dir, "coordinator");
  mkdirSync(coordinator);
  mkdirSync(join(coordinator, "tools"));
  cpSync(join(repo, "tools/pipeline"), join(coordinator, "tools/pipeline"), {
    recursive: true,
  });
  for (const name of ["package.json", "package-lock.json"])
    cpSync(join(repo, name), join(coordinator, name));
  writeFileSync(
    join(coordinator, "plan.json"),
    JSON.stringify({ intents: [] }),
  );
  const before = hash(readFileSync(join(coordinator, "package-lock.json")));
  mkdirSync(join(repo, "validation-results/bootstrap"), { recursive: true });
  const evidenceRoot = mkdtempSync(
    join(repo, "validation-results/bootstrap/experiment-"),
  );
  const env = {
    ...process.env,
    npm_execpath: npmCli,
    NODE_ENV: "production",
    npm_config_omit: "dev",
    npm_config_offline: "true",
  };
  const run = (cwd, args, environment) =>
    runBootstrapProcess(cwd, args, environment, evidenceRoot);
  try {
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
        Object.keys(JSON.parse(contents["package-lock.json"]).packages).length -
        1,
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
            cpSync(join(repo, "tools/pipeline"), join(path, "tools/pipeline"), {
              recursive: true,
            });
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
                readdirSync(join(installation.evidenceDir, "npm-logs")).some(
                  (name) => name.endsWith("-timing.json"),
                ),
              );
              return true;
            });
            for (const mode of ["quality", "security", "package"])
              check(mode, () => {
                const result = runBootstrapProcess(
                  path,
                  ["tools/pipeline/batch.mjs", mode, "plan.json", "results"],
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
              status: Object.values(checks).every((c) => c.status === "PASS")
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
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  }
});
