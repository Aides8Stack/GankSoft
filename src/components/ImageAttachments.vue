<script setup lang="ts">
import { computed, ref } from "vue";
import { services } from "../services";
import { task, assetUrl } from "../store";
import ImageViewer from "./ImageViewer.vue";
import ImageNode from "./ImageNode.vue";
import { imageLayout, type ImageLayout, type ImageRole } from "../../shared/image-node";
export interface EditableImage {
  id: string;
  role?: string;
  draft?: boolean;
  replacementId?: string;
  layout?: ImageLayout;
}
const props = defineProps<{
    deckId: string;
    purpose: ImageRole | "response";
    readonly?: boolean;
    label?: string;
    resolveUrl?: (image: EditableImage) => string;
  }>(),
  model = defineModel<EditableImage[]>({ required: true });
const busy = ref(false),
  view = ref(""),
  images = computed(() =>
    model.value.filter((i) => !i.role || i.role === props.purpose),
  );
const undo = ref<EditableImage[][]>([]), redo = ref<EditableImage[][]>([]);
const clone = (value: EditableImage[]) => JSON.parse(JSON.stringify(value)) as EditableImage[];
function commit(value: EditableImage[]) {
  if (props.readonly) return;
  undo.value = [...undo.value.slice(-49), clone(images.value)]; redo.value = [];
  model.value = value;
}
function history(direction: "undo" | "redo") {
  if (props.readonly) return;
  const from = direction === "undo" ? undo : redo, to = direction === "undo" ? redo : undo;
  const previous = from.value.at(-1); if (!previous) return;
  to.value = [...to.value, clone(images.value)]; from.value = from.value.slice(0, -1);
  model.value = [...model.value.filter(i => i.role && i.role !== props.purpose), ...clone(previous)];
}
function change(id: string, layout: ImageLayout) { commit(model.value.map(i => i.id === id ? { ...i, layout } : i)); }
function keydown(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z" || props.readonly) return;
  if ((event.target as HTMLElement).matches("input,textarea")) return;
  event.preventDefault(); history(event.shiftKey ? "redo" : "undo");
}
function url(a: EditableImage) {
  if (props.resolveUrl) return props.resolveUrl(a);
  if (a.replacementId) return `app-media://draft/${a.replacementId}`;
  return a.draft || props.purpose === "response"
    ? `app-media://draft/${a.id}`
    : assetUrl(a.id);
}
async function add(source: "file" | "clipboard") {
  if (busy.value || props.readonly || images.value.length >= 20) return;
  busy.value = true;
  try {
    const result = await task(() =>
      services.media.stage(props.deckId, props.purpose, source),
    );
    if (result)
      commit([
        ...model.value,
        ...result
          .slice(0, 20 - images.value.length)
          .map((a) => ({ id: a.id, role: props.purpose, draft: true, layout: imageLayout() })),
      ]);
  } finally {
    busy.value = false;
  }
}
async function replace(a: EditableImage) {
  if (busy.value || props.readonly) return;
  busy.value = true;
  try {
    const result = await task(() => services.media.stage(props.deckId, props.purpose, "file"));
    if (result?.[0]) commit(model.value.map(i => i.id !== a.id ? i :
      (i.draft || props.purpose === "response" ? { ...i, id: result[0].id, draft: true } : { ...i, replacementId: result[0].id })));
  } finally { busy.value = false; }
}
function paste(e: ClipboardEvent) {
  if (
    Array.from(e.clipboardData?.items ?? []).some((i) =>
      i.type.startsWith("image/"),
    )
  ) {
    e.preventDefault();
    void add("clipboard");
  }
}
</script>
<template>
  <section
    class="image-editor"
    @paste="paste"
    @keydown="keydown"
    tabindex="0"
    :aria-label="purpose === 'response' ? '本次作答图片' : '图片编辑区'"
  >
    <div class="inline-actions">
      <strong>{{
        label ?? (purpose === "question"
          ? "题目图片"
          : purpose === "analysis"
            ? "解析图片"
            : "本次作答图片")
      }}</strong
      ><template v-if="!readonly"
        ><button
          type="button"
          class="btn"
          :disabled="busy"
          @click="add('file')"
        >
          ＋ 导入图片</button
        ><button
          type="button"
          class="btn"
          :disabled="busy"
          @click="add('clipboard')"
        >
          粘贴图片
        </button></template
      >
    </div>
    <p v-if="!readonly" class="muted">
      截图后点击粘贴，或聚焦此区域按 Ctrl+V。图片随当前表单保存，原图不压缩。
    </p>
    <div v-if="!readonly" class="inline-actions"><button type="button" class="text-btn" :disabled="!undo.length" @click="history('undo')">撤销</button><button type="button" class="text-btn" :disabled="!redo.length" @click="history('redo')">重做</button><span class="muted">单击图片调整尺寸与对齐；双击查看原图。</span></div>
    <div class="editable-image-list">
      <div v-for="a in images" :key="a.id" class="media-attachment">
        <ImageNode :src="url(a)" :layout="a.layout" :readonly="readonly" @change="change(a.id, $event)" @preview="view = url(a)" />
        <button v-if="!readonly" type="button" class="text-btn" :disabled="busy" @click="replace(a)">替换素材（保留布局）</button>
        <button
          v-if="!readonly"
          type="button"
          class="text-btn danger"
          :disabled="busy"
          @click="commit(model.filter((i) => i.id !== a.id))"
        >
          删除此图片
        </button>
      </div>
    </div>
    <ImageViewer v-if="view" :src="view" @close="view = ''" />
  </section>
</template>
<style scoped>
.editable-image-list { display: block; min-width: 0; }.media-attachment { width: 100%; min-width: 0; }
</style>
