<script setup lang="ts">
import {onBeforeUnmount,ref,shallowRef,watch} from 'vue';
import type {Output} from '../../shared/protocol/registry';
import {dataSync,unifiedLearning} from '../services';
const props=defineProps<{deckId:string;sessionId:string;fromHistory:boolean}>();
const emit=defineEmits<{back:[];resume:[id:string]}>();
const value=shallowRef<Output<'learning.session.settlement'>>(),error=ref(''),busy=ref(false),detail=ref('');
let seq=0,disposed=false;
async function load(){const token=++seq;value.value=undefined;error.value='';busy.value=true;
 try{const result=await unifiedLearning.settlement({deckId:props.deckId,sessionId:props.sessionId});
 if(disposed||token!==seq)return;dataSync.assertCurrent(result);value.value=result;}
 catch(e){if(token===seq)error.value='结算数据尚未读取，请重新读取。'+String(e);}
 finally{if(token===seq)busy.value=false;}}
const stop=dataSync.subscribe(c=>{if(c.epochChanged||!c.deckId||c.deckId===props.deckId)void load();});
watch(()=>[props.deckId,props.sessionId],()=>void load(),{immediate:true});
onBeforeUnmount(()=>{disposed=true;seq++;stop();});
const date=(v:string|null)=>v?new Date(v).toLocaleString('zh-CN',{hour12:false}):'—';
const score=(v:number|null)=>v===null?'—':(v/10).toFixed(1);
const rating=(v:string|null)=>v?({again:'Again',hard:'Hard',good:'Good',easy:'Easy'}[v]??v):'未完成';
const modes={question:'单选错题',qa:'问答记忆',direct:'直接记忆'};
</script>
<template>
 <section class="review-settlement" aria-label="复盘结算" :aria-busy="busy">
  <div class="page-heading"><div><h1>{{value?.completed?'复盘结算':'未完成队列进度'}}</h1><p>只读记录 · 本次提交的历史调度快照</p></div><button class="button" @click="emit('back')">{{fromHistory?'返回复盘历史':'返回所有卡片'}}</button></div>
  <p v-if="error" role="alert">{{error}} <button class="button" @click="load">重新读取</button></p>
  <template v-if="value">
   <div class="settlement-metrics surface padded">
    <p>状态 <strong data-testid="settlement-status">{{value.completed?'已结束':'未完成'}}</strong></p>
    <p>完成卡片 <strong>{{value.completedCount}} / {{value.total}}</strong></p>
    <p>平均自评 <strong>{{score(value.averageScoreTenths)}}</strong></p>
    <p>有效总用时 <strong data-testid="settlement-seconds">{{value.totalSeconds}} 秒</strong></p>
    <p>客观正确率 <strong>{{value.objectiveCount?(value.correctCount/value.objectiveCount*100).toFixed(1)+'%':'不适用'}}</strong></p>
    <p>最早下次复习 <strong>{{date(value.nextDue)}}</strong></p>
   </div>
   <p class="rating-distribution">Again {{value.ratings.again}} · Hard {{value.ratings.hard}} · Good {{value.ratings.good}} · Easy {{value.ratings.easy}}</p>
   <div class="table-wrap surface"><table class="data-table settlement-table"><thead><tr><th>序号</th><th>标题 / 类型</th><th>自评 / 系统</th><th>客观正误</th><th>有效用时</th><th>本次调度日期</th><th>详情</th></tr></thead>
    <tbody><tr v-for="(row,index) in value.rows" :key="row.cardId" :data-event-id="row.event?.eventId" :data-card-id="row.cardId">
     <td>{{index+1}}</td><td>{{row.title}}<small class="row-type">{{modes[row.mode]}}</small></td>
     <td class="score-rating">{{score(row.event?.scoreTenths??null)}} / {{rating(row.event?.rating??null)}}</td>
     <td>{{row.event?.objectiveCorrect===true?'答对':row.event?.objectiveCorrect===false?'答错':row.event?'不适用':'—'}}</td>
     <td>{{row.event?.native?row.event.native.elapsedSeconds+' 秒':'—'}}</td><td :data-due="row.dueAt">{{date(row.dueAt)}}</td>
     <td><button v-if="row.event" class="button small" @click="detail=detail===row.event.eventId?'':row.event.eventId">查看该次复盘详情</button><span v-else>未完成</span></td>
    </tr></tbody></table></div>
   <template v-for="row in value.rows" :key="row.cardId"><section v-if="row.event&&detail===row.event.eventId" class="surface padded" aria-label="该次复盘详情">
    <h2>{{row.title}}</h2><p>复盘时间：{{date(row.event.createdAt)}} · {{score(row.event.scoreTenths)}} / {{rating(row.event.rating)}}</p>
    <p>独立思路：{{row.event.native?.thought||'—'}}</p><p>错因：{{row.event.native?.faults.join('、')||'—'}}</p>
    <p>知识漏洞：{{row.event.native?.gaps||'—'}}</p><p>反思：{{row.event.native?.reflection||'—'}}</p>
    <p>知识点：{{row.event.native?.knowledge.map(k=>k.path.join(' / ')).join('、')||'—'}}</p><p>调度状态：{{row.event.native?.schedule.outcome||'历史记录'}} · {{date(row.dueAt)}}</p>
   </section></template>
   <footer v-if="!value.completed" class="incomplete-actions"><button class="button primary" @click="emit('resume',value.sessionId)">继续复盘</button></footer>
  </template>
 </section>
</template>
<style scoped>
.settlement-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px 20px}.settlement-metrics p{margin:4px 0}.settlement-metrics strong{display:block;margin-top:8px}.score-rating{white-space:nowrap}.row-type{display:block;color:var(--muted);margin-top:5px}.settlement-table{min-width:850px}.incomplete-actions{margin-top:20px;display:flex;justify-content:flex-end}.rating-distribution{padding:8px 0}
</style>
