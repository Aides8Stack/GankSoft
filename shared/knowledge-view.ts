export interface ViewNode {id:string;topic:string;expanded?:boolean;children?:ViewNode[];lazyParent?:string|null}
export interface ViewRow {id:string;name:string;parent_id:string|null;position?:number}
/** One adjacency pass. All real rows remain present even when their DOM is
 * collapsed. Lazy markers are view-only and may never be sent to tree.apply. */
export function knowledgeView(rows:ViewRow[],options:{name:string;expanded:Map<string,boolean>;partial?:boolean;counts?:Map<string,number>;pages?:Map<string|null,number|null>}):ViewNode {
 const byId=new Map<string,ViewNode>(),root:ViewNode={id:'gank-root',topic:options.name,expanded:true,children:[]};
 for(const row of rows)byId.set(row.id,{id:row.id,topic:row.name,expanded:options.expanded.get(row.id)??(!options.partial&&rows.length<=200),children:[]});
 for(const row of rows){const parent=row.parent_id===null?root:byId.get(row.parent_id);if(!parent)throw Error('KNOWLEDGE_VIEW_PARENT_MISSING');parent.children!.push(byId.get(row.id)!);}
 if(options.partial){
  for(const row of rows){const node=byId.get(row.id)!;
   if((options.counts?.get(row.id)??0)>0&&(!options.pages?.has(row.id)||options.pages.get(row.id)!==null))node.children!.push({id:'gank-lazy:'+row.id,topic:options.pages?.has(row.id)?'载入更多下级…':'展开以载入下级…',lazyParent:row.id});
  }
  if(options.pages?.get(null)!==null)root.children!.push({id:'gank-lazy:roots',topic:'载入更多根节点…',lazyParent:null});
 }
 return root;
}
