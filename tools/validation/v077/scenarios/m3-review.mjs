// M3-02: nine GUI review/session/history tests. All review submits go through UI.
import assert from 'node:assert/strict';
import {executeCase,enterCards,restart} from '../helpers.mjs';
import {observe,evidence,step,questionFixture} from './core-support.mjs';
import {integrity} from './system-support.mjs';
import {threeModes,twoLinkedCards,studySelected,reviewCard,history,readFullHistory,
  nativeTitle,questionTitle,qaTitle,analytics} from './m3-support.mjs';
const id=process.argv[2],out=process.argv[3];
const ids=['REVIEW-06','REVIEW-07','REVIEW-08','REVIEW-09','REVIEW-12','REVIEW-13','REVIEW-14','REVIEW-15','REVIEW-16'];
if(!ids.includes(id)||!out)throw Error('UNKNOWN_M3_REVIEW_CASE');
const fixtureSetup=id==='REVIEW-14'?twoLinkedCards:id==='REVIEW-07'||id==='REVIEW-15'?threeModes:id==='REVIEW-09'?questionFixture:undefined;
const due=async ctx=>(await ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.deck.id,limit:100}))
  .items.find(x=>x.cardId===ctx.fixture.card.cardId)?.dueAt;
async function backList(ctx){
 const p=ctx.session.page;
 const finish=p.getByRole('button',{name:'完成复盘',exact:true});
 if(await finish.isVisible())await finish.click();
 const ret=p.getByRole('button',{name:'返回卡片列表',exact:true});
 await ret.click();
 await p.getByRole('heading',{name:'所有卡片',exact:true}).waitFor();
}
async function resumeViaOverview(ctx){
 const p=ctx.session.page;
 await p.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'概览',exact:true}).click();
 const overview=p.getByRole('region',{name:'卡片集概览',exact:true});await overview.waitFor();
 await overview.getByRole('button',{name:'继续学习',exact:true}).click();
 await p.getByRole('heading',{name:'学习与复盘',exact:true}).waitFor();
}
await executeCase(id,out,async ctx=>{
 await observe(ctx);let p=ctx.session.page,reboot;
 const card=ctx.fixture.card;
 if(id==='REVIEW-06'){
   const thresholds=[[0,'again'],[59,'again'],[60,'hard'],[74,'hard'],
     [75,'good'],[89,'good'],[90,'easy'],[100,'easy']];
   const initial=await readFullHistory(ctx,card),events=[];
   for(const [score,expectedRating] of thresholds){
     const event=await reviewCard(ctx,nativeTitle,card,score);
     const full=await ctx.session.api.call('learning.history.get',{...card,eventId:event.eventId});
     assert.equal(full.scoreTenths,score);
     assert.equal(full.rating,expectedRating,'FSRS score boundary '+score);
     assert.equal(full.objectiveCorrect,null);
     assert.ok(full.native.schedule.outcome==='updated'||full.native.schedule.outcome==='practice');
     events.push({id:event.eventId,score,rating:full.rating});
     await backList(ctx);
   }
   assert.equal(new Set(events.map(x=>x.id)).size,thresholds.length);
   assert.equal((await readFullHistory(ctx,card)).length,initial.length+8);
   ctx.observations.checks.boundaries=events;
   step(ctx,'Eight GUI score boundary trials 0.0/5.9/6.0/7.4/7.5/8.9/9.0/10.0 map to Again/Hard/Good/Easy');
 }else if(id==='REVIEW-07'){
   const {session}=await studySelected(ctx,[nativeTitle,questionTitle,qaTitle]);
   const pause=p.getByRole('button',{name:'暂停计时',exact:true});
   await pause.click();
   await p.getByRole('button',{name:'继续计时',exact:true}).waitFor();
   const suspended=await ctx.session.api.call('learning.session.get',{deckId:ctx.fixture.deck.id,sessionId:session.sessionId});
   assert.equal(suspended.paused,true);
   const seconds=suspended.totalSeconds;
   await p.getByRole('button',{name:'返回卡片列表',exact:true}).click();
   await p.getByRole('heading',{name:'所有卡片'}).waitFor();
   await resumeViaOverview(ctx);
   const resumed=await ctx.session.api.call('learning.session.get',{deckId:ctx.fixture.deck.id,sessionId:session.sessionId});
   assert.equal(resumed.index,suspended.index);
   assert.equal(resumed.entry.cardId,suspended.entry.cardId);
   assert.ok(resumed.totalSeconds>=seconds);
   await p.getByRole('button',{name:'继续计时',exact:true}).click();
   await p.getByRole('button',{name:'暂停计时',exact:true}).waitFor();
   step(ctx,'Actual GUI pause/leave/resume preserves 3-card session position and monotonic elapsed time');
 }else if(id==='REVIEW-08'){
   const {session}=await studySelected(ctx,[nativeTitle]);
   const text='REVIEW-08 反思笔记草稿不能丢失';
   await p.getByRole('button',{name:'揭示答案',exact:true}).click();
   const detail=p.locator('details.r4-review-extra').filter({hasText:'错误原因与知识漏洞（可选）'});
   await detail.locator('summary').click();
   await p.getByLabel('错因（每行一项）').fill('错因甲\n错因乙');
   await p.getByLabel('知识漏洞').fill('知识漏洞未补全');
   await p.getByLabel('反思（可选）').fill(text);
   const slider=p.getByRole('slider');await slider.press('Home');for(let i=0;i<37;i++)await slider.press('ArrowRight');
   await p.getByTestId('review-save-state').filter({hasText:'草稿已保存'}).waitFor();
   await p.getByRole('button',{name:'暂停计时',exact:true}).click();
   const before=await ctx.session.api.call('learning.session.get',{deckId:ctx.fixture.deck.id,sessionId:session.sessionId});
   assert.deepEqual(before.draft.faults,['错因甲','错因乙']);assert.equal(before.draft.gaps,'知识漏洞未补全');
   assert.equal(before.draft.reflection,text);assert.equal(before.draft.scoreTenths,37);
   reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
   await enterCards(ctx);await resumeViaOverview(ctx);
   const after=await ctx.session.api.call('learning.session.get',{deckId:ctx.fixture.deck.id,sessionId:session.sessionId});
   assert.deepEqual(after.draft,before.draft);
   assert.equal(await p.getByLabel('反思（可选）').inputValue(),text);
   assert.equal(await p.getByRole('slider').getAttribute('aria-valuetext'),'3.7 分');
   assert.equal((await history(ctx,card)).length,1,'Uncommitted draft must not create real ReviewEvent');
   step(ctx,'Four independent notes, score and paused state survive fresh Electron PID without fake review submission');
 }else if(id==='REVIEW-09'){
   const {session}=await studySelected(ctx,[questionTitle]);
   assert.equal(await p.getByRole('region',{name:'答案解析'}).count(),0,'Answer must not be visible in answer stage');
   await p.getByRole('button',{name:'暂停计时',exact:true}).click();
   await p.getByRole('button',{name:'返回卡片列表',exact:true}).click();
   await resumeViaOverview(ctx);
   assert.equal(await p.getByRole('region',{name:'答案解析'}).count(),0);
   await p.getByRole('button',{name:'继续计时',exact:true}).click();
   await p.getByRole('radio',{name:'甲正确',exact:true}).check();
   await p.getByLabel('独立思路',{exact:true}).fill('M3 答案揭示前独立思路');
   await p.getByRole('button',{name:'揭示答案',exact:true}).click();
   assert.equal((await ctx.session.api.call('learning.session.get',{deckId:ctx.fixture.deck.id,sessionId:session.sessionId})).stage,'reveal');
   await p.getByRole('button',{name:'暂停计时',exact:true}).click();
   await p.getByRole('button',{name:'返回卡片列表',exact:true}).click();
   await resumeViaOverview(ctx);
   assert.equal((await ctx.session.api.call('learning.session.get',{deckId:ctx.fixture.deck.id,sessionId:session.sessionId})).stage,'reveal');
   assert.ok(await p.getByRole('slider').isVisible(),'Revealed phase must remain revealed after navigation');
   step(ctx,'GUI navigation before and after reveal cannot leak answer early or reset persisted review stage');
 }else if(id==='REVIEW-12'){
   const initial=(await history(ctx,card)).length,dueBefore=await due(ctx);
   const practice=await reviewCard(ctx,nativeTitle,card,80,{practice:true});
   const result=await ctx.session.api.call('learning.history.get',{...card,eventId:practice.eventId});
   assert.equal(result.native.practice,true);assert.equal(result.native.schedule.outcome,'practice');
   assert.equal(await due(ctx),dueBefore,'Practice cannot silently update formal FSRS schedule');
   await backList(ctx);
   const formal=await reviewCard(ctx,nativeTitle,card,80);
   const committed=await ctx.session.api.call('learning.history.get',{...card,eventId:formal.eventId});
   assert.equal(committed.native.practice,false);
   assert.equal(committed.native.schedule.outcome,'updated');
   assert.equal((await history(ctx,card)).length,initial+2);
   assert.notEqual(practice.eventId,formal.eventId);
   step(ctx,'One GUI practice event preserves due date; one formal event updates schedule, both independently preserved');
 }else if(id==='REVIEW-13'){
   const before=await due(ctx);assert.ok(before&&Date.parse(before)>Date.now(),'Pre-due fixture required');
   const initial=(await history(ctx,card)).length;
   const review=await reviewCard(ctx,nativeTitle,card,70,{practice:true});
   const event=await ctx.session.api.call('learning.history.get',{...card,eventId:review.eventId});
   assert.equal(event.native.practice,true);
   assert.equal(event.native.schedule.outcome,'practice');
   assert.equal(await due(ctx),before);
   assert.equal((await history(ctx,card)).length,initial+1);
   step(ctx,'Explicit active practice on not-yet-due card logs activity without modifying periodic due queue');
 }else if(id==='REVIEW-14'){
   const cards=[card,ctx.fixture.qa];
   const nodeId=ctx.fixture.ids[0];
   const links=await Promise.all(cards.map(c=>ctx.session.api.call('knowledge.cardLinks.get',c)));
   assert.ok(links.every(x=>x.nodeIds.includes(nodeId)));
   const events=[];
   for(const [c,title] of [[card,nativeTitle],[ctx.fixture.qa,qaTitle]]){
     const e=await reviewCard(ctx,title,c,80);events.push(e.eventId);await backList(ctx);
   }
   const mastery=await ctx.session.api.call('learning.mastery.knowledge',{deckId:ctx.fixture.deck.id,nodeId,scope:'direct'});
   assert.equal(new Set(mastery.cardIds).size,mastery.cardIds.length);
   assert.ok(mastery.cardIds.includes(card.cardId)&&mastery.cardIds.includes(ctx.fixture.qa.cardId));
   const a=await analytics(ctx);
   assert.ok(a.result.items.some(x=>events.includes(x.eventId)));
   assert.ok(a.result.eventCount>=events.length);
   await a.page.getByRole('button',{name:'更多知识点',exact:true}).click();
   const label=a.page.getByRole('region',{name:'知识点综合掌握度'}).getByText('生命周期甲');
   await label.waitFor();
   step(ctx,'Two distinct GUI-reviewed cards share one knowledge node; unique cards and real events drive mastery/analysis');
 }else if(id==='REVIEW-15'){
   const {session}=await studySelected(ctx,[nativeTitle,questionTitle]);
   assert.equal(session.total,2);
   await p.getByRole('button',{name:'揭示答案',exact:true}).click();
   const score=p.getByRole('slider');await score.press('End');
   await p.getByRole('button',{name:'保存本次复盘',exact:true}).click();
   await p.getByRole('status').filter({hasText:'复盘已保存'}).waitFor();
   await p.getByRole('button',{name:'下一张',exact:true}).click();
   const current=await ctx.session.api.call('learning.session.get',{deckId:ctx.fixture.deck.id,sessionId:session.sessionId});
   assert.equal(current.index,1);
   await p.getByRole('radio',{name:'甲正确',exact:true}).check();
   await p.getByLabel('独立思路',{exact:true}).fill('M3 second card');
   await p.getByRole('button',{name:'揭示答案'}).click();
   await p.getByRole('slider').press('End');
   await p.getByRole('button',{name:'保存本次复盘'}).click();
   await p.getByRole('button',{name:'完成复盘'}).click();
   assert.equal((await ctx.session.api.call('learning.session.get',{deckId:ctx.fixture.deck.id,sessionId:session.sessionId})).completed,true);
   await p.getByRole('button',{name:'返回卡片列表'}).click();
   await enterCards(ctx);await p.getByRole('button',{name:'学习选中卡片'}).count();
   const sessions=(await ctx.session.api.call('workspace.sessions',{deckId:ctx.fixture.deck.id})).items;
   assert.ok(sessions.some(s=>s.sessionId===session.sessionId&&s.completed));
   reboot=await restart(ctx);await observe(ctx);
   assert.equal((await ctx.session.api.call('learning.session.get',{deckId:ctx.fixture.deck.id,sessionId:session.sessionId})).completed,true);
   step(ctx,'Finish 2-card GUI queue, return, and independent restart cannot re-label completed session as pending');
 }else if(id==='REVIEW-16'){
   const additional=await reviewCard(ctx,nativeTitle,card,76,{notes:{faults:'思路偏差',gaps:'数学',reflection:'第二次模拟证据'}});
   await backList(ctx);await enterCards(ctx);
   await p.getByRole('button',{name:'详情 '+nativeTitle,exact:true}).click();
   const panel=p.getByRole('article',{name:'卡片详情'});
   await panel.getByRole('button',{name:'查看学习历史',exact:true}).click();
   const rows=await readFullHistory(ctx,card);
   assert.ok(rows.length>=2);
   for(const row of rows){
     const detail=await ctx.session.api.call('learning.history.get',{...card,eventId:row.eventId});
     const target=panel.locator('.detail-history-list button').filter({hasText:new Date(row.createdAt).toLocaleDateString('zh-CN')});
     if(await target.count())await target.first().click();
     const result=panel.getByRole('region',{name:'当次复盘证据'});
     await result.waitFor();
     const body=await result.innerText();
     assert.ok(body.includes('自评'));
     assert.equal(detail.eventId,row.eventId);
     assert.ok(detail.native&&detail.native.schedule&&detail.native.knowledge);
   }
   const active=await ctx.session.api.call('learning.history.get',{...card,eventId:additional.eventId});
   assert.ok(active.native.reflection.includes('第二次模拟证据'));
   step(ctx,'GUI history lists and opens each authentic saved event, with objective/score/time/reason/evidence intact');
 }
 integrity(ctx);
 return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureSetup});
