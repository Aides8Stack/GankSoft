import assert from 'node:assert/strict';
import {snapshot} from '../../r7/support.ts';
const protectedTables=ctx=>Object.fromEntries(Object.entries(snapshot(ctx.fixture).tables).filter(([name])=>/review|cycle|learning|content_version/.test(name)));
import {executeCase,enterCards,restart,awaitDraft,draftBoxOpen,
  exitEditorToList,assertEditor} from '../helpers.mjs';

const id=process.argv[2],out=process.argv[3];
if (!['NEW-01','NEW-02','NEW-03','OLD-03','NEW-12','NEW-18'].includes(id) || !out) {
  throw Error('V077_UNSUPPORTED_DRAFT_CASE');
}
const modes={'NEW-12':{mode:'question',field:'stem',label:'错题复盘'},'NEW-18':{mode:'question',field:'stem',label:'错题复盘'},'NEW-01':{mode:'question',field:'stem',label:'错题复盘'},
  'NEW-02':{mode:'qa',field:'front',label:'问答记忆'},
  'NEW-03':{mode:'direct',field:'body',label:'直接记忆'}};
await executeCase(id,out,async ctx=>{
  const title=id==='OLD-03'?'B2 保持发布和历史':'V077 '+id+' 自动保存草稿';
  const field=id==='OLD-03'?'body':modes[id].field;
  const text='V077 '+id+' GUI编辑后自动保存，重启可恢复。';
  await enterCards(ctx);
  let publishedBefore=null,historyBefore=null;
  if (id==='OLD-03') {
    historyBefore=protectedTables(ctx);
    publishedBefore=await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card);
    const row=ctx.session.page.locator('tr[data-card-id="'+ctx.fixture.card.cardId+'"]');
    await row.getByRole('button',{name:/^编辑 /}).click();
  } else {
    await ctx.session.page.getByRole('button',{name:'新建卡片',exact:true}).click();
    await ctx.session.page.getByTestId('draft-title').waitFor();
    if (modes[id].mode!=='question') {
      await ctx.session.page.getByRole('navigation',{name:'卡片类型'})
        .getByRole('button',{name:modes[id].label,exact:true}).click();
      const dialog=ctx.session.page.getByRole('dialog',{name:'确认切换卡片类型'});
      await dialog.getByRole('button',{name:/^确认切换/}).click();
      await dialog.waitFor({state:'hidden'});
    }
    await ctx.session.page.getByTestId('draft-title').fill(title);
  }
  const edit=ctx.session.page.locator('[data-editor-field="'+field+'"] .ProseMirror[contenteditable=true]');
  await edit.waitFor();
  if(id==='NEW-18')await ctx.session.app.evaluate(()=>globalThis.v077Faults.arm());
  await edit.fill(text); // Real contenteditable edit; no direct draft.save call
  if(id==='NEW-18'){
    await ctx.session.page.locator('[data-save-state="error"]').waitFor();
    await ctx.session.page.getByRole('button',{name:/返回上一页/}).click();
    assert.equal(await edit.innerText(),text);
    assert.equal(await ctx.session.page.locator('[data-save-state="error"]').count(),1);
    await ctx.session.app.evaluate(()=>globalThis.v077Faults.clear());
    await ctx.session.page.getByTestId('save-draft').click();
  }
  if(id==='NEW-12')await exitEditorToList(ctx);
  const saved=await awaitDraft(ctx,title,field,text,id!=='NEW-12');
  if (id==='OLD-03') {
    assert.equal(saved.cardId,ctx.fixture.card.cardId,'Existing card MUST keep its identity');
    assert.deepEqual(await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card),
      publishedBefore,'Auto-saving a draft MUST NOT mutate published content');
  } else {
    const official=(await ctx.session.api.call('card.listSummary',
      {deckId:ctx.fixture.deck.id,limit:100})).items;
    assert.equal(official.some(card=>card.cardId===saved.cardId),false,
      'Unpublished draft MUST NOT be a published card');
  }
  if(id!=='NEW-12')await exitEditorToList(ctx);
  await draftBoxOpen(ctx,title);
  await assertEditor(ctx,title,field,text);
  await exitEditorToList(ctx);
  const reboot=await restart(ctx);
  await enterCards(ctx);
  await draftBoxOpen(ctx,title);
  await assertEditor(ctx,title,field,text);
  const persisted=await ctx.session.api.call('draft.get',
    {deckId:ctx.fixture.deck.id,cardId:saved.cardId});
  assert.equal(persisted?.payload?.fields?.[field],saved.payload.fields[field]);
  if (publishedBefore) assert.deepEqual(
    await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card),publishedBefore);
  if(historyBefore)assert.deepEqual(protectedTables(ctx),historyBefore,'History, scores and FSRS unchanged');
  return {steps:['UI new/edit','keyboard changed ProseMirror','auto-save without Ctrl+S',
    'draft inbox listed','GUI reopened','new Electron PID','GUI reopened after restart'],
    cardId:saved.cardId,revision:persisted.revision,reboot,
    evidence:['draft-box.png','read-only draft.get and card.getPublishedContent assertions']};
});
