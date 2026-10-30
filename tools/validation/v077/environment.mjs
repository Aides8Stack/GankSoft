// Reuse production bundles only when build inputs, OS, runtime and file hashes match.
// GitHub stores the source and config; CI can provide expiring build artifacts.
// Do not commit node_modules, build outputs, SQLite, screenshots or runtime manifests.
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {relative,resolve,join,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const cache=join(repo,'validation-results/v077/cache');
const manifestPath=join(cache,'runtime-manifest.json');
const depsPath=join(cache,'dependency-manifest.json');
const lockPath=join(repo,'package-lock.json');
const inputs=[
  'src','shared','electron','public','tools/build',
  'index.html','package.json','package-lock.json','tsconfig.json',
  'tsconfig.electron.json','vite.config.ts','forge.config.cjs'
];
const outputs=[join(repo,'dist'),join(repo,'dist-electron')];
const sha256=data=>createHash('sha256').update(data).digest('hex');
const nodeMajor=Number(process.versions.node.split('.')[0]);
const lockHash=sha256(readFileSync(lockPath));
function trackedFiles(){
  const r=spawnSync('git',['ls-files','-z','--',...inputs],{cwd:repo,encoding:'buffer'});
  if(r.status!==0)throw Error('V077_GIT_FILES_UNAVAILABLE: '+String(r.stderr));
  return r.stdout.toString('utf8').split('\0').filter(Boolean).sort();
}
function fingerprint(){
  const h=createHash('sha256');
  const paths=trackedFiles();
  for(const path of paths){
    const full=join(repo,path);
    if(!existsSync(full))throw Error('V077_SOURCE_FILE_MISSING: '+path);
    h.update(path+'\0');h.update(readFileSync(full));h.update('\0');
  }
  return h.digest('hex');
}
function outputFiles(){
  const files=[];
  for(const dir of outputs){
    if(!existsSync(dir))throw Error('V077_BUILD_OUTPUT_MISSING: '+relative(repo,dir));
    function walk(at){
      for(const name of readdirSync(at).sort()){
        const full=join(at,name);
        const s=statSync(full);
        if(s.isDirectory())walk(full);
        else if(s.isFile())files.push({path:relative(repo,full).replaceAll('\\','/'),
          bytes:s.size,sha256:sha256(readFileSync(full))});
      }
    }
    walk(dir);
  }
  if(!files.some(x=>x.path==='dist/index.html')||
    !files.some(x=>x.path==='dist-electron/electron/main.js'))throw Error('V077_BUILD_ENTRY_MISSING');
  return files.sort((a,b)=>a.path.localeCompare(b.path));
}
function getHead(){
  const r=spawnSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'});
  return r.status===0?r.stdout.trim():process.env.GANKSOFT_SOURCE_SHA??null;
}
function depsAvailable(){
  const file=join(repo,'node_modules/.package-lock.json');
  if(!existsSync(file) || !existsSync(join(repo,'node_modules/electron/package.json'))||
    !existsSync(join(repo,'node_modules/playwright-core/package.json'))||
    !existsSync(depsPath))return false;
  try{
    const d=JSON.parse(readFileSync(depsPath,'utf8'));
    return d.lockSha256===lockHash&&d.platform===process.platform&&
      d.arch===process.arch&&d.nodeMajor===nodeMajor;
  }catch{return false;}
}
function markDeps(){
  mkdirSync(cache,{recursive:true});
  writeFileSync(depsPath,JSON.stringify({schema:'ganksoft.v077/dependency-checkpoint-1',
    lockSha256:lockHash,platform:process.platform,arch:process.arch,nodeMajor},null,2)+'\n');
}
function verifyBuild(){
  let man;
  try{man=JSON.parse(readFileSync(manifestPath,'utf8'));}
  catch{return {valid:false,reason:'NO_BUILD_MANIFEST'};}
  if(man.schema!=='ganksoft.v077/runtime-bundle-1')return {valid:false,reason:'BAD_BUILD_MANIFEST'};
  if(man.platform!==process.platform||man.arch!==process.arch||
    man.nodeMajor!==nodeMajor)return {valid:false,reason:'RUNTIME_PLATFORM_MISMATCH'};
  if(man.buildFingerprint!==fingerprint())return {valid:false,reason:'BUILD_INPUT_CHANGED'};
  try{
    const now=outputFiles();
    if(JSON.stringify(now)!==JSON.stringify(man.files))
      return {valid:false,reason:'OUTPUT_HASH_MISMATCH'};
  }catch(e){return {valid:false,reason:String(e.message??e)};}
  return {valid:true,builtFromSha:man.builtFromSha,fileCount:man.files.length};
}
function seal(){
  const files=outputFiles();
  const manifest={schema:'ganksoft.v077/runtime-bundle-1',
    note:'Reproducible build cache only; not a tested release/CASE PASS',
    builtFromSha:getHead(),buildFingerprint:fingerprint(),lockSha256:lockHash,
    platform:process.platform,arch:process.arch,nodeMajor,
    electronVersion:JSON.parse(readFileSync(join(repo,'node_modules/electron/package.json'),'utf8')).version,
    files};
  mkdirSync(cache,{recursive:true});
  writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  markDeps();
  return {files:files.length,builtFromSha:manifest.builtFromSha,
    fingerprint:manifest.buildFingerprint,manifest:relative(repo,manifestPath)};
}
function command(argv){
  const [cmd='status']=argv;
  if(!['status','prepare','seal'].includes(cmd)||argv.length>1)
    throw Error('USAGE: node environment.mjs status | prepare | seal');
  const supported=nodeMajor>=24;
  if(cmd==='status'){
    console.log(JSON.stringify({status:'CHECK_ONLY',node:process.version,nodeSupported:supported,
      platform:process.platform,arch:process.arch,lockSha256:lockHash,
      dependencies:depsAvailable()?'REUSE':'INSTALL_REQUIRED',
      build:verifyBuild(),cacheDirectory:relative(repo,cache)},null,2));return;
  }
  if(!supported)throw Error('V077_NODE_24_REQUIRED: '+process.version);
  if(cmd==='seal'){
    if(!existsSync(join(repo,'node_modules/electron/package.json')))
      throw Error('V077_DEPENDENCIES_REQUIRED');
    console.log(JSON.stringify({status:'SEALED',...seal()},null,2));return;
  }
  let installed=false,built=false;
  if(!depsAvailable()){
    const npm=process.platform==='win32'?'npm.cmd':'npm';
    const p=spawnSync(npm,['ci'],{cwd:repo,stdio:'inherit',
      shell:process.platform==='win32'});
    if(p.status!==0)throw Error('V077_NPM_CI_FAILED: '+String(p.status));
    markDeps();installed=true;
  }
  let check=verifyBuild();
  if(!check.valid){
    const npm=process.platform==='win32'?'npm.cmd':'npm';
    const p=spawnSync(npm,['run','build'],{cwd:repo,stdio:'inherit',
      shell:process.platform==='win32'});
    if(p.status!==0)throw Error('V077_BUILD_FAILED: '+String(p.status));
    seal();built=true;
    check=verifyBuild();
  }
  if(!check.valid)throw Error('V077_BUILD_INTEGRITY_FAILED: '+check.reason);
  console.log(JSON.stringify({status:'READY',dependencyAction:installed?'INSTALLED':'REUSED',
    buildAction:built?'BUILT':'REUSED_VERIFIED',build:check},null,2));
}
command(process.argv.slice(2));
