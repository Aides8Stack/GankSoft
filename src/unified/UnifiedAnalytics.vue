<script setup lang="ts">
import {computed,onBeforeUnmount,ref,shallowRef,watch} from 'vue';
import {dataSync,unifiedWorkspace,unifiedKnowledge,unifiedLearning} from '../services';
import type {Output} from '../../shared/protocol/registry';
import type {DateSelectionInput} from '../../shared/workspace-contracts';
import {useDataRefresh} from '../composables/dataRefresh';
import DateRangeControl from '../components/DateRangeControl.vue';
import ReviewLineChart from '../components/ReviewLineChart.vue';
const props=defineProps<{deckId:string;overview?:boolean}>(),emit=defineEmits<{view:[cardId:string,eventId:string]}>();
const date=ref<DateSelectionInput>({range:'30'}),result=shallowRef<Output<'workspace.analytics'>>(),rows=ref<Output<'workspace.analytics'>['items']>([]),error=ref(''),busy=ref(false),tree=shallowRef<Output<'knowledge.tree.read'>>(),mastery=shallowRef<Output<'learning.mastery.deck'>>(),knowledgeRows=ref<{nodeId:string;name:string;value:Output<'learning.mastery.knowledge'>}[]>([]),knowledgeBusy=ref(false);
const modeNames={question:'错题复盘',qa:'问答记忆',direct:'直接记忆'};
const historyOpen=ref(true);let generation=0;
const statusNames:Record<string,string>={pending:'待评估',unseen:'尚未复盘',stale:'需要回顾',improving:'正在改善',insufficient:'证据不足',weak:'建议加强',suspected_weak:'有待巩固',stable:'持续掌握',unstable:'掌握波动'};
const records=computed(()=>[...rows.value].reverse().map((r,i)=>({id:r.eventId,ordinal:i+1,createdAt:r.createdAt,selfScore:r.scoreTenths===null?null:r.scoreTenths/10,elapsedSeconds:r.elapsedSeconds,correct:r.objectiveCorrect,effective:true})));
let knowledgeGeneration=0;
let loadedStamp:ReturnType<typeof dataSync.snapshot>=null;
async function load(more=false){
 const token=++generation,previous=loadedStamp,oldRows=more?[...rows.value]:[],after=more?result.value?.nextCursor:null;
 busy.value=true;error.value='';
 if(!more){result.value=undefined;rows.value=[];mastery.value=undefined;}
 try{
  const [r,m]=await dataSync.batch(()=>Promise.all([unifiedWorkspace.analytics({deckId:props.deckId,date:date.value,cursor:after}),unifiedLearning.deckMastery({deckId:props.deckId})]));
  if(token!==generation)return;
  const stamp=dataSync.metadata(r)!;
  if(more&&(!previous||previous.dataEpoch!==stamp.dataEpoch||previous.dataRevision!==stamp.dataRevision))throw Error('数据已更新，请重新读取分析。');
  rows.value=[...oldRows,...r.items];result.value=r;mastery.value=m;loadedStamp=stamp;
 }catch(e){if(token===generation){result.value=undefined;rows.value=[];mastery.value=undefined;loadedStamp=null;
  if(more&&((e as {code?:string}).code==='DATA_REVISION_CHANGED'||String(e).includes('数据已更新'))){await load();return;}
  error.value='页面数据尚未刷新，请重新读取。'+String(e);}}
 finally{if(token===generation)busy.value=false;}
}
async function knowledge(){
 const token=++knowledgeGeneration;knowledgeBusy.value=true;
 try{
  const currentTree=await unifiedKnowledge.tree({deckId:props.deckId});
  const next=currentTree.nodes.slice(knowledgeRows.value.length,knowledgeRows.value.length+4);
  const values=await Promise.all(next.map(async n=>({nodeId:n.nodeId,name:n.name,value:await unifiedLearning.knowledgeMastery({deckId:props.deckId,nodeId:n.nodeId,scope:'aggregate'})})));
  dataSync.assertCurrent(currentTree,...values.map(v=>v.value));
  if(token!==knowledgeGeneration)return;
  if(knowledgeRows.value.length)dataSync.assertCurrent(...knowledgeRows.value.map(v=>v.value));
  tree.value=currentTree;knowledgeRows.value.push(...values);
 }catch(e){if(token===knowledgeGeneration){knowledgeRows.value=[];tree.value=undefined;error.value='知识点数据尚未刷新，请重新读取。'+String(e);}}
 finally{if(token===knowledgeGeneration)knowledgeBusy.value=false;}
}
async function assess(){await load();}
function refresh(){const hadKnowledge=!!tree.value||knowledgeRows.value.length>0;knowledgeGeneration++;knowledgeRows.value=[];tree.value=undefined;knowledgeBusy.value=false;void load();if(hadKnowledge)void knowledge();}
useDataRefresh(refresh,()=>props.deckId);
watch(()=>props.deckId,()=>{knowledgeGeneration++;knowledgeRows.value=[];tree.value=undefined;void load();},{immediate:true});
onBeforeUnmount(()=>{generation++;knowledgeGeneration++;});
function preset(event:Event){date.value={range:(event.target as HTMLSelectElement).value as '7'|'30'|'all'};void load();}
</script>
<template><section aria-label="学习分析" class="unified-analytics r4-analytics" :aria-busy="busy">
 <div class="page-heading"><div><h1>学习分析</h1><p>从全部学习历史评估卡片与知识点，不因卡片类型变化清空记录。</p></div><div class="heading-actions"><select class="select" aria-label="分析时间范围" :value="date.range" :disabled="busy" @change="preset"><option value="7">最近 7 天</option><option value="30">最近 30 天</option><option value="all">全部历史</option></select><details class="r4-date-custom"><summary>自定义日期范围</summary><fieldset class="analytics-filter" :disabled="busy"><legend>统计范围</legend><DateRangeControl v-model="date"/><button @click="load()">更新分析</button></fieldset></details></div></div>
