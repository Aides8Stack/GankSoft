<script setup lang="ts">
import { ref, watch } from "vue";
import { services } from "../services";
import { formatDate, refresh } from "../store";
import type { Output } from "../../shared/protocol/registry";
const props = defineProps<{
  deckId: string;
  cardId?: string;
  disabled?: boolean;
}>();
const preview = ref<Awaited<ReturnType<typeof services.policy.preview>> | null>(null),
  busy = ref(false),
  message = ref(""),
  operation = ref("");
let generation = 0;
watch(
  () => [props.deckId, props.cardId, props.disabled],
  () => {
    generation++;
    preview.value = null;
    busy.value = false;
  },
);
async function load(offset = 0) {
  const g = ++generation;
  busy.value = true;
  message.value = "";
  try {
    const p = await services.policy.preview({
      deckId: props.deckId,
      ...(props.cardId ? { cardId: props.cardId } : {}),
      offset,
      limit: 20,
    });
    if (g === generation) preview.value = p;
  } catch (e) {
    message.value = String(e);
  } finally {
    if (g === generation) busy.value = false;
  }
}
async function apply() {
  if (!preview.value || props.disabled) return;
  if (
    !confirm(
      `仅提前、不延后：确认提前 ${preview.value.affectedCount} 张卡片？暂停和显式延期会跳过。`,
    )
  )
    return;
  busy.value = true;
  try {
    const r = await services.policy.applyExisting(preview.value.previewToken);
    operation.value = r.operationId;
    message.value = `现有计划已提前 ${r.count} 张；FSRS 原始状态和历史未改。`;
    preview.value = null;
    await refresh();
  } catch (e) {
    message.value = String(e);
  } finally {
    busy.value = false;
  }
}
async function undo() {
  if (!confirm("撤销本次提前？已再复盘、移动或人工修改的卡片会拒绝撤销。"))
    return;
  busy.value = true;
  try {
    const r = await services.policy.undoExisting(props.deckId, operation.value);
    message.value = `已撤销 ${r.count} 张提前覆盖`;
    operation.value = "";
    await refresh();
  } catch (e) {
    message.value = String(e);
  } finally {
    busy.value = false;
  }
}
const reasons: Record<string, string> = {
  deleted: "已删除",
  paused: "已暂停",
  manual_snooze: "人工延期冲突",
  no_valid_last_review: "首学或无可信复盘时间",
  invalid_due: "日期无效",
  unchanged: "到期不需提前",
  advance: "仅提前",
};
</script>
<template>
  <section class="panel" aria-label="现有计划生效预览">
    <h2>现有计划 · 明确确认后仅提前</h2>
    <p class="footnote">
      保存配置默认只影响下一次有效复盘。请先保存，再预览当前任务；预览本身不写入数据，五分钟后失效。
    </p>
    <button class="btn" :disabled="busy || disabled" @click="load()">
      查看生效预览</button
    ><span v-if="disabled"> 请先保存未提交配置</span>
    <div v-if="preview" class="info-box">
      <p>
        共 {{ preview.total }} 张 · 继承 {{ preview.inheritedCount }} · 独立
        {{ preview.overriddenCount }} · 提前 {{ preview.affectedCount }} ·
        即刻到期 {{ preview.immediateDueCount }}
      </p>
      <p>学习时区 {{ preview.timezone }} · {{ preview.ruleVersion }}</p>
      <p v-for="(count, key) in preview.skipped" :key="key">
        {{ reasons[key] || key }}：{{ count }}
      </p>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>卡片</th>
              <th>当前到期</th>
              <th>预览到期</th>
              <th>原因</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in preview.rows" :key="r.cardId">
              <td>
                {{ r.cardId.slice(0, 8) }} ·
                {{ r.source === "card_override" ? "独立" : "继承" }}
                {{ r.maxIntervalDays }}天
              </td>
              <td>{{ formatDate(r.beforeDue) }}</td>
              <td>{{ formatDate(r.afterDue) }}</td>
              <td>{{ reasons[r.reason] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="inline-actions">
        <button
          class="btn"
          :disabled="!preview.offset || busy"
          @click="load(preview.offset - 20)"
        >
          上一页</button
        ><button
          class="btn"
          :disabled="preview.offset + 20 >= preview.total || busy"
          @click="load(preview.offset + 20)"
        >
          下一页</button
        ><button
          class="btn primary"
          :disabled="busy || !preview.affectedCount || disabled"
          @click="apply"
        >
          确认提前现有计划</button
        ><button class="btn" @click="preview = null">取消</button>
      </div>
    </div>
    <button v-if="operation" class="btn" :disabled="busy" @click="undo">
      撤销本次提前
    </button>
    <p role="status">{{ message }}</p>
  </section>
</template>
<style scoped>
.table-scroll {
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  padding: 10px;
  border-bottom: 1px solid var(--border);
}
</style>
