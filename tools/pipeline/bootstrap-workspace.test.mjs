import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  symlinkSync,
  readFileSync,
} from "node:fs";
import { join, win32 } from "node:path";
import {
  createColdBootstrapRoot,
  coldRootCandidates,
  assertCleanAncestors,
  resolutionProbeSource,
} from "./bootstrap-workspace.mjs";
import {
  runBootstrapProcess,
  assertBootstrapSucceeded,
} from "./bootstrap-process.mjs";
function fixture(t) {
  const owner = createColdBootstrapRoot({ repo: process.cwd() });
  t.after(owner.cleanup);
  const repo = join(owner.path, "project"),
    base = join(owner.path, "external 日期 base");
  mkdirSync(repo);
  mkdirSync(base);
  return { owner, repo, base };
}
test("Windows prefers RUNNER_TEMP then source sibling; no C-drive os.tmpdir fallback", () => {
  assert.deepEqual(
    coldRootCandidates({
      repo: "D:\\a\\GankSoft\\GankSoft",
      platform: "win32",
      runnerTemp: "D:\\a\\_temp",
      temp: "C:\\Temp",
    }),
    ["D:\\a\\_temp", "D:\\a\\GankSoft"],
  );
  assert.deepEqual(
    coldRootCandidates({
      repo: "D:\\a\\GankSoft\\GankSoft",
      platform: "win32",
      runnerTemp: null,
    }),
    ["D:\\a\\GankSoft"],
  );
});
test("fresh root is outside source, on actual D in Windows, has Chinese/spaces and cleanup touches only owned directory", (t) => {
  const { repo, base } = fixture(t);
  writeFileSync(join(base, "unrelated.txt"), "keep");
  const a = createColdBootstrapRoot({ repo, candidates: [repo, base] }),
    b = createColdBootstrapRoot({ repo, candidates: [base] });
  t.after(b.cleanup);
  assert.notEqual(a.path, b.path);
  assert.match(a.path, /gank bootstrap 日期 /);
  assert.equal(a.selection.rejected.length, 1);
  assert.equal(existsSync(join(a.path, "node_modules")), false);
  assertCleanAncestors(a.path, repo);
  if (process.platform === "win32")
    assert.equal(win32.parse(a.path).root.toUpperCase(), "D:\\");
  a.cleanup();
  assert.equal(existsSync(a.path), false);
  assert.equal(readFileSync(join(base, "unrelated.txt"), "utf8"), "keep");
  assert(existsSync(b.path));
});
test("source alias, source descendants and ancestor node_modules are rejected before real installs", (t) => {
  const { owner, repo, base } = fixture(t),
    inside = join(repo, "inside"),
    alias = join(owner.path, "source alias");
  mkdirSync(inside);
  symlinkSync(repo, alias, process.platform === "win32" ? "junction" : "dir");
  assert.throws(
    () => createColdBootstrapRoot({ repo, candidates: [inside, alias] }),
    /inside project source/,
  );
  mkdirSync(join(base, "node_modules"));
  assert.throws(
    () => createColdBootstrapRoot({ repo, candidates: [base] }),
    /Ancestor node_modules/,
  );
  assert(
    existsSync(join(base, "node_modules")),
    "reject must never remove ancestor dependency directory",
  );
});
test("a non-D or missing Windows base cannot silently fall back to C", (t) => {
  const { repo } = fixture(t);
  const candidate =
    process.platform === "win32"
      ? "C:\\Windows\\Temp"
      : "/nonexistent-ganksoft-cold-root";
  assert.throws(
    () => createColdBootstrapRoot({ repo, candidates: [candidate] }),
    process.platform === "win32" ? /D-drive|actually reside/ : /No isolated/,
  );
});
test("real ESM/CJS probe detects missing yaml and refuses ancestor resolution as installed-local proof", (t) => {
  const { repo, base } = fixture(t),
    child = createColdBootstrapRoot({ repo, candidates: [base] });
  t.after(child.cleanup);
  writeFileSync(join(child.path, "probe.mjs"), resolutionProbeSource);
  const reports = join(base, "reports"),
    r = runBootstrapProcess(
      child.path,
      ["probe.mjs", "absent"],
      process.env,
      reports,
    );
  assertBootstrapSucceeded(r);
  const absent = JSON.parse(r.stdout);
  assert.equal(absent.resolvers.esm.unresolved, true);
  assert.equal(absent.resolvers.cjs.unresolved, true);
  const modules = join(base, "node_modules"),
    yaml = join(modules, "yaml");
  mkdirSync(yaml, { recursive: true });
  writeFileSync(
    join(yaml, "package.json"),
    JSON.stringify({
      name: "yaml",
      version: "fixture",
      type: "module",
      exports: "./index.js",
    }),
  );
  writeFileSync(join(yaml, "index.js"), "export default {};\n");
  const contaminated = runBootstrapProcess(
    child.path,
    ["probe.mjs", "absent"],
    process.env,
    reports,
  );
  assert.notEqual(contaminated.status, 0);
  assert.match(contaminated.stderr, /unexpectedly resolved/);
  const escaped = runBootstrapProcess(
    child.path,
    ["probe.mjs", "installed"],
    process.env,
    reports,
  );
  assert.notEqual(escaped.status, 0);
  assert.match(escaped.stderr, /escaped fixture/);
  assert.throws(
    () => assertCleanAncestors(child.path, repo),
    /Ancestor node_modules/,
  );
});
test("daily glob excludes only the explicit full-lock experiment, retaining synthetic comparison tests", () => {
  const daily = readFileSync("package.json", "utf8"),
    normal = readFileSync("tools/pipeline/bootstrap.test.mjs", "utf8"),
    experiment = readFileSync(
      "tools/pipeline/experiments/directory-comparison.test.mjs",
      "utf8",
    );
  assert(
    JSON.parse(daily).scripts["test:pipeline"].includes(
      "tools/pipeline/*.test.mjs",
    ),
  );
  assert(!normal.includes("collectDirectoryComparison"));
  assert(experiment.includes("collectDirectoryComparison"));
  assert(existsSync("tools/pipeline/bootstrap-directory-comparison.test.mjs"));
});
