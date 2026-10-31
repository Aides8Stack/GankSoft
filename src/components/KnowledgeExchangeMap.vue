<script setup lang="ts">
import {onMounted,onBeforeUnmount,ref,watch} from 'vue';
import type {Output} from '../../shared/protocol/registry';
import {bindMindMapPan} from '../composables/mindMapPan';
import {gankMapTheme} from '../composables/mindMapTheme';
import {effectiveTheme} from '../composables/preferences';
import MapIcon from '../unified/v37/PrototypeIcon.vue';
const props=defineProps<{nodes:Pick<Output<'knowledge.tree.read'>['nodes'][number],'nodeId'|'parentId'|'name'|'position'>[];selected:string[];label?:string}>();
const emit=defineEmits<{select:[id:string]}>();
const root=ref<HTMLElement>();let mind:any,disposed=false,unbind:(()=>void)|undefined;const zoom=ref(1);
let pointer:{x:number;y:number}|undefined;
function scale(delta:number){mind?.scale(Math.max(.2,Math.min(2,zoom.value+delta)));}
function fit(){mind?.scaleFit();}
function expand(all:boolean){if(!mind)return;if(all)mind.expandNodeAll(mind.findEle('gank-root'),true);else for(const node of props.nodes.filter(n=>!n.parentId))mind.expandNodeAll(mind.findEle(node.nodeId),false);highlight();}
function data(){const seen=new Set<string>();function branch(parent:string|null):any[]{return props.nodes.filter(n=>n.parentId===parent&&!seen.has(n.nodeId)).sort((a,b)=>a.position-b.position).map(n=>{seen.add(n.nodeId);return{id:n.nodeId,topic:n.name,expanded:true,children:branch(n.nodeId)};});}return{nodeData:{id:'gank-root',topic:'知识图谱',root:true,children:branch(null)}};}
function highlight(){if(!mind)return;for(const n of props.nodes){const el=mind.findEle(n.nodeId);if(!el)continue;el.dataset.knowledgeId=n.nodeId;el.classList.toggle('exchange-selected',props.selected.includes(n.nodeId));el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',n.name);el.setAttribute('aria-pressed',String(props.selected.includes(n.nodeId)));}}
// Native selection events also fire during programmatic focus and do not repeat
// for an already focused node. Only actual user activation toggles IDs.
function click(event:MouseEvent){if(pointer&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>5)return;const id=(event.target as Element).closest<HTMLElement>('[data-knowledge-id]')?.dataset.knowledgeId;if(id)emit('select',id);}
function key(event:KeyboardEvent){if(!['Enter',' '].includes(event.key))return;const id=(event.target as Element).closest<HTMLElement>('[data-knowledge-id]')?.dataset.knowledgeId;if(id){event.preventDefault();emit('select',id);}}
function focus(id:string){if(!mind)return;mind.expandNodeAll(mind.findEle('gank-root'),true);const el=mind.findEle(id);if(!el)return;if(zoom.value<.75)mind.scale(.9);mind.scrollIntoView(el,true);highlight();root.value?.querySelectorAll('.exchange-focused').forEach(n=>n.classList.remove('exchange-focused'));el.classList.add('exchange-focused');}
onMounted(async()=>{const {default:MindElixir}=await import('mind-elixir');if(disposed||!root.value)return;
 mind=new MindElixir({el:root.value,editable:false,contextMenu:false,toolBar:false,keypress:false,direction:MindElixir.RIGHT,theme:gankMapTheme(MindElixir.THEME)});
 await mind.init(data());if(disposed){mind.destroy();return;}
 mind.bus.addListener('scale',(value:number)=>zoom.value=value);unbind=bindMindMapPan(root.value,(dx,dy)=>mind.move(dx,dy));mind.scaleFit();highlight();
});
watch(()=>props.selected,highlight,{deep:true});watch(()=>props.nodes,()=>{if(mind){mind.refresh(data());highlight();}});watch(effectiveTheme,()=>{if(mind)mind.changeTheme(gankMapTheme(mind.theme));});
onBeforeUnmount(()=>{disposed=true;unbind?.();mind?.destroy();});defineExpose({focus,fit});
</script>
<template><div class="exchange-map-workspace"><div class="exchange-map-tools" aria-label="交换图谱操作"><button title="缩小" aria-label="缩小交换图谱" @click="scale(-.1)">−</button><output>{{Math.round(zoom*100)}}%</output><button title="放大" aria-label="放大交换图谱" @click="scale(.1)">+</button><button title="适应图谱" aria-label="适应图谱" @click="fit"><MapIcon name="fit"/></button><button title="全部展开" aria-label="全部展开交换图谱" @click="expand(true)"><MapIcon name="expand"/></button><button title="收起分支" aria-label="收起交换图谱分支" @click="expand(false)"><MapIcon name="collapse"/></button></div><div ref="root" class="knowledge-exchange-map" :aria-label="label??'交换范围图谱'" @pointerdown="pointer={x:$event.clientX,y:$event.clientY}" @click="click" @keydown="key"/></div></template>
<style>
.exchange-map-workspace{display:flex;flex-direction:column;min-height:0;min-width:0;flex:1;gap:8px}.exchange-map-tools{display:flex;gap:5px;align-items:center;flex-wrap:wrap}.exchange-map-tools button{font-size:12px;padding:5px 8px}.exchange-map-tools output{font-size:11px}.knowledge-exchange-map{flex:1;height:260px;min-width:0;border:1px solid var(--line,#ddd);border-radius:10px;overflow:hidden}
.knowledge-exchange-map .exchange-selected{outline:3px solid #2563eb;outline-offset:3px}.knowledge-exchange-map .exchange-focused{box-shadow:0 0 0 6px #d3a04488}
</style>
