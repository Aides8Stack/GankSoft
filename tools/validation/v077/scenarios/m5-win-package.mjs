// M5-01/M5-02: real Win10/Win11 ZIP, Expand-Archive and packaged EXE from a Chinese/space path.
import assert from 'node:assert/strict';
import {join,dirname,basename} from 'node:path';
import {existsSync,mkdirSync,cpSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {_electron as electron} from 'playwright-core';
import {createClient} from '../../../../shared/protocol/client.ts';
import {executeCase,enterCards,restart,draftBoxOpen} from '../helpers.mjs';
import {observe,evidence,step,editor} from './core-support.mjs';
import {readContainer,integrity} from './system-support.mjs';
import {preflight,actualOs,sha256,blocked,recordLocalProof} from './win-native-support.mjs';
const id=process.argv[2],out=process.argv[3];
if(!['WIN-01','WIN-02'].includes(id)||!out)throw Error('UNKNOWN_M5_PACKAGE_CASE');
const zip=process.env.GANKSOFT_WIN_PORTABLE_ZIP,exe=process.env.GANKSOFT_WIN_PORTABLE_EXE;
let targetExe='';
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
async function packed(f){
  assert.ok(targetExe&&existsSync(targetExe),'Target portable GankSoft.exe must exist');
  const app=await electron.launch({executablePath:targetExe,args:[],
    env:{...process.env,GANKSOFT_E2E:'1',GANKSOFT_DATA_DIR:f.data,TZ:'Asia/Shanghai'},
    timeout:40000});
  const page=await app.firstWindow();page.setDefaultTimeout(16000);
  await page.locator('[aria-label="学习摘要"][aria-busy=false]').waitFor();
  const api=createClient(req=>page.evaluate(v=>window.gank.protocol(v),req));
  await api.call('app.capabilities',{});
  return {app,page,api};
}
if(preflight(id,out,{portable:true})){
 await executeCase(id,out,async ctx=>{
   await observe(ctx);let p=ctx.session.page,reboot;
   // Copy/extract into a synthetic path only; never modify the source ZIP or user installations.
   const original=ctx.fixture.root,os=actualOs();
   assert.ok(existsSync(zip)&&existsSync(exe));
   assert.match(basename(exe),/^GankSoft\.exe$/i);
   const zipSha=sha256(zip);
   const entries=await readContainer(zip);
   assert.ok(entries.size>100,'ZIP must contain a real packaged application, not only metadata');
   for(const key of entries.keys())assert.ok(key==='GankSoft/'||key.startsWith('GankSoft/'),
     'ZIP top-level must be GankSoft/: '+key);
   assert.ok([...entries.keys()].some(x=>/^GankSoft\/GankSoft\.exe$/i.test(x)));
   assert.ok(![...entries.keys()].some(x=>/setup\.exe$|installer\.exe$|\.msi$|\.msix$/i.test(x)),
     'Portable ZIP must not package a separate installer');
   const archiveDest=join(original,'M5 测试 解压到 含空格中文 目录');
   mkdirSync(archiveDest,{recursive:true});
   const ps=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',
     'Expand-Archive -LiteralPath '+q(zip)+' -DestinationPath '+q(archiveDest)+' -Force'],{
     encoding:'utf8',timeout:180000});
   assert.equal(ps.status,0,'True Windows Expand-Archive failed: '+ps.stderr);
   targetExe=join(archiveDest,'GankSoft','GankSoft.exe');
   assert.ok(existsSync(targetExe));
   const extractedSha=sha256(targetExe);
   assert.equal(extractedSha,sha256(exe),'Extracted executable differs from supplied original ZIP artifact');
   const buildPath=join(dirname(targetExe),'build-metadata.json');
   assert.ok(existsSync(buildPath),'Portable build identity metadata missing');
   const metadata=JSON.parse(readFileSync(buildPath,'utf8'));
   assert.match(metadata.sha??'',/^[a-f0-9]{40}$/);
   const proof={schema:'ganksoft.v077/win-host-1',caseId:id,os,
     zipSha256:zipSha,exeSha256:extractedSha,sourceSha:metadata.sha,
     version:metadata.version,source:'POWER_SHELL_EXPAND_ARCHIVE',pathUnicode:true,
     entries:entries.size,installerIncluded:false,localOutcome:'PASS'};
   ctx.observations.checks.nativePackage=proof;
   if(id==='WIN-01'){
     recordLocalProof(out,'WIN-01-'+os.family+'-host-proof.json',proof);
     step(ctx,'Native Windows Expand-Archive SHA256 validates exact GankSoft/ root, no installer and same real EXE');
     await evidence(ctx);
     throw blocked('WIN-01 '+os.family+' host proof recorded; requires matching Win10 and Win11 original ZIP/EXE/build hashes before cross-platform PASS');
   }
   // WIN-02: relaunch from the isolated Unicode + space extracted EXE, not from the original app path.
   const firstReboot=await restart(ctx);await observe(ctx);p=ctx.session.page;
   assert.notEqual(firstReboot.oldPid,firstReboot.newPid);
   const first=ctx.session.app.process().spawnfile??'';
   assert.ok(first.includes('GankSoft.exe')||first.includes('GankSoft'),'Packaged app not launched');
   assert.ok(targetExe.includes(' ')&&/[^\x00-\x7f]/.test(targetExe));
   await enterCards(ctx);
   await p.getByRole('button',{name:'编辑 B2 保持发布和历史',exact:true}).click();
   await editor(ctx,'body').fill('WIN-02 便携中文 空格路径重启持久化');
   await p.getByTestId('save-draft').click();
   const draft=await ctx.session.api.call('draft.get',ctx.fixture.card);
   assert.ok(draft.payload.fields.body.includes('WIN-02 便携'));
   reboot=await restart(ctx);await observe(ctx);
   assert.equal((await ctx.session.api.call('draft.get',ctx.fixture.card)).payload.fields.body,draft.payload.fields.body);
   await enterCards(ctx);
   await draftBoxOpen(ctx,'B2 保持发布和历史');
   assert.ok((await editor(ctx,'body').innerText()).includes('WIN-02 便携'));
   proof.newPid=reboot.oldPid!==reboot.newPid;
   proof.draftPersisted=true;
   recordLocalProof(out,'WIN-02-'+os.family+'-host-proof.json',proof);
   integrity(ctx);
   step(ctx,'Actual extracted portable executable in Unicode/space path launches, GUI draft survives stop/start and stays editable');
   return {...await evidence(ctx),reboot};
 },{launch:async f=>{
    // WIN-01 also launches real portable EXE after WinZip preflight; extraction occurs in action.
    if(!targetExe){
      targetExe=exe;
    }
    return packed(f);
 }});
}
