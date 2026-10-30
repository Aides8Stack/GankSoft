// Windows hosted CI provides useful GUI/clipboard regression evidence but not physical
// Win10/Win11, Word/WPS, live IME, Snipping Tool or two-client-OS acceptance.
import {spawnSync,execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {currentWindowsIdentity} from './windows-platform.mjs';

const root=resolve('validation-results/v077/windows-ci-proxy');
mkdirSync(root,{recursive:true});
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const identity=currentWindowsIdentity();
const baseline=['NEW-01','OLD-03','CLIP-01','CLIP-02','CLIP-04'];
const strict=['NEW-13','CLIP-03','CLIP-09','WIN-04','WIN-05','WIN-06','WIN-07','WIN-09'];
const report={schema:'ganksoft.v077/windows-hosted-ci-proxy-1',sourceSha:sha,
  platform:process.platform,os:identity,layer:'WINDOWS_HOSTED_CI_PROXY_NOT_REAL_CLIENT',
  purpose:'Automated Windows Electron GUI and controlled clipboard regression only',
  executedStrictCases:[],strictCasesPending:strict,
  proxyIds:baseline,proxyStatus:'NOT_RUN',
  proxyCases:[],nativeClientStatus:'NOT_ATTESTED',
  realWin10:'NOT_RUN',realWin11:'NOT_RUN',trueOfficePaste:'NOT_RUN',
  nativeIme:'NOT_RUN',physicalScreenshot:'NOT_RUN',nativeDialog:'NOT_RUN',
  notes:['Windows hosted runner is not a verified Windows 10/11 client.',
    'Synthetic clipboard fixtures are not genuine Word/WPS or physical Snipping Tool input.',
    'Never promote this report to E2E-RESULTS.json or Windows physical acceptance.']};
let code=0;
try{
  if(process.platform!=='win32')throw Error('CI_PROXY_WINDOWS_RUNNER_REQUIRED');
  const cmd=spawnSync(process.execPath,['tools/validation/v077/run.mjs','run','--ids',baseline.join(',')],
    {encoding:'utf8',timeout:18*60*1000,maxBuffer:10*1024*1024,
      env:{...process.env,GANKSOFT_WIN_SUPERVISED:'0'}});
  writeFileSync(join(root,'runner-console.log'),
    String(cmd.stdout??'')+'\nSTDERR:\n'+String(cmd.stderr??'')+'\n');
  const pathname=String(cmd.stdout??'').match(/V077_E2E_REPORT=(.+)/)?.[1]?.trim();
  if(!pathname)throw Error('NO_GUI_SUMMARY: exit='+cmd.status+' signal='+cmd.signal);
  const summary=JSON.parse(readFileSync(resolve(pathname),'utf8'));
  if(summary.sourceSha!==sha||summary.platform!=='win32')
    throw Error('PROXY_SOURCE_OR_PLATFORM_MISMATCH');
  if(summary.rows.length!==baseline.length)
    throw Error('MISSING_PROXY_CASE_RESULTS');
  if(summary.rows.some(x=>!baseline.includes(x.id))||
    new Set(summary.rows.map(x=>x.id)).size!==baseline.length)
    throw Error('DUPLICATE_OR_FOREIGN_PROXY_CASE');
  report.proxyCases=summary.rows.map(x=>({id:x.id,status:x.status,
    kind:x.kind??null,actual:String(x.actual??x.reason??'').slice(0,360),
    evidence:(x.evidence??[]).slice(0,12)}));
  report.rawRunId=summary.runId;
  report.rawResultDirectory=summary.resultDirectory;
  report.proxyStatus=report.proxyCases.every(x=>x.status==='PASS')?'PASS':'FAIL_OR_BLOCKED';
  code=report.proxyStatus==='PASS'?0:1;
}catch(e){
  report.proxyStatus='INFRA_BLOCKED';
  report.error=String(e.stack??e).slice(0,1300);
  code=2;
}
writeFileSync(join(root,'summary.json'),JSON.stringify(report,null,2)+'\n');
const line='| '+report.proxyIds.map((id,i)=>{
  const c=report.proxyCases.find(x=>x.id===id);
  return id+':'+(c?.status??'NOT_RUN');
}).join(' | ')+' |';
const markdown=['### GankSoft v0.7.7 Windows hosted CI proxy',
  'Source: '+sha,'Host: '+identity.family+' / ProductType '+identity.productType+
    ' / build '+identity.build,
  'Windows-hosted GUI proxy: **'+report.proxyStatus+'**',
  'Proxy cases: '+line,
  '**Physical Windows 10/11 acceptance: NOT_RUN.**',
  '**Original eight Windows-special CASE statuses: unchanged.**',
  'Artifacts: windows-ci-proxy/summary.json and per-case raw evidence.'].join('\n\n')+'\n';
if(process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown);
console.log(JSON.stringify({report:join(root,'summary.json'),sourceSha:sha,os:identity,
  proxyStatus:report.proxyStatus,proxyCases:report.proxyCases,
  strictCasesUntouched:strict},null,2));
process.exitCode=code;
