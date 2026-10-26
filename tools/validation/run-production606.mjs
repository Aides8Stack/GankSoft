import {resolve,dirname,join} from 'node:path';
import {runCheckedSmoke} from './checked-smoke.mjs';
import {PRODUCTION606_CONTRACT} from './smoke-contracts.mjs';
const [target,executable]=process.argv.slice(2);
if(!target)throw Error('Expected production ASAR');
if(executable && resolve(target)!==join(dirname(resolve(executable)),'resources','app.asar'))
 throw Error('Actual EXE must use this exact packaged resources/app.asar');
const proof=runCheckedSmoke({script:PRODUCTION606_CONTRACT.script,target:resolve(target),
 definition:PRODUCTION606_CONTRACT,...(executable?{executable:resolve(executable)}:{})});
console.log('PRODUCTION606_PACKAGED_PASS '+JSON.stringify({cases:proof.caseCount,targetSha256:proof.targetSha256,platform:proof.platform}));
