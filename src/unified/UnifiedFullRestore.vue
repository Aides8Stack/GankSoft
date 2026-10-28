<script setup lang="ts">
import {ref,shallowRef,onMounted,onBeforeUnmount} from 'vue';
import {unifiedStorage} from '../services';
import {FullRestoreConfirmation} from '../../shared/protocol/full-backup';
import type {Input,Output} from '../../shared/protocol/registry';
const props=defineProps<{inert?:boolean}>();
const pending=shallowRef<Input<'storage.restore.confirm'>|null>(null),unknown=ref(false);
const emit=defineEmits<{busy:[value:boolean];restored:[]}>();
const plan=shallowRef<Output<'storage.restore.open'>>(null),supported=ref(false),busy=ref(false),accepted=ref(false),legacy=ref(false),error=ref(''),notice=ref('');
const operationId=ref(sessionStorage.getItem('gank-restore-operation')??'');
let disposed=false;
function working(value:boolean){busy.value=value;emit('busy',value||unknown.value);}
async function choose(){if(busy.value||unknown.value||props.inert)return;working(true);plan.value=null;error.value='';notice.value='';accepted.value=false;legacy.value=false;
 try{plan.value=await unifiedStorage.open();if(!plan.value)notice.value='已取消选择备份';}catch(e){error.value=String(e);}finally{working(false);}}
async function cancel(){if(busy.value||unknown.value)return false;working(true);try{if(plan.value)await unifiedStorage.cancel(plan.value.summary.previewId);plan.value=null;accepted.value=false;notice.value='已取消恢复，当前数据未改变';return true;}catch(e){error.value=String(e);return false;}finally{working(false);}}
async function commit(c:Input<'storage.restore.confirm'>){if(busy.value||props.inert)return;working(true);error.value='';notice.value='';let reload=false;
 try{const result=await unifiedStorage.confirm(c);unknown.value=result.state!=='committed'&&result.state!=='aborted';if(!unknown.value){pending.value=null;localStorage.removeItem('gank-restore-pending');}
  if(result.state==='committed'){plan.value=null;notice.value=result.reopened?'完整备份已恢复':'恢复已提交，请重启后核对，勿重复恢复';reload=result.reopened;}
  else notice.value=result.state==='aborted'?'恢复未提交，当前数据已保留，请重新选择备份':'恢复结果待核对，请查询上次操作';
 }catch(e){unknown.value=(e as {outcome?:string}).outcome==='unknown';if(!unknown.value){pending.value=null;localStorage.removeItem('gank-restore-pending');}error.value=String(e);}finally{working(false);}if(reload)emit('restored');}
async function confirmRestore(){const p=plan.value;if(!p||busy.value||unknown.value||props.inert||!accepted.value||p.summary.requiresUnifiedMigration&&!legacy.value)return;
 operationId.value=p.confirmation.operationId;pending.value=p.confirmation;localStorage.setItem('gank-restore-pending',JSON.stringify(pending.value));await commit(pending.value);}
