<script setup lang="ts">
import { onMounted,ref,shallowRef,onBeforeUnmount } from 'vue';
import { unifiedKnowledge } from '../services';
import {electronMediaAdapter} from '../editor/media-adapter';
import MarkdownContent from '../editor/MarkdownContent.vue';
import MarkdownEditor from '../editor/MarkdownEditor.vue';
import type { Input,Output } from '../../shared/protocol/registry';
import type { EditorDocument } from '../../shared/editor/document';
const props=defineProps<{readonly?:boolean;lazy?:boolean;deckId:string;nodeId:string;onSaved:(node:Output<'knowledge.node.save'>)=>Promise<void>}>();
const host=ref<HTMLElement>();let observer:IntersectionObserver|undefined;
const editor=shallowRef<InstanceType<typeof MarkdownEditor>>(),node=shallowRef<Output<'knowledge.node.read'>>();
const error=ref(''),unknown=ref(false),retrying=ref(false),saveState=ref('clean');
const conflict=ref(false),confirmReload=ref(false),bodyGeneration=ref(0);
let disposed=false,pending:{requestId:string;payload:Input<'knowledge.node.save'>}|null=null;
const scope={deckId:props.deckId,nodeId:props.nodeId};
const adapter={async save(document:EditorDocument,expectedRevision:number){
 if(pending&&(pending.payload.expectedRevision!==expectedRevision||pending.payload.markdown!==document.markdown))throw Error('先核对上一份正文的保存结果；当前内容仍保留');
 // Replay through the same controller generation. A manual revision assignment
 // followed by save() would write this already-committed document a second time.
 const request=pending??{requestId:crypto.randomUUID(),payload:{...scope,expectedRevision,markdown:document.markdown}};
 try{const result=await unifiedKnowledge.save(request.payload,request.requestId);await props.onSaved(result);pending=null;unknown.value=false;return {revision:result.revision};}
 catch(e){conflict.value=(e as {code?:string}).code==='REVISION_CONFLICT';if(!(e as {definitive?:boolean}).definitive){pending=request;unknown.value=true;}else{pending=null;unknown.value=false;}throw e;}
}};
const media=electronMediaAdapter(props.deckId,'knowledge');
const clean=()=>editor.value?.isClean()===true;
async function flush(){if(props.readonly)return true;if(!node.value||pending||retrying.value||!editor.value?.handle)return false;await editor.value.save();return clean();}
async function retry(){
 if(retrying.value)return;retrying.value=true;error.value='';
 try{
  await editor.value?.save();
 }catch(e){error.value=e instanceof Error?e.message:String(e);}finally{retrying.value=false;}
}
// A conflict cannot be rebased silently: the user may retain the live draft,
// or explicitly discard it and remount from the latest committed node.
async function reloadCommitted(){
 if(pending||retrying.value||!confirmReload.value)return;
 retrying.value=true;error.value='';
 try{const latest=await unifiedKnowledge.node(scope);await props.onSaved(latest);node.value=latest;bodyGeneration.value++;conflict.value=false;confirmReload.value=false;saveState.value='clean';}
 catch(e){error.value='重新读取失败，当前草稿仍保留：'+String(e);}
 finally{retrying.value=false;}
}
async function load(){error.value='';try{const result=await unifiedKnowledge.node(scope);if(!disposed)node.value=result;}catch(e){if(!disposed)error.value=String(e);}}
onMounted(()=>{if(props.readonly&&props.lazy&&host.value){observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer?.disconnect();void load();}},{root:host.value.closest('.outline-body'),rootMargin:'300px 0px'});observer.observe(host.value);}else void load();});
onBeforeUnmount(()=>{disposed=true;observer?.disconnect();});
function rebase(revision:number){if(editor.value?.saves.state==='clean'&&!pending)editor.value.saves.revision=revision;}
defineExpose({flush,rebase,editor,unknown,isClean:()=>!pending&&(!node.value||clean())});
</script>
<template>
 <section ref="host" aria-label="知识点 Markdown 正文" class="knowledge-markdown">
  <p v-if="!node&&!error">正在读取正文…</p><button v-if="!node&&error" @click="load">重新读取正文</button>
  <MarkdownContent v-if="node&&readonly" :markdown="node.markdown" :media-refs="[]" :editor-assets="node.assets"/>
  <div :inert="unknown||retrying"><MarkdownEditor v-if="node&&!readonly" :key="bodyGeneration" ref="editor" :initial="{encoding:'ganksoft.editor/1',markdown:node.markdown,assets:node.assets}" :revision="node.revision" :document-adapter="adapter" :media-adapter="media" :resource-deck-id="deckId" @save-state="saveState=$event"/></div>
  <p v-if="unknown" role="alert">保存结果待核对，正文仍保留。先核对原请求，再继续编辑。</p>
  <p v-if="error" role="alert">{{error}}</p>
  <button v-if="unknown||saveState==='error'||saveState==='conflict'" :disabled="retrying" @click="retry">{{unknown?'核对正文保存结果':'重试保存正文'}}</button>
  <button v-if="conflict&&!confirmReload" :disabled="retrying||unknown" @click="confirmReload=true">重新读取已保存正文</button>
  <div v-if="confirmReload" role="group" aria-label="确认放弃冲突草稿">
   <p role="alert">重新读取会放弃当前未保存的正文草稿，不会覆盖已保存内容。</p>
   <button :disabled="retrying" @click="confirmReload=false">保留当前草稿</button>
   <button :disabled="retrying||unknown" @click="reloadCommitted">确认放弃草稿并重新读取</button>
  </div>
 </section>
</template>
