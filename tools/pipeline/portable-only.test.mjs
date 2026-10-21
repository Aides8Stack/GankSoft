import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {checkManifest} from '../ci/portable-only.mjs';

const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
test('portable-only manifest is exhaustive, SHA-bound and rejects setup.exe, tampering and missing smoke/extraction',()=>{
 const dir=mkdtempSync(join(tmpdir(),'gank-portable-')),version=JSON.parse(readFileSync('package.json')).version;
 const zip='GankSoft-v'+version+'-win64-portable.zip',source={sha:'a'.repeat(40),version,runId:'123',runAttempt:'1'};
 const report={status:'PASS',sourceSha:source.sha,version,runId:'123',runAttempt:'1',windowsSmoke:{status:'PASS',sha:source.sha,steps:[{status:'PASS'}]},
 zipExtraction:{status:'PASS',platform:'win32',zipRoot:'GankSoft/',archive:zip,archiveSha256:'',filesVerified:2,destinations:[80,100].map(n=>({status:'PASS',destinationLength:n,maxAbsolutePath:n+50,filesVerified:2}))},windows10Manual:'NOT_RUN',windows11Manual:'NOT_RUN'};
 function save(){writeFileSync(join(dir,'source.json'),JSON.stringify(source));writeFileSync(join(dir,zip),'fake-fixture-not-real-ZIP');report.zipSha256=hash(join(dir,zip));report.zipExtraction.archiveSha256=report.zipSha256;
 writeFileSync(join(dir,'TEST_REPORT.json'),JSON.stringify(report));const names=[zip,'source.json','TEST_REPORT.json'].sort();writeFileSync(join(dir,'SHA256SUMS.txt'),names.map(n=>hash(join(dir,n))+'  '+n).join('\n')+'\n');}
 try{save();assert.equal(checkManifest(dir,source,report).zip,zip);
 for(const mutate of [()=>report.windowsSmoke.status='FAIL',()=>report.zipExtraction.destinations[1].maxAbsolutePath=260,()=>report.zipExtraction.status='FAIL',()=>report.sourceSha='wrong']){
  const previous=structuredClone(report);mutate();assert.throws(()=>checkManifest(dir,source,report));Object.assign(report,previous);
 }
 save();
 writeFileSync(join(dir,'GankSoft-v'+version+'-win64-setup.exe'),'forbidden');assert.throws(()=>checkManifest(dir,source,report),/setup.exe forbidden/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
