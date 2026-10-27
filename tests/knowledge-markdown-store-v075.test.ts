import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {parseMarkedMarkdown,serializeMarkedMarkdown,type MarkdownForestNode} from '../shared/knowledge/markdown.ts';
import {validateUnifiedData} from '../electron/infrastructure/migrations/unified-integrity.ts';
import {createApplicationProtocol} from '../electron/protocol/gateway.ts';
import {Application} from '../electron/application.ts';
import {createClient} from '../shared/protocol/client.ts';
import {stageMarkdownSource,savePreparedMarkdown} from '../electron/modules/knowledge-unified/markdown-exchange.ts';
const code=(name:string)=>(e:unknown)=>e instanceof Error&&'code' in e&&e.code===name;
const marked=readFileSync(new URL('./fixtures/v075-md-marked.md',import.meta.url),'utf8');
type Fixture=Awaited<ReturnType<typeof unifiedWorkspaceFixture>>;
async function preview(f:Fixture,text=marked,parentId:string|null=null,policies:Record<string,'keep'|'replace'|'append'>={}){
 const deckId=f.source.ids.qDeck,source=await f.client.call('knowledge.md.source.text',{deckId,markdown:text});
 return f.client.call('knowledge.md.import.preview',{deckId,sourceToken:source.sourceToken,parentId,policies});
}
const simple=(body:string)=>serializeMarkedMarkdown([{key:'r',parentKey:null,name:'导入根',position:0,markdown:body,line:1}]);
test('T28/T31 native Markdown preview/diff is read-only; confirm writes one scoped tree and duplicate import defaults to keep',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const initial=await f.client.call('knowledge.tree.read',{deckId:f.source.ids.qDeck}),cards=f.ctx.db.prepare('SELECT count(*) n FROM learning_cards').get()!.n;
  const p=await preview(f);assert.equal(p.created,4);assert.equal(p.total,4);assert.deepEqual(await f.client.call('knowledge.tree.read',{deckId:p.deckId}),initial);
  const diff=await f.client.call('knowledge.md.import.diff',{deckId:p.deckId,previewToken:p.previewToken,key:p.rows[0].key});assert.equal(diff.before,'');assert.match(diff.after,/## 正文中的常见考点/);
  const req=f.client.prepare('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:p.previewToken}),done=await f.client.send(req);assert.equal(done.created,4);assert.deepEqual(await f.client.send(req),done);
  const duplicate=await preview(f);assert.equal(duplicate.created,0);assert.equal(duplicate.kept,4);await f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:duplicate.previewToken});
  assert.equal(f.ctx.db.prepare('SELECT count(*) n FROM learning_cards').get()!.n,cards);validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
test('T31 same complete path keeps/replaces/appends explicitly, preserves identities and rejects a stale body/tree preview',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  let p=await preview(f,simple('原正文'));await f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:p.previewToken});const id=p.rows[0].nodeId;
  p=await preview(f,simple('新正文'));assert.equal(p.kept,1);assert.equal((await f.client.call('knowledge.md.import.diff',{deckId:p.deckId,previewToken:p.previewToken,key:p.rows[0].key})).after,'原正文');
  p=await preview(f,simple('新正文'),null,{'md:0':'append'});assert.equal(p.updated,1);await f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:p.previewToken});
  let node=await f.client.call('knowledge.node.read',{deckId:p.deckId,nodeId:id});assert.equal(node.markdown,'原正文\n\n新正文');
  p=await preview(f,simple('替换正文'),null,{'md:0':'replace'});assert.equal(p.rows[0].nodeId,id);await f.client.call('knowledge.node.save',{deckId:p.deckId,nodeId:id,expectedRevision:node.revision,markdown:'并发编辑'});
  await assert.rejects(()=>f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:p.previewToken}),code('MARKDOWN_PREVIEW_STALE'));
  p=await preview(f,simple('替换正文'),null,{'md:0':'replace'});await f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:p.previewToken});assert.equal((await f.client.call('knowledge.node.read',{deckId:p.deckId,nodeId:id})).markdown,'替换正文');
 }finally{f.close();}
});
test('T31 import receipt failure rolls back all new identities/bodies and the original request retries once; scope/expiry/restart fail closed',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const p=await preview(f),before=await f.client.call('knowledge.tree.read',{deckId:p.deckId}),req=f.client.prepare('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:p.previewToken});
  f.ctx.db.exec("CREATE TEMP TRIGGER reject_md_receipt BEFORE INSERT ON protocol_receipts WHEN NEW.method='knowledge.md.import.confirm' BEGIN SELECT RAISE(ABORT,'synthetic MD import receipt failure'); END");
  await assert.rejects(()=>f.client.send(req));assert.deepEqual(await f.client.call('knowledge.tree.read',{deckId:p.deckId}),before);f.ctx.db.exec('DROP TRIGGER reject_md_receipt');await f.client.send(req);
  await assert.rejects(()=>f.client.call('knowledge.md.import.page',{deckId:f.source.ids.mDeck,previewToken:p.previewToken,offset:0}),code('MARKDOWN_PREVIEW_STALE'));
  const expired=await preview(f,simple('到期'));f.advance(300001);await assert.rejects(()=>f.client.call('knowledge.md.import.confirm',{deckId:expired.deckId,previewToken:expired.previewToken}),code('MARKDOWN_PREVIEW_STALE'));
  const reopened=await preview(f,simple('重开'));f.reopen();await assert.rejects(()=>f.client.call('knowledge.md.import.confirm',{deckId:reopened.deckId,previewToken:reopened.previewToken}),code('MARKDOWN_PREVIEW_STALE'));
 }finally{f.close();}
});
test('T30 selected cross-branch export includes necessary ancestor headings but omits unselected parent bodies; real store round-trip matches',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const p=await preview(f);await f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:p.previewToken});
  const root=p.rows.find(r=>r.path.at(-1)==='逻辑填空')!,child=p.rows.find(r=>r.path.at(-1)==='语境分析')!,other=p.rows.find(r=>r.path.at(-1)==='资料分析')!;
  const exported=await f.client.call('knowledge.md.export.preview',{deckId:p.deckId,nodeIds:[child.nodeId,other.nodeId],includeDescendants:false,includeParentBodies:false});
  const parsed=parseMarkedMarkdown(exported.markdown);assert.equal(parsed.length,3);assert.equal(parsed.find(n=>n.name==='逻辑填空')!.markdown,'');assert.ok(parsed.find(n=>n.name==='语境分析')!.markdown);assert.equal(parsed.some(n=>n.name==='词义辨析'),false);
  const withParents=await f.client.call('knowledge.md.export.preview',{deckId:p.deckId,nodeIds:[child.nodeId],includeParentBodies:true});assert.match(withParents.markdown,/正文中的常见考点/);
  const source=await f.client.call('knowledge.md.source.text',{deckId:f.source.ids.mDeck,markdown:exported.markdown}),reimport=await f.client.call('knowledge.md.import.preview',{deckId:f.source.ids.mDeck,sourceToken:source.sourceToken,parentId:null});
  await f.client.call('knowledge.md.import.confirm',{deckId:reimport.deckId,previewToken:reimport.previewToken});
  for(const row of reimport.rows)assert.equal((await f.client.call('knowledge.node.read',{deckId:reimport.deckId,nodeId:row.nodeId})).markdown,parsed.find(n=>n.name===row.path.at(-1))!.markdown);
  const subtree=await f.client.call('knowledge.md.export.preview',{deckId:p.deckId,nodeIds:[root.nodeId],includeDescendants:true});assert.equal(subtree.nodeCount,3);validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
