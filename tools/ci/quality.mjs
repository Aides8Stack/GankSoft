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
    {
      name: "storage-external-append-production-isolation",
      command: process.execPath,
      args: ["tools/build/check-production-isolation.mjs"],
    },
    ...(process.platform === "win32" ? [{
      name: "m08-native-integrity-windows",
      command: process.execPath,
      args: ["--experimental-strip-types", "tools/validation/r7/m08-integrity.ts"],
      timeout: 180000,
    }] : []),
    {
      name: "fresh606-production-entry",
      command: process.execPath,
      args: ["--experimental-strip-types", "tools/smoke-production606.ts"],
    },
    {
      name: "v076-production-ui",
      command: process.execPath,
      args: ["--experimental-strip-types", "tools/validation/ui-v076.ts", "P1"],
    },
    // Reuse the existing Windows quality gate and artifact upload for S2.
    // These are real Windows Electron checks, not human IME/clipboard/drag acceptance.
    ...(process.platform === "win32"
      ? [
          {
            name: "editor-spike-build-windows",
            command: process.execPath,
            args: [npm, "run", "build:editor-spike"],
          },
          {
            name: "editor-table-57-windows",
            command: process.execPath,
            args: ["tools/editor-spike/check-table-interactions.mjs"],
          },
          {
            name: "editor-integrated-smoke-windows",
            command: process.execPath,
            args: ["tools/smoke-editor-v075.mjs"],
          },
          {
            name: "card-draft-sqlite-ui-windows",
            command: process.execPath,
            args: [
              "--experimental-strip-types",
              "tools/card-draft-spike/smoke.ts",
            ],
          },
          {
            name: "unified-review-sqlite-ui-windows",
            command: process.execPath,
            args: ["--experimental-strip-types", "tools/review-spike/smoke.ts"],
          },
          {
            name: "unified-knowledge-sqlite-ui-windows",
            command: process.execPath,
            args: ["--experimental-strip-types", "tools/knowledge-spike/smoke.ts"],
          },
          {
            name: "unified-workspace-sqlite-ui-windows",
            command: process.execPath,
            args: ["--experimental-strip-types", "tools/workspace-spike/smoke.ts"],
          },
          {
            name: "unified-settings-evidence-ui-windows",
            command: process.execPath,
            args: ["--experimental-strip-types", "tools/workspace-spike/settings-smoke.ts"],
          },
          {
            name: "storage-recycle-ui-windows",
            command: process.execPath,
            args: ["--experimental-strip-types", "tools/workspace-spike/recycle-smoke.ts"],
          },
          {
            name: "storage-external-append-isolation-windows",
            command: process.execPath,
            args: ["--experimental-strip-types", "tools/workspace-spike/append-disabled-smoke.ts"],
          },
          {
            name: "storage-directory-relocation-ui-windows",
            command: process.execPath,
            args: ["--experimental-strip-types", "tools/workspace-spike/relocation-smoke.ts"],
          },
          {
            name: "storage-full-restore-ui-windows",
            command: process.execPath,
            args: ["--experimental-strip-types", "tools/workspace-spike/restore-smoke.ts"],
          },
          {
            name: "workspace-visual-recheck-windows",
            command: process.execPath,
            args: ["--experimental-strip-types", "tools/workspace-spike/visual-recheck.ts"],
          },
          {
            name: "workspace-visual-capture-windows",
            command: process.execPath,
            args: ["--experimental-strip-types", "tools/workspace-spike/visual-smoke.ts"],
          },
          {
            name: "layered-knowledge-ui-windows",
            command: process.execPath,
            args: ["--experimental-strip-types", "tools/knowledge-spike/layers-smoke.ts"],
          },
          {
            name: "native-window-state-ui-windows",
            command: process.execPath,
            args: ["--experimental-strip-types", "tools/workspace-spike/window-smoke.ts"],
          },
          {
            name: "editor-launcher-selftest-windows",
            command: process.execPath,
            args: [
              "tools/editor-spike/manual-acceptance.mjs",
              "--verify-launcher",
            ],
          },
        ]
      : []),
  ],
  "validation-results/ci/quality.json",
  provenance(),
);
