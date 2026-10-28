<script setup lang="ts">
import {ref, watch} from 'vue';
import {unifiedWorkspace} from '../services';
import type {Output} from '../../shared/protocol/registry';
import UiIcon from './v37/PrototypeIcon.vue';
type Item = Output<'workspace.catalog'>['items'][number];
const props = withDefaults(defineProps<{folderId?:string|null;depth?:number;path?:string[];selected?:string;revision:number}>(),{folderId:null,depth:0,path:()=>[]});
const emit = defineEmits<{select:[item:Item,path:string[]]}>();
const items=ref<Item[]>([]),expanded=ref(new Set<string>()),cursor=ref<string|null>(null),busy=ref(false),error=ref('');
let generation=0;
async function load(more=false){
 const current=++generation;busy.value=true;error.value='';
 try{
  const result=await unifiedWorkspace.catalog({folderId:props.folderId,cursor:more?cursor.value:null});
  if(current!==generation)return;
  items.value=more?[...items.value,...result.items]:result.items;cursor.value=result.nextCursor;
  // Show the first level like the prototype; deeper folders are loaded on demand.
  if(!more&&props.depth===0)for(const item of result.items)if(item.kind==='folder')expanded.value.add(item.id);
 }catch(e){if(current===generation)error.value=String(e);}
 finally{if(current===generation)busy.value=false;}
}
function toggle(id:string){if(expanded.value.has(id))expanded.value.delete(id);else expanded.value.add(id);}
watch(()=>[props.folderId,props.revision],()=>void load(),{immediate:true});
</script>
<template>
 <div class="rail-branch" :aria-busy="busy">
  <div v-for="item in items" :key="item.id">
   <template v-if="item.kind==='folder'">
    <button class="deck-group-label" :style="{paddingLeft:(12+depth*12)+'px'}" :aria-expanded="expanded.has(item.id)" :aria-controls="'rail-folder-'+item.id" @click="toggle(item.id)"><UiIcon name="folder" :size="16"/><span class="rail-name">{{item.name}}</span><UiIcon class="folder-chevron" :class="{expanded:expanded.has(item.id)}" name="chevron" :size="12"/></button>
    <UnifiedCatalogBranch v-if="expanded.has(item.id)" :id="'rail-folder-'+item.id" :folder-id="item.id" :depth="depth+1" :path="[...path,item.name]" :selected="selected" :revision="revision" @select="(child,childPath)=>emit('select',child,childPath)"/>
   </template>
   <button v-else class="deck-link" :style="{paddingLeft:(20+Math.max(0,depth-1)*12)+'px'}" :title="item.name+' · 卡片总数（不含回收站），非待复盘数'" :aria-label="item.name+'，'+(item.cardCount??'—')+' 张卡片'" :aria-current="selected===item.id?'page':undefined" @click="emit('select',item,[...path,item.name])"><span class="deck-dot blue"/><span class="rail-name">{{item.name}}</span><span class="deck-counter">{{item.cardCount??'—'}}</span></button>
  </div>
  <p v-if="error" class="rail-load-error" role="alert">目录读取失败 <button class="text-button" :disabled="busy" @click="load()">重试目录</button></p>
  <p v-else-if="!busy&&!items.length" class="rail-empty">{{depth?'此文件夹为空':'尚无卡片集'}}</p>
  <button v-if="cursor" class="text-button rail-more" :disabled="busy" @click="load(true)">加载更多目录</button>
 </div>
</template>
