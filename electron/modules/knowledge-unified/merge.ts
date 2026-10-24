import { randomUUID } from 'node:crypto';
import type { Context } from '../../infrastructure/context.ts';
import { transaction } from '../../infrastructure/database.ts';
import { ProtocolError } from '../../../shared/protocol/data.ts';
import { MergeNodes,MergePreview,TreeToken } from '../../../shared/protocol/knowledge-tree.ts';
import type { z } from 'zod';
import { readTree,readNode,writeBody,writeOrder,orderedNodeIds } from './storage.ts';
import { currentCardLinks,replaceCardLinks } from './links.ts';
import { digest } from '../cards-unified/schedule.ts';
import { issueTreePreview,decodeTreePreview } from './preview.ts';
import { archiveNodes } from './recycle.ts';
function calculation(ctx:Context,p:z.infer<typeof MergeNodes>) {
 const tree=readTree(ctx,p.deckId),source=readNode(ctx,p.deckId,p.sourceId),target=readNode(ctx,p.deckId,p.targetId),conflicts:string[]=[];
 if(source.nodeId===target.nodeId)conflicts.push('请选择两个不同知识点');
 let parent=target.parentId;
 while(parent){if(parent===source.nodeId){conflicts.push('不能将祖先合并到其后代');break;}parent=tree.nodes.find(n=>n.nodeId===parent)?.parentId??null;}
 const children=tree.nodes.filter(n=>n.parentId===source.nodeId),targetChildren=tree.nodes.filter(n=>n.parentId===target.nodeId);
 for(const n of children)if(targetChildren.some(k=>k.name===n.name))conflicts.push(`目标下已有「${n.name}」，请先处理同级重名`);
 const body=p.bodyPolicy==='keep'?target.markdown:p.bodyPolicy==='replace'?source.markdown:[target.markdown,source.markdown].filter(Boolean).join('\n\n');
 if(body.length>200000)conflicts.push('合并正文超过长度限制，请先整理正文');
 const cards=ctx.db.prepare('SELECT id,legacy_kind FROM learning_cards WHERE deck_id=?').all(p.deckId)
   .map(c=>({cardId:String(c.id),legacyKind:c.legacy_kind,nodeIds:currentCardLinks(ctx,p.deckId,String(c.id),c.legacy_kind)}));
 const relations=ctx.db.prepare('SELECT * FROM relations WHERE source_id=? OR target_id=? ORDER BY id').all(source.nodeId,source.nodeId);
 const keys=ctx.db.prepare('SELECT * FROM knowledge_keys WHERE knowledge_id=? ORDER BY archive_key,node_key').all(source.nodeId);
 const fingerprint=digest({tree,source,target,cards,relations,keys});
 return {tree,source,target,children,targetChildren,body,cards,relations,conflicts,fingerprint};
}
export function previewMerge(ctx:Context,input:unknown) {
 const p=MergeNodes.parse(input),r=calculation(ctx,p);
 return MergePreview.parse({deckId:p.deckId,source:r.source,target:r.target,bodyPolicy:p.bodyPolicy,children:r.children.length,
  linkedCards:r.cards.filter(c=>c.nodeIds.includes(p.sourceId)).length,conflicts:r.conflicts,
  previewToken:r.conflicts.length?null:issueTreePreview('merge',{input:p,fingerprint:r.fingerprint},ctx.now())});
}
export function confirmMerge(ctx:Context,input:unknown) {
 const token=TreeToken.parse(input);
 return transaction(ctx.db,()=>{
  const value=decodeTreePreview(token.previewToken,'merge',ctx.now()),p=MergeNodes.parse(value.input),r=calculation(ctx,p);
  if(value.fingerprint!==r.fingerprint||r.conflicts.length)throw new ProtocolError('PREVIEW_STALE','图谱、正文或卡片关联已变化，请重新预览');
  const source=r.source.nodeId,target=r.target.nodeId;
  // Current links only. Original attempt_faults and every ReviewEvent remain immutable.
  for(const card of r.cards.filter(c=>c.nodeIds.includes(source)))replaceCardLinks(ctx,{deckId:p.deckId,cardId:card.cardId,nodeIds:[...new Set(card.nodeIds.map(id=>id===source?target:id))]},card.legacyKind,true);
  for(const relation of r.relations) {
   const other=String(relation.source_id===source?relation.target_id:relation.source_id);if(other===target)continue;
   const [a,b]=[target,other].sort(),old=ctx.db.prepare('SELECT * FROM relations WHERE source_id=? AND target_id=? AND kind=?').get(a,b,relation.kind!);
   if(old){const note=[...new Set([String(old.note),String(relation.note)].filter(Boolean))].join('\n');ctx.db.prepare('UPDATE relations SET note=? WHERE id=?').run(note,old.id!);}
   else ctx.db.prepare('INSERT INTO relations VALUES(?,?,?,?,?)').run(randomUUID(),a,b,relation.kind!,relation.note!);
  }
  ctx.db.prepare('DELETE FROM relations WHERE source_id=? OR target_id=?').run(source,source);
  ctx.db.prepare('UPDATE knowledge_keys SET knowledge_id=? WHERE knowledge_id=?').run(target,source);
  for(const child of r.children)ctx.db.prepare('UPDATE knowledge SET parent_id=?,version=version+1,updated_at=? WHERE id=?').run(target,ctx.now().toISOString(),child.nodeId);
  writeBody(ctx,{encoding:'ganksoft.knowledge-body/1',deckId:p.deckId,nodeId:target,markdown:r.body});
  ctx.db.prepare('UPDATE knowledge SET version=version+1,updated_at=? WHERE id=?').run(ctx.now().toISOString(),target);
  ctx.db.prepare('UPDATE knowledge SET deleted_at=?,version=version+1,updated_at=? WHERE id=?').run(ctx.now().toISOString(),ctx.now().toISOString(),source);
  archiveNodes(ctx,p.deckId,source,[{...r.tree.nodes.find(n=>n.nodeId===source)!,deletedRevision:r.source.revision+1}],target);
  const childIds=new Set(r.children.map(n=>n.nodeId));
  const nodes=r.tree.nodes.filter(n=>n.nodeId!==source).map(n=>childIds.has(n.nodeId)?{...n,parentId:target,position:r.targetChildren.length+n.position}:n);
  writeOrder(ctx,p.deckId,orderedNodeIds(nodes));
  return readTree(ctx,p.deckId);
 });
}
