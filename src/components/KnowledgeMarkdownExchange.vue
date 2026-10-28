<script setup lang="ts">
import {computed,nextTick,ref,shallowRef,watch} from 'vue';
import {knowledgeMarkdown,unifiedKnowledge} from '../services';
import type {Input,Output} from '../../shared/protocol/registry';
import KnowledgeExchangeMap from './KnowledgeExchangeMap.vue';
const props=defineProps<{deckId:string;flush:()=>Promise<boolean>;changed:()=>Promise<void>}>();
const mode=ref<'import'|'export'|null>(null),dialog=ref<HTMLDialogElement>(),busy=ref(false),error=ref(''),notice=ref('');
const tree=shallowRef<Output<'knowledge.tree.read'>>(),source=shallowRef<Output<'knowledge.md.source.text'>>(),preview=shallowRef<Output<'knowledge.md.import.preview'>>(),exported=shallowRef<Output<'knowledge.md.export.preview'>>();
const headings=ref<Output<'knowledge.md.source.text'>['headings']>([]),headingLines=ref<number[]>([]),mount=ref(''),text=ref(''),selected=ref<string[]>([]),parents=ref(false),descendants=ref(false),policies=ref<Record<string,'keep'|'replace'|'append'>>({}),rows=ref<Output<'knowledge.md.import.preview'>['rows']>([]),diff=shallowRef<Output<'knowledge.md.import.diff'>>();
const search=ref('');
const pathOf=(id:string)=>{const names:string[]=[];let node=tree.value?.nodes.find(n=>n.nodeId===id);while(node){names.unshift(node.name);node=tree.value?.nodes.find(n=>n.nodeId===node!.parentId);}return names.join(' › ');};
const visibleNodes=computed(()=>tree.value?.nodes.filter(n=>pathOf(n.nodeId).toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()))??[]);
function selectAll(){if(controlsLocked.value)return;selected.value=tree.value?.nodes.map(n=>n.nodeId)??[];invalidate();}
function clearSelection(){if(controlsLocked.value)return;selected.value=[];invalidate();}
const unknown=ref(false),saved=ref(false);const pending=shallowRef<{requestId:string;payload:Input<'knowledge.md.import.confirm'>}|null>(null);
let fileRequest:{requestId:string;payload:Input<'knowledge.md.export.save'>}|null=null;
const controlsLocked=computed(()=>busy.value||unknown.value||saved.value);
const depth=(id:string)=>{let level=0,node=tree.value?.nodes.find(n=>n.nodeId===id);while(node?.parentId){level++;node=tree.value?.nodes.find(n=>n.nodeId===node!.parentId);}return level;};
function invalidate(){preview.value=undefined;exported.value=undefined;rows.value=[];diff.value=undefined;notice.value='';}
function toggle(id:string){if(controlsLocked.value)return;if(mode.value==='import')mount.value=id;else selected.value=selected.value.includes(id)?selected.value.filter(n=>n!==id):[...selected.value,id];invalidate();}
async function open(next:'import'|'export'){
 if(controlsLocked.value||mode.value)return;if(!(await props.flush()))return;
 busy.value=true;error.value='';notice.value='';
 try{tree.value=await unifiedKnowledge.tree({deckId:props.deckId});mode.value=next;source.value=undefined;headings.value=[];headingLines.value=[];text.value='';mount.value='';selected.value=[];policies.value={};search.value='';parents.value=false;descendants.value=false;saved.value=false;invalidate();}
 catch(e){error.value=String(e);}finally{busy.value=false;}
}
async function stage(kind:'text'|'clipboard'|'file'){
 if(controlsLocked.value)return;
 busy.value=true;error.value='';invalidate();source.value=undefined;headings.value=[];headingLines.value=[];policies.value={};
 try{const p={deckId:props.deckId};source.value=kind==='text'?await knowledgeMarkdown.text({...p,markdown:text.value}):kind==='clipboard'?await knowledgeMarkdown.clipboard(p):(await knowledgeMarkdown.open(p))??undefined;
  if(source.value){headings.value=[...source.value.headings];let offset=source.value.headings.length;while(offset<source.value.headingTotal){const page=await knowledgeMarkdown.headings({...p,sourceToken:source.value.sourceToken,offset});headings.value.push(...page.headings);if(page.nextOffset===null)break;offset=page.nextOffset;}}
 }catch(e){error.value=String(e);}finally{busy.value=false;}
}
async function makePreview(){
 if(controlsLocked.value)return;
 busy.value=true;error.value='';invalidate();
 try{if(mode.value==='import'&&source.value){preview.value=await knowledgeMarkdown.previewImport({deckId:props.deckId,sourceToken:source.value.sourceToken,parentId:mount.value||null,selectedLines:headingLines.value,policies:policies.value});rows.value=[...preview.value.rows];}
 else if(mode.value==='export')exported.value=await knowledgeMarkdown.previewExport({deckId:props.deckId,nodeIds:selected.value,includeParentBodies:parents.value,includeDescendants:descendants.value});}
 catch(e){error.value=String(e);}finally{busy.value=false;}
}
function changePolicy(key:string,event:Event){policies.value[key]=(event.target as HTMLSelectElement).value as 'keep'|'replace'|'append';void makePreview();}
async function more(){if(!preview.value||preview.value.nextOffset===null)return;busy.value=true;try{const page=await knowledgeMarkdown.page({deckId:props.deckId,previewToken:preview.value.previewToken,offset:preview.value.nextOffset});rows.value.push(...page.rows);preview.value={...preview.value,nextOffset:page.nextOffset};}catch(e){error.value=String(e);}finally{busy.value=false;}}
async function showDiff(key:string){if(!preview.value)return;busy.value=true;try{diff.value=await knowledgeMarkdown.diff({deckId:props.deckId,previewToken:preview.value.previewToken,key});}catch(e){error.value=String(e);}finally{busy.value=false;}}
async function refreshSaved(){busy.value=true;try{await props.changed();saved.value=false;mode.value=null;}catch{error.value='导入已保存，图谱刷新失败。请重新读取已保存图谱。';}finally{busy.value=false;}}
async function confirmImport(){
 if(!pending.value&&preview.value)pending.value={requestId:crypto.randomUUID(),payload:{deckId:props.deckId,previewToken:preview.value.previewToken}};if(!pending.value||busy.value)return;
 busy.value=true;error.value='';try{await knowledgeMarkdown.confirmImport(pending.value.payload,pending.value.requestId);pending.value=null;unknown.value=false;saved.value=true;await refreshSaved();}
 catch(e){unknown.value=!(e as {definitive?:boolean}).definitive;if(!unknown.value)pending.value=null;error.value=String(e);}finally{busy.value=false;}
}
async function useExport(file:boolean){
 if(!exported.value||busy.value)return;busy.value=true;error.value='';
 try{const payload={deckId:props.deckId,exportToken:exported.value.exportToken};
  if(file){fileRequest??={requestId:crypto.randomUUID(),payload};const result=await knowledgeMarkdown.save(fileRequest.payload,fileRequest.requestId);fileRequest=null;notice.value=result.saved?'已保存 '+result.name:'已取消保存';}
  else{await knowledgeMarkdown.copy(payload);notice.value='已复制 Markdown';}}
 catch(e){error.value=String(e);if(file){if((e as {definitive?:boolean}).definitive)fileRequest=null;else{unknown.value=true;notice.value='文件写入结果待核对。请检查目标文件，并在设置的待核对操作中处理；不会自动重复写入。';}}}finally{busy.value=false;}
}
function close(){if(busy.value||pending.value||saved.value)return;mode.value=null;unknown.value=false;fileRequest=null;}
watch(error,async value=>{if(value){await nextTick();dialog.value?.querySelector<HTMLElement>('[role=alert]')?.focus();}});
watch(mode,async value=>{if(value){await nextTick();dialog.value?.showModal();}});
defineExpose({isClosed:()=>!mode.value&&!pending.value&&!busy.value&&!saved.value});
</script>
<template>
 <span class="knowledge-md-actions">
  <button title="导入知识 Markdown" aria-label="导入知识 Markdown" @click="open('import')">↥</button><button title="导出知识 Markdown" aria-label="导出知识 Markdown" @click="open('export')">↧</button>
  <dialog v-if="mode" ref="dialog" class="knowledge-md-exchange" :aria-label="mode==='import'?'导入知识 Markdown':'导出知识 Markdown'" @cancel.prevent="close">
   <header><h2>{{mode==='import'?'导入知识 Markdown':'导出知识 Markdown'}}</h2><button aria-label="关闭 Markdown 交换" :disabled="busy||!!pending||saved" @click="close">×</button></header>
   <div class="md-exchange-columns">
    <aside><h3>{{mode==='import'?'选择挂载位置':'选择导出节点'}}</h3>
     <label>搜索完整知识路径<input aria-label="搜索完整知识路径" v-model="search" :disabled="controlsLocked" type="search"/></label>
     <div v-if="mode==='export'" class="inline-actions"><button :disabled="controlsLocked" @click="selectAll">全选全部节点</button><button :disabled="controlsLocked||!selected.length" @click="clearSelection">清空选择</button></div>
     <p v-if="mode==='export'" role="status">已选 {{selected.length}} / {{tree?.nodes.length??0}} 个节点（搜索不改变选择）</p>
     <KnowledgeExchangeMap v-if="tree" :nodes="tree.nodes" :selected="mode==='import'?(mount?[mount]:[]):selected" @select="toggle"/>
     <details class="exchange-tree-list"><summary>按完整路径选择节点</summary><fieldset :disabled="controlsLocked"><legend class="sr-only">{{mode==='import'?'挂载位置':'导出节点'}}</legend>
      <label v-if="mode==='import'"><input type="radio" value="" v-model="mount" @change="invalidate"/>作为新根节点</label>
      <label v-for="n in visibleNodes" :key="n.nodeId" :style="{paddingLeft:Math.min(depth(n.nodeId),8)*12+'px'}">
       <input v-if="mode==='import'" type="radio" :value="n.nodeId" v-model="mount" @change="invalidate"/>
       <input v-else type="checkbox" :value="n.nodeId" v-model="selected" @change="invalidate"/>{{n.name}}<small class="node-path">{{pathOf(n.nodeId)}}</small>
      </label>

     </fieldset></details>
     <fieldset :disabled="controlsLocked"><div v-if="mode==='export'&&selected.length" class="export-options"><label><input type="checkbox" v-model="parents" @change="invalidate"/>包含必要父级的正文</label><label><input type="checkbox" v-model="descendants" @change="invalidate"/>包含整个子树</label></div></fieldset>
    </aside>
    <main>
     <fieldset :disabled="controlsLocked">
      <template v-if="mode==='import'">
       <div class="inline-actions"><button @click="stage('file')">选择 .md 文件</button><button @click="stage('clipboard')">读取剪贴板</button></div>
       <label>粘贴 Markdown<textarea aria-label="粘贴 Markdown" v-model="text" @input="source=undefined;invalidate()"/></label><button :disabled="!text.trim()" @click="stage('text')">读取粘贴内容</button>
       <p v-if="source">{{source.name}} · {{source.bytes.toLocaleString()}} 字节</p>
       <section v-if="source?.format==='external'"><p>选择要作为知识节点的标题；未选标题仍属于正文。</p><label v-for="h in headings" :key="h.line"><input type="checkbox" :value="h.line" v-model="headingLines" @change="invalidate"/>第 {{h.line}} 行 · {{'#'.repeat(h.depth)}} {{h.name}}</label></section>
       <button :disabled="!source" @click="makePreview">预览导入</button>
       <section v-if="preview"><p>目标：{{mount?pathOf(mount):'新根节点'}} · 共 {{preview.total}} 项，已显示 {{rows.length}} 项。仅列出的路径受影响，未列出的节点不变。</p><p>新增 {{preview.created}} · 更新 {{preview.updated}} · 保留 {{preview.kept}} · 图片 {{preview.imageCount}}</p>
        <p v-if="preview.imageCount">图片将验证后写入；较大的内嵌图片可能不被外部编辑器支持。</p>
        <div v-for="r in rows" :key="r.key" class="import-row"><span>{{r.path.join(' › ')}}</span><select v-if="r.action!=='create'" :aria-label="'正文策略 '+r.path.join(' › ')" :value="policies[r.key]||'keep'" @change="changePolicy(r.key,$event)"><option value="keep">保留原正文</option><option value="replace">替换正文</option><option value="append">追加正文</option></select><span v-else>新增</span><small v-if="r.action!=='create'">完整路径冲突 · 原 {{r.beforeChars}} / 结果 {{r.afterChars}} 字符</small><button :aria-label="'查看正文与图片 '+r.path.join(' › ')" @click="showDiff(r.key)">查看正文与图片</button></div>
        <button v-if="preview.nextOffset!==null" @click="more">更多条目</button><button class="primary" @click="confirmImport">确认导入</button>
       </section>
      </template>
      <template v-else><p>范围：所选节点{{descendants?'及其全部后代':'本身'}}；必要祖先自动保留{{parents?'标题及正文':'标题，正文为空'}}。七级及更深层级使用 GankSoft v2 标记无损保存，标准标题显示最多六级；重新导入可恢复真实层级。</p><button :disabled="!selected.length" @click="makePreview">预览导出</button>
       <section v-if="exported"><p>{{exported.nodeCount}} 个结构节点 / {{exported.bodyCount}} 个正文节点 · {{exported.imageCount}} 处图片 · {{exported.bytes.toLocaleString()}} 字节</p><p v-if="exported.imageCount">图片以内嵌 Base64 保存；部分外部编辑器可能不支持。</p><pre aria-label="实际导出 Markdown">{{exported.markdown}}</pre><p v-if="exported.truncated">预览已截断，复制和文件保存仍使用完整内容。</p><button @click="useExport(false)">复制 Markdown</button><button @click="useExport(true)">保存 .md 文件</button></section>
      </template>
     </fieldset>
     <section v-if="diff" aria-label="导入正文与图片预览"><h3>{{diff.path.join(' › ')}} · {{diff.action==='keep'?'保留原正文':diff.action==='replace'?'替换正文':diff.action==='append'?'追加正文':'新增'}}</h3>
      <h4>待导入正文（{{diff.incomingChars}} 字符）</h4><pre aria-label="待导入正文">{{diff.incoming||'（空正文）'}}</pre><p v-if="diff.incomingTruncated">待导入正文预览已截断；确认使用完整原文。</p>
      <p>图片引用 {{diff.images.length}} 处；正文中的 ganksoft-import-image 序号仅供预览。</p><ul aria-label="待导入图片引用"><li v-for="image in diff.images" :key="image.index">#{{image.index}} {{image.alt||'无替代文字'}} · {{image.mime}} · {{image.bytes}} 字节 · 宽 {{image.width}}%<small class="node-path">SHA-256 {{image.sha256}} · 标题 {{image.title??'（无）'}}</small></li></ul>
      <div class="md-diff"><div><h4>原正文</h4><pre aria-label="原正文">{{diff.before||'（空正文）'}}</pre></div><div><h4>策略执行后的正文</h4><pre aria-label="策略执行后的正文">{{diff.after||'（空正文）'}}</pre></div></div></section>
    </main>
   </div>
   <p v-if="error" role="alert" tabindex="-1">{{error}}</p><p v-if="notice" role="status">{{notice}}</p><button v-if="pending&&unknown" :disabled="busy" @click="confirmImport">核对原导入请求</button><button v-if="saved" :disabled="busy" @click="refreshSaved">重新读取已保存图谱</button>
  </dialog><p v-if="error&&!mode" role="alert">{{error}}</p>
 </span>
