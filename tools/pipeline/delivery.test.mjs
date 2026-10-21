import test from 'node:test';import assert from 'node:assert/strict';
import {delivery,validateDelivery} from '../ci/delivery.mjs';
import {readFileSync} from 'node:fs';
test('download names separate queued RC1/3/4 while every ZIP root stays short',()=>{
 const names=new Set();for(const version of ['0.7.4','0.7.4-rc.1','0.7.4-rc.3','0.7.4-rc.4']){
 const d=delivery(version);assert.equal(d.installer,`GankSoft-v${version}-win64-setup.exe`);assert.equal(d.portable,`GankSoft-v${version}-win64-portable.zip`);assert.equal(d.zipRoot,'GankSoft/');names.add(d.installer);names.add(d.portable);
 }assert.equal(names.size,8);for(const v of ['../bad','0.7.4-rc.0','0.7.4+foo'])assert.throws(()=>delivery(v));
});
function fixture(){const d=delivery('0.7.4-rc.4'),source={delivery:d,version:'0.7.4-rc.4',name:'full-internal-source-run-identity',runId:'123',runAttempt:'2'},hash='f'.repeat(64),z={status:'PASS',platform:'win32',archive:d.portable,archiveSha256:hash,zipRoot:d.zipRoot,maxEntryPath:120,filesVerified:10,destinations:[80,100].map(n=>({status:'PASS',destinationLength:n,maxAbsolutePath:n+121,filesVerified:10}))};return {source,report:{buildIdentity:source.name,runId:'123',runAttempt:'2',zipExtraction:z},names:[d.installer,d.portable],hash};}
test('delivery requires actual Windows extraction, full build identity and exact names/hash',()=>{
 const f=fixture();validateDelivery(f.source,f.report,f.names,f.hash);
 for(const change of [r=>r.zipExtraction.status='FAIL',r=>r.zipExtraction.platform='linux',r=>r.zipExtraction.zipRoot='long-old-name/',r=>r.zipExtraction.destinations.pop(),r=>r.zipExtraction.destinations[1].maxAbsolutePath=260,r=>r.zipExtraction.destinations[1].filesVerified=9,r=>r.zipExtraction.archiveSha256='0'.repeat(64),r=>r.runId='wrong',r=>r.runAttempt='1',r=>r.buildIdentity='substituted']){const r=structuredClone(f.report);change(r);assert.throws(()=>validateDelivery(f.source,r,f.names,f.hash));}
 assert.throws(()=>validateDelivery({...f.source,delivery:undefined,packagingToolchain:{sha:'a'.repeat(40)}},f.report,f.names,f.hash),/Delivery evidence missing/);
 assert.throws(()=>validateDelivery(f.source,f.report,f.names.map(n=>n.replace('rc.4','rc.3')),f.hash));assert.throws(()=>validateDelivery({...f.source,delivery:{...f.source.delivery,zipRoot:'wrong/'}},f.report,f.names,f.hash));
});
test('production keeps internal identity and uses fixed-root ZIP plus mandatory extraction in existing package job',()=>{
 const ps=readFileSync('tools/ci/windows-package.ps1','utf8');assert.match(ps,/DArtifactName=\$\(\$meta.name\)/);assert.match(ps,/\$meta.delivery.installer/);assert.match(ps,/\$meta.delivery.portable\)" GankSoft/);assert.match(ps,/windows-extract.ps1/);
 const meta=readFileSync('tools/ci/metadata.mjs','utf8');for(const field of ['...meta','packagingToolchain:','runId:','name,','delivery:'])assert.ok(meta.includes(field));
});
