import {execFileSync,spawnSync}from'node:child_process';import{mkdirSync,mkdtempSync,cpSync,existsSync,writeFileSync}from'node:fs';import{resolve,join}from'node:path';import{tmpdir}from'node:os';
import {json,git}from'./version.mjs';import{scanSource,auditDependencies}from'./security.mjs';
const [mode,planPath='plan.json',output='pipeline-results']=process.argv.slice(2),plan=json(planPath),root=process.cwd(),target=resolve(output);
if(!['quality','security','package'].includes(mode)||!process.env.npm_execpath)throw Error('Use npm run pipeline:batch -- quality|security|package');
const run=(command,args,env)=>{const r=spawnSync(command,args,{stdio:'inherit',env,timeout:mode==='package'?2700000:1800000});if(r.error||r.status!==0)throw Error(`Batch ${mode} subprocess failed`);};
for(const item of plan.intents){
 const folder=mkdtempSync(join(tmpdir(),'gank-rc-')),result=join(target,item.sha);mkdirSync(result,{recursive:true});
 execFileSync('git',['worktree','add','--detach',folder,item.sha],{cwd:root});process.chdir(folder);
 const env={...process.env,GANKSOFT_SOURCE_SHA:item.sha,GANKSOFT_SOURCE_BRANCH:plan.branch??'develop',GANKSOFT_CHANNEL:plan.branch==='main'?'STABLE_CANDIDATE':'TEST_RC',GANKSOFT_COORDINATOR_SHA:plan.coordinator};
 const npm=(...args)=>run(process.execPath,[process.env.npm_execpath,...args],env);
 try{
  if(git('rev-parse','HEAD')!==item.sha||json('package.json').version!==item.version)throw Error('Intent source mismatch');
  mkdirSync('validation-results/ci',{recursive:true});npm('ci');
  if(mode==='quality'){
   npm('run','test:pipeline');npm('run','ci:quality');if(process.platform==='linux')run(process.execPath,['tools/validation/package-check.mjs'],env);
  }else if(mode==='security'){
   scanSource();const data=auditDependencies(json(join(root,'tools/pipeline/policy.json')));writeFileSync('validation-results/ci/security.json',JSON.stringify({status:'PASS',sha:item.sha,version:item.version,...data}));
  }else{
   if(process.platform!=='win32')throw Error('Windows package requires Windows');npm('run','build');run(process.execPath,[join(root,'tools/ci/metadata.mjs')],env);run('pwsh',['-NoProfile','-File',join(root,'tools/ci/windows-package.ps1')],env);
   run(process.execPath,[join(root,'tools/pipeline/artifacts.mjs')],env);
   cpSync('artifacts',join(result,'artifacts'),{recursive:true});
  }
 }finally{if(existsSync('validation-results'))cpSync('validation-results',join(result,'reports'),{recursive:true});process.chdir(root);execFileSync('git',['worktree','remove','--force',folder],{cwd:root});}
}
