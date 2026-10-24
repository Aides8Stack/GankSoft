import { randomUUID } from 'node:crypto';
import type { Context } from '../../infrastructure/context.ts';
import { transaction } from '../../infrastructure/database.ts';
import { ProtocolError } from '../../../shared/protocol/data.ts';
import { ApplyTree, CreateNode, SaveNode } from '../../../shared/protocol/knowledge-tree.ts';
import { nextKnowledgeName } from '../../../shared/knowledge-names.ts';
import { readTree, readNode, writeOrder, writeBody, requireNode } from './storage.ts';
export function applyTree(ctx:Context,input:unknown) {
  const p=ApplyTree.parse(input);
  return transaction(ctx.db,()=>{
    const before=readTree(ctx,p.deckId);
    if(before.treeHash!==p.expectedTreeHash)throw new ProtocolError('REVISION_CONFLICT','知识图谱已变化，请保留草稿并重新读取');
    if(before.nodes.some(n=>!p.nodes.some(v=>v.nodeId===n.nodeId)))throw new ProtocolError('SUBTREE_DELETE_REQUIRED','删除知识点请使用独立子树回收接口');
    const nodes=p.nodes.map(n=>({...n,name:n.name.trim()})),byId=new Map(nodes.map(n=>[n.nodeId,n]));
    if(byId.size!==nodes.length||byId.has('gank-root'))throw new ProtocolError('TREE_INVALID','节点身份重复或包含虚拟根');
    const names=new Set<string>(),positions=new Set<string>();
    for(const n of nodes) {
      const nk=JSON.stringify([n.parentId,n.name]),pk=JSON.stringify([n.parentId,n.position]);
      if(!n.name||names.has(nk)||positions.has(pk))throw new ProtocolError('TREE_CONFLICT','同父名称或顺序重复');
      names.add(nk);positions.add(pk);
      const seen=new Set([n.nodeId]);let parent=n.parentId;
      while(parent) {
        if(seen.has(parent))throw new ProtocolError('TREE_CYCLE','知识点层级不能循环');
        seen.add(parent);const next=byId.get(parent);if(!next)throw new ProtocolError('TREE_PARENT_MISSING','父知识点缺失或不属于当前图谱');parent=next.parentId;
      }
      const existing=ctx.db.prepare('SELECT module,deleted_at FROM knowledge WHERE id=?').get(n.nodeId);
      if(existing&&(existing.module!==p.deckId||existing.deleted_at))throw new ProtocolError('DECK_CONFLICT','不能覆盖其他图谱或回收站身份');
    }
    const groups=new Map<string|null,typeof nodes>();
    for(const n of nodes){const group=groups.get(n.parentId)??[];group.push(n);groups.set(n.parentId,group);}
    for(const siblings of groups.values())if(siblings.some(n=>n.position>=siblings.length))throw new ProtocolError('TREE_CONFLICT','同级顺序必须从零连续编号');
    // Existing uniqueness is released only within the same enclosing transaction.
    for(const n of before.nodes)ctx.db.prepare('UPDATE knowledge SET name=? WHERE id=?').run('__staged_'+randomUUID(),n.nodeId);
    const now=ctx.now().toISOString();
    const depth=(node:typeof nodes[number])=>{let n=0,parent=node.parentId;while(parent){n++;parent=byId.get(parent)!.parentId;}return n;};
    for(const n of [...nodes].sort((a,b)=>depth(a)-depth(b))) {
      const old=before.nodes.find(v=>v.nodeId===n.nodeId);
      if(old)ctx.db.prepare('UPDATE knowledge SET name=?,parent_id=?,version=version+?,updated_at=? WHERE id=?')
        .run(n.name,n.parentId,old.name!==n.name||old.parentId!==n.parentId||old.position!==n.position?1:0,now,n.nodeId);
      else ctx.db.prepare('INSERT INTO knowledge(id,module,name,parent_id,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(n.nodeId,p.deckId,n.name,n.parentId,now,now);
    }
    const order:string[]=[];
    function visit(parent:string|null){for(const n of (groups.get(parent)??[]).sort((a,b)=>a.position-b.position)){order.push(n.nodeId);visit(n.nodeId);}}
    visit(null);writeOrder(ctx,p.deckId,order);
    return readTree(ctx,p.deckId);
  });
}
export function createNode(ctx:Context,input:unknown) {
  const p=CreateNode.parse(input);
  return transaction(ctx.db,()=>{
    const tree=readTree(ctx,p.deckId),siblings=tree.nodes.filter(n=>n.parentId===p.parentId);
    if(p.parentId&&!tree.nodes.some(n=>n.nodeId===p.parentId))throw new ProtocolError('DECK_CONFLICT','父节点不属于当前图谱');
    const at=p.afterId?siblings.findIndex(n=>n.nodeId===p.afterId)+1:siblings.length;
    if(p.afterId&&at===0)throw new ProtocolError('TREE_CONFLICT','同级插入位置已变化');
    const nodeId=randomUUID(),name=p.name?.trim()??nextKnowledgeName(siblings.map(n=>n.name));
    const nodes=tree.nodes.map(({revision,...n})=>n.parentId===p.parentId&&n.position>=at?{...n,position:n.position+1}:n);
    nodes.push({nodeId,name,parentId:p.parentId,position:at});
    applyTree(ctx,{deckId:p.deckId,expectedTreeHash:p.expectedTreeHash,nodes});return readNode(ctx,p.deckId,nodeId);
  });
}
export function saveNode(ctx:Context,input:unknown) {
  const p=SaveNode.parse(input);
  return transaction(ctx.db,()=>{
    const row=requireNode(ctx,p.deckId,p.nodeId);
    if(row.version!==p.expectedRevision)throw new ProtocolError('REVISION_CONFLICT','知识正文已变化，请保留当前草稿');
    writeBody(ctx,{encoding:'ganksoft.knowledge-body/1',nodeId:p.nodeId,deckId:p.deckId,markdown:p.markdown});
    ctx.db.prepare('UPDATE knowledge SET version=version+1,updated_at=? WHERE id=?').run(ctx.now().toISOString(),p.nodeId);
    return readNode(ctx,p.deckId,p.nodeId);
  });
}
