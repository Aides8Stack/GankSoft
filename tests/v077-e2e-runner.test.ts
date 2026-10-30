import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {IMPLEMENTED,loadCases,selectCases,resultExitCode} from '../tools/validation/v077/registry.mjs';

test('v077 contract: at least 250 unique scoped journeys with risk tiers',()=>{
  const cases=loadCases();
  assert.ok(cases.length>=250);
  assert.ok(cases.some(c=>c.id==='EDITOR-20'&&c.issue==='#20'));
  assert.ok(cases.some(c=>c.id==='EDITOR-21'&&c.issue==='#20'));
  assert.equal(new Set(cases.map(c=>c.id)).size,cases.length);
  assert.ok(cases.filter(c=>c.priority==='P0').length>=58);
  assert.ok(cases.filter(c=>c.priority==='P1').length>=163);
  assert.ok(cases.filter(c=>c.priority==='P2').length>=29);
});

test('v077 executable registry never claims unimplemented journeys as automated',()=>{
  const cases=loadCases(),mapped=selectCases(cases,{mappedOnly:true});
  assert.deepEqual(mapped.map(x=>x.id),Object.keys(IMPLEMENTED).sort((a,b)=>
    cases.findIndex(c=>c.id===a)-cases.findIndex(c=>c.id===b)));
  assert.ok(mapped.length>=6);
  assert.equal(cases.length-mapped.length,cases.filter(c=>!IMPLEMENTED[c.id]).length);
  for(const script of Object.values(IMPLEMENTED))
    assert.ok(existsSync(fileURLToPath(new URL('../tools/validation/v077/'+script,import.meta.url))));
});

test('v077 CLI lists every unmapped NEW scenario rather than reporting full coverage',()=>{
  const result=spawnSync(process.execPath,['tools/validation/v077/run.mjs','list',
    '--group','NEW'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const summary=JSON.parse(result.stdout);
  assert.ok(summary.selected>=19);
  assert.ok(summary.implemented>=3);
  assert.equal(summary.unmapped,summary.selected-summary.implemented);
  assert.ok(summary.uncoveredIDs.includes('NEW-19'));
});

test('v077 ID, priority and group selection rejects unknown cases',()=>{
  const cases=loadCases();
  assert.throws(()=>selectCases(cases,{ids:['NEW-99']}),/V077_UNKNOWN_CASE_ID/);
  assert.ok(selectCases(cases,{group:'OLD',mappedOnly:true}).some(x=>x.id==='OLD-03'));
  assert.ok(selectCases(cases,{priority:'P0'}).every(c=>c.priority==='P0'));
  assert.throws(()=>selectCases(cases,{group:'AN',mappedOnly:true}),/V077_NO_IMPLEMENTED_CASES/);
});

test('v077 promotion rejects unmapped PASS and API-only proof without changing ledger',async()=>{
  const {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync}=await import('node:fs');
  const {resolve,join}=await import('node:path');
  const root=resolve('validation-results/v077/runs');
  mkdirSync(root,{recursive:true});
  const dir=mkdtempSync(join(root,'m0-proof-'));
  const ledger=readFileSync('docs/v077/E2E-RESULTS.json','utf8');
  const sha=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
  try{
    for(const [id,layer,error] of [['AN-01','electronUi','PASS_WITHOUT_AUTOMATED_HANDLER'],
      ['NEW-01','api','PASS_REQUIRES_ELECTRON_UI']]){
      const row={id,status:'PASS',layer,platform:process.platform,steps:['proof'],evidence:['proof']};
      mkdirSync(join(dir,id));writeFileSync(join(dir,id,'case.json'),JSON.stringify(row));
      writeFileSync(join(dir,'summary.json'),JSON.stringify({schema:'ganksoft.v077/automation-run-1',
        testLayer:'electronUi',sourceSha:sha,platform:process.platform,rows:[row]}));
      const result=spawnSync(process.execPath,['tools/validation/v077/promote.mjs',join(dir,'summary.json')],{encoding:'utf8'});
      assert.notEqual(result.status,0);assert.match(result.stderr,new RegExp(error));
      assert.equal(readFileSync('docs/v077/E2E-RESULTS.json','utf8'),ledger);
    }
  }finally{rmSync(dir,{recursive:true,force:true});}
});


test('v077 exit codes distinguish actual failure from blocked or uncovered selection',()=>{
  assert.equal(resultExitCode([{status:'PASS'}]),0);
  assert.equal(resultExitCode([{status:'FAIL'},{status:'BLOCKED'}]),1);
  assert.equal(resultExitCode([{status:'PASS'},{status:'BLOCKED'}]),2);
  assert.equal(resultExitCode([{status:'NOT_RUN'}]),2);
  assert.equal(resultExitCode([]),2);
});

test('v077 unimplemented execution emits NOT_RUN and exit 2 without touching ledger',()=>{
  const result=spawnSync(process.execPath,['tools/validation/v077/run.mjs','run','--ids','AN-01'],{encoding:'utf8'});
  assert.equal(result.status,2,result.stderr);
  assert.match(result.stdout,/"notRun":1/);
});
