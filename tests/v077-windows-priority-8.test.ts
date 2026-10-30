import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {IMPLEMENTED,loadCases,PLATFORM_GATED} from '../tools/validation/v077/registry.mjs';
import {MODULES} from '../tools/validation/v077/modules.mjs';

const ids=['NEW-13','CLIP-03','CLIP-09','WIN-04','WIN-05','WIN-06','WIN-07','WIN-09'];
const caseMap=new Map(loadCases().map(x=>[x.id,x]));
const support='tools/validation/v077/scenarios/win-native-support.mjs';
const scriptPaths=[...new Set(ids.map(id=>'tools/validation/v077/'+IMPLEMENTED[id]))];

test('all 91 user-priority CASEs have concrete handlers, with exact Windows 8 coverage',()=>{
  const base=new Set(MODULES.flatMap(m=>m.baseline));
  const p0=new Set(loadCases().filter(x=>x.priority==='P0').map(x=>x.id));
  const priority=new Set([...base,...p0,'EDITOR-20','EDITOR-21','WIN-04','WIN-05','WIN-06','WIN-07']);
  assert.equal(priority.size,91);
  for(const id of priority)assert.ok(IMPLEMENTED[id],id+' lacks handler');
  assert.equal(ids.length,8);
  assert.equal(new Set(ids).size,8);
  assert.deepEqual(ids.filter(id=>caseMap.get(id).electronUi==='BLOCKED').sort(),
    ['CLIP-03','CLIP-09','NEW-13']);
  assert.deepEqual(ids.filter(id=>caseMap.get(id).electronUi==='NOT_RUN').sort(),
    ['WIN-04','WIN-05','WIN-06','WIN-07','WIN-09']);
  for(const id of ids)assert.match(IMPLEMENTED[id],/^scenarios\/win-(ime|clipboard|dialogs|portable)\.mjs$/);
});
test('Windows physical handlers implement actual unattended preflight, attended GUI and outcome checks',()=>{
  for(const path of [...scriptPaths,support,'tools/validation/v077/win09-verify.mjs']){
    assert.ok(existsSync(path),path+' missing');
    const check=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
    assert.equal(check.status,0,path+': '+check.stderr);
  }
  const app=readFileSync(support,'utf8');
  assert.match(app,/process\.platform!=='win32'/);
  assert.match(app,/GANKSOFT_WIN_SUPERVISED/);
  assert.match(app,/event\.isTrusted/);
  assert.match(app,/WINDOWS_PHYSICAL_INPUT_REQUIRED/);
  assert.match(app,/clipboard\.availableFormats/);
  assert.doesNotMatch(app,/clipboard\.write(Text|Image)?\(/);
  assert.doesNotMatch(app,/dispatchEvent\(/);
  const runner=readFileSync('tools/validation/v077/helpers.mjs','utf8');
  assert.match(runner,/inputBlocked\?'BLOCKED'/);
  assert.match(runner,/inputBlocked\?2:1/);
  const plan=readFileSync('tools/validation/v077/phase.mjs','utf8');
  assert.match(plan,/checkpoints\.unshift\(\{id:'M5-P0-FOLLOWUP'/);
  assert.deepEqual(PLATFORM_GATED.slice().sort(),['CLIP-03','CLIP-09','NEW-13']);
});
test('real Snipping Tool / original Office source evidence is mandatory',()=>{
  const s=readFileSync('tools/validation/v077/scenarios/win-clipboard.mjs','utf8');
  assert.match(s,/Win\+Shift\+S/);
  assert.match(s,/original screenshot/);
  assert.match(s,/nativeClipboard\(ctx,stage\.marker,\{rich:stage\.rich\}\)/);
  assert.match(s,/await restartDraft\(ctx/);
  assert.match(s,/requireTrusted\(events,'paste'\)/);
  assert.doesNotMatch(s,/clipboard\.write(Text|Image)?\(/);
  const ime=readFileSync('tools/validation/v077/scenarios/win-ime.mjs','utf8');
  assert.match(ime,/requireComposition\(events\)/);
  assert.match(ime,/ctrlSave/);
  assert.match(ime,/second distinct installed Chinese IME/);
  const dialogs=readFileSync('tools/validation/v077/scenarios/win-dialogs.mjs','utf8');
  assert.match(dialogs,/protectedFacts\(ctx\)/);
  assert.match(dialogs,/readContainer\(target\)/);
  assert.doesNotMatch(dialogs,/show(Open|Save)Dialog\s*=/);
});
test('paired WIN-09 proof comparison rejects wrong OS and mismatched artifact; never auto-promotes PASS',()=>{
  const dir=mkdtempSync(join(tmpdir(),'gank-v077-win09-proof-'));
  try{
    const workflow={newCard:true,autoDraft:true,draftReopen:true,publishSameCard:true,
      formalReview:true,objectiveCorrect:true,newPid:true,persistedEvent:true,
      dueOnRestart:true,guiHistory:true,scoreTenths:86,rating:'good',contentMode:'question'};
    const common={schema:'ganksoft.v077/native-win09-host-1',caseId:'WIN-09',
      zipSha256:'a'.repeat(64),exeSha256:'b'.repeat(64),
      package:{buildSha:'c'.repeat(40),version:'0.7.7'},localOutcome:'PASS',
      attended:true,source:'EXTRACTED_PORTABLE_GANKSOFT_EXE',workflow};
    const ten=join(dir,'10.json'),eleven=join(dir,'11.json'),out=join(dir,'paired.json');
    writeFileSync(ten,JSON.stringify({...common,os:{family:'win10',arch:'x64',build:19045}}));
    writeFileSync(eleven,JSON.stringify({...common,os:{family:'win11',arch:'x64',build:22631}}));
    const cmd=()=>spawnSync(process.execPath,
      ['tools/validation/v077/win09-verify.mjs',ten,eleven,out],{encoding:'utf8'});
    const good=cmd();assert.equal(good.status,0,good.stderr);
    const merged=JSON.parse(readFileSync(out,'utf8'));
    assert.equal(merged.status,'READY_FOR_HUMAN_REVIEW_NOT_AUTO_PASS');
    assert.equal(merged.sameArtifact,true);
    writeFileSync(eleven,JSON.stringify({...common,zipSha256:'d'.repeat(64),os:{family:'win11',arch:'x64',build:22631}}));
    const bad=cmd();assert.notEqual(bad.status,0);
    assert.match(bad.stderr,/different ZIP files/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
