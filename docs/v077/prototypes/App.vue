<script setup lang="ts">
import {computed,ref} from 'vue';
import CatalogManagementPreview from './catalog/CatalogManagementPreview.vue';
import FilterKnowledgePickerPreview from './knowledge/FilterKnowledgePickerPreview.vue';
import MarkdownExportSelectorPreview from './knowledge/MarkdownExportSelectorPreview.vue';
import type {KnowledgeNode} from './knowledge/knowledge-preview-types';

// Unified, small, synthetic single tree shared by both knowledge previews.
const nodes:KnowledgeNode[]=[
 {id:'root',name:'知识图谱',parentId:null},
 {id:'a',name:'资料分析',parentId:'root'},
 {id:'a1',name:'增长率',parentId:'a'},
 {id:'a11',name:'同比增长',parentId:'a1'},
 {id:'a12',name:'环比增长',parentId:'a1'},
 {id:'a2',name:'比重',parentId:'a'},
 {id:'a3',name:'平均数',parentId:'a'},
 {id:'b',name:'判断推理',parentId:'root'},
 {id:'b1',name:'图形推理',parentId:'b'},
 {id:'b2',name:'类比推理',parentId:'b'},
 {id:'b3',name:'位置规律',parentId:'b'},
 {id:'b31',name:'平移',parentId:'b3'},
 {id:'b32',name:'旋转',parentId:'b3'},
 {id:'b4',name:'数量规律',parentId:'b'},
 {id:'c',name:'言语理解',parentId:'root'},
 {id:'c1',name:'片段阅读',parentId:'c'},
 {id:'c11',name:'主旨概括',parentId:'c1'},
 {id:'c2',name:'逻辑填空',parentId:'c'},
];
type Tab='catalog'|'filter'|'export';
const tab=ref<Tab>('catalog');
const pickerOpen=ref(false);
const chosen=ref<string[]>(['a1']);
const applied=ref<string[]>([]);
const activeTab=computed(()=>({
 catalog:'卡片集目录管理',filter:'筛选学习 · 知识点选择弹窗',export:'Markdown 导出 · 左右联动'
}[tab.value]));
function confirmPicker(ids:string[]){chosen.value=[...ids];pickerOpen.value=false;}
function applyKnowledge(){applied.value=[...chosen.value];}
const label=(id:string)=>nodes.find(n=>n.id===id)?.name??id;
</script>
<template>
 <div class="preview-shell">
  <header class="app-head">
   <div><h1>GankSoft v0.7.7 · Vue 交互预览</h1><p>需求原型，不调用 SQLite、Electron IPC 或生产业务 API</p></div>
   <span class="draft-status">仅设计 · 待正式实现</span>
  </header>
  <nav class="preview-tabs" aria-label="预览模块">
   <button :class="{selected:tab==='catalog'}" @click="tab='catalog'">卡片集管理</button>
   <button :class="{selected:tab==='filter'}" @click="tab='filter'">筛选知识点</button>
   <button :class="{selected:tab==='export'}" @click="tab='export'">Markdown 导出</button>
  </nav>
  <main>
   <div class="module-meta"><strong>{{activeTab}}</strong><span>本预览的数据完全是内存模拟，关闭页面即消失</span></div>
   <CatalogManagementPreview v-if="tab==='catalog'"/>
   <section v-if="tab==='filter'" class="filter-page">
    <div class="filter-panel">
     <h2>筛选学习</h2>
     <p>点击「选择知识点」打开图谱窗口；单击节点切换选择，搜索只定位，可选择整棵子树。</p>
     <div class="toolbar">
      <button @click="pickerOpen=true">◈ 选择知识点</button>
      <button class="primary" @click="applyKnowledge">应用知识点</button>
     </div>
     <div class="chosen-list"><strong>待应用的知识点</strong><span v-if="!chosen.length">尚未选择</span>
      <span v-for="id in chosen" :key="id" class="chip">{{label(id)}}</span>
     </div>
     <div class="chosen-list"><strong>当前生效的筛选</strong><span v-if="!applied.length">尚未应用（选择弹窗的“确认”不会自动应用）</span>
      <span v-for="id in applied" :key="id" class="chip applied">{{label(id)}}</span>
     </div>
    </div>
    <FilterKnowledgePickerPreview :open="pickerOpen" :nodes="nodes" :selected-ids="chosen"
      deck-name="记忆积累" @confirm="confirmPicker" @cancel="pickerOpen=false"/>
   </section>
   <MarkdownExportSelectorPreview v-if="tab==='export'" :nodes="nodes"/>
  </main>
  <footer class="app-foot">
   <span>设计规范：docs/v077/requirements/ · 原型：docs/v077/prototypes/</span>
   <span>不会生成真正卡片集 ZIP，也不会删除或写入真实卡片</span>
  </footer>
 </div>
</template>
<style scoped>
.preview-shell{max-width:1500px;margin:auto;min-height:100vh;background:#f5f8f6;color:#2b4536;font:13px/1.55 "Segoe UI","Microsoft YaHei",sans-serif}
.app-head{display:flex;gap:16px;align-items:center;justify-content:space-between;padding:16px 25px;background:#fff;border-bottom:1px solid #dfeae2}
.app-head h1{font-size:17px;margin:0}.app-head p{color:#809185;font-size:11px;margin:4px 0 0}.draft-status{border-radius:12px;background:#eef5ee;padding:6px 12px;color:#397557;font-size:11px}
.preview-tabs{background:#fff;display:flex;gap:6px;padding:7px 22px;border-bottom:1px solid #dce7e0}
.preview-tabs button{border:0;background:transparent;padding:9px 18px;border-radius:7px;cursor:pointer;color:#496a58}
.preview-tabs button.selected{background:#e1f0e5;color:#176c48;font-weight:700}
main{padding:18px 22px;min-height:650px}.module-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:12px}.module-meta span{color:#8da194;font-size:11px}
.filter-page{min-height:660px}.filter-panel{min-height:375px;background:#fff;border-radius:11px;border:1px solid #dce8df;padding:28px}.filter-panel h2{margin:0 0 8px;font-size:21px}.filter-panel p{color:#728579}
.toolbar{display:flex;gap:10px}.toolbar button{background:#fff;border:1px solid #cadae0;border-radius:8px;padding:9px 18px;cursor:pointer}.toolbar button.primary{background:#267658;color:#fff;border-color:#267658}
.chosen-list{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:18px 4px;border-bottom:1px solid #edf2ee}.chosen-list strong{min-width:116px;font-size:12px}.chosen-list>span:not(.chip){color:#87988b;font-size:11px}
.chip{background:#e7f4e9;border:1px solid #bad6c2;border-radius:14px;color:#2c7756;padding:4px 10px;font-size:11px}.chip.applied{background:#d1eadd}
.app-foot{display:flex;justify-content:space-between;gap:8px;color:#8b9d8f;padding:16px 24px;font-size:10px}
@media(max-width:700px){main{padding:10px}.module-meta span,.app-foot span:last-child{display:none}.app-head{padding:12px}.preview-tabs button{padding:8px}}
</style>
