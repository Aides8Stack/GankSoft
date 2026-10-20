import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
export const git = (...args) => execFileSync('git', args, {encoding:'utf8'}).trim();
export const json = path => JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));
const rx = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
export function parse(v) { const m=typeof v==='string' && v.match(rx); if(!m) throw Error('Invalid SemVer');return {core:m.slice(1,4).map(BigInt),pre:m[4]?.split('.')??[],build:m[5]}; }
export function compare(a,b) {
 const x=parse(a),y=parse(b);const cmp=(a,b)=>a>b?1:a<b?-1:0;
 for(let i=0;i<3;i++){const c=cmp(x.core[i],y.core[i]);if(c)return c;}
 if(!x.pre.length||!y.pre.length)return x.pre.length===y.pre.length?0:x.pre.length?-1:1;
 for(let i=0;i<Math.max(x.pre.length,y.pre.length);i++){
  const a=x.pre[i],b=y.pre[i];if(a===undefined)return -1;if(b===undefined)return 1;
  const an=/^\d+$/.test(a),bn=/^\d+$/.test(b);const c=an&&bn?cmp(BigInt(a),BigInt(b)):an!==bn?an?-1:1:cmp(a,b);if(c)return c;
 }return 0;
}
export function checkVersion(pkg,lock,{baseVersion,docsOnly=false,tags=[]}={}) {
 parse(pkg.version);
 if(lock.version!==pkg.version||lock.packages?.['']?.version!==pkg.version)throw Error('Lock version mismatch');
 if(baseVersion && (!docsOnly || pkg.version!==baseVersion) && compare(pkg.version,baseVersion)<=0)throw Error('Version must increase above current base');
 if(tags.includes('v'+pkg.version) && (!docsOnly||pkg.version!==baseVersion))throw Error('Version tag already used, including withdrawn releases');
 return pkg.version;
}
export function bump(version) {
 parse(version);const p=json('package.json'),l=json('package-lock.json');
 if(compare(version,p.version)<=0)throw Error('Bump must increase version');
 if(git('tag','--list','v'+version))throw Error('Tag already used');
 p.version=version;l.version=version;l.packages[''].version=version;
 writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');writeFileSync('package-lock.json',JSON.stringify(l,null,2)+'\n');
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 const [command,arg]=process.argv.slice(2);
 if(command==='bump')bump(arg);
 else {const opts=arg?{baseVersion:JSON.parse(git('show',`${arg}:package.json`)).version,tags:git('tag','--list').split('\n')}:{};console.log(checkVersion(json('package.json'),json('package-lock.json'),opts));}
}
