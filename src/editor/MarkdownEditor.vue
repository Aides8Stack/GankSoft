<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import type { EditorDocument } from "../../shared/editor/document";
import type { EditorMediaAdapter } from "./media-adapter";
import type { MarkdownEditorHandle } from "./milkdown-adapter";
import { SaveController, type DocumentAdapter } from "./save-controller";
const props = defineProps<{
  initial: EditorDocument;
  revision: number;
  documentAdapter: DocumentAdapter;
  mediaAdapter: EditorMediaAdapter;
}>();
const emit = defineEmits<{
  changed: [document: EditorDocument];
  saveState: [state: string];
  failure: [message: string];
  disposed: [unsaved: EditorDocument | null];
}>();
const root = ref<HTMLElement>();
const handle = shallowRef<MarkdownEditorHandle>();
const placements = ref<{ placementId: string; width: number }[]>([]),
  selectedColor = ref("#b91c1c");
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
  if (handle.value) {
    try {
      saves.change(handle.value.snapshot());
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
      if (handle.value) saves.change(handle.value.snapshot());
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
        saves.change(doc);
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
defineExpose({ handle, saves, save });
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
      <button type="button" title="保存（Ctrl+S）" @click="save">保存</button>
    </div>
    <div ref="root" class="editor-body"></div>
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
    <output aria-live="polite" :data-save-state="state">{{
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
