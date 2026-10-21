// Independent human authorization policy. It never converts hidden bypass data to [].
import {readFileSync,writeFileSync,mkdirSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyDirectory} from './artifacts.mjs';
import {requireBuildProtection} from './protection.mjs';
import {publishRC} from './release.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
export const canonical = value => JSON.stringify(value); // schema constructed in fixed order below
const fullSha = v => typeof v==='string' && /^[a-f0-9]{40}$/.test(v);
const decimal = v => typeof v==='string' && /^[1-9]\d*$/.test(v);
const seconds = () => Math.floor(Date.now()/1000);
const context = env => ({repository:env.GITHUB_REPOSITORY,coordinator:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT});
export function requestFor(plan,root,now=seconds()) {
 if(plan.schema!==1||!fullSha(plan.coordinator)||!decimal(String(plan.runId))||!decimal(String(plan.runAttempt))||!Array.isArray(plan.intents)||!plan.intents.length)throw Error('Invalid approval plan');
 const versions=new Set(),shas=new Set();
 const intents=plan.intents.map(item=>{
  if(!fullSha(item.sha)||!/^\d+\.\d+\.\d+-rc\.[1-9]\d*$/.test(item.version)||versions.has(item.version)||shas.has(item.sha))throw Error('Invalid or duplicate RC intent');
  versions.add(item.version);shas.add(item.sha);
  const dir=join(root,item.sha,'artifacts'),bundle=verifyDirectory(dir,item,{coordinatorSha:plan.coordinator});
  if(String(bundle.source.runId)!==String(plan.runId)||bundle.source.runUrl!==`https://github.com/${plan.repository}/actions/runs/${plan.runId}`||String(bundle.source.runAttempt)!==String(plan.runAttempt))throw Error('Package from wrong build Run/attempt');
  return {sha:item.sha,version:item.version,lockSha256:item.lockSha256,pr:item.pr,packagingToolchain:bundle.source.packagingToolchain,windowsVersion:bundle.source.windowsVersion,manifestSha256:hash(readFileSync(join(dir,'SHA256SUMS.txt')))};
 });
 return {schema:1,policy:'OWNER_ENVIRONMENT_ATTESTATION_V1',repository:plan.repository,branch:'develop',coordinator:plan.coordinator,runId:String(plan.runId),runAttempt:String(plan.runAttempt),createdAt:now,planSha256:hash(canonical(plan)),intents};
}
export function requestDigest(request){return hash(canonical(request));}
export function validateRequest(request,plan,root,env,policy,now=seconds()) {
 if(!Number.isSafeInteger(policy.rcApproval?.maxApprovalAgeSeconds)||policy.rcApproval.maxApprovalAgeSeconds<1||policy.rcApproval.maxApprovalAgeSeconds>900||!Number.isSafeInteger(policy.rcApproval.maxRequestAgeSeconds)||policy.rcApproval.maxRequestAgeSeconds<1||policy.rcApproval.maxRequestAgeSeconds>86400)throw Error('Invalid owner approval lifetime policy');
 if(policy.rcAuthorization!=='OWNER_ENVIRONMENT_ATTESTATION_V1'||env.GITHUB_REF!=='refs/heads/develop'||!['push','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)||!policy.owners.includes(env.GITHUB_ACTOR))throw Error('Untrusted owner RC context');
 const ctx=context(env);
 for(const key of Object.keys(ctx))if(request[key]!==ctx[key])throw Error('Approval Run/SHA/repository mismatch');
 if(request.repository!==policy.repository||!Number.isSafeInteger(request.createdAt)||request.createdAt>now||now-request.createdAt>policy.rcApproval.maxRequestAgeSeconds)throw Error('Approval request expired');
 const expected=requestFor(plan,root,request.createdAt);
 if(canonical(request)!==canonical(expected))throw Error('Approval request or artifacts changed');
 return requestDigest(request);
}
export function approvalComment(digest,checkedAt){return `RC-APPROVE ${digest} ${checkedAt} CHECKED-LIVE-RULESETS-NO-BYPASS-REQUIRED-CHECKS-STRICT-PR-NO-FORCE-NO-DELETE`;}
export function validateEnvironment(environment,branches,policy) {
 // can_admins_bypass is not a documented GET response field. A missing value
 // cannot prove it disabled; actual owner approval history is always required,
 // even if GitHub let a job start through an environment bypass.

 const cfg=policy.rcApproval,rule=environment?.protection_rules?.find(r=>r.type==='required_reviewers');
 if(!Number.isSafeInteger(environment?.id)||environment.name!==cfg.environment||environment.can_admins_bypass===true||!rule||rule.prevent_self_review!==false||rule.reviewers?.length!==1)throw Error('Owner Environment protections unavailable');
 const reviewer=rule.reviewers[0];
 if(reviewer.type!=='User'||reviewer.reviewer?.id!==cfg.ownerId||reviewer.reviewer?.login!==cfg.ownerLogin)throw Error('Owner reviewer mismatch');
 const p=environment.deployment_branch_policy;
 if(p?.custom_branch_policies!==true||p.protected_branches!==false||branches?.branch_policies?.length!==1||branches.branch_policies[0].name!=='develop'||!['branch',undefined].includes(branches.branch_policies[0].type))throw Error('Environment must allow develop branch only');
 return true;
}
export function validateApproval(reviews,environment,request,policy,now=seconds()) {
 if(!Array.isArray(reviews))throw Error('Owner approval evidence unavailable');
 const relevant=reviews.filter(r=>r.environments?.some(e=>e.id===environment.id&&e.name===environment.name));
 if(relevant.some(r=>r.state==='rejected'))throw Error('Owner rejected this Run');
 const digest=requestDigest(request),matches=[];
 for(const review of relevant){
  if(review.state!=='approved'||review.user?.id!==policy.rcApproval.ownerId||review.user?.login!==policy.rcApproval.ownerLogin)continue;
  const m=/^RC-APPROVE ([a-f0-9]{64}) ([1-9]\d*) CHECKED-LIVE-RULESETS-NO-BYPASS-REQUIRED-CHECKS-STRICT-PR-NO-FORCE-NO-DELETE$/.exec(review.comment??'');
  if(!m||m[1]!==digest)continue;
  const checkedAt=Number(m[2]);
  // GitHub review history has no approval timestamp: checkedAt is explicitly owner-attested.
  if(!Number.isSafeInteger(checkedAt)||checkedAt<request.createdAt||checkedAt>now||now-checkedAt>=policy.rcApproval.maxApprovalAgeSeconds)continue;
  matches.push({policy:request.policy,reviewer:review.user.login,reviewerId:review.user.id,checkedAt,expiresAt:checkedAt+policy.rcApproval.maxApprovalAgeSeconds,requestSha256:digest,environmentId:environment.id,runId:request.runId,runAttempt:request.runAttempt,machineBypassVerification:'NOT_VERIFIED',humanProtectionVerification:'OWNER_ATTESTED'});
 }
 if(matches.length!==1)throw Error('Exactly one fresh owner approval for this request required');
 return matches[0];
}
const requiredJobs=['preflight','quality (ubuntu-latest)','quality (windows-latest)','security','windows-package','artifact-verify'];
export function validateBuildRun(run,jobs,request,policy) {
 if(run?.repository?.full_name!==policy.repository||run.head_repository?.full_name!==policy.repository||String(run.id)!==request.runId||String(run.run_attempt)!==request.runAttempt||run.head_sha!==request.coordinator||run.head_branch!=='develop'||run.path!=='.github/workflows/develop-rc.yml'||!['push','workflow_dispatch'].includes(run.event)||!policy.owners.includes(run.actor?.login)||!policy.owners.includes(run.triggering_actor?.login)||!['in_progress','waiting','pending'].includes(run.status))throw Error('Wrong or inactive build Run');
 for(const name of requiredJobs){const found=jobs.filter(j=>j.name===name);if(found.length!==1||found[0].status!=='completed'||found[0].conclusion!=='success'||String(found[0].run_id)!==request.runId)throw Error(`Required build job not successful: ${name}`);}
 return true;
}
async function listJobs(api,path){const jobs=[];for(let page=1;;page++){const r=await api(`${path}?per_page=100&page=${page}`);if(!Array.isArray(r?.jobs))throw Error('Build Jobs unavailable');jobs.push(...r.jobs);if(r.jobs.length<100)return jobs;}}
export async function requireOwnerApproval(api,request,policy,now=seconds()) {
 const repo=policy.repository,base=`/repos/${repo}`,run=await api(`${base}/actions/runs/${request.runId}`);
 const jobs=await listJobs(api,`${base}/actions/runs/${request.runId}/attempts/${request.runAttempt}/jobs`);
 validateBuildRun(run,jobs,request,policy);
 const name=encodeURIComponent(policy.rcApproval.environment),environment=await api(`${base}/environments/${name}`),branches=await api(`${base}/environments/${name}/deployment-branch-policies?per_page=100`);
 validateEnvironment(environment,branches,policy);
 const reviews=await api(`${base}/actions/runs/${request.runId}/approvals`);
 const receipt=validateApproval(reviews,environment,request,policy,now);
 const visible=await requireBuildProtection(api,repo,'develop');
 return {...receipt,visibleProtection:visible};
}
export function writeRequest(plan,root,policy,now=seconds()) {
 const request=requestFor(plan,root,now),digest=requestDigest(request);
 writeFileSync('approval-request.json',JSON.stringify(request,null,2)+'\n');
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\n## Owner RC approval required\nPolicy: OWNER_ENVIRONMENT_ATTESTATION_V1 (not machine verification of hidden bypass actors).\n\nRun ${request.runId}, attempt ${request.runAttempt}, coordinator ${request.coordinator}\n\n${request.intents.map(i=>`- ${i.version}: ${i.sha}; tools ${i.packagingToolchain.sha}; Windows ${i.windowsVersion.numeric}; manifest ${i.manifestSha256}`).join('\n')}\n\nInspect Settings → Rules → Rulesets: all applicable active rulesets, complete bypass lists empty, required checks/source, Strict, PR, no force/delete. Then Review deployments → ${policy.rcApproval.environment}. Copy the following comment and replace CHECKED_AT_UNIX_SECONDS with the current UTC Unix seconds after inspection:\n\n\`\`\`text\n${approvalComment(digest,'CHECKED_AT_UNIX_SECONDS')}\n\`\`\`\n\nThis approval names every listed RC individually. Reject if any item is unwanted. Approval expires after ${policy.rcApproval.maxApprovalAgeSeconds}s; rerun requires a new approval.\n`);
 return request;
}
export async function releaseOwnerApproved(api,plan,policy,{env=process.env,root='downloads/rc-packages',request=JSON.parse(readFileSync('approval-request.json','utf8')),now=seconds}={}) {
 validateRequest(request,plan,root,env,policy,now());
 let receipt=await requireOwnerApproval(api,request,policy,now());
 if(now()>=receipt.expiresAt)throw Error('Owner approval expired while checking GitHub');
 mkdirSync('release-receipts',{recursive:true});
 writeFileSync('release-receipts/owner-authorization.json',JSON.stringify({request,...receipt},null,2)+'\n');
 const ledger=[];
 for(const item of plan.intents){
  const beforeWrite=async()=>{
   validateRequest(request,plan,root,env,policy,now());
   receipt=await requireOwnerApproval(api,request,policy,now());
   if(now()>=receipt.expiresAt)throw Error('Owner approval expired while checking GitHub');
   writeFileSync('release-receipts/owner-authorization.json',JSON.stringify({request,...receipt},null,2)+'\n');
  };
  const result=await publishRC(api,plan.repository,item,join(root,item.sha,'artifacts'),{beforeWrite});
  if(result.status==='ALREADY_PUBLISHED_VERIFIED'){const local=verifyDirectory(join(root,item.sha,'artifacts'),item).map;if(Object.keys(result.checksums).length!==local.size||[...local].some(([name,digest])=>result.checksums[name]!==digest))throw Error('Already-published version belongs to another build; never replace');}
  ledger.push({...result,authorization:receipt});writeFileSync('release-receipts/ledger.json',JSON.stringify(ledger,null,2)+'\n');
 }
 return ledger;
}
