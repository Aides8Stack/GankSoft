<script setup lang="ts">
import RecycleImpactPreview from './RecycleImpactPreview.vue';

import {ref,shallowRef,watch,nextTick} from 'vue';
import { unifiedKnowledge } from '../services';
import type { Input,Output } from '../../shared/protocol/registry';
const props=defineProps<{deckId:string;selectedId:string;flush:()=>Promise<boolean>;changed:()=>Promise<void>;recycleOnly?:boolean}>();
const dialog=ref<HTMLDialogElement>();
const mode=ref<'merge'|'recycle'|null>(null),tree=shallowRef<Output<'knowledge.tree.read'>>(),batches=shallowRef<Output<'knowledge.recycle.list'>>([]);
const target=ref(''),policy=ref<'keep'|'replace'|'append'>('keep'),batchId=ref(''),restoreName=ref(''),mount=ref('original');
const merge=shallowRef<Output<'knowledge.merge.preview'>>(),restore=shallowRef<Output<'knowledge.restore.preview'>>();
const busy=ref(false),error=ref(''),saved=ref(false),unknown=ref(false);
let pending:{method:'merge'|'restore';requestId:string;payload:Input<'knowledge.merge.confirm'>}|null=null;
async function open(next:'merge'|'recycle'){
 if(pending||!(await props.flush()))return;busy.value=true;error.value='';saved.value=false;
 try{tree.value=await unifiedKnowledge.tree({deckId:props.deckId});if(next==='recycle')batches.value=await unifiedKnowledge.recycle({deckId:props.deckId});
 mode.value=next;target.value='';policy.value='keep';merge.value=undefined;restore.value=undefined;batchId.value='';restoreName.value='';mount.value='original';}
 catch(e){error.value=String(e);}finally{busy.value=false;}
}
async function preview(){
 busy.value=true;error.value='';
 try{if(mode.value==='merge')merge.value=await unifiedKnowledge.previewMerge({deckId:props.deckId,sourceId:props.selectedId,targetId:target.value,bodyPolicy:policy.value});
 else restore.value=await unifiedKnowledge.previewRestore({deckId:props.deckId,batchId:batchId.value,...(restoreName.value.trim()?{rootName:restoreName.value.trim()}:{}),...(mount.value==='original'?{}:{parentId:mount.value==='root'?null:mount.value.slice(5)})});}
 catch(e){error.value=String(e);}finally{busy.value=false;}
}
function nodeLabel(id:string){const path:string[]=[];let node=tree.value?.nodes.find(n=>n.nodeId===id);const seen=new Set<string>();while(node&&!seen.has(node.nodeId)){seen.add(node.nodeId);path.unshift(node.name);node=tree.value?.nodes.find(n=>n.nodeId===node!.parentId);}return path.join(' › ');}
function clearPreview(){merge.value=undefined;restore.value=undefined;}
async function refresh(){try{await props.changed();saved.value=false;mode.value=null;}catch{error.value='操作已保存，但图谱刷新失败；请重新读取已保存图谱。';saved.value=true;}}
async function confirm(){
 if(busy.value||saved.value)return;const token=mode.value==='merge'?merge.value?.previewToken:restore.value?.previewToken;
 if(!pending&&!token)return;pending??={method:mode.value==='merge'?'merge':'restore',requestId:crypto.randomUUID(),payload:{previewToken:token!}};
 busy.value=true;error.value='';
 try{const request=pending;await (request.method==='merge'?unifiedKnowledge.confirmMerge:unifiedKnowledge.confirmRestore)(request.payload,request.requestId);pending=null;unknown.value=false;saved.value=true;await refresh();}
 catch(e){unknown.value=!(e as {definitive?:boolean}).definitive;if(!unknown.value)pending=null;error.value=String(e);}finally{busy.value=false;}
}
function close(){if(pending||busy.value||saved.value)return;mode.value=null;}
watch(mode,async value=>{if(value){await nextTick();dialog.value?.showModal();}});
defineExpose({close:()=>!mode.value&&!pending&&!busy.value&&!saved.value});
</script>
<template>
 <div class="knowledge-actions">
  <button v-if="!recycleOnly" title="合并知识点" aria-label="合并知识点" :disabled="busy||unknown||!selectedId" @click="open('merge')">⇄</button>
  <button title="知识子树回收站" aria-label="知识子树回收站" :disabled="busy||unknown" @click="open('recycle')">{{recycleOnly?'恢复知识子树':'♲'}}</button>
  <dialog v-if="mode" ref="dialog" @cancel.prevent="close" :aria-label="mode==='merge'?'合并知识点':'恢复知识子树'" class="tree-operation-panel">
   <fieldset :disabled="busy||unknown||saved">
    <legend>{{mode==='merge'?'合并知识点':'恢复知识子树'}}</legend>
    <template v-if="mode==='merge'">
     <label>合并到<select aria-label="合并到" v-model="target" @change="clearPreview"><option value="">请选择目标</option><option v-for="n in tree?.nodes.filter(n=>n.nodeId!==selectedId)" :key="n.nodeId" :value="n.nodeId">{{nodeLabel(n.nodeId)}}</option></select></label>
     <label>目标正文<select aria-label="目标正文" v-model="policy" @change="clearPreview"><option value="keep">保留目标正文</option><option value="replace">替换为来源正文</option><option value="append">追加来源正文</option></select></label>
     <button :disabled="!target" @click="preview">预览合并</button>
     <div v-if="merge"><p>{{merge.source.name}} → {{merge.target.name}}，迁移 {{merge.children}} 个下级，{{merge.linkedCards}} 张关联卡片。</p>
      <details><summary>正文差异</summary><pre>{{merge.source.markdown}}</pre><pre>{{merge.target.markdown}}</pre></details>
      <p v-for="conflict in merge.conflicts" :key="conflict" role="alert">{{conflict}}</p><button v-if="merge.previewToken" @click="confirm">确认合并</button></div>
    </template>
    <template v-else>
     <p v-if="!batches.length">暂无可恢复的知识子树</p>
     <p v-if="batches.find(b=>b.batchId===batchId)?.mergedInto">合并来源恢复后，子节点和卡片关联继续保留在目标节点。</p>
     <label>回收批次<select aria-label="回收批次" v-model="batchId" @change="clearPreview"><option value="">请选择子树</option><option v-for="b in batches" :key="b.batchId" :value="b.batchId">{{b.name}} · {{b.count}} 个节点{{b.mergedInto?'（合并来源）':''}}</option></select></label>
     <label>恢复名称（可选）<input aria-label="恢复名称（可选）" v-model="restoreName" @input="clearPreview"/></label>
     <label>恢复位置<select aria-label="恢复位置" v-model="mount" @change="clearPreview"><option value="original">原位置</option><option value="root">新根节点</option><option v-for="n in tree?.nodes" :key="n.nodeId" :value="'node:'+n.nodeId">{{nodeLabel(n.nodeId)}}</option></select></label>
     <button :disabled="!batchId" @click="preview">预览恢复</button><RecycleImpactPreview v-if="batchId" :input="{kind:'knowledge',deckId,batchId}" :disabled="busy||unknown"/>
     <div v-if="restore"><p>恢复「{{restore.rootName}}」及其下级，共 {{restore.count}} 个节点。</p><p v-for="conflict in restore.conflicts" :key="conflict" role="alert">{{conflict}}</p><button v-if="restore.previewToken" @click="confirm">确认恢复</button></div>
    </template>
    <button @click="close">取消</button>
   </fieldset>
  <p v-if="error" role="alert">{{error}}</p><button v-if="unknown" :disabled="busy" @click="confirm">核对原操作结果</button><button v-if="saved" :disabled="busy" @click="refresh">重新读取已保存图谱</button>
  </dialog>
  <p v-if="error&&!mode" role="alert">{{error}}</p>
 </div>
</template>
<style scoped>
.knowledge-actions{display:flex;gap:8px;align-items:center}.knowledge-actions>button{min-width:36px;height:36px}
.tree-operation-panel{position:fixed;z-index:150;inset:12vh max(10vw,24px) auto;background:var(--panel,#fff);border:1px solid #d5dce8;border-radius:12px;padding:20px;max-height:75vh;overflow:auto;box-shadow:0 12px 50px #23365133}
label{display:block;margin:12px 0}select,input{margin-left:8px;max-width:70%}pre{white-space:pre-wrap;max-height:160px;overflow:auto}
</style>
