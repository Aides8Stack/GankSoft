<script setup lang="ts">
import {ref,shallowRef,onMounted,onBeforeUnmount} from 'vue';
import {unifiedAppend} from '../services';
import {AppendConfirmation} from '../../shared/protocol/external-append';
import type {Input,Output} from '../../shared/protocol/registry';
const emit=defineEmits<{busy:[value:boolean];appended:[]}>();
const supported=ref(false),busy=ref(false),unknown=ref(false),error=ref(''),notice=ref('');
const scan=shallowRef<Output<'storage.append.open'>>(null),decks=ref<Output<'storage.append.decks'>['items']>([]),cursor=ref<string|null>(null);
const selected=ref<string[]>([]),force=ref(false),accepted=ref(false),plan=shallowRef<Output<'storage.append.preview'>|null>(null);
const pending=shallowRef<Input<'storage.append.confirm'>|null>(null),operationId=ref(sessionStorage.getItem('gank-append-operation')??'');
let disposed=false;
function working(v:boolean){busy.value=v;emit('busy',v||unknown.value);}
function invalidate(){plan.value=null;accepted.value=false;}
async function load(){if(!scan.value)return;const page=await unifiedAppend.decks({scanId:scan.value.scanId,limit:50,cursor:cursor.value});decks.value.push(...page.items);cursor.value=page.nextCursor;}
async function choose(){if(unknown.value)return;working(true);error.value='';notice.value='';invalidate();decks.value=[];selected.value=[];cursor.value=null;
 try{scan.value=await unifiedAppend.open();if(scan.value)await load();else notice.value='已取消选择数据库';}catch(e){scan.value=null;error.value=String(e);}finally{working(false);}}
async function more(){working(true);try{await load();}catch(e){error.value=String(e);}finally{working(false);}}
async function preview(){if(!scan.value||!selected.value.length||unknown.value)return;working(true);error.value='';invalidate();try{plan.value=await unifiedAppend.preview({scanId:scan.value.scanId,selectedDeckIds:selected.value,forceIndependent:force.value,folderId:null});}catch(e){error.value=String(e);}finally{working(false);}}
async function cancel(){if(busy.value||unknown.value)return false;working(true);try{if(scan.value)await unifiedAppend.cancel(scan.value.scanId);scan.value=null;invalidate();notice.value='已取消追加，当前数据未改变';return true;}catch(e){error.value=String(e);return false;}finally{working(false);}}
async function confirmAppend(){const c=pending.value??plan.value?.confirmation;if(!c||busy.value||!unknown.value&&!accepted.value)return;
 pending.value=c;operationId.value=c.operationId;working(true);error.value='';let reload=false;
 try{const r=await unifiedAppend.confirm(c);unknown.value=false;pending.value=null;scan.value=null;invalidate();notice.value=r.reopened?'追加已提交':'追加已提交，请重启后核对';reload=r.reopened;}
 catch(e){unknown.value=(e as {outcome?:string}).outcome==='unknown';if(!unknown.value){pending.value=null;sessionStorage.removeItem('gank-append-pending');}error.value=String(e);}
 finally{working(false);}if(reload)emit('appended');}
async function status(){if(!operationId.value)return;working(true);error.value='';let reload=false;try{
 const r=await unifiedAppend.status(operationId.value);notice.value=!r?'未找到追加提交记录，请用原请求重试':r.state==='committed'?'上次追加已提交'+(r.reopened?'，当前数据库已重开':'，请重启核对'):r.state==='aborted'?'上次追加未提交，原数据已保留':'追加尚待恢复，请重启后查询';
 if(r?.state==='committed'||r?.state==='aborted'){unknown.value=false;pending.value=null;sessionStorage.removeItem('gank-append-pending');reload=r.state==='committed'&&r.reopened&&!!scan.value;scan.value=null;invalidate();}
 }catch(e){error.value=String(e);}finally{working(false);}if(reload)emit('appended');}
