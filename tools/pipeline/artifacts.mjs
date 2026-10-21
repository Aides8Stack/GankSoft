import {validateDelivery} from '../ci/delivery.mjs';
import {windowsVersion} from '../ci/windows-version.mjs';
import {validateToolchain} from './package-toolchain.mjs';
import {readFileSync,readdirSync,writeFileSync,statSync}from'node:fs';import{join,basename}from'node:path';import{createRequire}from'node:module';import{pathToFileURL}from'node:url';
import{json}from'./version.mjs';import{sha256}from'./queue.mjs';
export function checksums(text){const entries=new Map();for(const line of text.trim().split(/\r?\n/)){const m=/^([a-f0-9]{64})  ([A-Za-z0-9._-]+)$/.exec(line);if(!m||entries.has(m[2])||m[2]==='SHA256SUMS.txt')throw Error('Invalid checksum manifest');entries.set(m[2],m[1]);}return entries;}
export function identity(source,item){if(source.sha!==item.sha||source.version!==item.version||source.lockSha256!==item.lockSha256)throw Error('Artifact source/version/lock mismatch');}
export function verifyDirectory(dir,item,{coordinatorSha,toolchain}={}){
 const map=checksums(readFileSync(join(dir,'SHA256SUMS.txt'),'utf8'));
 const names=readdirSync(dir).sort();if(JSON.stringify(names)!==JSON.stringify([...map.keys(),'SHA256SUMS.txt'].sort()))throw Error('Unlisted or missing release asset');
 for(const [name,digest]of map){const p=join(dir,name);if(!statSync(p).isFile()||sha256(readFileSync(p))!==digest)throw Error('Artifact hash mismatch: '+name);}
 const source=json(join(dir,'source.json')),meta=json(join(dir,'build-metadata.json'));identity(source,item);identity(meta,item);
 if(coordinatorSha!==undefined||source.packagingToolchain!==undefined){
  validateToolchain(source.packagingToolchain,coordinatorSha);validateToolchain(meta.packagingToolchain,coordinatorSha);
  if(toolchain&&JSON.stringify(source.packagingToolchain)!==JSON.stringify(toolchain))throw Error('Packaging tools differ from verified coordinator');
  if(JSON.stringify(source.packagingToolchain)!==JSON.stringify(meta.packagingToolchain)||JSON.stringify(source.windowsVersion)!==JSON.stringify(windowsVersion(item.version))||JSON.stringify(meta.windowsVersion)!==JSON.stringify(source.windowsVersion))throw Error('Windows source/toolchain/version metadata mismatch');
 }
 const report=json(join(dir,'TEST_REPORT.json'));
 if(source.packagingToolchain!==undefined&&(!report.compiler?.version||!/^([a-f0-9]{64})$/.test(report.compiler?.sha256)))throw Error('Actual installer compiler evidence missing');
 if(source.packagingToolchain!==undefined&&(JSON.stringify(report.packagingToolchain)!==JSON.stringify(source.packagingToolchain)||JSON.stringify(report.windowsVersion)!==JSON.stringify(source.windowsVersion)))throw Error('Installer toolchain/version evidence mismatch');if(report.sourceSha!==item.sha||report.version!==item.version||['install','launch','uninstall','portable','installed','internalVersion','zipIntegrity'].some(k=>report[k]!=='PASS'))throw Error('Package acceptance evidence missing');
 validateDelivery(source,report,[...map.keys()],map.get(source.delivery?.portable));
 if(JSON.stringify(meta.delivery)!==JSON.stringify(source.delivery)||source.delivery&&['name','runId','runAttempt','runUrl'].some(k=>meta[k]!==source[k]))throw Error('Delivery metadata mismatch');
 const exe=[...map.keys()].filter(x=>x.endsWith('-setup.exe')),zip=[...map.keys()].filter(x=>x.endsWith('-portable.zip'));
 if(exe.length!==1||zip.length!==1||!exe[0].includes(item.version)||!zip[0].includes(item.version))throw Error('Expected exactly one installer and portable ZIP');
 return {source,map,installer:exe[0],portable:zip[0]};
}
export function bundle(){
 const source=json('validation-results/ci/source.json'),dir='artifacts';
 const pkg=json('package.json');if(pkg.version!==source.version)throw Error('Version mismatch');
 const asar=createRequire(join(process.cwd(),'package.json'))('@electron/asar');
 const embedded=JSON.parse(asar.extractFile('out/GankSoft-win32-x64/resources/app.asar','package.json'));
 if(embedded.version!==source.version)throw Error('ASAR version mismatch');
 const installer=json('validation-results/ci/installer.json');if(installer.sourceSha!==source.sha||['install','launch','uninstall'].some(k=>installer[k]!=='PASS'))throw Error('Installer tests missing');
 for(const label of ['portable','installed']){const r=json(`validation-results/ci/windows-${label}.json`);if(r.sha!==source.sha||r.status!=='PASS'||r.steps.some(s=>s.status!=='PASS'))throw Error('Windows smoke incomplete');}
 for(const name of ['source.json','build-metadata.json'])writeFileSync(join(dir,name),JSON.stringify(source,null,2)+'\n');
 const report={...installer,version:source.version,buildIdentity:source.name,runId:source.runId,runAttempt:source.runAttempt,zipExtraction:json('validation-results/ci/zip-extraction.json'),applicationExeSha256:sha256(readFileSync('out/GankSoft-win32-x64/GankSoft.exe')),portable:'PASS',installed:'PASS',internalVersion:'PASS',zipIntegrity:'PASS',windows10Manual:'NOT_RUN',windows11Manual:'NOT_RUN'};
 writeFileSync(join(dir,'TEST_REPORT.json'),JSON.stringify(report,null,2)+'\n');
 writeFileSync(join(dir,'SHA256SUMS.txt'),readdirSync(dir).filter(n=>n!=='SHA256SUMS.txt').sort().map(n=>`${sha256(readFileSync(join(dir,n)))}  ${n}`).join('\n')+'\n');
 verifyDirectory(dir,{sha:source.sha,version:source.version,lockSha256:source.lockSha256});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)bundle();
