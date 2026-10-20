import { execFileSync } from 'node:child_process';
import { published,tagSha } from './release.mjs';
import { createHash } from 'node:crypto';
import { writeFileSync,appendFileSync } from 'node:fs';import {pathToFileURL} from 'node:url';
import {git,json,compare,parse,checkVersion} from './version.mjs';import {docsOnly} from './scope.mjs';import {client,pages} from './github.mjs';
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export function authorized(pr,sha,policy){return pr?.merged===true&&pr.merge_commit_sha===sha&&pr.base?.ref==='develop'&&pr.base?.repo?.full_name===policy.repository&&pr.head?.repo?.full_name===policy.repository&&policy.owners.includes(pr.user?.login)&&policy.owners.includes(pr.merged_by?.login);}
export function intents(records,baselineVersion){let previous=baselineVersion;return records.flatMap(r=>{
 checkVersion({version:r.version},r.lock,{baseVersion:previous,docsOnly:docsOnly(r.paths)});
 const changed=r.version!==previous;previous=r.version;if(!changed)return [];
 const v=parse(r.version);if(v.build||!/^rc\.[1-9]\d*$/.test(v.pre.join('.')))throw Error('Develop requires canonical rc.N version');
 return [{sha:r.sha,version:r.version,lockSha256:r.lockSha256,previousVersion:r.previousVersion}];
});}
export async function plan(api,head,policy){
 if(!/^[a-f0-9]{40}$/.test(head)||git('rev-parse','HEAD')!==head)throw Error('Invalid coordinator checkout');
 const branch=await api(`/repos/${policy.repository}/branches/develop`);
 if(!branch?.protected)throw Error('NEEDS_USER_ACTION: develop must be protected before automatic RC');
 git('merge-base','--is-ancestor',head,'origin/develop');
 const baseline=policy.adoptionBaseline,chain=git('rev-list','--first-parent','--reverse',`${baseline}..${head}`).split('\n').filter(Boolean);
 if(!git('rev-list','--first-parent',head).split('\n').includes(baseline))throw Error('Adoption baseline not on first-parent chain');
 const records=chain.map(sha=>{const p=JSON.parse(git('show',`${sha}:package.json`)),raw=git('show',`${sha}:package-lock.json`);return {sha,version:p.version,lock:JSON.parse(raw),lockSha256:sha256(execFileSync('git',['show',`${sha}:package-lock.json`])),previousVersion:JSON.parse(git('show',`${sha}^1:package.json`)).version,paths:git('diff','--name-only',`${sha}^1`,sha).split('\n').filter(Boolean)};});
 const queue=intents(records,JSON.parse(git('show',`${baseline}:package.json`)).version);
 for(const item of queue){
  const related=await pages(api,`/repos/${policy.repository}/commits/${item.sha}/pulls`);let trusted=null;
  for(const p of related){const pr=await api(`/repos/${policy.repository}/pulls/${p.number}`);if(authorized(pr,item.sha,policy)){trusted=pr;break;}}
  if(!trusted)throw Error(`Unauthorized direct push or merge: ${item.sha}`);item.pr=trusted.number;
 }
 const pending=[];const completed=[];for(const item of queue){const tag=await tagSha(api,policy.repository,'v'+item.version);if(tag&&tag!==item.sha)throw Error('Tag conflict');const done=await published(api,policy.repository,item);if(done)completed.push(done);else pending.push(item);}
 return {schema:1,repository:policy.repository,baseline,coordinator:head,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,intents:pending,completed};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const policy=json('tools/pipeline/policy.json');if(process.env.GITHUB_REPOSITORY!==policy.repository||process.env.GITHUB_REF!=='refs/heads/develop')throw Error('RC source must be develop');
 const p=await plan(client(),process.env.GITHUB_SHA,policy);writeFileSync('plan.json',JSON.stringify(p,null,2)+'\n');
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`count=${p.intents.length}\n`);console.log(JSON.stringify(p));
}
