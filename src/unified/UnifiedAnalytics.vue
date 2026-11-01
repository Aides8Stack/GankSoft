<script setup lang="ts">
import {computed,onBeforeUnmount,ref,shallowRef,watch} from 'vue';
import {dataSync,unifiedWorkspace} from '../services';
import type {Output,Input} from '../../shared/protocol/registry';
import type {DateSelectionInput} from '../../shared/workspace-contracts';
import {useDataRefresh} from '../composables/dataRefresh';
import DateRangeControl from '../components/DateRangeControl.vue';
import ReviewLineChart from '../components/ReviewLineChart.vue';
const props=defineProps<{deckId:string;overview?:boolean}>(),emit=defineEmits<{view:[cardId:string,eventId:string]}>();
type Page=Output<'workspace.analytics.grouped'>;
const dimension=ref<'card'|'knowledge'>('card'),date=ref<DateSelectionInput>({range:'30'}),scope=ref<'direct'|'aggregate'>('aggregate'),search=ref(''),sort=ref<Input<'workspace.analytics.grouped'>['sort']>('name'),direction=ref<'asc'|'desc'>('asc');
const result=shallowRef<Page>(),rows=ref<Page['items']>([]),error=ref(''),busy=ref(false),selectedId=ref(''),detail=shallowRef<Page>(),detailError=ref('');
let generation=0,detailGeneration=0;
const statusNames:Record<string,string>={pending:'待评估',unseen:'尚未复盘',stale:'需要回顾',improving:'正在改善',insufficient:'证据不足',weak:'建议加强',suspected_weak:'有待巩固',stable:'持续掌握',unstable:'掌握波动'};
const modeNames={question:'错题复盘',qa:'问答记忆',direct:'直接记忆'};
const score=(n:number|null|undefined)=>n==null?'—':(n/10).toFixed(1),rate=(n:{objectiveCount:number;correctCount:number})=>n.objectiveCount?Math.round(n.correctCount/n.objectiveCount*100)+'%':'—';
const params=()=>({deckId:props.deckId,dimension:dimension.value,date:date.value,scope:scope.value,search:search.value,sort:sort.value,direction:direction.value});
const records=computed(()=>series(result.value)),detailRecords=computed(()=>series(detail.value));
function series(p?:Page){return p?.trend.map((r,i)=>({id:r.day,ordinal:i+1,createdAt:r.day+'T12:00:00Z',selfScore:r.averageScoreTenths===null?null:r.averageScoreTenths/10,elapsedSeconds:r.elapsedSeconds,correct:null,effective:true}))??[];}
async function load(more=false){
 const token=++generation,previous=result.value,old=more?[...rows.value]:[],cursor=more?previous?.nextCursor:null;
 busy.value=true;error.value='';result.value=undefined;rows.value=[];detail.value=undefined;detailGeneration++;
 try{const r=await unifiedWorkspace.grouped({...params(),cursor,...(more&&previous?{expectedDataEpoch:previous.dataEpoch,expectedDataRevision:previous.dataRevision}:{})});
  if(token!==generation)return;dataSync.assertCurrent(r);result.value=r;rows.value=[...old,...r.items];if(selectedId.value)void loadDetail();
 }catch(e){if(token!==generation)return;if(more&&(e as {code?:string}).code==='DATA_REVISION_CHANGED'){await load();return;}error.value='页面数据尚未刷新，请重新读取。'+String(e);}
 finally{if(token===generation)busy.value=false;}
}
async function loadDetail(){const token=++detailGeneration,id=selectedId.value;detail.value=undefined;detailError.value='';if(!id)return;try{const r=await unifiedWorkspace.grouped({...params(),entityId:id,search:'',cursor:null});if(token!==detailGeneration)return;dataSync.assertCurrent(r);detail.value=r;}catch(e){if(token===detailGeneration)detailError.value='详情尚未刷新。'+String(e);}}
function choose(id:string){selectedId.value=id;void loadDetail();}
function closeDetail(){detailGeneration++;selectedId.value='';detail.value=undefined;detailError.value='';}
function refresh(){void load();}
useDataRefresh(refresh,()=>props.deckId);
watch(()=>props.deckId,()=>{closeDetail();void load();},{immediate:true});
watch([dimension,date,scope,sort,direction],()=>{closeDetail();void load();},{deep:true});
onBeforeUnmount(()=>{generation++;detailGeneration++;});
function preset(e:Event){date.value={range:(e.target as HTMLSelectElement).value as '7'|'30'|'90'|'all'};}
</script>
<template><section aria-label="学习分析" class="unified-analytics r4-analytics" :aria-busy="busy">
 <div class="page-heading"><div><h1>学习分析</h1><p>历史统计按学习时区与日期计算；当前掌握度、FSRS 和待复盘按最新数据计算。</p></div><div class="heading-actions"><select class="select" aria-label="分析时间范围" :value="date.range" @change="preset"><option value="7">最近 7 天</option><option value="30">最近 30 天</option><option value="90">最近 90 天</option><option value="all">全部历史</option></select><details class="r4-date-custom"><summary>自定义日期范围</summary><DateRangeControl v-model="date"/></details></div></div>
 <div class="analytics-controls"><div role="group" aria-label="统计维度"><button :aria-pressed="dimension==='card'" @click="dimension='card'">卡片维度</button><button :aria-pressed="dimension==='knowledge'" @click="dimension='knowledge'">知识点维度</button></div><select v-if="dimension==='knowledge'" v-model="scope" aria-label="知识点统计范围"><option value="direct">直接关联</option><option value="aggregate">包含子知识点</option></select><form @submit.prevent="closeDetail();load()"><input v-model="search" aria-label="搜索统计" placeholder="搜索卡片或知识点"/><button>搜索</button></form><select v-model="sort" aria-label="统计排序"><option value="name">名称</option><option value="events">学习次数</option><option value="score">平均自评</option><option value="due">待复盘数量</option></select><select v-model="direction" aria-label="排序方向"><option value="asc">升序</option><option value="desc">降序</option></select></div>
 <p v-if="error" role="alert">{{error}} <button @click="refresh">重新读取分析</button></p>
 <template v-if="result"><div class="summary-strip" data-testid="analytics-summary" :data-events="result.summary.eventCount" :data-cards="result.summary.cardCount" :data-knowledge="result.knowledgeCount" :data-due="result.summary.dueCount">
 <article class="metric"><div class="metric-label">范围内学习次数</div><div class="metric-number">{{result.summary.eventCount}} <small>次</small></div><span class="tiny-meta">当前 {{result.summary.cardCount}} 张卡片 · {{result.knowledgeCount}} 个知识点</span></article>
 <article class="metric"><div class="metric-label">当前待复盘</div><div class="metric-number">{{result.summary.dueCount}} <small>张</small></div><span class="tiny-meta">不受历史日期范围影响</span></article>
 <article class="metric"><div class="metric-label">客观正确率</div><div class="metric-number">{{rate(result.summary)}}</div><span class="tiny-meta">有客观结果 {{result.summary.objectiveCount}} 次</span></article>
 <article class="metric"><div class="metric-label">平均自评</div><div class="metric-number">{{score(result.summary.averageScoreTenths)}}</div><span class="tiny-meta">有效学习用时 {{result.summary.elapsedSeconds.toFixed(1)}} 秒</span></article></div>
 <div class="analytics-layout"><section class="surface chart-panel"><h2>学习得分趋势</h2><ReviewLineChart :records="records" metric="selfScore" title="完整区间 · 每日平均自评" selected-id="" unified neutral/></section><section class="surface chart-panel"><h2>学习用时趋势</h2><ReviewLineChart :records="records" metric="elapsedSeconds" title="完整区间 · 每日有效用时" selected-id="" unified neutral/></section></div>
 <section class="surface padded margin-top" aria-label="统计明细"><div class="section-heading"><h2>{{dimension==='card'?'卡片':'知识点'}}统计</h2><span class="tiny-meta">共 {{result.totalCount}} 项 · {{result.window.timeZone}}</span></div><p v-if="dimension==='knowledge'" class="tiny-meta">同一知识点内部按卡片和事件去重；各知识点可能重叠，不能相加作为卡片集总数。</p>
 <div class="analytics-table-scroll"><table><thead><tr><th>名称 / 类型</th><th>关联卡片</th><th>学习次数</th><th>最近自评</th><th>平均自评</th><th>正确率</th><th>有效用时</th><th>当前掌握 / 待复盘</th></tr></thead><tbody><tr v-for="r in rows" :key="r.id" :data-stat-id="r.id" :data-events="r.eventCount" :data-cards="r.cardCount" :data-due="r.dueCount"><td><button class="text-button" @click="choose(r.id)">{{r.name||'未命名卡片'}}</button><small v-if="r.mode">{{modeNames[r.mode]}}</small></td><td>{{r.cardCount}}</td><td>{{r.eventCount}}</td><td>{{score(r.latestScoreTenths)}}</td><td>{{score(r.averageScoreTenths)}}</td><td>{{rate(r)}}</td><td>{{r.elapsedSeconds.toFixed(1)}} 秒</td><td>{{statusNames[r.status]??r.status}} / {{r.dueCount}}<small v-if="r.mode">{{r.paused?'已暂停':r.nextDueAt?new Date(r.nextDueAt).toLocaleString('zh-CN'):'未排期'}}</small></td></tr></tbody></table></div>
 <div v-if="!rows.length" class="empty-state">没有符合条件的{{dimension==='card'?'卡片':'知识点'}}。</div><button v-if="result.nextCursor" :disabled="busy" @click="load(true)">更多统计</button></section>
 </template>
 <section v-if="selectedId" class="surface padded margin-top" aria-label="统计详情"><div class="section-heading"><h2>{{detail?.items[0]?.name??'统计详情'}}</h2><button @click="closeDetail">关闭详情</button></div><p v-if="detailError" role="alert">{{detailError}}<button @click="loadDetail">重新读取详情</button></p><template v-if="detail"><p v-if="!detail.items.length">该对象已不在当前卡片集。</p><template v-else><p>{{detail.summary.cardCount}} 张卡片 · {{detail.summary.eventCount}} 次学习 · 平均自评 {{score(detail.summary.averageScoreTenths)}} · 客观正确率 {{rate(detail.summary)}} · {{detail.summary.elapsedSeconds.toFixed(1)}} 秒</p><p>{{statusNames[detail.items[0].status]}} · 当前周期有效观察 {{detail.items[0].observations}} 次 · 当前待复盘 {{detail.summary.dueCount}} 张</p><p v-if="dimension==='card'">FSRS 状态：{{detail.items[0].fsrsState===null?'未调度':['新卡','学习中','复习中','重新学习'][detail.items[0].fsrsState]}} · 下次复习：{{detail.items[0].nextDueAt?new Date(detail.items[0].nextDueAt!).toLocaleString('zh-CN'):'—'}}</p><div class="analytics-layout"><ReviewLineChart :records="detailRecords" metric="selfScore" title="所选对象 · 每日平均自评" selected-id="" unified neutral/><ReviewLineChart :records="detailRecords" metric="elapsedSeconds" title="所选对象 · 每日有效用时" selected-id="" unified neutral/></div><button v-if="dimension==='card'" @click="emit('view',selectedId,'')">查看卡片详情</button></template></template><p v-else-if="!detailError">正在读取详情…</p></section>
</section></template>
<style scoped>
.analytics-controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px}.analytics-controls form{display:flex;gap:6px}.analytics-controls input{min-width:0;max-width:190px}.analytics-controls [aria-pressed=true]{background:var(--primary);color:white}.analytics-table-scroll{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--border);white-space:nowrap}td:first-child{min-width:120px;max-width:240px;white-space:normal;overflow-wrap:anywhere}td small{display:block;color:var(--muted);font-size:10px;margin-top:4px}.summary-strip{grid-template-columns:repeat(4,minmax(0,1fr))}.metric-number{overflow-wrap:anywhere}@media(max-width:1000px){.summary-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.analytics-layout{grid-template-columns:1fr!important}}
</style>
