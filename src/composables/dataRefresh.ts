import {onBeforeUnmount} from 'vue';
import {dataSync} from '../services';
/** Component-lifetime invalidation, never a business-data cache. */
export function useDataRefresh(load:()=>unknown,deckId?:()=>string){
 let disposed=false;
 const stop=dataSync.subscribe(change=>{
  if(change.deckId&&deckId&&change.deckId!==deckId())return;
  queueMicrotask(()=>{if(!disposed)void load();});
 });
 onBeforeUnmount(()=>{disposed=true;stop();});
}
