import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {spawnSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
import {git,json} from './version.mjs';
import {parseDocument, visit} from 'yaml';
import {createHash} from 'node:crypto';
const secretRules=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/\bgithub_pat_[A-Za-z0-9_]{40,}\b/,/\bAKIA[0-9A-Z]{16}\b/,/\bsk-[A-Za-z0-9_-]{32,}\b/,/\bnpm_[A-Za-z0-9]{32,}\b/];
export function scanText(text){return secretRules.some(r=>r.test(text));}
export function auditLock(lock,licenses){for(const [name,p]of Object.entries(lock.packages)){if(!name)continue;if(!licenses.includes(p.license))throw Error('Unreviewed dependency license: '+name);if(p.resolved?.startsWith('https:')&&!p.integrity)throw Error('Dependency integrity missing: '+name);if(p.resolved?.startsWith('git+')&&!/#[a-f0-9]{40}$/.test(p.resolved))throw Error('Unpinned git dependency: '+name);}}
// Parse policy-bearing YAML nodes; never infer a job from indentation or line endings.
const publishingJobs = new Map([
 ['develop-rc.yml', 'release-rc'],
 ['stable-candidate.yml', 'stable-draft'],
 ['release-control.yml', 'release-control'],
]);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const trustedMetadataHash = 'f5208391e5dbff69cfa8f3668219d9cc6f713d7c05e9849ab24be59fcc5b68d8';
export function auditWorkflows(files) {
 if (!Array.isArray(files) || files.length === 0) throw Error('Workflow files required');
 for (const [path, text] of files) {
  const metadataOnly = typeof path === 'string' && path.replaceAll('\\', '/').split('/').at(-1) === 'pr-trust.yml' && typeof text === 'string' && createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex') === trustedMetadataHash;
  const fail = reason => { throw Error(`${reason}: ${path}`); };
  if (typeof path !== 'string' || typeof text !== 'string' || !text.trim()) fail('Invalid workflow input');
  const doc = parseDocument(text, { uniqueKeys: true, merge: false });
  if (doc.errors.length || doc.warnings.length) fail('Invalid workflow YAML');
  // Explicitly reject aliases and merge keys instead of auditing a partially expanded policy.
  visit(doc, { Alias() { fail('Workflow aliases are unsupported'); }, Pair(_, pair) {
   if (['<<', '__proto__', 'constructor', 'prototype'].includes(pair.key?.value)) fail('Unsafe workflow key');
  } });
  const workflow = doc.toJS({ maxAliasCount: 0 });
  if (!record(workflow) || !record(workflow.jobs) || !Object.keys(workflow.jobs).length) fail('Workflow jobs required');
  const events = typeof workflow.on === 'string' ? [workflow.on] : Array.isArray(workflow.on) ? workflow.on : record(workflow.on) ? Object.keys(workflow.on) : [];
  if (!events.length || events.some(event => typeof event !== 'string' || (event === 'pull_request_target' && !metadataOnly))) fail('Unsafe workflow event');
  function permissions(value, job) {
   if (!record(value)) fail('Permissions must be an explicit map');
   if (!job && value.contents !== 'read') fail('Top-level contents must be read');
   for (const [scope, access] of Object.entries(value)) {
    if (!['read', 'none', 'write'].includes(access)) fail('Invalid permission value');
    if (access === 'write' && !(job && scope === 'contents' && publishingJobs.get(path.replaceAll('\\', '/').split('/').at(-1)) === job || metadataOnly && job === 'trust' && scope === 'statuses')) fail(`Write permission outside publishing job (${job ?? 'top-level'}, ${scope})`);
   }
  }
  permissions(workflow.permissions);
  function action(uses) {
   if (typeof uses !== 'string' || (!uses.startsWith('./') && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*@[a-f0-9]{40}$/.test(uses))) fail('Action must pin immutable SHA');
  }
  for (const [job, config] of Object.entries(workflow.jobs)) {
   if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(job) || !record(config)) fail('Invalid workflow job');
   if (Object.hasOwn(config, 'permissions')) permissions(config.permissions, job);
   if (config.secrets === 'inherit') fail('Unsafe inherited secrets');
   if (Object.hasOwn(config, 'uses')) action(config.uses);
   if (Object.hasOwn(config, 'steps')) {
    if (!Array.isArray(config.steps)) fail('Invalid workflow steps');
    for (const step of config.steps) {
     if (!record(step)) fail('Invalid workflow step');
     if (Object.hasOwn(step, 'uses')) action(step.uses);
    }
   }
  }
 }
}

export function scanSource(){const paths=git('ls-files','-z').split('\0').filter(Boolean);for(const path of paths){if(/\.(db|sqlite3?|pem|p12|pfx)$/.test(path))throw Error('Sensitive file type: '+path);if(scanText(readFileSync(path,'utf8')))throw Error('Potential secret detected (value redacted): '+path);}
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
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){mkdirSync('validation-results/ci',{recursive:true});try{scanSource();const r=auditDependencies(json('tools/pipeline/policy.json'));writeFileSync('validation-results/ci/security.json',JSON.stringify({status:'PASS',...r}));}catch(e){writeFileSync('validation-results/ci/security.json',JSON.stringify({status:'FAIL',reason:e.message}));console.error(e.message);process.exitCode=1;}}
