<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { services } from "../services";
import { DiagnosisRule } from "../../shared/review-config";
import { useReviewSettingsGuard } from "../composables/reviewSettingsGuard";
const draft = ref(DiagnosisRule.parse({})),
  revision = ref(0),
  original = ref(""),
  message = ref("");
const dirty = computed(
  () => !!original.value && JSON.stringify(draft.value) !== original.value,
);
useReviewSettingsGuard(dirty);
onMounted(async () => {
  try {
    const r = await services.policy.diagnosisGet();
    revision.value = r.revision;
    draft.value = r.rule;
    original.value = JSON.stringify(r.rule);
  } catch (e) {
    message.value = String(e);
  }
});
async function save() {
  try {
    const r = await services.policy.diagnosisSave({
      expectedRevision: revision.value,
      rule: JSON.parse(JSON.stringify(draft.value)),
    });
    revision.value = r.revision;
    original.value = JSON.stringify(r.rule);
    message.value = "诊断规则已保存；原始事件与 FSRS 未修改。";
  } catch (e) {
    message.value = String(e);
  }
}
</script>
<template>
  <section class="panel">
    <h2>高级 / 实验性诊断模型</h2>
    <p>
      规则 adaptive-review-v2.0 · 修订
      {{ revision }}。参数仅重新计算证据诊断，默认建议保持 60 天和 2.0。
    </p>
    <details>
      <summary>调整证据模型</summary>
      <form @submit.prevent="save">
        <label
          >证据半衰期（1—3650 天；默认 60）<input
            type="number"
            min="1"
            max="3650"
            v-model.number="draft.evidenceHalfLifeDays"
            required /></label
        ><label
          >每题知识证据贡献上限（0.1—10；默认 2）<input
            type="number"
            min="0.1"
            max="10"
            step="0.1"
            v-model.number="draft.knowledgePerQuestionCreditCap"
            required /></label
        ><label
          >重复证据衰减<select v-model="draft.repeatPenalty">
            <option value="sqrt">平方根递减（默认）</option>
            <option value="linear">线性递减</option>
            <option value="none">无递减（仍受单题上限限制）</option>
          </select></label
        >
        <p>
          无“最近 N
          次决定掌握”开关；状态使用宽阈值中间区避免对错直接跳变。可信度平滑和阈值当前只读。
        </p>
        <button
          class="btn primary"
          :disabled="!dirty || !DiagnosisRule.safeParse(draft).success"
        >
          保存高级诊断参数
        </button>
      </form>
    </details>
    <p role="status">{{ message }}</p>
  </section>
</template>
