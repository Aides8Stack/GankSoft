<script setup lang="ts">
import { computed } from 'vue';
import {
  reviewSeries,
  type QuantitativeReview,
  type ReviewMetric,
} from '../../shared/review-series';
const props = defineProps<{
  records: QuantitativeReview[];
  metric: ReviewMetric;
  title: string;
  selectedId: string;
  unified?: boolean;
}>();
const emit = defineEmits<{ select: [id: string] }>();
const series = computed(() =>
  reviewSeries(
    props.unified ? props.records.map((r) => ({ ...r, contentVersion: undefined })) : props.records,
    props.metric,
  ),
);
const unit = computed(() => (props.metric === 'selfScore' ? '分' : '秒'));
const label = (p: QuantitativeReview & { value: number | null }) =>
  `第 ${p.ordinal} 次 · ${new Date(p.createdAt).toLocaleString('zh-CN')} · ${p.value ?? '未记录'} ${unit.value} · ${p.effective ? '有效复盘' : '练习／巩固'}`;
function selectNearest(event: MouseEvent) {
  const svg = event.currentTarget as SVGSVGElement;
  const transform = svg.getScreenCTM();
  if (!transform) return;
  const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
  const points = series.value.points.filter((p) => p.y !== null);
  const nearest = points.reduce<(typeof points)[number] | undefined>(
    (best, p) =>
      !best ||
      Math.hypot(p.x - cursor.x, p.y! - cursor.y) <
        Math.hypot(best.x - cursor.x, best.y! - cursor.y)
        ? p
        : best,
    undefined,
  );
  if (nearest) emit('select', nearest.id);
}
</script>
<template>
  <section class="analytics-chart" :aria-label="title">
    <h3>
      {{ title }} <small class="muted">{{ unit }}</small>
    </h3>
    <svg
      v-if="series.hasValues"
      viewBox="0 0 700 250"
      @click="selectNearest"
      role="group"
      :aria-label="title + '，横轴为复盘次序，点击数据点查看记录'"
    >
      <g v-for="tick in series.ticks" :key="tick">
        <line
          x1="50"
          :y1="210 - (tick / series.ceiling) * 180"
          x2="655"
          :y2="210 - (tick / series.ceiling) * 180"
          stroke="#dce3dc"
        />
        <text x="5" :y="214 - (tick / series.ceiling) * 180">{{ Number(tick.toFixed(1)) }}</text>
      </g>
      <line
        v-for="(s, i) in series.segments"
        :key="i"
        :x1="s.a.x"
        :y1="s.a.y!"
        :x2="s.b.x"
        :y2="s.b.y!"
        stroke="#3b7564"
        stroke-width="2"
      />
      <template v-for="p in series.points" :key="p.id">
        <g
          v-if="p.y !== null"
          role="button"
          tabindex="0"
          :aria-label="label(p)"
          :aria-pressed="selectedId === p.id"
          class="review-chart-point"
          @keydown.enter.prevent="emit('select', p.id)"
          @keydown.space.prevent="emit('select', p.id)"
        >
          <circle :cx="p.x" :cy="p.y" r="12" fill="transparent" />
          <circle
            :cx="p.x"
            :cy="p.y"
            :r="selectedId === p.id ? 7 : 5"
            :fill="p.effective ? (p.correct === false ? '#c5684d' : '#3b7564') : '#fff'"
            :stroke="p.effective ? '#3b7564' : '#8c927d'"
            stroke-width="2"
          />
          <title>{{ label(p) }}</title>
        </g>
      </template>
      <text x="50" y="240">第 {{ records[0]?.ordinal }} 次</text>
      <text x="555" y="240">第 {{ records.at(-1)?.ordinal }} 次</text>
    </svg>
    <p v-else class="muted">
      暂无已记录的{{ metric === 'selfScore' ? '自评分' : '做题时间' }}，缺失数据不会按零补齐。
    </p>
  </section>
</template>
