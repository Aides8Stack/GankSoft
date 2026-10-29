// Keep network preparation outside all timed product/UI checks. The locked
// Electron installer reuses @electron/get's version/platform/arch ZIP cache
// and verifies its bundled checksums; do not use a mirror or bypass checksums.
import {createRequire} from 'node:module';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
const require=createRequire(import.meta.url);
const root=dirname(require.resolve('electron/package.json'));
const version=JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version;

export function installedElectron(){
 if(process.env.ELECTRON_OVERRIDE_DIST_PATH)throw Error('ELECTRON_OVERRIDE_DIST_PATH is not allowed for CI verification');
 const relative=process.platform==='win32'?'electron.exe':process.platform==='darwin'?'Electron.app/Contents/MacOS/Electron':'electron';
 const pathFile=join(root,'path.txt'),exe=join(root,'dist',relative);
 if(!existsSync(pathFile)||readFileSync(pathFile,'utf8').trim()!==relative||!existsSync(exe))throw Error(`Electron environment not prepared: expected ${exe}; run node tools/ci/prepare-electron.mjs`);
 if(readFileSync(join(root,'dist/version'),'utf8').trim().replace(/^v/,'')!==version)throw Error('Installed Electron version file does not match locked dependency');
 return exe;
}
export function prepareElectron(){
 const started=performance.now(),out='validation-results/ci/electron-preparation.json';
 const report={status:'FAIL',category:'ENVIRONMENT_PREPARATION',platform:process.platform,arch:process.arch,version,cacheKey:`electron-${version}-${process.platform}-${process.arch}`,downloadMs:0,verificationMs:0};
 mkdirSync(dirname(out),{recursive:true});
 try{
  const locked=JSON.parse(readFileSync('package-lock.json','utf8')).packages['node_modules/electron'].version;
  if(version!==locked)throw Error(`Installed Electron ${version} differs from lock ${locked}`);
  // Validate overrides before installation as well as before launch.
  for(const key of ['ELECTRON_OVERRIDE_DIST_PATH','ELECTRON_INSTALL_PLATFORM','ELECTRON_INSTALL_ARCH','npm_config_platform','npm_config_arch']){
   if(process.env[key]&&((key.includes('platform')||key.endsWith('PLATFORM'))?process.env[key]!==process.platform:(key.includes('arch')||key.endsWith('ARCH'))?process.env[key]!==process.arch:true))throw Error(`Unexpected Electron installation override: ${key}`);
  }
  let ready=false;try{installedElectron();ready=true;}catch{/* The locked installer repairs missing dist/path/version using its checksum-verified cache. */}
  report.reusedInstallation=ready;
  if(!ready){
   const download=performance.now();
   const result=spawnSync(process.execPath,[join(root,'install.js')],{encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024});
   report.downloadMs=Math.round(performance.now()-download);
   process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');
   if(result.error||result.status!==0)throw Error(`Electron download/extraction failed: ${result.error?.message??`exit ${result.status}`}; ${result.stderr??''}`);
  }
  const verify=performance.now();report.executablePath=installedElectron();
  const result=spawnSync(report.executablePath,['-p','JSON.stringify({electron:process.versions.electron,arch:process.arch,platform:process.platform})'],{encoding:'utf8',timeout:30000,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'}});
  if(result.error||result.status!==0)throw Error(`Electron runtime probe failed: ${result.error?.message??result.stderr}`);
  report.runtime=JSON.parse(result.stdout.trim());
  if(report.runtime.electron!==version||report.runtime.arch!==process.arch||report.runtime.platform!==process.platform)throw Error(`Wrong Electron runtime: ${result.stdout}`);
  report.verificationMs=Math.round(performance.now()-verify);report.status='PASS';
 }catch(e){report.failure=String(e.stack??e);throw e;}
 finally{report.durationMs=Math.round(performance.now()-started);writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
 return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{prepareElectron();}catch(e){console.error('Electron ENVIRONMENT_PREPARATION failed:',e.message);process.exitCode=1;}
}
