import {installationIdentity} from './install-identity.mjs';
import {delivery} from './delivery.mjs';
import {windowsVersion} from './windows-version.mjs';
import {packageToolchain} from '../pipeline/package-toolchain.mjs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { branchKey, provenance } from "./core.mjs";
const meta = provenance();
const name = `GankSoft-${meta.version}-${branchKey(meta.branch)}-${meta.sha.slice(0, 12)}-windows-x64-${process.env.GITHUB_RUN_ID ?? "local"}-${meta.runAttempt}`;
const packagingToolchain=packageToolchain(resolve(dirname(fileURLToPath(import.meta.url)),'../..'),process.env.GANKSOFT_COORDINATOR_SHA);
const runId=process.env.GITHUB_RUN_ID ?? 'local';
const installation=installationIdentity({...meta,name,runId,packagingToolchain});
mkdirSync("validation-results/ci", { recursive: true });
writeFileSync(
  "validation-results/ci/source.json",
  JSON.stringify(
    {
      ...meta,
      delivery: delivery(meta.version),
      runId: process.env.GITHUB_RUN_ID ?? "local",
      windowsVersion: windowsVersion(meta.version),
      packagingToolchain: packagingToolchain,
      installation,
      name,
      classification: process.env.GANKSOFT_CHANNEL || "TEST_RC",
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
