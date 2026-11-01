import assert from 'node:assert/strict';
import {executeCase,enterCards} from '../helpers.mjs';
import {evidence,step,questionFixture,questionTitle,directFixture,openDetail} from './core-support.mjs';
import {qaFixture,qaTitle} from './p0-support.mjs';
import {trace,reboot,snapshot,integrity,receipts} from './system-support.mjs';
const id=process.argv[2],out=process.argv[3];
const ids=['REVIEW-02','REVIEW-03','REVIEW-04','REVIEW-10','REVIEW-11','REVIEW-17'];if(!ids.includes(id))throw Error('UNKNOWN_P0_REVIEW');
await executeCase(id,out,async ctx=>{
 await trace(ctx);await enterCards(ctx);let p=ctx.session.page;
 const qa=id==='REVIEW-04',title=qa?qaTitle:questionTitle,card=qa?ctx.fixture.qa:ctx.fixture.question,score=id==='REVIEW-03'?50:100;
 await p.getByRole('checkbox',{name:'选择 '+title,exact:true}).check();
 if(id==='REVIEW-10')await p.getByRole('checkbox',{name:'选择 T1-A seeded direct memory',exact:true}).check();
 await p.getByRole('button',{name:'学习选中卡片',exact:true}).click();await p.getByRole('heading',{name:title,exact:true}).waitFor();
 if(!qa){await p.getByRole('radio',{name:id==='REVIEW-02'?'乙错误':'甲正确',exact:true}).check();await p.getByLabel('独立思路',{exact:true}).fill('T2-A real answer');}else assert.equal(await p.locator('.review-option').count(),0);
 await p.getByRole('button',{name:'揭示答案',exact:true}).click();if(qa)assert.match(await p.locator('body').innerText(),/T2-A answer/);
 const slider=p.getByRole('slider');await slider.focus();await slider.press('End');for(let i=score;i<100;i++)await slider.press('ArrowLeft');await p.getByLabel('反思（可选）',{exact:true}).fill('T2-A '+id+' evidence');await p.getByTestId('review-save-state').filter({hasText:'草稿已保存'}).waitFor();const resume=p.getByRole('button',{name:'继续计时',exact:true});if(await resume.isVisible())await resume.click();
 if(id==='REVIEW-11')await ctx.session.app.evaluate(()=>globalThis.v077Faults.arm('learning.review.submit','drop'));
 const save=p.getByRole('button',{name:'保存本次复盘',exact:true});if(id==='REVIEW-11')await save.evaluate(el=>{el.click();el.click();});else await save.click();await p.getByRole('status').filter({hasText:'复盘已保存 · 自评 '+(score/10).toFixed(1)}).waitFor();
 const history=(await ctx.session.api.call('learning.history.list',card)).items;assert.equal(history.length,1);const event=await ctx.session.api.call('learning.history.get',{...card,eventId:history[0].eventId});assert.equal(event.scoreTenths,score);assert.equal(event.objectiveCorrect,qa?null:id!=='REVIEW-02');assert.equal(event.rating,id==='REVIEW-02'||id==='REVIEW-03'?'again':'easy');assert.match(JSON.stringify(event),new RegExp('T2-A '+id));
 const rows=snapshot(ctx.fixture).tables.learning_review_events.filter(r=>r.card_id===card.cardId);assert.equal(rows.length,1);const due=(await ctx.session.api.call('card.listSummary',{deckId:card.deckId,limit:100})).items.find(r=>r.cardId===card.cardId).dueAt;assert.ok(due);
 if(id==='REVIEW-11'){assert.ok((await receipts(ctx,'learning.review.submit')).some(x=>x.dropped));assert.ok((await receipts(ctx,'operation.status')).some(x=>x.ok));}
 if(id==='REVIEW-10'){await p.getByRole('button',{name:'下一张',exact:true}).click();await p.getByRole('heading',{name:'T1-A seeded direct memory',exact:true}).waitFor();assert.equal((await ctx.session.api.call('learning.history.list',ctx.fixture.direct)).items.length,0);}
 await p.getByRole('button',{name:'返回卡片列表',exact:true}).click();await openDetail(ctx,title);await p.getByRole('button',{name:'查看学习历史',exact:true}).click();await p.locator('.detail-history-list button').first().click();assert.match(await p.locator('[aria-label="当次复盘证据"]').innerText(),new RegExp('T2-A '+id));
 await reboot(ctx);p=ctx.session.page;await enterCards(ctx);await openDetail(ctx,title);await p.getByRole('button',{name:'查看学习历史',exact:true}).click();await p.locator('.detail-history-list button').first().click();assert.match(await p.locator('[aria-label="当次复盘证据"]').innerText(),new RegExp('T2-A '+id));assert.deepEqual(await ctx.session.api.call('learning.history.get',{...card,eventId:event.eventId}),event);assert.equal((await ctx.session.api.call('card.listSummary',{deckId:card.deckId,limit:100})).items.find(r=>r.cardId===card.cardId).dueAt,due);assert.equal(snapshot(ctx.fixture).tables.learning_review_events.filter(r=>r.card_id===card.cardId).length,1);
 ctx.observations.checks.review={event,due,requests:await receipts(ctx,'learning.review.submit')};step(ctx,'GUI answer/reveal/score/save; exact objective, subjective, FSRS rating, single SQLite event and GUI history/schedule survive independent PID');integrity(ctx);return evidence(ctx);
},{fixtureSetup:async f=>{if(id==='REVIEW-04')await qaFixture(f);else await questionFixture(f);if(id==='REVIEW-10')await directFixture(f);}});
