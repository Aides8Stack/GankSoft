<script setup lang="ts">
import { computed,onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import type { EditorDocument } from "../../shared/editor/document";
import type { EditorMediaAdapter } from "./media-adapter";
import type { MarkdownEditorHandle } from "./milkdown-adapter";
import { SaveController, type DocumentAdapter } from "./save-controller";
import CardImageTools from '../components/CardImageTools.vue';
const props = defineProps<{
  resourceDeckId?:string;
  externalSave?: boolean;
  initial: EditorDocument;
  revision: number;
  documentAdapter: DocumentAdapter;
  mediaAdapter: EditorMediaAdapter;
}>();
const emit = defineEmits<{
  changed: [document: EditorDocument];
  requestSave: [];
  saveState: [state: string];
  failure: [message: string];
  disposed: [unsaved: EditorDocument | null];
}>();
const root = ref<HTMLElement>();
const handle = shallowRef<MarkdownEditorHandle>();
const placements = ref<{ placementId: string; width: number }[]>([]),
  selectedColor = ref("#b91c1c");
const imageAssets=computed(()=>{if(!placements.value.length)return [];try{const doc=handle.value?.snapshot();return doc?.assets.filter(a=>doc.markdown.includes('gank-asset://'+a.id))??[];}catch{return [];}});
const state = ref("clean"),
  message = ref(""),
  loaded = ref(false);
let disposed = false,
  composing = false;
const saves = new SaveController(
  props.initial,
  props.revision,
  props.documentAdapter,
  () => {
    state.value = saves.state;
    message.value = saves.error;
    emit("saveState", saves.state);
  },
);
function widthChange(id: string, value: number) {
  try {
    handle.value?.setWidth(id, value);
  } catch (e) {
    failure(String(e));
  }
}
function colorChange() {
  try {
    handle.value?.setColor(selectedColor.value);
  } catch (e) {
    failure(String(e));
  }
}
function failure(text: string) {
  saves.invalidate(text);
  message.value = text;
  emit("failure", text);
}
async function save() {
  if (composing) return;
  if (props.externalSave) {
    try {
      if (handle.value) emit("changed", handle.value.snapshot());
    } catch (e) {
      failure(String(e));
      return;
    }
    emit("requestSave");
    return;
  }
  if (handle.value) {
    try {
      // Native transactions are synchronous; markdownUpdated can arrive after
      // a navigation click. Capture edits now, but never normalize an untouched
      // document merely because its owner is closing or changing views.
      if (handle.value.hasChanges()) saves.change(handle.value.snapshot());
      await saves.flush();
    } catch (e) {
      failure(String(e));
    }
  }
}
function keys(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (!event.isComposing && !composing) void save();
  }
}
function compositionStart() {
  composing = true;
  saves.suspend();
}
function compositionEnd() {
  composing = false;
  setTimeout(() => {
    if (disposed) return;
    try {
      if (handle.value && !props.externalSave)
        saves.change(handle.value.snapshot());
    } catch (e) {
      failure(String(e));
    }
    saves.resume();
  }, 0);
}
onMounted(async () => {
  try {
    const { createMarkdownEditor } = await import("./milkdown-adapter");
    if (disposed) return;
    const editor = await createMarkdownEditor(
      root.value!,
      props.initial,
      props.mediaAdapter,
      (doc) => {
        if (!props.externalSave) saves.change(doc);
        placements.value = handle.value?.placements() ?? [];
        emit("changed", doc);
      },
      failure,
    );
    if (disposed) {
      await editor.destroy();
      return;
    }
    handle.value = editor;
    placements.value = editor.placements();
    loaded.value = true;
  } catch (e) {
    if (!disposed) failure(String(e));
  }
});
onBeforeUnmount(() => {
  disposed = true;
  emit("disposed", saves.state === "clean" ? null : saves.snapshot());
  saves.dispose();
  void handle.value?.destroy();
});
function isClean() {
  if (!loaded.value || composing || saves.state !== 'clean' || !handle.value) return false;
  try {
    return !handle.value.hasChanges() || JSON.stringify(handle.value.snapshot()) === JSON.stringify(saves.snapshot());
  } catch {
    return false; // A failed snapshot must block navigation; save() reports it.
  }
}
defineExpose({ handle, saves, save, isClean });
</script>
<template>
  <section
    class="gank-editor"
    @keydown="keys"
    @compositionstart="compositionStart"
    @compositionend="compositionEnd"
    :aria-busy="!loaded"
  >
    <div class="editor-focus-toolbar" role="toolbar" aria-label="正文格式">
      <label
        >文字颜色
        <input
          type="color"
          v-model="selectedColor"
          aria-label="文字颜色"
          @input="colorChange"
      /></label>
      <button
        v-if="!externalSave"
        type="button"
        title="保存（Ctrl+S）"
        @click="save"
      >
        保存
      </button>
    </div>
    <div ref="root" class="editor-body"></div>
    <CardImageTools v-if="resourceDeckId&&loaded&&imageAssets.length>0" :deck-id="resourceDeckId" :images="imageAssets" :locate="id=>handle?.focusImage(id)" :insert="a=>handle?.reinsertImage(a,80)"/>
    <div
      v-for="(placement, index) in placements"
      :key="placement.placementId"
      class="editor-image-size"
    >
      <label
        >图片 {{ index + 1 }} 宽度（%）<input
          type="number"
          min="1"
          max="100"
          :value="placement.width"
          :aria-label="`图片 ${index + 1} 宽度`"
          @change="
            widthChange(
              placement.placementId,
              Number(($event.target as HTMLInputElement).value),
            )
          "
      /></label>
    </div>
    <output v-if="!externalSave" aria-live="polite" :data-save-state="state">{{
      state === "clean"
        ? "已保存"
        : state === "saving"
          ? "保存中"
          : state === "dirty"
            ? "未保存"
            : "保存失败，内容仍在编辑器中"
    }}</output>
    <p v-if="message" role="alert">{{ message }}</p>
  </section>
</template>
<style>
.gank-editor {
  border: 1px solid #d6dce4;
  border-radius: 10px;
  background: white;
  position: relative;
  margin: 16px 0;
  color: #172033;
}
.editor-focus-toolbar {
  display: flex;
  gap: 8px;
  opacity: 0;
  pointer-events: none;
  padding: 6px 12px;
  border-bottom: 1px solid #edf0f4;
}
.gank-editor:focus-within .editor-focus-toolbar {
  opacity: 1;
  pointer-events: auto;
}
.editor-focus-toolbar button {
  font: inherit;
  padding: 4px 8px;
}
.gank-editor .milkdown {
  width: 100%;
}
.gank-editor .milkdown .ProseMirror {
  min-height: 180px;
  padding: 24px 32px;
  overflow: visible;
  outline: none;
}
.gank-editor .milkdown img[data-gank-placement] {
  display: inline-block;
  max-width: 100%;
  vertical-align: middle;
}
.gank-editor output,
.gank-editor [role="alert"] {
  display: block;
  margin: 8px 12px;
  font-size: 13px;
}
.gank-editor [role="alert"] {
  color: #b91c1c;
}
</style>
