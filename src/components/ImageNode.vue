<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { imageLayout, resizedWidth, defaultImageEdit, imagePresentation, type ImageEdit, type ImageLayout } from "../../shared/image-node";
const props = defineProps<{ src: string; layout?: ImageLayout; readonly?: boolean; alt?: string }>();
const emit = defineEmits<{ change: [layout: ImageLayout]; preview: [] }>();
const previewFailed = ref(false);
watch(() => props.src, () => { previewFailed.value = false; });
const previewSrc = computed(() => !previewFailed.value && props.src.startsWith("app-media:") && !props.layout?.edit ? props.src + (props.src.includes("?") ? "&" : "?") + "thumbnail=1" : props.src);
const selected = ref(false), dragWidth = ref<number | null>(null);
const layout = computed(() => imageLayout(props.layout));
const natural = ref({ width: 1, height: 1 });
const edit = computed(() => layout.value.edit ?? defaultImageEdit());
const presentation = computed(() => imagePresentation(natural.value.width, natural.value.height, edit.value));
const crop = ref({ x: 0, y: 0, width: 100, height: 100 }), editError = ref(""), annotation = ref("");
watch(() => layout.value.edit?.crop, value => { const c = value ?? defaultImageEdit().crop; crop.value = { x: c.x * 100, y: c.y * 100, width: c.width * 100, height: c.height * 100 }; }, { immediate: true });
function changeEdit(change: Partial<ImageEdit>) { update({ edit: { ...edit.value, ...change } }); }
function applyCrop() {
  try {
    const c = crop.value;
    const result = imageLayout({ ...layout.value, edit: { ...edit.value, crop: { x: c.x / 100, y: c.y / 100, width: c.width / 100, height: c.height / 100 } } });
    editError.value = ""; emit("change", result);
  } catch { editError.value = "裁剪范围须在原图内，宽高至少为1%。"; }
}
function addAnnotation() {
  if (!annotation.value.trim() || edit.value.annotations.length >= 20) return;
  changeEdit({ annotations: [...edit.value.annotations, { text: annotation.value.trim().slice(0, 120), x: 0.05, y: Math.min(0.9, 0.15 + edit.value.annotations.length * 0.08), color: "#d32f2f" }] });
  annotation.value = "";
}
function loaded(event: Event) { const img = event.target as HTMLImageElement; natural.value = { width: img.naturalWidth, height: img.naturalHeight }; }
const width = computed(() => dragWidth.value ?? layout.value.widthPx);
const style = computed(() => ({ width: width.value + "px", maxWidth: "100%",
  marginLeft: layout.value.alignment === "left" ? "0" : "auto",
  marginRight: layout.value.alignment === "right" ? "0" : "auto" }));
