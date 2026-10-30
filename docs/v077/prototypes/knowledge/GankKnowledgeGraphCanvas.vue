<script setup lang="ts">
import {computed,ref,nextTick,watch} from 'vue';
import type {KnowledgeNode} from './knowledge-preview-types';
const props=defineProps<{nodes:KnowledgeNode[];selectedIds:string[];focusedId?:string|null}>();
const emit=defineEmits<{toggle:[id:string]}>();
const host=ref<HTMLElement>();
const rows=computed(()=>{
 const seen=new Set<string>(),out:{node:KnowledgeNode;depth:number;x:number;y:number}[]=[];
 const walk=(id:string|null,depth:number)=>{for(const n of props.nodes.filter(z=>z.parentId===id)){
  if(seen.has(n.id))continue;seen.add(n.id);out.push({node:n,depth,x:18+depth*175,y:16+out.length*49});walk(n.id,depth+1);
 }};
 walk(null,0);for(const n of props.nodes)if(!seen.has(n.id)){out.push({node:n,depth:0,x:18,y:16+out.length*49});seen.add(n.id);}
 return out;
});
const connectors=computed(()=>rows.value.flatMap(r=>{const p=rows.value.find(x=>x.node.id===r.node.parentId);return p?[{id:r.node.id,x1:p.x+142,y1:p.y+17,x2:r.x,y2:r.y+17}]:[];}));
async function focus(id:string){await nextTick();const n=host.value?.querySelector<HTMLElement>('[data-node-id="'+id+'"]');n?.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});}
watch(()=>props.focusedId,id=>{if(id)void focus(id);});
defineExpose({focus});
</script>
<template>
 <div ref="host" class="graph-preview-scroll" aria-label="知识图谱多选预览">
  <svg :viewBox="'0 0 '+Math.max(600,...rows.map(r=>r.x+162))+' '+Math.max(400,rows.length*49+40)" :height="Math.max(400,rows.length*49+40)" :width="Math.max(600,...rows.map(r=>r.x+162))" xmlns="http://www.w3.org/2000/svg">
   <path v-for="e in connectors" :key="e.id" :d="'M '+e.x1+' '+e.y1+' C '+(e.x1+e.x2)/2+' '+e.y1+' '+(e.x1+e.x2)/2+' '+e.y2+' '+e.x2+' '+e.y2" fill="none" stroke="#a4d1b6" stroke-width="1.8"/>
   <g v-for="r in rows" :key="r.node.id" :data-node-id="r.node.id" :transform="'translate('+r.x+' '+r.y+')'" role="button" tabindex="0" :aria-pressed="selectedIds.includes(r.node.id)" @click="emit('toggle',r.node.id)" @keydown.enter.prevent="emit('toggle',r.node.id)" @keydown.space.prevent="emit('toggle',r.node.id)">
    <rect width="142" height="34" rx="8" :fill="selectedIds.includes(r.node.id)?'#257459':'#f9fcfa'" :stroke="focusedId===r.node.id?'#d3a044':selectedIds.includes(r.node.id)?'#24785a':'#b7d6c3'" :stroke-width="focusedId===r.node.id?2.7:1.3"/>
    <text x="71" y="21" font-size="12" text-anchor="middle" :fill="selectedIds.includes(r.node.id)?'#fff':'#365444'">{{r.node.name.length>9?r.node.name.slice(0,9)+'…':r.node.name}}</text>
   </g>
  </svg>
 </div>
</template>
<style scoped>.graph-preview-scroll{min-width:0;height:100%;overflow:auto;background:radial-gradient(#dfebe3 0.7px,transparent .7px) 0 0/19px 19px}.graph-preview-scroll g{cursor:pointer;outline:none}.graph-preview-scroll g:focus-visible rect{stroke:#d3a044;stroke-width:3}</style>
