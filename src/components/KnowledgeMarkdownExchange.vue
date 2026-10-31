<script setup lang="ts">
import {computed,nextTick,onBeforeUnmount,ref,shallowRef,watch} from 'vue';
import {knowledgeMarkdown,unifiedKnowledge} from '../services';
import type {Input,Output} from '../../shared/protocol/registry';
import {exportTree,resolveExportSelection,emptyExportSelection,toggleExportNode,toggleExportRule,exportRuleState,type ExportSelection,type ExportFlag} from '../../shared/knowledge/export-selection';
import KnowledgeExchangeMap from './KnowledgeExchangeMap.vue';
const props=defineProps<{deckId:string;flush:()=>Promise<boolean>;changed:()=>Promise<void>}>();
const mode=ref<'import'|'export'|null>(null),workspace=ref<HTMLElement>(),busy=ref(false),error=ref(''),notice=ref('');
const tree=shallowRef<Output<'knowledge.tree.read'>>(),source=shallowRef<Output<'knowledge.md.source.text'>>(),preview=shallowRef<Output<'knowledge.md.import.preview'>>(),exported=shallowRef<Output<'knowledge.md.export.preview'>>();
const headings=ref<Output<'knowledge.md.source.text'>['headings']>([]),headingLines=ref<number[]>([]),mount=ref(''),text=ref(''),selection=ref<ExportSelection>(emptyExportSelection()),policies=ref<Record<string,'keep'|'replace'|'append'>>({}),rows=ref<Output<'knowledge.md.import.preview'>['rows']>([]),diff=shallowRef<Output<'knowledge.md.import.diff'>>();
const search=ref(''),step=ref<'select'|'preview'>('select');
let returnTarget:HTMLElement|null=null;
function switchMode(next:'import'|'export'){if(controlsLocked.value||mode.value===next)return;mode.value=next;invalidate();error.value='';}
function back(){step.value='select';diff.value=undefined;}
const graph=ref<InstanceType<typeof KnowledgeExchangeMap>>(),rightList=ref<HTMLElement>(),focused=ref('');
const index=computed(()=>exportTree(tree.value?.nodes??[]));
const rowById=computed(()=>new Map(index.value.rows.map(r=>[r.node.nodeId,r])));
const scope=computed(()=>resolveExportSelection(index.value,selection.value));
const selected=computed(()=>[...scope.value.effective]);
const pathOf=(id:string)=>rowById.value.get(id)?.path??'';
const visibleNodes=computed(()=>index.value.rows.filter(r=>r.path.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())).map(r=>r.node));
const searchMatches=ref<string[]>([]),feedback=ref('');let feedbackTimer:ReturnType<typeof setTimeout>|undefined;
function selectAll(){if(controlsLocked.value)return;selection.value={...emptyExportSelection(),directNodeIds:index.value.rows.map(r=>r.node.nodeId)};invalidate();}
function clearSelection(){if(controlsLocked.value)return;selection.value=emptyExportSelection();invalidate();}
function flagState(id:string,flag:ExportFlag){return exportRuleState(index.value,selection.value,id,flag);}
function hasRelation(id:string,flag:ExportFlag){return flag==='includeParentBodies'?!!index.value.byId.get(id)?.parentId:index.value.descendants(id).length>0;}
async function focusRight(id:string){focused.value=id;await nextTick();const row=Array.from(rightList.value?.querySelectorAll<HTMLElement>('[data-export-id]')??[]).find(el=>el.dataset.exportId===id);row?.scrollIntoView({block:'center'});}
function focusBoth(id:string){graph.value?.focus(id);void focusRight(id);}
function toggleRule(id:string,flag:ExportFlag){if(controlsLocked.value)return;selection.value=toggleExportRule(index.value,selection.value,id,flag);invalidate();focusBoth(id);}
function locate(){
 if(controlsLocked.value)return;searchMatches.value=[];clearTimeout(feedbackTimer);feedback.value='';
 const query=search.value.trim().toLocaleLowerCase();
 const found=index.value.rows.filter(r=>r.path.toLocaleLowerCase().includes(query)||r.node.nodeId.toLocaleLowerCase()===query);
 if(!query||!found.length){feedback.value=query?'知识点不存在':'请输入知识点名称';feedbackTimer=setTimeout(()=>feedback.value='',1200);return;}
 if(found.length===1)focusBoth(found[0].node.nodeId);else searchMatches.value=found.map(r=>r.node.nodeId);
}
onBeforeUnmount(()=>clearTimeout(feedbackTimer));
const unknown=ref(false),saved=ref(false);const pending=shallowRef<{requestId:string;payload:Input<'knowledge.md.import.confirm'>}|null>(null);
let fileRequest:{requestId:string;payload:Input<'knowledge.md.export.save'>}|null=null;
const controlsLocked=computed(()=>busy.value||unknown.value||saved.value);
const depth=(id:string)=>rowById.value.get(id)?.depth??0;
function invalidate(){step.value='select';preview.value=undefined;exported.value=undefined;rows.value=[];diff.value=undefined;notice.value='';}
function toggle(id:string,origin:'graph'|'list'='graph'){if(controlsLocked.value)return;if(mode.value==='import')mount.value=id;else selection.value=toggleExportNode(index.value,selection.value,id);invalidate();if(mode.value==='export'){if(origin==='graph')void focusRight(id);else focusBoth(id);}}
async function open(next:'import'|'export'){
 if(controlsLocked.value||mode.value)return;if(!(await props.flush()))return;
 returnTarget=document.activeElement as HTMLElement;busy.value=true;error.value='';notice.value='';
 try{tree.value=await unifiedKnowledge.tree({deckId:props.deckId});mode.value=next;source.value=undefined;headings.value=[];headingLines.value=[];text.value='';mount.value='';selection.value=emptyExportSelection();focused.value='';searchMatches.value=[];feedback.value='';clearTimeout(feedbackTimer);policies.value={};search.value='';saved.value=false;invalidate();}
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
 else if(mode.value==='export'&&tree.value){
  const result=await knowledgeMarkdown.previewExport({deckId:props.deckId,selectionVersion:2,expectedTreeHash:tree.value.treeHash,...selection.value});
  if(result.bodyCount!==selected.value.length)throw new Error('导出范围与当前选择不一致，请重新打开导出');exported.value=result;
 }}
 catch(e){error.value=String(e);}finally{busy.value=false;if(preview.value||exported.value)step.value='preview';}
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
 if(!exported.value||controlsLocked.value)return;busy.value=true;error.value='';notice.value='';
 try{const payload={deckId:props.deckId,exportToken:exported.value.exportToken};
  if(file){fileRequest??={requestId:crypto.randomUUID(),payload};const result=await knowledgeMarkdown.save(fileRequest.payload,fileRequest.requestId);fileRequest=null;notice.value=result.saved?'已保存 '+result.name:'已取消保存';}
  else{await knowledgeMarkdown.copy(payload);notice.value='已复制 Markdown';}}
 catch(e){error.value=String(e);if(file){if((e as {definitive?:boolean}).definitive)fileRequest=null;else{unknown.value=true;notice.value='文件写入结果待核对。请检查目标文件，并在设置的待核对操作中处理；不会自动重复写入。';}}}finally{busy.value=false;}
}
function close(){if(busy.value||pending.value||saved.value)return;mode.value=null;unknown.value=false;fileRequest=null;void nextTick(()=>returnTarget?.focus());}
watch(error,async value=>{if(value){await nextTick();const alert=workspace.value?.querySelector<HTMLElement>('[role=alert]');alert?.scrollIntoView({block:'nearest'});alert?.focus();}});
watch(mode,async value=>{if(value){await nextTick();workspace.value?.querySelector<HTMLElement>('h2')?.focus();}});
defineExpose({isClosed:()=>!mode.value&&!pending.value&&!busy.value&&!saved.value});
</script>
<template>
 <span class="knowledge-md-actions">
  <button title="导入知识 Markdown" aria-label="导入知识 Markdown" @click="open('import')">↥</button><button title="导出知识 Markdown" aria-label="导出知识 Markdown" @click="open('export')">↧</button>
  <Teleport to=".unified-shell"><section v-if="mode" ref="workspace" class="knowledge-md-exchange" role="region" :aria-label="mode==='import'?'导入知识 Markdown':'导出知识 Markdown'" @keydown.esc.prevent="close">
   <header><div><p class="transfer-breadcrumb">知识图谱 / Markdown 知识交换</p><h2 tabindex="-1">{{mode==='import'?'导入知识 Markdown':'导出知识 Markdown'}}</h2></div><button aria-label="关闭 Markdown 交换" :disabled="busy||!!pending||saved" @click="close">返回知识图谱</button></header>
   <nav class="transfer-mode-tabs" aria-label="交换模式"><button :class="{active:mode==='import'}" :aria-pressed="mode==='import'" :disabled="controlsLocked" @click="switchMode('import')">导入 MD</button><button :class="{active:mode==='export'}" :aria-pressed="mode==='export'" :disabled="controlsLocked" @click="switchMode('export')">导出 MD</button><span>多根知识树 · 本地文件 / 剪贴板</span></nav>
   <div class="md-exchange-columns">
    <aside><h3>{{mode==='import'?'选择挂载位置':'选择导出节点'}}</h3>
     <KnowledgeExchangeMap v-if="tree" ref="graph" :nodes="tree.nodes" :selected="mode==='import'?(mount?[mount]:[]):selected" @select="id=>toggle(id,'graph')"/>
     <p class="transfer-map-hint">单击节点选择 · 拖动空白处平移 · 使用工具缩放</p>
    </aside>
    <main>
     <div class="transfer-steps"><span :class="{active:step==='select'}">① 选择范围与内容</span><span :class="{active:step==='preview'}">② 预览确认</span></div>
     <div class="transfer-right-scroll">
     <section v-show="step==='select'" class="transfer-selection">
     <form class="export-search" @submit.prevent="locate"><label>搜索完整知识路径<input aria-label="搜索完整知识路径" v-model="search" :disabled="controlsLocked" type="search" @input="searchMatches=[];feedback=''"/></label><button :disabled="controlsLocked" type="submit" aria-label="搜索定位知识点">定位</button></form>
     <p v-if="feedback" role="status" class="locate-feedback">{{feedback}}</p>
     <div v-if="searchMatches.length" class="search-matches" aria-label="定位候选"><button v-for="id in searchMatches" :key="id" :disabled="controlsLocked" :title="id" @click="focusBoth(id);searchMatches=[]">{{pathOf(id)}} · {{id}}</button></div>
     <template v-if="mode==='export'">
      <div class="inline-actions"><button :disabled="controlsLocked" @click="selectAll">全选全部节点</button><button :disabled="controlsLocked||!selected.length" @click="clearSelection">清空选择</button></div>
      <p role="status" class="selection-status">已选 {{selected.length}} / {{tree?.nodes.length??0}} 个节点（搜索仅定位）</p>
      <div ref="rightList" class="export-tree-list" aria-label="逐节点导出规则">
       <div v-for="r in index.rows" :key="r.node.nodeId" :data-export-id="r.node.nodeId" class="export-node-row" :class="{selected:scope.effective.has(r.node.nodeId),focused:focused===r.node.nodeId}">
        <label :style="{paddingLeft:(6+Math.min(r.depth,8)*12)+'px'}" :title="r.path+' · '+r.node.nodeId"><input type="checkbox" :checked="scope.effective.has(r.node.nodeId)" :aria-label="'导出 '+r.path" :disabled="controlsLocked" @change="toggle(r.node.nodeId,'list')"/><span>{{r.node.name}}</span></label>
        <button v-for="flag in (['includeParentBodies','includeDescendants'] as const)" :key="flag" class="export-condition" :class="{on:flagState(r.node.nodeId,flag)==='on',partial:flagState(r.node.nodeId,flag)==='partial'}" :aria-pressed="flagState(r.node.nodeId,flag)==='partial'?'mixed':flagState(r.node.nodeId,flag)==='on'" :data-export-rule="flag" :disabled="controlsLocked||!scope.effective.has(r.node.nodeId)||!hasRelation(r.node.nodeId,flag)" :title="flag==='includeParentBodies'?'包含所有祖先正文；部分状态表示有主动排除，点击恢复全部':'包含全部后代；部分状态表示有主动排除，点击恢复全部'" @click="toggleRule(r.node.nodeId,flag)">{{flagState(r.node.nodeId,flag)==='partial'?(flag==='includeParentBodies'?'部分父级':'部分子树'):(flag==='includeParentBodies'?'包含父级正文':'包含整个子树')}}</button>
       </div>
      </div>
     </template>
     <details v-else open class="exchange-tree-list"><summary>按完整路径选择挂载位置</summary><fieldset :disabled="controlsLocked"><legend class="sr-only">挂载位置</legend>
      <label><input type="radio" value="" v-model="mount" @change="invalidate"/>作为一级知识点</label>
      <label v-for="n in visibleNodes" :key="n.nodeId" :style="{paddingLeft:Math.min(depth(n.nodeId),8)*12+'px'}"><input type="radio" :value="n.nodeId" v-model="mount" @change="invalidate"/>{{n.name}}<small class="node-path">{{pathOf(n.nodeId)}}</small></label>
     </fieldset></details>

     </section>
     <button v-if="step==='preview'" :disabled="controlsLocked" @click="back">返回修改范围与内容</button>
     <fieldset :disabled="controlsLocked">
      <template v-if="mode==='import'">
       <p class="transfer-target">导入位置：{{mount?pathOf(mount):'新增一级知识点'}}</p>
       <div v-show="step==='select'" class="inline-actions"><button @click="stage('file')">选择 .md 文件</button><button @click="stage('clipboard')">读取剪贴板</button></div>
       <label v-show="step==='select'">粘贴 Markdown<textarea aria-label="粘贴 Markdown" v-model="text" @input="source=undefined;invalidate()"/></label><button v-show="step==='select'" :disabled="!text.trim()" @click="stage('text')">读取粘贴内容</button>
       <p v-if="source">{{source.name}} · {{source.bytes.toLocaleString()}} 字节</p>
       <section v-if="source?.format==='external'&&step==='select'"><p>选择要作为知识节点的标题；未选标题仍属于正文。</p><label v-for="h in headings" :key="h.line"><input type="checkbox" :value="h.line" v-model="headingLines" @change="invalidate"/>第 {{h.line}} 行 · {{'#'.repeat(h.depth)}} {{h.name}}</label></section>
       <button v-if="step==='select'" :disabled="!source" @click="makePreview">预览导入</button>
       <section v-if="preview&&step==='preview'"><p>目标：{{mount?pathOf(mount):'一级知识点'}} · 共 {{preview.total}} 项，已显示 {{rows.length}} 项。仅列出的路径受影响，未列出的节点不变。</p><p>新增 {{preview.created}} · 更新 {{preview.updated}} · 保留 {{preview.kept}} · 图片 {{preview.imageCount}}</p>
        <p v-if="preview.imageCount">图片将验证后写入；较大的内嵌图片可能不被外部编辑器支持。</p>
        <div v-for="r in rows" :key="r.key" class="import-row"><span>{{r.path.join(' › ')}}</span><select v-if="r.action!=='create'" :aria-label="'正文策略 '+r.path.join(' › ')" :value="policies[r.key]||'keep'" @change="changePolicy(r.key,$event)"><option value="keep">保留原正文</option><option value="replace">替换正文</option><option value="append">追加正文</option></select><span v-else>新增</span><small v-if="r.action!=='create'">完整路径冲突 · 原 {{r.beforeChars}} / 结果 {{r.afterChars}} 字符</small><button :aria-label="'查看正文与图片 '+r.path.join(' › ')" @click="showDiff(r.key)">查看正文与图片</button></div>
        <button v-if="preview.nextOffset!==null" @click="more">更多条目</button><button class="primary" @click="confirmImport">确认导入</button>
       </section>
      </template>
      <template v-else><p>范围：左右两侧已选 {{selected.length}} 个正文节点；未选的必要祖先只保留结构标题，正文为空。七级及更深层级使用 GankSoft v2 标记无损保存，标准标题显示最多六级；重新导入可恢复真实层级。</p><button v-if="step==='select'" :disabled="!selected.length" @click="makePreview">预览导出</button>
       <section v-if="exported&&step==='preview'"><p>{{exported.nodeCount}} 个结构节点（含必要祖先标题） / {{exported.bodyCount}} 个已选正文节点 · {{exported.imageCount}} 处图片 · {{exported.bytes.toLocaleString()}} 字节</p><p v-if="exported.imageCount">图片以内嵌 Base64 保存；部分外部编辑器可能不支持。</p><pre aria-label="实际导出 Markdown">{{exported.markdown}}</pre><p v-if="exported.truncated">预览已截断，复制和文件保存仍使用完整内容。</p><button @click="useExport(false)">复制 Markdown</button><button @click="useExport(true)">保存 .md 文件</button></section>
      </template>
     </fieldset>
     <section v-if="diff" aria-label="导入正文与图片预览"><h3>{{diff.path.join(' › ')}} · {{diff.action==='keep'?'保留原正文':diff.action==='replace'?'替换正文':diff.action==='append'?'追加正文':'新增'}}</h3>
      <h4>待导入正文（{{diff.incomingChars}} 字符）</h4><pre aria-label="待导入正文">{{diff.incoming||'（空正文）'}}</pre><p v-if="diff.incomingTruncated">待导入正文预览已截断；确认使用完整原文。</p>
      <p>图片引用 {{diff.images.length}} 处；正文中的 ganksoft-import-image 序号仅供预览。</p><ul aria-label="待导入图片引用"><li v-for="image in diff.images" :key="image.index">#{{image.index}} {{image.alt||'无替代文字'}} · {{image.mime}} · {{image.bytes}} 字节 · 宽 {{image.width}}%<small class="node-path">SHA-256 {{image.sha256}} · 标题 {{image.title??'（无）'}}</small></li></ul>
      <div class="md-diff"><div><h4>原正文</h4><pre aria-label="原正文">{{diff.before||'（空正文）'}}</pre></div><div><h4>策略执行后的正文</h4><pre aria-label="策略执行后的正文">{{diff.after||'（空正文）'}}</pre></div></div></section>
   <p v-if="error" role="alert" tabindex="-1">{{error}}</p><p v-if="notice" role="status">{{notice}}</p><button v-if="pending&&unknown" :disabled="busy" @click="confirmImport">核对原导入请求</button><button v-if="saved" :disabled="busy" @click="refreshSaved">重新读取已保存图谱</button>
     </div>
    </main>
   </div>
  </section></Teleport><p v-if="error&&!mode" role="alert">{{error}}</p>
 </span>
