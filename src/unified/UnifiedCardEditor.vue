<script setup lang="ts">
import {onMounted,onBeforeUnmount,ref,shallowRef} from 'vue';
import CardDraftForm from '../cards/CardDraftForm.vue';
import {unifiedCards,unifiedDrafts,unifiedKnowledge} from '../services';
import {electronMediaAdapter} from '../editor/media-adapter';
import type {Input,Output} from '../../shared/protocol/registry';
const props=defineProps<{deckId:string;cardId:string;deckName?:string}>();
const emit=defineEmits<{published:[]}>();
const scope={deckId:props.deckId,cardId:props.cardId},form=shallowRef<InstanceType<typeof CardDraftForm>>(),draft=shallowRef<Output<'draft.get'>>(),initial=shallowRef<Output<'draft.previewSwitch'>>();
const error=ref('');let disposed=false;
const links=shallowRef<Output<'knowledge.cardLinks.get'>>(),tree=shallowRef<Output<'knowledge.tree.read'>>(),chosen=ref<string[]>([]),linkBusy=ref(false),linksOpen=ref(false);
const pendingLinks=shallowRef<{payload:Input<'knowledge.cardLinks.set'>;requestId:string}|null>(null);
async function load(){try{const d=await unifiedDrafts.get(scope),current=d?null:await unifiedCards.getPublishedContent(scope),p=await unifiedDrafts.previewSwitch({...scope,targetType:d?.draftType??current!.mode});if(!disposed){draft.value=d;initial.value=p;}}catch(e){error.value=String(e);}}
async function openLinks(){if(!await close())return;linkBusy.value=true;try{const [l,t]=await Promise.all([unifiedKnowledge.links(scope),unifiedKnowledge.tree({deckId:scope.deckId})]);links.value=l;chosen.value=[...l.nodeIds];tree.value=t;linksOpen.value=true;}catch(e){error.value=String(e);}finally{linkBusy.value=false;}}
async function saveLinks(){if(!links.value)return;linkBusy.value=true;error.value='';pendingLinks.value??={payload:{...scope,expectedRevision:links.value.revision,nodeIds:[...chosen.value]},requestId:crypto.randomUUID()};
 try{links.value=await unifiedKnowledge.setLinks(pendingLinks.value.payload,pendingLinks.value.requestId);pendingLinks.value=null;linksOpen.value=false;}
 catch(e){if((e as {definitive?:boolean}).definitive)pendingLinks.value=null;error.value=String(e);}finally{linkBusy.value=false;}}
const loadPromptContext=()=>unifiedCards.promptContext(scope);
async function publish(input:Input<'card.publish'>,id:string){const result=await unifiedCards.publish(input,id);emit('published');return result;}
async function close(){return !(linksOpen.value&&JSON.stringify([...chosen.value].sort())!==JSON.stringify([...(links.value?.nodeIds??[])].sort()))&&!linkBusy.value&&!pendingLinks.value&&(!initial.value||!!form.value&&await form.value.close());}
onMounted(load);onBeforeUnmount(()=>{disposed=true;});defineExpose({close});
</script>
<template>
 <section aria-label="编辑卡片"><p v-if="!initial&&!error">正在读取当前模式草稿…</p><p v-if="error" role="alert">{{error}}</p>
  <button v-if="initial&&initial.publishedRevision>0" :disabled="linkBusy" @click="openLinks">关联知识点</button>
  <section v-if="linksOpen" aria-label="选择知识点关联"><fieldset :disabled="linkBusy||!!pendingLinks"><legend>选择当前关联</legend><label v-for="n in tree?.nodes" :key="n.nodeId"><input type="checkbox" v-model="chosen" :value="n.nodeId"/>{{n.name}}</label></fieldset><button :disabled="linkBusy" @click="saveLinks">{{pendingLinks?'核对原关联请求':'确认关联'}}</button><button :disabled="linkBusy||!!pendingLinks" @click="linksOpen=false">取消</button></section>
  <CardDraftForm v-if="initial" ref="form" :initial="initial" :deck-name="deckName" :draft="draft??null" :adapter="unifiedDrafts" :publish="publish" :load-prompt-context="loadPromptContext" :clipboard="{copy:unifiedCards.clipboardCopy,preview:unifiedCards.clipboardPreview,apply:unifiedCards.clipboardApply}" :media-adapter="electronMediaAdapter(scope.deckId)"/>
 </section>
</template>
