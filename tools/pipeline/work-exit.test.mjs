import test from'node:test';import assert from'node:assert/strict';import{canExitWork}from'./work-exit.mjs';
test('Work exits after local work and verified remote handoff even while CI/build/release are pending',()=>{
 const good={implementationComplete:true,localRequiredTestsPass:true,remoteCheckpointVerified:true,handoffSavedAndVerified:true,ci:'CI_PENDING',build:'BUILD_PENDING',release:'NOT_RELEASED'};assert.equal(canExitWork(good),true);
 for(const key of ['implementationComplete','localRequiredTestsPass','remoteCheckpointVerified','handoffSavedAndVerified'])assert.equal(canExitWork({...good,[key]:false}),false);
 assert.equal(canExitWork({}),false);
});
