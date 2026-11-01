<script setup lang="ts">
import {computed,inject,nextTick,onBeforeUnmount,ref,watch} from 'vue';
import {knowledgePickerKey} from '../composables/knowledgePicker';
import KnowledgeExchangeMap from './KnowledgeExchangeMap.vue';
const picker=inject(knowledgePickerKey)!;
const {state}=picker;
const dialog=ref<HTMLDialogElement>(),graph=ref<InstanceType<typeof KnowledgeExchangeMap>>();
const query=ref(''),matches=ref<string[]>([]),popup=ref(''),toast=ref('');
const selected=computed(()=>[...state.selectedIds]);
let timer:ReturnType<typeof setTimeout>|undefined,returnFocus:HTMLElement|null=null;
function path(id:string){const parts:string[]=[],seen=new Set<string>();let node=state.nodes.find(n=>n.nodeId===id);
 while(node&&!seen.has(node.nodeId)){seen.add(node.nodeId);parts.unshift(node.name);node=state.nodes.find(n=>n.nodeId===node!.parentId);}return parts.join(' / ');
}
function toggle(id:string){picker.toggle(id);popup.value=state.selectedIds.has(id)&&picker.descendants(id).length?id:'';}
function locate(id:string){graph.value?.focus(id);matches.value=[];popup.value='';}
function search(){clearTimeout(timer);toast.value='';const q=query.value.trim().toLocaleLowerCase();
 const found=q?state.nodes.filter(n=>(path(n.nodeId)+' '+(n.aliases??'')).toLocaleLowerCase().includes(q)):[];
 if(!found.length){matches.value=[];toast.value='知识点不存在';timer=setTimeout(()=>toast.value='',1200);return;}
 locate(found[0]!.nodeId);if(found.length>1)matches.value=found.map(n=>n.nodeId);
}
watch(()=>state.request,async request=>{
 clearTimeout(timer);toast.value='';query.value='';matches.value=[];popup.value='';
 if(request){returnFocus=document.activeElement as HTMLElement;await nextTick();if(state.request===request)dialog.value?.showModal();}
 else{dialog.value?.close();returnFocus?.focus();returnFocus=null;}
});
onBeforeUnmount(()=>{clearTimeout(timer);picker.cancel();});
</script>
<template>
 <dialog ref="dialog" class="knowledge-picker-dialog public-knowledge-picker" aria-label="选择知识点" data-knowledge-picker-host @cancel.prevent="picker.cancel()" @close="!dialog?.open&&picker.cancel()">
  <template v-if="state.request">
   <header><div><strong>选择知识点</strong><small>单击选中或取消 · 子知识点需明确选择</small></div><button aria-label="关闭知识点选择" title="关闭" @click="picker.cancel()">×</button></header>
   <div class="picker-map-region">
    <p v-if="state.loading" role="status">正在读取知识树…</p>
    <div v-else-if="state.error" role="alert">{{state.error}}<button @click="picker.retry">重新读取知识树</button></div>
    <KnowledgeExchangeMap v-else ref="graph" :nodes="state.nodes" :selected="selected" label="知识点选择图谱" @select="toggle"/>
    <div v-if="!state.loading&&!state.error&&popup&&state.request.allowSelectDescendants" class="picker-subtree"><strong>{{path(popup)}}</strong><button @click="picker.subtree(popup)">{{picker.descendants(popup).every(id=>state.selectedIds.has(id))?'取消全部子知识点':'选中全部子知识点'}}</button><button aria-label="关闭子知识点操作" @click="popup=''">×</button></div>
   </div>
   <section class="picker-selected" aria-label="已选知识点"><strong>已选知识点（{{selected.length}}）</strong><button :disabled="state.loading||!!state.error" @click="state.selectedIds.clear();popup=''">清空选择</button><div class="picker-chips"><button v-for="id in selected" :key="id" :title="path(id)" :aria-label="'取消选择 '+path(id)" @click="picker.toggle(id);popup=''">{{path(id)}} ×</button></div></section>
   <form class="picker-search" @submit.prevent="search"><input v-model="query" :disabled="state.loading||!!state.error" aria-label="搜索知识点" placeholder="搜索名称或完整路径"/><button :disabled="state.loading||!!state.error" type="submit">搜索定位</button><div v-if="matches.length>1" class="picker-candidates"><button v-for="id in matches" :key="id" type="button" @click="locate(id)">{{path(id)}}</button></div></form>
   <footer><span>已选择 {{selected.length}} 个知识点</span><button @click="picker.cancel()">取消</button><button class="primary" :disabled="state.loading||!!state.error" @click="picker.confirm">确认选择</button></footer>
   <div v-if="toast" class="picker-toast" role="alert">{{toast}}</div>
  </template>
 </dialog>
