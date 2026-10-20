import { appendFileSync, readFileSync } from 'node:fs';
import {git,json,checkVersion} from './version.mjs';
import {client,pages} from './github.mjs';
import {classify,docsOnly} from './scope.mjs';
const event=json(process.env.GITHUB_EVENT_PATH),pr=event.pull_request;
if(pr.head.repo?.full_name!=='Aides8Stack/GankSoft'||pr.user.login!=='Aides8Stack'||!['develop','main'].includes(pr.base.ref))throw Error('Unauthorized PR source; owner-maintained same-repository branches only');
const base=git('rev-parse',`refs/remotes/origin/${pr.base.ref}`),head=process.env.PR_HEAD_SHA;
if(!/^[a-f0-9]{40}$/.test(base)||!/^[a-f0-9]{40}$/.test(head))throw Error('Invalid fixed refs');
if(git('rev-parse','HEAD')!==head)throw Error('Wrong PR checkout');
// Strict up-to-date: parallel PR version reservations must be refreshed after a merge.
git('merge-base','--is-ancestor',base,head);
const paths=git('diff','--name-only',base,head).split('\n').filter(Boolean),docs=docsOnly(paths);
checkVersion(json('package.json'),json('package-lock.json'),{baseVersion:JSON.parse(git('show',`${base}:package.json`)).version,docsOnly:docs,tags:[...git('tag','--list').split('\n'),...(!docs?(await pages(client(),'/repos/Aides8Stack/GankSoft/releases')).map(r=>r.tag_name):[])]});
for(const p of paths.filter(x=>/\.(md|txt)$/.test(x))){try{const b=readFileSync(p);if(b.includes(0))throw Error('Binary documentation');}catch(e){if(e.code!=='ENOENT')throw e;}}
console.log(JSON.stringify({paths,categories:classify(paths),docsOnly:docs}));
if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`docs=${docs}\n`);
