<script setup lang="ts">
import {ref,onMounted,onBeforeUnmount} from 'vue';
import ExternalAppend from './UnifiedExternalAppend.vue';
import FullRestore from './UnifiedFullRestore.vue';
import {services} from '../services';
import {themeMode,themeSaving,themeFailure,updateTheme,flushTheme} from '../composables/preferences';
defineProps<{deckId?:string}>();
const operationNames:Record<string,string>={'maintenance.backup':'导出完整备份','maintenance.restore':'恢复完整备份','card.exchange.save':'导出卡片内容','exchange.deck.export':'导出卡片集','knowledge.md.export.save':'导出知识 Markdown'};
const emit=defineEmits<{recycle:[];schedule:[];exchange:[];restored:[]}>();
const appendBusy=ref(false),restoreBusy=ref(false);
const append=ref<InstanceType<typeof ExternalAppend>>();
const restore=ref<InstanceType<typeof FullRestore>>();
const section=ref<'appearance'|'data'|'review'|'operations'|'ai'>('appearance'),busy=ref(false),error=ref(''),notice=ref('');
const operations=ref<Awaited<ReturnType<typeof services.maintenance.operations>>>([]),notes=ref<Record<string,string>>({});
let disposed=false,closing=false;
async function loadOperations(){busy.value=true;error.value='';try{const result=await services.maintenance.operations();if(!disposed)operations.value=result;}catch(e){error.value=String(e);}finally{busy.value=false;}}
async function resolve(requestId:string){const note=notes.value[requestId]?.trim();if(!note||note.length<10)return;if(!confirm('已核对实际文件和学习数据？记录核对结果只解除重做锁定，不会撤销或重复操作。'))return;busy.value=true;error.value='';try{await services.maintenance.resolve({requestId,note});notice.value='已记录核对结果';await loadOperations();}catch(e){error.value=String(e);}finally{busy.value=false;}}
async function backup(){busy.value=true;error.value='';try{const result=await services.maintenance.backup();notice.value=result?'完整备份已导出':'已取消备份';}catch(e){error.value=String(e);}finally{busy.value=false;}}
async function close(){return !busy.value&&await flushTheme()&&(await restore.value?.close()??true)&&(await append.value?.close()??true);}
function beforeUnload(e:BeforeUnloadEvent){if(closing||!busy.value&&!themeSaving.value)return;e.preventDefault();e.returnValue='';if(!busy.value)void close().then(ok=>{if(ok){closing=true;window.close();}});}
onMounted(()=>window.addEventListener('beforeunload',beforeUnload));onBeforeUnmount(()=>{disposed=true;window.removeEventListener('beforeunload',beforeUnload);});
defineExpose({close});
</script>
<template><section aria-label="系统设置" class="system-settings"><h2>设置</h2><nav aria-label="设置分类"><button v-for="(name,key) in {appearance:'外观与主题',review:'复盘与调度',data:'数据与备份',operations:'待核对操作',ai:'外部 AI 协作'}" :key="key" :aria-current="section===key?'page':undefined" :disabled="busy" @click="section=key;if(key==='operations')loadOperations()">{{name}}</button></nav>
 <p v-if="error||themeFailure" role="alert">{{error||themeFailure}}</p><p v-if="notice" role="status">{{notice}}</p>
 <section v-if="section==='appearance'" aria-label="外观与主题"><h3>外观与主题</h3><label>主题<select aria-label="主题" :value="themeMode" @change="updateTheme(($event.target as HTMLSelectElement).value as 'light'|'dark'|'system')"><option value="light">浅色</option><option value="dark">深色</option><option value="system">跟随系统</option></select></label><p>主题随选择保存。</p></section>
 <section v-else-if="section==='data'" aria-label="数据与备份"><h3>数据与备份</h3><button :disabled="busy" @click="backup">导出完整备份</button><button :disabled="busy" @click="emit('exchange')">导入卡片内容</button><p>完整备份保留学习记录、草稿、知识点及图片；卡片内容包用于导入独立的学习内容。</p><ExternalAppend ref="append" :inert="restoreBusy" @busy="appendBusy=$event;busy=appendBusy||restoreBusy" @appended="emit('restored')"/><FullRestore ref="restore" :inert="appendBusy" @busy="restoreBusy=$event;busy=appendBusy||restoreBusy" @restored="emit('restored')"/></section>
 <section v-else-if="section==='review'" aria-label="复盘与调度"><h3>复盘与调度</h3><button v-if="deckId" @click="emit('schedule')">当前卡片集调度</button><p v-else>进入卡片集可设置默认复盘规则，或在卡片详情中设置独立配置。</p></section>
 <section v-else-if="section==='operations'" aria-label="待核对操作"><h3>待核对操作</h3><p>先核对上次操作的实际文件和学习数据，再记录处理结果。</p><article v-for="op in operations" :key="op.requestId"><p>{{operationNames[op.method]??'文件与数据操作'}} · {{new Date(op.createdAt).toLocaleString('zh-CN')}}</p><label>核对说明<textarea v-model="notes[op.requestId]" :aria-label="'核对说明 '+op.requestId" maxlength="1000" :disabled="busy"/></label><button :disabled="busy||(notes[op.requestId]?.trim().length??0)<10" @click="resolve(op.requestId)">记录核对结果</button></article><p v-if="!operations.length&&!busy">没有待核对操作。</p><button :disabled="busy" @click="loadOperations">刷新操作</button></section>
 <section v-else aria-label="外部 AI 协作"><h3>外部 AI 协作</h3><p>在卡片编辑器复制 Prompt 到外部 AI，粘贴结果后预览确认。知识范围默认不勾选，知识点关联由你确认。</p></section>
 <footer v-if="deckId"><button @click="emit('recycle')">当前卡片集回收站</button></footer>
</section></template>
<style scoped>.system-settings{max-width:880px}.system-settings nav{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--line,#ddd);padding-bottom:12px}section[aria-label]:not(.system-settings){margin:20px 0;padding:20px;background:var(--panel,#fff);border-radius:10px}button,select{margin:4px}select{min-width:160px}label{display:block}textarea{display:block;width:min(100%,560px);min-height:80px}p{line-height:1.7}footer{margin-top:20px}</style>
