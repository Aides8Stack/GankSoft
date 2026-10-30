// Reusable M2 test-only UI actions. No business API writes outside fixtureSetup.
import assert from 'node:assert/strict';
import {Transformer} from '@napi-rs/image';
import {enterCards,awaitDraft,exitEditorToList,draftBoxOpen,restart} from '../helpers.mjs';
import {editor,step} from './core-support.mjs';
import {loaded} from './p0-support.mjs';

export const originalTitle='B2 保持发布和历史';
export const field=editor;
export async function openPublished(ctx,title=originalTitle){
  await enterCards(ctx);
  const p=ctx.session.page;
  await p.getByRole('button',{name:'编辑 '+title,exact:true}).click();
  await p.getByTestId('card-draft-form').waitFor();
  await p.getByTestId('draft-title').waitFor();
  return p;
}
export async function openNewQuestion(ctx,title){
  await enterCards(ctx);
  const p=ctx.session.page;
  await p.getByRole('button',{name:'新建卡片',exact:true}).click();
  await p.getByTestId('draft-title').fill(title);
  await field(ctx,'stem').waitFor();
  return p;
}
export async function openQuestion(ctx,title){
  return openPublished(ctx,title);
}
export function optionRows(ctx){
  return ctx.session.page.locator('[aria-label="单选选项"] .option-row');
}
export async function optionMarkdown(ctx){
  const rows=optionRows(ctx);
  return rows.locator('.ProseMirror[contenteditable=true]').allInnerTexts();
}
export async function saveDraft(ctx,title,expectedField='body',contains=''){
  const p=ctx.session.page;
  await p.getByTestId('save-draft').click();
  await p.locator('[data-testid="card-draft-form"] [data-save-state=clean]').waitFor();
  const draft=await awaitDraft(ctx,title,expectedField,contains);
  assert.ok(draft.revision>0,'GUI save must create an actual durable revision');
  assert.equal(draft.title,title);
  step(ctx,'GUI explicit save completed; draft.get matches '+title);
  return draft;
}
export async function reopenDraft(ctx,title,{reboot=false}={}){
  await exitEditorToList(ctx);
  let result=null;
  if(reboot){result=await restart(ctx);await enterCards(ctx);}
  await draftBoxOpen(ctx,title);
  await ctx.session.page.getByTestId('card-draft-form').waitFor();
  step(ctx,'GUI opened draft inbox '+title+(reboot?' after fresh Electron PID':''));
  return result;
}
export async function leave(ctx){
  await exitEditorToList(ctx);
}
export async function writeText(ctx,value){
  await ctx.session.app.evaluate(({clipboard},text)=>clipboard.writeText(text),value);
}
export async function writeRich(ctx,{plain,html}){
  await ctx.session.app.evaluate(({clipboard,ClipboardItem},data)=>
    clipboard.write([new ClipboardItem({'text/plain':data.plain,'text/html':data.html})]),{plain,html});
}
export async function clipText(ctx){
  return ctx.session.app.evaluate(({clipboard})=>clipboard.readText());
}
export async function paste(ctx,which='body',{atEnd=true}={}){
  const p=ctx.session.page,area=field(ctx,which);
  await area.click();
  if(atEnd){await area.press('Control+End');await area.press('Enter');}
  await p.keyboard.press(process.platform==='darwin'?'Meta+V':'Control+V');
  step(ctx,'Real GUI OS keyboard paste into '+which+' using Electron native clipboard');
}
export async function writeImage(ctx,mime='image/png'){
  const rgba=Buffer.from(Array.from({length:4*4},(_,i)=>[i*10,50,145,255]).flat());
  const transformer=Transformer.fromRgbaPixels(rgba,4,4);
  const extension={'image/png':'pngSync','image/jpeg':'jpegSync','image/webp':'webpSync'}[mime];
  if(!extension||typeof transformer[extension]!=='function')throw Error('UNSUPPORTED_IMAGE_ENCODER:'+mime);
  const bytes=transformer[extension]();
  await ctx.session.app.evaluate(({clipboard,ClipboardItem},v)=>
    clipboard.write([new ClipboardItem({
      [v.mime]:new Blob([Buffer.from(v.base64,'base64')],{type:v.mime}),
    })]),{mime,base64:bytes.toString('base64')});
  step(ctx,'Generated synthetic '+mime+' clipboard fixture in Electron main; NOT real Windows physical source');
}
export async function writeMixed(ctx,plain,mime='image/png'){
  const rgba=Buffer.from(Array.from({length:16},()=>[180,50,90,255]).flat());
  const t=Transformer.fromRgbaPixels(rgba,4,4);
  const bytes=t.pngSync();
  await ctx.session.app.evaluate(({clipboard,ClipboardItem},v)=>
    clipboard.write([new ClipboardItem({
      'text/plain':v.plain,
      [v.mime]:new Blob([Buffer.from(v.base64,'base64')],{type:v.mime})
    })]),{plain,mime,base64:bytes.toString('base64')});
}
export async function checkImages(ctx,which='body',count=1){
  const imgs=field(ctx,which).locator('img[data-gank-placement]');
  await imgs.first().waitFor();
  assert.equal(await imgs.count(),count);
  await loaded(imgs);
  return imgs;
}
export function draftScope(ctx,card=ctx.fixture.card){
  return {deckId:ctx.fixture.deck.id,cardId:card.cardId};
}
export async function getDraft(ctx,card=ctx.fixture.card){
  return ctx.session.api.call('draft.get',draftScope(ctx,card));
}
export async function getPublished(ctx,card=ctx.fixture.card){
  return ctx.session.api.call('card.getPublishedContent',draftScope(ctx,card));
}
export async function openTransfer(ctx,type){
  const p=ctx.session.page;
  const label=type==='paste'?'粘贴卡片':'复制 Prompt';
  await p.getByRole('button',{name:label,exact:true}).click();
  const dialog=p.getByRole('dialog',{name:'内容交换',exact:true});
  await dialog.waitFor();
  await dialog.getByRole('heading',{name:type==='paste'?'粘贴卡片预览':'复制外部 AI Prompt',exact:true}).waitFor();
  return dialog;
}
export async function copyCard(ctx){
  await ctx.session.page.getByRole('button',{name:'复制卡片',exact:true}).click();
  const data=await clipText(ctx);
  assert.match(data,/ganksoft\.card-clipboard/);
  return data;
}
export async function parseTransfer(ctx,dialog,text){
  await dialog.getByRole('textbox',{name:'结构化卡片内容',exact:true}).fill(text);
  await dialog.getByRole('button',{name:'解析预览',exact:true}).click();
  await dialog.locator('pre').waitFor();
  return dialog.locator('pre').innerText();
}
export async function confirmTransfer(ctx,dialog){
  await dialog.getByRole('button',{name:'确认写入草稿',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  await ctx.session.page.locator('[data-testid="card-draft-form"] [data-save-state=clean]').waitFor();
}
export async function cancelTransfer(dialog){
  await dialog.getByRole('button',{name:'取消',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
}
export async function geometry(dialog,rootPage,{minimum=0.55}={}){
  const info=await dialog.evaluate(el=>{
    const b=el.getBoundingClientRect();
    const buttons=[...el.querySelectorAll('button')].filter(x=>getComputedStyle(x).visibility!=='hidden');
    const textareas=[...el.querySelectorAll('textarea')];
    return {width:b.width,height:b.height,left:b.left,top:b.top,
      viewportWidth:innerWidth,viewportHeight:innerHeight,
      textareas:textareas.map(x=>({scroll:x.scrollHeight,client:x.clientHeight,
        width:x.getBoundingClientRect().width,readonly:x.readOnly})),
      buttons:buttons.map(x=>({text:x.textContent.trim(),disabled:x.disabled}))};
  });
  assert.ok(info.width>=info.viewportWidth*minimum,
    'DIALOG_TOO_NARROW: '+info.width+' vs viewport '+info.viewportWidth);
  assert.ok(info.left>=-2&&info.left+info.width<=info.viewportWidth+2,'DIALOG_HORIZONTAL_OVERFLOW');
  assert.ok(info.top>=-2&&info.top+info.height<=info.viewportHeight+2,'DIALOG_VERTICAL_OVERFLOW');
  assert.ok(info.textareas.length>0,'MISSING_PRIMARY_TEXTAREA');
  const cancel=dialog.getByRole('button',{name:'取消',exact:true});
  await cancel.scrollIntoViewIfNeeded();
  const cancelRect=await cancel.boundingBox();
  assert.ok(cancelRect&&cancelRect.width>20&&cancelRect.height>18,'CANCEL_BUTTON_UNREACHABLE');
  return info;
}
export async function selectWordViaKeys(area,offset,count){
  await area.click();
  await area.press('Control+Home');
  for(let i=0;i<offset;i++)await area.press('ArrowRight');
  for(let i=0;i<count;i++)await area.press('Shift+ArrowRight');
}
