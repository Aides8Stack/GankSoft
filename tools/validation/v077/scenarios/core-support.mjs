// Shared GUI actions for T1-A. Only fixtureSetup may write through the API.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createFullRestoreSession} from '../../../../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../../../../shared/protocol/client.ts';
import {snapshot} from '../../r7/support.ts';
import {awaitDraft} from '../helpers.mjs';
export const questionTitle='T1-A seeded published question';
export const scope=ctx=>({deckId:ctx.fixture.deck.id,cardId:ctx.fixture.question.cardId});
export const editor=(ctx,field)=>ctx.session.page.locator('[data-editor-field="'+field+'"] .ProseMirror[contenteditable=true]');
export function step(ctx,name){ctx.observations.steps.push(name);}
export async function questionFixture(f){
  const owner=await createFullRestoreSession(f.data+'-control606',{workspaceParent:f.root,selectBackup:async()=>null,allowLegacyRestore:false});
  try{
    const api=createClient(r=>owner.execute(r));await api.call('app.capabilities',{});
    const d=await api.call('draft.create',{deckId:f.deck.id,initialType:'question'});
    const payload={encoding:'question-v1',mode:'question',fields:{stem:'合成题干：哪项正确？',material:'',analysis:'甲是正确答案',initialThought:'',source:'T1-A synthetic fixture',options:[{optionId:crypto.randomUUID(),position:0,markdown:'甲正确'},{optionId:crypto.randomUUID(),position:1,markdown:'乙错误'}],correctOptionId:null}};
    payload.fields.correctOptionId=payload.fields.options[0].optionId;
    const saved=await api.call('draft.save',{deckId:f.deck.id,cardId:d.cardId,expectedPublishedRevision:0,expectedDraftRevision:d.revision,fields:{title:questionTitle,payload,mediaRefs:[]}});
    await api.call('card.publish',{deckId:f.deck.id,cardId:d.cardId,expectedPublishedRevision:0,expectedDraftRevision:saved.revision,resetStudyCycle:false});
    f.question={deckId:f.deck.id,cardId:d.cardId};
  }finally{owner.close();}
}
export async function observe(ctx){
  ctx.collectEvidence=async()=>({observations:ctx.observations,uiTrace:await ctx.session.page.evaluate(()=>window.t1aTrace??[]),database:snapshot(ctx.fixture),beforeRestart:structuredClone(ctx.beforeRestart??[])});
  await ctx.session.page.evaluate(()=>{
    window.t1aTrace=[];
    const sample=()=>{const text=[...document.querySelectorAll('[data-save-state],[data-testid="review-save-state"],[role="alert"],[role="status"],button:disabled')].map(e=>({state:e.getAttribute('data-save-state'),text:e.textContent?.trim()}));const signature=JSON.stringify(text);if(window.t1aTrace.at(-1)?.signature!==signature)window.t1aTrace.push({signature,text});if(window.t1aTrace.length>500)window.t1aTrace.shift();};
    new MutationObserver(sample).observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});sample();
  });
}
export async function evidence(ctx){
  const diagnostics=await ctx.collectEvidence();
  writeFileSync(join(ctx.out,'diagnostics.json'),JSON.stringify(diagnostics,null,2)+'\n');
  await ctx.session.page.screenshot({path:join(ctx.out,'result.png')});
  return {steps:ctx.observations.steps,checks:ctx.observations.checks,evidence:['diagnostics.json','result.png'],feedbackTrace:diagnostics.uiTrace};
}
export async function newQuestion(ctx,title,correct=true){
  const p=ctx.session.page;
  await p.getByRole('button',{name:'新建卡片',exact:true}).click();
  await p.getByTestId('draft-title').fill(title);
  await editor(ctx,'stem').fill('T1-A GUI 题干：哪项正确？');
  await editor(ctx,'analysis').fill('甲为正确答案，乙为干扰项。');
  await p.getByRole('button',{name:'批量输入选项',exact:true}).click();
  const d=p.getByRole('dialog',{name:'批量输入选项',exact:true});
  await d.getByLabel('批量选项正文').fill('甲正确\n乙错误');
  await d.getByRole('button',{name:'确认替换选项',exact:true}).click();
  await d.waitFor({state:'hidden'});
  if(correct)await p.getByRole('radio',{name:'正确项 1',exact:true}).check();
  step(ctx,'GUI new question, typed title/stem/analysis/options'+(correct?' and selected correct answer':''));
}
export async function publish(ctx,title){
  const p=ctx.session.page;
  await p.getByTestId('publish-card').click();
  await p.getByRole('status').filter({hasText:'发布成功，历史已保留'}).waitFor();
  const cards=(await ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.deck.id,limit:100})).items.filter(x=>x.title===title);
  assert.equal(cards.length,1);
  const card={deckId:ctx.fixture.deck.id,cardId:cards[0].cardId};
  const content=await ctx.session.api.call('card.getPublishedContent',card);
  assert.equal(content.title,title);assert.equal(content.payload.encoding,'question-v1');
  assert.equal(content.payload.fields.stem,'T1-A GUI 题干：哪项正确？\n'); // canonical Markdown includes its final newline
  assert.equal(content.payload.fields.options.length,2);
  assert.equal(content.payload.fields.correctOptionId,content.payload.fields.options[0].optionId);
  assert.equal((await ctx.session.api.call('draft.listSummary',{deckId:ctx.fixture.deck.id})).items.some(x=>x.cardId===card.cardId),false);
  step(ctx,'GUI Publish succeeded; read-only IPC verifies unique card, full fields and removed draft');
  return {card,content};
}
export async function openDetail(ctx,title){
  await ctx.session.page.getByRole('button',{name:title,exact:true}).click();
  await ctx.session.page.getByRole('article',{name:'卡片详情'}).locator('[aria-busy]').count();
  await ctx.session.page.getByRole('heading',{name:title,exact:true}).waitFor();
}
export async function search(ctx,title){
  const p=ctx.session.page;
  await p.getByRole('textbox',{name:'搜索卡片标题',exact:true}).fill(title);
  await p.getByRole('button',{name:'搜索',exact:true}).click();
  await p.getByRole('button',{name:title,exact:true}).waitFor();
  assert.equal(await p.locator('tr[data-card-id]').count(),1);
  step(ctx,'GUI title search returns exactly one card');
}
export async function exactDraft(ctx,title,field,text){
  const saved=await awaitDraft(ctx,title,field,text);
  assert.ok(saved.payload.fields[field].includes(text));return saved;
}
