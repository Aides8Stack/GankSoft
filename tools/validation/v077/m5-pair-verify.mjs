// Pair independent real Windows host evidence; never promotes 250-case ledger automatically.
// Usage: node tools/validation/v077/m5-pair-verify.mjs <WIN-01|WIN-03|BACK-14> <hostA.json> <hostB.json> <paired.json>
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const [id,pathA,pathB,output]=process.argv.slice(2);
if(!['WIN-01','WIN-03','BACK-14'].includes(id)||!pathA||!pathB||!output)
 throw Error('USAGE: m5-pair-verify.mjs WIN-01|WIN-03|BACK-14 <A.json> <B.json> <paired.json>');
const a=JSON.parse(readFileSync(resolve(pathA),'utf8'));
const b=JSON.parse(readFileSync(resolve(pathB),'utf8'));
const goodHash=value=>assert.match(value??'',/^[a-f0-9]{64}$/);
const source=value=>assert.match(value??'',/^[a-f0-9]{40}$/);
function checkWindows(record){
 assert.ok(['win10','win11'].includes(record.os?.family));
 assert.equal(record.os?.arch,'x64');
 assert.ok(Number.isInteger(record.os.build)&&record.os.build>=19041);
 if(record.os.family==='win10')assert.ok(record.os.build<22000);
 else assert.ok(record.os.build>=22000);
}
for(const item of [a,b]){
 checkWindows(item);
 if(id==='BACK-14'){
   source(item.sourceSha);
   const names=item.steps?.map(x=>x.action)??[];
   for(const action of ['save_cancel','save_confirm','open_cancel'])
     assert.ok(names.includes(action),'BACK-14 host missing actual native Windows '+action);
   assert.equal(item.steps.find(x=>x.action==='save_cancel').zeroWrite,true);
   assert.equal(item.steps.find(x=>x.action==='open_cancel').zeroWrite,true);
   assert.ok(item.steps.find(x=>x.action==='save_confirm').size>400);
   assert.ok(item.reboot?.oldPid!==item.reboot?.newPid);
 }else{
   assert.equal(item.schema,'ganksoft.v077/win-host-1');
   assert.equal(item.caseId,id);
   assert.equal(item.localOutcome,'PASS');
   goodHash(item.zipSha256);goodHash(item.exeSha256);source(item.sourceSha);
   assert.ok(item.version);
   if(id==='WIN-01'){
     assert.equal(item.installerIncluded,false);
     assert.equal(item.source,'POWER_SHELL_EXPAND_ARCHIVE');
     assert.ok(item.entries>100&&item.pathUnicode);
   }else{
     assert.ok([100,125].includes(item.scalePercent));
     assert.ok(Math.abs(item.nativeScale*100-item.scalePercent)<1);
     assert.equal(item.pages?.length,6);
     assert.ok(item.pages.every(x=>x.controls>0&&x.contentWidth>350));
   }
 }
}
if(id==='BACK-14'){
 assert.deepEqual([a.os.family,b.os.family].sort(),['win10','win11']);
 assert.equal(a.sourceSha,b.sourceSha,'Win10 and Win11 native dialogs tested different source commits');
}else{
 assert.equal(a.zipSha256,b.zipSha256,'Two Windows hosts used different ZIP artifacts');
 assert.equal(a.exeSha256,b.exeSha256,'Two Windows hosts extracted different EXE bytes');
 assert.equal(a.sourceSha,b.sourceSha,'Two hosts used different production commits');
 assert.equal(a.version,b.version,'Two hosts used different application versions');
 if(id==='WIN-01')assert.deepEqual([a.os.family,b.os.family].sort(),['win10','win11'],
   'Cross-platform ZIP test requires both Win10 and Win11');
 if(id==='WIN-03')assert.deepEqual([a.scalePercent,b.scalePercent].sort((x,y)=>x-y),[100,125],
   'Physical display test requires actual 100% AND 125% Windows scale');
}
const result={
 schema:'ganksoft.v077/native-paired-review-1',caseId:id,status:'READY_FOR_HUMAN_REVIEW_NOT_AUTO_PASS',
 sourceSha:a.sourceSha,pairedAt:new Date().toISOString(),hostA:resolve(pathA),hostB:resolve(pathB),
 nativePlatforms:[a.os.family,b.os.family],sameArtifact:id==='BACK-14'?null:true,
 zipSha256:id==='BACK-14'?null:a.zipSha256,
 note:'Inspect original GUI screenshots, Windows console traces, SHA and case.json. Do NOT promote canonical PASS from this comparison alone.'
};
writeFileSync(resolve(output),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({caseId:id,status:result.status,sourceSha:result.sourceSha,out:resolve(output)}));
