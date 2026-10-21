// Windows portable-only release verification; Inno/setup is intentionally not used.
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,readdirSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {provenance} from './core.mjs';

const read = path => JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const requireTrue = (ok,message) => {if(!ok)throw Error(message);};
const zipName = version => 'GankSoft-v'+version+'-win64-portable.zip';
const isSha = value => typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const appDir = 'out/GankSoft-win32-x64';

export function checkManifest(dir,source,report) {
 requireTrue(isSha(source.sha)&&source.version===read('package.json').version,'Source/version mismatch');
 if(process.env.GITHUB_SHA)requireTrue(source.sha===process.env.GITHUB_SHA,'Wrong source commit');
 if(process.env.GITHUB_RUN_ID)requireTrue(source.runId===process.env.GITHUB_RUN_ID,'Wrong Actions run');
 if(process.env.GITHUB_RUN_ATTEMPT)requireTrue(source.runAttempt===process.env.GITHUB_RUN_ATTEMPT,'Wrong run attempt');
 const zip=zipName(source.version),expected=[zip,'source.json','TEST_REPORT.json','SHA256SUMS.txt'].sort();
 requireTrue(JSON.stringify(readdirSync(dir).sort())===JSON.stringify(expected),'Missing or extra release asset (setup.exe forbidden)');
 const rows=readFileSync(join(dir,'SHA256SUMS.txt'),'utf8').trim().split(/\r?\n/);
 const hashes=new Map();
 for(const line of rows){const m=/^([a-f0-9]{64})  ([A-Za-z0-9._-]+)$/.exec(line);requireTrue(m&&!hashes.has(m[2]),'Invalid checksum line');hashes.set(m[2],m[1]);}
 requireTrue(JSON.stringify([...hashes.keys()].sort())===JSON.stringify(expected.filter(n=>n!=='SHA256SUMS.txt')),'Manifest coverage mismatch');
 for(const [name,digest]of hashes){const path=join(dir,name);requireTrue(statSync(path).isFile()&&sha256(path)===digest,'Artifact checksum mismatch: '+name);}
 requireTrue(report.status==='PASS'&&report.sourceSha===source.sha&&report.version===source.version,'Portable acceptance missing');
 requireTrue(report.runId===source.runId&&report.runAttempt===source.runAttempt&&report.zipSha256===hashes.get(zip),'Run or ZIP hash mismatch');
 requireTrue(report.windowsSmoke?.status==='PASS'&&report.windowsSmoke.sha===source.sha&&Array.isArray(report.windowsSmoke.steps)&&report.windowsSmoke.steps.length>0&&report.windowsSmoke.steps.every(s=>s.status==='PASS'),'Actual Windows portable smoke missing');
 const z=report.zipExtraction;
 requireTrue(z?.status==='PASS'&&z.platform==='win32'&&z.zipRoot==='GankSoft/'&&z.archive===zip&&z.archiveSha256===hashes.get(zip),'Windows ZIP extraction evidence missing');
 requireTrue(Array.isArray(z.destinations)&&z.destinations.length===2&&z.destinations.every((d,i)=>d.status==='PASS'&&d.destinationLength===[80,100][i]&&d.maxAbsolutePath<260&&d.filesVerified===z.filesVerified)&&z.filesVerified>0,'Actual two-depth Windows extraction incomplete');
 requireTrue(report.windows10Manual==='NOT_RUN'&&report.windows11Manual==='NOT_RUN','Unverified manual signoff');
 return {sourceSha:source.sha,version:source.version,zip,sha256:hashes.get(zip)};
}
function prepare(){
 requireTrue(process.platform==='win32','Portable packaging requires Windows runner');
 const p=provenance();
 requireTrue(isSha(p.sha),'Invalid commit SHA');
 requireTrue(existsSync(join(appDir,'GankSoft.exe'))&&existsSync(join(appDir,'resources/app.asar')),'Packaged Electron application missing');
 const source={schema:1,mode:'windows-portable-only',sha:p.sha,version:p.version,branch:process.env.GITHUB_REF_NAME||p.branch,lockSha256:p.lockSha256,
  runId:process.env.GITHUB_RUN_ID||'local',runAttempt:p.runAttempt,runUrl:p.runUrl,zipRoot:'GankSoft/',portable:zipName(p.version),
  windows10Manual:'NOT_RUN',windows11Manual:'NOT_RUN'};
 requireTrue(!process.env.GITHUB_REF||process.env.GITHUB_REF==='refs/heads/develop','Portable releases must build from develop');
 mkdirSync('validation-results/ci',{recursive:true});mkdirSync('artifacts',{recursive:true});
 writeFileSync('validation-results/ci/source.json',JSON.stringify(source,null,2)+'\n');
 copyFileSync('validation-results/ci/source.json',join(appDir,'build-metadata.json'));
 console.log('PORTABLE_SOURCE '+JSON.stringify({sha:source.sha,version:source.version,runId:source.runId}));
}
function finalize(){
 requireTrue(process.platform==='win32','Actual Windows packaging required');
 const source=read('validation-results/ci/source.json'),zip=join('artifacts',zipName(source.version));
 const smoke=read('validation-results/ci/windows-portable.json');
 const extraction=read('validation-results/ci/zip-extraction.json');
 requireTrue(smoke.status==='PASS'&&smoke.sha===source.sha&&smoke.steps?.length>0&&smoke.steps.every(s=>s.status==='PASS'),'Portable executable smoke failed');
 requireTrue(existsSync(zip),'ZIP not generated');
 const report={schema:1,status:'PASS',sourceSha:source.sha,version:source.version,runId:source.runId,runAttempt:source.runAttempt,
   windowsSmoke:smoke,zipExtraction:extraction,zipSha256:sha256(zip),exeSha256:sha256(join(appDir,'GankSoft.exe')),
   windows10Manual:'NOT_RUN',windows11Manual:'NOT_RUN'};
 copyFileSync('validation-results/ci/source.json','artifacts/source.json');
 writeFileSync('artifacts/TEST_REPORT.json',JSON.stringify(report,null,2)+'\n');
 const names=readdirSync('artifacts').filter(n=>n!=='SHA256SUMS.txt').sort();
 writeFileSync('artifacts/SHA256SUMS.txt',names.map(n=>sha256(join('artifacts',n))+'  '+n).join('\n')+'\n');
 console.log('PORTABLE_PACKAGE '+JSON.stringify(checkManifest('artifacts',source,report)));
}
function verify(dir){
 const source=read(join(dir,'source.json')),report=read(join(dir,'TEST_REPORT.json'));
 const output=checkManifest(dir,source,report);
 const py=process.platform==='win32'?'python':'python3';
 const result=spawnSync(py,['tools/validation/verify_delivery.py',join(dir,output.zip)],{encoding:'utf8',timeout:120000,maxBuffer:1e6});
 requireTrue(!result.error&&result.status===0,'ZIP bytes/inner manifest invalid: '+(result.stderr||String(result.error)));
 const details=JSON.parse(result.stdout);
 requireTrue(details.crc==='passed'&&details.completeManifest==='passed'&&details.unpackedNativeAddon==='present','ZIP content verification failed');
 console.log('PORTABLE_VERIFIED '+JSON.stringify(output));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const mode=process.argv[2];
 if(mode==='prepare')prepare();
 else if(mode==='finalize')finalize();
 else if(mode==='verify')verify(process.argv[3]||'artifacts');
 else throw Error('Expected prepare|finalize|verify');
}
