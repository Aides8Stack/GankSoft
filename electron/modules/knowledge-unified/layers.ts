import type {Input,Output} from '../../../shared/protocol/registry.ts';
import type {Context} from '../../infrastructure/context.ts';
import {ProtocolError} from '../../../shared/protocol/data.ts';
import {readTree} from './storage.ts';
function snapshot(ctx:Context,deckId:string,expected?:string){
 const tree=readTree(ctx,deckId);
 if(expected&&tree.treeHash!==expected)throw new ProtocolError('REVISION_CONFLICT','知识结构已变化，请重新载入后继续展开');
 const counts=new Map<string|null,number>();for(const n of tree.nodes)counts.set(n.parentId,(counts.get(n.parentId)??0)+1);
 return {...tree,nodes:tree.nodes.map(n=>({...n,childCount:counts.get(n.nodeId)??0}))};
}
/** Full topology remains in the owner for CAS; the read-only viewport receives
 * only one bounded sibling page. Bodies and media are never read here. */
export function readTreeLayer(ctx:Context,p:Input<'knowledge.tree.layer'>):Output<'knowledge.tree.layer'>{
 const tree=snapshot(ctx,p.deckId,p.expectedTreeHash);
 if(p.parentId&&!tree.nodes.some(n=>n.nodeId===p.parentId))throw new ProtocolError('DECK_CONFLICT','父知识点不属于当前图谱');
 const children=tree.nodes.filter(n=>n.parentId===p.parentId).sort((a,b)=>a.position-b.position),offset=p.offset??0,end=Math.min(children.length,offset+(p.limit??50));
 return {deckId:p.deckId,treeHash:tree.treeHash,parentId:p.parentId,totalNodes:tree.nodes.length,totalChildren:children.length,nodes:children.slice(offset,end),nextOffset:end<children.length?end:null};
}
export function locateTreeNode(ctx:Context,p:Input<'knowledge.tree.locate'>):Output<'knowledge.tree.locate'>{
 const tree=snapshot(ctx,p.deckId,p.expectedTreeHash),byId=new Map(tree.nodes.map(n=>[n.nodeId,n])),path:typeof tree.nodes=[];
 let node=tree.nodes.find(n=>n.name.includes(p.query.trim()));const seen=new Set<string>();
 while(node){if(seen.has(node.nodeId))throw new ProtocolError('TREE_CYCLE','知识结构包含循环');seen.add(node.nodeId);path.unshift(node);node=node.parentId?byId.get(node.parentId):undefined;}
 return {deckId:p.deckId,treeHash:tree.treeHash,totalNodes:tree.nodes.length,path};
}
