<script setup lang="ts">
import {onMounted,onBeforeUnmount,ref,watch} from 'vue';
import type {Output} from '../../shared/protocol/registry';
import {bindMindMapPan} from '../composables/mindMapPan';
import {gankMapTheme} from '../composables/mindMapTheme';
const props=defineProps<{nodes:Output<'knowledge.tree.read'>['nodes'];selected:string[];label?:string}>();
const emit=defineEmits<{select:[id:string]}>();
const root=ref<HTMLElement>();let mind:any,disposed=false,unbind:(()=>void)|undefined;const zoom=ref(1);
function scale(delta:number){mind?.scale(Math.max(.2,Math.min(2,zoom.value+delta)));}
function fit(){mind?.scaleFit();}
function expand(all:boolean){if(!mind)return;if(all)mind.expandNodeAll(mind.findEle('gank-root'),true);else for(const node of props.nodes.filter(n=>!n.parentId))mind.expandNodeAll(mind.findEle(node.nodeId),false);highlight();}
const branch=(parent:string|null):any[]=>props.nodes.filter(n=>n.parentId===parent).map(n=>({id:n.nodeId,topic:n.name,children:branch(n.nodeId)}));
function highlight(){if(!mind)return;for(const n of props.nodes){const el=mind.findEle(n.nodeId);el?.classList.toggle('exchange-selected',props.selected.includes(n.nodeId));}}
onMounted(async()=>{const {default:MindElixir}=await import('mind-elixir');if(disposed||!root.value)return;
 mind=new MindElixir({el:root.value,editable:false,contextMenu:false,toolBar:false,keypress:false,direction:MindElixir.RIGHT,theme:gankMapTheme(MindElixir.THEME)});
 await mind.init({nodeData:{id:'gank-root',topic:'知识图谱',root:true,children:branch(null)}});
 if(disposed){mind.destroy();return;}mind.bus.addListener('selectNodes',(items:any[])=>{const id=items[0]?.nodeObj?.id;if(id&&id!=='gank-root')emit('select',id);});mind.bus.addListener('scale',(value:number)=>zoom.value=value);unbind=bindMindMapPan(root.value,(dx,dy)=>mind.move(dx,dy));mind.scaleFit();highlight();
});
watch(()=>props.selected,highlight,{deep:true});onBeforeUnmount(()=>{disposed=true;unbind?.();mind?.destroy();});
</script>
<template><div class="exchange-map-workspace"><div class="exchange-map-tools" aria-label="交换图谱操作"><button aria-label="缩小交换图谱" @click="scale(-.1)">−</button><output>{{Math.round(zoom*100)}}%</output><button aria-label="放大交换图谱" @click="scale(.1)">+</button><button @click="fit">适应图谱</button><button @click="expand(true)">全部展开</button><button @click="expand(false)">收起分支</button></div><div ref="root" class="knowledge-exchange-map" :aria-label="label??'交换范围图谱'"/></div></template>
<style>
.exchange-map-workspace{display:flex;flex-direction:column;min-height:0;flex:1;gap:10px}.exchange-map-tools{display:flex;gap:5px;align-items:center;flex-wrap:wrap}.exchange-map-tools button{font-size:11px;padding:5px 8px}.exchange-map-tools output{font-size:11px}.knowledge-exchange-map{flex:1;height:260px;min-width:0;border:1px solid var(--line,#ddd);border-radius:10px;overflow:hidden}
.knowledge-exchange-map .exchange-selected{outline:3px solid #2563eb;outline-offset:3px}
</style>
