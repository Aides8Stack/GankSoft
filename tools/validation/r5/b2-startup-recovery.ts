// Bounded diagnostics only: existing runtime and existing isolated fixture.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdirSync,mkdtempSync,readdirSync,readlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {_electron as electron} from 'playwright-core';
import {args,require,start,stop} from './support.ts';
const out='docs/v076/rebuild-v37-source-first/stages/R5/evidence/b2-2-recovery';mkdirSync(out,{recursive:true});
const meta=JSON.parse(readFileSync('validation-results/r5-b2-2/fixture.json','utf8')),control=meta.data+'-control606';
const hash=(b:any)=>createHash('sha256').update(b).digest('hex');
const clean=(s:string)=>s.replace(/\x1b\[[0-9;]*m/g,'').replace(/ws:\/\/127\.0\.0\.1:\d+\/[^\s]+/g,'[redacted-local-debug-endpoint]');
function environment(){
 const executable=require('electron'),processes:any[]=[];
 for(const name of readdirSync('/proc').filter(n=>/^\d+$/.test(n))){try{if(readlinkSync('/proc/'+name+'/exe')!==executable)continue;const lines=readFileSync('/proc/'+name+'/status','utf8').split('\n').filter(l=>/^(Name|State|Pid|PPid|NSpid):/.test(l));processes.push({proc:name,status:lines});}catch{}}
 const lock=join(control,'writer.lock');return {runtime:executable,runtimeSha256:hash(readFileSync(executable)),electron:require('electron/package.json').version,node:process.version,platform:process.platform,selfPid:process.pid,selfNamespace:readlinkSync('/proc/self/ns/pid'),processes,
 lease:existsSync(lock)?{pid:JSON.parse(readFileSync(lock,'utf8')).pid,sha256:hash(readFileSync(lock))}:null,
 tcpListeners:readFileSync('/proc/net/tcp','utf8').split('\n').slice(1).filter(l=>l.trim().split(/\s+/)[3]==='0A').map(l=>({local:l.trim().split(/\s+/)[1],inode:l.trim().split(/\s+/)[9]})),
 databaseSha256:existsSync(join(control,'target/ganksoft.sqlite'))?hash(readFileSync(join(control,'target/ganksoft.sqlite'))):null,activePointerSha256:existsSync(join(control,'active.json'))?hash(readFileSync(join(control,'active.json'))):null};
}
const phase=process.argv[2]??'minimal',report:any={base:'edeb335fbe7c76a6ee155221fed8bc58f7096547',phase,status:'BLOCKED',args,before:environment(),cases:[],errors:[]};let app:any;
try{
 if(phase==='minimal'){
  const dir=mkdtempSync(join(tmpdir(),'gank-b22-launch-')),script=join(dir,'minimal.cjs');
  writeFileSync(script,`const {app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(join(dir,'profile'))});app.whenReady().then(()=>{const win=new BrowserWindow({width:900,height:700,webPreferences:{offscreen:process.platform==='linux'}});win.loadURL('data:text/html,<h1>GankSoft startup probe</h1>');});app.on('window-all-closed',()=>app.quit());`);
  app=await electron.launch({executablePath:require('electron'),args:[...args,script],timeout:15000});const p=await app.firstWindow();p.setDefaultTimeout(10000);await p.getByRole('heading',{name:'GankSoft startup probe',exact:true}).waitFor();
  report.running=await app.evaluate(({app}:any)=>({pid:process.pid,electron:process.versions.electron,ready:app.isReady()}));report.cases.push({name:'minimal BrowserWindow with B2.1 frozen-reference flags',status:'PASS'});
  // The adapter probe needs no database; reuse this same healthy process.
  await p.goto('file://'+resolve('dist/assets/b2-lifecycle/tools/validation/r5/b2-lifecycle.html'));await p.waitForFunction(()=>!!(window as any).b2Lifecycle);
  for(const method of ['unmountedInitialization','disableBeforeAsyncDestroy']){
   let timer:any;try{const details=await Promise.race([p.evaluate(async method=>(window as any).b2Lifecycle[method](),method),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('bounded lifecycle gate timeout')),15000))]);report.cases.push({name:method,status:'PASS',details});}
   catch(e){report.cases.push({name:method,status:'FAIL',error:clean(String(e))});}finally{clearTimeout(timer);}
  }
 }else if(phase==='application'){
  // No fixture creation, migration recovery, lock deletion, or alternate database.
  assert.equal(report.before.lease,null,'Existing lease requires investigation; do not delete it');
  assert.ok(report.before.databaseSha256&&report.before.activePointerSha256,'Original synthetic database missing; restore an existing cache before the application phase');
  const s=await start(meta.data);app=s.app;report.running=await app.evaluate(()=>({pid:process.pid,electron:process.versions.electron}));
  const tree=await s.api.call('knowledge.tree.read',{deckId:meta.deck.id});assert.deepEqual(new Set(tree.nodes.map(n=>n.nodeId)),new Set(meta.ids));report.cases.push({name:'formal production window, real IPC and original three-node Schema606 fixture',status:'PASS',tree});
  await s.page.goto('gank-app://ui/assets/b2-lifecycle/tools/validation/r5/b2-lifecycle.html');await s.page.waitForFunction(()=>!!(window as any).b2Lifecycle);
  for(const method of ['unmountedInitialization','disableBeforeAsyncDestroy']){
   let timer:any;try{const details=await Promise.race([s.page.evaluate(async method=>(window as any).b2Lifecycle[method](),method),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('bounded lifecycle gate timeout')),15000))]);report.cases.push({name:method,status:'PASS',details});}
   catch(e){report.cases.push({name:method,status:'FAIL',error:clean(String(e))});}
   finally{clearTimeout(timer);}
  }
 }else throw Error('unknown diagnostic phase');
 report.status=report.cases.some((x:any)=>x.status==='FAIL')?'FAIL':'PASS';
}catch(e){report.errors.push(clean(String((e as Error).stack??e)));process.exitCode=1;}
finally{if(app){const processHandle=app.process();let exit:any;processHandle.once('exit',(code:any,signal:any)=>exit={code,signal});try{await app.close();report.close={status:'PASS',exit:exit??{code:processHandle.exitCode,signal:processHandle.signalCode}};}catch(e){report.close={status:'FAIL',error:clean(String(e))};} }report.after=environment();writeFileSync(join(out,process.env.B2_RECOVERY_REPORT??phase+'.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