function update(change: Partial<ImageLayout>) { if (!props.readonly) emit("change", imageLayout({ ...layout.value, ...change })); }
function setWidth(event: Event) {
  const input = event.target as HTMLInputElement;
  const value = Number(input.value);
  if (Number.isFinite(value) && input.value !== "") update({ widthPx: resizedWidth(value, 0) });
  input.value = String(layout.value.widthPx);
}
function resize(event: PointerEvent, corner: string) {
  if (props.readonly || event.button !== 0) return;
  event.preventDefault(); event.stopPropagation(); selected.value = true;
  const button = event.currentTarget as HTMLElement, start = event.clientX, initial = layout.value.widthPx;
  button.setPointerCapture(event.pointerId);
  const move = (e: PointerEvent) => { dragWidth.value = resizedWidth(initial, (e.clientX - start) * (corner.includes("left") ? -1 : 1)); };
  const finish = (e: PointerEvent) => {
    const final = dragWidth.value; dragWidth.value = null;
    button.removeEventListener("pointermove", move); button.removeEventListener("pointerup", finish); button.removeEventListener("pointercancel", finish);
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    if (e.type !== "pointercancel" && final !== null) update({ widthPx: final });
  };
  button.addEventListener("pointermove", move); button.addEventListener("pointerup", finish); button.addEventListener("pointercancel", finish);
}
</script>
<template>
  <div class="media-node-row">
    <figure class="media-node" :class="{ selected: selected && !readonly }" :style="style" @click="selected = true">
      <div class="media-node-frame">
        <button class="image-button media-node-preview" type="button" :aria-label="alt || '查看图片'" @click="readonly && emit('preview')" @dblclick="emit('preview')">
          <img :src="previewSrc" :alt="alt || '图片，双击查看原图'" :class="{ 'media-source-probe': !!layout.edit }" :style="{ objectFit: layout.fit }" draggable="false" @load="loaded" @error="previewFailed = true" />
          <svg v-if="layout.edit" class="media-edited-image" :viewBox="`0 0 ${presentation.width} ${presentation.height}`" role="img" :aria-label="alt || '已编辑图片'" overflow="hidden">
            <image :href="src" :width="natural.width" :height="natural.height" :transform="presentation.transform" />
            <text v-for="(note, index) in edit.annotations" :key="index" :x="note.x * presentation.width" :y="note.y * presentation.height" :fill="note.color" :font-size="presentation.width / 24" stroke="white" :stroke-width="presentation.width / 600" paint-order="stroke">{{ note.text }}</text>
          </svg>
        </button>
        <template v-if="selected && !readonly">
          <button v-for="corner in ['top-left', 'top-right', 'bottom-left', 'bottom-right']" :key="corner" type="button" class="media-resize-handle" :class="corner" :aria-label="'等比例调整图片：' + corner" @pointerdown="resize($event, corner)" @keydown.left.prevent="update({ widthPx: resizedWidth(width, -10) })" @keydown.right.prevent="update({ widthPx: resizedWidth(width, 10) })" />
        </template>
      </div>
      <div v-if="selected && !readonly" class="media-node-controls" @click.stop>
        <label>宽度 <input type="number" min="64" max="2400" step="1" :value="layout.widthPx" aria-label="此图片宽度" @change="setWidth" /> px</label>
        <select :value="layout.alignment" aria-label="此图片对齐" @change="update({ alignment: ($event.target as HTMLSelectElement).value as ImageLayout['alignment'] })"><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option></select>
        <button type="button" class="text-btn" @click="emit('preview')">查看原图</button>
        <button type="button" class="text-btn" @click="changeEdit({ rotation: ((edit.rotation + 90) % 360) as ImageEdit['rotation'] })">旋转90°</button>
        <button type="button" class="text-btn" @click="changeEdit({ flipX: !edit.flipX })">水平翻转</button>
        <button type="button" class="text-btn" @click="changeEdit({ flipY: !edit.flipY })">垂直翻转</button>
        <details><summary>裁剪与批注</summary>
          <p class="muted">按原图百分比裁剪；批注位于最终画面。查看原图不应用编辑。</p>
          <label v-for="(label, field) in { x: '裁剪左边', y: '裁剪上边', width: '裁剪宽度', height: '裁剪高度' }" :key="field">{{ label }} % <input v-model.number="crop[field]" type="number" min="0" max="100" :aria-label="label" /></label>
          <button type="button" class="text-btn" @click="applyCrop">应用裁剪</button>
          <p v-if="editError" role="alert">{{ editError }}</p>
          <label>文字批注<input v-model="annotation" maxlength="120" aria-label="图片文字批注" /></label>
          <button type="button" class="text-btn" :disabled="!annotation.trim() || edit.annotations.length >= 20" @click="addAnnotation">添加批注</button>
          <button type="button" class="text-btn" @click="changeEdit({ annotations: [] })">清除批注</button>
          <button type="button" class="text-btn" @click="update({ edit: undefined })">恢复原始画面</button>
        </details>
      </div>
    </figure>
  </div>
</template>
<style scoped>
.media-edited-image { display: block; width: 100%; height: auto; overflow: hidden; }.media-source-probe { position: absolute; width: 1px !important; height: 1px !important; opacity: 0; pointer-events: none; }
.media-node-row { width: 100%; min-width: 0; }
.media-node { box-sizing: border-box; margin-top: 10px; margin-bottom: 10px; min-width: 0; }
.media-node-frame { position: relative; min-width: 0; }
.media-node-preview { display: block; width: 100%; max-width: 100%; padding: 0; }
.media-node-preview img { display: block; width: 100%; max-width: 100%; height: auto; }
.selected .media-node-frame { outline: 2px solid var(--accent, #22825f); outline-offset: 2px; }
.media-resize-handle { position: absolute; width: 12px; height: 12px; border: 2px solid white; border-radius: 3px; background: var(--accent, #22825f); padding: 0; touch-action: none; z-index: 1; }
.top-left { top: -5px; left: -5px; cursor: nwse-resize; }.top-right { top: -5px; right: -5px; cursor: nesw-resize; }.bottom-left { bottom: -5px; left: -5px; cursor: nesw-resize; }.bottom-right { bottom: -5px; right: -5px; cursor: nwse-resize; }
.media-node-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }
.media-node-controls label { display: flex; align-items: center; gap: 4px; }.media-node-controls input { width: 80px; }.media-node-controls select { width: auto; }
</style>