</template>
<style>
.public-knowledge-picker{--panel:var(--surface,#fff);--line:var(--border,#dce7df);width:min(960px,94vw)!important;max-width:94vw!important;height:min(760px,92vh);max-height:92vh!important;padding:0!important;overflow:hidden!important;border:1px solid var(--line,#dce7df);border-radius:13px;background:var(--panel,#fff);color:var(--ink,#2d4839)}
.public-knowledge-picker[open]{display:grid!important;grid-template-rows:58px minmax(100px,1fr) 98px 56px 62px;gap:0!important}
.public-knowledge-picker::backdrop{background:#1e312a77}
.public-knowledge-picker header,.public-knowledge-picker footer{display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid var(--line,#dce7df);min-width:0}
.public-knowledge-picker header{justify-content:space-between}.public-knowledge-picker header strong{display:block}.public-knowledge-picker header small{display:block;font-size:11px;color:var(--muted,#789084)}
.public-knowledge-picker button{font-size:12px;min-height:30px;padding:4px 9px;border:1px solid var(--line,#d5e1d9);border-radius:7px;background:var(--panel,#fff);color:inherit;cursor:pointer}.public-knowledge-picker button:disabled{opacity:.5;cursor:default}.public-knowledge-picker button:hover:enabled{background:var(--primary-soft,#e6f2e9)}.public-knowledge-picker button.primary{background:#286d54;color:#fff;border-color:#286d54}.picker-map-region{position:relative;display:flex;min-height:0;min-width:0;padding:8px;overflow:hidden}
.public-knowledge-picker .knowledge-exchange-map{min-height:0;height:auto}.picker-selected{min-height:0;overflow:hidden;padding:7px 16px;border-block:1px solid var(--line,#dce7df);font-size:12px}.picker-selected>button{float:right}.picker-chips{display:flex;align-content:flex-start;flex-wrap:wrap;gap:5px;max-height:57px;overflow:auto;clear:both}.picker-chips button{max-width:100%;overflow-wrap:anywhere;background:var(--primary-soft,#e6f2e9)}
.picker-search{display:flex;position:relative;align-items:center;gap:8px;padding:8px 16px;min-width:0}.picker-search input{flex:1;min-width:0}.picker-candidates{position:absolute;z-index:5;bottom:50px;left:16px;right:120px;max-height:140px;overflow:auto;background:var(--panel,#fff);border:1px solid var(--line,#dce7df);box-shadow:0 5px 20px #19392733}.picker-candidates button{display:block;width:100%;text-align:left}
.public-knowledge-picker footer{border-top:1px solid var(--line,#dce7df);border-bottom:0}.public-knowledge-picker footer span{flex:1;font-size:12px}.picker-toast{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);background:#263d34dd;color:#fff;border-radius:12px;padding:12px 22px;pointer-events:none}.picker-subtree{position:absolute;right:16px;top:58px;max-width:85%;display:flex;align-items:center;gap:6px;padding:7px;background:var(--panel,#fff);border:1px solid var(--line,#dce7df);border-radius:8px;box-shadow:0 6px 20px #153b2b22;z-index:3}.picker-subtree strong{font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
html[data-theme="dark"] .public-knowledge-picker{--ink:#e1e9e2;--primary-soft:#314b40}
</style>
