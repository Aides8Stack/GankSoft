import type { z } from 'zod';
import type { Context } from '../../infrastructure/context.ts';
import { ProtocolError } from '../../../shared/protocol/data.ts';
import { StoredNodeBody, StoredTreeOrder, TreeView, NodeBody } from '../../../shared/protocol/knowledge-tree.ts';
import { requireDraftModel } from '../cards-unified/new-drafts.ts';
import { digest } from '../cards-unified/schedule.ts';
export const bodyPrefix='unified-knowledge-body:',orderPrefix='unified-knowledge-order:';
export function requireTree(ctx:Context,deckId:string) {
  requireDraftModel(ctx);
  if(!ctx.db.prepare('SELECT 1 FROM decks WHERE id=? AND deleted_at IS NULL').get(deckId))throw new ProtocolError('DECK_CONFLICT','卡片集不存在或已删除');
}
export function readTree(ctx:Context,deckId:string) {
  requireTree(ctx,deckId);
  const rows=ctx.db.prepare('SELECT id,name,parent_id,version FROM knowledge WHERE module=? AND deleted_at IS NULL ORDER BY id LIMIT 5001').all(deckId);
  if(rows.length>5000)throw new ProtocolError('TREE_TOO_LARGE','知识图谱超过当前编辑范围');
  const raw=ctx.db.prepare('SELECT value FROM settings WHERE key=?').get(orderPrefix+deckId);
  const stored=raw?StoredTreeOrder.parse(JSON.parse(String(raw.value))):null;
  if(stored&&stored.deckId!==deckId)throw new ProtocolError('TREE_STORAGE_INVALID','知识顺序范围损坏');
  const order=stored?.nodeIds??[],index=new Map(order.map((id,i)=>[id,i]));
  const sorted=[...rows].sort((a,b)=>(index.get(String(a.id))??Infinity)-(index.get(String(b.id))??Infinity)||String(a.id).localeCompare(String(b.id)));
  const counts=new Map<string|null,number>();
  const nodes=sorted.map(row=>{
    const parentId=row.parent_id?String(row.parent_id):null,position=counts.get(parentId)??0;counts.set(parentId,position+1);
    return {nodeId:String(row.id),name:String(row.name),parentId,position,revision:Number(row.version)};
  });
  return TreeView.parse({deckId,treeHash:digest({deckId,nodes}),nodes});
}
export function writeOrder(ctx:Context,deckId:string,nodeIds:string[]) {
  const value=StoredTreeOrder.parse({encoding:'ganksoft.knowledge-order/1',deckId,nodeIds});
  ctx.db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(orderPrefix+deckId,JSON.stringify(value));
}
export function requireNode(ctx:Context,deckId:string,nodeId:string,deleted=false) {
  requireTree(ctx,deckId);
  const row=ctx.db.prepare(`SELECT * FROM knowledge WHERE id=? AND module=? AND deleted_at IS ${deleted?'NOT ':''}NULL`).get(nodeId,deckId);
  if(!row)throw new ProtocolError('DECK_CONFLICT','知识点不属于当前卡片集或状态已变化');
  return row;
}
export function markdownBody(ctx:Context,deckId:string,nodeId:string) {
  const row=ctx.db.prepare('SELECT value FROM settings WHERE key=?').get(bodyPrefix+nodeId);
  if(row){const value=StoredNodeBody.parse(JSON.parse(String(row.value)));if(value.nodeId!==nodeId||value.deckId!==deckId)throw new ProtocolError('NODE_STORAGE_INVALID','知识正文身份损坏');return value.markdown;}
  const legacy=ctx.db.prepare('SELECT * FROM knowledge WHERE id=? AND module=?').get(nodeId,deckId);
  if(!legacy)throw new ProtocolError('NODE_NOT_FOUND','知识点不存在');
  return (['principle','conditions','method','traps'] as const).flatMap((key,i)=>legacy[key]?[`## ${['原理','条件','方法','易错点'][i]}\n\n${legacy[key]}`]:[]).join('\n\n');
}
export function validateBody(value:z.infer<typeof StoredNodeBody>) {
  const body=StoredNodeBody.parse(value);
  // S6 owns resource import/export. Do not persist an untracked image reference.
  if(/!\[[^\]]*\]\(|gank-asset:\/\/|data:image\//i.test(body.markdown))throw new ProtocolError('KNOWLEDGE_MEDIA_NOT_READY','知识正文图片请待统一资源接口完成后添加');
  return body;
}
export function writeBody(ctx:Context,value:z.infer<typeof StoredNodeBody>) {
  const body=validateBody(value);
  ctx.db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(bodyPrefix+body.nodeId,JSON.stringify(body));
}
export function readNode(ctx:Context,deckId:string,nodeId:string) {
  const node=readTree(ctx,deckId).nodes.find(n=>n.nodeId===nodeId);
  if(!node)throw new ProtocolError('DECK_CONFLICT','知识点不属于当前图谱');
  return NodeBody.parse({...node,deckId,markdown:markdownBody(ctx,deckId,nodeId)});
}
export function orderedNodeIds(nodes:{nodeId:string;parentId:string|null;position:number}[]) {
 const groups=new Map<string|null,typeof nodes>();
 for(const n of nodes){const list=groups.get(n.parentId)??[];list.push(n);groups.set(n.parentId,list);}
 const out:string[]=[];
 const walk=(parent:string|null)=>{for(const n of (groups.get(parent)??[]).sort((a,b)=>a.position-b.position)){out.push(n.nodeId);walk(n.nodeId);}};
 walk(null);if(out.length!==nodes.length)throw new ProtocolError('TREE_CYCLE','知识结构缺父或循环');return out;
}
