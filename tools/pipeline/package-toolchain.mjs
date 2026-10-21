import {execFileSync} from 'node:child_process';import {readFileSync} from 'node:fs';import {join} from 'node:path';import {createHash} from 'node:crypto';
export const packageToolFiles=['tools/ci/delivery.mjs','tools/ci/windows-extract.ps1','tools/validation/verify_delivery.py','tools/package-windows.mjs','tools/ci/windows-version.mjs','tools/ci/installer.iss','tools/ci/windows-package.ps1','tools/ci/metadata.mjs','tools/ci/core.mjs','tools/ci/windows-smoke.mjs','tools/build/zip-windows.py','tools/pipeline/package-toolchain.mjs','tools/pipeline/batch.mjs','tools/pipeline/artifacts.mjs'];
const hash=b=>createHash('sha256').update(b.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
export function packageToolchain(root,expectedSha) {
 const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 if(!/^[a-f0-9]{40}$/.test(sha)||expectedSha!==undefined&&sha!==expectedSha)throw Error('Packaging coordinator SHA mismatch');
 for(const p of ['package-lock.json',...packageToolFiles]){const actual=hash(readFileSync(join(root,p))),committed=hash(execFileSync('git',['show',`${sha}:${p}`],{cwd:root}));if(actual!==committed)throw Error('Dirty or substituted packaging tool: '+p);}
 return {schema:1,sha,fileEncoding:'utf8-lf',lockSha256:hash(readFileSync(join(root,'package-lock.json'))),files:Object.fromEntries(packageToolFiles.map(p=>[p,hash(readFileSync(join(root,p)))]))};
}
export function validateToolchain(value,expectedSha) {
 if(value?.schema!==1||value.fileEncoding!=='utf8-lf'||!/^([a-f0-9]{40})$/.test(value.sha)||expectedSha!==undefined&&value.sha!==expectedSha||!/^([a-f0-9]{64})$/.test(value.lockSha256))throw Error('Packaging toolchain identity mismatch');
 if(!value.files||Object.keys(value.files).sort().join('\n')!==[...packageToolFiles].sort().join('\n')||Object.values(value.files).some(x=>typeof x!=='string'||!/^([a-f0-9]{64})$/.test(x)))throw Error('Packaging toolchain file evidence missing');
 return true;
}
