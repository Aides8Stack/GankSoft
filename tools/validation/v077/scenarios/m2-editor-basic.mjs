// T2-M2 editor basics EDITOR-01..09: real form, options, durable drafts.
import assert from 'node:assert/strict';
import {executeCase} from '../helpers.mjs';
import {observe,evidence,step,editor,questionFixture,questionTitle} from './core-support.mjs';
import {qaFixture,qaTitle} from './p0-support.mjs';
import {integrity} from './system-support.mjs';
import {openPublished,optionRows,saveDraft,reopenDraft,getDraft,getPublished,ensureField} from './m2-support.mjs';
const id=process.argv[2],out=process.argv[3];
const eligible=Array.from({length:9},(_,i)=>'EDITOR-'+String(i+1).padStart(2,'0'));
if(!eligible.includes(id)||!out)throw Error('UNKNOWN_EDITOR_BASIC_CASE: '+id);
const questions=new Set(['EDITOR-02','EDITOR-03','EDITOR-04','EDITOR-05','EDITOR-06','EDITOR-07']);
const fixtureSetup=questions.has(id)?questionFixture:id==='EDITOR-08'?qaFixture:undefined;
await executeCase(id,out,async ctx=>{
  await observe(ctx);
  const title=questions.has(id)?questionTitle:id==='EDITOR-08'?qaTitle:'B2 保持发布和历史';
  let p=await openPublished(ctx,title),reboot=null;
  const card=questions.has(id)?ctx.fixture.question:id==='EDITOR-08'?ctx.fixture.qa:ctx.fixture.card;
  const published=await getPublished(ctx,card);
  if(id==='EDITOR-01'){
    const input=p.getByTestId('draft-title');
    await input.click();await input.press('Control+A');await input.press('Backspace');
    assert.equal(await input.inputValue(),'');
    await input.fill('EDITOR-01 新标题｜中文空格');
    const d=await saveDraft(ctx,'EDITOR-01 新标题｜中文空格','body','不可意外修改的已发布正文');
    assert.equal(d.cardId,card.cardId);
    reboot=await reopenDraft(ctx,d.title,{reboot:true});p=ctx.session.page;
    assert.equal(await p.getByTestId('draft-title').inputValue(),d.title);
  }else if(id==='EDITOR-02'){
    const content='中文 English 123，。！？\n\n第二段（含双空格）x  y\n第三段 '+('长文字ABC'.repeat(300));
    await editor(ctx,'stem').fill(content);
    const d=await saveDraft(ctx,title,'stem','第三段 长文字');
    assert.ok(d.payload.fields.stem.includes('第二段（含双空格）'));
    assert.ok(d.payload.fields.stem.includes('长文字ABC'.repeat(260)));
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.ok((await editor(ctx,'stem').innerText()).includes('第三段 长文字'));
    assert.equal((await getDraft(ctx,card)).payload.fields.stem,d.payload.fields.stem);
  }else if(id==='EDITOR-03'){
    await p.getByRole('button',{name:'添加选项',exact:true}).click();
    assert.equal(await optionRows(ctx).count(),3);
    await optionRows(ctx).nth(2).locator('.ProseMirror[contenteditable=true]').fill('第三个选项');
    await p.getByRole('radio',{name:'正确项 1'}).check();
    const initial=await saveDraft(ctx,title,'stem','合成题干');
    const chosen=initial.payload.fields.correctOptionId;
    await p.getByRole('button',{name:'下移选项 1',exact:true}).click();
    const moved=await saveDraft(ctx,title,'stem','合成题干');
    assert.equal(moved.payload.fields.options[1].optionId,chosen);
    assert.equal(moved.payload.fields.correctOptionId,chosen);
    await p.getByRole('button',{name:'删除选项 3',exact:true}).click();
    const d=await saveDraft(ctx,title,'stem','合成题干');
    assert.equal(d.payload.fields.options.length,2);
    assert.equal(d.payload.fields.options[1].optionId,chosen);
    assert.deepEqual(d.payload.fields.options.map(o=>o.position),[0,1]);
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.equal(await optionRows(ctx).count(),2);
    assert.equal(await p.getByRole('radio',{name:'正确项 2'}).isChecked(),true);
  }else if(id==='EDITOR-04'){
    await p.getByRole('radio',{name:'正确项 1'}).check();
    const before={payload:published.payload}; // Selecting the already-correct radio is a no-op, not a new draft.
    await p.getByRole('button',{name:'删除选项 1',exact:true}).click();
    const d=await saveDraft(ctx,title,'stem','合成题干');
    assert.equal(d.payload.fields.correctOptionId,null);
    assert.ok(!d.payload.fields.options.some(x=>x.optionId===before.payload.fields.correctOptionId));
    assert.equal(await p.locator('input[name="correct-option"]:checked').count(),0);
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.equal((await getDraft(ctx,card)).payload.fields.correctOptionId,null);
  }else if(id==='EDITOR-05'){
    const before=await getDraft(ctx,card);
    const original=(await optionRows(ctx).allInnerTexts());
    await p.getByRole('button',{name:'批量输入选项',exact:true}).click();
    const dialog=p.getByRole('dialog',{name:'批量输入选项'});
    await dialog.getByRole('textbox',{name:'批量选项正文'}).fill('废弃一\n废弃二\n废弃三');
    await dialog.getByRole('button',{name:'取消',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    assert.deepEqual(await optionRows(ctx).allInnerTexts(),original);
    assert.equal(await p.getByRole('radio',{name:'正确项 1'}).isChecked(),true);
    assert.deepEqual(await getDraft(ctx,card),before);
  }else if(id==='EDITOR-06'){
    await p.getByRole('button',{name:'批量输入选项',exact:true}).click();
    const dialog=p.getByRole('dialog',{name:'批量输入选项'});
    await dialog.getByRole('textbox',{name:'批量选项正文'}).fill('替换一\n替换二\n替换三');
    await dialog.getByRole('button',{name:'确认替换选项',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    const d=await saveDraft(ctx,title,'stem','合成题干');
    assert.deepEqual(d.payload.fields.options.map(x=>x.markdown.trim()),['替换一','替换二','替换三']);
    assert.equal(d.payload.fields.correctOptionId,null);
    assert.equal(new Set(d.payload.fields.options.map(x=>x.optionId)).size,3);
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.equal(await optionRows(ctx).count(),3);
    assert.deepEqual((await getDraft(ctx,card)).payload.fields.options,d.payload.fields.options);
    assert.deepEqual((await optionRows(ctx).locator('.ProseMirror').allInnerTexts()).map(x=>x.trim()),['替换一','替换二','替换三']);
    assert.equal(await p.locator('input[name="correct-option"]:checked').count(),0);
  }else if(id==='EDITOR-07'){
    const values={stem:'EDITOR-07 题干',material:'EDITOR-07 公共材料',
      analysis:'EDITOR-07 解析',initialThought:'EDITOR-07 当时思路'};
    for(const [key,value] of Object.entries(values))await (await ensureField(ctx,key)).fill(value);
    await p.getByRole('textbox',{name:'题目来源'}).fill('EDITOR-07 来源');
    const d=await saveDraft(ctx,title,'stem',values.stem);
    for(const [key,value] of Object.entries(values))assert.ok(d.payload.fields[key].includes(value),key);
    assert.equal(d.payload.fields.source,'EDITOR-07 来源');
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    for(const [key,value] of Object.entries(values))assert.ok((await (await ensureField(ctx,key)).innerText()).includes(value),key);
  }else if(id==='EDITOR-08'){
    const values={front:'EDITOR-08 问题',back:'EDITOR-08 答案',supplement:'EDITOR-08 补充'};
    for(const [key,value] of Object.entries(values))await (await ensureField(ctx,key)).fill(value);
    const d=await saveDraft(ctx,title,'front',values.front);
    assert.equal(d.payload.mode,'qa');
    for(const [key,value] of Object.entries(values))assert.ok(d.payload.fields[key].includes(value),key);
    assert.equal(Object.hasOwn(d.payload.fields,'stem'),false);
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    for(const [key,value] of Object.entries(values))assert.ok((await (await ensureField(ctx,key)).innerText()).includes(value),key);
  }else if(id==='EDITOR-09'){
    const content='EDITOR-09 正文\n\n- 列表一\n- 列表二\n\n**重点** 与 inline code';
    await editor(ctx,'body').fill(content);
    const d=await saveDraft(ctx,title,'body','EDITOR-09 正文');
    assert.ok(d.payload.fields.body.includes('列表一')&&d.payload.fields.body.includes('重点'));
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.equal((await getDraft(ctx,card)).payload.fields.body,d.payload.fields.body);
    assert.ok((await editor(ctx,'body').innerText()).includes('列表一'));
  }
  assert.deepEqual(await getPublished(ctx,card),published);
  step(ctx,'EDITOR '+id+' real GUI fields/options, visible save feedback, guarded published content and persistent readback');
  integrity(ctx);
  return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureSetup});
