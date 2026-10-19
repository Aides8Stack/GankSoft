import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { z } from "zod";
import {
  registry,
  RequestSchema,
  Envelope,
} from "../../shared/protocol/registry.ts";
import { PROTOCOL } from "../../shared/protocol/data.ts";
import { transitions } from "../../shared/protocol/lifecycle.ts";
const output = new URL("../../docs/protocol/", import.meta.url);
mkdirSync(output, { recursive: true });
const json = {
  protocol: PROTOCOL,
  semantics:
    "Runtime Zod refinements and backend scope checks are mandatory; JSON Schema alone is insufficient.",
  request: z.toJSONSchema(RequestSchema),
  response: z.toJSONSchema(Envelope),
  methods: Object.fromEntries(
    Object.entries(registry).map(([name, d]) => [
      name,
      {
        module: d.module,
        effect: d.effect,
        input: z.toJSONSchema(d.input),
        output: z.toJSONSchema(d.output),
      },
    ]),
  ),
  callTransitions: transitions,
};
writeFileSync(
  new URL("contracts-v2.json", output),
  JSON.stringify(json, null, 2) + "\n",
);
const version = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
).version;
writeFileSync(
  new URL("API-INDEX.md", output),
  `# v${version} 公共方法索引\n\n协议2.0；实际可用方法以app.capabilities为准，完整约束见contracts-v2.json。\n\n| 方法 | 模块 | effect |\n|---|---|---|\n` +
    Object.entries(registry)
      .map(([name, d]) => `| \`${name}\` | ${d.module} | ${d.effect} |`)
      .join("\n") +
    "\n",
);
console.log(`Exported ${Object.keys(registry).length} methods`);
