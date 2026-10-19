<script setup lang="ts">
import AdaptiveReviewSettings from "./AdaptiveReviewSettings.vue";
import ExistingPlanPreview from "./ExistingPlanPreview.vue";
import { useReviewSettingsGuard } from "../composables/reviewSettingsGuard";
import { computed, ref, watch } from 'vue';
import AssessmentPolicyEditor from './AssessmentPolicyEditor.vue';
import { services } from '../services';
import { state, task, working, deckName, notice } from '../store';
const emit=defineEmits<{specialty:[ids:string[]]}>();
const props = defineProps<{ deckId: string }>();
const policy = computed(() =>
  state.value!.deckReviewPolicies.find((p) => p.deck_id === props.deckId)!,
);
const daily = ref(15),
  max = ref(365);
watch(
  () => [props.deckId, policy.value.daily_limit, policy.value.max_interval_days],
  () => {
    daily.value = policy.value.daily_limit;
    max.value = policy.value.max_interval_days;
  },
  { immediate: true },
);
const dirty = computed(
  () => daily.value !== policy.value.daily_limit || max.value !== policy.value.max_interval_days,
);
const overrides = computed(
  () =>
    state.value!.reviewPolicies.filter((p) =>
      (p.kind === 'question' ? state.value!.questions : state.value!.memories).some(
        (c) => c.id === p.card_id && c.module === props.deckId && !c.deleted_at,
      ),
    ).length,
);
useReviewSettingsGuard(dirty);
async function save() {
  const result = await task(() =>
    services.policy.deck({
      deck_id: props.deckId,
      daily_limit: daily.value,
      max_interval_days: max.value,
    }),
  );
  if (result) notice.value = '配置已保存，从下一次有效复盘生效';
}
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">REVIEW SCHEDULING</div>
      <h1>复盘调度设置</h1>
      <p>{{ deckName(deckId) }} · 仅作用于当前卡片集</p>
    </div>
  </div>
  <section class="panel deck-review-settings" aria-label="卡片集调度配置">
    <div class="section-head">
      <h2>卡片集默认配置</h2>
      <span class="tag">独立生效</span>
    </div>
    <form @submit.prevent="save">
      <div class="form-grid">
        <label
          >每日到期任务上限<input
            type="number"
            min="1"
            max="200"
            step="1"
            required
            v-model.number="daily" /></label
        ><label
          >默认最大复盘间隔（天）<input
            type="number"
            min="1"
            max="3650"
            step="1"
            required
            v-model.number="max"
        /></label>
      </div>
      <p class="footnote">
        每日上限用于自动到期队列，手动选择卡片仍可继续学习。最大间隔是排期上限，系统可根据表现更早安排复盘。
      </p>
      <div class="info-box">
        本卡片集有
        {{ overrides }} 张卡片使用独立间隔。修改默认配置只影响沿用默认值的卡片；单卡配置保留。
      </div>
      <p class="footnote">
        配置从下一次有效复盘生效。当前排期、历史记录与暂停状态保留。
      </p>
      <div class="inline-actions">
        <button class="btn primary" :disabled="working || !dirty">保存卡片集配置</button
        ><span v-if="dirty" role="status" class="muted">有未保存的配置</span>
      </div>
    </form>
    <details class="score-rule-details">
      <summary>错题自评分如何影响排期</summary>
      <p class="footnote">
        答对：6.0—6.9 对应困难，7.0—8.9 对应正常，9.0—10.0
        对应轻松。答错或不能解释主要步骤进入重学；0.0—2.9 比 3.0—5.9
        记录为更低表现。系统结合独立性和方法理解，采用较保守的调度等级，再由 FSRS
        根据历史状态估算时间。
      </p>
      <p class="footnote">
        猜测、记得原答案、借助提示不更新排期。独立答对超时最多轻松降为正常。记忆卡没有客观答案正误，保留「忘记／困难／正常／轻松」自评。
      </p>
    </details>
  </section>
  <ExistingPlanPreview :deck-id="deckId" :disabled="dirty" />
  <AdaptiveReviewSettings :deck-id="deckId" @specialty="emit('specialty',$event)" />
  <AssessmentPolicyEditor
    v-if="state?.decks.find((d) => d.id === deckId)?.kind === 'question'"
    scope="deck"
    :id="deckId"
  />
</template>
