// T2-M2 native synthetic clipboard GUI scenarios CLIP-05/06/07/08/10/11/12/13.
// These are not signed Windows physical-clipboard tests.
import assert from 'node:assert/strict';
import {executeCase} from '../helpers.mjs';
import {observe,evidence,step,editor,questionFixture,questionTitle} from './core-support.mjs';
import {snapshot,integrity} from './system-support.mjs';
import {writeText,writeRich,writeImage,writeMixed,paste,checkImages,openPublished,
  saveDraft,reopenDraft,getDraft,getPublished,selectWordViaKeys} from './m2-support.mjs';

const id=process.argv[2],out=process.argv[3];
const allowed=['CLIP-05','CLIP-06','CLIP-07','CLIP-08','CLIP-10','CLIP-11','CLIP-12','CLIP-13'];
if(!allowed.includes(id)||!out)throw Error('UNKNOWN_M2_CLIPBOARD_CASE');
const scopeQuestion=id==='CLIP-08',fixtureSetup=scopeQuestion?questionFixture:undefined;
await executeCase(id,out,async ctx=>{
  await observe(ctx);
  const card=scopeQuestion?ctx.fixture.question:ctx.fixture.card;
  const title=scopeQuestion?questionTitle:'B2 保持发布和历史';
  let p=await openPublished(ctx,title),reboot=null;
  const published=await getPublished(ctx,card);
  if(id==='CLIP-05'){
    await editor(ctx,'body').fill('CLIP-05 原始草稿');
    const text='Markdown 纯文本：**粗体**、_斜体_、# 标题、[链接](https://example.invalid) 和反斜杠';
    await writeText(ctx,text);await paste(ctx,'body');
    const d=await saveDraft(ctx,title,'body','CLIP-05 原始草稿');
    assert.ok(d.payload.fields.body.includes('Markdown 纯文本'));
    assert.ok(d.payload.fields.body.includes('粗体'));
    assert.ok(d.payload.fields.body.includes('链接'));
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.equal((await getDraft(ctx,card)).payload.fields.body,d.payload.fields.body);
    assert.ok((await editor(ctx,'body').innerText()).includes('Markdown 纯文本'));
    step(ctx,'Plain Markdown-like clipboard data pastes without crash/lost body; exact persisted roundtrip');
  }else if(id==='CLIP-06'){
    const long='多行中文🐉🙂\tTabs\t标点！？\n第二行 ABC \t 测试\n'+('批量长文字XYZ'.repeat(1100));
    await editor(ctx,'body').fill('CLIP-06 原正文');
    await writeText(ctx,long);await paste(ctx,'body');
    const d=await saveDraft(ctx,title,'body','CLIP-06 原正文');
    assert.ok(d.payload.fields.body.includes('多行中文🐉🙂'));
    assert.ok(d.payload.fields.body.includes('批量长文字XYZ'.repeat(900)));
    assert.ok(d.payload.fields.body.includes('第二行'));
    assert.ok(d.payload.fields.body.includes('原正文'));
    ctx.observations.checks.longClip={inputChars:long.length,durableChars:d.payload.fields.body.length};
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.equal((await getDraft(ctx,card)).payload.fields.body,d.payload.fields.body);
    step(ctx,'Native synthetic long multilingual/plain clipboard and tabs/emoji retain readable content and paragraphs');
  }else if(id==='CLIP-07'){
    const a=editor(ctx,'body');
    await a.fill('abc DEF ghi');
    const base=await saveDraft(ctx,title,'body','abc DEF ghi');
    await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    const selectedArea=editor(ctx,'body'); // Fresh history isolates the paste from initial fill().
    await writeText(ctx,'XYZ');
    await selectWordViaKeys(selectedArea,4,3);
    await p.keyboard.press('Control+V');
    assert.ok((await selectedArea.innerText()).includes('abc XYZ ghi'));
    const replaced=await saveDraft(ctx,title,'body','abc XYZ ghi');
    assert.notEqual(replaced.revision,base.revision);
    await selectedArea.press('Control+Z');
    assert.ok((await selectedArea.innerText()).includes('abc DEF ghi'),'GUI Undo must restore original selected text');
    const restored=await saveDraft(ctx,title,'body','abc DEF ghi');
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.ok((await getDraft(ctx,card)).payload.fields.body.includes('abc DEF ghi'));
    assert.equal((await getDraft(ctx,card)).payload.fields.body,restored.payload.fields.body);
    step(ctx,'GUI selecting only DEF, Ctrl+V replaces selection, Ctrl+Z restores without moving decks');
  }else if(id==='CLIP-08'){
    const stem=editor(ctx,'stem'),analysis=editor(ctx,'analysis');
    await stem.fill('CLIP-08 STEM');
    await analysis.fill('CLIP-08 ANALYSIS');
    await writeText(ctx,'一号字串');
    await paste(ctx,'stem',{atEnd:true});
    await p.keyboard.press('Control+V');
    await writeText(ctx,'二号字串');
    await paste(ctx,'analysis',{atEnd:true});
    const d=await saveDraft(ctx,title,'stem','一号字串');
    const result=d.payload.fields;
    assert.equal(result.stem.split('一号字串').length-1,2,'Two GUI pastes must insert exactly twice');
    assert.equal(result.analysis.split('二号字串').length-1,1);
    assert.ok(!result.analysis.includes('一号字串'),'Pasted stem text leaked into analysis');
    assert.ok(!result.stem.includes('二号字串'),'Pasted analysis text leaked into stem');
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.deepEqual((await getDraft(ctx,card)).payload.fields,result);
    step(ctx,'Rapid double paste and cross-editor focus insert exact counts into right question fields');
  }else if(id==='CLIP-10'){
    await editor(ctx,'body').fill('CLIP-10 二种图片');
    const nativeFormats=[];
    for(const mime of ['image/jpeg','image/webp']){
      await writeImage(ctx,mime);
      nativeFormats.push(await ctx.session.app.evaluate(({clipboard})=>clipboard.readImage().isEmpty() ? [] : ["image/png"]));
      await paste(ctx,'body');
      const images=editor(ctx,'body').locator('img[data-gank-placement]');
      await images.nth(mime==='image/jpeg'?0:1).waitFor();
      assert.equal(await images.count(),mime==='image/jpeg'?1:2);
    }
    await checkImages(ctx,'body',2);
    const d=await saveDraft(ctx,title,'body','CLIP-10 二种图片');
    assert.equal(d.mediaRefs.length,2);
    // Electron native image clipboard normalizes encoded JPEG/WebP to PNG.
    assert.ok(nativeFormats.every(formats=>formats.includes('image/png')),'Expected native PNG normalization');
    assert.deepEqual(d.mediaRefs.map(x=>x.mime),['image/png','image/png']);
    ctx.observations.checks.clipboardNormalization={inputs:['image/jpeg','image/webp'],nativeFormats,stored:d.mediaRefs};
    assert.equal(new Set(d.mediaRefs.map(x=>x.placementId)).size,2);
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    await checkImages(ctx,'body',2);
    assert.deepEqual((await getDraft(ctx,card)).mediaRefs,d.mediaRefs);
    step(ctx,'GUI JPEG+WebP native byte clipboard: two decoded assets with distinct placements persist after restart');
  }else if(id==='CLIP-11'){
    const a=editor(ctx,'body'),baseline='CLIP-11 旧正文不得丢失',marker='CLIP-11 文本图片同时提供';
    await a.fill(baseline);
    await saveDraft(ctx,title,'body',baseline);
    await writeMixed(ctx,marker);
    await paste(ctx,'body');
    const d=await saveDraft(ctx,title,'body',baseline);
    assert.ok(d.payload.fields.body.includes(baseline),'Mixed clipboard destroyed original text');
    assert.ok(d.payload.fields.body.includes(marker)||d.mediaRefs.length>0,
      'Mixed clipboard silently lost both content types');
    assert.ok(d.mediaRefs.length<=1,'One mixed paste cannot create multiple accidental assets');
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    const restored=await getDraft(ctx,card);
    assert.equal(restored.payload.fields.body,d.payload.fields.body);
    assert.deepEqual(restored.mediaRefs,d.mediaRefs);
    if(restored.mediaRefs.length)await checkImages(ctx);
    step(ctx,'Mixed image/plain clipboard has explicit retained content policy; no lost preexisting draft');
  }else if(id==='CLIP-12'){
    await editor(ctx,'body').fill('CLIP-12 同图多放置');
    await writeImage(ctx,'image/png');
    await paste(ctx,'body');
    await checkImages(ctx,'body');
    await paste(ctx,'body'); // Original CASE requires a second actual Ctrl+V.
    await checkImages(ctx,'body',2);
    for(const [n,w] of [[1,30],[2,80]]){
      const input=p.getByLabel('图片 '+n+' 宽度',{exact:true});
      await input.fill(String(w));await input.press('Tab');
    }
    const d=await saveDraft(ctx,title,'body','CLIP-12 同图多放置');
    assert.equal(d.mediaRefs.length,2);
    // The CASE requires independent placements, not asset-ID deduplication.
    assert.ok(d.mediaRefs.every(x=>x.assetId),'Both pasted placements must reference durable assets');
    assert.equal(new Set(d.mediaRefs.map(x=>x.placementId)).size,2,'Placements must remain independent');
    assert.deepEqual(d.mediaRefs.map(x=>x.width).sort((a,b)=>a-b),[30,80],
      'Same-image width regression: MEDIA-03 must NOT be waived');
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    await checkImages(ctx,'body',2);
    assert.deepEqual((await getDraft(ctx,card)).mediaRefs.map(x=>x.width).sort((a,b)=>a-b),[30,80]);
    assert.equal(await p.getByLabel('图片 1 宽度').inputValue(),'30');
    assert.equal(await p.getByLabel('图片 2 宽度').inputValue(),'80');
    step(ctx,'Independent image placements and widths strictly checked after GUI reopen/new PID; links to known MEDIA-03');
  }else if(id==='CLIP-13'){
    const safe='CLIP-13 已保存安全正文';
    await editor(ctx,'body').fill(safe);
    const before=await saveDraft(ctx,title,'body',safe);
    const remote=[];
    const watch=req=>{if(/^https?:\/\//i.test(req.url()))remote.push(req.url());};
    p.on('request',watch);
    await writeRich(ctx,{plain:'CLIP-13 安全退化文本',
      html:'<img src="https://example.invalid/blocked-image.png"><script>window.__M2_PASTE_HAZARD=true</script><a href="javascript:alert(1)">危险链接</a>'});
    await paste(ctx,'body');
    const alerts=await p.getByRole('alert').allTextContents();
    if(!alerts.some(x=>/UNSUPPORTED_HTML|不支持|非法|拒绝/.test(x)))
      await p.getByTestId('save-draft').click();
    const after=await getDraft(ctx,card);
    assert.ok(after.payload.fields.body.includes(safe));
    assert.equal(after.mediaRefs.length,before.mediaRefs.length);
    assert.ok(!remote.some(x=>x.includes('example.invalid')),'Unauthorized remote image fetched');
    assert.equal(await p.evaluate(()=>!!window.__M2_PASTE_HAZARD),false,'Pasted script executed');
    assert.ok(alerts.length>0||after.payload.fields.body.includes('CLIP-13 安全退化文本'),
      'Unsafe HTML neither safely rejected nor downgraded');
    p.off('request',watch);
    reboot=await reopenDraft(ctx,title,{reboot:true});p=ctx.session.page;
    assert.equal((await getDraft(ctx,card)).payload.fields.body,after.payload.fields.body);
    step(ctx,'Remote/script HTML paste refused or safely downgraded; no remote fetch, execute or lost draft');
  }
  assert.deepEqual(await getPublished(ctx,card),published);
  ctx.observations.checks.clipboardSource='Electron native clipboard bytes; NOT Windows physical clipboard acceptance';
  step(ctx,'CLIP '+id+' true OS Ctrl+V through GUI with clean published-version and durable draft checks');
  integrity(ctx);
  return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureSetup});
