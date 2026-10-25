<script setup lang="ts">
import {computed,onMounted,ref,shallowRef} from 'vue';
import {unifiedLearning,unifiedKnowledge} from '../services';
import type {Input,Output} from '../../shared/protocol/registry';
import AdaptiveReviewSettings from '../components/AdaptiveReviewSettings.vue';
import {useReviewSettingsGuard} from '../composables/reviewSettingsGuard';
const props=defineProps<{deckId:string;cardId?:string}>();
const config=shallowRef<Output<'policy.config.get'>>(),policy=shallowRef<Output<'policy.card.get'>>(),tree=shallowRef<Output<'knowledge.tree.read'>>(),preview=shallowRef<Awaited<ReturnType<typeof unifiedLearning.previewRecompute>>>();
const daily=ref(15),maximum=ref(365),inherited=ref(true),busy=ref(false),error=ref(''),notice=ref(''),offset=ref(0),operation=ref('');
let pending:{kind:'deck';payload:Input<'policy.deck.set'>;id:string}|{kind:'card';payload:Input<'policy.card.set'>;id:string}|{kind:'apply';payload:Input<'policy.config.applyExisting'>;id:string}|{kind:'undo';payload:Input<'policy.config.undoExisting'>;id:string}|null=null;
const advanced=shallowRef<InstanceType<typeof AdaptiveReviewSettings>>(),refreshNeeded=ref(false);
const unknown=ref(false),dirty=computed(()=>!!config.value&&(props.cardId?inherited.value!==(policy.value?.source==='deck_default')||!inherited.value&&maximum.value!==policy.value?.maxIntervalDays:daily.value!==config.value.dailyLimit||maximum.value!==config.value.maxIntervalDays));useReviewSettingsGuard(dirty);
async function load(){const c=await unifiedLearning.config({deckId:props.deckId});config.value=c;if(props.cardId){const p=await unifiedLearning.cardPolicy({kind:'card',cardId:props.cardId});policy.value=p;inherited.value=p.source==='deck_default';maximum.value=p.maxIntervalDays;}else{daily.value=c.dailyLimit;maximum.value=c.maxIntervalDays;}}
onMounted(async()=>{busy.value=true;try{await load();if(!props.cardId)tree.value=await unifiedKnowledge.tree({deckId:props.deckId});}catch(e){error.value=String(e);}finally{busy.value=false;}});
async function execute(){if(!pending||busy.value)return;busy.value=true;error.value='';try{const p=pending;
 if(p.kind==='deck')await unifiedLearning.setDeck(p.payload,p.id);else if(p.kind==='card')await unifiedLearning.setCardPolicy(p.payload,p.id);else if(p.kind==='apply'){const r=await unifiedLearning.applyRecompute(p.payload,p.id);operation.value=r.operationId;}else{await unifiedLearning.undoRecompute(p.payload,p.id);operation.value='';}
 pending=null;unknown.value=false;preview.value=undefined;notice.value='操作已保存';try{await load();refreshNeeded.value=false;}catch{refreshNeeded.value=true;error.value='设置已保存，刷新失败，请重新读取已保存设置。';}
 }catch(e){unknown.value=!(e as {definitive?:boolean}).definitive;if(!unknown.value)pending=null;error.value=String(e);}finally{busy.value=false;}}
