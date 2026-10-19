import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { branchKey, provenance } from "./core.mjs";
const meta = provenance();
const name = `GankSoft-${meta.version}-${branchKey(meta.branch)}-${meta.sha.slice(0, 12)}-windows-x64-${process.env.GITHUB_RUN_ID ?? "local"}-${meta.runAttempt}`;
mkdirSync("validation-results/ci", { recursive: true });
writeFileSync(
  "validation-results/ci/source.json",
  JSON.stringify(
    {
      ...meta,
      name,
      classification: "TEST_RC",
      windows10Manual: "NOT_RUN",
      windows11Manual: "NOT_RUN",
    },
    null,
    2,
  ) + "\n",
);
if (process.env.GITHUB_OUTPUT)
  appendFileSync(process.env.GITHUB_OUTPUT, `name=${name}\n`);
console.log(name);