<p v-if="error" role="alert">{{error}} <button @click="refresh">重新读取分析</button></p>
 <template v-if="result"><div class="summary-strip"><article class="metric"><div class="metric-label">范围内复盘</div><div class="metric-number">{{result.eventCount}} <small>次</small></div><span class="tiny-meta">其中仅练习 {{result.practiceCount}} 次</span></article><article class="metric"><div class="metric-label">当前掌握度</div><div class="metric-number mastery-status">{{mastery?statusNames[mastery.status]:'尚未评估'}}</div><span class="tiny-meta">当前周期 · {{mastery?.observations??0}} 次有效观察</span><button class="text-button" :disabled="busy" @click="assess">评估本集</button></article><article class="metric"><div class="metric-label">单选正确率</div><div class="metric-number">{{result.objectiveCount?Math.round(result.correctCount/result.objectiveCount*100)+'%':'未记录'}}</div><span class="tiny-meta">只统计有客观结果的复盘</span></article><article class="metric"><div class="metric-label">平均自评</div><div class="metric-number">{{result.averageScoreTenths===null?'未记录':(result.averageScoreTenths/10).toFixed(1)}} <small v-if="result.averageScoreTenths!==null">/ 10</small></div><span class="tiny-meta">平均用时 {{result.averageElapsedSeconds===null?'未记录':result.averageElapsedSeconds.toFixed(1)+' 秒'}}</span></article></div>
 <div class="analytics-layout"><section class="surface chart-panel"><div class="section-heading"><h2>学习得分趋势</h2><span class="tiny-meta">逐次记录 · 真实自评分</span></div><ReviewLineChart :records="records" metric="selfScore" title="已加载记录 · 自评分" selected-id="" unified neutral @select="id=>{const r=rows.find(r=>r.eventId===id);if(r)emit('view',r.cardId,r.eventId)}"/><p class="r4-chart-caption">全部历史可回看；当前掌握度使用适用学习证据，自评分单独展示。</p><details class="r4-time-trend"><summary>展开用时趋势</summary><ReviewLineChart :records="records" metric="elapsedSeconds" title="已加载记录 · 用时" selected-id="" unified neutral @select="id=>{const r=rows.find(r=>r.eventId===id);if(r)emit('view',r.cardId,r.eventId)}"/></details></section>
 <section class="surface padded knowledge-mastery" aria-label="知识点综合掌握度"><div class="section-heading"><h2>知识点掌握情况</h2><span class="tiny-meta">当前关联 · 按卡片去重</span></div><div v-for="r in knowledgeRows" :key="r.nodeId" class="mini-row"><span class="mini-row-main"><strong>{{r.name}}</strong><small>关联 {{r.value.cardIds.length}} 张卡片 · {{r.value.observations}} 次观察</small></span><span class="pill">{{statusNames[r.value.status]}}</span></div><div v-if="!knowledgeRows.length&&!knowledgeBusy" class="empty-state">{{tree?'还没有知识点，可在知识图谱中建立知识结构。':'按需读取知识点的当前掌握情况'}}</div><button v-if="!tree||knowledgeRows.length<tree.nodes.length" :disabled="knowledgeBusy" @click="knowledge">{{knowledgeBusy?'读取掌握度…':'更多知识点'}}</button></section></div>
 <section class="surface padded margin-top" aria-label="复盘记录列表"><div class="section-heading"><h2>最近复盘记录</h2><button class="text-button" :aria-expanded="historyOpen" @click="historyOpen=!historyOpen">{{historyOpen?'收起记录':'展开记录'}}</button><span class="tiny-meta">{{result.window.timeZone}} · {{result.cardCount}} 张当前卡片</span></div><div v-if="historyOpen"><button v-for="r in rows" :key="r.eventId" class="history-row recent-link" :disabled="busy" @click="emit('view',r.cardId,r.eventId)"><span class="score-token">{{r.scoreTenths===null?'—':(r.scoreTenths/10).toFixed(1)}}</span><span class="history-row-main"><strong>{{r.title||'未命名卡片'}}</strong><small>{{modeNames[r.mode]}} · {{new Date(r.createdAt).toLocaleString('zh-CN')}}</small></span><span class="pill">{{r.scoreTenths===null?'未记录':(r.scoreTenths/10).toFixed(1)+' 分'}}</span></button><div v-if="!rows.length" class="empty-state">此范围没有复盘记录。</div><button v-if="result.nextCursor" :disabled="busy" @click="load(true)">更多复盘记录</button></div></section>
 </template>
</section></template>
