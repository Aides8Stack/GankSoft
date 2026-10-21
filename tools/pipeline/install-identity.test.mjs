import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installationIdentity,requireInstallationIdentity,validateRegistry} from '../ci/install-identity.mjs';
const fixture=(extra={})=>({version:'0.7.4-rc.1',sha:'a'.repeat(40),lockSha256:'b'.repeat(64),packagingToolchain:{sha:'c'.repeat(40),lockSha256:'d'.repeat(64)},branch:'develop',name:'GankSoft-0.7.4-rc.1-develop-947726dd-df6b5a3ab1b0-windows-x64-39528225102-1',runId:'39528225102',runAttempt:'1',...extra});
test('deterministic 57-character AppId preserves long build identity and prevents Inno shortening',()=>{
 for(const n of [1,48,57,58,63,64,128,4096]){const m=fixture({name:'x'.repeat(n)}),id=installationIdentity(m);assert.match(id.appId,/^GankSoft-[a-f0-9]{48}$/);assert.equal(id.appId.length,57);assert.equal(id.registrySubKey.split('\\').at(-1).length,61);assert.deepEqual(id,installationIdentity(structuredClone(m)));}
 assert.throws(()=>installationIdentity(fixture({name:'x'.repeat(4097)})));
});
test('full SHA, tools, locks, branch, run, attempt and historical versions remain isolated',()=>{
 const cases=[fixture(),...['0.7.4-rc.3','0.7.4-rc.4','0.7.4','0.7.4-rc.5'].map(version=>fixture({version})),fixture({sha:'a'.repeat(39)+'b'}),fixture({packagingToolchain:{sha:'c'.repeat(39)+'b',lockSha256:'d'.repeat(64)}}),fixture({runId:'39528225103'}),fixture({runAttempt:'2'}),fixture({branch:'feature/中文'}),fixture({lockSha256:'e'.repeat(64)})];
 const ids=cases.map(m=>installationIdentity(m).appId);assert.equal(new Set(ids).size,cases.length);
 const many=Array.from({length:10000},(_,i)=>installationIdentity(fixture({runId:String(i+1)})).appId);assert.equal(new Set(many).size,10000);
});
test('hostile values are rejected or safely hashed; no raw input enters the Inno AppId',()=>{
 for(const [key,value]of [['name','a\nAppId=evil'],['branch','a\0b'],['name',''],['runId','1 /DAppId=evil'],['runAttempt','0'],['sha','a'.repeat(41)],['version','0.7.4-rc.01'],['version','0.7.4+bad']])assert.throws(()=>installationIdentity(fixture({[key]:value})),key);
 for(const name of ['";{app}\\..\\恶意','a'.repeat(57),'a'.repeat(58)])assert.match(installationIdentity(fixture({name})).appId,/^GankSoft-[a-f0-9]{48}$/);
 const m=fixture();m.installation={...installationIdentity(m),appId:'forged'};assert.throws(()=>requireInstallationIdentity(m));
});
test('strict registry acceptance passes exact identity and blocks missing/wrong root/view/version/path/command',()=>{
 const m=fixture();m.installation=installationIdentity(m);const target='D:\\isolated\\GankSoft';
 const actual={hive:m.installation.registryHive,view:m.installation.registryView,subKey:m.installation.registrySubKey,exists:true,DisplayName:`GankSoft ${m.version}`,DisplayVersion:m.version,InstallLocation:target+'\\',UninstallString:'"'+target+'\\unins000.exe"'};
 assert.equal(validateRegistry(m,actual,target).status,'PASS');
 for(const change of [{exists:false},{hive:'HKEY_LOCAL_MACHINE'},{view:'Registry32'},{subKey:actual.subKey+'x'},{DisplayName:'Other'},{DisplayName:'GankSoft'},{DisplayName:'GankSoft version '+m.version},{DisplayName:'GankSoft 0.7.4'},{DisplayName:'GankSoft '+m.version+' '},{DisplayVersion:'0.7.4'},{InstallLocation:'D:\\other'},{UninstallString:'"D:\\other\\unins000.exe"'},{UninstallString:actual.UninstallString+' /evil'},{UninstallString:target+'\\unins000.exe'}])assert.throws(()=>validateRegistry(m,{...actual,...change},target),JSON.stringify(change));
 assert.throws(()=>validateRegistry(m,null,target));
});

test('explicit Inno uninstall display name and exact SemVer validation agree for stable and historical RCs',()=>{
 const template=readFileSync(new URL('../ci/installer.iss',import.meta.url),'utf8');
 assert.equal(template.split(/\r?\n/).filter(line=>line.startsWith('UninstallDisplayName=')).join('\n'),'UninstallDisplayName=GankSoft {#AppVersion}');
 for(const version of ['0.7.4','0.7.4-rc.1','0.7.4-rc.3','0.7.4-rc.4']){
  const m=fixture({version});m.installation=installationIdentity(m);const target='D:\\isolated\\GankSoft';
  const actual={hive:m.installation.registryHive,view:m.installation.registryView,subKey:m.installation.registrySubKey,exists:true,DisplayName:`GankSoft ${version}`,DisplayVersion:version,InstallLocation:target,UninstallString:'"'+target+'\\unins000.exe"'};
  assert.equal(validateRegistry(m,actual,target).status,'PASS');
  for(const change of [{DisplayName:`GankSoft version ${version}`},{DisplayName:'GankSoft'},{DisplayVersion:version+' '},{DisplayName:`GankSoft ${version} `}]){
   assert.throws(()=>validateRegistry(m,{...actual,...change},target),error=>{
    const evidence=JSON.parse(error.message.split('mismatch: ')[1]);
    assert.deepEqual(evidence.actual,{DisplayName:change.DisplayName??actual.DisplayName,DisplayVersion:change.DisplayVersion??actual.DisplayVersion});
    assert.deepEqual(evidence.expected,{DisplayName:`GankSoft ${version}`,DisplayVersion:version});return true;
   });
  }
 }
});