test('T30 bounded metadata pages and explicit ordinary Markdown title selection never send all bodies or silently promote candidates',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const deckId=f.source.ids.qDeck,external=Array.from({length:120},(_,i)=>'# 候选'+i+'\n\n正文'+i).join('\n\n'),source=await f.client.call('knowledge.md.source.text',{deckId,markdown:external});
  assert.equal(source.headingTotal,120);assert.equal(source.headings.length,100);const rest=await f.client.call('knowledge.md.source.headings',{deckId,sourceToken:source.sourceToken,offset:100});assert.equal(rest.headings.length,20);
  await assert.rejects(()=>f.client.call('knowledge.md.import.preview',{deckId,sourceToken:source.sourceToken,parentId:null}),code('MARKDOWN_SELECTION_REQUIRED'));
  const p=await f.client.call('knowledge.md.import.preview',{deckId,sourceToken:source.sourceToken,parentId:null,selectedLines:[...source.headings,...rest.headings].map(n=>n.line)});assert.equal(p.rows.length,50);assert.equal(p.total,120);assert.ok(p.rows.every(r=>!('before' in r)&&!('after' in r)));
  const next=await f.client.call('knowledge.md.import.page',{deckId,previewToken:p.previewToken,offset:p.nextOffset!});assert.equal(next.rows.length,50);assert.equal(new Set([...p.rows,...next.rows].map(r=>r.key)).size,100);
 }finally{f.close();}
});
test('T30 one prepared export supplies identical clipboard/file bytes; unknown file receipt cannot automatically write a second file',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const p=await preview(f,simple('文件正文'));await f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:p.previewToken});
  let clipboard='',writes=0;const target=join(f.source.root,'synthetic-knowledge.md');
  const host=createApplicationProtocol(new Application(f.ctx),undefined,{'knowledge.md.export.save':async input=>{writes++;return savePreparedMarkdown(f.ctx,input as {deckId:string;exportToken:string},target);}},undefined,{readText:()=>clipboard,writeText:text=>{clipboard=text;}});
  const client=createClient(r=>host.execute(r));await client.call('app.capabilities',{});
  const exp=await client.call('knowledge.md.export.preview',{deckId:p.deckId,nodeIds:[p.rows[0].nodeId]});await client.call('knowledge.md.export.copy',{deckId:p.deckId,exportToken:exp.exportToken});
  f.ctx.db.exec("CREATE TEMP TRIGGER reject_md_file_receipt BEFORE INSERT ON protocol_receipts WHEN NEW.method='knowledge.md.export.save' BEGIN SELECT RAISE(ABORT,'synthetic MD export receipt failure'); END");
  const req=client.prepare('knowledge.md.export.save',{deckId:p.deckId,exportToken:exp.exportToken});await assert.rejects(()=>client.send(req),code('OPERATION_UNKNOWN'));assert.equal(existsSync(target),true);assert.equal(readFileSync(target,'utf8'),clipboard);
  await assert.rejects(()=>client.send(req),code('OPERATION_UNKNOWN'));assert.equal(writes,1);
 }finally{f.close();}
});
