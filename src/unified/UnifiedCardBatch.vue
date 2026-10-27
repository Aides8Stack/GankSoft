<script setup lang="ts">
import {ref,shallowRef,defineAsyncComponent} from 'vue';
const Exchange=defineAsyncComponent(()=>import('./UnifiedCardExchange.vue'));
const exchanging=ref(false),exchange=shallowRef<InstanceType<typeof Exchange>>();
import {unifiedCards,unifiedWorkspace} from '../services';
import type {Input,Output} from '../../shared/protocol/registry';
const props=defineProps<{deckId:string;cards:{cardId:string;title:string;revision:number}[];restore?:boolean}>();
const emit=defineEmits<{changed:[];clear:[]}>();
const busy=ref(false),unknown=ref(false),error=ref(''),notice=ref(''),choosing=ref(false),folder=ref<string|null>(null),catalog=shallowRef<Output<'workspace.catalog'>>(),items=ref<Output<'workspace.catalog'>['items']>([]);
let pending:{method:'batch';payload:Input<'card.batch.apply'>;id:string}|{method:'restore';payload:Input<'card.recycle.restore'>;id:string}|null=null;
async function execute(){if(!pending||busy.value)return;busy.value=true;error.value='';try{
 const p=pending,result=p.method==='batch'?await unifiedCards.batch(p.payload,p.id):await unifiedCards.restore(p.payload,p.id);
 pending=null;unknown.value=false;choosing.value=false;notice.value=`已${result.action==='move'?'移动':result.action==='delete'?'移到回收站':'恢复'} ${result.count} 张卡片`;emit('changed');
 }catch(e){unknown.value=!(e as {definitive?:boolean}).definitive;if(!unknown.value)pending=null;error.value=String(e);}finally{busy.value=false;}}
const selection=()=>props.cards.map(c=>({cardId:c.cardId,expectedRevision:c.revision}));
async function remove(){if(!confirm(`将选中的 ${props.cards.length} 张卡片移到回收站？已发布内容、草稿和历史会保留。`))return;pending={method:'batch',id:crypto.randomUUID(),payload:{deckId:props.deckId,cards:selection(),action:'delete'}};await execute();}
async function restoreSelected(){if(!confirm(`恢复选中的 ${props.cards.length} 张卡片？`))return;pending={method:'restore',id:crypto.randomUUID(),payload:{deckId:props.deckId,cards:selection()}};await execute();}
async function browse(id:string|null=null,more=false){busy.value=true;error.value='';try{const r=await unifiedWorkspace.catalog({folderId:id,cursor:more?catalog.value?.nextCursor:null});catalog.value=r;folder.value=id;items.value=more?[...items.value,...r.items]:r.items;choosing.value=true;}catch(e){error.value=String(e);}finally{busy.value=false;}}
async function move(item:{id:string;name:string;revision:number}){if(!confirm(`将 ${props.cards.length} 张卡片移动到“${item.name}”？保留身份、历史和排期，清除当前知识点关联。`))return;pending={method:'batch',id:crypto.randomUUID(),payload:{deckId:props.deckId,cards:selection(),action:'move',targetDeckId:item.id,expectedTargetRevision:item.revision}};await execute();}
defineExpose({close:()=>!busy.value&&!unknown.value&&!pending&&(!exchanging.value||exchange.value?.close()!==false)});
</script>
<template>
 <section aria-label="卡片批量操作">
  <div v-if="cards.length" role="toolbar" aria-label="批量卡片生命周期"><span>已选 {{cards.length}} 张</span><template v-if="restore"><button :disabled="busy||unknown" @click="restoreSelected">恢复选中卡片</button></template><template v-else><button :disabled="busy||unknown||exchanging" @click="exchanging=true">导出选中卡片</button><button :disabled="busy||unknown||exchanging" @click="browse()">移动选中卡片</button><button :disabled="busy||unknown||exchanging" @click="remove">移到回收站</button></template><button :disabled="busy||unknown||exchanging" @click="exchanging=false;emit('clear')">取消选择</button></div>
  <Exchange v-if="exchanging" ref="exchange" :deck-id="deckId" :cards="cards" @close="exchanging=false"/>
  <section v-if="choosing" aria-label="选择目标卡片集"><h3>选择目标卡片集</h3><nav aria-label="移动目录路径"><button :disabled="busy||unknown" @click="browse()">全部卡片集</button><button v-for="b in catalog?.breadcrumbs" :key="b.id" :disabled="busy||unknown" @click="browse(b.id)">{{b.name}}</button></nav><button v-for="i in items" :key="i.kind+i.id" :disabled="busy||unknown||i.id===deckId" @click="i.kind==='folder'?browse(i.id):move(i)">{{i.kind==='folder'?'文件夹 · ':''}}{{i.name}}</button><button v-if="catalog?.nextCursor" :disabled="busy||unknown" @click="browse(folder,true)">更多目标</button><button :disabled="busy||unknown" @click="choosing=false">取消移动</button></section>
  <p v-if="notice" role="status">{{notice}}</p><p v-if="error" role="alert">{{error}}</p><button v-if="unknown" :disabled="busy" @click="execute">核对原批量请求</button>
 </section>
</template>
<style scoped>section{margin:12px 0}div[role=toolbar]{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px;background:var(--panel,#fff);border:1px solid var(--line,#ddd);border-radius:8px}button{margin:4px}section[aria-label=选择目标卡片集]{padding:16px;border:1px solid var(--line,#ddd);border-radius:8px}</style>
