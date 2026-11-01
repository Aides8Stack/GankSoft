import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {validationRegistryFixture} from './fixtures/validation-registry.ts';
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
  assert.deepEqual(summary.uncoveredIDs,loadCases().filter(c=>c.id.startsWith('NEW-')&&!IMPLEMENTED[c.id]).map(c=>c.id));
});

test('v077 ID, priority and group selection rejects unknown cases',()=>{
  const cases=loadCases();
  assert.throws(()=>selectCases(cases,{ids:['NEW-99']}),/V077_UNKNOWN_CASE_ID/);
  assert.ok(selectCases(cases,{group:'OLD',mappedOnly:true}).some(x=>x.id==='OLD-03'));
  assert.ok(selectCases(cases,{priority:'P0'}).every(c=>c.priority==='P0'));
  assert.deepEqual(selectCases(cases,{group:'AN',mappedOnly:true}).map(x=>x.id),cases.filter(x=>x.id.startsWith('AN-')&&IMPLEMENTED[x.id]).map(x=>x.id));
  const unmapped={...cases[0],id:'UNMAPPED-01'};
  assert.throws(()=>selectCases([...cases,unmapped],{group:'UNMAPPED',mappedOnly:true}),/V077_NO_IMPLEMENTED_CASES/);
  assert.deepEqual(selectCases([unmapped],{}),[unmapped]);
});

test('v077 promotion rejects unmapped PASS and API-only proof without changing either ledger',()=>{
  const fixture=validationRegistryFixture(),original=readFileSync('docs/v077/E2E-RESULTS.json','utf8');
  const dir=join(fixture.root,'validation-results/v077/runs/negative-proof');mkdirSync(dir,{recursive:true});
  const sha=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
  try{
    for(const [id,layer,error] of [['AN-08','electronUi','PASS_WITHOUT_AUTOMATED_HANDLER'],['NEW-01','api','PASS_REQUIRES_ELECTRON_UI']]){
      const row={id,status:'PASS',layer,platform:process.platform,steps:['proof'],evidence:['proof']};
      mkdirSync(join(dir,id));writeFileSync(join(dir,id,'case.json'),JSON.stringify(row));
      const report=join(dir,'summary.json');writeFileSync(report,JSON.stringify({schema:'ganksoft.v077/automation-run-1',testLayer:'electronUi',sourceSha:sha,platform:process.platform,rows:[row]}));
      const result=spawnSync(process.execPath,[join(fixture.tools,'promote.mjs'),report],{cwd:fixture.root,encoding:'utf8'});
      assert.notEqual(result.status,0);assert.match(result.stderr,new RegExp(error));
      assert.equal(readFileSync(fixture.ledgerPath,'utf8'),fixture.ledger);assert.equal(readFileSync('docs/v077/E2E-RESULTS.json','utf8'),original);
    }
  }finally{fixture.close();}
});

test('v077 exit codes distinguish actual failure from blocked or uncovered selection',()=>{
  assert.equal(resultExitCode([{status:'PASS'}]),0);
  assert.equal(resultExitCode([{status:'FAIL'},{status:'BLOCKED'}]),1);
  assert.equal(resultExitCode([{status:'PASS'},{status:'BLOCKED'}]),2);
  assert.equal(resultExitCode([{status:'NOT_RUN'}]),2);
  assert.equal(resultExitCode([]),2);
});

test('v077 unimplemented execution emits NOT_RUN and exit 2 without touching either ledger',()=>{
 const fixture=validationRegistryFixture(),original=readFileSync('docs/v077/E2E-RESULTS.json','utf8');
 try{
  const result=spawnSync(process.execPath,[join(fixture.tools,'run.mjs'),'run','--ids','AN-08'],{cwd:fixture.root,encoding:'utf8'});
  assert.equal(result.status,2,result.stderr);assert.match(result.stdout,/"notRun":1/);assert.match(result.stdout,/"failed":0/);
  assert.equal(readFileSync(fixture.ledgerPath,'utf8'),fixture.ledger);assert.equal(readFileSync('docs/v077/E2E-RESULTS.json','utf8'),original);
 }finally{fixture.close();}
});
