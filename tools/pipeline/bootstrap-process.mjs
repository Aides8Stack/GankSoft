// Test-only process evidence. Keeps the real child result and the original bounded execution.
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  readdirSync,
  copyFileSync,
} from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const BOOTSTRAP_TIMEOUT_MS = 120000;
export const BOOTSTRAP_MAX_BUFFER = 4 * 1024 * 1024;
export function runBootstrapProcess(cwd, args, env, evidenceRoot, limits = {}) {
  mkdirSync(evidenceRoot, { recursive: true });
  const evidenceDir = mkdtempSync(join(evidenceRoot, "child-"));
  // Keep only this invocation's npm debug/timing files, outside the temporary checkout's cleanup.
  const childEnv = { ...env };
  for (const key of Object.keys(childEnv))
    if (
      ["npm_config_logs_dir", "npm_config_timing"].includes(key.toLowerCase())
    )
      delete childEnv[key];
  const npmLogs = limits.npmLogsDir ?? join(evidenceDir, "npm-logs");
  mkdirSync(npmLogs, { recursive: true });
  const previousLogs = new Set(readdirSync(npmLogs));
  childEnv.npm_config_logs_dir = npmLogs;
  childEnv.npm_config_timing = "true";
  const timeoutMs = limits.timeoutMs ?? BOOTSTRAP_TIMEOUT_MS;
  const maxBuffer = limits.maxBuffer ?? BOOTSTRAP_MAX_BUFFER;
  assert(
    Number.isFinite(timeoutMs) &&
      timeoutMs > 0 &&
      timeoutMs <= BOOTSTRAP_TIMEOUT_MS,
  );
  assert(
    Number.isInteger(maxBuffer) &&
      maxBuffer > 0 &&
      maxBuffer <= BOOTSTRAP_MAX_BUFFER,
  );
  const startedAt = new Date().toISOString(),
    start = performance.now();
  const r = spawnSync(process.execPath, args, {
    cwd,
    env: childEnv,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer,
  });
  const elapsedMs = performance.now() - start;
  // A/B may deliberately use the same logs-dir environment value. Snapshot this child's new files.
  if (limits.npmLogsDir) {
    mkdirSync(join(evidenceDir, "npm-logs"), { recursive: true });
    for (const name of readdirSync(npmLogs))
      if (!previousLogs.has(name))
        copyFileSync(join(npmLogs, name), join(evidenceDir, "npm-logs", name));
  }
  const report = {
    executable: process.execPath,
    args,
    cwd,
    platform: process.platform,
    node: process.version,
    startedAt,
    elapsedMs,
    timeoutMs,
    maxBuffer,
    pid: r.pid,
    status: r.status,
    signal: r.signal,
    error: r.error
      ? {
          name: r.error.name,
          message: r.error.message,
          code: r.error.code,
          errno: r.error.errno,
          syscall: r.error.syscall,
          path: r.error.path,
          spawnargs: r.error.spawnargs,
          stack: r.error.stack,
        }
      : null,
    // Do not serialize environment/credentials. These are the only relevant, nonsecret test overrides.
    environmentHash: createHash("sha256")
      .update(
        JSON.stringify(
          Object.entries(childEnv).sort(([a], [b]) => a.localeCompare(b)),
        ),
      )
      .digest("hex"),
    installDefaults: {
      NODE_ENV: childEnv.NODE_ENV,
      omit: childEnv.npm_config_omit,
      offline: childEnv.npm_config_offline,
    },
    stdoutBytes: Buffer.byteLength(r.stdout ?? ""),
    stderrBytes: Buffer.byteLength(r.stderr ?? ""),
    npmLogs: "npm-logs",
    npmLogsSource: npmLogs,
  };
  writeFileSync(join(evidenceDir, "stdout.txt"), r.stdout ?? "");
  writeFileSync(join(evidenceDir, "stderr.txt"), r.stderr ?? "");
  writeFileSync(
    join(evidenceDir, "result.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    "COLD_BOOTSTRAP_SUBPROCESS",
    JSON.stringify({
      evidenceDir,
      elapsedMs: report.elapsedMs,
      status: r.status,
      signal: r.signal,
      error: report.error,
      timeoutMs,
    }),
  );
  return Object.assign(r, { evidenceDir, elapsedMs: report.elapsedMs });
}
export function assertBootstrapSucceeded(r) {
  const evidence = `${r.evidenceDir}\n${JSON.stringify({ status: r.status, signal: r.signal, error: r.error ? { code: r.error.code, message: r.error.message } : null, elapsedMs: r.elapsedMs })}\n${r.stderr ?? ""}`;
  assert.equal(r.error, undefined, evidence);
  assert.equal(r.signal, null, evidence);
  assert.equal(r.status, 0, evidence);
}
