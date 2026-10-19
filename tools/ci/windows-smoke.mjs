import { resolve } from "node:path";
import { runSteps, provenance } from "./core.mjs";
if (process.platform !== "win32")
  throw Error("Windows smoke requires a Windows runner");
const [asar, exe, label = "portable"] = process.argv.slice(2);
if (!asar || !exe || !["portable", "installed"].includes(label))
  throw Error("Expected ASAR, EXE and portable|installed");
runSteps(
  ["v060", "system-v060", "v072"].map((name) => ({
    name,
    command: process.execPath,
    args: [`tools/smoke-${name}.mjs`, resolve(asar), resolve(exe)],
  })),
  `validation-results/ci/windows-${label}.json`,
  { ...provenance(), windows10Manual: "NOT_RUN", windows11Manual: "NOT_RUN" },
);
