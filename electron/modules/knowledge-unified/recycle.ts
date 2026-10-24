import { randomUUID } from 'node:crypto';
import type { Context } from '../../infrastructure/context.ts';
import { transaction } from '../../infrastructure/database.ts';
import { ProtocolError } from '../../../shared/protocol/data.ts';
import { DeleteSubtree, StoredKnowledgeRecycle, RecycleBatchView, RestoreNodes, RestorePreview, TreeToken } from '../../../shared/protocol/knowledge-tree.ts';
import type { z } from 'zod';
import { readTree,requireTree,writeOrder,orderedNodeIds } from './storage.ts';
import { digest } from '../cards-unified/schedule.ts';
import { issueTreePreview,decodeTreePreview } from './preview.ts';
export const recycleKind='unified-knowledge';
export function readRecycle(ctx:Context,deckId:string,batchId:string) {
 requireTree(ctx,deckId);const row=ctx.db.prepare('SELECT payload FROM recycle_batches WHERE kind=? AND item_id=?').get(recycleKind,batchId);
 if(!row)throw new ProtocolError('RECYCLE_NOT_FOUND','知识子树回收记录不存在');
 const value=StoredKnowledgeRecycle.parse(JSON.parse(String(row.payload)));
 if(value.deckId!==deckId||value.batchId!==batchId)throw new ProtocolError('DECK_CONFLICT','回收记录不属于当前卡片集');return value;
}
export function listKnowledgeRecycle(ctx:Context,deckId:string) {
 requireTree(ctx,deckId);
 const rows=ctx.db.prepare("SELECT payload FROM recycle_batches WHERE kind=? AND json_extract(payload,'$.deckId')=? ORDER BY json_extract(payload,'$.createdAt') DESC LIMIT 501").all(recycleKind,deckId);
 if(rows.length>500)throw new ProtocolError('RECYCLE_TOO_LARGE','请先处理已有知识回收批次');
 return rows.map(row=>{const b=StoredKnowledgeRecycle.parse(JSON.parse(String(row.payload)));return RecycleBatchView.parse({deckId,batchId:b.batchId,rootId:b.rootId,name:b.nodes.find(n=>n.nodeId===b.rootId)!.name,count:b.nodes.length,mergedInto:b.mergedInto,createdAt:b.createdAt});});
}
export function archiveNodes(ctx:Context,deckId:string,rootId:string,nodes:z.infer<typeof StoredKnowledgeRecycle>['nodes'],mergedInto:string|null=null) {
 const batch=StoredKnowledgeRecycle.parse({encoding:'ganksoft.knowledge-recycle/1',batchId:randomUUID(),deckId,rootId,nodes,mergedInto,createdAt:ctx.now().toISOString()});
 ctx.db.prepare('INSERT INTO recycle_batches VALUES(?,?,?)').run(recycleKind,batch.batchId,JSON.stringify(batch));return batch;
}
export function deleteSubtree(ctx:Context,input:unknown) {
 const p=DeleteSubtree.parse(input);
 return transaction(ctx.db,()=>{
  const tree=readTree(ctx,p.deckId);
  if(tree.treeHash!==p.expectedTreeHash)throw new ProtocolError('REVISION_CONFLICT','知识图谱已变化，请重新核对删除范围');
  if(!tree.nodes.some(n=>n.nodeId===p.nodeId))throw new ProtocolError('DECK_CONFLICT','知识点不属于当前图谱');
  const ids=new Set([p.nodeId]);let count=-1;while(count!==ids.size){count=ids.size;for(const n of tree.nodes)if(n.parentId&&ids.has(n.parentId))ids.add(n.nodeId);}
  const nodes=tree.nodes.filter(n=>ids.has(n.nodeId)).map(n=>({...n,deletedRevision:n.revision+1}));
  const batch=archiveNodes(ctx,p.deckId,p.nodeId,nodes);
  for(const n of nodes)ctx.db.prepare('UPDATE knowledge SET deleted_at=?,version=version+1 WHERE id=?').run(ctx.now().toISOString(),n.nodeId);
  writeOrder(ctx,p.deckId,tree.nodes.map(n=>n.nodeId));
  return {batchId:batch.batchId,count:nodes.length};
 });
}
function restoration(ctx:Context,p:z.infer<typeof RestoreNodes>) {
 const batch=readRecycle(ctx,p.deckId,p.batchId),tree=readTree(ctx,p.deckId),root=batch.nodes.find(n=>n.nodeId===batch.rootId)!;
 const rootName=p.rootName??root.name,parentId=p.parentId===undefined?root.parentId:p.parentId,conflicts:string[]=[];
 if(parentId&&!tree.nodes.some(n=>n.nodeId===parentId))conflicts.push('原父节点已删除；请选择新的挂载位置或明确选择新根');
 const restored=batch.nodes.map(n=>({...n,name:n.nodeId===batch.rootId?rootName:n.name,parentId:n.nodeId===batch.rootId?parentId:n.parentId}));
 const ids=new Set(restored.map(n=>n.nodeId));
 for(const n of restored) {
  const row=ctx.db.prepare('SELECT module,deleted_at,version FROM knowledge WHERE id=?').get(n.nodeId);
  if(!row||row.module!==p.deckId||!row.deleted_at||row.version!==n.deletedRevision)conflicts.push(`节点「${n.name}」已变化，不能覆盖`);
  if(n.parentId&&!ids.has(n.parentId)&&!tree.nodes.some(k=>k.nodeId===n.parentId))conflicts.push(`节点「${n.name}」缺少父节点`);
  if(tree.nodes.some(k=>k.parentId===n.parentId&&k.name===n.name))conflicts.push(`同父已存在「${n.name}」，请重命名或更改挂载位置`);
 }
 return {batch,tree,restored,rootName,parentId,conflicts:[...new Set(conflicts)],fingerprint:digest({batch,tree})};
}
export function previewRestore(ctx:Context,input:unknown) {
 const p=RestoreNodes.parse(input),r=restoration(ctx,p);
 return RestorePreview.parse({deckId:p.deckId,batchId:p.batchId,rootName:r.rootName,parentId:r.parentId,count:r.restored.length,conflicts:r.conflicts,
  previewToken:r.conflicts.length?null:issueTreePreview('restore',{input:p,fingerprint:r.fingerprint},ctx.now())});
}
export function confirmRestore(ctx:Context,input:unknown) {
 const token=TreeToken.parse(input);
 return transaction(ctx.db,()=>{
  const value=decodeTreePreview(token.previewToken,'restore',ctx.now()),p=RestoreNodes.parse(value.input),r=restoration(ctx,p);
  if(r.fingerprint!==value.fingerprint||r.conflicts.length)throw new ProtocolError('PREVIEW_STALE','恢复范围已变化，请重新预览');
  const byId=new Map(r.restored.map(n=>[n.nodeId,n]));
  const depth=(id:string)=>{let d=0,parent=byId.get(id)!.parentId;while(parent&&byId.has(parent)){d++;parent=byId.get(parent)!.parentId;}return d;};
  for(const n of [...r.restored].sort((a,b)=>depth(a.nodeId)-depth(b.nodeId)))ctx.db.prepare('UPDATE knowledge SET name=?,parent_id=?,deleted_at=NULL,version=version+1,updated_at=? WHERE id=?')
    .run(n.name,n.parentId,ctx.now().toISOString(),n.nodeId);
  const siblingCount=r.tree.nodes.filter(n=>n.parentId===r.parentId).length,root=r.restored.find(n=>n.nodeId===r.batch.rootId)!;
  const position=Math.min(root.position,siblingCount);
  const combined=[...r.tree.nodes.map(n=>n.parentId===r.parentId&&n.position>=position?{...n,position:n.position+1}:n),...r.restored.map(n=>n.nodeId===root.nodeId?{...n,position}:n)];
  writeOrder(ctx,p.deckId,orderedNodeIds(combined));
  ctx.db.prepare('DELETE FROM recycle_batches WHERE kind=? AND item_id=?').run(recycleKind,p.batchId);
  return readTree(ctx,p.deckId);
 });
}