async function status(){if(!operationId.value||busy.value)return;working(true);error.value='';let reload=false;try{const r=await unifiedStorage.status(operationId.value);notice.value=!r?'尚未找到恢复回执，请保留原请求并重启核对':r.state==='committed'?'上次恢复已提交'+(r.reopened?'，当前数据库已重开':'，请核对当前数据库'):r.state==='aborted'?'上次恢复未提交，原数据已保留':'上次恢复尚待核对，请重启后恢复';if(r?.state==='committed'||r?.state==='aborted'){reload=unknown.value&&r.state==='committed'&&r.reopened;unknown.value=false;pending.value=null;plan.value=null;localStorage.removeItem('gank-restore-pending');}}catch(e){error.value=String(e);}finally{working(false);}if(reload)emit('restored');}
function beforeUnload(e:BeforeUnloadEvent){if(busy.value||unknown.value){e.preventDefault();e.returnValue='';}}
onMounted(async()=>{window.addEventListener('beforeunload',beforeUnload);try{const raw=localStorage.getItem('gank-restore-pending');if(raw){pending.value=FullRestoreConfirmation.parse(JSON.parse(raw));operationId.value=pending.value.operationId;unknown.value=true;emit('busy',true);}const value=await unifiedStorage.supported();if(!disposed)supported.value=value;}catch(e){if(!disposed)error.value=String(e);}});
onBeforeUnmount(()=>{disposed=true;window.removeEventListener('beforeunload',beforeUnload);if(plan.value&&!busy.value&&!unknown.value)void unifiedStorage.cancel(plan.value.summary.previewId).catch(()=>{});});
defineExpose({close:async()=>!busy.value&&!unknown.value&&(!plan.value||await cancel())});
</script>
<template><section aria-label="恢复完整备份" class="full-restore"><h4>恢复完整备份</h4>
 <p>恢复会替换全部当前数据。确认前会自动保存并校验当前数据的完整恢复点。</p>
 <button :disabled="busy||unknown||inert||!supported" @click="choose">选择完整备份</button><p v-if="!supported">当前入口尚未启用完整恢复。</p>
 <p v-if="unknown" role="alert">恢复结果未知，请先查询回执或核对原请求，勿重复恢复。</p><p v-if="error" role="alert">{{error}}</p><p v-if="notice" role="status">{{notice}}</p>
 <article v-if="plan" aria-label="完整备份恢复预览"><h4>备份内容</h4><p>备份时间：{{new Date(plan.summary.createdAt).toLocaleString('zh-CN')}}</p>
  <dl><dt>卡片集</dt><dd>{{plan.summary.decks.active}} 个，回收站 {{plan.summary.decks.recycled}} 个</dd><dt>知识节点</dt><dd>{{plan.summary.knowledge.active}} 个，回收站 {{plan.summary.knowledge.recycled}} 个</dd>
  <template v-if="plan.summary.unifiedCards"><dt>已发布卡片</dt><dd>选择复盘 {{plan.summary.unifiedCards.question}} · 问答记忆 {{plan.summary.unifiedCards.qa}} · 直接记忆 {{plan.summary.unifiedCards.direct}} · 回收站 {{plan.summary.unifiedCards.recycled}}</dd></template>
  <template v-else><dt>旧版卡片</dt><dd>题目 {{plan.summary.legacy.questions}} · 记忆 {{plan.summary.legacy.memories}}</dd></template>
  <dt>内容版本</dt><dd>{{plan.summary.versions}}</dd><dt>草稿</dt><dd>现有卡片 {{plan.summary.drafts.publishedCard}} · 新卡片 {{plan.summary.drafts.unpublishedCard}}</dd><dt>复盘记录</dt><dd>{{plan.summary.reviewEvents}}</dd><dt>学习周期 / 排期</dt><dd>{{plan.summary.studyCycles}} / {{plan.summary.schedules}}</dd><dt>图片</dt><dd>{{plan.summary.media.files}} 个，{{(plan.summary.media.bytes/1024/1024).toFixed(2)}} MiB</dd></dl>
  <p>这是整库恢复；备份中的学习历史、排期、设置及回收站将一并恢复。</p>
  <label v-if="plan.summary.requiresUnifiedMigration"><input type="checkbox" v-model="legacy" :disabled="busy||unknown||inert"/>我同意将旧版本备份转换后恢复</label>
  <label><input type="checkbox" v-model="accepted" :disabled="busy||unknown||inert"/>我确认用该备份替换全部当前数据</label>
  <button :disabled="busy||unknown||inert||!accepted||plan.summary.requiresUnifiedMigration&&!legacy" @click="confirmRestore">确认恢复全部数据</button><button :disabled="busy||unknown||inert" @click="cancel">取消恢复</button>
 </article>
 <button v-if="operationId" :disabled="busy||inert" @click="status">查询上次恢复结果</button><button v-if="unknown&&pending" :disabled="busy||inert" @click="commit(pending)">核对原恢复请求</button>
</section></template>
<style scoped>.full-restore{margin-top:20px;border-top:1px solid var(--line,#ddd);padding-top:16px}article{padding:16px;border:1px solid var(--line,#ddd);border-radius:10px}dl{display:grid;grid-template-columns:minmax(80px,110px) minmax(0,1fr);gap:8px;margin:16px 0}dd{margin:0;overflow-wrap:anywhere}label{display:block;margin:12px 0}input[type=checkbox]{display:inline-block;width:auto;margin-right:8px}button{margin:4px}p{line-height:1.7}</style>
