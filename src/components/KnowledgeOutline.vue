<script setup lang="ts">
import { computed,ref,watch } from "vue";
export interface OutlineNode {
  id: string;
  topic: string;
  expanded?:boolean;
  children?: OutlineNode[];
}
const props=defineProps<{ node: OutlineNode; selected?: string; depth?: number }>();
const emit = defineEmits<{ select: [id: string]; open: [id: string]; expand:[id:string] }>();
const collapsed = ref(props.node.expanded===false);
watch(()=>props.node.expanded,value=>{collapsed.value=value===false;});
const depth=computed(()=>props.depth??0);
function containsSelected(node:OutlineNode):boolean{return node.id===props.selected||(node.children??[]).some(containsSelected);}
watch(()=>props.selected,()=>{if(props.node.id!==props.selected&&containsSelected(props.node))collapsed.value=false;},{immediate:true});
</script>
<template>
  <li>
    <div class="outline-node" :class="{ selected: node.id === selected,'root-row':depth===0 }" :style="{'--nav-depth':Math.min(depth,12)}" :data-outline-nav="node.id" :data-depth="depth">
      <button
        v-if="node.children?.length"
        :aria-label="(collapsed ? '展开 ' : '收起 ') + node.topic"
        :aria-expanded="!collapsed"
        class="outline-fold"
        @click="collapsed = !collapsed;if(!collapsed)emit('expand',node.id)"
      >
        {{ collapsed ? "▸" : "▾" }}</button
      ><span v-else class="outline-spacer"></span
      ><button
        class="outline-label"
        :aria-current="node.id === selected?'true':undefined"
        :title="node.topic"
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
        :depth="depth+1"
        @select="emit('select', $event)"
        @open="emit('open', $event)"
        @expand="emit('expand',$event)"
      />
    </ul>
  </li>
</template>
<style scoped>
.outline-node{display:flex;align-items:center;gap:2px;min-width:0;min-height:33px;margin:0;padding:2px 4px 2px calc(6px + var(--nav-depth)*18px);border-radius:7px;color:#5c7466;position:relative}
.outline-node:not(.root-row):before{content:"";position:absolute;width:1px;top:0;bottom:0;left:calc(12px + (var(--nav-depth) - 1)*18px);background:#dfebe2}
.root-row{margin-top:6px;font-weight:700}
.outline-node.selected{background:#e4f2e9;color:#186347;box-shadow:inset 3px 0 0 #3f8967}
.outline-node:hover{background:#f2f8f3}
.outline-fold,.outline-spacer{width:21px;height:25px;display:inline-grid;place-items:center;flex:none;border:0;background:transparent;color:#7c9b87;padding:0;min-height:0}
.outline-label{flex:1;min-width:0;min-height:0;display:flex;justify-content:flex-start;border:0;background:transparent;color:inherit;text-align:left;padding:5px;font-size:11.8px;white-space:normal;overflow-wrap:anywhere}
.outline-fold:focus-visible,.outline-label:focus-visible{outline:2px solid #6faa8a;outline-offset:1px}
ul{list-style:none;margin:0;padding:0}
</style>
