import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve,sep} from 'node:path';
import {IMPLEMENTED} from './registry.mjs';

// Explicit, reviewable promotion of verified local Electron reports to the canonical
// ledger. NEVER touches win10Real/win11Real or manufactures a Windows CI attestation.
const reportArg=process.argv[2];
const dryRun=process.argv.includes('--dry-run');
if (!reportArg || reportArg.startsWith('--')) throw Error(
  'USAGE: node tools/validation/v077/promote.mjs validation-results/v077/runs/<run>/summary.json [--dry-run]');
const source=new URL('../../../docs/v077/E2E-RESULTS.json',import.meta.url);
const reportPath=resolve(reportArg);
const evidenceRoot=resolve('validation-results/v077/runs')+sep;
assert.ok(reportPath.startsWith(evidenceRoot),'REPORT_NOT_FROM_ISOLATED_V077_RUN');
const report=JSON.parse(readFileSync(reportPath,'utf8'));
const ledger=JSON.parse(readFileSync(source,'utf8'));
assert.equal(report.schema,'ganksoft.v077/automation-run-1');
assert.equal(report.testLayer,'electronUi');
assert.ok(Array.isArray(report.rows));
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(report.sourceSha,sha,
  'STALE_AUTOMATION_REPORT: refusing to promote results from a different source commit');
let updated=0,passed=0,failed=0,blocked=0;
for(const row of report.rows){
  if(row.status==='NOT_RUN')continue;
  if(!['PASS','FAIL','BLOCKED'].includes(row.status))throw Error('INVALID_CASE_RESULT: '+row.id);
  const canonical=ledger.cases.find(x=>x.id===row.id);
  if(!canonical)throw Error('UNKNOWN_CASE_RESULT: '+row.id);
  if(row.status==='PASS'){
    assert.ok(Object.hasOwn(IMPLEMENTED,row.id),'PASS_WITHOUT_AUTOMATED_HANDLER: '+row.id);
    const proof=join(dirname(reportPath),row.id,'case.json');
    assert.ok(existsSync(proof),'MISSING_REAL_GUI_CASE_REPORT: '+row.id);
    const real=JSON.parse(readFileSync(proof,'utf8'));
    assert.equal(real.id,row.id);
    assert.equal(real.status,'PASS');
    assert.equal(real.layer,'electronUi','PASS_REQUIRES_ELECTRON_UI: '+row.id);
    assert.equal(real.platform,report.platform);
    assert.deepEqual(row.steps,real.steps,'GUI_STEPS_MISMATCH: '+row.id);
    assert.deepEqual(row.evidence,real.evidence,'GUI_EVIDENCE_MISMATCH: '+row.id);
    assert.ok(Array.isArray(row.steps) && row.steps.length>0,
      'PASS_MISSING_GUI_STEPS: '+row.id);
    assert.ok(Array.isArray(row.evidence) && row.evidence.length>0,
      'PASS_MISSING_EVIDENCE: '+row.id);
    passed++;
  }else if(row.status==='FAIL')failed++;else blocked++;
  canonical.electronUi=row.status;
  canonical.testedSha=sha;
  // Portable summary stays in Git; raw synthetic logs remain gitignored or CI artifacts.
  canonical.lastAutomation={platform:report.platform,layer:'electronUi',
    caseId:row.id,sourceSha:sha,runId:report.runId,status:row.status,
    actual:String(row.actual??row.reason??'').slice(0,300),
    steps:(row.steps??[]).slice(0,16),
    evidenceLocation:'local-only; '+String(reportArg)+'#'+row.id};
  canonical.evidence=[...new Set([...(canonical.evidence??[]),
    'SHA '+sha+' / '+row.id+' / '+row.status+' / '+report.platform])];
  updated++;
}
if (!updated)throw Error('NOTHING_EXECUTED; no ledger modifications permitted');
if (!dryRun)writeFileSync(source,JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify({dryRun,sourceSha:sha,updated,passed,failed,blocked,
  realWindowsTouched:false,windowsCiTouched:false,ledgerPath:'docs/v077/E2E-RESULTS.json'}));
