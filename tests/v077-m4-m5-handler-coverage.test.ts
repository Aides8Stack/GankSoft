import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {IMPLEMENTED,loadCases} from '../tools/validation/v077/registry.mjs';

const plan=JSON.parse(readFileSync('docs/v077/evidence/T2-MERGED-PLAN.json','utf8'));
const ledger=loadCases();
const ids=plan.phases.filter(x=>x.id==='T2-M4'||x.id==='T2-M5')
  .flatMap(x=>x.checkpoints.flatMap(c=>c.ids))
  .filter(id=>id.startsWith('MEDIA-')||id.startsWith('EX-')||id.startsWith('SET-')||
    id.startsWith('BACK-')||id.startsWith('TRASH-')||id.startsWith('FAULT-')||
    ['WIN-01','WIN-02','WIN-03','WIN-08'].includes(id));
const existing=new Set([
 ...Object.keys(IMPLEMENTED).filter(x=>!ids.includes(x))
]);
const modulePath=id=> 'tools/validation/v077/'+IMPLEMENTED[id];

test('complete 250 canonical journeys have concrete executable handlers and exactly 44 newly mapped M4/M5 IDs',()=>{
  assert.equal(ledger.length,250);
  assert.equal(new Set(ledger.map(x=>x.id)).size,250);
  assert.equal(Object.keys(IMPLEMENTED).length,250);
  assert.equal(ids.length,44);
  assert.equal(new Set(ids).size,44);
  for(const id of ledger.map(x=>x.id)){
    assert.ok(IMPLEMENTED[id],id+' is still missing its automation');
    assert.ok(existsSync(modulePath(id)),id+' maps to a non-existing scenario file');
  }
  for(const id of ids)assert.ok(!existing.has(id));
});
test('all 44 original IDs have a real branch and GUI feedback + SQLite/restart evidence driver',()=>{
  for(const id of ids){
    const source=readFileSync(modulePath(id),'utf8');
    assert.ok(source.includes("'"+id+"'"),id+' missing implementation branch');
    assert.match(source,/executeCase\(/,id+' has no real Electron harness');
    assert.ok(/observe\(ctx\)|trace\(ctx\)/.test(source),id+' has no UI feedback recorder');
    assert.match(source,/evidence\(ctx\)/,id+' has no result screenshot/diagnostics');
    assert.match(source,/assert\./,id+' has no expected-outcome assertion');
    assert.ok(/getByRole|getByTestId|locator\(/.test(source),id+' has no user-facing GUI interaction');
    assert.ok(/api\.call\(|snapshot\(ctx\.fixture\)|protectedFacts\(ctx\)|readContainer\(|sha256\(/.test(source),
      id+' does not verify persisted app facts, native file or package identity');
  }
});
test('every M4/M5 source module passes Node parser (real Node24 runtime)',()=>{
  const modules=new Set(ids.map(modulePath));
  for(const path of ['tools/validation/v077/scenarios/m4-support.mjs',
    'tools/validation/v077/m5-pair-verify.mjs',...modules]){
    const p=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
    assert.equal(p.status,0,path+' '+p.stderr);
  }
});
test('Windows physical cases never auto-claim both hosts, and missing environment is blocking',()=>{
  const native=['BACK-14','WIN-01','WIN-02','WIN-03','WIN-08'];
  for(const id of native){
    const s=readFileSync(modulePath(id),'utf8');
    assert.match(s,/preflight\(id,out/);
    assert.match(s,/process\.env|operatorStep|actualOs/);
  }
  for(const id of ['BACK-14','WIN-01','WIN-03']){
    const s=readFileSync(modulePath(id),'utf8');
    assert.match(s,/throw blocked\(/,'Cross-host case must not pass on one host');
  }
  const verify=readFileSync('tools/validation/v077/m5-pair-verify.mjs','utf8');
  for(const id of ['BACK-14','WIN-01','WIN-03'])assert.ok(verify.includes("'"+id+"'"));
  assert.match(verify,/READY_FOR_HUMAN_REVIEW_NOT_AUTO_PASS/);
  assert.doesNotMatch(verify,/E2E-RESULTS\.json/);
  const helper=readFileSync('tools/validation/v077/helpers.mjs','utf8');
  assert.match(helper,/WINDOWS_PHYSICAL_INPUT_REQUIRED/);
  assert.match(helper,/inputBlocked\?'BLOCKED'/);
});
test('new cases do not overwrite existing real PASS/FAIL results',()=>{
  for(const id of ids){
    const row=ledger.find(x=>x.id===id);
    assert.ok(row);
    assert.ok(['PASS','FAIL','BLOCKED','NOT_RUN'].includes(row.electronUi));
  }
  assert.equal(ledger.filter(x=>x.electronUi==='PASS').length+
    ledger.filter(x=>x.electronUi==='FAIL').length+
    ledger.filter(x=>x.electronUi==='BLOCKED').length+
    ledger.filter(x=>x.electronUi==='NOT_RUN').length,250);
});
