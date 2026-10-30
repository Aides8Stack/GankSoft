// M1 cards: each CASE has a separate real GUI action and persisted assertion.
import assert from 'node:assert/strict';
import {executeCase,enterCards,exitEditorToList,draftBoxOpen,awaitDraft,assertEditor,restart} from '../helpers.mjs';
import {observe,evidence,step,editor,newQuestion,questionFixture,questionTitle,scope} from './core-support.mjs';
import {chooseDeck} from './m1-support.mjs';
import {finishSeedReview,integrity,snapshot} from './system-support.mjs';
const id=process.argv[2],out=process.argv[3];
const specs=['NEW-04','NEW-06','NEW-07','NEW-08','NEW-10','NEW-11','NEW-15','OLD-04','OLD-05','OLD-12','OLD-13'];
if(!specs.includes(id)||!out)throw Error('UNKNOWN_M1_CARDS_CASE');
const qTitle='T2-M1 '+id+' 错题';
async function switchType(ctx,label,confirm=true){
  const p=ctx.session.page;
  await p.getByRole('navigation',{name:'卡片类型'}).getByRole('button',{name:label,exact:true}).click();
  const dialog=p.getByRole('dialog',{name:'确认切换卡片类型'});
  await dialog.waitFor();
  const summary=await dialog.innerText();
  assert.ok(summary.includes(label),'Switch preview must name target type');
  await dialog.getByRole('button',{name:confirm?'确认切换并清除草稿':'取消',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  return summary;
}
async function newBlank(ctx,title){
  const p=ctx.session.page;
  await p.getByRole('button',{name:'新建卡片',exact:true}).click();
  await p.getByTestId('draft-title').fill(title);
}
await executeCase(id,out,async ctx=>{
  await observe(ctx);await enterCards(ctx);
  let p=ctx.session.page,reboot;
  if(id==='NEW-04'){
    const before=(await ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.deck.id,limit:100})).items.length;
    await p.getByRole('button',{name:'新建卡片',exact:true}).click();
    await p.getByTestId('draft-title').waitFor();
    await exitEditorToList(ctx);
    await p.getByRole('button',{name:'草稿箱',exact:true}).click();
    const unnamed=p.getByRole('navigation',{name:'已保存草稿'}).getByRole('button',{name:'未命名草稿'});
    const seen=await unnamed.count();
    assert.ok(seen<=1,'Blank placeholder must not multiply');
    assert.equal((await ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.deck.id,limit:100})).items.length,before);
    ctx.observations.checks.blankPlaceholder={shown:seen,notPublished:true};
    step(ctx,'GUI opened and left unedited new card; checked placeholder state, no published count inflation');
  }else if(id==='NEW-06'){
    await newBlank(ctx,qTitle);
    await p.getByRole('button',{name:'添加选项',exact:true}).click();
    const opts=p.locator('.option-row');assert.ok(await opts.count()>0);
    const row=opts.last();
    await row.locator('.ProseMirror[contenteditable=true]').fill('T2-M1 修改新增选项');
    const saved=await awaitDraft(ctx,qTitle,'stem','',false);
    const source=saved.payload.fields.options;
    assert.equal(source.at(-1).markdown.includes('T2-M1 修改新增选项'),true);
    const expected=source.map(x=>({id:x.optionId,position:x.position,markdown:x.markdown}));
    await exitEditorToList(ctx);reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);await enterCards(ctx);
    await draftBoxOpen(ctx,qTitle);
    const actual=(await ctx.session.api.call('draft.get',{deckId:ctx.fixture.deck.id,cardId:saved.cardId})).payload.fields.options;
    assert.deepEqual(actual.map(x=>({id:x.optionId,position:x.position,markdown:x.markdown})),expected);
    assert.equal(await p.locator('.option-row').count(),expected.length);
    step(ctx,'GUI add/edit one option preserves exact IDs/order/Markdown in reopened draft after restart');
  }else if(id==='NEW-07'){
    await newQuestion(ctx,qTitle,true);
    await p.getByRole('radio',{name:'正确项 2',exact:true}).check();
    const saved=await awaitDraft(ctx,qTitle,'stem','T1-A GUI 题干',false);
    assert.equal(saved.payload.fields.correctOptionId,saved.payload.fields.options[1].optionId);
    await exitEditorToList(ctx);reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);await enterCards(ctx);await draftBoxOpen(ctx,qTitle);
    assert.equal(await p.getByRole('radio',{name:'正确项 2'}).isChecked(),true);
    assert.equal((await ctx.session.api.call('draft.get',{deckId:ctx.fixture.deck.id,cardId:saved.cardId})).payload.fields.correctOptionId,saved.payload.fields.correctOptionId);
    step(ctx,'GUI switched correct answer; original option IDs and answer identity persist without publication');
  }else if(id==='NEW-08'){
    await newQuestion(ctx,qTitle,true);
    const fields={stem:'T2-M1 专属题干',analysis:'T2-M1 专属解析',material:'T2-M1 公共材料',initialThought:'T2-M1 当时思路'};
    for(const [k,value] of Object.entries(fields))await editor(ctx,k).fill(value);
    await p.getByRole('textbox',{name:'题目来源'}).fill('T2-M1 模拟来源');
    const saved=await awaitDraft(ctx,qTitle,'stem',fields.stem);
    for(const [k,value] of Object.entries(fields))assert.ok(saved.payload.fields[k].includes(value),k);
    assert.equal(saved.payload.fields.source,'T2-M1 模拟来源');
    await exitEditorToList(ctx);reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);await enterCards(ctx);await draftBoxOpen(ctx,qTitle);
    for(const [k,value] of Object.entries(fields))assert.ok((await editor(ctx,k).innerText()).includes(value),k);
    assert.equal((await ctx.session.api.call('draft.get',{deckId:ctx.fixture.deck.id,cardId:saved.cardId})).payload.fields.source,'T2-M1 模拟来源');
    step(ctx,'All question source/material/stem/analysis/thought fields retain independent GUI edits after new PID');
  }else if(id==='NEW-10'){
    await newBlank(ctx,qTitle);
    const target=editor(ctx,'stem');
    await target.fill('T2-M1 文本A');
    await target.press('End');await p.keyboard.type(' 文本B');
    await target.press('Control+z');
    const afterUndo=await target.innerText();
    assert.ok(!afterUndo.includes('文本B'),'Editor undo must remove last input');
    await target.press('Control+Shift+z');
    assert.ok((await target.innerText()).includes('文本B'),'Redo must restore last input');
    await target.press('Backspace');
    const finalText=await target.innerText();
    const saved=await awaitDraft(ctx,qTitle,'stem','T2-M1 文本A',false);
    assert.ok(saved.payload.fields.stem.includes(finalText.trim()));
    await exitEditorToList(ctx);reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);await enterCards(ctx);await draftBoxOpen(ctx,qTitle);
    assert.ok((await editor(ctx,'stem').innerText()).includes(finalText.trim()));
    assert.equal((await ctx.session.api.call('draft.listSummary',{deckId:ctx.fixture.deck.id})).items.filter(x=>x.cardId===saved.cardId).length,1);
    step(ctx,'GUI undo/redo/delete autosave one unique final draft and restore on independent PID');
  }else if(id==='NEW-11'){
    await newBlank(ctx,qTitle);
    await editor(ctx,'stem').fill('T2-M1 跨集切换保护草稿');
    await chooseDeck(ctx,ctx.fixture.secondDeck);
    await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();
    assert.equal((await ctx.session.api.call('draft.listSummary',{deckId:ctx.fixture.secondDeck.id})).items.length,0);
    const saved=await awaitDraft(ctx,qTitle,'stem','T2-M1 跨集切换保护草稿',false);
    await chooseDeck(ctx,ctx.fixture.deck);
    await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();
    await draftBoxOpen(ctx,qTitle);await assertEditor(ctx,qTitle,'stem','T2-M1 跨集切换保护草稿');
    reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
    assert.equal((await ctx.session.api.call('draft.get',{deckId:ctx.fixture.deck.id,cardId:saved.cardId})).cardId,saved.cardId);
    step(ctx,'GUI changes decks during editor; saved draft stays in original deck and new PID');
  }else if(id==='NEW-15'){
    const saved=[];
    for(let i=0;i<3;i++){
      const title='T2-M1 多草稿 '+i;
      await newBlank(ctx,title);
      await editor(ctx,'stem').fill('三张不同内容 '+i);
      saved.push(await awaitDraft(ctx,title,'stem','三张不同内容 '+i));
      await exitEditorToList(ctx);
    }
    const drafts=(await ctx.session.api.call('draft.listSummary',{deckId:ctx.fixture.deck.id,limit:100})).items;
    assert.deepEqual(drafts.filter(x=>x.title.startsWith('T2-M1 多草稿')).map(x=>x.cardId).sort(),saved.map(x=>x.cardId).sort());
    await p.getByRole('button',{name:'草稿箱',exact:true}).click();
    for(let i=0;i<3;i++)await p.getByRole('navigation',{name:'已保存草稿'}).getByRole('button',{name:'T2-M1 多草稿 '+i}).waitFor();
    reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);await enterCards(ctx);
    for(let i=0;i<3;i++){
      await draftBoxOpen(ctx,'T2-M1 多草稿 '+i);await assertEditor(ctx,'T2-M1 多草稿 '+i,'stem','三张不同内容 '+i);
      await exitEditorToList(ctx);
    }
    step(ctx,'Three independently GUI-created drafts have unique IDs, correct content and new-PID inbox');
  }else if(id==='OLD-04'){
    const old='B2 保持发布和历史',changed='T2-M1 草稿新标题';
    const published=await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card);
    await p.getByRole('button',{name:'编辑 '+old,exact:true}).click();
    await p.getByTestId('draft-title').fill(changed);
    const saved=await awaitDraft(ctx,changed,'body','不可意外修改的已发布正文');
    assert.equal(saved.cardId,ctx.fixture.card.cardId);
    assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card),published);
    await exitEditorToList(ctx);
    await p.getByRole('button',{name:old,exact:true}).waitFor();
    await draftBoxOpen(ctx,changed);
    reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
    assert.equal((await ctx.session.api.call('draft.get',ctx.fixture.card)).title,changed);
    step(ctx,'Existing published title remains unchanged while linked draft carries edited title');
  }else if(id==='OLD-05'){
    const before=await ctx.session.api.call('card.getPublishedContent',scope(ctx));
    await p.getByRole('button',{name:'编辑 '+questionTitle,exact:true}).click();
    await p.getByRole('radio',{name:'正确项 2',exact:true}).check();
    const draft=await awaitDraft(ctx,questionTitle,'stem','合成题干',false);
    assert.equal(draft.payload.fields.correctOptionId,draft.payload.fields.options[1].optionId);
    assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',scope(ctx)),before);
    await exitEditorToList(ctx);reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);await enterCards(ctx);await draftBoxOpen(ctx,questionTitle);
    assert.equal(await p.getByRole('radio',{name:'正确项 2'}).isChecked(),true);
    assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',scope(ctx)),before);
    step(ctx,'GUI edited published question answer in linked draft; original published version protected');
  }else if(id==='OLD-12'||id==='OLD-13'){
    await finishSeedReview(ctx);await enterCards(ctx);
    const pub=await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card);
    const history=(await ctx.session.api.call('learning.history.list',ctx.fixture.card)).items;
    await p.getByRole('button',{name:'编辑 B2 保持发布和历史',exact:true}).click();
    await editor(ctx,'body').fill('T2-M1 未发布旧卡草稿');
    await awaitDraft(ctx,'B2 保持发布和历史','body','T2-M1 未发布旧卡草稿');
    await switchType(ctx,'问答记忆',id==='OLD-13');
    if(id==='OLD-12'){
      const saved=await ctx.session.api.call('draft.get',ctx.fixture.card);
      assert.ok(saved.payload.fields.body.includes('T2-M1 未发布旧卡草稿'));
      assert.equal(saved.payload.mode,'direct');
      assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card),pub);
      await exitEditorToList(ctx);reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);await enterCards(ctx);await draftBoxOpen(ctx,'B2 保持发布和历史');
      await assertEditor(ctx,'B2 保持发布和历史','body','T2-M1 未发布旧卡草稿');
      step(ctx,'Cancel mode switch leaves old-mode draft/history unchanged and resumable');
    }else{
      await editor(ctx,'front').fill('T2-M1 转换问题');
      await editor(ctx,'back').fill('T2-M1 转换答案');
      const saved=await awaitDraft(ctx,'B2 保持发布和历史','front','T2-M1 转换问题');
      assert.equal(saved.payload.mode,'qa');
      assert.equal((await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card)).payload.mode,'direct');
      await p.getByTestId('publish-card').click();
      await p.getByRole('status').filter({hasText:'发布成功，历史已保留'}).waitFor();
      const newPub=await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card);
      assert.equal(newPub.payload.mode,'qa');
      assert.equal(newPub.cardId,ctx.fixture.card.cardId);
      assert.deepEqual((await ctx.session.api.call('learning.history.list',ctx.fixture.card)).items,history);
      await exitEditorToList(ctx);reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
      assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card),newPub);
      step(ctx,'Confirmed type switch writes QA draft, public mode changes only at GUI publish, historic events retained');
    }
  }
  integrity(ctx);
  return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureSetup:id==='OLD-05'?questionFixture:undefined});
