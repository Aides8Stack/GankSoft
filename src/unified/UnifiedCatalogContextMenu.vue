<script setup lang="ts">
import {computed,nextTick,onBeforeUnmount,onMounted} from 'vue';
import type {Output} from '../../shared/protocol/registry';
import UiIcon from './v37/PrototypeIcon.vue';
type Item=Output<'workspace.catalog'>['items'][number];
type Action='open'|'new-deck'|'new-folder'|'import-deck'|'rename'|'move'|'export-deck'|'delete';
const props=defineProps<{item:Item|null;x:number;y:number;busy?:boolean}>();
const emit=defineEmits<{choose:[action:Action];close:[]}>();
const actions=computed(()=>{
 const root:[Action,string,string][]=[['new-deck','新建卡片集','cards'],['new-folder','新建文件夹','folder'],['import-deck','导入卡片集 ZIP','upload']];
 if(!props.item)return root;
 if(props.item.kind==='folder')return [
  ['open','打开文件夹','folder'],['new-folder','新建子文件夹','folder'],['new-deck','在此新建卡片集','cards'],
  ['import-deck','导入卡片集 ZIP','upload'],['rename','重命名','detail'],['move','移动到文件夹','arrow'],['delete','删除文件夹（保留子项）','trash']
 ] satisfies [Action,string,string][];
 return [
  ['open','打开卡片集','cards'],['rename','重命名','detail'],['move','移动到文件夹','arrow'],
  ['export-deck','导出卡片集 ZIP','exchange'],['delete','移入回收站','trash']
 ] satisfies [Action,string,string][];
});
function key(e:KeyboardEvent){if(e.key==='Escape'){e.preventDefault();emit('close');}}
onMounted(()=>{window.addEventListener('keydown',key);void nextTick(()=>document.querySelector<HTMLElement>('.catalog-context-menu [role=menuitem]')?.focus());});
onBeforeUnmount(()=>window.removeEventListener('keydown',key));
</script>
<template>
 <Teleport to="body">
  <div class="catalog-context-dismiss" aria-hidden="true" @pointerdown="emit('close')"></div>
  <div class="catalog-context-menu" role="menu" aria-label="卡片集目录管理" :style="{left:'max(8px,min('+x+'px,calc(100vw - 244px)))',top:'max(8px,min('+y+'px,calc(100vh - 332px)))'}">
   <button v-for="action in actions" :key="action[0]" role="menuitem" type="button" :disabled="busy" :class="{'catalog-danger':action[0]==='delete'}" @click="emit('choose',action[0])">
    <UiIcon :name="action[2]" :size="15"/><span>{{action[1]}}</span>
   </button>
  </div>
 </Teleport>
</template>
<style scoped>
.catalog-context-dismiss{position:fixed;inset:0;z-index:88;background:transparent}
.catalog-context-menu{position:fixed;z-index:89;min-width:220px;max-width:min(240px,calc(100vw - 16px));padding:5px;background:var(--surface,#fff);border:1px solid var(--border,#dce7df);border-radius:10px;box-shadow:0 13px 34px #1d3b292c}
.catalog-context-menu button{width:100%;display:flex;align-items:center;gap:10px;border:0;border-radius:6px;padding:8px 9px;text-align:left;background:transparent;font-size:12px;color:var(--ink,#25392f);min-height:33px}
.catalog-context-menu button:hover,.catalog-context-menu button:focus-visible{background:var(--primary-soft,#e4f2e8)}
.catalog-context-menu button.catalog-danger{color:var(--danger,#bd504b)}
.catalog-context-menu button:disabled{opacity:.55;cursor:wait}
.catalog-context-menu svg{flex:none}
</style>
