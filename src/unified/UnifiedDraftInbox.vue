<script setup lang="ts">
import {onMounted,onBeforeUnmount,ref,shallowRef} from 'vue';
import {unifiedDrafts} from '../services';
import type {Input,Output} from '../../shared/protocol/registry';
export interface DraftInboxState {query:string;items:Output<'draft.listSummary'>['items'];cursor:string|null;loaded:boolean}
const props=defineProps<{deckId:string;deckName:string;initial?:DraftInboxState}>();
const emit=defineEmits<{back:[];edit:[id:string];remember:[state:DraftInboxState]}>();
const query=ref(props.initial?.query??''),items=ref(props.initial?.items??[]),cursor=ref<string|null>(props.initial?.cursor??null);
const busy=ref(false),loaded=ref(props.initial?.loaded??false),error=ref(''),notice=ref('');
const target=shallowRef<Output<'draft.listSummary'>['items'][number]>(),dialog=ref<HTMLDialogElement>();
const pending=shallowRef<{input:Input<'draft.discard'>;requestId:string}>();
let disposed=false;
function remember(){emit('remember',{query:query.value,items:[...items.value],cursor:cursor.value,loaded:loaded.value});}
async function load(more=false){
 if(busy.value||pending.value)return;busy.value=true;error.value='';
 try{const result=await unifiedDrafts.listSummary({deckId:props.deckId,query:query.value,after:more?cursor.value:null});
  if(disposed)return;items.value=more?[...items.value,...result.items]:result.items;cursor.value=result.nextCursor;loaded.value=true;remember();
 }catch(e){error.value=String(e);}finally{busy.value=false;}
}
function confirm(item:NonNullable<typeof target.value>){target.value=item;error.value='';dialog.value?.showModal();}
function cancel(){if(busy.value||pending.value)return;dialog.value?.close();target.value=undefined;}
async function discard(){
 if(!target.value||busy.value)return;busy.value=true;error.value='';
 pending.value??={input:{deckId:props.deckId,cardId:target.value.cardId,expectedPublishedRevision:target.value.publishedRevision,
  expectedDraftRevision:target.value.revision,confirmDiscard:true},requestId:crypto.randomUUID()};
 try{await unifiedDrafts.discard(pending.value.input,pending.value.requestId);const id=pending.value.input.cardId;
  items.value=items.value.filter(i=>i.cardId!==id);pending.value=undefined;notice.value=target.value.isNew?'草稿已删除':'未发布修改已放弃';
  dialog.value?.close();target.value=undefined;remember();
 }catch(e){if((e as {outcome?:string}).outcome==='rejected')pending.value=undefined;error.value=String(e);
 }finally{busy.value=false;}
}
function close(){return !busy.value&&!pending.value;}
async function refreshLoaded(){
 if(!loaded.value){await load();return;}
 busy.value=true;error.value='';
 try{let after:string|null=null;const fresh:typeof items.value=[];const count=Math.max(50,items.value.length);
  do{const result=await unifiedDrafts.listSummary({deckId:props.deckId,query:query.value,after});fresh.push(...result.items);after=result.nextCursor;}while(after&&fresh.length<count&&!disposed);
  if(!disposed){items.value=fresh;cursor.value=after;remember();}
 }catch(e){error.value=String(e);}finally{busy.value=false;}
}
function beforeUnload(e:BeforeUnloadEvent){if(!close()){e.preventDefault();e.returnValue='';}}
onMounted(()=>{void refreshLoaded();window.addEventListener('beforeunload',beforeUnload);});onBeforeUnmount(()=>{remember();disposed=true;window.removeEventListener('beforeunload',beforeUnload);});defineExpose({close});
const labels={question:'单选错题',qa:'问答记忆',direct:'直接记忆'};
</script>
<template>
 <section class="draft-inbox" aria-label="草稿箱">
  <div class="page-heading"><div><button class="text-button" :disabled="!close()" @click="emit('back')">‹ 返回上一页</button><h1>草稿箱</h1><p>{{deckName}} · 已保存的草稿，包括历史版本产生的草稿。</p></div></div>
  <section class="surface padded">
   <form class="list-tools" @submit.prevent="load()"><input v-model="query" aria-label="搜索草稿标题" placeholder="搜索草稿标题" maxlength="300" :disabled="busy||!!pending"/><button class="button" :disabled="busy||!!pending">搜索</button><button type="button" :disabled="busy||!!pending" @click="load()">刷新</button></form>
   <p v-if="error&&!target" role="alert">{{error}}</p><p v-if="notice" role="status">{{notice}}</p><p v-if="busy" role="status">正在处理草稿…</p>
   <div class="draft-table"><table><thead><tr><th>草稿标题</th><th>所属卡片集</th><th>类型</th><th>状态</th><th>修改时间</th><th>操作</th></tr></thead><tbody>
    <tr v-for="item in items" :key="item.cardId" :data-draft-id="item.cardId"><td>{{item.title||'未命名草稿'}}</td><td>{{deckName}}</td><td>{{labels[item.draftType]}}</td><td>{{item.isNew?'新卡草稿':'已发布卡的修改草稿'}}</td><td><time :datetime="item.updatedAt">{{new Date(item.updatedAt).toLocaleString('zh-CN',{hour12:false})}}</time></td><td><div class="heading-actions"><button :disabled="busy||!!pending" @click="emit('edit',item.cardId)">继续编辑</button><button :disabled="busy||!!pending" @click="confirm(item)">{{item.isNew?'删除草稿':'放弃修改'}}</button></div></td></tr>
   </tbody></table></div>
   <p v-if="loaded&&!items.length&&!busy" class="empty-state">没有匹配的已保存草稿。</p><button v-if="cursor" :disabled="busy||!!pending" @click="load(true)">更多草稿</button>
  </section>
  <dialog ref="dialog" aria-label="确认处理草稿" @cancel.prevent="cancel"><h2>{{target?.isNew?'删除新卡草稿？':'放弃未发布修改？'}}</h2><p>{{target?.isNew?'将删除这份尚未发布的新卡草稿。':'仅删除这份修改草稿，正式卡片、学习记录和调度保持完整。'}}</p><p>图片资源保留在图片资源库中，可在无引用时另行管理。</p><p v-if="error" role="alert">{{error}}</p><footer class="heading-actions"><button :disabled="busy||!!pending" @click="cancel">取消</button><button :disabled="busy" @click="discard">{{pending?'核对原删除请求':'确认'+(target?.isNew?'删除草稿':'放弃修改')}}</button></footer></dialog>
 </section>
</template>
<style scoped>
.draft-table{overflow:auto;margin-top:16px}.draft-table table{width:100%;border-collapse:collapse}.draft-table th,.draft-table td{text-align:left;padding:12px 10px;border-bottom:1px solid var(--border);vertical-align:top}.draft-table td:first-child{min-width:120px;overflow-wrap:anywhere}.draft-table th{white-space:nowrap}.draft-table td:last-child{min-width:160px}.draft-table time{font-size:12px;white-space:nowrap}dialog{max-width:min(520px,calc(100vw - 32px));border:1px solid var(--border);border-radius:12px;padding:24px}dialog::backdrop{background:#10271960}dialog p{line-height:1.7}
</style>
