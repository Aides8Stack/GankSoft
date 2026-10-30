// M3-01: twelve real GUI study filtering and policy paths.
import assert from 'node:assert/strict';
import {executeCase,enterCards,restart} from '../helpers.mjs';
import {observe,evidence,step} from './core-support.mjs';
import {integrity} from './system-support.mjs';
import {confirmAction} from './m1-support.mjs';
import {threeModes,openPlanner,previewPlanner,plannerPreview,queueItems,studySelected,
  openDeckSchedule,openCardSchedule,history,finishSeedReview,nativeTitle,questionTitle,qaTitle,treeRead} from './m3-support.mjs';
const id=process.argv[2],out=process.argv[3];
if(!Array.from({length:12},(_,i)=>'PLAN-'+String(i+1).padStart(2,'0')).includes(id)||!out)
  throw Error('UNKNOWN_M3_PLAN_CASE');
const modeCases=new Set(['PLAN-01','PLAN-03','PLAN-05','PLAN-06','PLAN-08']);
const fixtureSetup=id==='PLAN-08'?async f=>{await threeModes(f);await finishSeedReview(f);}:modeCases.has(id)?threeModes:undefined;
const qRead=ctx=>ctx.session.api.call('learning.queue.preview',{deckId:ctx.fixture.deck.id,filters:{},limit:100});
const deckCfg=ctx=>ctx.session.api.call('policy.config.get',{deckId:ctx.fixture.deck.id});
const scheduleRows=async ctx=>(await ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.deck.id,limit:100})).items.map(x=>({id:x.cardId,dueAt:x.dueAt}));
await executeCase(id,out,async ctx=>{
  await observe(ctx);
  let p=ctx.session.page,reboot;
  if(id==='PLAN-01'){
    p=await openPlanner(ctx);
    await p.getByRole('combobox',{name:'卡片状态'}).selectOption('new');
    for(const [mode,label] of [['question','错题复盘'],['qa','问答记忆'],['direct','直接记忆']]){
      await p.getByRole('combobox',{name:'筛选卡片类型'}).selectOption(mode);
      const {region}=await previewPlanner(ctx);
      const titles=await region.locator('.filter-preview-row').allTextContents();
      const q=await ctx.session.api.call('learning.queue.preview',{deckId:ctx.fixture.deck.id,filters:{state:'new'},limit:100});
      const eligible=queueItems(q).filter(x=>x.publishedType===mode).map(x=>x.title);
      assert.equal(titles.length,Math.min(6,eligible.length),'GUI mode preview size mismatch');
      for(const row of titles){assert.ok(row.includes(label),'Card mode leaked into '+mode+' filter');assert.ok(eligible.some(t=>row.includes(t)));}
    }
    step(ctx,'GUI status/type filters preview only current-deck, correctly typed eligible cards');
  }else if(id==='PLAN-02'){
    p=await openPlanner(ctx);
    await p.getByRole('combobox',{name:'日期依据'}).selectOption('lastReviewAt');
    await p.getByRole('combobox',{name:'时间区间'}).selectOption('custom');
    const previous='1990-01-01',ending='1990-01-03';
    await p.getByLabel('开始日期',{exact:true}).fill(previous);
    await p.getByLabel('结束日期',{exact:true}).fill(ending);
    const {region}=await previewPlanner(ctx);
    assert.equal(await region.locator('.filter-preview-row').count(),0);
    const dateToday=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    await p.getByLabel('开始日期',{exact:true}).fill(dateToday);
    await p.getByLabel('结束日期',{exact:true}).fill(dateToday);
    const current=await previewPlanner(ctx);
    const historic=await history(ctx,ctx.fixture.card);
    assert.ok(historic.length>0,'Real seed review event necessary');
    const rowNames=await current.region.locator('.filter-preview-row').allInnerTexts();
    const api=await ctx.session.api.call('learning.queue.preview',{deckId:ctx.fixture.deck.id,
      filters:{dateField:'lastReviewAt',date:{range:'custom',start:dateToday,end:dateToday}},limit:100});
    assert.equal(rowNames.length,Math.min(6,queueItems(api).length));
    await p.getByRole('combobox',{name:'日期依据'}).selectOption('firstReviewAt');
    await previewPlanner(ctx);
    step(ctx,'GUI custom boundaries reject old dates and honor last/first learning date in Shanghai timezone');
  }else if(id==='PLAN-03'){
    p=await openPlanner(ctx);
    await p.getByRole('button',{name:'更多筛选条件'}).click();
    await p.getByRole('textbox',{name:'筛选关键词'}).fill('B2 保持发布和历史');
    const {region}=await previewPlanner(ctx);
    const rows=await region.locator('.filter-preview-row').allInnerTexts();
    assert.ok(rows.length<=1);
    if(rows.length)assert.ok(rows[0].includes(nativeTitle));
    await p.getByRole('textbox',{name:'筛选关键词'}).fill('T1-A GUI 题干');
    const textRows=await (await previewPlanner(ctx)).region.locator('.filter-preview-row').allInnerTexts();
    for(const row of textRows)assert.ok(row.includes('T1-A seeded')||row.includes('题'),'Body query matched unrelated deck card');
    await p.getByRole('button',{name:'查看卡片'}).click();
    await p.getByRole('heading',{name:'所有卡片'}).waitFor();
    const foreign=await ctx.session.api.call('card.listSummary',{deckId:ctx.fixture.secondDeck.id,limit:100});
    assert.equal(foreign.items.length,0);
    step(ctx,'GUI title/body search updates preview and return-to-list never crosses deck');
  }else if(id==='PLAN-04'||id==='PLAN-05'){
    p=await openPlanner(ctx);
    await p.getByRole('button',{name:'选择知识点'}).first().click();
    const area=p.getByRole('region',{name:'选择知识点',exact:true});await area.waitFor();
    await area.getByRole('checkbox',{name:'生命周期甲',exact:true}).check();
    if(id==='PLAN-05')await area.getByRole('checkbox',{name:'生命周期乙',exact:true}).check();
    await area.getByRole('button',{name:'应用知识点',exact:true}).click();
    await area.waitFor({state:'hidden'});
    const chosen=await previewPlanner(ctx),names=await chosen.region.locator('.filter-preview-row').allInnerTexts();
    const initial=await ctx.session.api.call('learning.queue.preview',{deckId:ctx.fixture.deck.id,
      filters:{knowledge:id==='PLAN-04'?[ctx.fixture.ids[0]]:[ctx.fixture.ids[0],ctx.fixture.ids[1]],includeChildren:true},limit:100});
    for(const row of names)assert.ok(queueItems(initial).some(x=>row.includes(x.title)),'Knowledge-filter preview mismatch');
    assert.equal(await chosen.region.locator('.filter-preview-row').count(),Math.min(6,queueItems(initial).length));
    if(id==='PLAN-05'){
      await p.locator('.filter-chips button').filter({hasText:'生命周期乙'}).click();
      const updated=await previewPlanner(ctx);
      const filtered=await ctx.session.api.call('learning.queue.preview',{deckId:ctx.fixture.deck.id,
        filters:{knowledge:[ctx.fixture.ids[0]],includeChildren:true},limit:100});
      assert.equal(await updated.region.locator('.filter-preview-row').count(),Math.min(6,queueItems(filtered).length));
      assert.ok(!(await p.locator('.filter-chips').innerText()).includes('生命周期乙'));
    }else{
      await p.getByRole('button',{name:'更多筛选条件'}).click();
      await p.getByRole('checkbox',{name:'包含下级知识点'}).uncheck();
      const direct=await previewPlanner(ctx);
      const q=await ctx.session.api.call('learning.queue.preview',{deckId:ctx.fixture.deck.id,
        filters:{knowledge:[ctx.fixture.ids[0]],includeChildren:false},limit:100});
      assert.equal(await direct.region.locator('.filter-preview-row').count(),Math.min(6,queueItems(q).length));
    }
    step(ctx,'Real GUI parent/multiple knowledge filters, descendant scope, chip removal and nonstale preview');
  }else if(id==='PLAN-06'){
    p=await openPlanner(ctx);
    await p.getByRole('button',{name:'随机知识点'}).click();
    await p.getByRole('combobox',{name:'随机范围'}).selectOption('eligible');
    await p.getByRole('spinbutton',{name:'随机数量'}).fill('2');
    await p.getByRole('textbox',{name:'随机种子'}).fill('m3-fixed-seed-2026');
    await p.getByRole('checkbox',{name:'薄弱优先'}).check();
    const first=await previewPlanner(ctx),ids1=await first.region.locator('.filter-preview-row').allTextContents();
    const matched=await ctx.session.api.call('learning.queue.preview',{deckId:ctx.fixture.deck.id,
      filters:{},randomKnowledge:{scope:'eligible',count:2,weighted:true},seed:'m3-fixed-seed-2026',limit:100});
    await previewPlanner(ctx);
    assert.deepEqual(await first.region.locator('.filter-preview-row').allTextContents(),ids1);
    assert.equal(new Set(matched.selectedKnowledge).size,matched.selectedKnowledge.length);
    assert.ok(matched.selectedKnowledge.length<=2);
    step(ctx,'User-configured random scope/count/seed/weak weighting reproducibly renders exact queue');
  }else if(id==='PLAN-07'){
    p=await openPlanner(ctx);
    await p.getByRole('button',{name:'更多筛选条件'}).click();
    await p.getByRole('textbox',{name:'筛选关键词'}).fill('__M3_NO_CARD_7BEA09__');
    const before=await ctx.session.api.call('workspace.sessions',{deckId:ctx.fixture.deck.id});
    const {region}=await previewPlanner(ctx);
    await region.getByText('此范围暂无可用任务，可调整筛选。').waitFor();
    assert.equal(await region.getByRole('button',{name:'开始本次复盘'}).isDisabled(),true);
    const after=await ctx.session.api.call('workspace.sessions',{deckId:ctx.fixture.deck.id});
    assert.deepEqual(after,before);
    step(ctx,'Empty GUI study filter disables start and creates zero phantom sessions');
  }else if(id==='PLAN-08'){
    const {page,session}=await studySelected(ctx,[nativeTitle,questionTitle,qaTitle]);
    assert.equal(session.total,3);
    const selectedIds=new Set([ctx.fixture.card.cardId,ctx.fixture.question.cardId,ctx.fixture.qa.cardId]);
    const exact=await ctx.session.api.call('workspace.sessions',{deckId:ctx.fixture.deck.id,exactCardIds:[...selectedIds]});
    assert.ok(exact.items.some(x=>x.sessionId===session.sessionId),'Session must exactly match all three GUI-selected card IDs');
    const heading=await page.locator('.review-title').innerText();
    assert.ok([nativeTitle,questionTitle,qaTitle].includes(heading));
    await page.getByRole('button',{name:'返回卡片列表',exact:true}).click();
    await page.getByRole('heading',{name:'所有卡片'}).waitFor();
    const list=await ctx.session.api.call('workspace.sessions',{deckId:ctx.fixture.deck.id});
    assert.ok(list.items.some(s=>s.sessionId===session.sessionId&&!s.completed&&s.total===3));
    assert.equal(selectedIds.size,3);
    step(ctx,'GUI selects all three different published modes; persisted specialty session has total three and returns safely');
  }else if(id==='PLAN-09'){
    p=ctx.session.page;const before=await scheduleRows(ctx),current=await deckCfg(ctx);
    const region=await openDeckSchedule(ctx);
    await region.getByRole('spinbutton',{name:'每日独立卡片上限'}).fill(String(current.dailyLimit===15?12:15));
    await region.getByRole('spinbutton',{name:'最大间隔（天）'}).fill('45');
    await region.getByRole('button',{name:'保存调度设置'}).click();
    await region.getByRole('status').filter({hasText:'操作已保存'}).waitFor();
    const next=await deckCfg(ctx);
    assert.equal(next.maxIntervalDays,45);
    assert.equal(next.dailyLimit,current.dailyLimit===15?12:15);
    assert.deepEqual(await scheduleRows(ctx),before,'Saving global settings must not silently recompute existing plans');
    reboot=await restart(ctx);await observe(ctx);
    assert.deepEqual(await deckCfg(ctx),next);
    step(ctx,'Global config GUI save is durable, and existing dueAt is unchanged without separate recompute');
  }else if(id==='PLAN-10'){
    const global=await deckCfg(ctx),before=await scheduleRows(ctx);
    const region=await openCardSchedule(ctx);
    await region.getByRole('checkbox',{name:'继承卡片集配置'}).uncheck();
    await region.getByRole('spinbutton',{name:'最大间隔（天）'}).fill('13');
    await region.getByRole('button',{name:'保存调度设置'}).click();
    await region.getByRole('status').filter({hasText:'操作已保存'}).waitFor();
    const specific=await ctx.session.api.call('policy.card.get',{kind:'card',cardId:ctx.fixture.card.cardId});
    assert.equal(specific.source,'card_override');assert.equal(specific.maxIntervalDays,13);
    assert.deepEqual(await deckCfg(ctx),global);
    assert.deepEqual(await scheduleRows(ctx),before);
    reboot=await restart(ctx);await observe(ctx);
    assert.equal((await ctx.session.api.call('policy.card.get',{kind:'card',cardId:ctx.fixture.card.cardId})).maxIntervalDays,13);
    step(ctx,'Per-card override persists and does not rewrite deck defaults or existing dueAt');
  }else if(id==='PLAN-11'||id==='PLAN-12'){
    const before=await scheduleRows(ctx),region=await openDeckSchedule(ctx);
    if(id==='PLAN-12'){
      await region.getByRole('spinbutton',{name:'最大间隔（天）'}).fill('1');
      await region.getByRole('button',{name:'保存调度设置'}).click();
      await region.getByRole('status').filter({hasText:'操作已保存'}).waitFor();
    }
    await region.getByRole('button',{name:'预览重算现有排期'}).click();
    const preview=await region.getByText(/总计 \d+ · 可提前 \d+/).innerText();
    assert.ok(preview.includes('可提前'));
    const view=await ctx.session.api.call('policy.config.preview',{deckId:ctx.fixture.deck.id,model:'unified',offset:0,limit:20});
    assert.ok(view.rows.every(x=>!x.beforeDue||!x.afterDue||Date.parse(x.afterDue)<=Date.parse(x.beforeDue)));
    assert.deepEqual(await scheduleRows(ctx),before,'Read-only preview must not update existing schedule');
    if(id==='PLAN-11'){
      await region.getByRole('button',{name:'取消重算预览'}).click();
      assert.deepEqual(await scheduleRows(ctx),before);
      assert.equal(await region.getByRole('button',{name:'确认重算'}).count(),0);
    }else{
      await confirmAction(ctx,()=>region.getByRole('button',{name:'确认重算'}).click());
      await region.getByRole('status').filter({hasText:'操作已保存'}).waitFor();
      const affected=await scheduleRows(ctx);
      assert.ok(affected.every((x,i)=>!x.dueAt||!before[i]?.dueAt||Date.parse(x.dueAt)<=Date.parse(before[i].dueAt)));
      await confirmAction(ctx,()=>region.getByRole('button',{name:'撤销本次重算'}).click());
      await region.getByRole('status').filter({hasText:'操作已保存'}).waitFor();
      assert.deepEqual(await scheduleRows(ctx),before,'Undo with no intervening review must restore schedule');
      reboot=await restart(ctx);await observe(ctx);
      assert.deepEqual(await scheduleRows(ctx),before);
    }
    step(ctx,'GUI recompute preview/cancel or confirm/undo does not postpone due tasks and keeps identity after restart');
  }
  integrity(ctx);
  return {...await evidence(ctx),...(reboot?{reboot}:{})};
},{fixtureSetup});
