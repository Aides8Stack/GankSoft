<script setup lang="ts">
import { ref } from "vue";
export interface OutlineNode {
  id: string;
  topic: string;
  children?: OutlineNode[];
}
defineProps<{ node: OutlineNode; selected?: string }>();
const emit = defineEmits<{ select: [id: string]; open: [id: string] }>();
const collapsed = ref(false);
</script>
<template>
  <li>
    <div class="outline-node" :class="{ selected: node.id === selected }">
      <button
        v-if="node.children?.length"
        :aria-label="(collapsed ? '展开 ' : '收起 ') + node.topic"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? "▸" : "▾" }}</button
      ><span v-else class="outline-spacer"></span
      ><button
        @click="emit('select', node.id)"
        @dblclick="emit('open', node.id)"
      >
        {{ node.topic }}
      </button>
    </div>
    <ul v-if="!collapsed">
      <KnowledgeOutline
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected="selected"
        @select="emit('select', $event)"
        @open="emit('open', $event)"
      />
    </ul>
  </li>
</template>
