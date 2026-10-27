<script setup lang="ts">
import {onMounted,ref,shallowRef} from 'vue';
import {unifiedWorkspace} from '../services';
import type {Output} from '../../shared/protocol/registry';
import UiIcon from '../components/UiIcon.vue';
const props=defineProps<{deckId:string;deckName:string}>();
const emit=defineEmits<{navigate:[page:'cards'|'planner'|'knowledge'|'analysis'];study:[];create:[];view:[cardId:string]}>();
const data=shallowRef<Output<'workspace.dashboard'>>(),analysis=shallowRef<Output<'workspace.analytics'>>(),error=ref('');
async function load(){error.value='';try{[data.value,analysis.value]=await Promise.all([unifiedWorkspace.dashboard({deckId:props.deckId}),unifiedWorkspace.analytics({deckId:props.deckId,date:{range:'30'},limit:1})]);}catch(e){error.value=String(e);}}
onMounted(load);
</script>
<template><section aria-label="卡片集概览">
 <div class="page-heading"><div><h1>{{deckName}}</h1><p>卡片集工作台 · 记忆、错题与知识积累</p></div><div class="heading-actions"><button @click="emit('create')"><UiIcon name="add"/>新建卡片</button><button class="primary" @click="emit('study')"><UiIcon name="schedule"/>开始本集复盘</button></div></div>
 <p v-if="error" role="alert">{{error}}<button @click="load">重新读取概览</button></p>
 <div class="deck-statline"><span><strong>{{data?.cardCount??'—'}}</strong> 张卡片</span><span><strong>{{data?.dueCount??'—'}}</strong> 张待复盘</span><span><strong>{{data?.knowledgeCount??'—'}}</strong> 个知识点</span><span>累计复盘 <strong>{{data?.eventCount??'—'}}</strong> 次</span></div>
 <div class="hero-panel"><div><span class="eyebrow">本集学习计划</span><h2>{{data?data.dueCount?'今天有 '+data.dueCount+' 张卡片需要复盘':'今天的复盘已完成，继续积累新知识':'正在读取学习计划…'}}</h2><p>学习进度和统计按照当前卡片集独立计算。</p></div><button class="primary" @click="emit('study')"><UiIcon name="schedule"/>开始复盘</button></div>
 <div class="quick-row"><button v-for="item in [{page:'cards',label:'所有卡片',icon:'cards'},{page:'planner',label:'筛选学习',icon:'search'},{page:'knowledge',label:'知识图谱',icon:'knowledge'},{page:'analysis',label:'学习分析',icon:'insights'}] as const" :key="item.page" :aria-label="'进入'+item.label" class="quick-tile" @click="emit('navigate',item.page)"><UiIcon :name="item.icon"/>{{item.label}}<span class="quick-arrow">→</span></button></div>
 <div class="subsection-grid"><section class="surface padded" aria-label="最近卡片"><div class="section-heading"><h2>最近卡片</h2><button class="text-button" @click="emit('navigate','cards')">查看全部 →</button></div><button v-for="c in data?.recentCards" :key="c.cardId" class="mini-row recent-link" @click="emit('view',c.cardId)"><span class="deck-icon"><UiIcon name="cards"/></span><span class="mini-row-main"><strong>{{c.title||'未命名卡片'}}</strong><small>{{{question:'单选错题',qa:'问答记忆',direct:'直接记忆'}[c.mode]}}</small></span><span class="quick-arrow">›</span></button><div v-if="!data?.recentCards.length" class="empty-state"><strong>把值得回顾的内容，留在这里</strong>新建卡片，或从卡片列表导入已有内容。</div></section>
 <section class="surface padded" aria-label="复盘概况"><div class="section-heading"><h2>复盘概况</h2><span class="tiny-meta">近 30 天</span></div><div class="metric-label">平均自评</div><div class="metric-number">{{analysis?.averageScoreTenths==null?'待评估':(analysis.averageScoreTenths/10).toFixed(1)}} <small v-if="analysis?.averageScoreTenths!=null">/ 10</small></div><div class="progress-line" v-if="analysis?.averageScoreTenths!=null"><span :style="{width:analysis.averageScoreTenths+'%'}"/></div><div class="mini-row"><span class="mini-row-main"><strong>今日完成</strong><small>{{data?.timeZone??'学习时区'}}</small></span><span>{{data?.todayCount??'—'}} 次</span></div><div class="mini-row"><span class="mini-row-main"><strong>单选正确率</strong><small>仅统计有客观结果的复盘</small></span><span>{{data?.objectiveCount?Math.round(data.correctCount/data.objectiveCount*100)+'%':'未记录'}}</span></div><button @click="emit('navigate','analysis')">查看完整分析 →</button></section></div>
</section></template>
