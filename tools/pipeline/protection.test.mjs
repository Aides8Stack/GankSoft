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
 assert.equal(await requireReleaseProtection(api,'owner/repo','develop'),true);assert.equal(calls.length,3);assert.ok(calls.some(x=>x === '/repos/owner/repo/rules/branches/develop?per_page=100&page=1'));
 await assert.rejects(requireReleaseProtection(async()=>({protected:true}),'owner/repo','develop'),/Missing paginated GitHub result/);
 await assert.rejects(requireReleaseProtection(async()=>{throw Error('403');},'owner/repo','develop'),/403/);
 await assert.rejects(requireReleaseProtection(api,'owner/repo','feature'),/Invalid release branch/);
});

// Test the actual HTTP adapter, including GitHub's documented omission shape.
import {client} from './github.mjs';
function transportFixture(f, {detail=f.sets[0], failure, secondPage=[]}={}) {
 const calls=[];
 const api=client('test-only-token',async(url,options)=>{
  calls.push({path:url.pathname,search:url.search,method:options.method});
  assert.equal(options.method,'GET');
  if(failure && url.pathname.includes(failure.path)) {
   if(failure.network)throw Error('network unavailable');
   return new Response('{}',{status:failure.status});
  }
  let body;
  if(url.pathname.includes('/rules/branches/')) body=url.searchParams.get('page')==='2'?secondPage:f.rules;
  else if(url.pathname.includes('/rulesets/'))body=detail;
  else body=f.branch;
  return new Response(JSON.stringify(body),{status:200});
 });
 return {api,calls};
}
test('HTTP preflight accepts full valid evidence and optional detail fields without writes',async()=>{
 const f=fixture();const {api,calls}=transportFixture(f,{detail:{...f.sets[0],name:'protect-develop',current_user_can_bypass:'never',conditions:{ref_name:{include:['refs/heads/develop'],exclude:[]}}}});
 assert.equal(await requireReleaseProtection(api,'owner/repo','develop'),true);
 assert.equal(calls.length,3);assert.match(calls[1].search,/per_page=100/);
});
for(const [label,value] of [['missing',undefined],['null',null],['object',{}],['string','[]']])test(`HTTP preflight refuses ${label} bypass evidence with safe structural diagnostic`,async()=>{
 const f=fixture(),detail={id:1,enforcement:'active',current_user_can_bypass:'never',private_data:'DO_NOT_LOG'};
 if(label!=='missing')detail.bypass_actors=value;
 const {api}=transportFixture(f,{detail});
 await assert.rejects(requireReleaseProtection(api,'owner/repo','develop'),e=>{
  assert.match(e.message,/NEEDS_USER_ACTION/);assert.match(e.message,new RegExp(`bypass_actors=${label}`));assert.match(e.message,/ruleset=1/);assert.doesNotMatch(e.message,/test-only-token|DO_NOT_LOG|current_user_can_bypass/);return true;
 });
});
for(const [label,detail] of [['disabled',{id:1,enforcement:'disabled',bypass_actors:[]}],['evaluate',{id:1,enforcement:'evaluate',bypass_actors:[]}],['bypass',{id:1,enforcement:'active',bypass_actors:[{actor_type:'RepositoryRole',actor_id:5}]}],['missing',null],['wrong identity',{id:2,enforcement:'active',bypass_actors:[]}]])test(`HTTP preflight rejects ${label} ruleset`,async()=>{
 const {api}=transportFixture(fixture(),{detail});await assert.rejects(requireReleaseProtection(api,'owner/repo','develop'));
});
for(const path of ['/branches/develop','/rules/branches/','/rulesets/'])for(const status of [401,403,404,500])test(`HTTP preflight fails closed at ${path} status ${status}`,async()=>{
 const {api}=transportFixture(fixture(),{failure:{path,status}});await assert.rejects(requireReleaseProtection(api,'owner/repo','develop'));
});
test('HTTP preflight rejects network and malformed JSON responses',async()=>{
 const {api}=transportFixture(fixture(),{failure:{path:'/rulesets/',network:true}});await assert.rejects(requireReleaseProtection(api,'owner/repo','develop'),/network unavailable/);
 await assert.rejects(requireReleaseProtection(client('test-only-token',async()=>new Response('{')),'owner/repo','develop'));
});
for(const type of ['pull_request','deletion','non_fast_forward','required_status_checks'])test(`HTTP preflight rejects absent ${type} protection`,async()=>{
 const f=fixture();f.rules=f.rules.filter(r=>r.type!==type);const {api}=transportFixture(f);await assert.rejects(requireReleaseProtection(api,'owner/repo','develop'));
});
test('HTTP preflight rejects strict off, untrusted or absent required checks',async()=>{
 for(const change of [p=>p.strict_required_status_checks_policy=false,p=>p.required_status_checks.pop(),p=>p.required_status_checks[0].integration_id=1,p=>delete p.required_status_checks[1].integration_id]){
  const f=fixture();change(f.rules.at(-1).parameters);const {api}=transportFixture(f);await assert.rejects(requireReleaseProtection(api,'owner/repo','develop'));
 }
});
test('every effective ruleset must have live verifiable no-bypass evidence',async()=>{
 const f=fixture();f.rules.push({type:'creation',ruleset_id:2});
 const {api,calls}=transportFixture(f);await assert.rejects(requireReleaseProtection(api,'owner/repo','develop'),/ruleset=2/);assert.ok(calls.some(c=>c.path.endsWith('/rulesets/2')));
});
test('effective rules are paginated; a later unverifiable ruleset still blocks',async()=>{
 const f=fixture();f.rules.push(...Array.from({length:96},()=>({type:'creation',ruleset_id:1})));
 const {api,calls}=transportFixture(f,{secondPage:[{type:'creation',ruleset_id:2}]});
 await assert.rejects(requireReleaseProtection(api,'owner/repo','develop'),/ruleset=2/);
 assert.ok(calls.some(c=>c.search.includes('page=2')));
});
test('preflight refuses malformed ruleset identities and unavailable evidence containers',async()=>{
 for(const value of [undefined,null,'1',1.5]){const f=fixture();f.rules[0].ruleset_id=value;const {api}=transportFixture(f);await assert.rejects(requireReleaseProtection(api,'owner/repo','develop'),/identities unavailable/);}
 const f=fixture();for(const sets of [null,{},[]])assert.throws(()=>validateProtection(f.branch,f.rules,sets),/details required/);
});
