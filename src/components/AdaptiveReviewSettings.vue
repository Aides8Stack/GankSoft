<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { services } from "../services";
import { state } from "../store";
import {
  DeckConfig,
  KnowledgePreference,
  PRESETS,
  type ReviewDeckConfig,
} from "../../shared/review-config";
import type { Output } from "../../shared/protocol/registry";
import { useReviewSettingsGuard } from "../composables/reviewSettingsGuard";
import ReviewQueuePreview from "./ReviewQueuePreview.vue";
const emit = defineEmits<{ specialty: [ids: string[]] }>();
const props = defineProps<{ deckId: string; unified?:boolean; knowledgeNodes?:{id:string;name:string}[] }>();
const view = ref<Output<"policy.config.get"> | null>(null),
  draft = ref<ReviewDeckConfig>(DeckConfig.parse({}));
const tab = ref("schedule"),
  busy = ref(false),
  message = ref("");
let generation = 0;
const dirty = computed(
  () =>
    !!view.value &&
    JSON.stringify(draft.value) !== JSON.stringify(view.value.config),
);
useReviewSettingsGuard(dirty);
watch(
  () => props.deckId,
  async () => {
    const g = ++generation;
    try {
      const r = await services.policy.configGet(props.deckId);
      if (g === generation) {
        view.value = r;
        draft.value = structuredClone(r.config);
      }
    } catch (e) {
      message.value = String(e);
    }
  },
  { immediate: true },
);
const valid = computed(() => DeckConfig.safeParse(draft.value));
async function save() {
  if (!view.value || !valid.value.success) return;
  busy.value = true;
  const sent = JSON.parse(JSON.stringify(draft.value));
  try {
    const r = await services.policy.configSave({
      deckId: props.deckId,
      expectedRevision: view.value.revision,
      config: sent,
    });
    view.value = r;
    if (JSON.stringify(draft.value) === JSON.stringify(sent))
      draft.value = structuredClone(r.config);
    message.value = "参数已保存。保持率从下次有效复盘生效；当前到期未改。";
  } catch (e) {
    message.value = String(e);
  } finally {
    busy.value = false;
  }
}
function preset() {
  if (draft.value.priorityPreset !== "custom")
    draft.value.weights = { ...PRESETS[draft.value.priorityPreset] };
}
const knowledge = computed(
  () =>
    props.knowledgeNodes??state.value?.knowledge.filter(
      (k) => k.module === props.deckId && !k.deleted_at,
    ) ?? [],
);
const knowledgeId = ref(""),
  preference = ref(KnowledgePreference.parse({}));
