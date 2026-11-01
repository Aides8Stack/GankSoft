import assert from 'node:assert/strict';
import {join} from 'node:path';
import {writeContainer} from '../../../../electron/infrastructure/containers.ts';
import {executeCase,enterCards} from '../helpers.mjs';
import {evidence,step} from './core-support.mjs';
import {trace,exportPackage,openPackage,snapshot,reboot,integrity} from './system-support.mjs';
const id=process.argv[2],out=process.argv[3];
if(!['EX-02','EX-03','EX-05'].includes(id)||!out)throw Error('UNSUPPORTED_EXCHANGE_CASE');
await executeCase(id,out,async ctx=>{
 await trace(ctx);const initial=snapshot(ctx.fixture),{file,doc,files}=await exportPackage(ctx);assert.deepEqual(snapshot(ctx.fixture),initial);
 if(id==='EX-03'){
  const preview=await openPackage(ctx,file);await preview.getByLabel('导入卡片集名称').fill('T1-C 独立导入');await preview.getByRole('button',{name:'确认导入独立卡片集',exact:true}).click();await preview.getByRole('status').filter({hasText:'已导入 1 张卡片'}).waitFor();
  const catalog=await ctx.session.api.call('workspace.catalog',{}),deck=catalog.items.find(x=>x.name==='T1-C 独立导入');assert.ok(deck);assert.notEqual(deck.id,ctx.fixture.deck.id);
  const cards=(await ctx.session.api.call('card.listSummary',{deckId:deck.id,limit:100})).items;assert.equal(cards.length,1);const content=await ctx.session.api.call('card.getPublishedContent',{deckId:deck.id,cardId:cards[0].cardId});assert.deepEqual(content.payload,doc.cards[0].payload);assert.equal(content.title,doc.cards[0].title);
  const tree=await ctx.session.api.call('knowledge.tree.read',{deckId:deck.id});assert.ok(tree.nodes.some(n=>n.name==='生命周期甲'));const node=tree.nodes.find(n=>n.name==='生命周期甲'),body=await ctx.session.api.call('knowledge.node.read',{deckId:deck.id,nodeId:node.nodeId});assert.match(body.markdown,/甲节点原文/);assert.ok(body.assets.length);ctx.observations.checks.imported={deckId:deck.id,cardId:cards[0].cardId,nodeCount:tree.nodes.length,assets:body.assets};
  step(ctx,'GUI confirm independent deck import; read-only card/knowledge/image closure matches exported source');await preview.getByRole('button',{name:'关闭交换',exact:true}).click();const before=snapshot(ctx.fixture);await reboot(ctx);assert.deepEqual(snapshot(ctx.fixture),before);await ctx.session.page.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:/^T1-C 独立导入，/}).click();await ctx.session.page.getByRole('navigation',{name:'卡片集功能'}).getByRole('button',{name:'所有卡片',exact:true}).click();await ctx.session.page.getByRole('button',{name:content.title,exact:true}).waitFor();
 }else if(id==='EX-05'){
  const bad=join(ctx.fixture.root,'bad-protocol.zip'),manifest=JSON.parse(files.get('manifest.json'));manifest.version=999;files.set('manifest.json',Buffer.from(JSON.stringify(manifest)));await writeContainer(bad,files);const before=snapshot(ctx.fixture),preview=await openPackage(ctx,bad);await preview.getByRole('alert').waitFor();ctx.observations.checks.rejection=await preview.getByRole('alert').allTextContents();assert.equal(await preview.getByRole('button',{name:'确认导入独立卡片集',exact:true}).count(),0);assert.deepEqual(snapshot(ctx.fixture),before);step(ctx,'GUI unsupported protocol rejected visibly with zero business/media writes');await preview.getByRole('button',{name:'关闭交换',exact:true}).click();await reboot(ctx);assert.deepEqual(snapshot(ctx.fixture),before);await enterCards(ctx);
 }else{await reboot(ctx);assert.deepEqual(snapshot(ctx.fixture),initial);await enterCards(ctx);}
 integrity(ctx);return evidence(ctx);
});
