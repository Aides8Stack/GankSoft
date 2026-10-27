<script setup lang="ts">
import {onMounted,onBeforeUnmount,ref,watch} from 'vue';
import type {Output} from '../../shared/protocol/registry';
import {gankMapTheme} from '../composables/mindMapTheme';
const props=defineProps<{nodes:Output<'knowledge.tree.read'>['nodes'];selected:string[];label?:string}>();
const emit=defineEmits<{select:[id:string]}>();
const root=ref<HTMLElement>();let mind:any,disposed=false;
const branch=(parent:string|null):any[]=>props.nodes.filter(n=>n.parentId===parent).map(n=>({id:n.nodeId,topic:n.name,children:branch(n.nodeId)}));
function highlight(){if(!mind)return;for(const n of props.nodes){const el=mind.findEle(n.nodeId);el?.classList.toggle('exchange-selected',props.selected.includes(n.nodeId));}}
onMounted(async()=>{const {default:MindElixir}=await import('mind-elixir');if(disposed||!root.value)return;
 mind=new MindElixir({el:root.value,editable:false,contextMenu:false,toolBar:false,keypress:false,direction:MindElixir.RIGHT,theme:gankMapTheme(MindElixir.THEME)});
 await mind.init({nodeData:{id:'gank-root',topic:'知识图谱',root:true,children:branch(null)}});
 if(disposed){mind.destroy();return;}mind.bus.addListener('selectNodes',(items:any[])=>{const id=items[0]?.nodeObj?.id;if(id&&id!=='gank-root')emit('select',id);});mind.scaleFit();highlight();
});
watch(()=>props.selected,highlight,{deep:true});onBeforeUnmount(()=>{disposed=true;mind?.destroy();});
</script>
<template><div ref="root" class="knowledge-exchange-map" :aria-label="label??'交换范围图谱'"/></template>
<style>
.knowledge-exchange-map{height:260px;min-width:0;border:1px solid var(--line,#ddd);border-radius:10px;overflow:hidden}
.knowledge-exchange-map .exchange-selected{outline:3px solid #2563eb;outline-offset:3px}
</style>