const prefOriginal = ref("");
watch(knowledgeId, () => {
  const p =
    view.value?.knowledge.find((p) => p.knowledgeId === knowledgeId.value)
      ?.preference ?? KnowledgePreference.parse({});
  preference.value = JSON.parse(JSON.stringify(p));
  prefOriginal.value = JSON.stringify(p);
});
function selectKnowledge(e: Event) {
  const target = e.target as HTMLSelectElement;
  if (prefDirty.value && !confirm("知识点专项偏好有未保存修改。放弃后切换？")) {
    target.value = knowledgeId.value;
    return;
  }
  knowledgeId.value = target.value;
}
const prefDirty = computed(
  () =>
    !!knowledgeId.value &&
    JSON.stringify(preference.value) !== prefOriginal.value,
);
useReviewSettingsGuard(prefDirty);
async function saveKnowledge() {
  busy.value = true;
  try {
    await services.policy.knowledgeSet({
      deckId: props.deckId,
      knowledgeId: knowledgeId.value,
      expectedRevision:
        view.value?.knowledge.find((p) => p.knowledgeId === knowledgeId.value)
          ?.revision ?? 0,
      preference: JSON.parse(JSON.stringify(preference.value)),
    });
    prefOriginal.value = JSON.stringify(preference.value);
    view.value = await services.policy.configGet(props.deckId);
    message.value = "知识点专项偏好已保存，正常到期与 FSRS 不变。";
  } catch (e) {
    message.value = String(e);
  } finally {
    busy.value = false;
  }
}
const memory = computed(
  () =>
    !props.unified&&state.value?.decks.find((d) => d.id === props.deckId)?.kind === "memory",
);
defineExpose({isClean:()=>!dirty.value&&!prefDirty.value&&!busy.value});
</script>
<template>
  <section class="panel adaptive-settings" aria-label="自适应复习参数">
    <div class="section-head">
      <h2>复习参数</h2>
      <span class="tag">当前集独立 · 修订 {{ view?.revision ?? 0 }}</span>
    </div>
    <nav class="inline-actions" aria-label="复习参数分类">
      <button
        v-for="t in [
          { id: 'schedule', name: '复习排期' },
          { id: 'tasks', name: '每日任务与专项' },
          { id: 'smart', name: '智能推荐' },
          ...(!memory ? [{ id: 'knowledge', name: '知识点专项' }] : []),
        ]"
        :key="t.id"
        class="btn"
        :class="{ primary: tab === t.id }"
        :aria-pressed="tab === t.id"
        @click="tab = t.id"
      >
        {{ t.name }}
      </button>
    </nav>
    <form v-if="view" @submit.prevent="save">
      <div v-if="tab === 'schedule'">
        <p>最大间隔、每日独立题数沿用上方卡片集设置；本卡独立值始终优先。</p>
        <details>
          <summary>高级：FSRS 目标保持率</summary>
          <label
            >保持率（0.80—0.97；默认 0.90）<input
              type="number"
              min="0.80"
              max="0.97"
              step="0.01"
              v-model.number="draft.desiredRetention"
              required
          /></label>
          <p class="footnote">
            更高通常意味着更频繁复习。这是排期目标；当前排期、稳定性、难度和历史不会回算。
          </p>
        </details>
      </div>
      <div v-if="tab === 'tasks'" class="form-grid">
        <label
          >同日重学预算（0—200 次；默认 10）<input
            type="number"
            min="0"
            max="200"
            step="1"
            v-model.number="draft.sameDayRelearnBudget"
            required /></label
        ><label v-if="!memory"
          >额外专项预算（0—200 道；默认 5）<input
            type="number"
            min="0"
            max="200"
            step="1"
            v-model.number="draft.specialtyDailyLimit"
            required /></label
        ><label
          >时长软目标（0 不限，或 5—240 分钟）<input
            type="number"
            min="0"
            max="240"
            step="1"
            v-model.number="draft.practiceMinutes"
            required
        /></label>
        <p class="footnote">
          每日到期题按不同卡片计数，重学和专项分账。时长仅作计划参考，不截断作答。记忆卡不参与解题知识诊断。
        </p>
      </div>
      <div v-if="tab === 'smart'">
        <label
          >推荐侧重<select v-model="draft.priorityPreset" @change="preset">
            <option value="balanced">均衡（默认）</option>
            <option value="weak">薄弱优先</option>
            <option value="overdue">逾期优先</option>
            <option value="coverage">覆盖优先</option>
            <option value="custom">自定义</option>
          </select></label
        >
        <div v-if="draft.priorityPreset === 'custom'" class="form-grid">
          <label
            v-for="k in [
              'question',
              'knowledge',
              'overdue',
              'coverage',
            ] as const"
            :key="k"
            >{{
              {
                question: "题目风险",
                knowledge: "知识风险",
                overdue: "逾期紧迫",
                coverage: "覆盖新颖",
              }[k]
            }}权重（0—1）<input
              type="number"
              min="0"
              max="1"
              step="0.01"
              v-model.number="draft.weights[k]"
              required
          /></label>
        </div>
        <p class="footnote">
          四项权重总和为 1。诊断是证据指标；默认值是可调工程起点。
        </p>
        <details>
          <summary>高级推荐参数</summary>
          <div class="form-grid">
            <label
              >严重逾期预留（0—0.60；默认 0.30）<input
                type="number"
                min="0"
                max="0.60"
                step="0.05"
                v-model.number="draft.severeOverdueReserve"
                required /></label
            ><label
              >知识分散<select v-model="draft.diversityMode">
                <option value="balanced">均衡</option>
                <option value="spread">分散</option>
                <option value="focus">集中</option>
              </select></label
            ><label v-if="!memory"
              >随机专项比例（0—1；默认 0）<input
                type="number"
                min="0"
                max="1"
                step="0.05"
                v-model.number="draft.randomFraction"
                required
            /></label>
          </div>
          <label class="check-option"
            ><input
              type="checkbox"
              v-model="draft.sameDayFatiguePenalty"
            />同日疲劳降权（不阻止合法重学）</label
          ><label v-if="!memory" class="check-option"
            ><input
              type="checkbox"
              v-model="draft.crossQuestionVerification"
            />推荐跨题专项验证</label
          >
          <p class="footnote">
            存在严重逾期时至少保障一题，避免长期饥饿。随机只作用于额外专项。
          </p>
        </details>
      </div>
      <div v-if="tab !== 'knowledge'" class="inline-actions">
        <button
          class="btn primary"
          :disabled="busy || !dirty || !valid.success"
        >
          保存复习参数</button
        ><span v-if="dirty">有未保存修改</span>
      </div>
      <p v-if="!valid.success" role="alert">
        {{ valid.error.issues[0]?.message }}
      </p>
    </form>
    <div v-if="tab === 'knowledge' && !memory">
      <p>专项强度仅影响额外练习；排除专项仍保留合法到期任务。</p>
      <label
        >选择知识点<select :value="knowledgeId" @change="selectKnowledge">
          <option value="">请选择</option>
          <option v-for="k in knowledge" :key="k.id" :value="k.id">
            {{ k.name }}
          </option>
        </select></label
      >
      <div v-if="knowledgeId" class="form-grid">
        <label
          >专项模式<select v-model="preference.mode">
            <option value="auto">自动</option>
            <option value="normal">正常</option>
            <option value="prioritize">强化</option>
            <option value="reduce">减少</option>
            <option value="exclude_specialty">排除额外专项</option>
          </select></label
        ><label
          >强度（0.5—2；默认 1）<input
            type="number"
            min="0.5"
            max="2"
            step="0.1"
            v-model.number="preference.boost" /></label
        ><label
          >专项数目标（空白继承，0—50）<input
            type="number"
            min="0"
            max="50"
            :value="preference.practiceTarget ?? ''"
            @input="
              preference.practiceTarget =
                ($event.target as HTMLInputElement).value === ''
                  ? null
                  : Number(($event.target as HTMLInputElement).value)
            " /></label
        ><label class="check-option"
          ><input
            type="checkbox"
            v-model="preference.variantFirst"
          />不同题与跨日验证优先</label
        ><label class="check-option"
          ><input
            type="checkbox"
            v-model="preference.practicePaused"
          />暂停额外专项</label
        >
      </div>
      <button
        class="btn"
        :disabled="
          busy ||
          !knowledgeId ||
          !KnowledgePreference.safeParse(preference).success
        "
        @click="saveKnowledge"
      >
        保存知识点偏好
      </button>
      <p v-if="view?.knowledge.some((k) => k.orphan)" role="status">
        有已删除或移动知识点的旧偏好，仅保留追溯，不参与推荐。
      </p>
    </div>
    <p role="status">{{ message }}</p>
    <ReviewQueuePreview v-if="!unified"
      :deck-id="deckId"
      :blocked="dirty"
      @specialty="emit('specialty', $event)"
    />
  </section>
</template>
<style scoped>
.adaptive-settings {
  display: grid;
  gap: 16px;
}
.adaptive-settings form {
  display: grid;
  gap: 16px;
}
.adaptive-settings details {
  padding: 12px 0;
}
</style>
