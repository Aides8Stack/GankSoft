import assert from 'node:assert/strict';
import {observe,evidence,step} from './core-support.mjs';
import {executeCase,enterCards,awaitDraft,exitEditorToList,
  draftBoxOpen,assertEditor,restart} from '../helpers.mjs';

const id=process.argv[2],out=process.argv[3];
if (!['CLIP-01','CLIP-02','CLIP-04'].includes(id) || !out) throw Error('V077_UNSUPPORTED_PASTE_CASE');
await executeCase(id,out,async ctx=>{
  if(id==='CLIP-02')await observe(ctx);
  await enterCards(ctx);
  const row=ctx.session.page.locator('tr[data-card-id="'+ctx.fixture.card.cardId+'"]');
  await row.getByRole('button',{name:/^编辑 /}).click();
  const p=ctx.session.page;
  await p.getByTestId('draft-title').waitFor();
  const editor=p.locator('[data-editor-field="body"] .ProseMirror[contenteditable=true]');
  await editor.waitFor();
  const text=id==='CLIP-02'?'网页段落一':id==='CLIP-01'?'记事本纯文本粘贴回归 中文 English 2026':
    '纯文本字面HTML：<b>bold</b> <script>noop()</script>';
  if(id==='CLIP-02'){await ctx.session.app.evaluate(({clipboard,ClipboardItem})=>clipboard.write([new ClipboardItem({'text/plain':'网页段落一\n网页加粗文字','text/html':'<html><body><p>网页段落一</p><p><b>网页加粗文字</b></p></body></html>'})]));}
  else await ctx.session.app.evaluate(({clipboard},value)=>clipboard.writeText(value),text);
  await editor.click();
  await p.keyboard.press('Control+End');
  await p.keyboard.press('Enter');
  await p.keyboard.press(process.platform==='darwin'?'Meta+V':'Control+V');
  const saved=await awaitDraft(ctx,'B2 保持发布和历史','body',id==='CLIP-04'?text.replaceAll('<','\\<'):text);
  assert.equal(saved.cardId,ctx.fixture.card.cardId);
  if(id==='CLIP-02'){assert.ok(saved.payload.fields.body.includes('网页加粗文字'));assert.ok(saved.payload.fields.body.includes('\n'));}
  await exitEditorToList(ctx);
  await draftBoxOpen(ctx,'B2 保持发布和历史');
  await assertEditor(ctx,'B2 保持发布和历史','body',text);
  await exitEditorToList(ctx);
  const reboot=await restart(ctx);
  if(id==='CLIP-02')await observe(ctx);
  await enterCards(ctx);
  await draftBoxOpen(ctx,'B2 保持发布和历史');
  await assertEditor(ctx,'B2 保持发布和历史','body',text);
  const proof=id==='CLIP-02'?await evidence(ctx):{};
  return {...proof,steps:[id==='CLIP-02'?'Electron native clipboard HTML+plain web selection fixture':'Electron main clipboard.writeText','real GUI Ctrl+V',
    'auto-save without save button','draft inbox reopened','new Electron process readback'],
    clipboardEvidence:'Electron native clipboard API; web HTML fixture for CLIP-02; NOT physical Windows/browser selection',
    reboot,evidence:[...(proof.evidence??[]),'draft-box.png','read-only draft.get assertion']};
});
