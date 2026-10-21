import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';import {parseDocument} from 'yaml';
import {requestFor,requestDigest,validateRequest,approvalComment,validateEnvironment,validateApproval,validateBuildRun,requireOwnerApproval,releaseOwnerApproved} from './owner-rc.mjs';
import {requireBuildProtection,requireReleaseProtection} from './protection.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),clone=x=>structuredClone(x),repo='Aides8Stack/GankSoft',now=1800000000;
const policy={repository:repo,owners:['Aides8Stack'],rcAuthorization:'OWNER_ENVIRONMENT_ATTESTATION_V1',rcApproval:{environment:'rc-publish-owner',ownerId:344626996,ownerLogin:'Aides8Stack',maxApprovalAgeSeconds:900,maxRequestAgeSeconds:86400}};
const env={GITHUB_REPOSITORY:repo,GITHUB_REF:'refs/heads/develop',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'400',GITHUB_RUN_ATTEMPT:'1',GITHUB_EVENT_NAME:'push',GITHUB_ACTOR:'Aides8Stack'};
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'gank owner 审批 ')),item={sha:'b'.repeat(40),version:'0.7.4-rc.3',lockSha256:'c'.repeat(64),pr:8},dir=join(root,item.sha,'artifacts');mkdirSync(dir,{recursive:true});
 const source={sha:item.sha,version:item.version,lockSha256:item.lockSha256,runUrl:`https://github.com/${repo}/actions/runs/400`,runAttempt:'1'};
 for(const n of ['source.json','build-metadata.json'])writeFileSync(join(dir,n),JSON.stringify(source));
 writeFileSync(join(dir,'TEST_REPORT.json'),JSON.stringify({sourceSha:item.sha,version:item.version,...Object.fromEntries(['install','launch','uninstall','portable','installed','internalVersion','zipIntegrity'].map(k=>[k,'PASS']))}));
 for(const ext of ['setup.exe','portable.zip'])writeFileSync(join(dir,`GankSoft-${item.version}-${ext}`),ext);
 writeFileSync(join(dir,'SHA256SUMS.txt'),readdirSync(dir).sort().map(n=>hash(readFileSync(join(dir,n)))+'  '+n).join('\n')+'\n');
 const plan={schema:1,repository:repo,coordinator:env.GITHUB_SHA,runId:'400',runAttempt:'1',intents:[item]},request=requestFor(plan,root,now);
 const environment={id:12,name:policy.rcApproval.environment,can_admins_bypass:false,protection_rules:[{type:'required_reviewers',prevent_self_review:false,reviewers:[{type:'User',reviewer:{id:344626996,login:'Aides8Stack'}}]}],deployment_branch_policy:{custom_branch_policies:true,protected_branches:false}},branches={branch_policies:[{name:'develop',type:'branch'}]};
 const review={state:'approved',user:{id:344626996,login:'Aides8Stack'},environments:[{id:12,name:environment.name}],comment:approvalComment(requestDigest(request),now)};
 const run={id:400,run_attempt:1,repository:{full_name:repo},head_repository:{full_name:repo},head_sha:env.GITHUB_SHA,head_branch:'develop',path:'.github/workflows/develop-rc.yml',event:'push',status:'in_progress',actor:{login:'Aides8Stack'},triggering_actor:{login:'Aides8Stack'}};
 const jobs=['preflight','quality (ubuntu-latest)','quality (windows-latest)','security','windows-package','artifact-verify'].map(name=>({name,status:'completed',conclusion:'success',run_id:400}));
 const rules=['deletion','non_fast_forward','pull_request','required_status_checks'].map(type=>({type,ruleset_id:1}));rules[2].parameters={required_review_thread_resolution:true};rules[3].parameters={strict_required_status_checks_policy:true,required_status_checks:['pr-gate','pr-trust'].map(context=>({context,integration_id:15368}))};
 const state={reviews:[review],environment,branches,run,jobs,rules,set:{id:1,enforcement:'active'},writes:[],assets:[],bytes:new Map(),release:null,tag:null};
 const api=async(path,opts={})=>{
  const u=new URL(path.startsWith('https:')?path:'https://api.github.com'+path),p=u.pathname,method=opts.method??'GET';
  if(method!=='GET')state.writes.push([method,p]);
  if(p.endsWith('/approvals'))return state.reviews;
  if(p.endsWith('/attempts/1/jobs'))return {jobs:state.jobs};
  if(p.endsWith('/actions/runs/400'))return state.run;
  if(p.endsWith('/deployment-branch-policies'))return state.branches;
  if(p.includes('/environments/'))return state.environment;
  if(p.endsWith('/branches/develop')&&!p.includes('/rules/'))return {protected:true};
  if(p.includes('/rules/branches/'))return state.rules;
  if(p.endsWith('/rulesets/1'))return state.set;
  if(p.includes('/git/ref/tags/'))return state.tag?{object:{sha:state.tag,type:'commit'}}:null;
  if(p.includes('/releases/tags/'))return state.release;
  if(p.endsWith('/releases')&&method==='GET')return state.release?[state.release]:[];
  if(p.endsWith('/releases')&&method==='POST'){state.release={id:1,html_url:'https://example/rc',...opts.body};return state.release;}
  if(p.endsWith('/releases/1/assets')&&method==='GET')return state.assets;
  if(p.endsWith('/releases/1/assets')&&method==='POST'){const id=state.assets.length+1,b=opts.body;state.assets.push({id,name:u.searchParams.get('name'),state:'uploaded',digest:'sha256:'+hash(b)});state.bytes.set(id,b);return {};}
  if(p.includes('/releases/assets/'))return state.bytes.get(Number(p.split('/').at(-1)));
  if(p.endsWith('/releases/1')&&method==='PATCH'){Object.assign(state.release,opts.body);state.tag=item.sha;return state.release;}
  throw Error('Unexpected mock request '+path);
 };
 return {root,dir,item,plan,request,environment,branches,review,run,jobs,state,api,clean(){rmSync(root,{recursive:true,force:true});}};
}
function use(fn){return async()=>{const f=fixture();try{await fn(f);}finally{f.clean();}};}
test('build can proceed with explicitly unverified bypass; strict release validator still refuses',use(async f=>{
 assert.equal((await requireBuildProtection(f.api,repo,'develop')).policy,'BUILD_ONLY_BYPASS_UNVERIFIED');await assert.rejects(requireReleaseProtection(f.api,repo,'develop'),/bypass evidence unavailable/);
 assert.equal(f.state.writes.length,0);
}));
test('valid owner authorization is independent human evidence, not machine verification',use(async f=>{
 validateRequest(f.request,f.plan,f.root,env,policy,now);const r=await requireOwnerApproval(f.api,f.request,policy,now);assert.equal(r.humanProtectionVerification,'OWNER_ATTESTED');assert.equal(r.machineBypassVerification,'NOT_VERIFIED');assert.equal(f.state.writes.length,0);
}));
for(const label of ['missing','rejected','foreign','wrong-id','wrong-env','empty-comment','wrong-digest','expired','future'])test('approval rejects '+label,use(async f=>{
 const r=f.state.reviews[0];
 if(label==='missing')f.state.reviews=[];
 if(label==='rejected')r.state='rejected';
 if(label==='foreign')r.user.login='outsider';
 if(label==='wrong-id')r.user.id=1;
 if(label==='wrong-env')r.environments[0].id=99;
 if(label==='empty-comment')r.comment='';
 if(label==='wrong-digest')r.comment=approvalComment('d'.repeat(64),now);
 if(label==='expired')r.comment=approvalComment(requestDigest(f.request),now-901);
 if(label==='future')r.comment=approvalComment(requestDigest(f.request),now+1);
 await assert.rejects(requireOwnerApproval(f.api,f.request,policy,now));assert.equal(f.state.writes.length,0);
}));
test('same-owner self approval is explicit, Environment must not allow nonowner/bypass/wildcard',use(async f=>{
 validateEnvironment(f.environment,f.branches,policy);
 const undocumented=clone(f.environment);delete undocumented.can_admins_bypass;validateEnvironment(undocumented,f.branches,policy);assert.throws(()=>validateApproval([],undocumented,f.request,policy,now));
 for(const mutate of [e=>e.can_admins_bypass=true,e=>e.protection_rules=[],e=>e.protection_rules[0].prevent_self_review=true,e=>e.protection_rules[0].reviewers[0].type='Team',e=>e.protection_rules[0].reviewers.push({})]){const e=clone(f.environment);mutate(e);assert.throws(()=>validateEnvironment(e,f.branches,policy));}
 for(const b of [null,{branch_policies:[{name:'*'}]},{branch_policies:[{name:'develop',type:'tag'}]},{branch_policies:[{name:'develop'},{name:'main'}]}])assert.throws(()=>validateEnvironment(f.environment,b,policy));
}));
test('approval binds every source/version/manifest and coordinator/run/attempt; artifacts tamper rejects',use(async f=>{
 for(const key of ['repository','coordinator','runId','runAttempt']){const r=clone(f.request);r[key]='wrong';assert.throws(()=>validateRequest(r,f.plan,f.root,env,policy,now));}
 for(const key of ['sha','version','lockSha256','pr','manifestSha256']){const r=clone(f.request);r.intents[0][key]='wrong';assert.throws(()=>validateRequest(r,f.plan,f.root,env,policy,now));}
 assert.throws(()=>validateRequest(f.request,f.plan,f.root,{...env,GITHUB_RUN_ATTEMPT:'2'},policy,now));
 assert.throws(()=>validateRequest(f.request,f.plan,f.root,env,policy,now+86401));
 writeFileSync(join(f.dir,`GankSoft-${f.item.version}-setup.exe`),'tampered');assert.throws(()=>validateRequest(f.request,f.plan,f.root,env,policy,now));
}));
test('CI evidence rejects failed/skipped/missing/duplicate jobs and wrong Run identity',use(async f=>{
 for(const state of ['failure','skipped','cancelled']){const j=clone(f.jobs);j[1].conclusion=state;assert.throws(()=>validateBuildRun(f.run,j,f.request,policy));}
 assert.throws(()=>validateBuildRun(f.run,f.jobs.slice(1),f.request,policy));assert.throws(()=>validateBuildRun(f.run,[...f.jobs,f.jobs[0]],f.request,policy));
 for(const [key,value]of [['run_attempt',2],['head_sha','d'.repeat(40)],['head_branch','main'],['event','pull_request'],['path','.github/workflows/stable-candidate.yml'],['status','completed'],['triggering_actor',{login:'outsider'}],['head_repository',{full_name:'fork/repo'}]])assert.throws(()=>validateBuildRun({...f.run,[key]:value},f.jobs,f.request,policy));
}));
test('all API errors fail closed before Release mutation',use(async f=>{
 for(const part of ['/actions/runs/400','/attempts/1/jobs','/environments/','/approvals','/rulesets/1']){
  await assert.rejects(requireOwnerApproval(async(p,o)=>{if(p.includes(part))throw Error('403/network');return f.api(p,o);},f.request,policy,now));
 }
 assert.equal(f.state.writes.length,0);
}));
test('visible bypass, bad required checks or lost strict never overridden by owner approval',use(async f=>{
 f.state.set.bypass_actors=[{}];await assert.rejects(requireOwnerApproval(f.api,f.request,policy,now));
 f.state.set.bypass_actors=[];f.state.rules.at(-1).parameters.strict_required_status_checks_policy=false;await assert.rejects(requireOwnerApproval(f.api,f.request,policy,now));assert.equal(f.state.writes.length,0);
}));
test('production publisher with owner policy publishes mock once, replay is read-only idempotent',use(async f=>{
 const old=process.cwd(),cwd=mkdtempSync(join(tmpdir(),'gank receipt '));process.chdir(cwd);
 try{
  const options={env,root:f.root,request:f.request,now:()=>now};
  const result=await releaseOwnerApproved(f.api,f.plan,policy,options);assert.equal(result[0].status,'RC_RELEASED');assert.equal(f.state.release.prerelease,true);
  const writes=f.state.writes.length;assert.equal((await releaseOwnerApproved(f.api,f.plan,policy,options))[0].status,'ALREADY_PUBLISHED_VERIFIED');assert.equal(f.state.writes.length,writes);
  const receipt=JSON.parse(readFileSync('release-receipts/owner-authorization.json'));assert.equal(receipt.humanProtectionVerification,'OWNER_ATTESTED');assert.equal(receipt.request.runAttempt,'1');
 }finally{process.chdir(old);rmSync(cwd,{recursive:true,force:true});}
}));
test('no approval or wrong SHA causes zero writes through actual owner publication entrypoint',use(async f=>{
 f.state.reviews=[];await assert.rejects(releaseOwnerApproved(f.api,f.plan,policy,{env,root:f.root,request:f.request,now:()=>now}));assert.equal(f.state.writes.length,0);
}));
test('expired authorization after an upload leaves Draft, no public PATCH',use(async f=>{
 const old=process.cwd(),cwd=mkdtempSync(join(tmpdir(),'gank expiration '));process.chdir(cwd);let clock=now;
 const delayed=async(p,o)=>{const result=await f.api(p,o);if(o?.upload)clock=now+901;return result;};
 try{await assert.rejects(releaseOwnerApproved(delayed,f.plan,policy,{env,root:f.root,request:f.request,now:()=>clock}));assert.equal(f.state.release.draft,true);assert.equal(f.state.writes.some(([method])=>method==='PATCH'),false);}
 finally{process.chdir(old);rmSync(cwd,{recursive:true,force:true});}
}));
test('approval expiry during slow GitHub reads is checked again before any write',use(async f=>{
 let clock=now;
 const delayed=async(p,o)=>{const result=await f.api(p,o);if(p.endsWith('/rulesets/1'))clock=now+901;return result;};
 await assert.rejects(releaseOwnerApproved(delayed,f.plan,policy,{env,root:f.root,request:f.request,now:()=>clock}),/expired while checking/);assert.equal(f.state.writes.length,0);
}));
test('native workflow waits only after verification, build jobs read-only, Stable untouched',()=>{
 const doc=parseDocument(readFileSync('.github/workflows/develop-rc.yml','utf8'));assert.deepEqual(doc.errors,[]);const w=doc.toJS();
 const pub=w.jobs['release-rc'];assert.equal(pub.environment.name,'rc-publish-owner');assert.deepEqual(pub.needs,['artifact-verify']);assert.equal(pub.permissions.contents,'write');assert.equal(pub.permissions.actions,'read');
 for(const name of ['preflight','quality','security','windows-package','artifact-verify']){assert.equal(w.jobs[name].environment,undefined);assert.notEqual(w.jobs[name].permissions?.contents,'write');}
 assert.match(w.concurrency.group,/github.run_id/);assert.equal(pub.concurrency.group,'ganksoft-owner-rc-publish');assert.equal(pub.concurrency['cancel-in-progress'],false);
 assert.equal(w.on.workflow_dispatch.inputs.reconcile.type,'boolean');assert.equal(Object.keys(w.on).includes('workflow_run'),false);
});

