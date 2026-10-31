<script setup lang="ts">
import {ref, watch} from 'vue';
import {unifiedWorkspace} from '../services';
import type {Output} from '../../shared/protocol/registry';
import UiIcon from './v37/PrototypeIcon.vue';
type Item = Output<'workspace.catalog'>['items'][number];
const props = withDefaults(defineProps<{folderId?:string|null;depth?:number;path?:string[];selected?:string;revision:number;expanded:Set<string>}>(),{folderId:null,depth:0,path:()=>[]});
const emit = defineEmits<{select:[item:Item,path:string[]];manage:[event:MouseEvent,item:Item]}>();
const items=ref<Item[]>([]),cursor=ref<string|null>(null),busy=ref(false),error=ref('');
let generation=0,initialized=false;
async function load(more=false){
 const current=++generation;busy.value=true;error.value='';
 try{
  const result=await unifiedWorkspace.catalog({folderId:props.folderId,cursor:more?cursor.value:null});
  if(current!==generation)return;
  const loaded=[...result.items];let next=result.nextCursor;
  // Retain the loaded extent when a mutation refreshes the rail.
  while(!more&&next&&loaded.length<items.value.length){const page=await unifiedWorkspace.catalog({folderId:props.folderId,cursor:next});if(current!==generation)return;loaded.push(...page.items);next=page.nextCursor;}
  items.value=more?[...items.value,...loaded]:loaded;cursor.value=next;
  // Show the first level like the prototype; deeper folders are loaded on demand.
  if(!initialized&&props.depth===0)for(const item of result.items)if(item.kind==='folder')props.expanded.add(item.id);
  initialized=true;
 }catch(e){if(current===generation)error.value=String(e);}
 finally{if(current===generation)busy.value=false;}
}
function toggle(id:string){if(props.expanded.has(id))props.expanded.delete(id);else props.expanded.add(id);}
watch(()=>[props.folderId,props.revision],()=>void load(),{immediate:true});
</script>
<template>
 <div class="rail-branch" :aria-busy="busy">
  <div v-for="item in items" :key="item.id" class="rail-catalog-row" :data-catalog-id="item.id" @contextmenu.prevent.stop="emit('manage',$event,item)" @keydown.shift.f10.prevent.stop="emit('manage',$event as unknown as MouseEvent,item)">
   <template v-if="item.kind==='folder'">
    <button class="deck-group-label" :style="{paddingLeft:(12+depth*12)+'px'}" :aria-expanded="expanded.has(item.id)" :aria-controls="'rail-folder-'+item.id" @click="toggle(item.id)"><UiIcon name="folder" :size="16"/><span class="rail-name">{{item.name}}</span><UiIcon class="folder-chevron" :class="{expanded:expanded.has(item.id)}" name="chevron" :size="12"/></button>
    <button class="rail-dots" :title="'管理 '+item.name" :aria-label="'管理 '+item.name" @click.stop="emit('manage',$event,item)">⋯</button>
    <UnifiedCatalogBranch v-if="expanded.has(item.id)" :id="'rail-folder-'+item.id" :folder-id="item.id" :depth="depth+1" :path="[...path,item.name]" :selected="selected" :revision="revision" :expanded="expanded" @manage="(event,child)=>emit('manage',event,child)" @select="(child,childPath)=>emit('select',child,childPath)"/>
   </template>
   <button v-else class="deck-link" :style="{paddingLeft:(20+Math.max(0,depth-1)*12)+'px'}" :title="item.name+' · 卡片总数（不含回收站），非待复盘数'" :aria-label="item.name+'，'+(item.cardCount??'—')+' 张卡片'" :aria-current="selected===item.id?'page':undefined" @click="emit('select',item,[...path,item.name])"><span class="deck-dot blue"/><span class="rail-name">{{item.name}}</span><span class="deck-counter">{{item.cardCount??'—'}}</span></button>
   <button v-if="item.kind==='deck'" class="rail-dots" :title="'管理 '+item.name" :aria-label="'管理 '+item.name" @click.stop="emit('manage',$event,item)">⋯</button>
  </div>
  <p v-if="error" class="rail-load-error" role="alert">目录读取失败 <button class="text-button" :disabled="busy" @click="load()">重试目录</button></p>
  <p v-else-if="!busy&&!items.length" class="rail-empty">{{depth?'此文件夹为空':'尚无卡片集'}}</p>
  <button v-if="cursor" class="text-button rail-more" :disabled="busy" @click="load(true)">加载更多目录</button>
 </div>
</template>

<style scoped>
.rail-catalog-row{position:relative;min-width:0}.rail-catalog-row>.deck-link,.rail-catalog-row>.deck-group-label{padding-right:32px}.rail-dots{position:absolute;right:3px;top:4px;width:26px;height:27px;border:0;border-radius:5px;background:transparent;color:inherit;opacity:0}.rail-catalog-row:hover>.rail-dots,.rail-catalog-row:focus-within>.rail-dots{opacity:1;background:var(--active,#e4f1e9)}@media(hover:none){.rail-dots{opacity:1}}
</style>
