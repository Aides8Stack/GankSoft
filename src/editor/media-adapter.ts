import {services} from '../services';
import {Asset,type EditorAsset} from '../../shared/editor/document.ts';
export interface EditorMediaAdapter {
  stageClipboard():Promise<EditorAsset[]>;
  settleClipboard?(assets:EditorAsset[],outcome:'accepted'|'rejected'):Promise<void>;
}
// Bytes stay in the host. Each paste owns a fresh lease, never a shared asset.
export function electronMediaAdapter(deckId:string,purpose:'question'|'knowledge'='question'):EditorMediaAdapter {
 const pending=new Map<string,string>();
 const finish=async(insertionId:string,outcome:'accepted'|'rejected')=>{
  await services.media.finish({deckId,insertionId,outcome});
  const status=await services.media.status({deckId,insertionId});
  if(status.pendingCleanup||status.lastError)throw Error('图片未插入；暂存资源清理待重试：'+(status.lastError??'文件暂时无法删除，后台将在后续操作或重启后重试'));
 };
 return {
  async stageClipboard(){
   const insertionId=crypto.randomUUID();
   try{
    const result=await services.media.stage(deckId,purpose,'clipboard',insertionId);
    const assets=result.map(a=>Asset.parse({id:a.id,mime:a.mime,access:'draft'}));
    for(const a of assets)pending.set(a.id,insertionId);
    return assets;
   }catch(error){
    try{await finish(insertionId,'rejected');}catch(cleanup){throw Error(String(error)+'；'+String(cleanup));}
    throw error;
   }
  },
  async settleClipboard(assets,outcome){
   const ids=new Set(assets.map(a=>pending.get(a.id)).filter((id):id is string=>!!id));
   for(const id of ids){await finish(id,outcome);for(const [asset,owner]of pending)if(owner===id)pending.delete(asset);}
  },
 };
}
