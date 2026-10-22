// Test-only bounded A/B experiment, with an aggregate gate that never discards failed attempts.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join, win32, posix } from "node:path";
export const DIFFERENCE_MIN_MS = 10000;
export const DIFFERENCE_RATIO = 2;
export function actualPathRoot(path, platform = process.platform) {
  return platform === "win32"
    ? win32.parse(path).root.replaceAll("/", "\\").toUpperCase()
    : posix.parse(path).root;
}
function installed(row) {
  return (
    row.status === 0 && !row.error && !row.setupError && row.signal === null
  );
}
function slowerGroup(a, b) {
  if (installed(a) !== installed(b)) return installed(a) ? b.group : a.group;
  if (!installed(a)) return null;
  const slow = a.elapsedMs >= b.elapsedMs ? a : b,
    fast = slow === a ? b : a;
  return slow.elapsedMs - fast.elapsedMs >= DIFFERENCE_MIN_MS &&
    slow.elapsedMs >= Math.max(1, fast.elapsedMs) * DIFFERENCE_RATIO
    ? slow.group
    : null;
}
export function comparisonSummary(rows) {
  const first = slowerGroup(rows[0], rows[1]);
  const repeated =
    rows.length === 4 && first && slowerGroup(rows[3], rows[2]) === first;
  return {
    status: rows.every((r) => installed(r) && r.validation?.status === "PASS")
      ? "PASS"
      : "FAIL",
    installConclusion: rows.every(installed)
      ? "FAILURE_NOT_REPRODUCED"
      : rows.every((r) => r.error?.code === "ETIMEDOUT")
        ? "BOTH_LOCATIONS_TIMED_OUT"
        : "INSTALL_FAILURE_REPRODUCED",
    directoryDifference: repeated
      ? "DIRECTORY_ASSOCIATED_DIFFERENCE"
      : "NOT_ESTABLISHED",
    slowerGroup: repeated ? first : null,
    expectedCD:
      rows.every((r) => r.platform === "win32") &&
      new Set(rows.map((r) => r.pathRoot)).size === 2 &&
      rows.some((r) => r.pathRoot === "C:\\") &&
      rows.some((r) => r.pathRoot === "D:\\"),
    interpretation:
      "Actual paths/roots only. Directory association does not identify a physical disk or antivirus cause; successful reruns never erase failed attempts.",
  };
}
export function lastNpmPhase(evidenceDir) {
  let last = null;
  // stderr includes timers even if npm is killed before it flushes a timing JSON file.
  for (const line of readFileSync(
    join(evidenceDir, "stderr.txt"),
    "utf8",
  ).split(/\r?\n/)) {
    const m = /npm timing (.+) Completed in (\d+)ms/.exec(line);
    if (m) last = { stage: m[1], durationMs: Number(m[2]) };
  }
  return last;
}
export function comparisonTable(report) {
  const cell = (v) =>
    String(v ?? "NOT_AVAILABLE")
      .replaceAll("|", "\\|")
      .replace(/[\r\n]/g, " ");
  const lines = [
    "# Cold bootstrap directory comparison",
    `Platform: ${report.platform}; Node: ${report.node}; npm: ${report.npm}; cache: ${report.cache}`,
    `Aggregate: ${report.summary?.status ?? "IN_PROGRESS"}; C/D comparison: ${report.summary?.expectedCD ? "YES" : "NO (see actual roots; not a C/D claim)"}`,
    "",
    "| Order/group | Actual path | Root | Node/npm | Package / lock SHA256 | Env SHA256 | Elapsed ms | error / signal / status | Last npm completed phase | Post-install checks |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const r of report.rows)
    lines.push(
      "| " +
        [
          `${r.order}/${r.group}${r.attempt}`,
          r.path,
          r.pathRoot,
          `${report.node}/${report.npm}`,
          `${r.packageHash}/${r.lockHash}`,
          r.environmentHash,
          r.elapsedMs,
          `${r.error?.code ?? r.setupError ?? "none"} / ${r.signal} / ${r.status}`,
          r.lastNpmPhase
            ? `${r.lastNpmPhase.stage} (${r.lastNpmPhase.durationMs}ms)`
            : "NOT_AVAILABLE",
          JSON.stringify(r.validation),
        ]
          .map(cell)
          .join(" | ") +
        " |",
    );
  return lines.join("\n") + "\n";
}
export async function collectDirectoryComparison({
  attempt,
  persist = () => {},
}) {
  const rows = [];
  async function one(group, number) {
    let row;
    try {
      row = await attempt(group, number, rows.length + 1);
    } catch (error) {
      row = {
        status: null,
        signal: null,
        error: null,
        setupError: error.stack ?? String(error),
        validation: { status: "NOT_RUN" },
      };
    }
    rows.push({ ...row, group, attempt: number, order: rows.length + 1 });
    await persist(rows);
  }
  await one("A", 1);
  await one("B", 1);
  const reverseReason = slowerGroup(rows[0], rows[1]);
  if (reverseReason) {
    await one("B", 2);
    await one("A", 2);
  }
  assert(rows.length === 2 || rows.length === 4);
  return { rows, reverseReason, summary: comparisonSummary(rows) };
}
export function assertComparisonPassed(report) {
  const failed = report.rows.filter(
    (r) => !installed(r) || r.validation?.status !== "PASS",
  );
  assert.equal(
    failed.length,
    0,
    `Cold install comparison failed; all failed attempts remain gated: ${JSON.stringify(failed.map((r) => ({ group: r.group, order: r.order, path: r.path, error: r.error, setupError: r.setupError, signal: r.signal, status: r.status, validation: r.validation })))}`,
  );
}
export function retainComparison(root, report) {
  writeFileSync(
    join(root, "directory-comparison.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  writeFileSync(join(root, "directory-comparison.md"), comparisonTable(report));
}