onMounted(async()=>{try{const raw=sessionStorage.getItem('gank-append-pending');if(raw){pending.value=AppendConfirmation.parse(JSON.parse(raw));unknown.value=true;emit('busy',true);}supported.value=await unifiedAppend.supported();}catch(e){if(!disposed)error.value=String(e);}});
onBeforeUnmount(()=>{disposed=true;if(scan.value&&!busy.value&&!unknown.value)void unifiedAppend.cancel(scan.value.scanId).catch(()=>{});});
defineExpose({close:async()=>!busy.value&&!unknown.value&&(!scan.value||await cancel())});
</script>
<template><section aria-label="追加外部数据库" class="external-append"><h4>追加外部数据库</h4><p>选择来源卡片集，独立追加内容、图片、知识点与学习历史。重复来源默认跳过。</p>
 <button :disabled="busy||unknown||!supported" @click="choose">选择外部数据库</button><p v-if="!supported">当前入口尚未启用数据库追加。</p>
 <p v-if="error" role="alert">{{error}}</p><p v-if="notice" role="status">{{notice}}</p><p v-if="unknown" role="alert">追加结果未知，请查询状态或重试原请求，核对前请勿关闭。</p>
 <article v-if="scan" aria-label="外部数据库追加预览"><p>来源版本 {{scan.schemaVersion}} · {{scan.deckCount}} 个卡片集 · {{scan.media.files}} 张图片</p>
 <fieldset :disabled="busy||unknown"><legend>选择来源卡片集</legend><label v-for="d in decks" :key="d.sourceDeckId"><input type="checkbox" v-model="selected" :value="d.sourceDeckId" @change="invalidate"/>{{d.name}} · 卡片 {{d.cards.active}} · 历史 {{d.reviewEvents}} · 草稿 {{d.drafts+d.unpublishedDrafts}}{{d.recycled?' · 回收站':''}}</label>
 <button v-if="cursor" @click="more">加载更多卡片集</button><label><input type="checkbox" v-model="force" @change="invalidate"/>重复来源也创建独立新副本</label><button :disabled="!selected.length" @click="preview">预览追加方案</button></fieldset>
 <template v-if="plan"><div v-if="!plan.selection.closed"><p>所选内容依赖以下卡片集，请明确加入选择后重新预览：</p><p v-for="d in plan.selection.requiredDecks" :key="d.sourceDeckId">{{d.name}} · {{d.reasons.length}} 项关联依赖</p><button :disabled="busy||unknown" @click="selected=[...new Set([...selected,...plan!.selection.requiredDecks.map(d=>d.sourceDeckId)])];invalidate()">加入依赖卡片集</button></div>
 <p v-if="plan.duplicates">将追加 {{plan.duplicates.importDeckIds.length}} 个 · 重复跳过 {{plan.duplicates.skippedDeckIds.length}} 个 · 依赖阻断 {{plan.duplicates.blockedDeckIds.length}} 个</p>
 <p v-if="plan.duplicates?.blockedDeckIds.length">新内容依赖已跳过的来源副本；请选择创建独立新副本后重新预览。</p>
 <label v-if="plan.confirmation"><input type="checkbox" v-model="accepted" :disabled="busy||unknown"/>我确认按此方案独立追加</label><button v-if="plan.confirmation" :disabled="busy||unknown||!accepted" @click="confirmAppend">确认独立追加</button></template>
 <button :disabled="busy||unknown" @click="cancel">取消追加</button></article>
 <button v-if="operationId" :disabled="busy" @click="status">查询上次追加结果</button><button v-if="unknown&&pending" :disabled="busy" @click="confirmAppend">重试原追加请求</button>
</section></template>
<style scoped>.external-append{margin-top:20px;border-top:1px solid var(--line,#ddd);padding-top:16px}article{padding:16px;border:1px solid var(--line,#ddd);border-radius:10px;min-width:0}fieldset{min-width:0}label{display:block;overflow-wrap:anywhere;margin:10px 0}input[type=checkbox]{width:auto;display:inline-block;margin-right:8px}button{margin:4px;max-width:100%}p{line-height:1.7;overflow-wrap:anywhere}</style>
