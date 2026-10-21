import {packageToolchain} from './package-toolchain.mjs';
import {writeRequest} from './owner-rc.mjs';
import{join}from'node:path';import{writeFileSync}from'node:fs';import{json}from'./version.mjs';import{verifyDirectory}from'./artifacts.mjs';
const plan=json('plan.json');
if(plan.coordinator!==process.env.GITHUB_SHA||String(plan.runId)!==process.env.GITHUB_RUN_ID||String(plan.runAttempt)!==process.env.GITHUB_RUN_ATTEMPT)throw Error('Plan from wrong run');
for(const item of plan.intents){
 const dir=join('downloads/rc-packages',item.sha,'artifacts'),bundle=verifyDirectory(dir,item,{coordinatorSha:plan.coordinator,toolchain:packageToolchain(process.cwd(),plan.coordinator)});
 if(bundle.source.runUrl!==`${process.env.GITHUB_SERVER_URL}/${plan.repository}/actions/runs/${plan.runId}`||String(bundle.source.runAttempt)!==String(plan.runAttempt))throw Error('Package from wrong run');
 for(const os of ['ubuntu-latest','windows-latest']){const q=json(join('downloads','quality-'+os,item.sha,'reports/ci/quality.json'));if(q.sha!==item.sha||q.version!==item.version||q.lockSha256!==item.lockSha256||q.status!=='PASS'||!q.steps.length||q.steps.some(s=>s.status!=='PASS'))throw Error('Quality evidence missing');}
 const sec=json(join('downloads/security-reports',item.sha,'reports/ci/security.json'));if(sec.status!=='PASS'||sec.sha!==item.sha)throw Error('Security evidence missing');
}
writeFileSync('verified-plan.json',JSON.stringify(plan,null,2)+'\n');
if(json('tools/pipeline/policy.json').rcAuthorization==='OWNER_ENVIRONMENT_ATTESTATION_V1' && plan.intents.length)writeRequest(plan,'downloads/rc-packages',json('tools/pipeline/policy.json'));
