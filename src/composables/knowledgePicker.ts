import {inject, onBeforeUnmount, reactive, watch, type InjectionKey} from 'vue';

export type PickerNode = {nodeId:string;parentId:string|null;name:string;position:number;aliases?:string};
export type KnowledgePickerRequest = {deckId:string;initialSelectedIds:readonly string[];purpose:'association'|'filter';allowSelectDescendants?:boolean};
export type KnowledgePickerResult = {status:'confirmed';nodeIds:string[]}|{status:'cancelled'};

// One transient interaction session per active app. No persistence or business writes.
export function createKnowledgePicker(readTree:(deckId:string)=>Promise<PickerNode[]>) {
  const state=reactive({request:null as KnowledgePickerRequest|null,nodes:[] as PickerNode[],selectedIds:new Set<string>(),loading:false,error:''});
  let generation=0,owner:symbol|undefined,resolve:((result:KnowledgePickerResult)=>void)|undefined;
  function finish(result:KnowledgePickerResult){
    const done=resolve;resolve=undefined;owner=undefined;generation++;
    state.request=null;state.nodes=[];state.selectedIds=new Set();state.loading=false;state.error='';done?.(result);
  }
  async function load(){
    if(!state.request)return;
    const token=++generation,deckId=state.request.deckId;state.loading=true;state.error='';
    try{const nodes=await readTree(deckId);if(token!==generation||!state.request)return;
      state.nodes=nodes;const valid=new Set(nodes.map(n=>n.nodeId));
      state.selectedIds=new Set([...state.selectedIds].filter(id=>valid.has(id)));
    }catch(e){if(token===generation)state.error='知识树加载失败：'+String(e);}
    finally{if(token===generation)state.loading=false;}
  }
  function open(request:KnowledgePickerRequest,caller?:symbol):Promise<KnowledgePickerResult>{
    if(state.request)return Promise.reject(Error('知识点选择器已打开，请先确认或取消'));
    if(!request.deckId)return Promise.reject(Error('请选择卡片集'));
    owner=caller;state.request={...request,initialSelectedIds:[...request.initialSelectedIds]};
    state.selectedIds=new Set(request.initialSelectedIds);state.nodes=[];
    const result=new Promise<KnowledgePickerResult>(done=>resolve=done);void load();return result;
  }
  function toggle(id:string){if(state.loading||state.error||!state.nodes.some(n=>n.nodeId===id))return;
    if(state.selectedIds.has(id))state.selectedIds.delete(id);else state.selectedIds.add(id);
  }
  function descendants(id:string){const seen=new Set([id]),stack=[id],out:string[]=[];
    while(stack.length){const parent=stack.pop()!;for(const n of state.nodes)if(n.parentId===parent&&!seen.has(n.nodeId)){seen.add(n.nodeId);out.push(n.nodeId);stack.push(n.nodeId);}}return out;
  }
  function subtree(id:string){if(!state.request?.allowSelectDescendants||state.loading||state.error)return;
    const ids=descendants(id),all=ids.every(n=>state.selectedIds.has(n));for(const n of ids)all?state.selectedIds.delete(n):state.selectedIds.add(n);
  }
  function confirm(){if(!state.request||state.loading||state.error)return;
    finish({status:'confirmed',nodeIds:state.nodes.filter(n=>state.selectedIds.has(n.nodeId)).map(n=>n.nodeId)});
  }
  function cancel(caller?:symbol){if(state.request&&(!caller||caller===owner))finish({status:'cancelled'});}
  return {state,open,toggle,descendants,subtree,confirm,cancel,retry:load};
}
export type KnowledgePickerAPI=ReturnType<typeof createKnowledgePicker>;
export const knowledgePickerKey:InjectionKey<KnowledgePickerAPI>=Symbol('knowledgePicker');
export function useKnowledgePicker(deck?:()=>string){
  const picker=inject(knowledgePickerKey);if(!picker)throw Error('知识点选择器宿主未安装');
  const owner=Symbol('caller');onBeforeUnmount(()=>picker.cancel(owner));
  if(deck)watch(deck,()=>picker.cancel(owner),{flush:'sync'});
  return {open:(request:KnowledgePickerRequest)=>picker.open(request,owner),cancel:()=>picker.cancel(owner)};
}
