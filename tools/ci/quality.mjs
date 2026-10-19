import { runSteps, provenance } from "./core.mjs";
const npm = process.env.npm_execpath;
if (!npm) throw Error("Run via npm run ci:quality");
runSteps(
  [
    {
      name: "infrastructure",
      command: process.execPath,
      args: ["--test", "tools/ci/core.test.mjs"],
    },
    {
      name: "unicode-zip-manifest",
      command: process.platform === "win32" ? "python" : "python3",
      args: ["tools/ci/test_zip_manifest.py"],
    },
    {
      name: "unit-integration-regression",
      command: process.execPath,
      args: [npm, "test"],
    },
    {
      name: "protocol-boundaries-types",
      command: process.execPath,
      args: [npm, "run", "check:protocol"],
    },
    {
      name: "application-types-build",
      command: process.execPath,
      args: [npm, "run", "build"],
    },
  ],
  "validation-results/ci/quality.json",
  provenance(),
);
