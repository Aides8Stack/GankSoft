<script setup lang="ts">
import { computed, ref } from "vue";
import { imageLayout, resizedWidth, type ImageLayout } from "../../shared/image-node";
const props = defineProps<{ src: string; layout?: ImageLayout; readonly?: boolean; alt?: string }>();
const emit = defineEmits<{ change: [layout: ImageLayout]; preview: [] }>();
const selected = ref(false), dragWidth = ref<number | null>(null);
const layout = computed(() => imageLayout(props.layout));
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
          <img :src="src" :alt="alt || '图片，双击查看原图'" :style="{ objectFit: layout.fit }" draggable="false" />
        </button>
        <template v-if="selected && !readonly">
          <button v-for="corner in ['top-left', 'top-right', 'bottom-left', 'bottom-right']" :key="corner" type="button" class="media-resize-handle" :class="corner" :aria-label="'等比例调整图片：' + corner" @pointerdown="resize($event, corner)" @keydown.left.prevent="update({ widthPx: resizedWidth(width, -10) })" @keydown.right.prevent="update({ widthPx: resizedWidth(width, 10) })" />
        </template>
      </div>
      <div v-if="selected && !readonly" class="media-node-controls" @click.stop>
        <label>宽度 <input type="number" min="64" max="2400" step="1" :value="layout.widthPx" aria-label="此图片宽度" @change="setWidth" /> px</label>
        <select :value="layout.alignment" aria-label="此图片对齐" @change="update({ alignment: ($event.target as HTMLSelectElement).value as ImageLayout['alignment'] })"><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option></select>
        <button type="button" class="text-btn" @click="emit('preview')">查看原图</button>
      </div>
    </figure>
  </div>
</template>
<style scoped>
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
