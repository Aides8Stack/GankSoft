<script setup lang="ts">
import {onMounted,ref,shallowRef} from 'vue';
import {unifiedWorkspace} from '../services';
import type {Input,Output} from '../../shared/protocol/registry';
import Cards from './UnifiedCardRecycle.vue';
import KnowledgeActions from '../components/KnowledgeTreeActions.vue';
const props=defineProps<{deckId?:string}>(),emit=defineEmits<{changed:[]}>();
const tab=ref<'decks'|'cards'|'knowledge'>(props.deckId?'cards':'decks'),current=ref(props.deckId??''),busy=ref(false),error=ref(''),unknown=ref(false);
const decks=ref<Output<'workspace.recycle.decks'>['items']>([]),active=ref<Output<'workspace.recycle.decks'>['items']>([]),selection=ref<string[]>([]),cursor=ref<string|null>(null),activeCursor=ref<string|null>(null);
const cards=shallowRef<InstanceType<typeof Cards>>(),knowledge=shallowRef<InstanceType<typeof KnowledgeActions>>();
let pending:{payload:Input<'workspace.decks.batch'>;requestId:string}|null=null;
async function load(more=false){busy.value=true;error.value='';try{const r=await unifiedWorkspace.recycleDecks({deleted:true,after:more?cursor.value:null});decks.value=more?[...decks.value,...r.items]:r.items;cursor.value=r.nextCursor;if(!more)selection.value=[];}catch(e){error.value=String(e);}finally{busy.value=false;}}
async function loadActive(more=false){try{const r=await unifiedWorkspace.recycleDecks({deleted:false,after:more?activeCursor.value:null});active.value=more?[...active.value,...r.items]:r.items;activeCursor.value=r.nextCursor;}catch(e){error.value=String(e);}}
async function execute(){if(!pending||busy.value)return;busy.value=true;error.value='';try{await unifiedWorkspace.batchDecks(pending.payload,pending.requestId);pending=null;unknown.value=false;await load();await loadActive();emit('changed');}catch(e){unknown.value=!(e as {definitive?:boolean}).definitive;if(!unknown.value)pending=null;error.value=String(e);}finally{busy.value=false;}}
async function restore(){if(!selection.value.length||!confirm('恢复选中的卡片集及随集删除的卡片和知识点？此前单独删除的内容继续留在回收站。'))return;pending={requestId:crypto.randomUUID(),payload:{action:'restore',decks:decks.value.filter(d=>selection.value.includes(d.id)).map(d=>({id:d.id,expectedRevision:d.revision}))}};await execute();}
function close(){return !busy.value&&!pending&&!unknown.value&&(cards.value?.close()??true)&&(knowledge.value?.close()??true);}
function changeTab(value:typeof tab.value){if(close())tab.value=value;}
function selectDeck(e:Event){if(!close()){(e.target as HTMLSelectElement).value=current.value;return;}current.value=(e.target as HTMLSelectElement).value;}
onMounted(async()=>{await load();try{await loadActive();}catch(e){error.value=String(e);}});defineExpose({close});
</script>
<template><section aria-label="统一回收站"><nav aria-label="回收站分类"><button v-for="(label,key) in {decks:'卡片集',cards:'卡片',knowledge:'知识点'}" :key="key" :disabled="busy||unknown" :aria-current="tab===key?'page':undefined" @click="changeTab(key)">{{label}}</button></nav><p v-if="error" role="alert">{{error}}</p>
 <template v-if="tab==='decks'"><p>恢复保留原卡片身份、图片、草稿、复盘历史和调度；缺失文件夹会恢复到根目录，同名卡片集会自动调整名称。</p><button :disabled="busy||unknown||!selection.length" @click="restore">恢复选中卡片集</button><button :disabled="busy||unknown" @click="load()">刷新卡片集回收站</button><label v-for="d in decks" :key="d.id"><input type="checkbox" :value="d.id" v-model="selection" :disabled="busy||unknown" :aria-label="'恢复卡片集 '+d.name"/>{{d.name}}</label><p v-if="!decks.length&&!busy">没有已删除的卡片集。</p><button v-if="cursor" :disabled="busy||unknown" @click="load(true)">更多已删卡片集</button></template>
 <template v-else><label>卡片集<select aria-label="回收站卡片集" :value="current" :disabled="busy||unknown" @change="selectDeck"><option value="">请选择卡片集</option><option v-if="deckId&&!active.some(d=>d.id===deckId)" :value="deckId">当前卡片集</option><option v-for="d in active" :key="d.id" :value="d.id">{{d.name}}</option></select></label><button v-if="activeCursor" @click="loadActive(true)">更多卡片集</button><p v-if="!current">请选择卡片集以查看可恢复内容。</p><Cards v-if="current&&tab==='cards'" :key="current" ref="cards" :deck-id="current" @changed="emit('changed')"/><section v-else-if="current&&tab==='knowledge'" aria-label="知识点回收站"><p>恢复原知识子树；可修改恢复名称与挂载位置解决冲突。</p><KnowledgeActions recycle-only ref="knowledge" :key="current" :deck-id="current" selected-id="" :flush="async()=>true" :changed="async()=>{emit('changed');}"/></section></template>
 <button v-if="unknown" :disabled="busy" @click="execute">核对原卡片集恢复请求</button>
</section></template>
<style scoped>nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}button,select{margin:4px}label{display:block;margin:12px 0}input[type=checkbox]{width:auto;margin-right:8px}p{line-height:1.7;overflow-wrap:anywhere}select{max-width:calc(100% - 8px);box-sizing:border-box}</style>
