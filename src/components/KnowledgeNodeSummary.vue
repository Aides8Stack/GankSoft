<script setup lang="ts">
import {onMounted,onBeforeUnmount,ref,watch} from 'vue';
import {unifiedKnowledge} from '../services';
const props=defineProps<{deckId:string;nodeId:string;revision:number}>();
const host=ref<HTMLElement>(),summary=ref(''),error=ref(false);
let observer:IntersectionObserver|undefined,visible=false,disposed=false,generation=0;
// Read existing committed Markdown only when its heading enters the viewport.
// Never construct an editor or invoke save to obtain a one-line summary.
async function load(){const current=++generation;summary.value='';error.value=false;try{const body=await unifiedKnowledge.node({deckId:props.deckId,nodeId:props.nodeId});if(disposed||current!==generation)return;summary.value=body.markdown.replace(/!\[([^\]]*)\]\([^\n]*?\)/g,' $1 ').replace(/\[([^\]]+)\]\([^\n]*?\)/g,'$1').replace(/<[^>]*>/g,' ').replace(/[#*_`>~|]/g,'').replace(/\s+/g,' ').trim().slice(0,160)||'暂无正文';}catch{if(!disposed&&current===generation)error.value=true;}}
watch(()=>props.revision,()=>{if(visible)void load();else{generation++;summary.value='';}});
onMounted(()=>{observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){visible=true;observer?.disconnect();void load();}},{root:host.value?.closest('.outline-body')??null});if(host.value)observer.observe(host.value);});
onBeforeUnmount(()=>{disposed=true;generation++;observer?.disconnect();});
</script>
<template><span ref="host" class="outline-summary" :title="summary">{{error?'摘要读取失败，可打开正文查看':summary||'读取摘要…'}}</span></template>
<style scoped>.outline-summary{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#85958b;font-size:11px;font-weight:400}@media(max-width:1000px){.outline-summary{max-width:35%}}</style>
