import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {win32} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {windowsVersion} from './windows-version.mjs';
const scheme='ganksoft.installation/1';
export function installationIdentity(meta) {
 windowsVersion(meta.version);
 for(const v of [meta.sha,meta.packagingToolchain?.sha])if(typeof v!=='string'||! /^[a-f0-9]{40}$/.test(v))throw Error('Invalid installation source/tool SHA');
 for(const v of [meta.lockSha256,meta.packagingToolchain?.lockSha256])if(typeof v!=='string'||! /^[a-f0-9]{64}$/.test(v))throw Error('Invalid installation lock identity');
 for(const key of ['name','branch'])if(typeof meta[key]!=='string'||!meta[key].length||meta[key].length>4096||/[\x00-\x1f\x7f]/.test(meta[key]))throw Error('Invalid installation '+key);
 for(const key of ['runId','runAttempt'])if(typeof meta[key]!=='string'||! /^(?:local|[1-9][0-9]{0,19})$/.test(meta[key]))throw Error('Invalid installation '+key);
 // Per-build isolation matches the former ArtifactName AppId policy. Hash full SHAs,
 // not their display prefixes. 192 bits keep the complete key below Inno's 63 limit.
 const identity=[scheme,meta.version,meta.sha,meta.lockSha256,meta.packagingToolchain.sha,meta.packagingToolchain.lockSha256,meta.branch,meta.name,meta.runId,meta.runAttempt,'windows-x64'];
 const appId='GankSoft-'+createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0,48);
 return {scheme,appId,registryHive:'HKEY_CURRENT_USER',registryView:'Registry64',registrySubKey:'Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\'+appId+'_is1'};
}
export function requireInstallationIdentity(meta) {
 const expected=installationIdentity(meta);
 if(!isDeepStrictEqual(meta.installation,expected))throw Error('Installation identity mismatch');
 return expected;
}
export function validateRegistry(meta,actual,target) {
 const id=requireInstallationIdentity(meta);
 if(!actual||actual.hive!==id.registryHive||actual.view!==id.registryView||actual.subKey!==id.registrySubKey||actual.exists!==true)throw Error('Uninstall registry location missing/mismatch');
 const samePath=(a,b)=>typeof a==='string'&&typeof b==='string'&&win32.isAbsolute(a)&&win32.normalize(a).replace(/[\\/]+$/,'').toLowerCase()===win32.normalize(b).replace(/[\\/]+$/,'').toLowerCase();
 if(actual.DisplayName!=='GankSoft'||actual.DisplayVersion!==meta.version)throw Error('Uninstall registry application/version mismatch');
 if(!samePath(actual.InstallLocation,target))throw Error('Uninstall registry install path mismatch');
 const match=typeof actual.UninstallString==='string'&&/^"([^"\r\n]+)"$/.exec(actual.UninstallString);
 if(!match||!samePath(match[1],win32.join(target,'unins000.exe')))throw Error('Uninstall registry command mismatch');
 return {status:'PASS',...actual};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const meta=JSON.parse(readFileSync(process.argv[3],'utf8').replace(/^\uFEFF/,''));
 if(process.argv[2]==='identity')console.log(JSON.stringify(requireInstallationIdentity(meta)));
 else if(process.argv[2]==='registry')console.log(JSON.stringify(validateRegistry(meta,JSON.parse(readFileSync(process.argv[4],'utf8').replace(/^\uFEFF/,'')),process.argv[5])));
 else throw Error('Unknown installation validation command');
}
