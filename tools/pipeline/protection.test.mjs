import test from 'node:test';import assert from 'node:assert/strict';
import {validateProtection,requireReleaseProtection,authorizeReleaseContext} from './protection.mjs';
const fixture=()=>({branch:{protected:true},rules:[{type:'deletion'},{type:'non_fast_forward'},{type:'pull_request',parameters:{required_review_thread_resolution:true}},{type:'required_status_checks',parameters:{strict_required_status_checks_policy:true,required_status_checks:['pr-gate','pr-trust'].map(context=>({context,integration_id:15368}))}}].map(r=>({...r,ruleset_id:1})),sets:[{id:1,enforcement:'active',bypass_actors:[]}]});
test('effective protection requires PR, strict trusted statuses, deletion/force restrictions and no bypass',()=>{
 const f=fixture();assert.equal(validateProtection(f.branch,f.rules,f.sets),true);
 for(const type of ['deletion','non_fast_forward','pull_request','required_status_checks'])assert.throws(()=>validateProtection(f.branch,f.rules.filter(r=>r.type!==type),f.sets));
 for(const contexts of [[{context:'pr-gate',integration_id:15368}],[{context:'pr-gate',integration_id:1},{context:'pr-trust',integration_id:15368}]]){const x=fixture();x.rules.at(-1).parameters.required_status_checks=contexts;assert.throws(()=>validateProtection(x.branch,x.rules,x.sets));}
 const x=fixture();x.rules.at(-1).parameters.strict_required_status_checks_policy=false;assert.throws(()=>validateProtection(x.branch,x.rules,x.sets));
 for(const set of [{id:1,enforcement:'evaluate',bypass_actors:[]},{id:1,enforcement:'active',bypass_actors:[{actor_type:'RepositoryRole',actor_id:5}]},null])assert.throws(()=>validateProtection(f.branch,f.rules,[set]));
 assert.throws(()=>validateProtection({protected:true},null,[]));assert.throws(()=>validateProtection({protected:false},f.rules,f.sets));
});

test('PR/fork/target/run events and unauthorized dispatch cannot enter a publishing context',()=>{
 const env={GITHUB_REPOSITORY:'owner/repo',GITHUB_REF:'refs/heads/develop',GITHUB_ACTOR:'owner',GITHUB_EVENT_NAME:'push'};
 assert.equal(authorizeReleaseContext(env,'owner/repo','develop',['owner']),true);
 assert.equal(authorizeReleaseContext({...env,GITHUB_EVENT_NAME:'workflow_dispatch'},'owner/repo','develop',['owner']),true);
 for(const name of ['pull_request','pull_request_target','workflow_run','issue_comment'])assert.throws(()=>authorizeReleaseContext({...env,GITHUB_EVENT_NAME:name},'owner/repo','develop',['owner']));
 for(const edit of [{GITHUB_REPOSITORY:'fork/repo'},{GITHUB_REF:'refs/pull/4/merge'},{GITHUB_ACTOR:'attacker'}])assert.throws(()=>authorizeReleaseContext({...env,...edit},'owner/repo','develop',['owner']));
 assert.throws(()=>authorizeReleaseContext(env,'owner/repo','develop',['owner'],true));
});
test('release preflight reads effective rules and details, rejects unavailable API without writes',async()=>{
 const f=fixture(),calls=[],api=async path=>{calls.push(path);if(path.endsWith('/branches/develop')&&!path.includes('/rules/'))return f.branch;if(path.includes('/rules/branches/'))return f.rules;return f.sets[0];};
 assert.equal(await requireReleaseProtection(api,'owner/repo','develop'),true);assert.equal(calls.length,3);assert.ok(calls.some(x=>x.endsWith('/rules/branches/develop')));
 await assert.rejects(requireReleaseProtection(async()=>({protected:true}),'owner/repo','develop'),/unavailable/);
 await assert.rejects(requireReleaseProtection(async()=>{throw Error('403');},'owner/repo','develop'),/403/);
 await assert.rejects(requireReleaseProtection(api,'owner/repo','feature'),/Invalid release branch/);
});
