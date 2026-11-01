<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { ViewNode } from '../../shared/knowledge-view';
import KnowledgeMarkdownPanel from './KnowledgeMarkdownPanel.vue';

const props = defineProps<{
  roots: ViewNode[];
  deckId: string;
  selected?: string;
  revisions: Map<string, number>;
}>();
const emit = defineEmits<{ select: [id: string] }>();
const documentRoot = ref<HTMLElement>();
const closedBodies = ref(new Set<string>());
// Presentation only: traverse the same view used by Mind Elixir. No tree writes,
// copied domain objects, or alternate parent/identity model.
const groups = computed(() => props.roots.map(root => {
  const rows: { node: ViewNode; depth: number; path: string }[] = [];
  function walk(node: ViewNode, depth: number, parents: string[]) {
    const path = [...parents, node.topic];
    rows.push({ node, depth, path: path.join(' / ') });
    for (const child of node.children ?? []) walk(child, depth + 1, path);
  }
  walk(root, 1, []);
  return { id: root.id, rows };
}));
function isOpen(id: string) { return !closedBodies.value.has(id); }
function toggleBody(id: string) {
  if (closedBodies.value.has(id)) closedBodies.value.delete(id);
  else closedBodies.value.add(id);
}
function setAll(open: boolean) {
  closedBodies.value = open ? new Set() : new Set(groups.value.flatMap(g => g.rows.map(r => r.node.id)));
}
async function reveal() {
  if(props.selected) closedBodies.value.delete(props.selected);
  await nextTick();
  const entries = documentRoot.value?.querySelectorAll<HTMLElement>('[data-outline-entry]');
  const entry = Array.from(entries ?? []).find(el => el.dataset.outlineEntry === props.selected);
  entry?.scrollIntoView({ block: 'start' });
}
watch(() => props.selected, reveal, { immediate: true });
const readonlySaved = async () => {};
defineExpose({reveal,setAll});
</script>

<template>
  <main ref="documentRoot" class="outline-body" aria-label="知识点 Markdown 文档">
    <div class="outline-document-tip">标题按知识点父子关系分级。点击标题编辑正文；其他知识点默认全文只读，右侧目录可定位。</div>
    <div v-for="group in groups" :key="group.id" class="knowledge-outline-root">
      <section v-for="{ node, depth, path } in group.rows" :key="node.id" class="knowledge-document-module" :data-outline-entry="node.id" :data-depth="depth" :style="{ '--depth': Math.min(depth, 8) }">
        <template v-if="!node.id.startsWith('gank-lazy:')">
          <div class="knowledge-document-heading" :class="{ selected: node.id === selected }">
            <button class="outline-node-title" :title="path" :aria-current="node.id === selected ? 'true' : undefined" @click="emit('select', node.id)">
              <span class="outline-mark" aria-hidden="true">{{ depth <= 6 ? '#'.repeat(depth) : 'L' + depth }}</span><strong>{{ node.topic }}</strong>
            </button>
            <button class="outline-fold-body" :aria-label="(isOpen(node.id) ? '收起正文 ' : '展开正文 ') + node.topic" :aria-expanded="isOpen(node.id)" @click="toggleBody(node.id)">{{ isOpen(node.id) ? '▾' : '▸' }}</button>
          </div>
          <!-- Hiding the active module must not dispose its unsaved editor. -->
          <div v-if="node.id === selected" v-show="isOpen(node.id)" class="knowledge-document-body active-body"><slot /></div>
          <div v-else-if="isOpen(node.id)" class="knowledge-document-body">
            <span class="outline-readonly-label">只读预览</span>
            <KnowledgeMarkdownPanel :key="node.id + ':' + revisions.get(node.id)" readonly lazy :deck-id="deckId" :node-id="node.id" :on-saved="readonlySaved" />
            <button class="text-btn" @click="emit('select', node.id)">编辑此知识点</button>
          </div>
        </template>
        <button v-else class="text-btn" @click="emit('select', node.id)">{{ node.topic }}</button>
      </section>
    </div>
    <p v-if="!groups.length">创建知识点后查看文档大纲。</p>
  </main>
</template>

<style scoped>
.outline-document-tip{font-size:11px;color:#7b8d83;background:#f5f8f5;border:1px solid var(--line,#dfe7e1);border-radius:8px;padding:12px 14px;margin-bottom:14px}
.knowledge-outline-root{margin-bottom:12px;border:1px solid var(--line,#dfe7e1);border-radius:8px;overflow:hidden;background:#fff}
.knowledge-document-module{border-bottom:1px solid #edf1ee;scroll-margin-top:14px;min-width:0}
.knowledge-document-module:last-child{border-bottom:0}
.knowledge-document-heading{display:flex;align-items:center;gap:10px;padding:9px 12px 9px calc(10px + (var(--depth) - 1)*23px);min-height:43px}
.knowledge-document-heading.selected{background:#e9f4ed}
.outline-node-title{min-width:0;min-height:0;flex:1;border:0;background:transparent;display:flex;align-items:center;justify-content:flex-start;gap:8px;padding:0;text-align:left;font-size:12px;color:#2b503c}
.outline-node-title strong{overflow-wrap:anywhere}
.outline-mark{flex:none;color:#98a99d;font:11px Consolas,monospace}
.outline-fold-body{flex:none;border:0;background:transparent;color:#629075;padding:3px 6px;min-height:26px}
.knowledge-document-body{margin:0 18px 12px calc(22px + (var(--depth) - 1)*23px);background:#f8faf9;border:1px solid #e4ede7;border-radius:8px;padding:12px 14px;line-height:1.7;min-width:0;overflow-wrap:anywhere}
.active-body{padding:0;background:#fff}
.outline-readonly-label{font-size:10px;color:#7b8d83}
.knowledge-document-body :deep(.gank-content){overflow:visible}
.knowledge-document-body :deep(.milkdown-table-block){overflow-x:auto}
.outline-node-title:focus-visible,.outline-fold-body:focus-visible{outline:2px solid #6faa8a;outline-offset:2px}
@media(max-width:1000px){.knowledge-document-heading{padding-left:calc(8px + (var(--depth) - 1)*14px)}.knowledge-document-body{margin-left:calc(12px + (var(--depth) - 1)*14px);margin-right:10px;padding:6px}.active-body{padding:0}}
</style>
