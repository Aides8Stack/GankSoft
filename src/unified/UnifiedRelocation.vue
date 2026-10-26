<script setup lang="ts">
import {ref,shallowRef,onMounted,onBeforeUnmount} from 'vue';
import {unifiedRelocation} from '../services';
import {RelocationConfirmation} from '../../shared/protocol/relocation';
import type {Input,Output} from '../../shared/protocol/registry';
const props=defineProps<{inert?:boolean}>(),emit=defineEmits<{busy:[value:boolean];relocated:[]}>();
const currentDirectory=ref(''),activity=ref('');
const supported=ref(false),busy=ref(false),accepted=ref(false),unknown=ref(false),error=ref(''),notice=ref('');
const plan=shallowRef<Output<'storage.relocate.open'>>(null),pending=shallowRef<Input<'storage.relocate.confirm'>|null>(null);
const operationId=ref(localStorage.getItem('gank-relocate-operation')??'');let disposed=false;
function working(value:boolean){busy.value=value;emit('busy',value||unknown.value);}
async function choose(){if(props.inert||busy.value||unknown.value)return;working(true);error.value='';notice.value='';activity.value='正在检查目录并制作一致性快照…';accepted.value=false;
 try{plan.value=await unifiedRelocation.open();if(!plan.value)notice.value='已取消选择目录';}catch(e){error.value=String(e);}finally{working(false);}}
async function cancel(){if(busy.value||unknown.value)return false;working(true);try{if(plan.value)await unifiedRelocation.cancel(plan.value.confirmation.previewId);
  plan.value=null;accepted.value=false;notice.value='已取消迁移，当前数据未改变';return true;}catch(e){error.value=String(e);return false;}finally{working(false);}}
async function commit(c:Input<'storage.relocate.confirm'>){working(true);error.value='';notice.value='';activity.value='正在复制、校验并切换活动目录，请等待结果…';let reload=false;
 try{const r=await unifiedRelocation.confirm(c);unknown.value=false;pending.value=null;plan.value=null;
  if(r.state==='committed'){notice.value=r.reopened?'数据目录已迁移并重开':'迁移已提交，请重启后核对唯一活动目录';reload=r.reopened;}
  else notice.value='迁移未提交，原数据仍在原目录';
 }catch(e){unknown.value=(e as {outcome?:string}).outcome==='unknown';if(!unknown.value){pending.value=null;localStorage.removeItem('gank-relocate-pending');}error.value=String(e);}
 finally{working(false);}if(reload)emit('relocated');}
async function confirm(){if(!plan.value||!accepted.value||busy.value||props.inert)return;pending.value=plan.value.confirmation;
 operationId.value=pending.value.operationId;await commit(pending.value);}
async function status(){if(!operationId.value)return;working(true);error.value='';let reload=false;
 try{const r=await unifiedRelocation.status(operationId.value);notice.value=!r?'没有找到该迁移操作':
  r.state==='committed'?'上次迁移已提交'+(r.reopened?'，当前目录已重开':'，请重启后核对'):r.state==='aborted'?'上次迁移未提交，原目录仍有效':'上次迁移尚待恢复核对';
  if(r?.state==='committed'||r?.state==='aborted'){unknown.value=false;pending.value=null;localStorage.removeItem('gank-relocate-pending');reload=r.state==='committed'&&r.reopened&&!!plan.value;plan.value=null;}
 }catch(e){error.value=String(e);}finally{working(false);}if(reload)emit('relocated');}
onMounted(async()=>{try{const raw=localStorage.getItem('gank-relocate-pending');if(raw){pending.value=RelocationConfirmation.parse(JSON.parse(raw));unknown.value=true;emit('busy',true);}supported.value=await unifiedRelocation.supported();if(supported.value)currentDirectory.value=(await unifiedRelocation.info()).currentDirectory;}catch(e){if(!disposed)error.value=String(e);}});
onBeforeUnmount(()=>{disposed=true;if(plan.value&&!busy.value&&!unknown.value)void unifiedRelocation.cancel(plan.value.confirmation.previewId).catch(()=>{});});
defineExpose({close:async()=>!busy.value&&!unknown.value&&(!plan.value||await cancel())});
</script>
<template><section aria-label="迁移活动数据目录" class="relocation"><h4>更改数据存储位置</h4><p v-if="currentDirectory">当前有效数据目录：{{currentDirectory}}</p><p v-if="busy" role="status">{{activity||'正在查询迁移状态…'}}</p>
 <p>选择新目录的父文件夹，应用会在其中创建 GankSoftData。确认前预览空间与图片，迁移后保留原数据和完整恢复点。</p>
 <button :disabled="busy||unknown||inert||!supported" @click="choose">选择目标文件夹</button><p v-if="!supported">当前入口尚未启用目录迁移。</p>
 <p v-if="unknown" role="alert">迁移结果未知，请查询状态或重试原请求，核对前请勿关闭。</p><p v-if="error" role="alert">{{error}}</p><p v-if="notice" role="status">{{notice}}</p>
 <article v-if="plan" aria-label="目录迁移预览"><p>原目录：{{plan.source}}</p><p>新目录：{{plan.destination}}</p>
  <p>目标可用空间：{{(Number(plan.availableBytes)/1024/1024).toFixed(2)}} MiB</p><p>图片：{{plan.mediaFiles}} 个（{{(plan.mediaBytes/1024/1024).toFixed(2)}} MiB）；预留空间：{{(Number(plan.requiredBytes)/1024/1024).toFixed(2)}} MiB。</p>
  <label><input type="checkbox" v-model="accepted" :disabled="busy||unknown||inert"/>我确认迁移全部活动数据到上述新目录</label>
  <button :disabled="busy||unknown||inert||!accepted" @click="confirm">确认迁移目录</button><button :disabled="busy||unknown||inert" @click="cancel">取消迁移</button>
 </article>
 <button v-if="operationId" :disabled="busy" @click="status">查询上次迁移结果</button>
 <button v-if="unknown&&pending" :disabled="busy" @click="commit(pending)">重试原迁移请求</button>
</section></template>
<style scoped>.relocation{margin-top:20px;border-top:1px solid var(--line,#ddd);padding-top:16px}article{padding:16px;border:1px solid var(--line,#ddd);border-radius:10px;min-width:0}p{line-height:1.7;overflow-wrap:anywhere}label{display:block;margin:12px 0}input[type=checkbox]{display:inline-block;width:auto;margin-right:8px}button{margin:4px;max-width:100%}</style>
