<script setup lang="ts">
import { ref, watch } from "vue";
import { services } from "../services";
import { state, formatDate } from "../store";
import type { Output } from "../../shared/protocol/registry";
const props = defineProps<{
  deckId: string;
  blocked?: boolean;
  cardId?: string;
  readonly?: boolean;
}>();
const emit = defineEmits<{ specialty: [ids: string[]] }>();
const queue = ref<Output<"policy.previewQueue"> | null>(null),
  message = ref(""),
  busy = ref(false),
  seed = ref("");
let generation = 0;
watch(
  () => [props.deckId, props.cardId, props.blocked],
  () => {
    generation++;
    queue.value = null;
    busy.value = false;
  },
);
async function load(offset = 0) {
  const g = ++generation;
  busy.value = true;
  try {
    const r = await services.policy.previewQueue(
      props.deckId,
      seed.value || undefined,
      props.cardId,
      offset,
    );
    if (g === generation) queue.value = r;
  } catch (e) {
    if (g === generation) message.value = String(e);
  } finally {
    if (g === generation) busy.value = false;
  }
}
const reasons: Record<string, string> = {
  repeat_error: "当前版本有失败证据",
  weak_knowledge_practice: "知识点薄弱专项",
  severely_overdue: "严重逾期",
  severe_overdue_fairness: "逾期保障",
  insufficient_evidence: "证据不足",
  stale_evidence: "证据过时",
  coverage_gap: "覆盖不足",
  recent_improvement: "近期改善",
  recent_fatigue: "同日已练",
  cross_question_practice: "跨题专项（不改排期）",
};
const status: Record<string, string> = {
  unseen: "未接触",
  stale: "证据过时",
  improving: "改善中",
  insufficient: "证据不足",
  weak: "薄弱",
  suspected_weak: "疑似薄弱",
  stable: "相对稳定",
  unstable: "波动",
};
function title(id: string) {
  return (
    state.value?.questions.find((c) => c.id === id)?.title ??
    state.value?.memories.find((c) => c.id === id)?.title ??
    id
  );
}
</script>
<template>
  <section class="queue-preview" aria-label="联合复习队列预览">
    <div class="section-head">
      <h3>联合复习与证据预览</h3>
      <button class="btn" :disabled="busy || blocked" @click="load()">
        刷新只读队列预览
      </button>
    </div>
    <label v-if="!readonly"
      >随机种子（可选，同种子可复现）<input
        maxlength="100"
        v-model="seed"
        placeholder="默认使用学习日期"
    /></label>
    <p v-if="blocked" class="muted">先保存参数，再预览已生效配置。</p>
    <p v-if="message" role="alert">{{ message }}</p>
    <div v-if="queue">
      <p class="footnote">
        {{ queue.ruleVersion }} · {{ queue.timezone }} · 当前全历史诊断不随
        7／30／90 天图表范围变化。
      </p>
      <div class="info-box">
        今日独立到期已用 {{ queue.budgets.uniqueDueUsed }} · 重学已用
        {{ queue.budgets.relearnUsed }} · 专项已用
        {{ queue.budgets.practiceUsed
        }}<span v-if="queue.budgets.practiceMinutes">
          · 时长软目标 {{ queue.budgets.practiceMinutes }} 分钟</span
        >
      </div>
      <template v-if="!cardId"
        ><div
          v-for="group in [
            { name: '正常到期', items: queue.due },
            { name: '同日重学', items: queue.relearn },
            { name: '额外专项 · 不推进 FSRS', items: queue.specialty },
          ]"
          :key="group.name"
        >
          <h4>{{ group.name }} · {{ group.items.length }} 张</h4>
          <p v-if="!group.items.length" class="muted">
            暂无候选，或今日预算已用完。
          </p>
          <article v-for="c in group.items" :key="c.cardId" class="list-row">
            <div>
              <strong>{{ title(c.cardId) }}</strong
              ><small>有效到期 {{ formatDate(c.dueAt) }}</small
              ><small>{{
                c.reasonCodes.map((r) => reasons[r] || r).join(" · ") ||
                "合法到期，按当前预设排序"
              }}</small>
            </div>
          </article>
        </div>
        <button
          v-if="!readonly && queue.specialty.length"
          class="btn"
          :disabled="blocked"
          @click="
            emit(
              'specialty',
              queue.specialty.map((c) => c.cardId),
            )
          "
        >
          开始额外专项（仅练习）
        </button></template
      >
      <div v-if="queue.diagnosis">
        <h4>知识点证据</h4>
        <p class="footnote">
          旧关联未知 {{ queue.diagnosis.unknownLinkHistoryCount }} 条 ·
          未明确归因失败
          {{
            queue.diagnosis.unattributedFailureCount
          }}
          条。证据指标不代表掌握概率。
        </p>
        <div v-if="cardId">
          <p
            v-for="d in queue.diagnosis.questions.filter(
              (d) => d.cardId === cardId,
            )"
            :key="d.cardId"
          >
            本题：{{ status[d.status] }} · {{ d.distinctDays }} 个独立日期 ·
            {{ d.observations }} 条适用历史
          </p>
        </div>
        <details v-for="k in queue.diagnosis.knowledge" :key="k.knowledgeId">
          <summary>
            {{ k.name }} · {{ status[k.status] }} ·
            {{ k.distinctCards }} 道独立题 / {{ k.distinctDays }} 个日期
          </summary>
          <p>
            有效证据 {{ k.effectiveEvidenceN.toFixed(2) }} ·
            {{ k.coverageGap ? "仍有覆盖缺口" : "已覆盖关联题" }} ·
            {{ k.confidence < 0.4 ? "可信度尚低" : "已有多维证据" }}
          </p>
        </details>
        <div class="inline-actions">
          <button
            class="btn"
            :disabled="!queue.diagnosis.knowledgeOffset || busy"
            @click="load(queue.diagnosis.knowledgeOffset - 50)"
          >
            上一页知识点</button
          ><span>共 {{ queue.diagnosis.knowledgeTotal }} 个知识点</span
          ><button
            class="btn"
            :disabled="
              queue.diagnosis.knowledgeOffset + 50 >=
                queue.diagnosis.knowledgeTotal || busy
            "
            @click="load(queue.diagnosis.knowledgeOffset + 50)"
          >
            下一页知识点
          </button>
        </div>
        <p v-if="!queue.diagnosis.knowledge.length">
          尚无知识点，不能推断知识掌握情况。
        </p>
      </div>
    </div>
  </section>
</template>
<style scoped>
.queue-preview {
  display: grid;
  gap: 12px;
  border-top: 1px solid var(--border);
  padding-top: 20px;
}
.queue-preview details {
  padding: 8px 0;
}
.queue-preview small {
  display: block;
}
.queue-preview h4 {
  margin: 20px 0 8px;
}
</style>
