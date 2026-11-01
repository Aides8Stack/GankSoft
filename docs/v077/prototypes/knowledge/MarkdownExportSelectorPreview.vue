<script setup lang="ts">
/**
 * GankSoft v0.7.7 — design prototype ONLY. No IPC, database or ZIP exports.
 * Left graph and right tree share one effective selection set.
 * Explicit selection, inherited rules and manual exclusions are tracked separately.
 */
import {computed,nextTick,ref} from 'vue';
import GankKnowledgeGraphCanvas from './GankKnowledgeGraphCanvas.vue';
import type {KnowledgeNode} from './knowledge-preview-types';

const props=defineProps<{nodes:KnowledgeNode[]}>();
type Flag='parent'|'subtree';
type Rules=Record<string,{parent:boolean;subtree:boolean}>;
const explicit=ref<Set<string>>(new Set(['a','a1','b3']));
const rules=ref<Rules>({a:{parent:false,subtree:true},a1:{parent:true,subtree:false}});
const excluded=ref<Set<string>>(new Set());
const focused=ref<string|null>(null);
const query=ref(''),previewOpen=ref(false),feedback=ref('');
const rightPane=ref<HTMLElement>();
const graph=ref<InstanceType<typeof GankKnowledgeGraphCanvas>>();

const byId=computed(()=>new Map(props.nodes.map(n=>[n.id,n])));
const rows=computed(()=>{
 const result:{node:KnowledgeNode;depth:number}[]=[],visited=new Set<string>();
 const walk=(parentId:string|null,depth:number)=>{
  for(const n of props.nodes.filter(x=>x.parentId===parentId)){
   if(visited.has(n.id))continue;
   visited.add(n.id);
   if(n.id!=='root')result.push({node:n,depth:Math.max(0,depth-1)});
   walk(n.id,depth+1);
  }
 };
 walk(null,0);
 for(const n of props.nodes)if(!visited.has(n.id)&&n.id!=='root')result.push({node:n,depth:0});
 return result;
});
function ancestors(id:string){
 const ans:string[]=[],seen=new Set<string>([id]);let n=byId.value.get(id);
 while(n?.parentId&&!seen.has(n.parentId)){
  const pid=n.parentId;seen.add(pid);if(pid!=='root')ans.push(pid);n=byId.value.get(pid);
 }
 return ans;
}
function descendants(id:string){
 const out:string[]=[],seen=new Set([id]),stack=[id];
 while(stack.length){const parent=stack.pop()!;
  for(const n of props.nodes.filter(x=>x.parentId===parent)){
   if(seen.has(n.id))continue;seen.add(n.id);out.push(n.id);stack.push(n.id);
  }
 }
 return out;
}
function includedIds(id:string,flag:Flag){return flag==='parent'?ancestors(id):descendants(id);}
function hasRelation(id:string,flag:Flag){return includedIds(id,flag).length>0;}
const effective=computed(()=>{
 const included=new Set(explicit.value);
 for(const [id,rule] of Object.entries(rules.value)){
  // Every rule belongs to an explicit source node, not a merely incidental ancestor.
  if(!explicit.value.has(id))continue;
  if(rule.parent)for(const pid of ancestors(id))included.add(pid);
  if(rule.subtree)for(const cid of descendants(id))included.add(cid);
 }
 for(const id of excluded.value)included.delete(id);
 return included;
});
function active(id:string,flag:Flag){return !!rules.value[id]?.[flag];}
function isPartial(id:string,flag:Flag){return active(id,flag)&&includedIds(id,flag).some(x=>!effective.value.has(x));}
function toggleFlag(id:string,flag:Flag){
 if(!effective.value.has(id)||!hasRelation(id,flag))return;
 const old=rules.value[id]??{parent:false,subtree:false},partial=isPartial(id,flag);
 if(!old[flag]||partial){
  const next=new Set(explicit.value);next.add(id);explicit.value=next;
  const ex=new Set(excluded.value);
  for(const affected of includedIds(id,flag))ex.delete(affected);
  ex.delete(id);excluded.value=ex;
  rules.value={...rules.value,[id]:{...old,[flag]:true}};
 }else{
  rules.value={...rules.value,[id]:{...old,[flag]:false}};
 }
 previewOpen.value=false;
}
function toggleNode(id:string,origin:'graph'|'list'){
 if(id==='root')return;
 const prev=new Set(effective.value),next=new Set(explicit.value),ex=new Set(excluded.value);
 if(prev.has(id)){
  next.delete(id);ex.add(id);
  // Removing a rule-bearing source must not accidentally clear unrelated selections.
  const own=rules.value[id];
  if(own?.parent||own?.subtree){
   const otherRules={...rules.value,[id]:{parent:false,subtree:false}};
   rules.value=otherRules;
   // Freeze old remaining effective selections explicitly if this user unchecks the source.
   for(const other of prev)if(other!==id)next.add(other);
  }
 }else{next.add(id);ex.delete(id);}
 explicit.value=next;excluded.value=ex;
 previewOpen.value=false;
 if(origin==='graph'){void focusRight(id);}else focusGraph(id);
}
function focusGraph(id:string){focused.value=id;void graph.value?.focus(id);}
async function focusRight(id:string){focused.value=id;await nextTick();rightPane.value?.querySelector<HTMLElement>('[data-right-id="'+id+'"]')?.scrollIntoView({behavior:'smooth',block:'center'});}
function path(id:string){const parts:string[]=[],seen=new Set<string>();let n=byId.value.get(id);while(n&&!seen.has(n.id)){seen.add(n.id);if(n.id!=='root')parts.unshift(n.name);n=n.parentId?byId.value.get(n.parentId):undefined;}return parts.join(' / ');}
function locate(){
 const text=query.value.trim().toLocaleLowerCase('zh-CN');
 if(!text){feedback.value='请输入知识点名称';return;}
 const n=rows.value.find(x=>x.node.name.toLocaleLowerCase('zh-CN').includes(text)||path(x.node.id).toLocaleLowerCase('zh-CN').includes(text))?.node;
 if(!n){feedback.value='知识点不存在';return;}
 feedback.value='已定位：'+path(n.id);focusGraph(n.id);void focusRight(n.id);
 // Search never selects knowledge points.
}
function reset(){
 explicit.value=new Set();rules.value={};excluded.value=new Set();previewOpen.value=false;focused.value=null;feedback.value='';
}
const markdownPreview=computed(()=>{
 return rows.value.filter(x=>effective.value.has(x.node.id))
  .map(x=>'#'.repeat(Math.min(x.depth+1,6))+' '+x.node.name+'\n'+'（示意：该节点完整正文将由正式 Schema606 服务导出）').join('\n\n');
});
</script>
<template>
 <section class="exchange-preview">
  <header class="exchange-header"><div><h2>导出知识 Markdown</h2><p>双向选择：左图谱 ↔ 右侧按层级逐行选择 · 仅 Vue 预览</p></div><span class="preview-tag">不写入数据库 · 不生成 ZIP</span></header>
  <div class="exchange-columns">
   <section class="graph-section">
    <div class="column-head"><strong>选择导出节点</strong><small>单击选中 / 再次单击取消</small></div>
    <div class="graph-surface"><GankKnowledgeGraphCanvas ref="graph" :nodes="nodes" :selected-ids="[...effective]" :focused-id="focused" :disabled-ids="['root']" @toggle="(id)=>toggleNode(id,'graph')"/></div>
    <div class="graph-footer">图谱中的绿色节点与右侧已勾选知识点保持完全一致。</div>
   </section>
   <section class="tree-section">
    <div class="column-head"><strong>导出知识点</strong><small>已选 {{effective.size}} / {{rows.length}} 个</small></div>
    <div class="row-head"><span>知识点（按层级缩进）</span><span>包含父级</span><span>包含整个子树</span></div>
    <div ref="rightPane" class="tree-scroll">
     <div v-for="r in rows" :key="r.node.id" :data-right-id="r.node.id"
          class="knowledge-row" :class="{selected:effective.has(r.node.id),focused:focused===r.node.id,derived:effective.has(r.node.id)&&!explicit.has(r.node.id)}">
      <label class="node-label" :style="{paddingLeft:(8+Math.min(r.depth,8)*15)+'px'}" :title="path(r.node.id)">
       <input type="checkbox" :checked="effective.has(r.node.id)" @change="toggleNode(r.node.id,'list')"/>
       <span>{{r.node.name}}</span>
      </label>
      <button type="button" class="condition" :class="{on:active(r.node.id,'parent')&&!isPartial(r.node.id,'parent'),partial:isPartial(r.node.id,'parent')}"
              :disabled="!effective.has(r.node.id)||!hasRelation(r.node.id,'parent')" :aria-pressed="active(r.node.id,'parent')"
              :title="hasRelation(r.node.id,'parent')?'包含此节点所有父级的正文':'没有可包含的父知识点'"
              @click="toggleFlag(r.node.id,'parent')">{{isPartial(r.node.id,'parent')?'部分父级':'包含父级'}}</button>
      <button type="button" class="condition" :class="{on:active(r.node.id,'subtree')&&!isPartial(r.node.id,'subtree'),partial:isPartial(r.node.id,'subtree')}"
              :disabled="!effective.has(r.node.id)||!hasRelation(r.node.id,'subtree')" :aria-pressed="active(r.node.id,'subtree')"
              :title="hasRelation(r.node.id,'subtree')?'包含此节点下全部子孙知识点':'该知识点没有下级'"
              @click="toggleFlag(r.node.id,'subtree')">{{isPartial(r.node.id,'subtree')?'部分子树':'整个子树'}}</button>
     </div>
    </div>
    <form class="search" @submit.prevent="locate"><input v-model="query" aria-label="搜索知识点并定位" placeholder="搜索知识点名称或路径"/><button type="submit">定位</button></form>
    <p v-if="feedback" class="feedback" role="status">{{feedback}}</p>
    <div class="actions"><span>直接选择 {{explicit.size}} 项 · 实际选中 {{effective.size}} 项</span>
      <button type="button" @click="reset">清除选择</button>
      <button type="button" class="primary" @click="previewOpen=true">预览导出范围</button>
    </div>
   </section>
  </div>
  <div v-if="previewOpen" class="overlay" @click.self="previewOpen=false">
   <article class="preview-dialog" role="dialog" aria-label="Markdown导出内容范围预览">
    <h3>Markdown 内容范围预览（模拟）</h3>
    <p>实际生产导出需要后端逐节点父级/子树规则协议，当前不会生成文件。</p>
    <pre>{{markdownPreview||'尚未选择知识点'}}</pre>
    <button type="button" @click="previewOpen=false">返回调整</button>
   </article>
  </div>
 </section>
