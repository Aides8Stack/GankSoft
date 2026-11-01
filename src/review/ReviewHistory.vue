<script setup lang="ts">
import {onBeforeUnmount,ref,shallowRef,watch} from 'vue';
import type {Input,Output} from '../../shared/protocol/registry';
import {dataSync,unifiedWorkspace} from '../services';
type Filter=Input<'workspace.sessions'>['status'];
const props=defineProps<{deckId:string;initialFilter:Filter}>();
const emit=defineEmits<{back:[];open:[id:string];filter:[value:Filter]}>();
const filter=ref<Filter>(props.initialFilter),items=shallowRef<Output<'workspace.sessions'>['items']>([]),cursor=ref<string|null>(null),busy=ref(false),error=ref('');
let seq=0,disposed=false,stamp:ReturnType<typeof dataSync.snapshot>=null;
async function load(more=false){const token=++seq,selected=filter.value,id=props.deckId,prior=stamp;busy.value=true;error.value='';if(!more){items.value=[];cursor.value=null;}
 try{const result=await unifiedWorkspace.sessions({deckId:id,status:selected,after:more?cursor.value:null,limit:20});
 if(disposed||token!==seq||id!==props.deckId||selected!==filter.value)return;dataSync.assertCurrent(result);
 const next=dataSync.metadata(result)!;if(more&&(!prior||prior.dataEpoch!==next.dataEpoch||prior.dataRevision!==next.dataRevision))throw Error('数据已变化，请重新读取历史');
 items.value=[...(more?items.value:[]),...result.items].sort((a,b)=>b.startedAt.localeCompare(a.startedAt));cursor.value=result.nextCursor;stamp=next;}
 catch(e){if(token===seq){items.value=[];cursor.value=null;error.value='历史尚未读取，请重新读取。'+String(e);}}
 finally{if(token===seq)busy.value=false;}}
const stop=dataSync.subscribe(c=>{if(c.epochChanged||!c.deckId||c.deckId===props.deckId)void load();});
watch(()=>props.deckId,()=>void load(),{immediate:true});
watch(filter,v=>{emit('filter',v);void load();});
onBeforeUnmount(()=>{disposed=true;seq++;stop();});
const date=(v:string)=>new Date(v).toLocaleString('zh-CN',{hour12:false});
</script>
<template>
 <section aria-label="复盘历史" :aria-busy="busy" class="review-history">
  <div class="page-heading"><div><h1>复盘历史</h1><p>当前卡片集的历史队列</p></div><button class="button" @click="emit('back')">返回所有卡片</button></div>
  <div class="section-heading"><h2>历史队列列表</h2><nav aria-label="复盘历史筛选"><button v-for="f in (['all','incomplete','completed'] as const)" :key="f" class="button small" :aria-pressed="filter===f" @click="filter=f">{{{all:'全部',incomplete:'未完成',completed:'已结束'}[f]}}</button></nav></div>
  <p v-if="error" role="alert">{{error}} <button class="button" @click="load()">重新读取</button></p>
  <div class="surface table-wrap"><table class="data-table history-table"><thead><tr><th>队列 / 开始时间</th><th>状态</th><th>完成卡片</th><th>平均自评</th><th>有效用时</th><th>操作</th></tr></thead><tbody>
   <tr v-for="s in items" :key="s.sessionId" :data-session-id="s.sessionId"><td>{{s.title}}<small>{{date(s.startedAt)}}</small></td><td>{{s.completed?'已结束':'未完成'}}</td><td>{{s.completedCount}} / {{s.total}}</td><td>{{s.averageScoreTenths===null?'—':(s.averageScoreTenths/10).toFixed(1)}}</td><td>{{s.totalSeconds}} 秒</td><td><button class="button small" @click="emit('open',s.sessionId)">{{s.completed?'查看结算':'查看进度'}}</button></td></tr>
  </tbody></table><p v-if="!busy&&!items.length&&!error" class="empty-state">暂无符合条件的队列</p></div>
  <button v-if="cursor" class="button" :disabled="busy" @click="load(true)">更多历史队列</button>
 </section>
</template>
<style scoped>
.history-table{min-width:660px}td small{display:block;color:var(--muted);margin-top:6px}.section-heading{flex-wrap:wrap;gap:10px}
</style>
