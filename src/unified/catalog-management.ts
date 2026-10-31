import type { Input, Output } from '../../shared/protocol/registry';
export type CatalogItem = Output<'workspace.catalog'>['items'][number];
export type CatalogAction = 'open'|'new-folder'|'new-deck'|'import'|'edit'|'move'|'export'|'delete';
export function catalogActions(item:CatalogItem|null):{key:CatalogAction;label:string;danger?:boolean}[] {
 if(!item)return [{key:'new-folder',label:'新建文件夹'},{key:'new-deck',label:'新建卡片集'},{key:'import',label:'导入卡片集 ZIP'}];
 if(item.kind==='folder')return [{key:'open',label:'展开/收起'},{key:'new-folder',label:'新建子文件夹'},{key:'new-deck',label:'在此新建卡片集'},{key:'import',label:'导入卡片集 ZIP'},{key:'edit',label:'重命名'},{key:'move',label:'移动到'},{key:'delete',label:'删除文件夹（内容上移）',danger:true}];
 return [{key:'open',label:'打开卡片集'},{key:'edit',label:'重命名'},{key:'move',label:'移动到'},{key:'export',label:'导出卡片集 ZIP'},{key:'delete',label:'移入回收站',danger:true}];
}
/** Bounded metadata only; existing 606 exchange service owns all content/ZIP work. */
export async function collectDeckContent(deckId:string,list:(p:Input<'card.listSummary'>)=>Promise<Output<'card.listSummary'>>):Promise<Input<'card.exchange.preview'>> {
 const cards:Input<'card.exchange.preview'>['cards']=[],seen=new Set<string>();
 let cursor:string|null=null,revision:number|undefined;
 do {
  const page=await list({deckId,cursor,limit:100});
  if(revision!==undefined&&revision!==page.dataRevision)throw Error('卡片内容已变化，请重新导出。');
  revision=page.dataRevision;
  for(const card of page.items){
   if(seen.has(card.cardId))throw Error('卡片分页重复，请重新导出。');
   seen.add(card.cardId);cards.push({cardId:card.cardId,expectedRevision:card.revision});
  }
  if(cards.length>500||(cards.length===500&&page.nextCursor))throw Error('卡片内容包最多支持500张已发布卡；请在所有卡片中分批选择导出，或到设置创建完整备份。');
  cursor=page.nextCursor;
 }while(cursor);
 if(!cards.length)throw Error('此卡片集没有已发布卡，不能导出空内容包。草稿和完整数据请使用设置中的完整备份。');
 return {deckId,cards,expectedDataRevision:revision};
}
