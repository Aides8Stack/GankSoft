import{readFileSync,mkdirSync,writeFileSync}from'node:fs';import{join}from'node:path';import{pathToFileURL}from'node:url';import{execFileSync}from'node:child_process';
import{json,git,parse}from'./version.mjs';import{client,pages}from'./github.mjs';
import{requireReleaseProtection,authorizeReleaseContext}from'./protection.mjs';import{sha256}from'./queue.mjs';import{publishRC,tagSha,verifyRemote,getRelease}from'./release.mjs';import{checksums}from'./artifacts.mjs';
export function validateSignoffs(reports,item,portableHash,applicationHash){
 if(reports.length!==2)throw Error('Both Windows signoffs are mandatory');
 for(const [i,r] of reports.entries()){
  if(r.target!==['win10','win11'][i]||r.version!==item.version||r.sourceSha!==item.sha||r.zipSha256!==portableHash||r.exeSha256!==applicationHash||r.automated!=='passed'||r.msvcSignature!=='passed'||r.manualSignoff!=='passed'||Object.keys(r.manualCases??{}).length!==40||Array.from({length:40},(_,j)=>'W'+String(j+1).padStart(2,'0')).some(k=>r.manualCases[k]!=='passed'))throw Error('Stable requires real complete Win10/11 signoff for identical formal binaries');
 }
}
export async function stablePreflight(api,sha,policy,{allowRC=false}={}){
 authorizeReleaseContext(process.env,policy.repository,'main',policy.owners,true);
 if(!policy.owners.includes(process.env.GITHUB_ACTOR)||process.env.GITHUB_REF!=='refs/heads/main'||process.env.GITHUB_REPOSITORY!==policy.repository)throw Error('Owner manual dispatch on main required');
 if(!/^[a-f0-9]{40}$/.test(sha))throw Error('Full release source SHA required');
 const version=JSON.parse(git('show',`${sha}:package.json`)).version,v=parse(version);if((v.pre.length&&!allowRC)||v.build)throw Error('Stable requires formal SemVer from main source');
 const branch=v.pre.length?'develop':'main';git('merge-base','--is-ancestor',sha,'origin/'+branch);
 await requireReleaseProtection(api,policy.repository,branch);
 return {sha,version,lockSha256:sha256(execFileSync('git',['show',`${sha}:package-lock.json`]))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [mode]=process.argv.slice(2),policy=json('tools/pipeline/policy.json'),api=client(),item=await stablePreflight(api,process.env.SOURCE_SHA,policy,{allowRC:['query','rename','withdraw'].includes(mode)}),repo=policy.repository,tag='v'+item.version;
 if(mode==='plan'){
  if(git('rev-parse','HEAD')!==item.sha)throw Error('Prepare must checkout exact formal source');
  const existing=await tagSha(api,repo,tag);if(existing&&existing!==item.sha)throw Error('Stable tag conflict');
  writeFileSync('plan.json',JSON.stringify({schema:1,repository:repo,branch:'main',coordinator:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,intents:[item]},null,2)+'\n');
 }else if(mode==='prepare'){
  const plan=json('plan.json');if(plan.intents.length!==1||plan.intents[0].sha!==item.sha)throw Error('Candidate plan mismatch');
  console.log(await publishRC(api,repo,item,join('downloads/rc-packages',item.sha,'artifacts'),{stable:true,draftOnly:true}));
 }else{
  const release=await getRelease(api,repo,tag);if(!release||release.target_commitish!==item.sha||await tagSha(api,repo,tag)!==item.sha&& !release.draft)throw Error('Stable source mismatch');
  if(mode==='query'){console.log(JSON.stringify({tag,sha:item.sha,draft:release.draft,url:release.html_url}));}
  else if(mode==='rename'){
   if(process.env.CONFIRM!==`rename ${tag}`||!process.env.DISPLAY_NAME)throw Error('Explicit rename confirmation required');
   await api(`/repos/${repo}/releases/${release.id}`,{method:'PATCH',body:{name:process.env.DISPLAY_NAME,...(process.env.RELEASE_NOTES?{body:process.env.RELEASE_NOTES}:{})}});
  }else if(mode==='withdraw'){
   if(process.env.CONFIRM!==`withdraw ${tag} ${item.sha}`)throw Error('Explicit withdrawal confirmation required');
   await api(`/repos/${repo}/releases/${release.id}`,{method:'DELETE'});console.log('Release withdrawn; tag deliberately retained and cannot be reused');
  }else if(mode==='publish'){
   if(!release.draft||release.prerelease||process.env.CONFIRM!==`publish ${tag} ${item.sha}`)throw Error('Explicit stable publication confirmation required');
   await verifyRemote(api,repo,release,item,undefined,['win10-actual.json','win11-actual.json']);
   const assets=await pages(api,`/repos/${repo}/releases/${release.id}/assets`),download=async name=>{const a=assets.find(a=>a.name===name);if(!a)throw Error('Missing stable manual evidence');return api(`/repos/${repo}/releases/assets/${a.id}`,{binary:true});};
   const sums=checksums((await download('SHA256SUMS.txt')).toString()),portable=[...sums.keys()].find(n=>n.endsWith('-portable.zip')),report=JSON.parse((await download('TEST_REPORT.json')).toString()),reports=[];
   mkdirSync('validation-results',{recursive:true});
   for(const os of ['win10','win11']){const bytes=await download(os+'-actual.json');writeFileSync('validation-results/'+os+'-actual.json',bytes);reports.push(JSON.parse(bytes.toString().replace(/^\uFEFF/,'')));}
   validateSignoffs(reports,item,sums.get(portable),report.applicationExeSha256);
   // Keep the existing release gate, in addition to strict SHA binding above.
   execFileSync(process.execPath,['tools/validation/release-gate.mjs'],{stdio:'inherit'});
   const current=await tagSha(api,repo,tag);if(current&&current!==item.sha)throw Error('Tag changed before publication');
   const result=await api(`/repos/${repo}/releases/${release.id}`,{method:'PATCH',body:{draft:false,prerelease:false,make_latest:'true',name:`GankSoft v${item.version} (Windows x64 · Stable)`,body:release.body.replace('Stable candidate / manual approval required','Stable / owner-approved formal artifacts').replace('Windows10/11 manual acceptance: NOT_RUN','Windows10/11 manual acceptance: PASS (attached real same-package reports)')}});
   if(result.draft||result.prerelease||await tagSha(api,repo,tag)!==item.sha)throw Error('Stable publication verification failed');
   console.log(result.html_url);
  }else throw Error('Unknown manual release operation');
 }
}
