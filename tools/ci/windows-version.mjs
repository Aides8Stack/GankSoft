import {pathToFileURL} from 'node:url';
// v1 is injective over the project's supported stable/rc.N release domain.
// Build metadata and other prerelease forms have no reserved slots and are rejected.
export function windowsVersion(semver) {
 const m=typeof semver==='string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-rc\.([1-9]\d*))?$/.exec(semver);
 if(!m)throw Error('Windows packaging supports canonical stable or rc.N without build metadata');
 const core=m.slice(1,4).map(Number),revision=m[4]===undefined?65535:Number(m[4]);
 if(core.some(n=>!Number.isSafeInteger(n)||n>65535)||!Number.isSafeInteger(revision)||revision<1||revision> (m[4]===undefined?65535:65534))throw Error('Windows version component overflow');
 const parts=[...core,revision];return {scheme:'ganksoft.windows-version/1',semver,numeric:parts.join('.'),parts};
}
export async function stampWindowsVersion(bytes,semver) {
 const {NtExecutable,NtExecutableResource,Resource}=await import('resedit');
 const exe=NtExecutable.from(bytes),res=NtExecutableResource.from(exe),info=Resource.VersionInfo.fromEntries(res.entries);
 if(info.length!==1)throw Error('Exactly one application PE version resource required');
 const v=windowsVersion(semver);info[0].setFileVersion(...v.parts);info[0].setProductVersion(...v.parts);
 for(const language of info[0].getAllLanguagesForStringValues())info[0].setStringValues(language,{FileVersion:semver,ProductVersion:semver});
 info[0].outputToResourceEntries(res.entries);res.outputResource(exe);return Buffer.from(exe.generate());
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(windowsVersion(process.argv[2])));
