<script setup lang="ts">
import { onMounted,ref,shallowRef,onBeforeUnmount } from 'vue';
import { unifiedKnowledge } from '../services';
import {electronMediaAdapter} from '../editor/media-adapter';
import MarkdownContent from '../editor/MarkdownContent.vue';
import MarkdownEditor from '../editor/MarkdownEditor.vue';
import type { Input,Output } from '../../shared/protocol/registry';
import type { EditorDocument } from '../../shared/editor/document';
const props=defineProps<{readonly?:boolean;deckId:string;nodeId:string;onSaved:(node:Output<'knowledge.node.save'>)=>Promise<void>}>();
const editor=shallowRef<InstanceType<typeof MarkdownEditor>>(),node=shallowRef<Output<'knowledge.node.read'>>();
const error=ref(''),unknown=ref(false),retrying=ref(false),saveState=ref('clean');
let disposed=false,pending:{requestId:string;payload:Input<'knowledge.node.save'>}|null=null;
const scope={deckId:props.deckId,nodeId:props.nodeId};
const adapter={async save(document:EditorDocument,expectedRevision:number){
 if(pending)throw Error('先核对上一份正文的保存结果；当前内容仍保留');
 const request={requestId:crypto.randomUUID(),payload:{...scope,expectedRevision,markdown:document.markdown}};
 try{const result=await unifiedKnowledge.save(request.payload,request.requestId);await props.onSaved(result);return {revision:result.revision};}
 catch(e){if(!(e as {definitive?:boolean}).definitive){pending=request;unknown.value=true;}throw e;}
}};
const media=electronMediaAdapter(props.deckId,'knowledge');
const clean=()=>editor.value?.saves.state==='clean';
async function flush(){if(props.readonly)return true;if(!node.value||pending||retrying.value)return false;if(clean())return true;await editor.value?.save();return clean();}
async function retry(){
 if(retrying.value)return;retrying.value=true;error.value='';
 try{
  if(pending){const result=await unifiedKnowledge.save(pending.payload,pending.requestId);await props.onSaved(result);if(editor.value)editor.value.saves.revision=result.revision;pending=null;unknown.value=false;}
  await editor.value?.save();
 }catch(e){error.value=e instanceof Error?e.message:String(e);}finally{retrying.value=false;}
}
onMounted(async()=>{try{const result=await unifiedKnowledge.node(scope);if(!disposed)node.value=result;}catch(e){error.value=String(e);}});
onBeforeUnmount(()=>{disposed=true;});
function rebase(revision:number){if(editor.value?.saves.state==='clean'&&!pending)editor.value.saves.revision=revision;}
defineExpose({flush,rebase,editor,unknown,isClean:()=>!pending&&(!node.value||clean())});
</script>
<template>
 <section aria-label="知识点 Markdown 正文" class="knowledge-markdown">
  <p v-if="!node">正在读取正文…</p>
  <MarkdownContent v-if="node&&readonly" :markdown="node.markdown" :media-refs="[]" :editor-assets="node.assets"/>
  <div :inert="unknown||retrying"><MarkdownEditor v-if="node&&!readonly" ref="editor" :initial="{encoding:'ganksoft.editor/1',markdown:node.markdown,assets:node.assets}" :revision="node.revision" :document-adapter="adapter" :media-adapter="media" @save-state="saveState=$event"/></div>
  <p v-if="unknown" role="alert">保存结果待核对，正文仍保留。先核对原请求，再继续编辑。</p>
  <p v-if="error" role="alert">{{error}}</p>
  <button v-if="unknown||saveState==='error'||saveState==='conflict'" :disabled="retrying" @click="retry">{{unknown?'核对正文保存结果':'重试保存正文'}}</button>
 </section>
</template>
