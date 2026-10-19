<script setup lang="ts">
import { computed, ref } from "vue";
import { liveDecks, liveFolders, moduleFilter } from "../store";
const props = defineProps<{ parentId?: string | null; depth?: number }>();
const emit = defineEmits<{
  open: [id: string];
  manage: [id: string];
  menu: [kind: string, id: string, event: MouseEvent];
}>();
const folders = computed(() =>
  liveFolders.value.filter((f) => f.parent_id === (props.parentId ?? null)),
);
const decks = computed(() =>
  liveDecks.value.filter((d) => d.folder_id === (props.parentId ?? null)),
);
const folded = ref<string[]>([]);
function toggle(id: string) {
  folded.value = folded.value.includes(id)
    ? folded.value.filter((v) => v !== id)
    : [...folded.value, id];
}
</script>
<template>
  <div class="folder-tree">
    <template v-for="f in folders" :key="f.id"
      ><button
        class="tree-row"
        :style="{ paddingLeft: 12 + (depth ?? 0) * 14 + 'px' }"
        @click="toggle(f.id)"
        @contextmenu.prevent.stop="emit('menu', 'folder', f.id, $event)"
      >
        <span>{{ folded.includes(f.id) ? "▸" : "▾" }}</span
        ><span class="folder-symbol">▱</span
        ><span class="tree-label">{{ f.name }}</span></button
      ><FolderTree
        v-if="!folded.includes(f.id)"
        :parent-id="f.id"
        :depth="(depth ?? 0) + 1"
        @open="emit('open', $event)"
        @manage="emit('manage', $event)"
        @menu="(k, id, e) => emit('menu', k, id, e)"
    /></template>
    <div
      v-for="d in decks"
      :key="d.id"
      class="tree-row"
      :class="{ chosen: moduleFilter === d.id }"
      :style="{ paddingLeft: 26 + (depth ?? 0) * 14 + 'px' }"
      role="button"
      tabindex="0"
      @keydown.enter="emit('open', d.id)"
      @keydown.space.prevent="emit('open', d.id)"
      @click="emit('open', d.id)"
      @contextmenu.prevent.stop="emit('menu', 'deck', d.id, $event)"
    >
      <span :class="['deck-symbol', d.kind]">{{
        d.kind === "memory" ? "▣" : "▤"
      }}</span
      ><span class="tree-label">{{ d.name }}</span
      ><button
        class="tree-more"
        :aria-label="'管理卡片集 ' + d.name"
        title="管理卡片集"
        @click.stop="emit('manage', d.id)"
      >
        ⋯
      </button>
    </div>
  </div>
</template>
