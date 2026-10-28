<script setup lang="ts">
import UiIcon from './v37/PrototypeIcon.vue';
import {ref,shallowRef,defineAsyncComponent,nextTick} from 'vue';
const Exchange=defineAsyncComponent(()=>import('./UnifiedCardExchange.vue'));
const moveTarget=ref<{id:string;name:string;revision:number}|null>(null),confirming=ref(false),exchanging=ref(false),exchange=shallowRef<InstanceType<typeof Exchange>>();
import {unifiedCards,unifiedWorkspace} from '../services';
import type {Input,Output} from '../../shared/protocol/registry';
const props=defineProps<{deckId:string;cards:{cardId:string;title:string;revision:number}[];restore?:boolean}>();
const emit=defineEmits<{changed:[];clear:[]}>();
const confirmation=ref<HTMLDialogElement>(),batchRoot=ref<HTMLElement>();
const confirmationCards=shallowRef<{cardId:string;title:string;revision:number}[]>([]);
let confirmationTrigger:HTMLElement|null=null;
async function openConfirmation(event:MouseEvent){
 confirmationTrigger=event.currentTarget as HTMLElement;
 confirmationCards.value=props.cards.map(c=>({...c}));
 await nextTick();confirmation.value?.showModal();
 confirmation.value?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus();
}
function returnFocus(){
 if(confirmationTrigger?.isConnected&&!confirmationTrigger.matches(':disabled'))confirmationTrigger.focus();
 else batchRoot.value?.focus();
}
function cancelConfirmation(){confirmation.value?.close();}
async function closedConfirmation(){confirming.value=false;moveTarget.value=null;confirmationCards.value=[];await nextTick();returnFocus();}
const busy=ref(false),unknown=ref(false),error=ref(''),notice=ref(''),choosing=ref(false),folder=ref<string|null>(null),catalog=shallowRef<Output<'workspace.catalog'>>(),items=ref<Output<'workspace.catalog'>['items']>([]);
let pending:{method:'batch';payload:Input<'card.batch.apply'>;id:string}|{method:'restore';payload:Input<'card.recycle.restore'>;id:string}|null=null;
async function execute(){if(!pending||busy.value)return;busy.value=true;error.value='';try{
 const p=pending,result=p.method==='batch'?await unifiedCards.batch(p.payload,p.id):await unifiedCards.restore(p.payload,p.id);
 pending=null;unknown.value=false;choosing.value=false;notice.value=`已${result.action==='move'?'移动':result.action==='delete'?'移到回收站':'恢复'} ${result.count} 张卡片`;emit('changed');
 }catch(e){unknown.value=!(e as {definitive?:boolean}).definitive;if(!unknown.value)pending=null;error.value=String(e);}finally{busy.value=false;}}
