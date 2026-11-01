// B5: transient selection only. Shared by renderer and the existing export service.
import {ProtocolError} from '../protocol/data.ts';
export type ExportNode={nodeId:string;parentId:string|null;position:number;name:string};
export type ExportRule={nodeId:string;includeParentBodies:boolean;includeDescendants:boolean};
export type ExportSelection={directNodeIds:string[];rules:ExportRule[];excludedNodeIds:string[]};
export type ExportFlag='includeParentBodies'|'includeDescendants';
export const emptyExportSelection=():ExportSelection=>({directNodeIds:[],rules:[],excludedNodeIds:[]});
export function exportTree(nodes:ExportNode[]){
 const byId=new Map(nodes.map(n=>[n.nodeId,n])),children=new Map<string|null,ExportNode[]>();
 if(byId.size!==nodes.length)throw new ProtocolError('TREE_CYCLE','知识结构身份重复');
 for(const n of nodes){const group=children.get(n.parentId)??[];group.push(n);children.set(n.parentId,group);}
 for(const group of children.values())group.sort((a,b)=>a.position-b.position);
 const rows:{node:ExportNode;depth:number;path:string}[]=[],seen=new Set<string>();
 const stack=(children.get(null)??[]).map(node=>({node,depth:0,path:node.name})).reverse();
 while(stack.length){const r=stack.pop()!;if(seen.has(r.node.nodeId))throw new ProtocolError('TREE_CYCLE','知识结构循环');seen.add(r.node.nodeId);rows.push(r);
  for(const node of [...(children.get(r.node.nodeId)??[])].reverse())stack.push({node,depth:r.depth+1,path:r.path+' / '+node.name});}
 if(rows.length!==nodes.length)throw new ProtocolError('TREE_CYCLE','知识结构缺父或循环');
 function ancestors(id:string){const out:string[]=[];let parent=byId.get(id)?.parentId;while(parent){out.push(parent);parent=byId.get(parent)!.parentId;}return out;}
 function descendants(id:string){const out:string[]=[],pending=[...(children.get(id)??[])];while(pending.length){const n=pending.pop()!;out.push(n.nodeId);pending.push(...(children.get(n.nodeId)??[]));}return out;}
 return {byId,rows,ancestors,descendants,related:(id:string,flag:ExportFlag)=>flag==='includeParentBodies'?ancestors(id):descendants(id)};
}
export type ExportTree=ReturnType<typeof exportTree>;
export function resolveExportSelection(tree:ExportTree,selection:ExportSelection){
 const {directNodeIds,rules,excludedNodeIds}=selection;
 for(const ids of [directNodeIds,excludedNodeIds,rules.map(r=>r.nodeId)])if(new Set(ids).size!==ids.length||ids.some(id=>!tree.byId.has(id)))throw new ProtocolError('DECK_CONFLICT','所选知识点重复、已删除或不属于当前图谱');
 const direct=new Set(directNodeIds),excluded=new Set(excludedNodeIds),effective=new Set(direct),contributions=new Map<string,{parents:string[];descendants:string[]}>();
 if(directNodeIds.some(id=>excluded.has(id)))throw new ProtocolError('MARKDOWN_SELECTION_INVALID','直接选择与排除不能重叠');
 for(const rule of rules){
  if(!direct.has(rule.nodeId))throw new ProtocolError('MARKDOWN_SELECTION_INVALID','导出条件必须属于直接选择的知识点');
  const parents=rule.includeParentBodies?tree.ancestors(rule.nodeId):[],descendants=rule.includeDescendants?tree.descendants(rule.nodeId):[];
  contributions.set(rule.nodeId,{parents,descendants});for(const id of [...parents,...descendants])effective.add(id);
 }
 for(const id of excluded)effective.delete(id);
 // Ancestor headings are structural context only; bodies always equal effective.
 const structural=new Set(effective);for(const id of effective)for(const parent of tree.ancestors(id))structural.add(parent);
 return {direct,excluded,contributions,effective,structural};
}
export function exportRuleState(tree:ExportTree,selection:ExportSelection,id:string,flag:ExportFlag):'off'|'on'|'partial'{
 if(!selection.rules.find(r=>r.nodeId===id)?.[flag])return 'off';
 const excluded=new Set(selection.excludedNodeIds);return tree.related(id,flag).some(n=>excluded.has(n))?'partial':'on';
}
export function toggleExportRule(tree:ExportTree,selection:ExportSelection,id:string,flag:ExportFlag):ExportSelection{
 const scope=resolveExportSelection(tree,selection),related=tree.related(id,flag);
 if(!scope.effective.has(id)||!related.length)return selection;
 const old=selection.rules.find(r=>r.nodeId===id)??{nodeId:id,includeParentBodies:false,includeDescendants:false};
 const enable=exportRuleState(tree,selection,id,flag)!=='on';
 return {directNodeIds:[...new Set([...selection.directNodeIds,id])],rules:[...selection.rules.filter(r=>r.nodeId!==id),{...old,[flag]:enable}],
  excludedNodeIds:enable?selection.excludedNodeIds.filter(n=>n!==id&&!related.includes(n)):[...selection.excludedNodeIds]};
}
export function toggleExportNode(tree:ExportTree,selection:ExportSelection,id:string):ExportSelection{
 if(!tree.byId.has(id))return selection;
 const before=resolveExportSelection(tree,selection);
 if(!before.effective.has(id))return {...selection,directNodeIds:[...selection.directNodeIds,id],excludedNodeIds:selection.excludedNodeIds.filter(n=>n!==id)};
 const next={directNodeIds:selection.directNodeIds.filter(n=>n!==id),rules:selection.rules.filter(r=>r.nodeId!==id),excludedNodeIds:[...new Set([...selection.excludedNodeIds,id])]};
 // Removing a rule owner keeps its other visible selections. Other owners keep
 // provenance; only IDs actually lost with this owner's rules become direct.
 const after=resolveExportSelection(tree,next);
 for(const other of before.effective)if(other!==id&&!after.effective.has(other))next.directNodeIds.push(other);
 return next;
}
