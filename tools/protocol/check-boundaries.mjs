import { readFileSync, readdirSync } from "node:fs";
const root = new URL("../../shared/protocol/", import.meta.url);
for (const name of readdirSync(root).filter((n) => n.endsWith(".ts"))) {
  const source = readFileSync(new URL(name, root), "utf8");
  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    if (
      match[1] !== "zod" &&
      !match[1].startsWith("./") &&
      ![
        "../types.ts",
        "../review-contract.ts",
        "../review-config.ts",
        "../review-read-contract.ts",
        "../review-analytics.ts",
        "../import-protocol.ts",
        "../workspace-contracts.ts","../study-query.ts",
      ].includes(match[1])
    )
      throw Error(`Protocol boundary violation: ${name}: ${match[1]}`);
  }
  if (/:\s*any\b|<any\b/.test(source)) throw Error(`Unbounded any in ${name}`);
}
const frontend = readFileSync(
  new URL("../../src/services.ts", import.meta.url),
  "utf8",
);
if (/from\s+['"](?:node:|.*electron\/)/.test(frontend))
  throw Error("Frontend imports backend");
console.log("Protocol and frontend boundaries passed");
