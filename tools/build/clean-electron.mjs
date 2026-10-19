import { rmSync } from "node:fs";
// Deleted backend modules must never survive in a later ASAR as stale build output.
rmSync(new URL("../../dist-electron", import.meta.url), {
  recursive: true,
  force: true,
});
