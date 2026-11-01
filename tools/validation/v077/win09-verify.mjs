// Offline Win10+Win11 pair verification. Does not change the canonical 250-case ledger.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const [win10Path,win11Path,outPath]=process.argv.slice(2);
if(!win10Path||!win11Path||!outPath)
  throw Error('USAGE: node tools/validation/v077/win09-verify.mjs <win10-host-proof.json> <win11-host-proof.json> <acceptance.json>');
const ten=JSON.parse(readFileSync(resolve(win10Path),'utf8'));
const eleven=JSON.parse(readFileSync(resolve(win11Path),'utf8'));
const required=['newCard','autoDraft','draftReopen','publishSameCard','formalReview',
  'objectiveCorrect','newPid','persistedEvent','dueOnRestart','guiHistory'];
function check(proof,family){
  assert.equal(proof.schema,'ganksoft.v077/native-win09-host-1');
  assert.equal(proof.caseId,'WIN-09');
  assert.equal(proof.os?.family,family);
  assert.equal(proof.os?.arch,'x64');
  assert.equal(proof.os?.productType,1,'Windows Server cannot provide client acceptance');
  assert.equal(proof.os?.identitySource,'Win32_OperatingSystem');
  assert.equal(proof.localOutcome,'PASS');
  assert.equal(proof.source,'EXTRACTED_PORTABLE_GANKSOFT_EXE');
  assert.equal(proof.attended,true);
  assert.match(proof.zipSha256??'',/^[0-9a-f]{64}$/);
  assert.match(proof.exeSha256??'',/^[0-9a-f]{64}$/);
  assert.match(proof.package?.buildSha??'',/^[0-9a-f]{40}$/);
  assert.ok(proof.package.version);
  for(const field of required)assert.equal(proof.workflow?.[field],true,
    family+' did not complete '+field);
  assert.equal(proof.workflow.scoreTenths,86);
  assert.equal(proof.workflow.rating,'good');
  assert.equal(proof.workflow.contentMode,'question');
}
check(ten,'win10');check(eleven,'win11');
assert.ok(ten.os.build>=19041&&ten.os.build<22000,'Invalid Win10 build');
assert.ok(eleven.os.build>=22000,'Invalid Win11 build');
assert.equal(ten.zipSha256,eleven.zipSha256,'Two hosts used different ZIP files');
assert.equal(ten.exeSha256,eleven.exeSha256,'Two hosts extracted different executable files');
assert.equal(ten.package.buildSha,eleven.package.buildSha,'Two hosts ran different production commits');
assert.equal(ten.package.version,eleven.package.version,'Two hosts ran different versions');
const output={schema:'ganksoft.v077/win09-paired-review-1',caseId:'WIN-09',
  status:'READY_FOR_HUMAN_REVIEW_NOT_AUTO_PASS',validatedAt:new Date().toISOString(),
  sameArtifact:true,zipSha256:ten.zipSha256,exeSha256:ten.exeSha256,buildSha:ten.package.buildSha,
  version:ten.package.version,hosts:[
    {os:'win10',build:ten.os.build,proof:resolve(win10Path)},
    {os:'win11',build:eleven.os.build,proof:resolve(win11Path)}],
  outstanding:'Inspect unredacted native GUI screenshots, full runner report and build hashes before promoting actual win10Real / win11Real results. Never infer PASS from this manifest alone.'};
writeFileSync(resolve(outPath),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({status:output.status,caseId:'WIN-09',sameArtifact:true,
  zipSha256:output.zipSha256,buildSha:output.buildSha,output:resolve(outPath)},null,2));
