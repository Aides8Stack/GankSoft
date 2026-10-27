/** Parent verifier is independent of smoke process success flags and legacy reports. */
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  lstatSync,
} from "node:fs";
import { join, resolve, relative } from "node:path";
import { digest, contractDigest, checkPayload } from "./smoke-evidence.mjs";
export function verifySmokeEvidence({
  execution,
  output,
  expected,
  definition,
}) {
  if (execution.error || execution.signal || execution.status !== 0)
    throw Error(
      `Smoke process failed: ${execution.error?.code ?? execution.signal ?? execution.status}`,
    );
  let bytes;
  try {
    const stat = lstatSync(output);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024)
      throw Error("not a bounded regular file");
    bytes = readFileSync(output, "utf8");
  } catch (e) {
    throw Error("Missing/invalid current result file: " + e.message);
  }
  let proof;
  try {
    proof = JSON.parse(bytes);
  } catch {
    throw Error("Invalid result JSON");
  }
  if (!proof || proof.schema !== 1 || proof.status !== "PASS")
    throw Error("Invalid result schema/status");
  for (const [key, value] of Object.entries(expected))
    if (proof[key] !== value) throw Error("Result binding mismatch: " + key);
  const cases = checkPayload(proof.result, definition, expected.platform, true);
  if ("version" in proof.result && proof.result.version !== expected.version)
    throw Error("Result version mismatch");
  if (
    proof.caseCount !== cases.length ||
    JSON.stringify(proof.cases) !== JSON.stringify(cases)
  )
    throw Error("Envelope case count/content mismatch");
  const markers = (execution.stdout ?? "")
    .split(/\r?\n/)
    .filter((l) => l.startsWith("GANKSOFT_SMOKE_COMPLETE "));
  if (
    markers.length !== 1 ||
    markers[0] !== `GANKSOFT_SMOKE_COMPLETE ${expected.runId} ${digest(bytes)}`
  )
    throw Error("Missing/mismatched/duplicate completion marker");
  return proof;
}
export function runCheckedSmoke({
  script,
  target,
  definition,
  root = "validation-results/asar-runs",
  env = process.env,
  timeout = 120000,
  executable,
}) {
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(join(resolve(root), "run-"));
  const runId = randomUUID(),
    output = join(dir, "result.json");
  const expected = {
    version: JSON.parse(readFileSync("package.json", "utf8")).version,
    runId,
    script: definition.script,
    scriptSha256: digest(readFileSync(script)),
    targetSha256: digest(readFileSync(target)),
    contractSha256: contractDigest(definition),
    platform: process.platform,
  };
  const execution = spawnSync(process.execPath, [script, target, ...(executable ? [executable] : [])], {
    encoding: "utf8",
    timeout,
    maxBuffer: 16 * 1024 * 1024,
    env: {
      ...env,
      GANKSOFT_SMOKE_RUN_ID: runId,
      GANKSOFT_SMOKE_RESULT: output,
    },
  });
  writeFileSync(join(dir, "stdout.log"), execution.stdout ?? "");
  writeFileSync(join(dir, "stderr.log"), execution.stderr ?? "");
  process.stdout.write(execution.stdout ?? "");
  process.stderr.write(execution.stderr ?? "");
  try {
    const proof = verifySmokeEvidence({
      execution,
      output,
      expected,
      definition,
    });
    const receipt = {
      status: "PASS",
      ...expected,
      caseCount: proof.caseCount,
      resultSha256: digest(readFileSync(output)),
      resultFile: relative(process.cwd(), output),
      stdoutFile: relative(process.cwd(), join(dir, "stdout.log")),
    };
    writeFileSync(
      join(dir, "verification.json"),
      JSON.stringify(receipt, null, 2),
    );
    return receipt;
  } catch (e) {
    writeFileSync(
      join(dir, "verification.json"),
      JSON.stringify(
        {
          status: "FAIL",
          ...expected,
          reason: e.message,
          exitCode: execution.status,
          signal: execution.signal,
          error: execution.error?.code ?? null,
        },
        null,
        2,
      ),
    );
    throw Error(`${definition.script}: ${e.message}; evidence=${dir}`);
  }
}
