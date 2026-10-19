<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
export interface WorkspaceTab {
  id: string;
  title: string;
  detail?: string;
}
const props = defineProps<{
  pages: WorkspaceTab[];
  activeId: string;
  homeTitle: string;
  multiple: boolean;
  showManager?: boolean;
}>();
const emit = defineEmits<{
  home: [];
  select: [id: string];
  close: [id: string];
  closeAll: [];
}>();
const open = ref(false),
  root = ref<HTMLElement>();
function dismiss(event?: Event) {
  if (
    !event ||
    !(event.target instanceof Node) ||
    !root.value?.contains(event.target)
  )
    open.value = false;
}
function key(event: KeyboardEvent) {
  if (event.key === "Escape") open.value = false;
}
watch(
  () => props.multiple,
  () => {
    if (!props.multiple) open.value = false;
  },
);
onMounted(() => {
  document.addEventListener("pointerdown", dismiss, true);
  window.addEventListener("keydown", key);
  window.addEventListener("blur", dismiss);
  document.addEventListener("scroll", dismiss, true);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", dismiss, true);
  window.removeEventListener("keydown", key);
  window.removeEventListener("blur", dismiss);
  document.removeEventListener("scroll", dismiss, true);
});
</script>
<template>
  <nav
    ref="root"
    class="page-bar"
    :class="{ 'workspace-pages': multiple }"
    aria-label="页面栏"
  >
    <button
      class="home-page"
      :class="{ active: !activeId }"
      aria-label="主页面"
      :title="homeTitle"
      @click="emit('home')"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
      </svg>
    </button>
    <span v-if="!multiple" class="page-bar-title">{{ homeTitle }}</span>
    <div
      v-else
      class="review-page-strip"
      role="tablist"
      aria-label="工作区页面"
    >
      <div
        v-for="t in pages"
        :key="t.id"
        class="review-page"
        :class="{ active: activeId === t.id }"
        :title="t.detail || t.title"
      >
        <button
          role="tab"
          :aria-selected="activeId === t.id"
          :aria-label="t.title"
          @click="emit('select', t.id)"
        >
          <span>{{ t.title }}</span>
        </button>
        <button
          class="close-page"
          :aria-label="'关闭页面 ' + t.title"
          @click="emit('close', t.id)"
        >
          ×
        </button>
      </div>
    </div>
    <button
      v-if="multiple && showManager !== false"
      class="page-manager-toggle"
      :aria-expanded="open"
      aria-label="页面管理"
      title="查看与管理当前模块页面"
      @click="open = !open"
    >
      ☷<span>{{ pages.length }}</span>
    </button>
    <section
      v-if="open && multiple && showManager !== false"
      class="page-manager panel"
      aria-label="页面管理列表"
    >
      <div class="section-head">
        <strong>页面 · {{ pages.length }}</strong
        ><button
          class="text-btn danger"
          :disabled="!pages.length"
          @click="emit('closeAll')"
        >
          全部关闭
        </button>
      </div>
      <p v-if="!pages.length" class="muted">打开的页面会保留在这里。</p>
      <div v-for="t in pages" :key="t.id" class="managed-page">
        <button @click="emit('select', t.id)">
          <strong>{{ t.title }}</strong
          ><small>{{ t.detail }}</small></button
        ><button
          :aria-label="'关闭页面 ' + t.title"
          @click="emit('close', t.id)"
        >
          ×
        </button>
      </div>
    </section>
  </nav>
</template>
