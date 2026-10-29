import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exchangeFixture} from './fixtures/ganksoft/exchange.ts';
import {createFullRestoreSession} from '../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../shared/protocol/client.ts';
import {serializeMarkedMarkdown,parseMarkedMarkdown,MARKDOWN_HEADER_V2,MarkdownProtocolError,type MarkdownForestNode} from '../shared/knowledge/markdown.ts';
import {knowledgePlacements} from '../shared/knowledge/media.ts';
const deep=(count:number):MarkdownForestNode[]=>Array.from({length:count},(_,i)=>({key:'k'+i,parentKey:i?'k'+(i-1):null,name:'深层'+i,position:0,markdown:'正文'+i+'\n\n## 正文标题\n',line:1}));
const shape=(ns:MarkdownForestNode[])=>ns.map(n=>({name:n.name,position:n.position,markdown:n.markdown,parent:n.parentKey?ns.findIndex(p=>p.key===n.parentKey):-1}));
test('B3 v2 round-trips 7,9,100 levels, exact bodies and reserved headers; rejects malformed depth/cycles/duplicates; v1 still refuses >6',()=>{
 for(const count of [7,9,100]){const ns=deep(count);ns[0].markdown+='\n'+MARKDOWN_HEADER_V2+'\n\n<!-- ganksoft:depth:99 -->\n';const encoded=serializeMarkedMarkdown(ns);assert.match(encoded,/ganksoft:md:v2/);assert.deepEqual(shape(parseMarkedMarkdown(encoded)),shape(ns));}
 assert.throws(()=>serializeMarkedMarkdown(deep(7),{version:1}),(e:any)=>e.code==='MARKDOWN_DEPTH_UNSUPPORTED');
 const nine=serializeMarkedMarkdown(deep(9));for(const bad of [nine.replace('depth:7','depth:9'),nine.replace('depth:1','depth:0'),nine.replace('depth:1','depth:101'),nine.replace('<!-- ganksoft:depth:1 -->\n',''),nine+'<!-- ganksoft:depth:1 -->'])assert.throws(()=>parseMarkedMarkdown(bad),MarkdownProtocolError);
 assert.throws(()=>serializeMarkedMarkdown(deep(101)),MarkdownProtocolError);
 assert.throws(()=>serializeMarkedMarkdown([{...deep(1)[0],parentKey:'k0'}]),MarkdownProtocolError);
 assert.throws(()=>serializeMarkedMarkdown([deep(1)[0],{...deep(1)[0],key:'dup',position:1}]),MarkdownProtocolError);
});
test('B3 small606: bounded incoming/image metadata under keep, full/deep/subtree export, policy/paths, cancellation, transactional media rollback and receipt replay/reopen',async()=>{
 const root=mkdtempSync(join(tmpdir(),'gank-b3-service-'));const f=await exchangeFixture(join(root,'fixture.json'));
 let owner=await createFullRestoreSession(f.data+'-control606',{workspaceParent:f.root,selectBackup:async()=>null,allowLegacyRestore:false});
 let api=createClient(r=>owner.execute(r));await api.call('app.capabilities',{});const deckId=f.deck.id;
 const snapshot=async()=>{const tree=await api.call('knowledge.tree.read',{deckId});return {tree,bodies:await Promise.all(tree.nodes.map(n=>api.call('knowledge.node.read',{deckId,nodeId:n.nodeId}))),links:await api.call('knowledge.cardLinks.get',f.card),files:readdirSync(join(owner.ctx.dataDir,'attachments')).sort().map(n=>[n,readFileSync(join(owner.ctx.dataDir,'attachments',n)).toString('base64')]),receipts:owner.ctx.db.prepare("SELECT count(*) n FROM protocol_receipts WHERE method='knowledge.md.import.confirm'").get()!.n};};
 const stage=async(markdown:string,parentId:string|null=null,policies:Record<string,'keep'|'append'|'replace'>={})=>{const source=await api.call('knowledge.md.source.text',{deckId,markdown});assert.equal(source.format,'marked');return api.call('knowledge.md.import.preview',{deckId,sourceToken:source.sourceToken,parentId,policies});};
 try{
  const before=await snapshot();const whole=await api.call('knowledge.md.export.preview',{deckId,nodeIds:before.tree.nodes.map(n=>n.nodeId)});assert.equal(whole.nodeCount,16);assert.equal(parseMarkedMarkdown(whole.markdown).length,16);assert.equal(whole.imageCount,1);assert.deepEqual(await snapshot(),before);
  const leaf=await api.call('knowledge.md.export.preview',{deckId,nodeIds:[f.extra.chain.at(-1)!]});assert.equal(leaf.nodeCount,9);const parsed=parseMarkedMarkdown(leaf.markdown);assert.ok(parsed.slice(0,-1).every(n=>n.markdown===''));assert.equal(parsed.at(-1)!.markdown,before.bodies.find(n=>n.nodeId===f.extra.chain.at(-1))!.markdown);
  const subtree=await api.call('knowledge.md.export.preview',{deckId,nodeIds:[f.extra.chain[6]],includeDescendants:true,includeParentBodies:true});assert.equal(subtree.nodeCount,9);assert.ok(parseMarkedMarkdown(subtree.markdown).every(n=>n.markdown));
  const pixel=readFileSync(join(owner.ctx.dataDir,'attachments',f.asset.file_name??f.asset.fileName??f.asset.id+'.png')).toString('base64');
  const incoming='新正文\n\n![待导入图](data:image/png;base64,'+pixel+')';
  const ns=[{key:'a',parentKey:null,name:'同名叶',position:0,markdown:incoming,line:1}];
  const kept=await stage(serializeMarkedMarkdown(ns),f.extra.chain[0]);assert.equal(kept.rows[0].nodeId,f.extra.duplicate[0]);assert.equal(kept.rows[0].action,'keep');
  const diff=await api.call('knowledge.md.import.diff',{deckId,previewToken:kept.previewToken,key:kept.rows[0].key});assert.equal(diff.before,'甲路径同名叶正文');assert.equal(diff.after,diff.before);assert.match(diff.incoming,/新正文/);assert.doesNotMatch(diff.incoming,/base64/);assert.equal(diff.images.length,1);assert.equal(diff.images[0].bytes,Buffer.from(pixel,'base64').length);assert.equal(diff.images[0].width,100);assert.deepEqual(await snapshot(),before);
  const append=await stage(serializeMarkedMarkdown(ns),f.extra.chain[0],{'md:0':'append'});assert.equal(append.updated,1);await api.call('knowledge.md.import.confirm',{deckId,previewToken:append.previewToken});const saved=await api.call('knowledge.node.read',{deckId,nodeId:f.extra.duplicate[0]});assert.match(saved.markdown,/甲路径同名叶正文\n\n新正文/);assert.equal(knowledgePlacements(saved.markdown).length,1);assert.deepEqual(await api.call('knowledge.node.read',{deckId,nodeId:f.extra.duplicate[1]}),before.bodies.find(n=>n.nodeId===f.extra.duplicate[1]));
  const replaced=await stage(serializeMarkedMarkdown([{...ns[0],markdown:'替换后的正文'}]),f.extra.chain[0],{'md:0':'replace'});await api.call('knowledge.md.import.confirm',{deckId,previewToken:replaced.previewToken});assert.equal((await api.call('knowledge.node.read',{deckId,nodeId:f.extra.duplicate[0]})).markdown,'替换后的正文');
  const baseline=await snapshot();const mixed=serializeMarkedMarkdown([{...ns[0],name:'生命周期甲',markdown:'事务追加'},{key:'new',parentKey:'a',name:'回滚图片节点',position:0,markdown:incoming,line:1}]);const plan=await stage(mixed,null,{'md:0':'append'});const request=api.prepare('knowledge.md.import.confirm',{deckId,previewToken:plan.previewToken});
  owner.ctx.db.exec("CREATE TEMP TRIGGER b3_reject BEFORE INSERT ON protocol_receipts WHEN NEW.method='knowledge.md.import.confirm' BEGIN SELECT RAISE(ABORT,'B3 mixed receipt failure'); END");await assert.rejects(()=>api.send(request));assert.deepEqual(await snapshot(),baseline);owner.ctx.db.exec('DROP TRIGGER b3_reject');const result=await api.send(request);assert.deepEqual(await api.send(request),result);const committed=await snapshot();assert.equal(committed.tree.nodes.length,baseline.tree.nodes.length+1);assert.equal(committed.receipts,Number(baseline.receipts)+1);
  owner.close();owner=await createFullRestoreSession(f.data+'-control606',{workspaceParent:f.root,selectBackup:async()=>null,allowLegacyRestore:false});api=createClient(r=>owner.execute(r));await api.call('app.capabilities',{});assert.deepEqual(await snapshot(),committed);
 }finally{owner.close();}
});
