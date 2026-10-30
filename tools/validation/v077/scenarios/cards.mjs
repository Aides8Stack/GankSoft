import assert from 'node:assert/strict';
import {executeCase,enterCards,restart,exitEditorToList,draftBoxOpen,assertEditor} from '../helpers.mjs';
import {snapshot} from '../../r7/support.ts';
import {observe,evidence,step,newQuestion,publish,exactDraft,questionFixture,questionTitle,scope,editor,search,openDetail} from './core-support.mjs';
const id=process.argv[2],out=process.argv[3];
if(!['NEW-14','NEW-16','NEW-17','OLD-01','LIST-01'].includes(id)||!out)throw Error('UNSUPPORTED_CARDS_CASE');
await executeCase(id,out,async ctx=>{
  await observe(ctx);await enterCards(ctx);const p=ctx.session.page;
  if(id==='OLD-01'){
    const before=await ctx.session.api.call('card.getPublishedContent',scope(ctx));
    const history=()=>Object.fromEntries(Object.entries(snapshot(ctx.fixture).tables).filter(([name])=>/review|cycle|learning|content_version/.test(name)&&name!=='learning_card_drafts'));
    const protectedBefore=history();
    await p.getByRole('button',{name:'编辑 '+questionTitle,exact:true}).click();
    const text='T1-A 修改已有错题，保留正式题干';await editor(ctx,'stem').fill(text);
    const saved=await exactDraft(ctx,questionTitle,'stem',text);
    assert.equal(saved.cardId,ctx.fixture.question.cardId);
    assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',scope(ctx)),before);
    await exitEditorToList(ctx);await draftBoxOpen(ctx,questionTitle);await assertEditor(ctx,questionTitle,'stem',text);await exitEditorToList(ctx);
    const reboot=await restart(ctx);await observe(ctx);await enterCards(ctx);await draftBoxOpen(ctx,questionTitle);await assertEditor(ctx,questionTitle,'stem',text);
    assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',scope(ctx)),before);assert.deepEqual(history(),protectedBefore);
    step(ctx,'GUI edit existing question; linked draft inbox/reopen/new PID preserved exact draft and protected publication/history/FSRS');
    return {...await evidence(ctx),reboot};
  }
  const title='T1-A '+id+' GUI question';await newQuestion(ctx,title,id!=='NEW-16');
  if(id==='NEW-14'||id==='NEW-16'){
    if(id==='NEW-14'){
      await p.getByTestId('save-draft').click();step(ctx,'Clicked explicit Save draft');
      await editor(ctx,'stem').press('End');await editor(ctx,'stem').press('Enter');await p.keyboard.type('CtrlS补充');await p.keyboard.press('Control+s');step(ctx,'Keyboard edit then Ctrl+S');
    }else{
      await p.getByTestId('publish-card').click();
      await p.getByRole('alert').filter({hasText:/正确|correct/i}).waitFor();
      ctx.observations.checks.validationFeedback=await p.getByRole('alert').allTextContents();
      step(ctx,'Missing correct answer rejects publication with visible feedback');
    }
    const text='T1-A GUI 题干：哪项正确？';const saved=await exactDraft(ctx,title,'stem',text);
    if(id==='NEW-14')assert.ok(saved.payload.fields.stem.includes('CtrlS补充'));
    assert.equal((await ctx.session.api.call('draft.listSummary',{deckId:ctx.fixture.deck.id})).items.filter(x=>x.cardId===saved.cardId).length,1);
    assert.equal((await ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.deck.id,limit:100})).items.some(x=>x.cardId===saved.cardId),false);
    await exitEditorToList(ctx);await draftBoxOpen(ctx,title);await assertEditor(ctx,title,'stem',text);await exitEditorToList(ctx);
    const reboot=await restart(ctx);await observe(ctx);await enterCards(ctx);await draftBoxOpen(ctx,title);await assertEditor(ctx,title,'stem',text);
    assert.deepEqual((await ctx.session.api.call('draft.get',{deckId:ctx.fixture.deck.id,cardId:saved.cardId})).payload,saved.payload);
    step(ctx,'Single unpublished draft found in inbox, GUI reopened and exact payload restored in new PID');
    return {...await evidence(ctx),reboot};
  }
  const {card,content}=await publish(ctx,title);await exitEditorToList(ctx);
  await search(ctx,title);await openDetail(ctx,title);
  assert.ok((await p.getByRole('article',{name:'卡片详情'}).innerText()).includes('T1-A GUI 题干：哪项正确？'));
  step(ctx,'Published card searched and opened through visible list');
  const reboot=await restart(ctx);await observe(ctx);await enterCards(ctx);await search(ctx,title);await openDetail(ctx,title);
  assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',card),content);
  step(ctx,'New PID GUI search/detail and exact published payload readback agree');
  return {...await evidence(ctx),reboot,cardId:card.cardId};
},{fixtureSetup:id==='OLD-01'?questionFixture:undefined});
