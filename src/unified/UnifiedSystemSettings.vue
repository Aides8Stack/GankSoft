<script setup lang="ts">
import {ref,onMounted,onBeforeUnmount,nextTick} from 'vue';
import Schedule from './UnifiedScheduleSettings.vue';
import {reviewSettingsGuards} from '../composables/reviewSettingsGuard';
import Recycle from './UnifiedRecycle.vue';
import UiIcon from './v37/PrototypeIcon.vue';
import FullRestore from './UnifiedFullRestore.vue';
import Relocation from './UnifiedRelocation.vue';
import {services} from '../services';
import {themeMode,themeSaving,themeFailure,updateTheme,flushTheme} from '../composables/preferences';
defineProps<{deckId?:string}>();
const operationNames:Record<string,string>={'maintenance.backup':'导出完整备份','maintenance.restore':'恢复完整备份','card.exchange.save':'导出卡片内容','exchange.deck.export':'导出卡片集','knowledge.md.export.save':'导出知识 Markdown'};
const emit=defineEmits<{back:[];changed:[];schedule:[];exchange:[];restored:[]}>();
const sections={general:'常规设置',review:'复盘与调度',data:'数据管理',backup:'备份与恢复',trash:'回收站',appearance:'外观与主题',operations:'待核对操作',ai:'外部 AI 协作',about:'关于'} as const;
type Section=keyof typeof sections;
const stored=sessionStorage.getItem('gank-settings-section');
const section=ref<Section>(stored&&stored in sections?stored as Section:'general');
const heading=ref<HTMLElement>(),schedule=ref<InstanceType<typeof Schedule>>();
const restoreBusy=ref(false),relocationBusy=ref(false);
const restore=ref<InstanceType<typeof FullRestore>>();
const recycle=ref<InstanceType<typeof Recycle>>();
const relocation=ref<InstanceType<typeof Relocation>>();
const busy=ref(false),error=ref(''),notice=ref('');
const operations=ref<Awaited<ReturnType<typeof services.maintenance.operations>>>([]),notes=ref<Record<string,string>>({});
let disposed=false,closing=false;
async function loadOperations(){busy.value=true;error.value='';try{const result=await services.maintenance.operations();if(!disposed)operations.value=result;}catch(e){error.value=String(e);}finally{busy.value=false;}}
async function resolve(requestId:string){const note=notes.value[requestId]?.trim();if(!note||note.length<10)return;if(!confirm('已核对实际文件和学习数据？记录核对结果只解除重做锁定，不会撤销或重复操作。'))return;busy.value=true;error.value='';try{await services.maintenance.resolve({requestId,note});notice.value='已记录核对结果';await loadOperations();}catch(e){error.value=String(e);}finally{busy.value=false;}}
async function backup(){busy.value=true;error.value='';try{const result=await services.maintenance.backup();notice.value=result?'完整备份已导出':'已取消备份';}catch(e){error.value=String(e);}finally{busy.value=false;}}
async function close(){if(section.value==='review'){if(schedule.value&&!schedule.value.close())return false;for(const guard of reviewSettingsGuards)if(!guard())return false;}return !busy.value&&await flushTheme()&&(await restore.value?.close()??true)&&(await relocation.value?.close()??true)&&(recycle.value?.close()??true);}
async function selectSection(next:typeof section.value){if(next===section.value||!await close())return;section.value=next;sessionStorage.setItem('gank-settings-section',next);error.value='';notice.value='';if(next==='operations')await loadOperations();await nextTick();heading.value?.focus();}
function beforeUnload(e:BeforeUnloadEvent){if(closing||!busy.value&&!themeSaving.value)return;e.preventDefault();e.returnValue='';if(!busy.value)void close().then(ok=>{if(ok){closing=true;window.close();}});}
onMounted(()=>window.addEventListener('beforeunload',beforeUnload));onBeforeUnmount(()=>{disposed=true;window.removeEventListener('beforeunload',beforeUnload);});
defineExpose({close});
</script>
<template><section aria-label="系统设置" class="system-settings"><div class="page-heading"><div><h1>设置</h1><p>配置和数据管理集中在这里，支持一键返回之前的工作台。</p></div><button class="button" @click="emit('back')"><UiIcon name="back"/>返回原页面</button></div>
 <div class="settings-grid"><nav class="settings-menu" aria-label="设置分类"><button v-for="(name,key) in sections" :key="key" :class="{active:section===key}" :aria-current="section===key?'page':undefined" :disabled="busy" @click="selectSection(key)">{{name}}</button></nav>
 <section class="settings-main" :aria-label="sections[section]"><div class="section-heading"><h2 ref="heading" tabindex="-1">{{sections[section]}}</h2><span class="tiny-meta">本地设置</span></div>
 <p v-if="error||themeFailure" role="alert">{{error||themeFailure}}</p><p v-if="notice" role="status">{{notice}}</p>
 <template v-if="section==='general'"><div class="setting-line"><div><strong>应用启动页</strong><small>启动后打开学习总览，选择卡片集继续学习。</small></div><span class="pill">学习总览</span></div><div class="setting-line"><div><strong>界面语言</strong><small>中文简体</small></div><span class="pill">简体中文</span></div><div class="setting-line"><div><strong>保存与离页</strong><small>编辑自动保存；未保存配置或结果待核对时会保护离页。</small></div></div><details class="shortcuts"><summary>键盘操作说明</summary><p>Tab / Shift + Tab 移动焦点，Enter / Space 激活按钮；编辑器支持 Ctrl + Z 撤销、Ctrl + Shift + Z 重做。弹窗可用 Escape 取消，正在提交或结果未知时需先核对。</p></details></template>
 <template v-else-if="section==='appearance'"><div class="setting-line"><div><strong>应用主题</strong><small>主题随选择保存；保存失败可重试。</small></div><select aria-label="主题" :value="themeMode" @change="updateTheme(($event.target as HTMLSelectElement).value as 'light'|'dark'|'system')"><option value="light">浅色</option><option value="dark">深色</option><option value="system">跟随系统</option></select></div><button v-if="themeFailure" class="button" :disabled="themeSaving" @click="updateTheme(themeMode)">重试保存主题</button></template>
 <template v-else-if="section==='data'"><Relocation ref="relocation" @busy="relocationBusy=$event;busy=$event" @relocated="emit('restored')"/><div class="setting-line"><div><strong>卡片内容交换</strong><small>导入独立学习内容；数据库合并导入位于备份与恢复。</small></div><button class="button" :disabled="busy" @click="emit('exchange')">导入卡片内容</button></div></template>
 <template v-else-if="section==='backup'"><div class="setting-line"><div><strong>完整备份</strong><small>保留学习记录、排期、草稿、知识点及图片。</small></div><button class="button" :disabled="busy" @click="backup">导出完整备份</button></div><FullRestore ref="restore" @busy="restoreBusy=$event;busy=$event" @restored="emit('restored')"/></template>
 <template v-else-if="section==='review'"><Schedule v-if="deckId" ref="schedule" :deck-id="deckId"/><p v-else>进入卡片集后可设置卡片集默认调度，或在卡片详情中选择单卡独立配置。</p><p class="muted-box">自评 0–10 分沿用原 FSRS 映射；错题客观答错强制 Again。保存配置不自动重算现有排期。</p></template>
 <template v-else-if="section==='operations'"><p>先核对上次操作的实际文件和学习数据，再记录处理结果。</p><article v-for="op in operations" :key="op.requestId"><p>{{operationNames[op.method]??'文件与数据操作'}} · {{new Date(op.createdAt).toLocaleString('zh-CN')}}</p><label>核对说明<textarea v-model="notes[op.requestId]" :aria-label="'核对说明 '+op.requestId" maxlength="1000" :disabled="busy"/></label><button class="button" :disabled="busy||(notes[op.requestId]?.trim().length??0)<10" @click="resolve(op.requestId)">记录核对结果</button></article><p v-if="!operations.length&&!busy">没有待核对操作。</p><button class="button" :disabled="busy" @click="loadOperations">刷新操作</button></template>
 <Recycle v-else-if="section==='trash'" ref="recycle" :deck-id="deckId" @changed="emit('changed')"/>
 <template v-else-if="section==='about'"><div class="setting-line"><div><strong>GankSoft v0.7.6-rc.1</strong><small>Windows 10/11 · 本地学习工作台 · 数据格式 Schema606</small></div><span class="pill">便携版</span></div></template>
 <template v-else><p>在卡片编辑器复制 Prompt 到外部 AI，粘贴结果后预览确认。知识范围默认不勾选，知识点关联由你确认。</p></template>
 </section></div>
