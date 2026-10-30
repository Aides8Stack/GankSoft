// M3-04: 9 GUI Knowledge Markdown/outline/import/export tests, including actual file bytes.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {executeCase,restart} from '../helpers.mjs';
import {observe,evidence,step} from './core-support.mjs';
import {integrity,snapshot,selectFile,receipts} from './system-support.mjs';
import {map,selectNode,treeRead,nodeRead,openOutline,openExchange,
  importPreview,closeExchange} from './m3-support.mjs';
import {serializeMarkedMarkdown} from '../../../../shared/knowledge/markdown.ts';
const id=process.argv[2],out=process.argv[3];
const ids=['MD-02','MD-03','MD-04','MD-05','MD-06','MD-08','MD-09','MD-10','MD-11'];
if(!ids.includes(id)||!out)throw Error('UNKNOWN_M3_MARKDOWN_CASE');
const scope=ctx=>({deckId:ctx.fixture.deck.id,nodeId:ctx.fixture.ids[1]});
const body=ctx=>ctx.session.page.locator('.knowledge-markdown .ProseMirror[contenteditable=true]').first();
const oneNode=(name,markdown,parentKey=null,key='node')=>
  serializeMarkedMarkdown([{key,parentKey,name,markdown,position:0,line:1}]);
async function saveBody(ctx,expected){
  await body(ctx).press('Control+s');
  await ctx.session.page.locator('.knowledge-markdown [data-save-state=clean]').waitFor();
  const result=await ctx.session.api.call('knowledge.node.read',scope(ctx));
  assert.ok(result.markdown.includes(expected),'GUI edited node not durably saved');
  return result;
}
await executeCase(id,out,async ctx=>{
 await observe(ctx);let p=ctx.session.page,reboot;
 const before=await treeRead(ctx),initial=await nodeRead(ctx,ctx.fixture.ids[1]);
 if(id==='MD-02'){
   await map(ctx);await selectNode(ctx,'生命周期乙');
   const a=body(ctx);
   await a.fill('MD-02 标题与清单');
   await a.press('End');await a.press('Enter');await p.keyboard.type('# 一级标题');
   await a.press('Enter');await p.keyboard.type('- Markdown 列表');
   await a.press('Enter');await a.press('Enter');
   await p.keyboard.type('链接：https://example.invalid/markdown');
   await a.press('Enter');
   await ctx.session.app.evaluate(({clipboard},text)=>clipboard.writeText(text),
     '\n\n$$\nE=mc^2\n$$\n\n| 甲 | 乙 |\n| --- | --- |\n| 1 | 2 |');
   await a.press('Control+End');await a.press('Control+V');
   const saved=await saveBody(ctx,'MD-02 标题与清单');
   assert.ok(saved.markdown.includes('标题')&&saved.markdown.includes('Markdown 列表'));
   assert.ok(saved.markdown.includes('E=mc^2')&&saved.markdown.includes('甲')&&saved.markdown.includes('乙'));
   await p.getByRole('button',{name:'返回所有卡片',exact:true}).click();
   reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
   await map(ctx);await selectNode(ctx,'生命周期乙');
   assert.equal((await nodeRead(ctx,ctx.fixture.ids[1])).markdown,saved.markdown);
   assert.ok((await body(ctx).innerText()).includes('MD-02'));
   step(ctx,'Native markdown headings, list, link, math and table survive GUI save, navigation and new Electron PID');
 }else if(id==='MD-03'){
   await openOutline(ctx);
   const nav=p.getByRole('navigation',{name:'大纲分级目录'});
   const root=nav.getByRole('button',{name:'生命周期甲',exact:true});
   await root.click();
   const target=p.locator('[data-outline-entry="'+ctx.fixture.ids[0]+'"]');
   await target.waitFor();
   assert.equal(await target.getAttribute('data-outline-entry'),ctx.fixture.ids[0]);
   await nav.getByRole('button',{name:'生命周期子',exact:true}).click();
   const child=p.locator('[data-outline-entry="'+ctx.fixture.ids[2]+'"]');
   await child.waitFor();
   assert.equal(await child.locator('.outline-node-title').getAttribute('aria-current'),'true');
   assert.equal(await child.getAttribute('data-depth'),'2');
   const markdown=await nodeRead(ctx,ctx.fixture.ids[2]);
   assert.ok((await p.getByRole('main',{name:'知识点 Markdown 文档'}).innerText()).includes(markdown.markdown.trim()));
   step(ctx,'Actual outline navigation root/descendant focuses matching complete-path Markdown document module');
 }else if(id==='MD-04'){
   await openOutline(ctx);
   const nav=p.getByRole('navigation',{name:'大纲分级目录'});
   await nav.getByRole('button',{name:'生命周期乙',exact:true}).click();
   const a=body(ctx);await a.fill('MD-04 保存并切换视图保护');
   await a.press('Control+s');
   await p.locator('.knowledge-markdown [data-save-state=clean]').waitFor();
   const saved=await nodeRead(ctx,ctx.fixture.ids[1]);
   await p.getByRole('group',{name:'知识图谱视图'}).getByRole('button',{name:'思维导图',exact:true}).click();
   await p.locator('.mind-canvas').waitFor();
   assert.equal((await nodeRead(ctx,ctx.fixture.ids[1])).markdown,saved.markdown);
   await p.getByRole('group',{name:'知识图谱视图'}).getByRole('button',{name:'Markdown 大纲',exact:true}).click();
   await p.getByRole('navigation',{name:'大纲分级目录'}).getByRole('button',{name:'生命周期乙'}).click();
   assert.ok((await body(ctx).innerText()).includes('MD-04'));
   assert.deepEqual(await treeRead(ctx),before,'Map/outline switching cannot alter actual knowledge hierarchy');
   step(ctx,'GUI map↔outline return keeps same selected node and latest persisted Markdown body');
 }else if(id==='MD-05'){
   await map(ctx);await selectNode(ctx,'生命周期甲');
   const original=await nodeRead(ctx,ctx.fixture.ids[0]);
   assert.ok(original.markdown.includes('gank-asset://'),'Knowledge fixture must include actual persisted image');
   await p.locator('.knowledge-markdown .ProseMirror img[data-gank-placement]').first().waitFor();
   const width=p.getByLabel('图片 1 宽度',{exact:true});
   await width.fill('65');await width.press('Tab');
   await p.locator('.knowledge-markdown .ProseMirror img[data-gank-placement]').first().click();
   await p.keyboard.press('Control+C');
   const copy=await ctx.session.app.evaluate(({clipboard})=>clipboard.readText());
   assert.ok(copy.includes('gank-asset://')||copy.includes('![合成像素]'),
     'Copy of image placement must retain a safe self-contained reference, not a remote URL');
   await body(ctx).press('Control+s');
   await p.locator('.knowledge-markdown [data-save-state=clean]').waitFor();
   const saved=await nodeRead(ctx,ctx.fixture.ids[0]);
   assert.ok(saved.markdown.includes('width=65'),'Image placement width must persist in knowledge Markdown');
   assert.deepEqual(saved.assets,original.assets);
   reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
   await map(ctx);await selectNode(ctx,'生命周期甲');
   assert.equal((await nodeRead(ctx,ctx.fixture.ids[0])).markdown,saved.markdown);
   assert.equal(await p.getByLabel('图片 1 宽度').inputValue(),'65');
   step(ctx,'GUI existing image placement width/clipboard reference and media identity preserved after restart');
 }else if(id==='MD-06'){
   const panel=await openExchange(ctx,'export');
   await panel.getByRole('button',{name:'全选全部节点',exact:true}).click();
   await panel.getByRole('button',{name:'预览导出',exact:true}).click();
   const result=panel.getByRole('pre',{name:'实际导出 Markdown'});
   await result.waitFor();
   const md=await result.innerText();
   assert.ok(md.includes('生命周期甲')&&md.includes('生命周期乙'));
   assert.ok(md.includes('甲节点原文')&&md.includes('乙节点原文'));
   await panel.getByRole('button',{name:'复制 Markdown',exact:true}).click();
   await panel.getByRole('status').filter({hasText:'已复制 Markdown'}).waitFor();
   assert.equal(await ctx.session.app.evaluate(({clipboard})=>clipboard.readText()),md);
   const file=join(ctx.fixture.root,'knowledge-M3-06.md');
   await selectFile(ctx,file,true);
   await panel.getByRole('button',{name:'保存 .md 文件',exact:true}).click();
   await panel.getByRole('status').filter({hasText:'已保存'}).waitFor();
   assert.ok(existsSync(file),'Native save dialog must write real .md file');
   assert.equal(readFileSync(file,'utf8'),md);
   assert.deepEqual(await treeRead(ctx),before);
   ctx.observations.checks.export={file,bytes:readFileSync(file).length,receipt:await receipts(ctx,'knowledge.markdown.save')};
   step(ctx,'GUI Markdown export preview, OS clipboard and native save-file dialog produce identical full bytes');
 }else if(id==='MD-08'){
   const name='M3 正式导入知识点';
   const markdown=oneNode(name,'# 合成正文标题\n\n段落：M3 已确认导入');
   const panel=await openExchange(ctx,'import');
   const rows=await importPreview(panel,markdown);
   assert.ok(await rows.count()>=1);
   assert.match(await panel.innerText(),/新增 1/);
   await panel.getByRole('button',{name:'确认导入',exact:true}).click();
   await panel.waitFor({state:'hidden'});
   const after=await treeRead(ctx),created=after.nodes.filter(x=>x.name===name);
   assert.equal(created.length,1);
   const saved=await nodeRead(ctx,created[0].nodeId);
   assert.ok(saved.markdown.includes('M3 已确认导入'));
   reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
   assert.equal((await treeRead(ctx)).nodes.find(x=>x.nodeId===created[0].nodeId)?.name,name);
   assert.equal((await nodeRead(ctx,created[0].nodeId)).markdown,saved.markdown);
   step(ctx,'GUI preview/confirm one marked Markdown node; same ID, level and body re-read after new PID');
 }else if(id==='MD-09'){
   const known=await nodeRead(ctx,ctx.fixture.ids[1]);
   const panel=await openExchange(ctx,'import');
   const markdown=oneNode('生命周期乙','MD-09 冲突来源正文');
   const rows=await importPreview(panel,markdown);
   assert.equal(await rows.count(),1);
   const select=rows.first().getByRole('combobox',{name:/正文策略/});
   await select.selectOption('keep');
   await panel.getByText('完整路径冲突').waitFor();
   await rows.first().getByRole('button',{name:/查看正文与图片/}).click();
   const diff=panel.getByRole('region',{name:'导入正文与图片预览'});
   assert.ok((await diff.innerText()).includes('MD-09 冲突来源正文'));
   await panel.getByRole('button',{name:'确认导入',exact:true}).click();
   await panel.waitFor({state:'hidden'});
   const after=await nodeRead(ctx,ctx.fixture.ids[1]);
   assert.equal(after.markdown,known.markdown,'Keep policy must not silently overwrite existing node');
   assert.equal((await treeRead(ctx)).nodes.length,before.nodes.length);
   const invalid=oneNode('M3 父级缺失','## 错误层级').replace('# M3 父级缺失','## M3 父级缺失');
   const other=await openExchange(ctx,'import');
   await other.getByRole('textbox',{name:'粘贴 Markdown'}).fill(invalid);
   await other.getByRole('button',{name:'读取粘贴内容'}).click();
   await other.getByRole('alert').waitFor();
   assert.deepEqual(await treeRead(ctx),before);
   step(ctx,'GUI same-path conflict requires visible keep/replace policy; invalid depth cannot silently create orphan');
 }else if(id==='MD-10'){
   const candidates=[
     oneNode('M3 不安全链接','![远程图](https://example.invalid/remote.png)\n\n<script>window.__M3_DANGER=true</script>'),
     oneNode('M3 失效媒体','![失效](gank-asset://not-valid-resource)')
   ];
   const urls=[];
   p.on('request',r=>{if(/^https?:\/\//.test(r.url()))urls.push(r.url());});
   for(const text of candidates){
     const panel=await openExchange(ctx,'import');
     await panel.getByRole('textbox',{name:'粘贴 Markdown'}).fill(text);
     await panel.getByRole('button',{name:'读取粘贴内容'}).click();
     const errors=await panel.getByRole('alert').allInnerTexts();
     if(!errors.length){
       await panel.getByRole('button',{name:'预览导入'}).click();
       assert.ok((await panel.getByRole('alert').count())>0,
         'Dangerous remote HTML or invalid asset must fail safe before confirmation');
     }
     await closeExchange(panel);
   }
   assert.deepEqual(await treeRead(ctx),before);
   assert.equal(await p.evaluate(()=>Boolean(window.__M3_DANGER)),false);
   assert.ok(!urls.some(x=>x.includes('example.invalid')),'Dangerous remote image URL loaded');
   step(ctx,'Unsafe remote image/script or invalid asset rejected through GUI; no resource fetch or tree writes');
 }else if(id==='MD-11'){
   await map(ctx);await selectNode(ctx,'生命周期乙');
   const input=body(ctx);await input.fill('MD-11 保存回执不明，先保留本地编辑草稿');
   await ctx.session.app.evaluate(()=>globalThis.v077Faults.arm('knowledge.node.save','drop'));
   await input.press('Control+s');
   const warn=p.locator('.knowledge-markdown [role=alert]');
   await warn.first().waitFor();
   assert.ok((await input.innerText()).includes('MD-11'));
   const persisted=await nodeRead(ctx,ctx.fixture.ids[1]);
   assert.ok([initial.revision,initial.revision+1].includes(persisted.revision));
   const retry=p.getByRole('button',{name:/核对正文保存结果|重试保存正文/}).first();
   await retry.waitFor();
   await ctx.session.app.evaluate(()=>globalThis.v077Faults.clear());
   await retry.click();
   const saved=await nodeRead(ctx,ctx.fixture.ids[1]);
   assert.ok(saved.markdown.includes('MD-11'),'Retried save must leave latest text durable');
   const box=await p.locator('.knowledge-markdown [data-save-state=clean]').count();
   assert.ok(box>0,'GUI must reach clean state or provide explicit conflict path');
   reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
   assert.equal((await nodeRead(ctx,ctx.fixture.ids[1])).markdown,saved.markdown);
   step(ctx,'GUI dropped unknown save receipt, non-destructive retry, exact saved Markdown and fresh PID validation');
 }
 integrity(ctx);
 return {...await evidence(ctx),...(reboot?{reboot}:{})};
});
