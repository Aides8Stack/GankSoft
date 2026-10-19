<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { state, task, working, notice } from '../store';
import { services } from '../services';
import { resolvedTarget, type TargetMode } from '../../shared/assessment';
const props = defineProps<{ scope: 'card' | 'deck'; id: string }>();
const question = computed(() => state.value?.questions.find((q) => q.id === props.id));
const own = computed(() => state.value?.assessmentPolicies.find((p) => p.question_id === props.id));
const deck = computed(() =>
  state.value?.deckAssessmentPolicies.find(
    (p) => p.deck_id === (props.scope === 'deck' ? props.id : question.value?.module),
  ),
);
const mode = ref<TargetMode>('inherit'),
  seconds = ref(90);
watch(
  () => [
    props.id,
    props.scope,
    own.value?.mode,
    own.value?.target_seconds,
    deck.value?.target_seconds,
  ],
  () => {
    mode.value =
      props.scope === 'deck'
        ? deck.value?.target_seconds == null
          ? 'none'
          : 'custom'
        : (own.value?.mode ?? 'inherit');
    seconds.value = own.value?.target_seconds ?? deck.value?.target_seconds ?? 90;
  },
  { immediate: true },
);
const active = computed(() =>
  props.scope === 'card'
    ? resolvedTarget(
        props.id,
        question.value?.module ?? '',
        state.value?.assessmentPolicies ?? [],
        state.value?.deckAssessmentPolicies ?? [],
      )
    : (deck.value?.target_seconds ?? null),
);
const dirty = computed(() =>
  props.scope === 'deck'
    ? (mode.value === 'none' ? null : seconds.value) !== (deck.value?.target_seconds ?? null)
    : mode.value !== (own.value?.mode ?? 'inherit') ||
      (mode.value === 'custom' && seconds.value !== own.value?.target_seconds),
);
async function save() {
  const result = await task(() =>
    services.policy.target({
      scope: props.scope,
      id: props.id,
      mode: mode.value,
      target_seconds: mode.value === 'custom' ? seconds.value : null,
    }),
  );
  if (result) notice.value = '用时目标已保存，仅用于后续评估，历史记录与当前排期不变';
}
</script>
<template>
  <section
    class="info-box"
    :aria-label="scope === 'card' ? '单卡作答效率目标' : '卡片集作答效率目标'"
  >
    <h4>作答效率目标</h4>
    <p>当前目标：{{ active == null ? '未设置，不评价快慢' : active + ' 秒' }}</p>
    <form @submit.prevent="save">
      <label
        >目标用时模式<select v-model="mode">
          <option v-if="scope === 'card'" value="inherit">继承卡片集默认目标</option>
          <option value="custom">
            {{ scope === 'card' ? '本卡独立目标' : '设置本集默认目标' }}
          </option>
          <option value="none">不设置用时目标</option>
        </select></label
      >
      <label v-if="mode === 'custom'"
        >目标用时（秒）<input
          type="number"
          required
          min="1"
          max="86400"
          step="1"
          v-model.number="seconds"
      /></label>
      <p class="footnote">
        不同题型不统一设时限。未配置时不评价效率；超过目标最多将“轻松”降为“正常”，不判为遗忘。0秒或缺失用时不作为效率样本。单卡独立目标及“不设置”均不受卡片集默认值覆盖。
      </p>
      <button class="btn" :disabled="working || !dirty">保存用时目标</button>
    </form>
  </section>
</template>
