// Test-only *attended physical Windows* input verification. No synthetic clipboard or fake IME event.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {release} from 'node:os';
import {spawnSync} from 'node:child_process';
import {enterCards,awaitDraft,draftBoxOpen,exitEditorToList,restart} from '../helpers.mjs';
import {observe,step,editor} from './core-support.mjs';

export const sourceTitle='B2 保持发布和历史';
export function blocked(message){
  const e=new Error('WINDOWS_PHYSICAL_INPUT_REQUIRED: '+message);
  e.code='WINDOWS_PHYSICAL_INPUT_REQUIRED';
  return e;
}
export function actualOs(){
  const build=Number(release().split('.').at(-1));
  if(process.platform!=='win32'||!Number.isFinite(build))return null;
  return {family:build>=22000?'win11':build>=19041?'win10':'unsupported',build,arch:process.arch};
}
export function preflight(id,out,{supervised=true,portable=false}={}){
  const os=actualOs();
  const problems=[];
  if(!os||os.family==='unsupported'||os.arch!=='x64')problems.push('Windows 10/11 x64 interactive session required');
  if(supervised&&process.env.GANKSOFT_WIN_SUPERVISED!=='1')
    problems.push('Set GANKSOFT_WIN_SUPERVISED=1 in an unlocked interactive Windows desktop with a human present');
  if(portable){
    if(!process.env.GANKSOFT_WIN_PORTABLE_ZIP||!existsSync(process.env.GANKSOFT_WIN_PORTABLE_ZIP))problems.push('GANKSOFT_WIN_PORTABLE_ZIP missing');
    if(!process.env.GANKSOFT_WIN_PORTABLE_EXE||!existsSync(process.env.GANKSOFT_WIN_PORTABLE_EXE))problems.push('GANKSOFT_WIN_PORTABLE_EXE missing');
  }
  if(problems.length){
    mkdirSync(out,{recursive:true});
    writeFileSync(join(out,'case.json'),JSON.stringify({id,status:'BLOCKED',layer:'electronUi',
      platform:process.platform,kind:'WINDOWS_PHYSICAL_INPUT_REQUIRED',
      actual:problems.join('; '),steps:[],evidence:[],os,requiresHuman:true},null,2)+'\n');
    process.exitCode=2;
    return false;
  }
  return true;
}
export function sha256(path){return createHash('sha256').update(readFileSync(path)).digest('hex');}
export async function openExisting(ctx){
  await enterCards(ctx);
  const p=ctx.session.page;
  await p.getByRole('button',{name:'编辑 '+sourceTitle,exact:true}).click();
  await editor(ctx,'body').waitFor();
  return p;
}
export async function installPassiveProbe(ctx){
  const page=ctx.session.page;
  await page.evaluate(()=>{
    if(window.__gankWindowsProbe)return;
    const p={events:[],ack:0,label:'',start:0};
    window.__gankWindowsProbe=p;
    const record=(kind,event,extra={})=>{
      if(!event.isTrusted)return;
      const scope=event.target?.closest?.('.card-draft-form')? 'editor':'document';
      p.events.push({kind,scope,t:Date.now(),...extra});
      if(p.events.length>400)p.events.shift();
    };
    document.addEventListener('compositionstart',e=>record('compositionstart',e),true);
    document.addEventListener('compositionupdate',e=>record('compositionupdate',e),true);
    document.addEventListener('compositionend',e=>record('compositionend',e),true);
    document.addEventListener('input',e=>record('input',e,{inputType:e.inputType??''}),true);
    document.addEventListener('paste',e=>record('paste',e,
      {types:[...(e.clipboardData?.types??[])],isDefaultPrevented:e.defaultPrevented}),true);
    document.addEventListener('keydown',e=>{
      if(e.key==='F8'&&!e.repeat){p.ack++;record('operatorF8',e);e.preventDefault();return;}
      if(e.ctrlKey&&e.key.toLowerCase()==='s')record('ctrlSave',e);
      if(e.ctrlKey&&e.key.toLowerCase()==='v')record('ctrlPaste',e);
    },true);
    const marker=document.createElement('div');marker.id='v077-physical-input-guide';
    marker.setAttribute('role','status');
    marker.setAttribute('aria-live','polite');
    marker.style.cssText='position:fixed;bottom:12px;left:12px;z-index:2147483647;background:#142c33;color:#fff;padding:10px 12px;border:2px solid #86d6c1;border-radius:8px;max-width:440px;font:13px/1.4 Segoe UI,sans-serif;pointer-events:none;white-space:pre-wrap';
    marker.textContent='Windows physical input checkpoint (F8 after completion)';
    document.body.appendChild(marker);
  });
}
export async function operatorStep(ctx,label,instruction,{timeout=35000}={}){
  await installPassiveProbe(ctx);
  const page=ctx.session.page;
  const begin=await page.evaluate(({label,instruction})=>{
    const p=window.__gankWindowsProbe;
    p.label=label;p.start=p.events.length;
    document.getElementById('v077-physical-input-guide').textContent='WINDOWS REAL INPUT · '+label+'\n'+instruction+'\n\n完成后请在GankSoft窗口实际按 F8；未完成则保留 BLOCKED。';
    return {ack:p.ack,index:p.start};
  },{label,instruction});
  try{
    await page.waitForFunction(before=>window.__gankWindowsProbe?.ack>before,begin.ack,{timeout});
  }catch{throw blocked(label+' operator completion/F8 not received within '+timeout+'ms');}
  const output=await page.evaluate(from=>{
    const p=window.__gankWindowsProbe;
    return {ack:p.ack,events:p.events.slice(from)};
  },begin.index);
  assert.ok(output.events.some(x=>x.kind==='operatorF8'),
    'Human F8 completion evidence absent');
  step(ctx,'Attended real Windows GUI input ['+label+'] with trusted event telemetry');
  return output.events;
}
export async function nativeClipboard(ctx,needle,{rich=false,image=false}={}){
  const found=await ctx.session.app.evaluate(({clipboard},marker)=>{
    const formats=clipboard.availableFormats();
    const text=clipboard.readText();
    const img=clipboard.readImage();
    const size=img.isEmpty()?null:img.getSize();
    return {formats,matchingText:marker?text.includes(marker):false,textChars:text.length,
      imageSize:size,imagePresent:!!size&&size.width>0&&size.height>0};
  },needle);
  ctx.observations.checks.nativeClipboard??=[];
  ctx.observations.checks.nativeClipboard.push({...found,source:'Unmodified Windows OS clipboard; supplied by attended source application'});
  if(needle&&!found.matchingText)throw blocked('Clipboard missing exact synthetic marker '+needle+'; must copy from original app');
  if(rich&&!found.formats.some(f=>/html|rtf|rich/i.test(f)))
    throw blocked('Original Word/WPS copy lacked HTML/RTF native formats; text-only synthetic source is not sufficient');
  if(image&&!found.imagePresent)throw blocked('Win+Shift+S / Snipping Tool clipboard must contain a real image');
  return found;
}
export function requireTrusted(events,kind){
  assert.ok(events.some(x=>x.kind===kind),'No trusted Windows physical '+kind+' event observed');
}
export function requireComposition(events){
  if(!events.some(e=>e.kind==='compositionstart')||!events.some(e=>e.kind==='compositionend'))
    throw blocked('Real Chinese IME compositionstart/compositionend required; simulated keyboard text is not acceptance proof');
}
export async function durable(ctx,fragment){
  const saved=await awaitDraft(ctx,sourceTitle,'body',fragment);
  assert.equal(saved.cardId,ctx.fixture.card.cardId,'Draft was stored under wrong card');
  return saved;
}
export async function restartDraft(ctx,fragment){
  const proof=await restart(ctx);
  await observe(ctx);
  await enterCards(ctx);
  await draftBoxOpen(ctx,sourceTitle);
  assert.ok((await editor(ctx,'body').innerText()).includes(fragment));
  const saved=await durable(ctx,fragment);
  return {proof,draftRevision:saved.revision};
}
export async function assertUnchangedPublished(ctx,before){
  assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card),
    before,'Native Windows input changed published content without publishing');
}
export function shellProcessNames(){
  if(process.platform!=='win32')return [];
  const out=spawnSync('tasklist.exe',['/fo','csv','/nh'],{encoding:'utf8',timeout:5000});
  return out.status===0?out.stdout.split(/\r?\n/).map(x=>x.match(/^"([^"]+)"/)?.[1]?.toLowerCase()).filter(Boolean):[];
}
export function recordLocalProof(out,filename,value){
  const target=join(out,filename);
  writeFileSync(target,JSON.stringify(value,null,2)+'\n');
  return target;
}
