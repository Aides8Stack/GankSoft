<script setup lang="ts">
import type { DateSelectionInput } from "../../shared/workspace-contracts";
import { validDateRange } from "../../shared/date-range";
import { calendarDay } from "../../shared/calendar";
const model = defineModel<DateSelectionInput>({ required: true });
function preset(range: "7" | "30" | "all") {
  model.value = { range };
}
function custom(field: "start" | "end", value: string) {
  const today = calendarDay(new Date());
  model.value = {
    range: "custom",
    start: model.value.start || today,
    end: model.value.end || today,
    [field]: value,
  };
}
</script>
<template>
  <div class="shared-date-range" aria-label="统计日期范围">
    <button
      class="btn"
      :class="{ selected: model.range === '7' }"
      @click="preset('7')"
    >
      最近7天</button
    ><button
      class="btn"
      :class="{ selected: model.range === '30' }"
      @click="preset('30')"
    >
      最近30天
    </button>
    <div class="date-range-inputs">
      <label class="range-date-label"
        ><span v-if="!model.start" class="range-date-placeholder">开始时间</span
        ><input
          type="date"
          :class="{ 'empty-date': !model.start }"
          :value="model.start || ''"
          aria-label="开始日期"
          @input="
            custom('start', ($event.target as HTMLInputElement).value)
          " /></label
      ><span>—</span
      ><label class="range-date-label"
        ><span v-if="!model.end" class="range-date-placeholder">结束时间</span
        ><input
          type="date"
          :class="{ 'empty-date': !model.end }"
          :value="model.end || ''"
          aria-label="结束日期"
          @input="custom('end', ($event.target as HTMLInputElement).value)"
      /></label>
    </div>
    <button
      class="text-btn"
      :aria-pressed="model.range === 'all'"
      @click="preset('all')"
    >
      全部历史
    </button>
    <p
      v-if="
        model.range === 'custom' &&
        !validDateRange(model.start || '', model.end || '')
      "
      role="alert"
    >
      请选择完整且开始不晚于结束的日期范围。
    </p>
  </div>
</template>
