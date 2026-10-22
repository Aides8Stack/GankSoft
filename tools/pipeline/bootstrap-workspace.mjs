// Test-only cold checkout isolation. Never remove a caller-supplied base directory.
import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, lstatSync, rmSync } from "node:fs";
import { dirname, join, relative, isAbsolute, win32 } from "node:path";
import { tmpdir } from "node:os";

function contains(parent, child) {
  const r = relative(parent, child);
  return (
    r === "" ||
    (!r.startsWith(".." + (process.platform === "win32" ? "\\" : "/")) &&
      r !== ".." &&
      !isAbsolute(r))
  );
}
export function coldRootCandidates({
  repo,
  platform = process.platform,
  runnerTemp = process.env.RUNNER_TEMP,
  temp = tmpdir(),
}) {
  const path = platform === "win32" ? win32 : { dirname };
  return [
    ...new Set(
      (platform === "win32" ? [runnerTemp, path.dirname(repo)] : [temp]).filter(
        Boolean,
      ),
    ),
  ];
}
export function assertCleanAncestors(folder, repo) {
  const actual = realpathSync(folder),
    source = realpathSync(repo);
  assert(
    !contains(source, actual),
    "Cold fixture must be outside the project source tree",
  );
  const checked = [];
  for (let p = actual; ; p = dirname(p)) {
    const modules = join(p, "node_modules");
    let absent = false;
    try {
      lstatSync(modules);
    } catch (error) {
      if (error.code === "ENOENT") absent = true;
      else throw error;
    }
    assert(
      absent,
      `Ancestor node_modules can contaminate cold resolution: ${modules}`,
    );
    checked.push(modules);
    if (dirname(p) === p) break;
  }
  return checked;
}
export function createColdBootstrapRoot({
  repo,
  candidates = coldRootCandidates({ repo }),
}) {
  const attempts = [];
  for (const candidate of candidates) {
    let owned;
    try {
      const base = realpathSync(candidate);
      if (process.platform === "win32")
        assert.equal(
          win32.parse(base).root.toUpperCase(),
          "D:\\",
          "Windows cold root must actually reside on D:",
        );
      // Reject source aliases before even creating a fixture there.
      assert(
        !contains(realpathSync(repo), base),
        "Candidate is inside project source tree",
      );
      owned = mkdtempSync(join(base, "gank bootstrap 日期 "));
      const path = realpathSync(owned),
        checked = assertCleanAncestors(path, repo);
      const drive =
        process.platform === "win32"
          ? win32.parse(path).root.toUpperCase()
          : "/";
      if (process.platform === "win32") assert.equal(drive, "D:\\");
      return {
        path,
        selection: {
          candidate,
          base,
          path,
          drive,
          platform: process.platform,
          ancestorChecks: checked,
          rejected: attempts,
        },
        cleanup: () =>
          rmSync(owned, { recursive: true, force: true, maxRetries: 5 }),
      };
    } catch (error) {
      attempts.push({ candidate, error: error.message });
      if (owned) rmSync(owned, { recursive: true, force: true, maxRetries: 5 });
    }
  }
  throw Error(
    `No isolated ${process.platform === "win32" ? "D-drive " : ""}cold bootstrap root: ${JSON.stringify(attempts)}`,
  );
}
// Execute from the copied coordinator's own module location, not the project's resolver.
export const resolutionProbeSource = String.raw`
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,relative,isAbsolute,sep} from 'node:path';
const mode=process.argv[2],require=createRequire(import.meta.url);
assert(['absent','installed'].includes(mode));
const root=realpathSync(process.cwd()),modules=join(root,'node_modules'),result={mode,cwd:root,resolvers:{}};
for(const [kind,resolve]of Object.entries({esm:()=>fileURLToPath(import.meta.resolve('yaml')),cjs:()=>require.resolve('yaml')})){
 let path,error;
 try{path=realpathSync(resolve());}catch(e){error=e;}
 if(mode==='absent'){
  assert(error,'yaml unexpectedly resolved before install: '+path);
  assert(['ERR_MODULE_NOT_FOUND','MODULE_NOT_FOUND'].includes(error.code),'Unexpected resolution error: '+error);
  result.resolvers[kind]={unresolved:true,code:error.code};
 }else{
  assert.ifError(error);
  const r=relative(modules,path);assert(r&&!r.startsWith('..'+sep)&&r!=='..'&&!isAbsolute(r),'yaml escaped fixture node_modules: '+path);
  result.resolvers[kind]={path,local:true};
 }
}
console.log(JSON.stringify(result));
`;
