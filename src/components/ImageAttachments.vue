<script setup lang="ts">
import { computed, ref } from "vue";
import { services } from "../services";
import { task, assetUrl } from "../store";
import ImageViewer from "./ImageViewer.vue";
export interface EditableImage {
  id: string;
  role?: string;
  draft?: boolean;
}
const props = defineProps<{
    deckId: string;
    purpose: "question" | "analysis" | "response";
    readonly?: boolean;
  }>(),
  model = defineModel<EditableImage[]>({ required: true });
const busy = ref(false),
  view = ref(""),
  width = ref(360),
  images = computed(() =>
    model.value.filter((i) => !i.role || i.role === props.purpose),
  );
function url(a: EditableImage) {
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
      model.value = [
        ...model.value,
        ...result
          .slice(0, 20 - images.value.length)
          .map((a) => ({ id: a.id, role: props.purpose, draft: true })),
      ];
  } finally {
    busy.value = false;
  }
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
    tabindex="0"
    :aria-label="purpose === 'response' ? '本次作答图片' : '图片编辑区'"
  >
    <div class="inline-actions">
      <strong>{{
        purpose === "question"
          ? "题目图片"
          : purpose === "analysis"
            ? "解析图片"
            : "本次作答图片"
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
    <label v-if="images.length" class="image-size-control"
      >显示宽度 {{ width }}px
      <input type="range" min="180" max="900" step="20" v-model.number="width"
    /></label>
    <div class="editable-image-list">
      <figure v-for="a in images" :key="a.id" :style="{ width: width + 'px' }">
        <button type="button" class="image-button" @click="view = url(a)">
          <img :src="url(a)" alt="图片预览，点击查看细节" /></button
        ><button
          v-if="!readonly"
          type="button"
          class="text-btn danger"
          :disabled="busy"
          @click="model = model.filter((i) => i.id !== a.id)"
        >
          删除此图片
        </button>
      </figure>
    </div>
    <ImageViewer v-if="view" :src="view" @close="view = ''" />
  </section>
</template>
