import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFullRestoreSession} from '../../../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../../../shared/protocol/client.ts';
import {b2Fixture} from './b2.ts';
const definitionText=readFileSync(new URL('./definition.json',import.meta.url),'utf8');
export const definition=JSON.parse(definitionText);
const definitionHash=createHash('sha256').update(definitionText).digest('hex');
/** Cache is disposable. Never reuse a previous test's mutated database as pristine input. */
export async function exchangeFixture(cache='validation-results/r5-b3/fixture.json'){
 let cached:any=existsSync(cache)?JSON.parse(readFileSync(cache,'utf8')):null;
 if(cached?.definitionHash!==definitionHash||cached?.consumed)cached=null;
 // b2Fixture validates real606/integrity/lease and regenerates missing data using real APIs.
 if(!cached&&existsSync(cache)){
  const previous=JSON.parse(readFileSync(cache,'utf8'));
  // Force a new isolated directory without touching the old database or lease.
  writeFileSync(cache,JSON.stringify({...previous,fixtureVersion:0}));
 }
 const f=await b2Fixture({metadata:cache});
 const owner=await createFullRestoreSession(f.data+'-control606',{workspaceParent:f.root,selectBackup:async()=>null,allowLegacyRestore:false});
 try{
  const api=createClient(r=>owner.execute(r));await api.call('app.capabilities',{});
  let extra=cached?.extra;
  if(!extra){
   const create=async(name:string,parentId:string|null,markdown:string)=>{const tree=await api.call('knowledge.tree.read',{deckId:f.deck.id});const n=await api.call('knowledge.node.create',{deckId:f.deck.id,expectedTreeHash:tree.treeHash,name,parentId});const body=await api.call('knowledge.node.read',{deckId:f.deck.id,nodeId:n.nodeId});await api.call('knowledge.node.save',{deckId:f.deck.id,nodeId:n.nodeId,expectedRevision:body.revision,markdown});return n.nodeId;};
   const chain:string[]=[];for(let i=1;i<=definition.exchange.depth;i++)chain.push(await create(definition.exchange.deepPrefix+i,chain.at(-1)??null,`第${i}层正文\n\n## 正文标题\n\n保留格式 **粗体**\n`));
   const a=await create(definition.exchange.duplicateLeaf,chain[0],'甲路径同名叶正文');
   const other=await create(definition.exchange.otherRoot,null,'乙根正文');const b=await create(definition.exchange.duplicateLeaf,other,'乙路径同名叶正文');const mount=await create(definition.exchange.mount,null,'挂载正文必须保持');
   extra={chain,duplicate:[a,b],other,mount};
  }
  const tree=await api.call('knowledge.tree.read',{deckId:f.deck.id});const bodies=await Promise.all(tree.nodes.map(n=>api.call('knowledge.node.read',{deckId:f.deck.id,nodeId:n.nodeId})));
  if(cached)assert.deepEqual({tree,bodies},cached.baseline,'cached fixture baseline changed; refuse silently reusing contaminated cache');
  const result={...f,definitionHash,extra,baseline:{tree,bodies},consumed:true};writeFileSync(cache,JSON.stringify(result,null,2)+'\n');return result;
 }finally{owner.close();}
}
