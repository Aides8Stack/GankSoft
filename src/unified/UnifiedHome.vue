<script setup lang="ts">
import {onMounted,ref,shallowRef} from 'vue';
import {unifiedWorkspace} from '../services';
import type {Output} from '../../shared/protocol/registry';
import UiIcon from '../components/UiIcon.vue';
const emit=defineEmits<{create:[];folder:[];import:[];resume:[deck:{id:string;name:string;cardCount:number|null},sessionId:string];view:[deck:{id:string;name:string;cardCount:number|null},cardId:string,eventId:string]}>();
const summary=shallowRef<Output<'workspace.dashboard'>>(),error=ref(''),loading=ref(false);
async function load(){loading.value=true;error.value='';try{summary.value=await unifiedWorkspace.dashboard({});}catch(e){error.value=String(e);}finally{loading.value=false;}}
onMounted(load);defineExpose({load});
</script>
<template>
 <div class="page-heading"><div><h1>学习总览</h1><p>以卡片集为单位管理知识与复盘。选择一个卡片集开始学习。</p></div><div class="heading-actions"><button @click="emit('folder')"><UiIcon name="folder"/>新建文件夹</button><button class="primary" aria-label="新建卡片集" @click="emit('create')"><UiIcon name="add"/>新建卡片集</button></div></div>
 <p v-if="error" role="alert">{{error}} <button @click="load">重新读取总览</button></p>
 <div class="summary-strip" aria-label="学习摘要" :aria-busy="loading"><article v-for="m in [{label:'卡片集总数',value:summary?.deckCount,unit:'个',icon:'cards'},{label:'卡片总数',value:summary?.cardCount,unit:'张',icon:'cards'},{label:'今日待复盘',value:summary?.dueCount,unit:'张',icon:'schedule'},{label:'今日已完成',value:summary?.todayCount,unit:'次',icon:'summary'}]" :key="m.label" class="metric"><div class="metric-label">{{m.label}}</div><div class="metric-number">{{m.value??'—'}} <small>{{m.unit}}</small></div><span class="tiny-meta">{{m.label==='今日已完成'?'按学习时区统计复盘记录':m.label==='今日待复盘'?'含未学习，不含暂停卡片':'全部卡片集汇总'}}</span></article></div>
 <div class="split-layout"><section class="surface padded catalog-surface"><div class="section-heading"><h2>我的卡片集</h2><button class="text-button" @click="emit('import')"><UiIcon name="exchange" :size="15"/>导入卡片内容</button></div><slot/></section>
 <div><section class="soft-callout" aria-label="继续今天的复盘"><span class="eyebrow">CONTINUE LEARNING</span><h2>继续今天的复盘</h2><p>从上次停下的地方继续，不需要重新选择卡片。</p><div v-for="s in summary?.sessions" :key="s.sessionId" class="mini-row"><span class="deck-icon"><UiIcon name="schedule"/></span><div class="mini-row-main"><strong>{{s.deckName}}</strong><small>{{s.title}} · {{Math.min(s.index+1,s.total)}} / {{s.total}}</small></div><button @click="emit('resume',{id:s.deckId,name:s.deckName,cardCount:null},s.sessionId)">继续复盘</button></div><div v-if="!summary?.sessions.length" class="empty-state"><strong>从一次主动回忆开始</strong>选择卡片集，开始今天的学习。未完成的复盘会保留在这里。</div></section>
 <section class="surface padded margin-top" aria-label="最近学习"><div class="section-heading"><h2>最近学习</h2><span class="tiny-meta">{{summary?.timeZone??'学习记录'}}</span></div><button v-for="r in summary?.recent" :key="r.eventId" class="mini-row recent-link" @click="emit('view',{id:r.deckId,name:r.deckName,cardCount:null},r.cardId,r.eventId)"><span class="deck-icon"><UiIcon name="cards"/></span><span class="mini-row-main"><strong>{{r.title||'未命名卡片'}}</strong><small>{{r.deckName}} · {{new Date(r.createdAt).toLocaleDateString('zh-CN')}}</small></span><span class="tiny-meta">{{r.scoreTenths===null?'未评分':(r.scoreTenths/10).toFixed(1)+' 分'}}</span></button><div v-if="!summary?.recent.length" class="empty-state"><strong>还没有学习记录</strong>完成复盘后，每次思路与自评都可以在这里回看。</div></section></div></div>
</template>