async function save(){if(props.cardId){if(!policy.value)return;pending={kind:'card',id:crypto.randomUUID(),payload:{kind:'card',cardId:props.cardId,expectedRevision:policy.value.revision,maxIntervalDays:inherited.value?null:maximum.value}};}else pending={kind:'deck',id:crypto.randomUUID(),payload:{deckId:props.deckId,dailyLimit:daily.value,maxIntervalDays:maximum.value}};await execute();}
async function recompute(next=0){if(advanced.value&&!advanced.value.isClean())return;busy.value=true;error.value='';try{preview.value=await unifiedLearning.previewRecompute({deckId:props.deckId,...(props.cardId?{cardId:props.cardId}:{}),offset:next,limit:20});offset.value=next;}catch(e){error.value=String(e);}finally{busy.value=false;}}
async function apply(){if(!preview.value||!confirm(`确认提前 ${preview.value.affectedCount} 张卡片？已到期/逾期不会延期，单卡独立设置保留。`))return;pending={kind:'apply',id:crypto.randomUUID(),payload:{previewToken:preview.value.previewToken}};await execute();}
async function undo(){if(!operation.value||!confirm('撤销本次重算？之后已复盘或修改的卡片会拒绝撤销。'))return;pending={kind:'undo',id:crypto.randomUUID(),payload:{deckId:props.deckId,operationId:operation.value}};await execute();}
async function refreshSaved(){busy.value=true;try{await load();refreshNeeded.value=false;error.value='';}catch(e){error.value=String(e);}finally{busy.value=false;}}
defineExpose({close:()=>!busy.value&&!unknown.value&&!pending&&!refreshNeeded.value});
const reasons:Record<string,string>={advance:'仅提前',card_override:'保留单卡设置',paused:'已暂停',manual_snooze:'人工延期',no_valid_state:'无可信排期',unchanged:'保持原排期'};
</script>
<template>
 <section aria-label="统一复盘调度设置"><h2>{{cardId?'单卡调度':'卡片集调度'}}</h2><p>保存设置从后续有效复盘生效；重算现有排期须另行预览确认。</p><form @submit.prevent="save"><fieldset :disabled="busy||unknown"><legend>调度设置</legend><label v-if="cardId"><input type="checkbox" v-model="inherited"/>继承卡片集设置</label><label v-else>每日独立卡片上限<input type="number" min="1" max="200" v-model.number="daily" required/></label><label>最大间隔（天）<input type="number" min="1" max="3650" v-model.number="maximum" :disabled="!!cardId&&inherited" required/></label><button :disabled="!dirty">保存调度设置</button></fieldset></form>
 <AdaptiveReviewSettings v-if="!cardId" ref="advanced" :deck-id="deckId" unified :knowledge-nodes="tree?.nodes.map(n=>({id:n.nodeId,name:n.name}))??[]"/>
 <section><button :disabled="busy||unknown||dirty||!!advanced&&!advanced.isClean()" @click="recompute()">预览重算现有排期</button><p v-if="dirty">请先保存修改后再预览。</p><div v-if="preview"><p>总计 {{preview.total}} · 可提前 {{preview.affectedCount}} · 单卡独立 {{preview.overriddenCount}}</p><table><thead><tr><th>卡片</th><th>当前排期</th><th>预览排期</th><th>原因</th></tr></thead><tbody><tr v-for="r in preview.rows" :key="r.cardId"><td>{{r.title||'未命名卡片'}}</td><td>{{r.beforeDue?new Date(r.beforeDue).toLocaleString('zh-CN'):'未排期'}}</td><td>{{r.afterDue?new Date(r.afterDue).toLocaleString('zh-CN'):'未排期'}}</td><td>{{reasons[r.reason]??r.reason}}</td></tr></tbody></table><button :disabled="busy||!offset" @click="recompute(offset-20)">上一页</button><button :disabled="busy||offset+20>=preview.total" @click="recompute(offset+20)">下一页</button><button :disabled="busy||unknown" @click="apply">确认重算</button></div><button v-if="operation" :disabled="busy||unknown" @click="undo">撤销本次重算</button></section>
 <button v-if="refreshNeeded" :disabled="busy" @click="refreshSaved">重新读取已保存设置</button><p v-if="error" role="alert">{{error}}</p><p v-if="notice" role="status">{{notice}}</p><button v-if="unknown" :disabled="busy" @click="execute">核对原调度请求</button>
 </section>
</template>
<style scoped>section{max-width:1100px;margin:20px auto}fieldset{border:1px solid var(--line,#ddd);padding:18px;border-radius:10px}label{display:block;margin:12px 0}input[type=checkbox]{width:auto}button{margin:8px}td,th{padding:10px;text-align:left}table{width:100%}</style>
