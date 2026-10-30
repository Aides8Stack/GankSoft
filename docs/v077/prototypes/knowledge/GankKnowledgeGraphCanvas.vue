<script setup lang="ts">
/**
 * Shared DESIGN-ONLY Vue knowledge graph canvas.
 * Production should reuse existing MindElixir rendering/IPC, not this SVG demo.
 * Selected IDs come from the parent; focus never changes the selection.
 */
import {computed,ref,watch,nextTick} from 'vue';
import type {KnowledgeNode} from './knowledge-preview-types';

const props=withDefaults(defineProps<{nodes:KnowledgeNode[];selectedIds:string[];focusedId?:string|null;disabledIds?:string[]}>(),{disabledIds:()=>[]});
const emit=defineEmits<{toggle:[id:string]}>();
const host=ref<HTMLElement>();
const zoom=ref(1);
const rows=computed(()=>{
 const seen=new Set<string>(),out:{node:KnowledgeNode;depth:number;x:number;y:number}[]=[];
 const walk=(id:string|null,depth:number)=>{
  for(const n of props.nodes.filter(z=>z.parentId===id)){
   if(seen.has(n.id))continue;
   seen.add(n.id);out.push({node:n,depth,x:25+depth*169,y:24+out.length*49});walk(n.id,depth+1);
  }
 };
 walk(null,0);
 for(const n of props.nodes)if(!seen.has(n.id)){out.push({node:n,depth:0,x:25,y:24+out.length*49});seen.add(n.id);}
 return out;
});
const lines=computed(()=>rows.value.flatMap(r=>{
 const parent=rows.value.find(x=>x.node.id===r.node.parentId);
 return parent?[{id:r.node.id,x1:parent.x+142,y1:parent.y+17,x2:r.x,y2:r.y+17}]:[];
}));
const size=computed(()=>({w:Math.max(640,...rows.value.map(r=>r.x+180)),h:Math.max(430,rows.value.length*49+70)}));
function setZoom(z:number){zoom.value=Math.max(.55,Math.min(2.2,Math.round(z*100)/100));}
function zoomIn(){setZoom(zoom.value+.15);}
function zoomOut(){setZoom(zoom.value-.15);}
function fit(){const el=host.value;if(!el)return;setZoom(Math.min(el.clientWidth/size.value.w,el.clientHeight/size.value.h,1.35));}
function onWheel(e:WheelEvent){if(e.ctrlKey){e.preventDefault();setZoom(zoom.value+(e.deltaY<0?.1:-.1));}}
async function focus(id:string){
 await nextTick();
 const el=host.value,n=el?.querySelector<SVGGElement>('[data-node-id="'+id+'"]');
 if(!el||!n)return;
 const nr=n.getBoundingClientRect(),hr=el.getBoundingClientRect();
 el.scrollLeft+=nr.left-hr.left+nr.width/2-el.clientWidth/2;
 el.scrollTop+=nr.top-hr.top+nr.height/2-el.clientHeight/2;
}
function clickNode(id:string){if(!props.disabledIds.includes(id))emit('toggle',id);}
let pan:{x:number;y:number;left:number;top:number;pointer:number}|null=null;
function panStart(e:PointerEvent){
 if(e.button!==0||(e.target as Element).closest('[data-node-id],button'))return;
 const el=host.value;if(!el)return;
 pan={x:e.clientX,y:e.clientY,left:el.scrollLeft,top:el.scrollTop,pointer:e.pointerId};
 el.setPointerCapture(e.pointerId);
}
function panMove(e:PointerEvent){if(!pan||e.pointerId!==pan.pointer||!host.value)return;host.value.scrollLeft=pan.left+pan.x-e.clientX;host.value.scrollTop=pan.top+pan.y-e.clientY;}
function panStop(e:PointerEvent){if(!pan||e.pointerId!==pan.pointer)return;if(host.value?.hasPointerCapture(e.pointerId))host.value.releasePointerCapture(e.pointerId);pan=null;}
watch(()=>props.focusedId,id=>{if(id)void focus(id);});
defineExpose({focus,zoomIn,zoomOut,fit});
</script>

<template>
 <div class="graph-preview" aria-label="知识图谱选择演示">
  <div class="graph-controls">
   <button title="缩小" aria-label="缩小图谱" @click="zoomOut">−</button>
   <span>{{Math.round(zoom*100)}}%</span>
   <button title="放大" aria-label="放大图谱" @click="zoomIn">＋</button>
   <button title="适应画布" aria-label="适应画布" @click="fit">⌗</button>
  </div>
  <div ref="host" class="graph-preview-scroll" @wheel="onWheel" @pointerdown="panStart" @pointermove="panMove" @pointerup="panStop" @pointercancel="panStop">
   <svg :viewBox="'0 0 '+size.w+' '+size.h" :height="size.h*zoom" :width="size.w*zoom" xmlns="http://www.w3.org/2000/svg">
    <path v-for="edge in lines" :key="edge.id" :d="'M '+edge.x1+' '+edge.y1+' C '+(edge.x1+edge.x2)/2+' '+edge.y1+' '+(edge.x1+edge.x2)/2+' '+edge.y2+' '+edge.x2+' '+edge.y2" fill="none" stroke="#a4d1b6" stroke-width="1.8"/>
    <g v-for="r in rows" :key="r.node.id" :data-node-id="r.node.id" :transform="'translate('+r.x+' '+r.y+')'"
       role="button" :tabindex="disabledIds.includes(r.node.id)?-1:0"
       :aria-disabled="disabledIds.includes(r.node.id)" :aria-pressed="selectedIds.includes(r.node.id)"
       @click="clickNode(r.node.id)" @keydown.enter.prevent="clickNode(r.node.id)" @keydown.space.prevent="clickNode(r.node.id)">
     <rect width="142" height="34" rx="8"
           :fill="disabledIds.includes(r.node.id)?'#e3f2e8':selectedIds.includes(r.node.id)?'#257459':'#f9fcfa'"
           :stroke="focusedId===r.node.id?'#d3a044':selectedIds.includes(r.node.id)?'#24785a':'#b7d6c3'"
           :stroke-width="focusedId===r.node.id?2.7:1.3"/>
     <text x="71" y="21" font-size="12" text-anchor="middle" :fill="selectedIds.includes(r.node.id)?'#fff':'#365444'">{{r.node.name.length>9?r.node.name.slice(0,9)+'…':r.node.name}}</text>
    </g>
   </svg>
  </div>
 </div>
</template>
<style scoped>
.graph-preview{position:relative;min-width:0;min-height:0;height:100%;overflow:hidden}
.graph-preview-scroll{height:100%;overflow:auto;cursor:grab;touch-action:pan-x pan-y;background:radial-gradient(#dfebe3 .7px,transparent .7px) 0 0/19px 19px}
.graph-preview-scroll:active{cursor:grabbing}.graph-preview-scroll g{cursor:pointer;outline:none}.graph-preview-scroll g:focus-visible rect{stroke:#d3a044;stroke-width:3}
.graph-controls{position:absolute;z-index:2;top:9px;left:10px;display:flex;align-items:center;gap:3px;background:#ffffffee;border:1px solid #deebe2;border-radius:7px;padding:3px;box-shadow:0 3px 12px #22553b13}
.graph-controls button{border:0;background:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;color:#315c46;min-width:24px;font-size:16px}
.graph-controls button:hover{background:#e8f4eb}.graph-controls span{font-size:10px;color:#70877b;min-width:33px;text-align:center}
</style>