</template>
<style scoped>
.exchange-preview{height:min(700px,83vh);min-height:460px;display:flex;flex-direction:column;background:#fff;border:1px solid #d8e6dc;border-radius:12px;overflow:hidden;font:12px/1.5 "Microsoft YaHei",sans-serif;color:#395447}
.exchange-header{height:62px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 18px;border-bottom:1px solid #e4ede6;flex:none}
.exchange-header h2{font-size:17px;margin:0}.exchange-header p{margin:1px 0;color:#799082;font-size:11px}.preview-tag{color:#608973;background:#eef6ef;border-radius:7px;padding:5px 10px;font-size:10px;white-space:nowrap}
.exchange-columns{display:grid;grid-template-columns:minmax(260px,1.2fr) minmax(330px,1fr);flex:1;min-height:0}.graph-section,.tree-section{min-width:0;min-height:0;display:flex;flex-direction:column}.graph-section{border-right:1px solid #e1eae4}
.column-head{height:43px;display:flex;align-items:center;justify-content:space-between;gap:5px;padding:0 13px;border-bottom:1px solid #e0eae3;flex:none}.column-head small{font-size:10px;color:#89988e}
.graph-surface{flex:1;min-height:0;overflow:hidden}.graph-footer{padding:8px 12px;font-size:10px;color:#789083;border-top:1px solid #e5eee8}
.row-head,.knowledge-row{display:grid;grid-template-columns:minmax(100px,1fr) 86px 94px;gap:6px;align-items:center}.row-head{height:35px;color:#85968b;background:#f8faf8;padding:0 8px;border-bottom:1px solid #e5ebe7;font-size:10px;flex:none}.row-head span:nth-child(n+2){text-align:center}
.tree-scroll{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain}.knowledge-row{min-height:36px;padding:0 8px;border-bottom:1px solid #ecf0ed}.knowledge-row.selected{background:#eaf5ed}.knowledge-row.focused{box-shadow:inset 3px 0 #d29e3b}.knowledge-row.derived{background:#f0f7f1}
.node-label{display:flex;align-items:center;gap:6px;min-width:0;cursor:pointer;font-size:11px}.node-label span{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.node-label input{accent-color:#26765b;cursor:pointer;flex:none}
.condition{font-size:10px;border:1px solid #dce8e0;border-radius:7px;background:#eaf5ef;color:#287154;padding:5px 3px;cursor:pointer;white-space:nowrap}
.condition.on{background:#24765b;color:white;border-color:#24765b;font-weight:650}.condition.partial{background:#fff1d8;color:#946626;border-color:#e5b95a}
.condition:disabled{background:#f7f8f7;color:#b8c0ba;border-color:#f0f2f0;cursor:not-allowed;opacity:.95}
.search{display:flex;gap:8px;padding:8px;border-top:1px solid #e3ece5;flex:none}.search input{flex:1;min-width:0;border:1px solid #d9e4dd;border-radius:7px;padding:7px 9px;font-size:12px}.search button,.actions button{border:1px solid #d0e1d5;border-radius:7px;background:#fff;padding:7px 10px;color:#286b51;cursor:pointer}.feedback{margin:0;padding:0 9px 5px;color:#54846a;font-size:10px}
.actions{border-top:1px solid #e4ede6;padding:9px;display:flex;align-items:center;gap:8px;flex:none}.actions span{flex:1;color:#74877b;font-size:10px}.actions button.primary{background:#2a7558;color:#fff;border-color:#2a7558}
.overlay{position:fixed;inset:0;z-index:130;background:#152d247c;display:grid;place-items:center;padding:16px}.preview-dialog{width:min(680px,92vw);max-height:86vh;background:white;border-radius:13px;padding:18px;display:flex;flex-direction:column}.preview-dialog h3{margin:0}.preview-dialog pre{overflow:auto;max-height:55vh;min-height:140px;padding:14px;background:#f4faf5;white-space:pre-wrap}.preview-dialog button{align-self:end;border:1px solid #ccdfd2;border-radius:7px;background:white;padding:7px 12px;cursor:pointer}
@media(max-width:810px){.exchange-columns{grid-template-columns:minmax(190px,1fr) minmax(285px,1fr)}.row-head,.knowledge-row{grid-template-columns:minmax(95px,1fr) 76px 85px;gap:3px}.condition{font-size:9px}}
</style>
