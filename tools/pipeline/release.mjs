import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{join}from'node:path';import{pathToFileURL}from'node:url';
import{client,pages}from'./github.mjs';
import{authorizeReleaseContext}from'./protection.mjs';import{json}from'./version.mjs';import{sha256}from'./queue.mjs';import{verifyDirectory,checksums,identity}from'./artifacts.mjs';
export async function tagSha(api,repo,tag){let ref=await api(`/repos/${repo}/git/ref/tags/${encodeURIComponent(tag)}`);if(!ref)return null;let object=ref.object;for(let i=0;object.type==='tag'&&i<8;i++)object=(await api(`/repos/${repo}/git/tags/${object.sha}`)).object;if(object.type!=='commit')throw Error('Invalid release tag');return object.sha;}
export async function getRelease(api,repo,tag){const direct=await api(`/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`);if(direct)return direct;const matches=(await pages(api,`/repos/${repo}/releases`)).filter(r=>r.tag_name===tag);if(matches.length>1)throw Error('Duplicate release drafts require manual inspection');return matches[0]??null;}
export async function verifyRemote(api,repo,release,item,expected,extras=[]){
 if(release.tag_name!=='v'+item.version)throw Error('Release tag mismatch');
 const assets=await pages(api,`/repos/${repo}/releases/${release.id}/assets`),map=new Map(assets.map(a=>[a.name,a]));
 if(map.size!==assets.length)throw Error('Duplicate release assets');
 const download=async name=>{const a=map.get(name);if(!a||a.state!=='uploaded')throw Error('Missing uploaded release asset');const b=await api(`/repos/${repo}/releases/assets/${a.id}`,{binary:true});if(!Buffer.isBuffer(b))throw Error('Invalid asset response');return b;};
 const raw=await download('SHA256SUMS.txt'),sums=checksums(raw.toString());
 if([...sums.keys()].filter(n=>n.endsWith('-setup.exe')&&n.includes(item.version)).length!==1||[...sums.keys()].filter(n=>n.endsWith('-portable.zip')&&n.includes(item.version)).length!==1)throw Error('Remote Windows release binaries missing');
 if(map.size!==sums.size+1+extras.filter(n=>map.has(n)).length||[...sums.keys()].some(n=>!map.has(n)))throw Error('Incomplete or extra remote assets');
 for(const [name,hash]of sums){const a=map.get(name);if(a.digest){if(a.digest!=='sha256:'+hash)throw Error('Remote digest conflict');}else if(sha256(await download(name))!==hash)throw Error('Remote bytes conflict');}
 const source=JSON.parse((await download('source.json')).toString());identity(source,item);
 const meta=JSON.parse((await download('build-metadata.json')).toString());identity(meta,item);
 const report=JSON.parse((await download('TEST_REPORT.json')).toString());if(report.sourceSha!==item.sha||report.version!==item.version||['install','launch','uninstall','portable','installed','internalVersion','zipIntegrity'].some(k=>report[k]!=='PASS'))throw Error('Remote acceptance missing');
 if(expected && raw.toString()!==expected)throw Error('Release belongs to a different build; preserve draft and recover original artifacts');
 return {url:release.html_url,sha:item.sha,version:item.version,checksums:Object.fromEntries(sums)};
}
export async function published(api,repo,item){
 const sha=await tagSha(api,repo,'v'+item.version);if(sha&&sha!==item.sha)throw Error('Tag already belongs to another SHA');
 const release=await getRelease(api,repo,'v'+item.version);if(!release&&sha)throw Error('Withdrawn or orphaned tag cannot be reused');if(!release||release.draft)return false;
 if(!release.prerelease||sha!==item.sha)throw Error('Existing release is not the expected RC');
 return verifyRemote(api,repo,release,item);
}
export async function publishRC(api,repo,item,dir,{draftOnly=false,stable=false,beforeWrite=async()=>{}}={}){
 const local=verifyDirectory(dir,item),tag='v'+item.version;
 const initialTag=await tagSha(api,repo,tag);if(initialTag&&initialTag!==item.sha)throw Error('Tag already belongs to another SHA');
 const done=stable?false:await published(api,repo,item);if(done)return {status:'ALREADY_PUBLISHED_VERIFIED',...done};
 let release=await getRelease(api,repo,tag);if(initialTag&&!release)throw Error('Withdrawn or orphaned tag cannot be reused');
 const notes=`${stable?'Stable candidate / manual approval required':'Automated RC / Testing'}\nSource: ${item.sha}\nMerge PR: ${item.pr?'#'+item.pr:'manual stable candidate'}\nVersion: ${item.version}\nWorkflow: ${local.source.runUrl} attempt ${local.source.runAttempt}\nLock SHA256: ${item.lockSha256}\nWindows10/11 manual acceptance: NOT_RUN\n`;
 if(release && (!release.draft||release.target_commitish!==item.sha||release.body!==notes))throw Error('Draft identity conflict; manual recovery required');
 if(!release){await beforeWrite('prepare',item);release=await api(`/repos/${repo}/releases`,{method:'POST',body:{tag_name:tag,target_commitish:item.sha,name:`GankSoft v${item.version} (Windows x64 · ${stable?'Stable candidate':'RC'})`,body:notes,draft:true,prerelease:!stable,make_latest:'false'}});}
 const existing=await pages(api,`/repos/${repo}/releases/${release.id}/assets`),expected=new Map([...local.map,['SHA256SUMS.txt',sha256(readFileSync(join(dir,'SHA256SUMS.txt')))]]);
 for(const a of existing){if(!expected.has(a.name)||a.state!=='uploaded')throw Error('Unexpected partial draft asset; preserve for inspection');const data=await api(`/repos/${repo}/releases/assets/${a.id}`,{binary:true});if(sha256(data)!==expected.get(a.name))throw Error('Draft asset conflict; never overwrite');}
 for(const [name]of expected)if(!existing.some(a=>a.name===name)){await beforeWrite('upload',item);await api(`https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`,{method:'POST',body:readFileSync(join(dir,name)),upload:true});}
 await verifyRemote(api,repo,release,item,readFileSync(join(dir,'SHA256SUMS.txt'),'utf8'));
 if(draftOnly)return {status:'DRAFT_PREPARED',url:release.html_url,sha:item.sha,version:item.version};
 const before=await tagSha(api,repo,tag);if(before&&before!==item.sha)throw Error('Tag race conflict');
 await beforeWrite('publish',item);
 release=await api(`/repos/${repo}/releases/${release.id}`,{method:'PATCH',body:{draft:false,prerelease:true,make_latest:'false'}});
 if(release.draft||!release.prerelease||await tagSha(api,repo,tag)!==item.sha)throw Error('Published identity mismatch');
 return {status:'RC_RELEASED',...await verifyRemote(api,repo,release,item)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const plan=json('plan.json'),api=client();if(process.env.GITHUB_REPOSITORY!==plan.repository||process.env.GITHUB_SHA!==plan.coordinator||process.env.GITHUB_REF!=='refs/heads/develop')throw Error('Untrusted publishing context');
 authorizeReleaseContext(process.env,plan.repository,'develop',json('tools/pipeline/policy.json').owners);
 const policy=json('tools/pipeline/policy.json');
 if(policy.rcAuthorization==='OWNER_ENVIRONMENT_ATTESTATION_V1'){
  const {releaseOwnerApproved}=await import('./owner-rc.mjs');
  await releaseOwnerApproved(api,plan,policy);
 }else throw Error('RC requires explicit owner Environment authorization policy');
}
