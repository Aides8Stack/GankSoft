import {installationIdentity} from '../ci/install-identity.mjs';
import {delivery} from '../ci/delivery.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync,spawnSync} from 'node:child_process';import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,copyFileSync,rmSync} from 'node:fs';import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';
import {windowsVersion,stampWindowsVersion} from '../ci/windows-version.mjs';import {packageToolchain,packageToolFiles,validateToolchain} from './package-toolchain.mjs';
import {NtExecutable,NtExecutableResource,Resource} from 'resedit';import {verifyDirectory} from './artifacts.mjs';import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
test('canonical Windows mapping separates stable, RC1/3/4 and preserves complete SemVer',()=>{
 for(const [v,n]of [['0.7.4','0.7.4.65535'],['0.7.4-rc.1','0.7.4.1'],['0.7.4-rc.3','0.7.4.3'],['0.7.4-rc.4','0.7.4.4'],['65535.65535.65535','65535.65535.65535.65535']]){assert.equal(windowsVersion(v).numeric,n);assert.equal(windowsVersion(v).semver,v);}
 const revisions=Array.from({length:65534},(_,i)=>windowsVersion('0.7.4-rc.'+(i+1)).parts[3]);assert.equal(new Set(revisions).size,65534);assert.ok(revisions.every((n,i)=>n===i+1));assert.ok(revisions.at(-1)<windowsVersion('0.7.4').parts[3]);
});
test('unrepresentable/ambiguous versions fail instead of truncating/wrapping or colliding',()=>{
 for(const v of [null,'','v0.7.4','0.7','00.7.4','0.7.4-rc.0','0.7.4-rc.01','0.7.4-rc.65535','0.7.4-rc.65536','65536.0.0','0.7.4+build.1','0.7.4-rc.1+sha.1','0.7.4-alpha.1','9007199254740993.0.0','0.7.4\n'])assert.throws(()=>windowsVersion(v),String(v));
});
function pe(){const exe=NtExecutable.createEmpty(false,false),res=NtExecutableResource.from(exe),v=Resource.VersionInfo.createEmpty();v.setStringValues({lang:1033,codepage:1200},{ProductVersion:'old',FileVersion:'old'});v.outputToResourceEntries(res.entries);res.outputResource(exe);return Buffer.from(exe.generate());}
test('actual PE stamping keeps numeric file/product resources and full text SemVer distinct',async()=>{
 const parts=(ms,ls)=>[ms>>>16,ms&65535,ls>>>16,ls&65535].join('.');
 for(const v of ['0.7.4','0.7.4-rc.1','0.7.4-rc.3','0.7.4-rc.4']){const bytes=await stampWindowsVersion(pe(),v),info=Resource.VersionInfo.fromEntries(NtExecutableResource.from(NtExecutable.from(bytes)).entries)[0],fixed=info.fixedInfo,strings=info.getStringValues(info.getAllLanguagesForStringValues()[0]);assert.equal(parts(fixed.fileVersionMS,fixed.fileVersionLS),windowsVersion(v).numeric);assert.equal(parts(fixed.productVersionMS,fixed.productVersionLS),windowsVersion(v).numeric);assert.equal(strings.ProductVersion,v);assert.equal(strings.FileVersion,v);}
});
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
test('real historical worktree uses unchanged source and committed coordinator metadata/toolkit with separate SHAs',()=>{
 const root=mkdtempSync(join(tmpdir(),'gank-toolchain 历史 ')),coordinator=join(root,'coordinator'),source=join(root,'historical');mkdirSync(coordinator);
 try{
  for(const p of packageToolFiles){mkdirSync(join(coordinator,p,'..'),{recursive:true});copyFileSync(p,join(coordinator,p));}
  writeFileSync(join(coordinator,'package.json'),JSON.stringify({version:'0.7.4-rc.1'}));writeFileSync(join(coordinator,'package-lock.json'),JSON.stringify({version:'0.7.4-rc.1'}));
  const old='[Setup]\nVersionInfoProductVersion={#AppVersion}\n';writeFileSync(join(coordinator,'tools/ci/installer.iss'),old);
  git(coordinator,'init','-b','develop');git(coordinator,'config','user.name','GankSoft tests');git(coordinator,'config','user.email','test@example.invalid');git(coordinator,'add','.');git(coordinator,'commit','-m','historical source');const sourceSha=git(coordinator,'rev-parse','HEAD');
  copyFileSync('tools/ci/installer.iss',join(coordinator,'tools/ci/installer.iss'));writeFileSync(join(coordinator,'package.json'),JSON.stringify({version:'0.7.4-rc.4'}));git(coordinator,'add','.');git(coordinator,'commit','-m','fixed coordinator tools');const toolSha=git(coordinator,'rev-parse','HEAD');git(coordinator,'worktree','add','--detach',source,sourceSha);const originalInstaller=readFileSync(join(source,'tools/ci/installer.iss'));
  const r=spawnSync(process.execPath,[join(coordinator,'tools/ci/metadata.mjs')],{cwd:source,env:{...process.env,GANKSOFT_SOURCE_SHA:sourceSha,GANKSOFT_SOURCE_BRANCH:'develop',GANKSOFT_COORDINATOR_SHA:toolSha},encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  const meta=JSON.parse(readFileSync(join(source,'validation-results/ci/source.json'),'utf8'));assert.equal(meta.version,'0.7.4-rc.1');assert.equal(meta.sha,sourceSha);assert.equal(meta.packagingToolchain.sha,toolSha);assert.notEqual(sourceSha,toolSha);assert.equal(meta.windowsVersion.numeric,'0.7.4.1');assert.deepEqual(readFileSync(join(source,'tools/ci/installer.iss')),originalInstaller);assert.equal(originalInstaller.toString('utf8').replace(/\r\n/g,'\n'),old);assert.equal(git(source,'diff','--name-only'),'');
  const expected=packageToolchain(coordinator,toolSha);validateToolchain(expected,toolSha);assert.deepEqual(meta.packagingToolchain,expected);assert.throws(()=>packageToolchain(coordinator,sourceSha),/SHA mismatch/);
  writeFileSync(join(coordinator,'tools/ci/installer.iss'),'tampered');assert.throws(()=>packageToolchain(coordinator,toolSha),/substituted packaging tool/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('artifact verification binds source/installer/toolchain/mapping and rejects substituted coordinator or metadata',()=>{
 const root=mkdtempSync(join(tmpdir(),'gank-tool-artifact-')),item={sha:'a'.repeat(40),version:'0.7.4-rc.1',lockSha256:'b'.repeat(64)},tool={schema:1,sha:'c'.repeat(40),fileEncoding:'utf8-lf',lockSha256:'d'.repeat(64),files:Object.fromEntries(packageToolFiles.map(p=>[p,'e'.repeat(64)]))},version=windowsVersion(item.version);
 const source={delivery:delivery(item.version),branch:"develop",name:"fixture-build",runId:"400",runAttempt:"1",...item,packagingToolchain:tool,windowsVersion:version},report={buildIdentity:source.name,runId:source.runId,runAttempt:source.runAttempt,zipExtraction:{status:'PASS',platform:'win32',archive:source.delivery.portable,archiveSha256:hash(Buffer.from('fixture')),zipRoot:'GankSoft/',maxEntryPath:100,filesVerified:3,destinations:[80,100].map(n=>({status:'PASS',destinationLength:n,maxAbsolutePath:n+101,filesVerified:3}))},compiler:{version:'fixture',sha256:'a'.repeat(64)},sourceSha:item.sha,version:item.version,packagingToolchain:tool,windowsVersion:version,...Object.fromEntries(['install','launch','uninstall','portable','installed','internalVersion','zipIntegrity'].map(k=>[k,'PASS']))};
 source.installation=installationIdentity(source);report.installation=source.installation;for(const k of ['identity-validation','registry-validation','portable-zip','windows-extraction'])report[k]='PASS';
 const files={'source.json':source,'build-metadata.json':source,'TEST_REPORT.json':report};
 function save(){for(const [n,v]of Object.entries(files))writeFileSync(join(root,n),JSON.stringify(v));for(const ext of ['setup.exe','portable.zip'])writeFileSync(join(root,`GankSoft-v${item.version}-win64-${ext}`),'fixture');const names=[...Object.keys(files),`GankSoft-v${item.version}-win64-setup.exe`,`GankSoft-v${item.version}-win64-portable.zip`].sort();writeFileSync(join(root,'SHA256SUMS.txt'),names.map(n=>hash(readFileSync(join(root,n)))+'  '+n).join('\n')+'\n');}
 try{save();verifyDirectory(root,item,{coordinatorSha:tool.sha,toolchain:tool});assert.throws(()=>verifyDirectory(root,item,{coordinatorSha:'f'.repeat(40)}),/identity mismatch/);assert.throws(()=>verifyDirectory(root,item,{coordinatorSha:tool.sha,toolchain:{...tool,lockSha256:'f'.repeat(64)}}),/differ from verified coordinator/);
 for(const stage of ['identity-validation','registry-validation','portable-zip','windows-extraction']) {
  for(const status of ['FAIL','NOT_RUN',undefined]) { files['TEST_REPORT.json']={...report,[stage]:status};save();assert.throws(()=>verifyDirectory(root,item,{coordinatorSha:tool.sha}),/Installation acceptance/); }
 }
 files['TEST_REPORT.json']={...report,installation:{...source.installation,appId:'forged'}};save();assert.throws(()=>verifyDirectory(root,item,{coordinatorSha:tool.sha}),/Installation acceptance/);
 const validInstallation=source.installation;delete source.installation;files['TEST_REPORT.json']=report;save();assert.throws(()=>verifyDirectory(root,item,{coordinatorSha:tool.sha}),/Installation identity/);source.installation=validInstallation;
 files['TEST_REPORT.json']={...report,windowsVersion:windowsVersion('0.7.4-rc.3')};save();assert.throws(()=>verifyDirectory(root,item,{coordinatorSha:tool.sha}),/Installer toolchain/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('production version fields and historical invocation use the fixed coordinator, not old local installer',()=>{
 const iss=readFileSync('tools/ci/installer.iss','utf8'),ps=readFileSync('tools/ci/windows-package.ps1','utf8'),batch=readFileSync('tools/pipeline/batch.mjs','utf8'),pkg=readFileSync('tools/package-windows.mjs','utf8');
 for(const directive of ['VersionInfoVersion','VersionInfoProductVersion'])assert.match(iss,new RegExp(directive+'=\\{#WindowsVersion\\}'));
 assert.match(iss,/AppVersion=\{#AppVersion\}/);assert.match(iss,/VersionInfoProductTextVersion=\{#AppVersion\}/);assert.match(ps,/ProductMajorPart/);assert.match(ps,/FileMajorPart/);assert.match(ps,/Windows textual SemVer mismatch/);assert.doesNotMatch(ps,/CoreVersion| -split '\[-\+\]'/);
 for(const name of ['tools/package-windows.mjs','tools/ci/installer.iss','tools/ci/windows-smoke.mjs','tools/build/zip-windows.py'])assert.ok(ps.includes("Join-Path $toolRoot '"+name+"'"));assert.ok(batch.includes("[join(root,'tools/ci/metadata.mjs')]"));assert.match(pkg,/const root = process.cwd\(\)/);assert.match(pkg,/stampWindowsVersion/);
});
