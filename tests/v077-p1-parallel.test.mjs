import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectBatch,pool,workerLimit,classify} from '../tools/validation/v077/p1-parallel.mjs';
import {loadCases} from '../tools/validation/v077/registry.mjs';
const plan=JSON.parse(readFileSync('docs/v077/P1-FIVE-BATCHES.json'));
test('five batches select only original P1 NOT_RUN, never duplicate or excluded',()=>{
 const cases=loadCases(),ids=[];
 for(const batch of Object.keys(plan.batches)){
  const {selected,spec}=selectBatch(cases,plan,batch);
  assert.ok(selected.length<=spec.maxPending);
  for(const r of selected){assert.equal(r.priority,'P1');assert.equal(r.electronUi,'NOT_RUN');assert.ok(!plan.excluded.includes(r.id));ids.push(r.id);}
 }
 assert.equal(new Set(ids).size,ids.length);
 const initial=selectBatch(cases,plan,'B1').selected;
 assert.ok(initial.length<=34);
 const changed=structuredClone(cases);
 if(initial.length){changed.find(x=>x.id===initial[0].id).electronUi='PASS';
 assert.equal(selectBatch(changed,plan,'B1').selected.length,initial.length-1);}
 assert.throws(()=>selectBatch(cases,plan,'B1',{}),/Unregistered/);
});
test('pool executes each item once, overlaps and stays bounded',async()=>{
 let active=0,max=0;const visited=[];
 const results=await pool([1,2,3,4,5,6,7],3,async n=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));visited.push(n);active--;return n*2;});
 assert.equal(max,3);assert.deepEqual(results,[2,4,6,8,10,12,14]);assert.equal(new Set(visited).size,7);
});
test('resource fallback and exit codes never manufacture product failures',()=>{
 assert.equal(workerLimit(4,{cpus:8,memory:8*1024**3}),4);
 assert.equal(workerLimit(4,{cpus:8,memory:4*1024**3}),3);
 assert.equal(workerLimit(4,{cpus:2,memory:8*1024**3}),2);
 assert.equal(classify(null,{code:1}),'TEST_INFRA');
 assert.equal(classify({status:'FAIL'},{code:1}),'TEST_INFRA');
 assert.equal(classify({status:'PASS',layer:'electronUi',steps:['click'],evidence:['proof']},{code:1}),'TEST_INFRA');
});
test('aggregate keeps one trusted result and caps infrastructure retry',async()=>{
 const {aggregateReports,failureKey}=await import('../tools/validation/v077/p1-parallel.mjs');
 const run=classification=>({runId:classification,sourceSha:'frozen',rows:[{id:'ENV-03',classification,execution:{code:0}}]});
 assert.equal(aggregateReports([run('TEST_INFRA'),run('PASS')])[0].attemptCount,2);
 assert.throws(()=>aggregateReports([run('PASS'),run('PASS')]),/Multiple trusted/);
 assert.throws(()=>aggregateReports([run('TEST_INFRA'),run('TEST_INFRA'),run('TEST_INFRA')]),/More than/);
 assert.notEqual(failureKey({actual:'Timeout\n scenarios/a.mjs:10:1'},'a'),failureKey({actual:'Timeout\n scenarios/a.mjs:20:1'},'a'));
});
