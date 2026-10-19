<script setup lang="ts">
const props = defineProps<{ correct: boolean }>();
const score = defineModel<number | null | undefined>({ required: true });
</script>
<template>
  <section class="self-assessment" aria-label="本次作答自评">
    <div class="section-head">
      <label for="self-score">本次自评分</label
      ><output for="self-score">{{ score == null ? '未记录' : Number(score).toFixed(1) }} <small>/ 10</small></output>
    </div>
    <input
      id="self-score"
      type="range"
      :min="props.correct ? 6 : 0"
      :max="props.correct ? 10 : 5.9"
      step="0.1"
      v-model.number="score"
      :aria-valuetext="score == null ? '尚未自评' : Number(score).toFixed(1) + ' 分'"
      aria-describedby="self-score-hint"
    />
    <div class="slider-labels">
      <span>{{ props.correct ? '6.0 · 勉强完成' : '0.0 · 完全不会' }}</span
      ><span>{{ props.correct ? '10.0 · 独立熟练' : '5.9 · 接近掌握但本次答错' }}</span>
    </div>
    <p id="self-score-hint" class="footnote">
      {{ props.correct ? '答对可选 6.0—10.0 分' : '答错可选 0.0—5.9 分' }}，步进 0.1
      分。请按展开解析前的真实表现调整；自评分是下次排期的参考之一。
    </p>
  </section>
</template>
