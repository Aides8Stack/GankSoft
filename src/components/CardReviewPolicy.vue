<script setup lang="ts">
import ExistingPlanPreview from "./ExistingPlanPreview.vue";
import { useReviewSettingsGuard } from "../composables/reviewSettingsGuard";
import { computed, ref, watch } from 'vue';
import type { CardKind, SaveReviewPolicyCommand } from '../../shared/review-contract';
import AssessmentPolicyEditor from './AssessmentPolicyEditor.vue';
import { services } from '../services';
import { state, task, working, formatDate, notice } from '../store';
const props = defineProps<{ kind: CardKind; cardId: string }>();
const policy = computed(() =>
  state.value!.reviewPolicies.find((p) => p.kind === props.kind && p.card_id === props.cardId),
);
const card = computed(() =>
  props.kind === 'question'
    ? state.value!.questions.find((c) => c.id === props.cardId)
    : state.value!.memories.find((c) => c.id === props.cardId),
);
const deckPolicy = computed(() =>
  state.value!.deckReviewPolicies.find((p) => p.deck_id === card.value?.module),
);
const inherited = ref(true),
  days = ref(365);
watch(
  () => [
    props.kind,
    props.cardId,
    policy.value?.max_interval_days,
    deckPolicy.value?.max_interval_days,
  ],
  () => {
    inherited.value = !policy.value;
    days.value = policy.value?.max_interval_days ?? deckPolicy.value?.max_interval_days ?? 365;
  },
  { immediate: true },
);
const reviews = computed(() =>
  props.kind === 'question'
    ? state.value!.attempts.filter((a) => a.question_id === props.cardId)
    : state.value!.memoryReviews.filter((r) => r.card_id === props.cardId),
);
const effectiveCount = computed(() => reviews.value.filter((r) => r.effective).length);
const effective=ref<Awaited<ReturnType<typeof services.policy.cardGet>>|null>(null);
let generation=0;
watch(()=>[props.kind,props.cardId,policy.value?.max_interval_days,deckPolicy.value?.max_interval_days],async()=>{
 const g=++generation;
 try {const r=await services.policy.cardGet(props.kind,props.cardId);if(g===generation)effective.value=r} catch { if(g===generation)effective.value=null; }
},{immediate:true});
const activeDays=computed(()=>effective.value?.maxIntervalDays??'读取中');
const dirty = computed(
  () => (inherited.value ? null : days.value) !== (policy.value?.max_interval_days ?? null),
);
useReviewSettingsGuard(dirty);
async function save() {
  const payload: SaveReviewPolicyCommand = {
    kind: props.kind,
    card_id: props.cardId,
    max_interval_days: inherited.value ? null : days.value,
  };
  const result = await task(() =>
    services.policy.card(payload),
  );
  if (result)
    notice.value = result.adjusted
      ? '复盘间隔已保存，当前过长排期已提前'
      : '复盘间隔已保存，当前到期不变，下次有效复盘生效';
}
</script>
<template>
  <section class="review-policy info-box" aria-label="单卡复盘设置">
    <div class="section-head">
      <h4>复盘节奏</h4>
      <span class="tag">次数不限</span>
    </div>
    <p>
      累计复盘 <strong>{{ reviews.length }}</strong> 次 · 有效复盘 {{ effectiveCount }} 次 ·
      练习／同日巩固 {{ reviews.length - effectiveCount }} 次
    </p>
    <p class="muted">
      下次复盘：{{ card?.due_at ? formatDate(card.due_at) : '待首次学习'
      }}{{ card?.paused ? '（已暂停）' : '' }} · 当前上限 {{ activeDays }} 天 · {{ effective?.source === "card_override" ? "来源：本卡独立" : "来源：继承卡片集" }}
    </p>
    <form @submit.prevent="save">
      <label class="check-option"
        ><input type="checkbox" v-model="inherited" />沿用卡片集默认值（{{
          deckPolicy?.max_interval_days ?? 365
        }}
        天）</label
      >
      <label v-if="!inherited"
        >本卡最大复盘间隔（天）<input
          type="number"
          min="1"
          max="3650"
          step="1"
          required
          v-model.number="days"
      /></label>
      <p class="footnote">
        多维评估见“复盘数据”。上限不是固定周期，FSRS 会按表现安排更早复盘。新配置从下一次有效复盘生效，当前任务、历史和暂停状态保持。
      </p>
      <button class="btn" :disabled="working || !dirty">保存复盘间隔</button>
      <span v-if="dirty" class="muted" role="status"> 有未保存的间隔设置</span>
    </form>
  </section>
  <ExistingPlanPreview v-if="card" :deck-id="card.module" :card-id="cardId" :disabled="dirty" />
  <AssessmentPolicyEditor v-if="kind === 'question'" scope="card" :id="cardId" />
</template>
