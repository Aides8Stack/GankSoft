import assert from 'node:assert/strict';
import {executeCase,enterCards,restart,exitEditorToList} from '../helpers.mjs';
import {snapshot} from '../../r7/support.ts';
import {serializeMarkedMarkdown} from '../../../../shared/knowledge/markdown.ts';
import {observe,evidence,step,directFixture,directTitle} from './core-support.mjs';
import {map,leaveMap,selectNode,nameNew,reviewDirect} from './module-support.mjs';
const id=process.argv[2],out=process.argv[3];
if(!['KNOW-02','KNOW-11','MD-01','MD-07'].includes(id)||!out)throw Error('UNSUPPORTED_KNOWLEDGE_CASE');
await executeCase(id,out,async ctx=>{
  await observe(ctx);let p=ctx.session.page;const scope={deckId:ctx.fixture.deck.id};
  const tree=()=>ctx.session.api.call('knowledge.tree.read',scope);
  if(id==='KNOW-11'){
    await enterCards(ctx);await p.getByRole('button',{name:'编辑 '+directTitle,exact:true}).click();
    await p.getByRole('button',{name:'选择知识点',exact:true}).click();
    const d=p.getByRole('dialog',{name:'选择知识点关联',exact:true});
    await d.getByRole('checkbox',{name:'生命周期甲',exact:true}).check();await d.getByRole('checkbox',{name:'生命周期乙',exact:true}).check();
    await d.getByRole('button',{name:'确认关联',exact:true}).click();await d.waitFor({state:'hidden'});
    const links=await ctx.session.api.call('knowledge.cardLinks.get',ctx.fixture.direct);assert.deepEqual([...links.nodeIds].sort(),ctx.fixture.ids.slice(0,2).sort());
    await exitEditorToList(ctx);const event=await reviewDirect(ctx,directTitle,ctx.fixture.direct);await map(ctx);
    for(const [i,name] of ['生命周期甲','生命周期乙'].entries()){
      await selectNode(ctx,name);const stats=p.locator('.r5-node-stats');assert.equal((await stats.locator('strong').nth(0).innerText()).trim(),'1');
      const mastery=await ctx.session.api.call('learning.mastery.knowledge',{...scope,nodeId:ctx.fixture.ids[i],scope:'direct'});assert.deepEqual(mastery.cardIds,[ctx.fixture.direct.cardId]);
      const detail=await ctx.session.api.call('learning.history.get',{...ctx.fixture.direct,eventId:event.eventId});assert.ok(detail.native.knowledge.some(k=>k.nodeId===ctx.fixture.ids[i]));
    }
    await leaveMap(ctx);const reboot=await restart(ctx);await observe(ctx);await map(ctx);await selectNode(ctx,'生命周期乙');
    assert.deepEqual(await ctx.session.api.call('knowledge.cardLinks.get',ctx.fixture.direct),links);
    assert.equal((await ctx.session.page.locator('.r5-node-stats strong').first().innerText()).trim(),'1');
    step(ctx,'GUI links one card to two nodes, reviews it, graph shows direct counts and read-only reverse mastery/history snapshots agree after new PID');
    return {...await evidence(ctx),reboot};
  }
  await map(ctx);const before=await tree();
  if(id==='KNOW-02'){
    const name='T1-B GUI root knowledge';await p.getByRole('button',{name:'新增一级知识点',exact:true}).click();await nameNew(p,name);
    const saved=await tree(),created=saved.nodes.filter(n=>n.name===name);assert.equal(created.length,1);assert.equal(created[0].parentId,null);assert.equal(saved.nodes.length,before.nodes.length+1);
    await selectNode(ctx,name);await leaveMap(ctx);const reboot=await restart(ctx);await observe(ctx);await map(ctx);await selectNode(ctx,name);assert.deepEqual(await tree(),saved);
    step(ctx,'GUI adds root, names and saves it; leave/reopen/new PID preserves ID/name/parent and tree');return {...await evidence(ctx),reboot};
  }
  if(id==='MD-01'){
    await selectNode(ctx,'生命周期乙');
    const body=p.locator('.knowledge-markdown .ProseMirror[contenteditable=true]');await body.waitFor();
    await body.fill('T1-B Markdown 正文第一段');await body.press('End');await body.press('Enter');await p.keyboard.type('第二段中文 English 2026');await body.press('Control+s');
    await p.locator('.knowledge-markdown [data-save-state=clean]').waitFor();
    const saved=await ctx.session.api.call('knowledge.node.read',{...scope,nodeId:ctx.fixture.ids[1]});assert.ok(saved.markdown.includes('T1-B Markdown 正文第一段'));assert.ok(saved.markdown.includes('第二段中文 English 2026'));
    await leaveMap(ctx);const reboot=await restart(ctx);await observe(ctx);await map(ctx);await selectNode(ctx,'生命周期乙');
    const text=await ctx.session.page.locator('.knowledge-markdown .ProseMirror[contenteditable=true]').innerText();assert.ok(text.includes('T1-B Markdown 正文第一段'));assert.ok(text.includes('第二段中文 English 2026'));assert.deepEqual(await ctx.session.api.call('knowledge.node.read',{...scope,nodeId:ctx.fixture.ids[1]}),saved);
    step(ctx,'GUI edits multiline Markdown, Ctrl+S shows clean, new PID reopens exact committed body/revision');return {...await evidence(ctx),reboot};
  }
  const diskBefore=snapshot(ctx.fixture);
  await p.getByLabel('更多知识点操作',{exact:true}).click();await p.getByRole('button',{name:'导入知识 Markdown',exact:true}).click();
  const d=p.getByRole('region',{name:/知识 Markdown/});await d.waitFor();
  const markdown=serializeMarkedMarkdown([{key:'t1b',parentKey:null,name:'T1-B cancel import',markdown:'T1-B preview only',position:0,line:1}]);
  await d.getByRole('textbox',{name:'粘贴 Markdown',exact:true}).fill(markdown);await d.getByRole('button',{name:'读取粘贴内容',exact:true}).click();await d.getByRole('button',{name:'预览导入',exact:true}).click();await d.locator('.import-row').first().waitFor();
  await d.getByRole('button',{name:'关闭 Markdown 交换',exact:true}).click();await d.waitFor({state:'hidden'});
  assert.deepEqual(await tree(),before);assert.deepEqual(snapshot(ctx.fixture),diskBefore);
  await leaveMap(ctx);const reboot=await restart(ctx);await observe(ctx);await map(ctx);assert.deepEqual(await tree(),before);assert.deepEqual(snapshot(ctx.fixture),diskBefore);
  step(ctx,'GUI stages Markdown import and preview, cancels; entire database/media snapshot unchanged before and after new PID');return {...await evidence(ctx),reboot};
},{fixtureSetup:id==='KNOW-11'?directFixture:undefined});