</template>
<style scoped>
.knowledge-md-actions{display:flex;gap:6px}.knowledge-md-actions>button{width:36px;height:36px}
.knowledge-md-exchange{box-sizing:border-box;position:fixed;inset:107px 0 0 213px;z-index:80;display:flex;flex-direction:column;gap:14px;padding:24px 32px;background:var(--bg,#f7f9f8);color:var(--text,#34483c);min-width:0;overflow:hidden;font-size:12px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex:none}h2{font-size:20px;margin:0}.transfer-breadcrumb{color:var(--muted,#87988e);margin:0 0 6px;font-size:11px}
.transfer-mode-tabs{display:flex;align-items:center;gap:4px;padding:8px 12px;border:1px solid var(--border,#e6eae8);background:var(--surface,#fff);border-radius:10px}.transfer-mode-tabs button{border:0;background:transparent}.transfer-mode-tabs .active{background:#e9f4ed;color:#2c705e}.transfer-mode-tabs span{margin-left:auto;color:#87988e;font-size:11px}
.md-exchange-columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(350px,1.1fr);flex:1;min-height:0;border:1px solid var(--border,#e6eae8);border-radius:12px;background:var(--surface,#fff);overflow:hidden}aside,main{min-width:0;min-height:0;display:flex;flex-direction:column}aside{border-right:1px solid var(--border,#e6eae8);padding:14px;gap:12px}aside h3{margin:0;font-size:13px}.md-exchange-columns .knowledge-exchange-map{flex:1;min-height:150px;height:auto}.transfer-map-hint{font-size:10px;color:#87988e;margin:0}.transfer-steps{display:flex;gap:16px;padding:15px;border-bottom:1px solid var(--border,#e6eae8);color:#93a198}.transfer-steps .active{color:#2c705e;font-weight:700}.transfer-right-scroll{overflow:auto;overscroll-behavior:contain;padding:14px 16px;min-height:0;flex:1}
p{line-height:1.65;margin:8px 0}button{font:inherit;cursor:pointer;min-height:30px;padding:6px 10px;border:1px solid var(--border-strong,#d2dad5);border-radius:7px;background:var(--surface,#fff);color:inherit}button.primary{background:var(--primary,#2c705e);color:#fff}.inline-actions{display:flex;gap:8px;flex-wrap:wrap}fieldset{border:0;padding:0;min-width:0}label{display:block;margin:8px 0}input{width:auto}input[type=search]{width:100%}textarea{display:block;box-sizing:border-box;width:100%;min-height:100px;height:140px;resize:vertical}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;overflow:auto;padding:12px;background:var(--bg,#f5f6f8);border-radius:8px}.node-path{display:block;overflow-wrap:anywhere;color:var(--muted,#65706b);font-size:10px}.import-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--border,#e6eae8)}.import-row>span:first-child{flex:1;overflow-wrap:anywhere}.md-diff{display:grid;grid-template-columns:1fr 1fr;gap:12px}.export-options,.exchange-tree-list{border-top:1px solid var(--border,#e6eae8);margin-top:12px;padding-top:10px}.exchange-tree-list summary{cursor:pointer}.exchange-tree-list fieldset{max-height:220px;overflow:auto}.transfer-target{padding:10px;background:#f1f7f3;border-radius:8px;overflow-wrap:anywhere}.knowledge-md-exchange [role=alert]{padding:12px;border:1px solid #b94f4b;border-radius:8px;color:#983b37;overflow-wrap:anywhere}.knowledge-md-exchange :focus-visible{outline:2px solid #438d69;outline-offset:2px}
@media(max-width:1100px){.knowledge-md-exchange{padding:20px 24px}.md-exchange-columns{grid-template-columns:minmax(0,.85fr) minmax(330px,1.15fr)}.transfer-mode-tabs span{display:none}}
@media(max-width:850px){.knowledge-md-exchange{left:62px;overflow:auto}.md-exchange-columns{display:flex;flex-direction:column;overflow:visible;flex:none}aside{height:340px;border-right:0;border-bottom:1px solid var(--border,#e6eae8)}main{min-height:400px}.transfer-right-scroll{overflow:visible}}
@media(max-width:610px){.knowledge-md-exchange{left:0;padding:18px 13px}.md-diff{grid-template-columns:1fr}}
.export-search{display:flex;align-items:end;gap:8px}.export-search label{flex:1;min-width:0;margin:0}.export-search button{flex:none}.export-search input{box-sizing:border-box;padding:7px;border:1px solid #d2dad5;border-radius:7px}.search-matches{max-height:140px;overflow:auto;display:flex;flex-direction:column}.search-matches button{text-align:left;overflow-wrap:anywhere}.locate-feedback{color:#8a5b28}.export-tree-list{margin:8px -8px;max-height:45vh;overflow:auto;overscroll-behavior:contain;border:1px solid #e0eae3;border-radius:8px}.export-node-row{display:grid;grid-template-columns:minmax(90px,1fr) 83px 83px;gap:4px;align-items:center;min-height:38px;padding:2px 5px;border-bottom:1px solid #edf1ee}.export-node-row.selected{background:#e6f3eb}.export-node-row.focused{box-shadow:inset 3px 0 #d29e3b}.export-node-row label{display:flex;align-items:center;gap:4px;margin:0;min-width:0;cursor:pointer}.export-node-row label span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.export-node-row input{flex:none;accent-color:#26765b}.export-condition{font-size:10px;padding:5px 2px;background:#eaf5ef;color:#287154;border-color:#dce8e0;white-space:nowrap}.export-condition.on{background:#24765b;color:white;border-color:#24765b}.export-condition.partial{background:#fff1d8;color:#946626;border-color:#e5b95a}.export-condition:disabled{background:#f4f5f4;color:#a5afa9;border-color:#ebeeec;cursor:not-allowed}
</style>