const selection=(cards=props.cards)=>cards.map(c=>({cardId:c.cardId,expectedRevision:c.revision}));
function remove(event:MouseEvent){if(busy.value||unknown.value)return;confirming.value=true;void openConfirmation(event);}
async function confirmRemove(){if(busy.value||pending||!confirmation.value?.open)return;pending={method:'batch',id:crypto.randomUUID(),payload:{deckId:props.deckId,cards:selection(confirmationCards.value),action:'delete'}};confirmation.value.close();await execute();await nextTick();returnFocus();}
async function restoreSelected(){if(!confirm(`恢复选中的 ${props.cards.length} 张卡片？`))return;pending={method:'restore',id:crypto.randomUUID(),payload:{deckId:props.deckId,cards:selection()}};await execute();}
async function browse(id:string|null=null,more=false){busy.value=true;error.value='';try{const r=await unifiedWorkspace.catalog({folderId:id,cursor:more?catalog.value?.nextCursor:null});catalog.value=r;folder.value=id;items.value=more?[...items.value,...r.items]:r.items;choosing.value=true;}catch(e){error.value=String(e);}finally{busy.value=false;}}
function move(item:{id:string;name:string;revision:number},event:MouseEvent){moveTarget.value=item;void openConfirmation(event);}
async function confirmMove(){const item=moveTarget.value;if(!item||busy.value||pending||!confirmation.value?.open)return;pending={method:'batch',id:crypto.randomUUID(),payload:{deckId:props.deckId,cards:selection(confirmationCards.value),action:'move',targetDeckId:item.id,expectedTargetRevision:item.revision}};confirmation.value.close();await execute();await nextTick();returnFocus();}
defineExpose({close:()=>!moveTarget.value&&!confirming.value&&!busy.value&&!unknown.value&&!pending&&(!exchanging.value||exchange.value?.close()!==false)});
</script>
<template>
 <section ref="batchRoot" tabindex="-1" aria-label="卡片批量操作" :class="{'restore-batch':restore}">
  <div v-if="cards.length" class="bulk-action-bar" role="toolbar" aria-label="批量卡片生命周期"><div class="bulk-action-info"><strong>已选 {{cards.length}} 张</strong><span class="tiny-meta">同一学习队列可包含三种卡片</span></div><div class="compact-actions bulk-action-buttons"><slot name="study" :blocked="busy||unknown||exchanging"/><template v-if="restore"><button class="button small" :disabled="busy||unknown" @click="restoreSelected">恢复选中卡片</button></template><template v-else><button class="button small" :disabled="busy||unknown||exchanging" @click="exchanging=true"><UiIcon name="upload"/>导出选中卡片</button><button class="button small" :disabled="busy||unknown||exchanging" @click="browse()">移动选中卡片</button><button class="button small danger-outline" :disabled="busy||unknown||exchanging" @click="remove"><UiIcon name="trash"/>移到回收站</button></template><button class="text-button" :disabled="busy||unknown||exchanging" @click="exchanging=false;emit('clear')">取消选择</button></div></div>
  <Exchange v-if="exchanging" ref="exchange" :deck-id="deckId" :cards="cards" @close="exchanging=false"/>
  <section v-if="choosing" aria-label="选择目标卡片集"><h3>选择目标卡片集</h3><nav aria-label="移动目录路径"><button :disabled="busy||unknown" @click="browse()">全部卡片集</button><button v-for="b in catalog?.breadcrumbs" :key="b.id" :disabled="busy||unknown" @click="browse(b.id)">{{b.name}}</button></nav><button v-for="i in items" :key="i.kind+i.id" :disabled="busy||unknown||i.id===deckId" @click="i.kind==='folder'?browse(i.id):move(i,$event)">{{i.kind==='folder'?'文件夹 · ':''}}{{i.name}}</button><button v-if="catalog?.nextCursor" :disabled="busy||unknown" @click="browse(folder,true)">更多目标</button><button :disabled="busy||unknown" @click="choosing=false">取消移动</button></section>
  <p v-if="notice" role="status">{{notice}}</p><p v-if="error" role="alert">{{error}}</p><button v-if="unknown" :disabled="busy" @click="execute">核对原批量请求</button>
  <dialog ref="confirmation" class="dialog batch-confirm-dialog" role="alertdialog" :aria-label="confirming?'移入回收站确认':'移动卡片确认'" aria-describedby="batch-confirm-impact" @cancel.prevent="cancelConfirmation" @close="closedConfirmation">
   <header class="dialog-head"><h2>{{confirming?'移入回收站':'移动卡片'}}</h2><button class="icon-button" aria-label="关闭操作确认" @click="cancelConfirmation">×</button></header>
   <div class="dialog-body">
    <p id="batch-confirm-impact" v-if="confirming">将选中的 {{confirmationCards.length}} 张卡片移入回收站？已发布内容、草稿、学习历史和图片会保留，可在设置中恢复。</p>
    <p id="batch-confirm-impact" v-else>将 {{confirmationCards.length}} 张卡片移动到“{{moveTarget?.name}}”？保留身份、历史和排期，清除当前知识点关联。</p>
    <ul class="confirmation-card-list" aria-label="本次操作的卡片"><li v-for="card in confirmationCards" :key="card.cardId">{{card.title||'未命名卡片'}}</li></ul>
   </div>
   <footer class="dialog-footer"><button class="button" data-cancel @click="cancelConfirmation">{{confirming?'取消移入':'取消移动确认'}}</button><button :class="['button',confirming?'danger':'primary']" :disabled="busy||unknown" @click="confirming?confirmRemove():confirmMove()">{{confirming?'确认移入回收站':'确认移动卡片'}}</button></footer>
  </dialog>
 </section>
</template>
<style scoped>.restore-batch{margin:12px 0}.restore-batch .bulk-action-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px;background:var(--panel,#fff);border:1px solid var(--line,#ddd);border-radius:8px}.restore-batch button{margin:4px}section[aria-label="选择目标卡片集"]{padding:16px;border:1px solid var(--border);border-radius:8px}section[aria-label="选择目标卡片集"] button{margin:4px}</style>

<style scoped>
dialog.batch-confirm-dialog{position:fixed;inset:0;margin:auto;padding:0;width:min(610px,calc(100vw - 40px));max-height:min(85vh,850px);color:var(--ink,#26352f)}
dialog.batch-confirm-dialog:not([open]){display:none}
dialog.batch-confirm-dialog::backdrop{background:#14291e66}
.batch-confirm-dialog .dialog-head{flex-shrink:0}
.batch-confirm-dialog .dialog-body{overflow-wrap:anywhere}
.batch-confirm-dialog .dialog-footer{flex-shrink:0;flex-wrap:wrap}
.confirmation-card-list{margin:14px 0 0;padding:12px 12px 12px 30px;max-height:180px;overflow:auto;background:var(--soft,#f3f6f5);border:1px solid var(--border,#e6eae8);border-radius:8px;font-size:12px}
.confirmation-card-list li+li{margin-top:6px}
</style>