</section></template>
<style scoped>
.system-settings{min-width:0}.settings-grid{display:grid;grid-template-columns:210px minmax(0,1fr);gap:17px}.settings-menu{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:7px;align-self:start}.settings-menu button{display:flex;width:100%;align-items:center;gap:10px;border:0;background:transparent;padding:11px 12px;font-size:12px;border-radius:7px;color:var(--muted);text-align:left}.settings-menu button.active{background:var(--primary-soft);color:var(--primary-dark);font-weight:700}.settings-main{min-width:0;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:23px 25px;min-height:380px}.section-heading h2{font-size:14.5px}.setting-line{display:flex;justify-content:space-between;gap:10px;padding:15px 0;border-bottom:1px solid var(--border);align-items:center}.setting-line>div{min-width:0}.setting-line strong{font-size:12px}.setting-line small{display:block;margin-top:4px;color:var(--muted)}.shortcuts{margin-top:18px}.settings-main p{line-height:1.7;overflow-wrap:anywhere}.settings-main label{display:block}textarea{display:block;width:min(100%,560px);min-height:80px}select{max-width:100%}.settings-main :deep(button){max-width:100%;white-space:normal}.settings-main :deep(table){table-layout:fixed;overflow-wrap:anywhere}.settings-main :deep(section){min-width:0}.settings-main :deep(input[type=number]){max-width:100%}.settings-main :deep(.relocation){border-top:0;margin-top:0;padding-top:0}
@media(max-width:1200px){.settings-grid{grid-template-columns:150px minmax(0,1fr)}}@media(max-width:980px){.settings-grid{grid-template-columns:1fr}.settings-menu{display:flex;flex-wrap:wrap}.settings-menu button{width:auto}.settings-main{padding:20px}.setting-line{flex-wrap:wrap}}
</style>
