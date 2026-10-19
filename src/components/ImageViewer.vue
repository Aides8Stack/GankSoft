<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { assetUrl } from "../store";
const props = defineProps<{ assetId?: string; src?: string }>(),
  emit = defineEmits<{ close: [] }>();
const rotation = ref(0),
  scale = ref(1),
  naturalWidth = ref(800),
  fit = ref(true),
  source = computed(() => props.src || assetUrl(props.assetId!));
function key(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.stopImmediatePropagation();
    emit("close");
  }
}
onMounted(() => window.addEventListener("keydown", key, true));
onBeforeUnmount(() => window.removeEventListener("keydown", key, true));
</script>
<template>
  <div
    class="modal-backdrop image-backdrop"
    @click.self="emit('close')"
    role="dialog"
    aria-modal="true"
    aria-label="图片查看器"
  >
    <section class="image-viewer">
      <div class="image-tools">
        <button
          type="button"
          class="btn"
          @click="
            fit = false;
            scale = Math.max(0.25, scale - 0.25);
          "
        >
          缩小</button
        ><button
          type="button"
          class="btn"
          @click="
            fit = false;
            scale = Math.min(5, scale + 0.25);
          "
        >
          放大</button
        ><button
          type="button"
          class="btn"
          @click="
            fit = false;
            scale = 1;
            rotation = 0;
          "
        >
          原始大小</button
        ><button
          type="button"
          class="btn"
          @click="
            fit = true;
            rotation = 0;
          "
        >
          适应窗口</button
        ><button
          type="button"
          class="btn"
          @click="rotation = (rotation + 90) % 360"
        >
          旋转查看</button
        ><button type="button" class="btn" @click="emit('close')">关闭</button>
      </div>
      <div class="image-scroll">
        <img
          :src="source"
          alt="图片细节"
          @load="
            naturalWidth = ($event.target as HTMLImageElement).naturalWidth
          "
          :style="{
            width: fit ? 'auto' : naturalWidth * scale + 'px',
            maxWidth: fit ? '100%' : 'none',
            maxHeight: fit ? '72vh' : 'none',
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }"
        />
      </div>
    </section>
  </div>
</template>
