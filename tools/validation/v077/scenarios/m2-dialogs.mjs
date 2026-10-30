// T2-M2 EDITOR-20/21: strict responsive long-form dialog usability and real draft semantics.
import assert from 'node:assert/strict';
import {copyCardContent} from '../../../../shared/cards/clipboard.ts';
import {executeCase} from '../helpers.mjs';
import {observe,evidence,step,editor} from './core-support.mjs';
import {integrity} from './system-support.mjs';
import {openPublished,openTransfer,saveDraft,writeImage,paste,checkImages,copyCard,clipText,
  parseTransfer,confirmTransfer,cancelTransfer,geometry,getDraft,getPublished,reopenDraft} from './m2-support.mjs';

const id=process.argv[2],out=process.argv[3];
if(!['EDITOR-20','EDITOR-21'].includes(id)||!out)throw Error('UNKNOWN_M2_DIALOG_CASE');
const sizes=[{width:1500,height:900},{width:1366,height:768},{width:900,height:760}];
await executeCase(id,out,async ctx=>{
  await observe(ctx);
  let p=await openPublished(ctx);
  const card=ctx.fixture.card,title='B2 保持发布和历史';
  const published=await getPublished(ctx,card),issues=[];
  const snapshots=[];
  if(id==='EDITOR-20'){
    const before=await getDraft(ctx,card);
    for(const size of sizes){
      await p.setViewportSize(size);
      const d=await openTransfer(ctx,'prompt');
      const preview=d.getByRole('textbox',{name:'Prompt预览',exact:true});
      await d.getByRole('checkbox',{name:'当前卡片集完整知识点候选目录'}).check();
      assert.ok((await preview.inputValue()).includes('生命周期甲'));
      await d.getByRole('checkbox',{name:'当前卡片集完整知识点候选目录'}).uncheck();
      assert.ok(!(await preview.inputValue()).includes('生命周期甲'),'Uncheck should withdraw opt-in data');
      if((await d.locator('details').getAttribute('open'))===null)await d.locator('details summary').click();
      const template=d.getByRole('textbox',{name:'Prompt模板'});
      const longTemplate=('第'+size.width+'宽：人工阅读行与滚动验证。\n').repeat(520);
      await template.fill('仅整理用户给定内容，不编造证据。\n'+longTemplate+'\n{{card}}\n{{catalog}}\n{{confirmed}}');
      const text=await preview.inputValue();
      assert.ok(text.length>10000,'Long prompt fixture did not render');
      assert.ok((await preview.evaluate(el=>el.scrollHeight))>(await preview.evaluate(el=>el.clientHeight)),
        'Long prompt textarea must be vertically scrollable');
      await preview.hover();await p.mouse.wheel(0,740);
      await p.waitForFunction(el=>el.scrollTop>0,await preview.elementHandle(),{timeout:4000});
      const scrolled=await preview.evaluate(el=>el.scrollTop);
      assert.ok(scrolled>0,'User mouse wheel must scroll long prompt, not swallow it');
      try{
        const g=await geometry(d,p,{minimum:0.55});
        snapshots.push({size,geometry:g,promptChars:text.length,scrolled});
      }catch(e){issues.push(size.width+':'+String(e));snapshots.push({size,promptChars:text.length,scrolled,geometryError:String(e)});}
      await d.getByRole('button',{name:'复制到剪贴板',exact:true}).scrollIntoViewIfNeeded();
      await d.getByRole('button',{name:'取消',exact:true}).scrollIntoViewIfNeeded();
      assert.equal(await d.getByRole('button',{name:'取消',exact:true}).isEnabled(),true);
      if(size.width===900){
        await d.getByRole('button',{name:'复制到剪贴板',exact:true}).click();
        await d.waitFor({state:'hidden'});
        assert.equal(await clipText(ctx),text);
      }else await cancelTransfer(d);
      assert.deepEqual(await getDraft(ctx,card),before,'Prompt dialog cannot write original draft');
      assert.deepEqual(await getPublished(ctx,card),published);
    }
  }else{
    const baseline='EDITOR-21 粘贴预览完整图片与长文 '+('连续结构化内容。'.repeat(750));
    await editor(ctx,'body').fill(baseline);
    await writeImage(ctx,'image/png');await paste(ctx,'body');
    await checkImages(ctx,'body',1);
    const d=await saveDraft(ctx,title,'body','EDITOR-21 粘贴预览完整图片与长文');
    assert.equal(d.mediaRefs.length,1,'Image-bearing source draft required');
    const nativeStructured=await copyCard(ctx);
    assert.ok(nativeStructured.includes('ganksoft.card-clipboard'));
    // The text parser accepts the documented v1 marker. Native image archives use
    // v2 and the separate 'from clipboard' preview; they are not v1 text fixtures.
    const structured=copyCardContent({title:d.title,payload:d.payload,mediaRefs:d.mediaRefs});
    assert.ok(structured.length>5000&&structured.includes('mediaRefs'));
    for(const size of sizes){
      await p.setViewportSize(size);
      const modal=await openTransfer(ctx,'paste');
      const parsed=await parseTransfer(ctx,modal,structured);
      assert.ok(parsed.includes('EDITOR-21')&&parsed.includes('body'));
      assert.ok((await modal.innerText()).includes('图片为本地资源引用'),
        'Image references require visible local-asset warning');
      const input=modal.getByRole('textbox',{name:'结构化卡片内容',exact:true});
      assert.equal(await input.inputValue(),structured);
      assert.ok((await input.evaluate(el=>el.scrollHeight))>(await input.evaluate(el=>el.clientHeight)),
        'Long structured input must be scrollable');
      await input.hover();await p.mouse.wheel(0,760);
      await p.waitForFunction(el=>el.scrollTop>0,await input.elementHandle(),{timeout:4000});
      const scrolled=await input.evaluate(el=>el.scrollTop);
      assert.ok(scrolled>0,'User wheel should scroll long structured payload');
      try{
        const g=await geometry(modal,p,{minimum:0.55});
        assert.ok(g.textareas[0].client>=160,'Structured-input textarea too short for human review');
        assert.ok(g.textareas[0].width>=g.width*0.63,'Structured input area is not dominant content');
        snapshots.push({size,geometry:g,payloadChars:structured.length,scrolled});
      }catch(e){issues.push(size.width+':'+String(e));snapshots.push({size,payloadChars:structured.length,scrolled,geometryError:String(e)});}
      await modal.getByRole('button',{name:'解析预览',exact:true}).scrollIntoViewIfNeeded();
      await modal.getByRole('button',{name:'确认写入草稿',exact:true}).scrollIntoViewIfNeeded();
      if(size.width!==900){
        await cancelTransfer(modal);
        assert.deepEqual(await getDraft(ctx,card),d,'Cancel may not modify text/media or revision');
      }else{
        await confirmTransfer(ctx,modal);
        const result=await getDraft(ctx,card);
        assert.deepEqual(result.mediaRefs,d.mediaRefs);
        assert.equal(result.payload.fields.body,d.payload.fields.body);
      }
    }
    const reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.equal((await getDraft(ctx,card)).payload.fields.body,d.payload.fields.body);
    assert.deepEqual((await getDraft(ctx,card)).mediaRefs,d.mediaRefs);
    await checkImages(ctx,'body');
    ctx.observations.checks.reboot=reboot;
  }
  ctx.observations.checks.dialogWidths=snapshots;
  assert.deepEqual(issues,[],
    'Long-text dialogs too narrow/overflow at user-requested sizes; do not silently waive GH-20');
  assert.deepEqual(await getPublished(ctx,card),published);
  step(ctx,'Three responsive widths: actual scroll/copy/cancel/confirm, image preview and original draft protection');
  integrity(ctx);
  return evidence(ctx);
});
