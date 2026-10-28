import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {serializeMarkedMarkdown,parseMarkedMarkdown,type MarkdownForestNode} from '../shared/knowledge/markdown.ts';
import {knowledgePlacements} from '../shared/knowledge/media.ts';
import {validateUnifiedData} from '../electron/infrastructure/migrations/unified-integrity.ts';
type Fixture=Awaited<ReturnType<typeof unifiedWorkspaceFixture>>;
const entry=(key:string,parentKey:string|null,name:string,markdown:string,position=0):MarkdownForestNode=>({key,parentKey,name,markdown,position,line:1});
async function preview(f:Fixture,nodes:MarkdownForestNode[],parentId:string|null=null,policies:Record<string,'keep'|'replace'|'append'>={}){
 const deckId=f.source.ids.qDeck,source=await f.client.call('knowledge.md.source.text',{deckId,markdown:serializeMarkedMarkdown(nodes)});
 return f.client.call('knowledge.md.import.preview',{deckId,sourceToken:source.sourceToken,parentId,policies});
}
function files(f:Fixture){return readdirSync(join(f.ctx.dataDir,'attachments')).sort().map(name=>({name,sha256:createHash('sha256').update(readFileSync(join(f.ctx.dataDir,'attachments',name))).digest('hex')}));}
async function snapshot(f:Fixture){
 const deckId=f.source.ids.qDeck,tree=await f.client.call('knowledge.tree.read',{deckId});
 return {tree,bodies:await Promise.all(tree.nodes.map(n=>f.client.call('knowledge.node.read',{deckId,nodeId:n.nodeId}))),files:files(f),
  settings:f.ctx.db.prepare('SELECT key,value FROM settings ORDER BY key').all(),
  cards:f.ctx.db.prepare('SELECT * FROM learning_cards ORDER BY id').all(),
  receipts:f.ctx.db.prepare('SELECT count(*) n FROM protocol_receipts').get()!.n};
}
test('R5.b B1 complete-path mount isolates equal leaf names; abandoned preview is read-only and partial export preserves ancestor semantics',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const p=await preview(f,[entry('a',null,'B1甲分支','甲根'),entry('al','a','B1同名叶','甲叶正文'),entry('b',null,'B1乙分支','乙根',1),entry('bl','b','B1同名叶','乙叶正文')]);
  await f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:p.previewToken});
  const a=p.rows.find(r=>r.path.join('/')==='B1甲分支')!,al=p.rows.find(r=>r.path.join('/')==='B1甲分支/B1同名叶')!,bl=p.rows.find(r=>r.path.join('/')==='B1乙分支/B1同名叶')!;
  assert.notEqual(al.nodeId,bl.nodeId);
  const before=await snapshot(f),cancelled=await preview(f,[entry('leaf',null,'B1同名叶','不应写入')],a.nodeId,{'md:0':'replace'});
  assert.deepEqual(cancelled.rows[0].path,['B1甲分支','B1同名叶']);assert.equal(cancelled.rows[0].nodeId,al.nodeId);
  const diff=await f.client.call('knowledge.md.import.diff',{deckId:p.deckId,previewToken:cancelled.previewToken,key:cancelled.rows[0].key});
  assert.equal(diff.before,'甲叶正文');assert.equal(diff.after,'不应写入');assert.deepEqual(await snapshot(f),before);
  // Dropping this token represents cancellation: no confirm command is sent.
  const kept=await preview(f,[entry('leaf',null,'B1同名叶','默认必须保护正文')],a.nodeId);
  assert.equal(kept.rows[0].action,'keep');await f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:kept.previewToken});
  const changed=await preview(f,[entry('leaf',null,'B1同名叶','新甲叶正文')],a.nodeId,{'md:0':'replace'});
  await f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:changed.previewToken});
  assert.equal((await f.client.call('knowledge.node.read',{deckId:p.deckId,nodeId:al.nodeId})).markdown,'新甲叶正文');
  assert.deepEqual(await f.client.call('knowledge.node.read',{deckId:p.deckId,nodeId:bl.nodeId}),before.bodies.find(n=>n.nodeId===bl.nodeId));
  const partial=await f.client.call('knowledge.md.export.preview',{deckId:p.deckId,nodeIds:[al.nodeId]});
  const parsed=parseMarkedMarkdown(partial.markdown);assert.deepEqual(parsed.map(n=>[n.name,n.markdown]),[['B1甲分支',''],['B1同名叶','新甲叶正文']]);
  const source=await f.client.call('knowledge.md.source.text',{deckId:f.source.ids.mDeck,markdown:partial.markdown});
  const imported=await f.client.call('knowledge.md.import.preview',{deckId:f.source.ids.mDeck,sourceToken:source.sourceToken,parentId:null});
  assert.deepEqual(imported.rows.map(r=>r.path),[['B1甲分支'],['B1甲分支','B1同名叶']]);
  // Exporting all real IDs retains the complete forest, with no display-only root.
  const tree=await f.client.call('knowledge.tree.read',{deckId:p.deckId}),whole=await f.client.call('knowledge.md.export.preview',{deckId:p.deckId,nodeIds:tree.nodes.map(n=>n.nodeId)});
  assert.equal(whole.nodeCount,tree.nodes.length);
  const exportedForest=parseMarkedMarkdown(whole.markdown),path=(key:string,items:{key:string;parentKey:string|null;name:string}[]):string[]=>{
   const n=items.find(n=>n.key===key)!;return [...(n.parentKey?path(n.parentKey,items):[]),n.name];
  };
  const real=tree.nodes.map(n=>({key:n.nodeId,parentKey:n.parentId,name:n.name})),bodies=(await snapshot(f)).bodies;
  assert.deepEqual(exportedForest.map(n=>({path:path(n.key,exportedForest),markdown:n.markdown})),real.map(n=>({path:path(n.key,real),markdown:bodies.find(b=>b.nodeId===n.key)!.markdown})));
  f.reopen();assert.equal((await f.client.call('knowledge.node.read',{deckId:p.deckId,nodeId:al.nodeId})).markdown,'新甲叶正文');validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
