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
// Inno Setup 6.7.1 SetupLdr.version.rc reserves 20/50 UTF-16 characters.
// UpdateStringValue overwrites only the prefix, retaining ASCII-space placeholders.
export function resourceVersionExpected(semver,kind) {
 const mapping=windowsVersion(semver);
 if(!['installer','application'].includes(kind))throw Error('Unknown Windows PE resource kind');
 if(kind==='installer'&&semver.length>20)throw Error('Inno FileVersion text capacity exceeded; truncation forbidden');
 return {numericFileVersion:mapping.numeric,numericProductVersion:mapping.numeric,
  FileVersion:kind==='installer'?semver.padEnd(20,' '):semver,
  ProductVersion:kind==='installer'?semver.padEnd(50,' '):semver};
}
export async function versionResourceEvidence(bytes,semver,kind) {
 const expected=resourceVersionExpected(semver,kind);
 const {NtExecutable,NtExecutableResource,Resource}=await import('resedit');
 const infos=Resource.VersionInfo.fromEntries(NtExecutableResource.from(NtExecutable.from(bytes,{ignoreCert:true})).entries);
 if(infos.length!==1)throw Error('Exactly one Windows PE version resource required');
 const vi=infos[0],fixed=vi.fixedInfo,parts=(ms,ls)=>[ms>>>16,ms&65535,ls>>>16,ls&65535].join('.');
 const actual={numericFileVersion:parts(fixed.fileVersionMS,fixed.fileVersionLS),numericProductVersion:parts(fixed.productVersionMS,fixed.productVersionLS),
  strings:vi.getAllLanguagesForStringValues().map(language=>{const v=vi.getStringValues(language);return {language,FileVersion:v.FileVersion??null,ProductVersion:v.ProductVersion??null};})};
 const mismatches=[];
 for(const field of ['numericFileVersion','numericProductVersion'])if(actual[field]!==expected[field])mismatches.push({field,actual:actual[field],expected:expected[field]});
 if(!actual.strings.length)mismatches.push({field:'StringFileInfo',actual:[],expected:'at least one language table'});
 for(const strings of actual.strings)for(const field of ['FileVersion','ProductVersion'])if(strings[field]!==expected[field])mismatches.push({field,language:strings.language,actual:strings[field],expected:expected[field]});
 return {schema:1,semver,kind,status:mismatches.length?'FAIL':'PASS',actual,expected,mismatches};
}
export function requireVersionResources(evidence) {
 if(evidence.status!=='PASS'||evidence.mismatches.length)throw Error('Windows PE numeric/text version mismatch: '+JSON.stringify(evidence.mismatches));
 return evidence;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv[2]==='verify'){
  const {readFileSync}=await import('node:fs');
  const evidence=await versionResourceEvidence(readFileSync(process.argv[3]),process.argv[4],process.argv[5]);
  console.log(JSON.stringify(evidence)); // Print raw/expected fields before a failing assertion.
  requireVersionResources(evidence);
 }else console.log(JSON.stringify(windowsVersion(process.argv[2])));
}
