<script setup lang="ts">
import {ref, watch} from 'vue';
import {unifiedWorkspace} from '../services';
import type {Output} from '../../shared/protocol/registry';
import UiIcon from './v37/PrototypeIcon.vue';
type Item = Output<'workspace.catalog'>['items'][number];
const props = withDefaults(defineProps<{folderId?:string|null;depth?:number;path?:string[];selected?:string;revision:number}>(),{folderId:null,depth:0,path:()=>[]});
const emit = defineEmits<{select:[item:Item,path:string[]];manage:[item:Item,x:number,y:number]}>();
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
function manage(item:Item,e:MouseEvent){
 const rect=(e.currentTarget as HTMLElement).getBoundingClientRect();
 emit('manage',item,rect.right,rect.bottom);
}
watch(()=>[props.folderId,props.revision],()=>void load(),{immediate:true});
</script>
<template>
 <div class="rail-branch" :aria-busy="busy">
  <div v-for="item in items" :key="item.kind+item.id" class="rail-entry" @contextmenu.prevent.stop="emit('manage',item,$event.clientX,$event.clientY)">
   <template v-if="item.kind==='folder'">
    <button class="deck-group-label" :style="{paddingLeft:(12+depth*12)+'px'}" :aria-expanded="expanded.has(item.id)" :aria-controls="'rail-folder-'+item.id" @click="toggle(item.id)">
     <UiIcon name="folder" :size="16"/><span class="rail-name">{{item.name}}</span><UiIcon class="folder-chevron" :class="{expanded:expanded.has(item.id)}" name="chevron" :size="12"/>
    </button>
    <button type="button" class="rail-entry-manage" :aria-label="'管理文件夹 '+item.name" :title="'管理 '+item.name" @click.stop="manage(item,$event)"><UiIcon name="more" :size="15"/></button>
    <UnifiedCatalogBranch v-if="expanded.has(item.id)" :id="'rail-folder-'+item.id" :folder-id="item.id" :depth="depth+1" :path="[...path,item.name]" :selected="selected" :revision="revision"
       @select="(child,childPath)=>emit('select',child,childPath)" @manage="(child,x,y)=>emit('manage',child,x,y)"/>
   </template>
   <template v-else>
    <button class="deck-link" :style="{paddingLeft:(20+Math.max(0,depth-1)*12)+'px'}" :title="item.name+' · 卡片总数（不含回收站），非待复盘数'"
      :aria-label="item.name+'，'+(item.cardCount??'—')+' 张卡片'" :aria-current="selected===item.id?'page':undefined"
      @click="emit('select',item,[...path,item.name])">
     <span class="deck-dot blue"/><span class="rail-name">{{item.name}}</span><span class="deck-counter">{{item.cardCount??'—'}}</span>
    </button>
    <button type="button" class="rail-entry-manage" :aria-label="'管理卡片集 '+item.name" :title="'管理 '+item.name" @click.stop="manage(item,$event)"><UiIcon name="more" :size="15"/></button>
   </template>
  </div>
  <p v-if="error" class="rail-load-error" role="alert">目录读取失败 <button class="text-button" :disabled="busy" @click="load()">重试目录</button></p>
  <p v-else-if="!busy&&!items.length" class="rail-empty">{{depth?'此文件夹为空':'尚无卡片集'}}</p>
  <button v-if="cursor" class="text-button rail-more" :disabled="busy" @click="load(true)">加载更多目录</button>
 </div>
</template>
<style scoped>
.rail-entry{position:relative;min-width:0}
.rail-entry>.deck-link,.rail-entry>.deck-group-label{padding-right:31px;width:100%;box-sizing:border-box;min-width:0}
.rail-entry-manage{position:absolute;right:3px;top:4px;width:26px;height:26px;display:grid;place-items:center;background:transparent;border:0;border-radius:6px;color:var(--muted,#82958c);opacity:0}
.rail-entry:hover>.rail-entry-manage,.rail-entry:focus-within>.rail-entry-manage{opacity:1}
.rail-entry-manage:hover,.rail-entry-manage:focus-visible{opacity:1;background:var(--primary-soft,#e6f2e8);color:var(--primary-dark,#276c4d)}
@media(hover:none){.rail-entry-manage{opacity:1}}
</style>