test('wrong coordinator through actual release entrypoint and occupied version are rejected without writes',use(async f=>{
 await assert.rejects(releaseOwnerApproved(f.api,f.plan,policy,{env:{...env,GITHUB_SHA:'d'.repeat(40)},root:f.root,request:f.request,now:()=>now}));assert.equal(f.state.writes.length,0);
 const old=process.cwd(),cwd=mkdtempSync(join(tmpdir(),'gank conflict '));process.chdir(cwd);
 try{f.state.tag='d'.repeat(40);await assert.rejects(releaseOwnerApproved(f.api,f.plan,policy,{env,root:f.root,request:f.request,now:()=>now}),/another SHA/);assert.equal(f.state.writes.length,0);}
 finally{process.chdir(old);rmSync(cwd,{recursive:true,force:true});}
}));
test('hidden bypass permits build only, visible bypass/malformed evidence/API failure stops build',use(async f=>{
 for(const bypass of [[{}],null,'[]']){f.state.set.bypass_actors=bypass;await assert.rejects(requireBuildProtection(f.api,repo,'develop'));}
 await assert.rejects(requireBuildProtection(async()=>{throw Error('403');},repo,'develop'),/403/);assert.equal(f.state.writes.length,0);
}));
test('packages from a different run or attempt and duplicate RC versions cannot create approval request',use(async f=>{
 for(const name of ['source.json','build-metadata.json']){
  const source=JSON.parse(readFileSync(join(f.dir,name)));source.runAttempt='2';writeFileSync(join(f.dir,name),JSON.stringify(source));
 }
 writeFileSync(join(f.dir,'SHA256SUMS.txt'),readdirSync(f.dir).filter(n=>n!=='SHA256SUMS.txt').sort().map(n=>hash(readFileSync(join(f.dir,n)))+'  '+n).join('\n')+'\n');
 assert.throws(()=>requestFor(f.plan,f.root,now),/wrong build Run/);
 for(const name of ['source.json','build-metadata.json']){const source=JSON.parse(readFileSync(join(f.dir,name)));source.runAttempt='1';writeFileSync(join(f.dir,name),JSON.stringify(source));}
 writeFileSync(join(f.dir,'SHA256SUMS.txt'),readdirSync(f.dir).filter(n=>n!=='SHA256SUMS.txt').sort().map(n=>hash(readFileSync(join(f.dir,n)))+'  '+n).join('\n')+'\n');
 assert.throws(()=>requestFor({...f.plan,intents:[f.item,f.item]},f.root,now),/duplicate RC/);
}));