test('R5.b B1 mixed append/new-child/image receipt failure restores exact tree, bodies, links, files and receipts; same request retries once then survives reopen',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const deckId=f.source.ids.qDeck,root=await f.client.call('knowledge.node.read',{deckId,nodeId:f.source.ids.root1});
  const image='data:image/png;base64,'+readFileSync(join(f.ctx.dataDir,'attachments',f.source.ids.currentImage+'.png')).toString('base64');
  const before=await snapshot(f),p=await preview(f,[entry('root',null,root.name,'追加正文'),entry('child','root','B1回滚新子节点',`![合成像素](${image})`)],null,{'md:0':'append'});
  assert.equal(p.created,1);assert.equal(p.updated,1);assert.equal(p.imageCount,1);assert.deepEqual(await snapshot(f),before);
  const req=f.client.prepare('knowledge.md.import.confirm',{deckId,previewToken:p.previewToken});
  f.ctx.db.exec("CREATE TEMP TRIGGER reject_b1_mixed BEFORE INSERT ON protocol_receipts WHEN NEW.method='knowledge.md.import.confirm' BEGIN SELECT RAISE(ABORT,'synthetic B1 mixed receipt failure'); END");
  await assert.rejects(()=>f.client.send(req));assert.deepEqual(await snapshot(f),before);
  f.ctx.db.exec('DROP TRIGGER reject_b1_mixed');const result=await f.client.send(req);assert.deepEqual(await f.client.send(req),result);
  const saved=await snapshot(f),child=p.rows.find(r=>r.action==='create')!;
  assert.equal(saved.tree.nodes.length,before.tree.nodes.length+1);assert.deepEqual(saved.cards,before.cards);
  assert.equal(saved.bodies.find(n=>n.nodeId===root.nodeId)!.markdown,[root.markdown,'追加正文'].filter(Boolean).join('\n\n'));
  const body=saved.bodies.find(n=>n.nodeId===child.nodeId)!;assert.equal(body.parentId,root.nodeId);assert.equal(body.assets.length,1);
  assert.equal(knowledgePlacements(body.markdown)[0].assetId,body.assets[0].id);assert.equal(saved.files.length,before.files.length+1);
  assert.equal(saved.receipts,Number(before.receipts)+1);validateUnifiedData(f.ctx.db);
  f.reopen();assert.deepEqual(await snapshot(f),saved);validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});

test('R5.b B1 public Markdown v1 export rejects seven-level tree/subtree without flattening or writing (documented GAP)',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const deckId=f.source.ids.qDeck;let parentId:string|null=null;
  for(let level=1;level<=7;level++){
   const tree=await f.client.call('knowledge.tree.read',{deckId});
   const n=await f.client.call('knowledge.node.create',{deckId,parentId,name:'B1深层'+level,expectedTreeHash:tree.treeHash});parentId=n.nodeId;
  }
  const before=await snapshot(f);
  await assert.rejects(()=>f.client.call('knowledge.md.export.preview',{deckId,nodeIds:[parentId!],includeDescendants:true}),
   (e:unknown)=>e instanceof Error&&'code' in e&&e.code==='MARKDOWN_DEPTH_UNSUPPORTED');
  assert.deepEqual(await snapshot(f),before);validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
