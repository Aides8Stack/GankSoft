<script setup lang="ts">
import {onMounted,ref,shallowRef,watch} from 'vue';
import {unifiedKnowledge,unifiedLearning} from '../services';
import {StudyFilters} from '../../shared/study-query';
import DateRangeControl from '../components/DateRangeControl.vue';
import type {Input,Output} from '../../shared/protocol/registry';
const props=defineProps<{deckId:string}>(),emit=defineEmits<{study:[ids:string[],practice?:boolean]}>();
const filters=ref(StudyFilters.parse({})),tree=shallowRef<Output<'knowledge.tree.read'>>(),queue=shallowRef<Output<'learning.queue.preview'>>(),error=ref(''),busy=ref(false),random=ref(false),randomCount=ref(1),randomScope=ref<'eligible'|'checked'>('eligible'),weighted=ref(false),seed=ref('');
const source={deckId:props.deckId};
function pathLabel(id:string){const out:string[]=[];let n=tree.value?.nodes.find(n=>n.nodeId===id);while(n){out.unshift(n.name);n=tree.value?.nodes.find(p=>p.nodeId===n!.parentId);}return out.join(' › ');}
async function preview(){busy.value=true;error.value='';queue.value=undefined;try{queue.value=await unifiedLearning.queue({...source,filters:filters.value,seed:seed.value,limit:100,...(random.value?{randomKnowledge:{scope:randomScope.value,count:randomCount.value,weighted:weighted.value}}:{})});}catch(e){error.value=String(e);}finally{busy.value=false;}}
watch([filters,random,randomCount,randomScope,weighted,seed],()=>{queue.value=undefined;},{deep:true});
onMounted(async()=>{try{tree.value=await unifiedKnowledge.tree(source);}catch(e){error.value=String(e);}});
const reasons:Record<string,string>={session_reserved:'已在其他复盘页面',needs_content_confirmation:'旧题内容需先确认',paused:'已暂停',specialty_excluded:'不满足额外专项条件'};
</script>
<template>
 <section aria-label="筛选学习"><h2>筛选学习</h2><fieldset :disabled="busy"><legend>选择范围</legend><label>关键词<input v-model="filters.query" aria-label="筛选关键词"/></label><label>卡片状态<select aria-label="卡片状态" v-model="filters.state"><option value="all">全部</option><option value="due">已到期</option><option value="new">未复盘</option><option value="learned">已学习</option><option value="unlinked">未关联知识点</option></select></label><details><summary>按知识点筛选</summary><label v-for="n in tree?.nodes" :key="n.nodeId"><input type="checkbox" v-model="filters.knowledge" :value="n.nodeId"/>{{pathLabel(n.nodeId)}}</label><label><input type="checkbox" v-model="filters.includeChildren"/>包含下级</label><label>匹配<select aria-label="知识点匹配" v-model="filters.match"><option value="any">任意一个</option><option value="all">全部知识点</option></select></label></details>
  <details><summary>日期与随机知识点</summary><label>日期依据<select aria-label="日期依据" v-model="filters.dateField"><option value="lastReviewAt">最近复盘</option><option value="firstReviewAt">首次复盘</option><option value="createdAt">创建时间</option></select></label><DateRangeControl v-model="filters.date"/><label><input type="checkbox" v-model="random"/>随机选择知识点</label><div v-if="random"><label>候选范围<select aria-label="候选范围" v-model="randomScope"><option value="eligible">当前筛选内可用知识点</option><option value="checked">已勾选的知识点</option></select></label><label>数量<input type="number" min="1" max="20" v-model.number="randomCount"/></label><label><input type="checkbox" v-model="weighted"/>薄弱优先</label><label>随机种子（可选）<input v-model="seed"/></label></div></details>
  <button @click="preview">预览学习队列</button></fieldset><p v-if="error" role="alert">{{error}}</p>
  <section v-if="queue" aria-label="学习队列预览"><p>到期 {{queue.due.length}} · 重学 {{queue.relearn.length}} · 专项 {{queue.specialty.length}}</p><p>今日独立卡片剩余 {{queue.budgets.dueLeft}} · 重学剩余 {{queue.budgets.relearnLeft}}</p><p v-if="queue.selectedKnowledge.length">随机知识点：{{queue.selectedKnowledge.map(id=>tree?.nodes.find(n=>n.nodeId===id)?.name??'已失效').join('、')}}</p><p v-for="(n,key) in queue.excluded" :key="key">{{reasons[key]??key}}：{{n}}</p><ul><li v-for="c in [...queue.due,...queue.relearn,...queue.specialty]" :key="c.cardId">{{c.title||'未命名卡片'}}</li></ul><button v-if="queue.due.length+queue.relearn.length" @click="emit('study',[...queue.due,...queue.relearn].map(c=>c.cardId))">开始本次复盘</button><button v-if="queue.specialty.length" @click="emit('study',queue.specialty.map(c=>c.cardId),true)">开始专项</button><p v-if="!queue.due.length&&!queue.relearn.length&&!queue.specialty.length">此范围暂无可用任务，可调整筛选。</p></section>
 </section>
</template>
<style scoped>fieldset{display:grid;gap:16px;border:1px solid var(--line,#ddd);border-radius:10px;padding:20px}label{display:block;margin:8px 0}input[type=checkbox]{width:auto}section{max-width:1000px;margin:auto}button{margin-top:12px}details{padding:10px 0}</style>
