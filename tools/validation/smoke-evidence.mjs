/** Shared synchronous completion protocol; an exit code alone is never evidence. */
import { createHash, randomUUID } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  writeSync,
  statSync,
} from "node:fs";
import { resolve, basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SMOKE_CONTRACTS } from "./smoke-contracts.mjs";
export function completionGuard(label) {
  let complete = false;
  process.on("exit", (code) => {
    if (!complete && code === 0) {
      writeSync(2, `SMOKE_INCOMPLETE ${label}\n`);
      process.exitCode = 1;
    }
  });
  return () => {
    complete = true;
  };
}
export const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const contractDigest = (definition) =>
  digest(JSON.stringify(definition));
export function checkPayload(result, definition, platform, asar) {
  if (
    !Array.isArray(definition.cases) ||
    !definition.cases.length ||
    new Set(definition.cases).size !== definition.cases.length
  )
    throw Error("Invalid reviewed case contract");
  if (!result || typeof result !== "object" || Array.isArray(result))
    throw Error("Invalid result object");
  if (result.platform !== platform) throw Error("Result platform mismatch");
  if (
    (definition.errorsRequired || "errors" in result) &&
    (!Array.isArray(result.errors) || result.errors.length)
  )
    throw Error("Result errors must be an empty array");
  if (definition.asarRequired && result.asar !== asar)
    throw Error("Result target type mismatch");
  const rows = result[definition.resultField];
  if (!Array.isArray(rows)) throw Error("Missing result cases");
  const cases =
    definition.resultField === "results"
      ? rows.map((r) => {
          if (!r || r.status !== "passed")
            throw Error("Case status is not passed");
          return r.case;
        })
      : rows;
  if (cases.length !== definition.cases.length)
    throw Error("Incomplete case count");
  if (
    new Set(cases).size !== cases.length ||
    cases.some((c, i) => c !== definition.cases[i])
  )
    throw Error("Case identities/order mismatch");
  return cases;
}
export function startSmoke(
  scriptURL,
  definition = SMOKE_CONTRACTS.find(
    (d) => basename(d.script) === basename(fileURLToPath(scriptURL)),
  ),
) {
  if (!definition) throw Error("Missing reviewed smoke contract");
  const script = fileURLToPath(scriptURL),
    target = resolve(process.argv[2] ?? ".");
  const provided = ["GANKSOFT_SMOKE_RUN_ID", "GANKSOFT_SMOKE_RESULT"].map(
    (k) => process.env[k],
  );
  if (provided.some(Boolean) && !provided.every(Boolean))
    throw Error("Incomplete smoke invocation context");
  let runId = provided[0],
    output = provided[1];
  if (!runId) {
    const root = resolve("validation-results/asar-runs");
    mkdirSync(root, { recursive: true });
    runId = randomUUID();
    output = join(mkdtempSync(join(root, "standalone-")), "result.json");
  }
  if (existsSync(output))
    throw Error("Result path already exists (stale/replayed evidence)");
  let completed = false;
  const markComplete = completionGuard(`${runId} ${definition.script}`);
  return (result) => {
    if (completed) throw Error("Duplicate smoke completion");
    const asar = target.endsWith(".asar");
    const cases = checkPayload(result, definition, process.platform, asar);
    const version = JSON.parse(readFileSync("package.json", "utf8")).version;
    if ("version" in result && result.version !== version)
      throw Error("Result version mismatch");
    const envelope = {
      schema: 1,
      status: "PASS",
      runId,
      script: definition.script,
      version,
      scriptSha256: digest(readFileSync(script)),
      targetSha256: statSync(target).isFile()
        ? digest(readFileSync(target))
        : `directory:${target}`,
      contractSha256: contractDigest(definition),
      platform: process.platform,
      caseCount: cases.length,
      cases,
      result,
    };
    const bytes = JSON.stringify(envelope);
    if (existsSync(output))
      throw Error("Completion cannot overwrite existing result");
    writeFileSync(output + ".tmp", bytes, { flag: "wx" });
    renameSync(output + ".tmp", output);
    // Synchronous output cannot disappear in an unflushed console buffer.
    writeSync(1, `GANKSOFT_SMOKE_COMPLETE ${runId} ${digest(bytes)}\n`);
    completed = true;
    markComplete();
    return envelope;
  };
}
