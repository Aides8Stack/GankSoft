<script setup lang="ts">
import {computed,onMounted,ref,shallowRef} from 'vue';
import {unifiedCards} from '../services';
import type {Output} from '../../shared/protocol/registry';
import CardBatch from './UnifiedCardBatch.vue';
const props=defineProps<{deckId:string}>(),emit=defineEmits<{changed:[]}>();
async function restored(){await load();emit('changed');}
const rows=ref<Output<'card.recycle.list'>['items']>([]),after=ref<string|null>(null),selection=ref<string[]>([]),error=ref(''),busy=ref(false),batch=shallowRef<InstanceType<typeof CardBatch>>();
const selected=computed(()=>rows.value.filter(r=>selection.value.includes(r.cardId)));
async function load(more=false){busy.value=true;error.value='';try{const p=await unifiedCards.recycle({deckId:props.deckId,after:more?after.value:null});rows.value=more?[...rows.value,...p.items]:p.items;after.value=p.nextCursor;if(!more)selection.value=[];}catch(e){error.value='回收站读取失败，请刷新核对；已成功的操作无需重复。'+String(e);}finally{busy.value=false;}}
onMounted(()=>load());defineExpose({close:()=>!busy.value&&(!batch.value||batch.value.close())});
</script>
<template><section aria-label="卡片回收站"><h2>卡片回收站</h2><p>已删除的卡片保留已发布内容、草稿、历史和图片。</p><CardBatch ref="batch" :deck-id="deckId" :cards="selected" restore @changed="restored" @clear="selection=[]"/><p v-if="error" role="alert">{{error}}</p><button :disabled="busy" @click="load()">刷新回收站</button><table><thead><tr><th>选择</th><th>卡片</th><th>删除时间</th></tr></thead><tbody><tr v-for="r in rows" :key="r.cardId"><td><input type="checkbox" :aria-label="'恢复 '+(r.title||'未命名卡片')" v-model="selection" :value="r.cardId"/></td><td>{{r.title||'未命名卡片'}}</td><td>{{new Date(r.deletedAt).toLocaleString('zh-CN')}}</td></tr></tbody></table><p v-if="!rows.length&&!busy">回收站为空。</p><button v-if="after" :disabled="busy" @click="load(true)">更多回收卡片</button></section></template>
<style scoped>table{width:100%}th,td{padding:12px;text-align:left;border-bottom:1px solid var(--line,#ddd)}input[type=checkbox]{width:auto}</style>
