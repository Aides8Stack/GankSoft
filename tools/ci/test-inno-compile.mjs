// Actual ISCC compilation of the production template; fixture payload, not an app smoke test.
import {spawnSync} from 'node:child_process';import {existsSync,mkdtempSync,mkdirSync,writeFileSync,readFileSync,copyFileSync} from 'node:fs';import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';import {createHash} from 'node:crypto';
import {installationIdentity} from './install-identity.mjs';
import {windowsVersion,stampWindowsVersion,resourceVersionExpected,versionResourceEvidence,requireVersionResources} from './windows-version.mjs';
import {NtExecutable,NtExecutableResource,Resource} from 'resedit';
const compiler=process.env.GANKSOFT_ISCC || (process.platform==='win32'?join(process.env['ProgramFiles(x86)'],'Inno Setup 6','ISCC.exe'):null);
if(!compiler||!existsSync(compiler))throw Error('Actual Inno Setup compiler required; no simulated success');
const win=p=>process.platform==='win32'?resolve(p):'Z:'+resolve(p).replaceAll('/','\\');
const hash=b=>createHash('sha256').update(b).digest('hex');
const work=mkdtempSync(join(tmpdir(),'gank-inno-')),payload=join(work,'payload'),out=join(work,'out');mkdirSync(payload);mkdirSync(out);
const fixture=NtExecutable.createEmpty(false,false),resources=NtExecutableResource.from(fixture),info=Resource.VersionInfo.createEmpty();info.setStringValues({lang:1033,codepage:1200},{FileVersion:'0.0.0',ProductVersion:'0.0.0'});info.outputToResourceEntries(resources.entries);resources.outputResource(fixture);
const versions=['0.7.4','0.7.4-rc.1','0.7.4-rc.3','0.7.4-rc.4','0.7.4-rc.1'];const report={status:'IN_PROGRESS',fixturePayload:true,compilerExecutableSha256:hash(readFileSync(compiler)),templateSha256:hash(readFileSync('tools/ci/installer.iss')),cases:[]};
mkdirSync('validation-results/ci/inno-binaries',{recursive:true});
try{for(const [index,version] of versions.entries()){const mapping=windowsVersion(version),name='GankSoft-'+version+'-develop-947726dd-df6b5a3ab1b0-windows-x64-39528225102-'+(index+1);
 const meta={version,name,sha:'a'.repeat(40),lockSha256:'b'.repeat(64),packagingToolchain:{sha:'c'.repeat(40),lockSha256:'d'.repeat(64)},branch:'develop',runId:'39528225102',runAttempt:String(index+1)};
 meta.installation=installationIdentity(meta);
 const caseDir=join(work,'case-'+index);mkdirSync(caseDir);
 const metadataPath=join(caseDir,'source.json');writeFileSync(metadataPath,JSON.stringify(meta,null,2)+'\n');
 writeFileSync(join(payload,'build-metadata.json'),readFileSync(metadataPath));
 resourceVersionExpected(version,'installer'); // Reject truncation before invoking ISCC.
 writeFileSync(join(payload,'GankSoft.exe'),await stampWindowsVersion(Buffer.from(fixture.generate()),version));
 const applicationResources=await versionResourceEvidence(readFileSync(join(payload,'GankSoft.exe')),version,'application');requireVersionResources(applicationResources);
 const args=[`/DPackageDir=${win(payload)}`,`/DOutputDir=${win(out)}`,`/DArtifactName=${name}`,`/DInstallationAppId=${meta.installation.appId}`,`/DAppVersion=${version}`,`/DWindowsVersion=${mapping.numeric}`,win('tools/ci/installer.iss')];
 const result=spawnSync(compiler,args,{encoding:'utf8',timeout:120000,maxBuffer:4e6});process.stdout.write((result.stdout??'')+(result.stderr??''));report.compilerVersion=(result.stdout??'').match(/Compiler engine version: Inno Setup ([^\r\n]+)/)?.[1]??report.compilerVersion;if(report.compilerVersion!=='6.7.1')throw Error('Inno Setup 6.7.1 required');if(result.error||result.status!==0)throw Error(`Actual ISCC failed for ${version}: ${result.status}`);
 const filename=`GankSoft-v${version}-win64-setup.exe`,binary=join(out,filename),bytes=readFileSync(binary);
 copyFileSync(binary,join('validation-results/ci/inno-binaries',filename));
 const evidence=await versionResourceEvidence(bytes,version,'installer');
 const installerPath=join(caseDir,filename);copyFileSync(binary,installerPath);
 const entry={installerPath,metadataPath,installation:meta.installation,semver:version,numeric:mapping.numeric,status:evidence.status,setupSha256:hash(bytes),filename,resources:evidence,applicationResources};
 report.cases.push(entry);
 console.log('ACTUAL_INNO_RESOURCES '+JSON.stringify(entry));
 requireVersionResources(evidence);
 }
 if(process.platform!=='win32')throw Error('Actual Windows registry/install regression requires Windows Runner');
 const casesPath=join(work,'cases.json');writeFileSync(casesPath,JSON.stringify(report.cases));
 const installed=spawnSync('pwsh',['-NoProfile','-File',resolve('tools/ci/test-inno-install.ps1'),'-Cases',casesPath],{stdio:'inherit',timeout:240000});
 if(installed.error||installed.status!==0)throw Error('Actual Windows installation regression failed');
 report.installationRegression=JSON.parse(readFileSync('validation-results/ci/inno-install.json','utf8').replace(/^\uFEFF/,''));
 report.status='PASS';}catch(e){report.status='FAIL';report.error=e.message;throw e;}finally{writeFileSync('validation-results/ci/inno-compile.json',JSON.stringify(report,null,2)+'\n');}
console.log('ACTUAL_INNO_COMPILE '+JSON.stringify(report));
