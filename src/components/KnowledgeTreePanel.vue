<script setup lang="ts">
import { computed, ref } from "vue";
import type { Knowledge } from "../../shared/types";
import {
  knowledgeGroups,
  toggleKnowledgeSelection,
} from "../../shared/study-query";
const props = defineProps<{
  nodes: Knowledge[];
  counts: Map<string, number>;
  includeChildren: boolean;
}>();
const model = defineModel<string[]>({ required: true }),
  search = ref(""),
  collapsed = ref<string[]>([]);
const rows = computed(() => {
  const result: { node: Knowledge; depth: number }[] = [],
    seen = new Set<string>(),
    q = search.value.trim().toLowerCase(),
    visible = new Set(
      props.nodes
        .filter((k) => (k.name + " " + k.aliases).toLowerCase().includes(q))
        .map((k) => k.id),
    );
  if (q) {
    let n = -1;
    while (n !== visible.size) {
      n = visible.size;
      for (const k of props.nodes)
        if (visible.has(k.id) && k.parent_id) visible.add(k.parent_id);
    }
  }
  function visit(parent: string | null, depth: number) {
    for (const node of props.nodes.filter(
      (k) => k.parent_id === parent && !seen.has(k.id),
    )) {
      seen.add(node.id);
      if (!q || visible.has(node.id)) result.push({ node, depth });
      if (q || !collapsed.value.includes(node.id)) visit(node.id, depth + 1);
    }
  }
  visit(null, 0);
  return result;
});
const covered = computed(
  () =>
    new Set(
      knowledgeGroups(model.value, props.nodes, props.includeChildren).flatMap(
        (g) => [...g],
      ),
    ),
);
function toggle(id: string) {
  model.value = toggleKnowledgeSelection(
    model.value,
    id,
    props.nodes,
    props.includeChildren,
  );
}
function partial(id: string) {
  const ids = [...knowledgeGroups([id], props.nodes, props.includeChildren)[0]],
    n = ids.filter((k) => covered.value.has(k)).length;
  return n > 0 && n < ids.length;
}
</script>
<template>
  <section aria-label="知识点选择" class="knowledge-tree-panel">
    <div class="section-head">
      <strong>知识点选择</strong><small>已选 {{ model.length }}</small>
    </div>
    <input v-model="search" aria-label="搜索知识点" placeholder="搜索知识点" />
    <div class="knowledge-tree-rows" role="tree" aria-label="当前集知识点树">
      <div
        v-for="{ node, depth } in rows"
        :key="node.id"
        class="knowledge-tree-row"
        role="treeitem"
        :aria-level="depth + 1"
        :aria-checked="partial(node.id) ? 'mixed' : covered.has(node.id)"
        :style="{ paddingLeft: depth * 14 + 'px' }"
      >
        <button
          class="text-btn"
          :aria-label="'展开或折叠 ' + node.name"
          @click="
            collapsed = collapsed.includes(node.id)
              ? collapsed.filter((id) => id !== node.id)
              : [...collapsed, node.id]
          "
        >
          {{
            nodes.some((k) => k.parent_id === node.id)
              ? collapsed.includes(node.id)
                ? "▸"
                : "▾"
              : "·"
          }}</button
        ><label
          ><input
            type="checkbox"
            :checked="covered.has(node.id)"
            :indeterminate="partial(node.id)"
            @change="toggle(node.id)"
          /><span :title="node.name">{{ node.name }}</span
          ><small>{{ counts.get(node.id) || 0 }}</small></label
        >
      </div>
      <p v-if="!rows.length" class="muted">没有匹配的知识点</p>
    </div>
    <button class="text-btn" @click="model = []">清空知识点选择</button>
  </section>
</template>
