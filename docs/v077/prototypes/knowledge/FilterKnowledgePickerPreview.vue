<script setup lang="ts">
import {computed,onBeforeUnmount,ref,watch} from 'vue';
import GankKnowledgeGraphCanvas from './GankKnowledgeGraphCanvas.vue';
import type {KnowledgeNode} from './knowledge-preview-types';
/** Preview-only UI contract: confirm emits temporary IDs; parent must separately click “应用知识点”. */
const props=defineProps<{open:boolean;nodes:KnowledgeNode[];selectedIds:string[];deckName?:string}>();
const emit=defineEmits<{confirm:[ids:string[]];cancel:[]}>();
const chosen=ref<string[]>([]),query=ref(''),focused=ref<string|null>(null),popup=ref<string|null>(null),toast=ref(''),matches=ref<KnowledgeNode[]>([]);
const graph=ref<InstanceType<typeof GankKnowledgeGraphCanvas>>();
const byId=computed(()=>new Map(props.nodes.map(n=>[n.id,n])));
let timer:ReturnType<typeof setTimeout>|undefined;
function notify(t:string){toast.value=t;if(timer)clearTimeout(timer);timer=setTimeout(()=>toast.value='',1200);}
function descendants(id:string){const visited=new Set([id]),out:string[]=[],stack=[id];while(stack.length){const p=stack.pop()!;for(const n of props.nodes.filter(x=>x.parentId===p)){if(!visited.has(n.id)){visited.add(n.id);out.push(n.id);stack.push(n.id);}}}return out;}
function path(id:string){const names:string[]=[],visited=new Set<string>();let node=byId.value.get(id);while(node&&!visited.has(node.id)){visited.add(node.id);names.unshift(node.name);node=node.parentId?byId.value.get(node.parentId):undefined;}return names.join(' / ');}
function toggle(id:string){const s=new Set(chosen.value);if(s.has(id)){s.delete(id);popup.value=null;}else{s.add(id);popup.value=descendants(id).length?id:null;}chosen.value=[...s];}
function subtree(){if(!popup.value)return;const s=new Set(chosen.value),children=descendants(popup.value),all=children.every(x=>s.has(x));for(const id of children)all?s.delete(id):s.add(id);chosen.value=[...s];popup.value=null;}
function locate(id:string){focused.value=id;graph.value?.focus(id);matches.value=[];popup.value=null;}
function search(){const q=query.value.trim().toLocaleLowerCase('zh-CN');if(!q){notify('请输入知识点名称');return;}const found=props.nodes.filter(x=>x.name.toLocaleLowerCase('zh-CN').includes(q)||path(x.id).toLocaleLowerCase('zh-CN').includes(q));if(!found.length){matches.value=[];notify('知识点不存在');return;}locate(found[0].id);if(found.length>1)matches.value=found;}
watch(()=>props.open,value=>{if(value){chosen.value=[...props.selectedIds];query.value='';focused.value=null;popup.value=null;matches.value=[];toast.value='';}},{immediate:true});
onBeforeUnmount(()=>{if(timer)clearTimeout(timer);});
</script>
<template>
 <div v-if="open" class="picker-mask"><section class="picker" role="dialog" aria-modal="true" aria-label="选择知识点">
  <header><div><strong>选择知识点</strong><small>{{deckName??'当前卡片集'}} · 图谱点击选中/取消；子树需明确选择</small></div><button title="关闭" @click="emit('cancel')">×</button></header>
  <div class="map-wrap"><GankKnowledgeGraphCanvas ref="graph" :nodes="nodes" :selected-ids="chosen" :focused-id="focused" :disabled-ids="['root']" @toggle="toggle"/>
   <div v-if="popup" class="subtree-pop"><button @click="subtree">{{descendants(popup).every(x=>chosen.includes(x))?'取消全部子知识点':'选中全部子知识点'}}</button><button @click="popup=null">关闭</button></div>
  </div>
  <div class="selected"><strong>已选知识点（{{chosen.length}}）</strong><div class="chips"><button v-for="id in chosen" :key="id" :title="path(id)" @click="toggle(id)">{{byId.get(id)?.name}} ×</button><span v-if="!chosen.length">点击图谱选择知识点</span></div></div>
  <form class="search" @submit.prevent="search"><input v-model="query" placeholder="搜索知识点名称或完整路径" aria-label="搜索知识点"/><button type="submit">搜索定位</button>
   <div v-if="matches.length>1" class="candidates"><button v-for="n in matches" :key="n.id" type="button" @click="locate(n.id)">{{path(n.id)}}</button></div>
  </form>
  <footer><span>已选择 {{chosen.length}} 个 · 确认后仍需在筛选页点击“应用知识点”</span><button @click="emit('cancel')">取消</button><button class="primary" @click="emit('confirm',[...chosen])">确认选择</button></footer>
  <div v-if="toast" class="picker-toast" role="alert">{{toast}}</div>
 </section></div>
</template>
<style scoped>
.picker-mask{position:fixed;inset:0;background:#1e312a77;display:grid;place-items:center;z-index:80;padding:15px;font:13px/1.5 "Microsoft Yahei",sans-serif}
.picker{width:min(920px,94vw);height:min(760px,92vh);display:grid;grid-template-rows:64px minmax(180px,1fr) 99px 58px 64px;background:#fff;border-radius:13px;overflow:hidden;position:relative;color:#2d4839}
header,footer{display:flex;align-items:center;gap:12px;padding:10px 18px;border-bottom:1px solid #e0eae3}header{justify-content:space-between}header strong{display:block;font-size:16px}header small{display:block;color:#819489;font-size:11px}
button{cursor:pointer;border:1px solid #d6e2da;background:#fff;color:inherit;border-radius:7px;padding:7px 10px}button:hover{background:#e7f2e9}.primary{background:#286d54;color:#fff;border-color:#286d54}
.map-wrap{position:relative;min-height:0;border-bottom:1px solid #dce8df}.subtree-pop{position:absolute;right:14px;top:10px;z-index:2;display:flex;gap:8px;background:#fff;box-shadow:0 6px 20px #153b2b2a;padding:7px;border-radius:8px}
.selected{min-height:0;padding:10px 16px;overflow:hidden;border-bottom:1px solid #e0eae3}.selected strong{font-size:12px}.chips{display:flex;gap:6px;overflow-y:auto;max-height:59px;flex-wrap:wrap;margin-top:7px}.chips button{background:#e6f2e9;color:#286d54;padding:3px 8px;font-size:11px}
.search{position:relative;display:flex;align-items:center;gap:8px;padding:8px 16px}.search input{flex:1;min-width:0;padding:8px;border:1px solid #d5e1d9;border-radius:7px}
.candidates{position:absolute;z-index:4;left:16px;right:110px;bottom:52px;max-height:145px;overflow:auto;background:#fff;border:1px solid #dce7df;box-shadow:0 9px 24px #24412c2a;padding:5px;border-radius:9px}.candidates button{display:block;width:100%;text-align:left;border:0}
footer{border-top:1px solid #e0eae3;border-bottom:0}footer span{flex:1;font-size:11px;color:#789084}
.picker-toast{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);background:#263d34d8;color:#fff;border-radius:12px;padding:13px 22px;box-shadow:0 12px 25px #1939272f;pointer-events:none}
</style>
