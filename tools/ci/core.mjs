import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function branchKey(branch) {
  return `${branch.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 60)}-${createHash("sha256").update(branch).digest("hex").slice(0, 8)}`;
}
export function provenance() {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (
    process.env.GANKSOFT_SOURCE_SHA &&
    sha !== process.env.GANKSOFT_SOURCE_SHA
  )
    throw Error("Checkout SHA differs from requested source");
  return {
    sha,
    branch:
      process.env.GANKSOFT_SOURCE_BRANCH ||
      execFileSync("git", ["branch", "--show-current"], {
        encoding: "utf8",
      }).trim(),
    version: JSON.parse(readFileSync("package.json", "utf8")).version,
    lockSha256: createHash("sha256")
      .update(readFileSync("package-lock.json"))
      .digest("hex"),
    platform: process.platform,
    node: process.version,
    runUrl: process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT || "local",
  };
}

// All later steps start as NOT_RUN, and remain so after a failure.
export function runSteps(steps, reportPath, metadata = {}) {
  const report = {
    ...metadata,
    status: "IN_PROGRESS",
    steps: steps.map((s) => ({ name: s.name, status: "NOT_RUN" })),
  };
  mkdirSync(join(reportPath, ".."), { recursive: true });
  const save = () =>
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  save();
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i],
      entry = report.steps[i];
    entry.startedAt = new Date().toISOString();
    const result = spawnSync(step.command, step.args, {
      encoding: "utf8",
      timeout: step.timeout ?? 900000,
      maxBuffer: 64 * 1024 * 1024,
      env: process.env,
    });
    const output =
      (result.stdout ?? "") +
      (result.stderr ?? "") +
      (result.error ? String(result.error) : "");
    entry.log = `${i + 1}-${step.name}.log`;
    writeFileSync(join(reportPath, "..", entry.log), output);
    process.stdout.write(output);
    entry.exitCode = result.status;
    entry.status = result.status === 0 && !result.error ? "PASS" : "FAIL";
    save();
    if (entry.status !== "PASS") {
      report.status = "FAIL";
      save();
      throw Error(`Quality gate failed: ${step.name}`);
    }
  }
  report.status = "PASS";
  save();
  return report;
}
