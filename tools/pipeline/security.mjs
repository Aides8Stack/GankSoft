import {readFileSync,writeFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
import {git,json} from './version.mjs';
const secretRules=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/\bgithub_pat_[A-Za-z0-9_]{40,}\b/,/\bAKIA[0-9A-Z]{16}\b/];
export function scanText(text){return secretRules.some(r=>r.test(text));}
export function auditLock(lock,licenses){for(const [name,p]of Object.entries(lock.packages)){if(!name)continue;if(!licenses.includes(p.license))throw Error('Unreviewed dependency license: '+name);if(p.resolved?.startsWith('https:')&&!p.integrity)throw Error('Dependency integrity missing: '+name);if(p.resolved?.startsWith('git+')&&!/#[a-f0-9]{40}$/.test(p.resolved))throw Error('Unpinned git dependency: '+name);}}
export function auditWorkflows(files){for(const [path,text] of files){if(/pull_request_target\s*:/.test(text)||/secrets:\s*inherit/.test(text)||/write-all/.test(text))throw Error('Unsafe workflow: '+path);for(const m of text.matchAll(/uses:\s*([^\s#]+)/g))if(!m[1].startsWith('./')&&!/@[a-f0-9]{40}$/.test(m[1]))throw Error('Action must pin immutable SHA: '+path);}}
export function scanSource(){const paths=git('ls-files').split('\n');for(const path of paths){if(/\.(db|sqlite3?|pem|p12|pfx)$/.test(path))throw Error('Sensitive file type: '+path);if(scanText(readFileSync(path,'utf8')))throw Error('Potential secret detected (value redacted): '+path);}
 auditWorkflows(paths.filter(p=>/^\.github\/workflows\/.*\.ya?ml$/.test(p)).map(p=>[p,readFileSync(p,'utf8')]));
 const main=readFileSync('electron/main.ts','utf8');if(/nodeIntegration:\s*true|contextIsolation:\s*false|webSecurity:\s*false/.test(main))throw Error('Unsafe Electron web preferences');
}
export function auditDependencies(policy){auditLock(json('package-lock.json'),policy.licenses);
 const result=spawnSync(process.execPath,[process.env.npm_execpath,'audit','--json'],{encoding:'utf8',timeout:180000,maxBuffer:16e6});
 let audit;try{audit=JSON.parse(result.stdout);}catch{throw Error('Dependency audit unavailable');}
 if(result.error||audit.error||!audit.metadata?.vulnerabilities)throw Error('Dependency audit unavailable');
 const v=audit.metadata.vulnerabilities;if(v.high||v.critical)throw Error('High/critical dependency vulnerabilities block release');
 return {vulnerabilities:v,licenses:'PASS'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{scanSource();const r=auditDependencies(json('tools/pipeline/policy.json'));writeFileSync('validation-results/ci/security.json',JSON.stringify({status:'PASS',...r}));}catch(e){console.error(e.message);process.exitCode=1;}}
