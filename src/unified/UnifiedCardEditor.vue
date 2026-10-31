<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref,shallowRef} from 'vue';
import {useKnowledgePicker} from '../composables/knowledgePicker';
import CardDraftForm from '../cards/CardDraftForm.vue';
import {unifiedCards,unifiedDrafts,unifiedKnowledge} from '../services';
import {electronMediaAdapter} from '../editor/media-adapter';
import type {Input,Output} from '../../shared/protocol/registry';
const props=defineProps<{deckId:string;cardId:string;deckName?:string;session?:Output<'draft.previewSwitch'>}>();
const emit=defineEmits<{published:[];back:[];drafts:[];schedule:[]}>();
const scope={deckId:props.deckId,cardId:props.cardId},form=shallowRef<InstanceType<typeof CardDraftForm>>(),draft=shallowRef<Output<'draft.get'>>(),initial=shallowRef<Output<'draft.previewSwitch'>>();
const error=ref(''),publishedOnce=ref(false);
const picker=useKnowledgePicker(()=>props.deckId);let disposed=false;
const links=shallowRef<Output<'knowledge.cardLinks.get'>>(),tree=shallowRef<Output<'knowledge.tree.read'>>(),chosen=ref<string[]>([]),linkBusy=ref(false);
const linksDirty=computed(()=>!!links.value&&JSON.stringify([...chosen.value].sort())!==JSON.stringify([...links.value.nodeIds].sort()));
const pendingLinks=shallowRef<{payload:Input<'knowledge.cardLinks.set'>;requestId:string}|null>(null);
async function load(){if(props.session){initial.value=props.session;draft.value=null;return;}try{const d=await unifiedDrafts.get(scope),current=d?null:await unifiedCards.getPublishedContent(scope),p=await unifiedDrafts.previewSwitch({...scope,targetType:d?.draftType??current!.mode});if(!disposed){draft.value=d;initial.value=p;}}catch(e){error.value=String(e);}}
async function openLinks(){if(linkBusy.value||pendingLinks.value)return;linkBusy.value=true;const deckId=scope.deckId;
 try{if(!links.value){const [l,t]=await Promise.all([unifiedKnowledge.links(scope),unifiedKnowledge.tree({deckId})]);if(disposed)return;links.value=l;chosen.value=[...l.nodeIds];tree.value=t;}
 const result=await picker.open({deckId,initialSelectedIds:chosen.value,purpose:'association',allowSelectDescendants:true});if(!disposed&&result.status==='confirmed')chosen.value=[...result.nodeIds];}
 catch(e){if(!disposed)error.value=String(e);}finally{linkBusy.value=false;}}
function discardLinks(){if(!linkBusy.value&&!pendingLinks.value)chosen.value=[...(links.value?.nodeIds??[])];}
async function saveLinks(){if(!links.value)return;linkBusy.value=true;error.value='';pendingLinks.value??={payload:{...scope,expectedRevision:links.value.revision,nodeIds:[...chosen.value]},requestId:crypto.randomUUID()};
 try{links.value=await unifiedKnowledge.setLinks(pendingLinks.value.payload,pendingLinks.value.requestId);pendingLinks.value=null;chosen.value=[...links.value.nodeIds];}
 catch(e){if((e as {definitive?:boolean}).definitive)pendingLinks.value=null;error.value=String(e);}finally{linkBusy.value=false;}}
const loadPromptContext=()=>unifiedCards.promptContext(scope);
async function publish(input:Input<'card.publish'>,id:string){const result=await unifiedCards.publish(input,id);publishedOnce.value=true;emit('published');return result;}
async function close(){if(linksDirty.value){error.value='知识点关联尚未保存，请保存关联或放弃关联更改。';return false;}return !linksDirty.value&&!linkBusy.value&&!pendingLinks.value&&(!initial.value||!!form.value&&await form.value.close());}
onMounted(load);onBeforeUnmount(()=>{disposed=true;});defineExpose({close,sessionForReturn:()=>form.value?.controller.publishedRevision===0&&form.value?.controller.revision===null?props.session:undefined});
</script>
<template>
 <section aria-label="编辑卡片" class="r4-editor"><p v-if="!initial&&!error">正在读取当前模式草稿…</p><p v-if="error" role="alert">{{error}}</p>

  <CardDraftForm v-if="initial" ref="form" @back="emit('back')" @drafts="emit('drafts')" :initial="initial" :deck-name="deckName" :draft="draft??null" :adapter="unifiedDrafts" :publish="publish" :load-prompt-context="loadPromptContext" :clipboard="{copy:unifiedCards.clipboardCopy,preview:unifiedCards.clipboardPreview,apply:unifiedCards.clipboardApply}" :media-adapter="electronMediaAdapter(scope.deckId)">
   <template #actions><button class="button small" :disabled="initial.publishedRevision===0&&!publishedOnce" :title="initial.publishedRevision===0&&!publishedOnce?'发布卡片后可设置单卡调度':'单卡调度设置'" @click="emit('schedule')">调度设置</button></template>
   <template #knowledge><section class="editor-knowledge"><div class="section-heading"><h3>知识点关联</h3><button v-if="initial.publishedRevision>0||publishedOnce" :disabled="linkBusy" @click="openLinks">选择知识点</button></div><div v-if="linksDirty||pendingLinks" class="heading-actions"><span>待保存关联</span><button :disabled="linkBusy" @click="saveLinks">{{pendingLinks?'核对原关联请求':'保存知识点关联'}}</button><button :disabled="linkBusy||!!pendingLinks" @click="discardLinks">放弃关联更改</button></div><div class="knowledge-chips"><span v-for="id in chosen" :key="id" class="pill">{{tree?.nodes.find(n=>n.nodeId===id)?.name??'已关联知识点'}}</span><span v-if="!chosen.length" class="tiny-meta">{{initial.publishedRevision>0||publishedOnce?'尚未读取关联，可打开图谱选择。':'首次发布后可关联知识点。'}}</span></div></section></template>
  </CardDraftForm>
 </section>
</template>
