import test from 'node:test';import assert from 'node:assert/strict';
import {NtExecutable,NtExecutableResource,Resource} from 'resedit';
import {stampWindowsVersion,resourceVersionExpected,versionResourceEvidence,requireVersionResources} from '../ci/windows-version.mjs';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';import {spawnSync} from 'node:child_process';
const versions=['0.7.4','0.7.4-rc.1','0.7.4-rc.3','0.7.4-rc.4'];
// PE fixtures reproduce the pinned compiler's documented space placeholders.
// These are parser/assertion regressions, not actual Inno compilation evidence.
async function fixture(version,mutate=()=>{}){
 const exe=NtExecutable.createEmpty(false,false),res=NtExecutableResource.from(exe),v=Resource.VersionInfo.createEmpty();v.setStringValues({lang:0,codepage:1200},{FileVersion:version,ProductVersion:version});v.outputToResourceEntries(res.entries);res.outputResource(exe);
 const stamped=NtExecutable.from(await stampWindowsVersion(Buffer.from(exe.generate()),version)),r=NtExecutableResource.from(stamped),info=Resource.VersionInfo.fromEntries(r.entries)[0],expected=resourceVersionExpected(version,'installer');
 info.setStringValues({lang:0,codepage:1200},{FileVersion:expected.FileVersion,ProductVersion:expected.ProductVersion});mutate(info);
 info.outputToResourceEntries(r.entries);r.outputResource(stamped);return Buffer.from(stamped.generate());
}
test('stable and RC1/3/4 keep exact numeric identity and Inno 20/50 character raw text',async()=>{
 for(const version of versions){const bytes=await fixture(version),e=await versionResourceEvidence(bytes,version,'installer');requireVersionResources(e);assert.equal(e.status,'PASS');assert.equal(e.actual.strings[0].FileVersion,version+' '.repeat(20-version.length));assert.equal(e.actual.strings[0].ProductVersion,version+' '.repeat(50-version.length));assert.notEqual(e.actual.strings[0].FileVersion,version,'old raw equality reproduces the failure');
 const app=await stampWindowsVersion(bytes,version);requireVersionResources(await versionResourceEvidence(app,version,'application'));assert.equal((await versionResourceEvidence(app,version,'installer')).status,'FAIL','application text cannot impersonate padded Inno resources');
 }
});
test('every numeric/text field, malformed padding and additional language tampering is rejected',async()=>{
 const version='0.7.4-rc.3',language={lang:0,codepage:1200},expected=resourceVersionExpected(version,'installer');
 const cases=[['numericFileVersion',v=>v.setFileVersion(0,7,4,1)],['numericProductVersion',v=>v.setProductVersion(0,7,4,1)],['FileVersion',v=>v.setStringValue(language,'FileVersion',expected.FileVersion.replace('rc.3','rc.1'))],['ProductVersion',v=>v.setStringValue(language,'ProductVersion',expected.ProductVersion.replace('rc.3','rc.1'))],['FileVersion',v=>v.setStringValue(language,'FileVersion',' '+expected.FileVersion.slice(1))],['FileVersion',v=>v.setStringValue(language,'FileVersion',expected.FileVersion.slice(0,-1)+'\t')],['FileVersion',v=>v.setStringValue(language,'FileVersion',expected.FileVersion+' ')],['ProductVersion',v=>v.setStringValue(language,'ProductVersion',version)],['ProductVersion',v=>v.setStringValues({lang:1033,codepage:1200},{FileVersion:expected.FileVersion,ProductVersion:'wrong'})]];
 for(const [field,mutate]of cases){const e=await versionResourceEvidence(await fixture(version,mutate),version,'installer');assert.equal(e.status,'FAIL');assert.ok(e.mismatches.some(m=>m.field===field));assert.throws(()=>requireVersionResources(e),/numeric\/text version mismatch/);}
 assert.throws(()=>resourceVersionExpected('65535.65535.65535-rc.65534','installer'),/capacity/);assert.throws(()=>resourceVersionExpected(version,'other'),/kind/);
});
test('verification CLI prints actual/expected fields before failing and never reports mismatch as success',async()=>{
 const root=mkdtempSync(join(tmpdir(),'gank-version-report-'));
 try {const path=join(root,'setup.exe');writeFileSync(path,await fixture('0.7.4',v=>v.setFileVersion(0,7,4,0)));
 const r=spawnSync(process.execPath,[resolve('tools/ci/windows-version.mjs'),'verify',path,'0.7.4','installer'],{encoding:'utf8'});assert.notEqual(r.status,0);const report=JSON.parse(r.stdout);assert.equal(report.status,'FAIL');assert.equal(report.actual.numericFileVersion,'0.7.4.0');assert.equal(report.expected.numericFileVersion,'0.7.4.65535');assert.equal(report.mismatches[0].field,'numericFileVersion');
 writeFileSync(path,await fixture('0.7.4'));const ok=spawnSync(process.execPath,[resolve('tools/ci/windows-version.mjs'),'verify',path,'0.7.4','installer'],{encoding:'utf8'});assert.equal(ok.status,0,ok.stderr);assert.equal(JSON.parse(ok.stdout).status,'PASS');
 }finally{rmSync(root,{recursive:true,force:true});}
});
