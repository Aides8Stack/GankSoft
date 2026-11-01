// T2-M2 rich editor and content transfers EDITOR-10..19.
import assert from 'node:assert/strict';
import {executeCase,enterCards,exitEditorToList} from '../helpers.mjs';
import {observe,evidence,step,editor,questionFixture,questionTitle} from './core-support.mjs';
import {integrity} from './system-support.mjs';
import {writeRich,writeText,clipText,paste,openPublished,saveDraft,reopenDraft,getDraft,
  getPublished,openTransfer,copyCard,parseTransfer,confirmTransfer,cancelTransfer,selectWordViaKeys,ensureField} from './m2-support.mjs';
const id=process.argv[2],out=process.argv[3];
const eligible=Array.from({length:10},(_,i)=>'EDITOR-'+String(i+10).padStart(2,'0'));
if(!eligible.includes(id)||!out)throw Error('UNKNOWN_EDITOR_RICH_CASE: '+id);
const questionCases=new Set(['EDITOR-15']);
const fixtureSetup=questionCases.has(id)?questionFixture:undefined;
const shortText='EDITOR-14 初始';
async function assertSamePublished(ctx,before,card){assert.deepEqual(await getPublished(ctx,card),before);}
async function pasteRichMarkdown(ctx,which,value){
  await writeRich(ctx,{plain:value,html:'<html><body><p>GankSoft rich clipboard test</p></body></html>'});
  await paste(ctx,which);
}
async function richTable(ctx,which='body'){
  const markdown='| 列甲 | 列乙 |\n| --- | --- |\n| 单元甲 | 单元乙 |';
  await pasteRichMarkdown(ctx,which,markdown);
  const table=editor(ctx,which).locator('table.children');
  await table.waitFor();
  assert.equal(await table.locator('tr').count(),2,'Actual rendered table required');
  return table;
}
await executeCase(id,out,async ctx=>{
  await observe(ctx);
  const card=questionCases.has(id)?ctx.fixture.question:ctx.fixture.card;
  const title=questionCases.has(id)?questionTitle:'B2 保持发布和历史';
  let p=await openPublished(ctx,title),reboot=null;
  const published=await getPublished(ctx,card);
  if(id==='EDITOR-10'){
    const a=editor(ctx,'body');
    await a.fill('格式基准');
    await a.press('Control+Home');
    await a.press('Control+A');
    await a.press('Control+B');
    await a.press('Control+I');
    await a.press('ArrowRight');
    await a.press('End');await a.press('Enter');
    await p.keyboard.type('# 一级标题');
    await a.press('Enter');
    await p.keyboard.type('- 列表条目');
    await a.press('Enter');await a.press('Enter');
    await p.keyboard.type('> 引用段落');
    await a.press('Enter');await a.press('Enter');
    await p.keyboard.type(String.fromCharCode(96,96,96)+'\ncode one\n'+String.fromCharCode(96,96,96));
    const d=await saveDraft(ctx,title,'body','格式基准');
    const m=d.payload.fields.body;
    assert.ok(m.includes('格式基准')&&m.includes('标题')&&m.includes('列表条目')&&m.includes('引用段落')&&m.includes('code one'));
    assert.ok(await a.locator('strong').count()>=1,'Bold GUI mark must be visible');
    assert.ok(await a.locator('em').count()>=1,'Italic GUI mark must be visible');
    assert.ok(await a.locator('h1,h2').count()>=1,'Markdown heading shortcut must create visible heading');
    assert.ok(await a.locator('ul,ol').count()>=1,'Markdown list input rule must create list');
    assert.ok(await a.locator('blockquote').count()>=1,'Markdown quote input rule must create quote');
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.equal((await getDraft(ctx,card)).payload.fields.body,m);
  }else if(id==='EDITOR-11'){
    const a=editor(ctx,'body');
    await a.fill('EDITOR-11 公式与表格');
    await pasteRichMarkdown(ctx,'body','\n\n$$\nE=mc^2\n$$\n\n| 列甲 | 列乙 |\n| --- | --- |\n| 单元甲 | 单元乙 |');
    await a.locator('table.children').waitFor();
    await a.locator('p').filter({hasText:'EDITOR-11 公式与表格'}).first().click();
    await p.keyboard.press('Home');await p.keyboard.press('Shift+End');
    assert.ok((await p.evaluate(()=>window.getSelection()?.toString()??'')).includes('EDITOR-11'),'Select actual nonempty text before coloring');
    const color=p.locator('[data-editor-field="body"] input[type="color"][aria-label="文字颜色"]');
    await color.fill('#336699');
    // fill() already emits input; a second event toggles the mark off.
    const d=await saveDraft(ctx,title,'body','E=mc^2');
    assert.ok(d.payload.fields.body.includes('E=mc^2'));
    assert.ok(d.payload.fields.body.includes('|')&&d.payload.fields.body.includes('列甲'));
    assert.match(d.payload.fields.body,/data-gank-color|#336699/);
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.equal((await getDraft(ctx,card)).payload.fields.body,d.payload.fields.body);
    assert.ok(await editor(ctx,'body').locator('table').count()>0);
  }else if(id==='EDITOR-12'){
    await editor(ctx,'body').fill('EDITOR-12 表格事务');
    let table=await richTable(ctx);
    const first=table.locator('td,th').first();
    await first.click();await p.keyboard.type('新值');
    await first.press('Tab');
    const cell=table.locator('td,th').nth(1);
    await cell.click();await p.keyboard.type('第二格');
    await cell.press('Tab');
    // Crepe exposes hover handles, not a text-based right-click menu.
    const block=editor(ctx,'body').locator('.milkdown-table-block');
    async function hoverBoundary(cell,edge){
      await p.getByTestId('draft-title').click(); // Blur selected table text to dismiss floating toolbar through normal focus.
      await cell.scrollIntoViewIfNeeded();const r=await cell.boundingBox();assert.ok(r);
      await p.mouse.move(edge==='right'?r.x+r.width-2:r.x+r.width/2,
        edge==='bottom'?r.y+r.height-2:r.y+r.height/2);
    }
    await hoverBoundary(table.locator('tr').last().locator('td').first(),'bottom');
    await block.locator('[data-role="x-line-drag-handle"][data-show="true"] button').click();
    assert.equal(await table.locator('tr').count(),3,'GUI row insertion must change table');
    await hoverBoundary(table.locator('tr').nth(1).locator('td').last(),'right');
    await block.locator('[data-role="y-line-drag-handle"][data-show="true"] button').click();
    await p.waitForFunction(()=>document.querySelector('[data-editor-field=body] table.children tr')?.children.length===3);
    assert.equal(await table.locator('tr').first().locator('th,td').count(),3,'GUI column insertion must change table');
    const d=await saveDraft(ctx,title,'body','EDITOR-12 表格事务');
    assert.ok(d.payload.fields.body.includes('新值')&&d.payload.fields.body.includes('第二格'));
    await table.locator('tr').last().locator('td').first().hover();
    await block.locator('[data-role="row-drag-handle"][data-show="true"]').click();
    await block.locator('[data-role="row-drag-handle"] .button-group[data-show="true"] button').click();
    assert.equal(await table.locator('tr').count(),2,'Delete only inserted row');
    await table.locator('tr').first().locator('th').last().hover();
    await block.locator('[data-role="col-drag-handle"][data-show="true"]').click();
    await block.locator('[data-role="col-drag-handle"] .button-group[data-show="true"] button').last().click();
    assert.equal(await table.locator('tr').first().locator('th,td').count(),2,'Delete only inserted column');
    await table.locator('td,th').first().click();
    await p.keyboard.press('Control+Z');
    assert.equal(await table.locator('tr').first().locator('th,td').count(),3,'Undo column deletion');
    await p.keyboard.press('Control+Shift+Z');
    assert.equal(await table.locator('tr').first().locator('th,td').count(),2,'Redo column deletion');
    const final=await saveDraft(ctx,title,'body','EDITOR-12 表格事务');
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.equal((await getDraft(ctx,card)).payload.fields.body,final.payload.fields.body);
    assert.ok(await editor(ctx,'body').locator('table').count()>0);
  }else if(id==='EDITOR-13'){
    const a=editor(ctx,'body');
    await a.fill('彩色段落\n第二段不应变色');
    await selectWordViaKeys(a,0,4);
    const input=p.locator('[data-editor-field="body"] input[type="color"][aria-label="文字颜色"]');
    await input.fill('#336699'); // One native input event, not a double toggle.
    assert.ok((await a.innerText()).includes('彩色段落'));
    const d=await saveDraft(ctx,title,'body','第二段不应变色');
    assert.match(d.payload.fields.body,/#336699/);
    assert.ok(d.payload.fields.body.includes('第二段不应变色'));
    const second=d.payload.fields.body.split('第二段不应变色')[0];
    assert.ok(second.includes('#336699'));
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    const b=editor(ctx,'body');
    assert.ok(await b.locator('span[data-gank-color="#336699"]').count()>=1);
    assert.ok((await b.locator('p').last().innerText()).includes('第二段不应变色'));
    const marked=await b.locator('span[data-gank-color="#336699"]').allTextContents();
    assert.ok(marked.length>0,'Selected text color mark vanished');
    assert.ok(marked.every(s=>!s.includes('第二段不应变色')),'Color leaked into unselected second paragraph');
    assert.equal((await getDraft(ctx,card)).payload.fields.body,d.payload.fields.body);
  }else if(id==='EDITOR-14'){
    const a=editor(ctx,'body');
    await a.fill(shortText);
    await a.press('End');await p.keyboard.type(' 追加');
    assert.ok((await a.innerText()).includes('追加'));
    await a.press('Control+Z');
    assert.ok(!(await a.innerText()).includes('追加'),'Ctrl+Z must undo latest input');
    await a.press('Control+Shift+Z');
    assert.ok((await a.innerText()).includes('追加'),'Ctrl+Shift+Z must redo');
    const d=await saveDraft(ctx,title,'body',shortText+' 追加');
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.equal((await getDraft(ctx,card)).payload.fields.body,d.payload.fields.body);
  }else if(id==='EDITOR-15'){
    const fields={stem:'EDITOR-15 题干',material:'EDITOR-15 材料',analysis:'EDITOR-15 解析',initialThought:'EDITOR-15 思路'};
    for(let i=0;i<4;i++){
      const [f,value]=Object.entries(fields)[i];
      await (await ensureField(ctx,f)).click();await editor(ctx,f).fill(value);
      await editor(ctx, f==='stem'?'analysis':'stem').click();
    }
    const d=await saveDraft(ctx,title,'stem','EDITOR-15 题干');
    for(const [key,value] of Object.entries(fields))assert.ok(d.payload.fields[key].includes(value),key);
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    for(const [key,value] of Object.entries(fields))assert.ok((await (await ensureField(ctx,key)).innerText()).includes(value),key);
  }else if(id==='EDITOR-16'){
    const body='EDITOR-16 快速往返不丢草稿';
    await editor(ctx,'body').fill(body);
    await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:'学习总览',exact:true}).click();
    await p.getByRole('heading',{name:'学习总览'}).waitFor();
    await enterCards(ctx);
    await p.getByRole('button',{name:'编辑 '+title,exact:true}).click();
    await editor(ctx,'body').waitFor();
    const d=await getDraft(ctx,card);
    assert.ok(d.payload.fields.body.includes(body),'Navigation must flush edited content');
    await p.getByRole('button',{name:/返回上一页/}).click();
    await enterCards(ctx);
    await p.getByRole('button',{name:'编辑 '+title,exact:true}).click();
    assert.ok((await editor(ctx,'body').innerText()).includes(body));
    const d2=await saveDraft(ctx,title,'body',body);
    assert.equal(d2.cardId,card.cardId);
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.equal((await getDraft(ctx,card)).payload.fields.body,d2.payload.fields.body);
    assert.equal(await p.locator('.card-draft-form').count(),1,'No zombie editor instance should remain');
  }else if(id==='EDITOR-17'){
    const before=await getDraft(ctx,card);
    const clipboard=await copyCard(ctx);
    const afterCopy=await getDraft(ctx,card);
    const dialog=await openTransfer(ctx,'paste');
    const preview=await parseTransfer(ctx,dialog,clipboard);
    assert.ok(preview.includes('不可意外修改的已发布正文'));
    assert.match(await dialog.innerText(),/将覆盖/,'Preview must disclose overwritten fields even when unchanged');
    assert.deepEqual(await getDraft(ctx,card),afterCopy);
    await cancelTransfer(dialog);
    assert.deepEqual(await getDraft(ctx,card),afterCopy);
    if(before)assert.equal(afterCopy.cardId,before.cardId);
    step(ctx,'GUI card copy and structured paste preview canceled without applying overwrite');
  }else if(id==='EDITOR-18'){
    const clipboard=await copyCard(ctx);
    await editor(ctx,'body').fill('EDITOR-18 已修改且准备被预览覆盖');
    const modified=await saveDraft(ctx,title,'body','EDITOR-18 已修改');
    const dialog=await openTransfer(ctx,'paste');
    const preview=await parseTransfer(ctx,dialog,clipboard);
    assert.ok(preview.includes('不可意外修改的已发布正文'));
    assert.ok((await dialog.innerText()).includes('body'));
    await confirmTransfer(ctx,dialog);
    const changed=await getDraft(ctx,card);
    assert.notEqual(changed.revision,modified.revision);
    assert.equal(changed.payload.fields.body.trim(),'不可意外修改的已发布正文');
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.equal((await getDraft(ctx,card)).payload.fields.body,changed.payload.fields.body);
  }else if(id==='EDITOR-19'){
    const d=await openTransfer(ctx,'prompt');
    const output=d.getByRole('textbox',{name:'Prompt预览',exact:true});
    const initial=await output.inputValue();
    assert.ok(initial.includes('ganksoft.card-clipboard'));
    assert.ok(!initial.includes('生命周期甲'),'Knowledge list must be opt-in by default');
    await d.getByRole('checkbox',{name:'当前卡片集完整知识点候选目录'}).check();
    const optIn=await output.inputValue();
    assert.ok(optIn.includes('生命周期甲'),'Opt-in catalog should be included for current deck');
    await d.getByRole('checkbox',{name:'本卡已确认知识点及父级路径'}).check();
    const both=await output.inputValue();
    assert.ok(both.includes('已人工确认的本卡知识点关联'));
    await d.locator('details summary').click();
    await d.getByRole('textbox',{name:'Prompt模板'}).fill('任务说明：仅使用用户提供信息\n{{card}}\n{{catalog}}\n{{confirmed}}');
    const customized=await output.inputValue();
    assert.ok(customized.startsWith('任务说明'));
    await d.getByRole('button',{name:'复制到剪贴板',exact:true}).click();
    await d.waitFor({state:'hidden'});
    assert.equal(await clipText(ctx),customized);
    step(ctx,'GUI prompt template and knowledge opt-in assembled an auditable exact clipboard payload');
  }
  await assertSamePublished(ctx,published,card);
  step(ctx,'EDITOR '+id+' real GUI rich editor/transfer controls and persisted public-version guard');
  integrity(ctx);
  return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureSetup});
