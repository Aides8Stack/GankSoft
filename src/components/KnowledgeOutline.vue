<script setup lang="ts">
import { ref,watch } from "vue";
export interface OutlineNode {
  id: string;
  topic: string;
  expanded?:boolean;
  children?: OutlineNode[];
}
const props=defineProps<{ node: OutlineNode; selected?: string }>();
const emit = defineEmits<{ select: [id: string]; open: [id: string]; expand:[id:string] }>();
const collapsed = ref(props.node.expanded===false);
watch(()=>props.node.expanded,value=>{collapsed.value=value===false;});
</script>
<template>
  <li>
    <div class="outline-node" :class="{ selected: node.id === selected }">
      <button
        v-if="node.children?.length"
        :aria-label="(collapsed ? '展开 ' : '收起 ') + node.topic"
        @click="collapsed = !collapsed;if(!collapsed)emit('expand',node.id)"
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
        @expand="emit('expand',$event)"
      />
    </ul>
  </li>
</template>