</template>
<style scoped>
.knowledge-md-actions{display:flex;gap:6px}.knowledge-md-actions>button{width:36px;height:36px}.knowledge-md-exchange{width:min(1200px,94vw);max-height:92vh;padding:20px;border:1px solid var(--line,#ddd);border-radius:14px;color:inherit;background:var(--panel,#fff)}
header{display:flex;align-items:center;justify-content:space-between}h2{margin:0 0 16px}.md-exchange-columns{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(340px,1fr);gap:24px}aside,main{min-width:0;max-height:65vh;overflow:auto}fieldset{border:0;padding:0;min-width:0}label{display:block;margin:8px 0}input{width:auto}textarea{display:block;width:100%;min-height:220px;resize:vertical}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;overflow:auto;padding:12px;background:var(--bg,#f5f6f8);border-radius:8px}.node-path{display:block;overflow-wrap:anywhere;color:var(--muted,#65706b)}.import-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0}.import-row>span:first-child{flex:1}.md-diff{display:grid;grid-template-columns:1fr 1fr;gap:12px}.export-options{border-top:1px solid #ddd;margin-top:12px}@media(max-width:720px){.md-exchange-columns{grid-template-columns:1fr}aside{max-height:30vh}.knowledge-exchange-map{height:180px}.md-diff{grid-template-columns:1fr}}
</style>

<style scoped>
.knowledge-md-exchange::backdrop{background:#14291e66}
.knowledge-md-exchange>header{padding-bottom:14px;border-bottom:1px solid var(--border,#e6eae8);margin-bottom:18px}
.knowledge-md-exchange h2{font-size:18px;margin:0}
.exchange-tree-list{margin-top:12px;border-top:1px solid var(--border,#e6eae8);padding-top:10px}
.exchange-tree-list summary{cursor:pointer;font-size:12px}
.md-exchange-columns aside{display:flex;flex-direction:column;gap:8px}
.md-exchange-columns .knowledge-exchange-map{height:390px;flex-shrink:0}
.knowledge-md-exchange [role=alert]{padding:12px;border:1px solid #b94f4b;border-radius:8px;color:#983b37;overflow-wrap:anywhere}
@media(max-width:1000px){.md-exchange-columns{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}.md-exchange-columns .knowledge-exchange-map{height:300px}}
</style>
