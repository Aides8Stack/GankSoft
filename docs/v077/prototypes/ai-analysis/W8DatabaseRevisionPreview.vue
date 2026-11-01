<script setup lang="ts">
/**
 * W8 数据修订变化专项 Vue 3 交互原型。
 * 完全模拟：不访问 GankSoft IPC/SQLite/文件系统、不给 AI 发请求、不执行调度。
 * 正式嵌入路径：UnifiedWorkspace → UnifiedAnalytics（父）→ UnifiedAiAnalysis（子）。
 * 组件中没有自己的全局窄栏、顶部主导航；模拟弹窗只盖当前业务区域。
 */
import { computed, ref, nextTick } from "vue";

type Phase = "idle" | "writing" | "validating" | "done" | "cancelled";
const emit = defineEmits<{ back: [] }>();
const dbRevision = ref(128);
const originalRevision = 128;
const latestExportRevision = ref(128);
const capturedExportRevision = ref<number | null>(null);
const phase = ref<Phase>("idle");
const staleLocked = ref(false);
const staleModal = ref(false);
const finalModal = ref(false);
const importedRevision = ref<number | null>(null);
const sourceKind = ref<"old" | "new" | null>(null);
const newAiReadyRevision = ref<number | null>(null);
const applied = ref(false);
const notice = ref("模拟环境：旧分析 ZIP 与旧 AI 建议均来自数据库修订 128。");
const dialog = ref<HTMLElement | null>(null);
const oldSuggestions = [
  { id: "r1", action: "卡片集目标留存率", before: "90%", after: "92%", reason: "预期降低遗忘风险" },
  { id: "r2", action: "单卡最大间隔", before: "90 天", after: "60 天", reason: "建议更密集巩固" },
  { id: "r3", action: "提前未来复习", before: "11月5日", after: "11月3日", reason: "在记忆衰退前回顾" }
];
const selected = ref(["r1", "r2", "r3"]);
const exporting = computed(() => phase.value === "writing" || phase.value === "validating");
const exportOutdated = computed(() => phase.value === "done" && latestExportRevision.value !== dbRevision.value);
const stale = computed(() => sourceKind.value !== null && (staleLocked.value || importedRevision.value !== dbRevision.value));
const canUseNew = computed(() =>
  newAiReadyRevision.value !== null &&
  newAiReadyRevision.value === latestExportRevision.value &&
  newAiReadyRevision.value === dbRevision.value &&
  phase.value === "done"
);
const canApply = computed(() => sourceKind.value !== null && !stale.value && selected.value.length > 0 && !applied.value);
const phaseNames: Record<Phase, string> = {
  idle: "未开始",
  writing: "模拟读取与写入",
  validating: "模拟完整性校验",
  done: "模拟已完成",
  cancelled: "模拟已取消"
};

function alertStale() {
  if (applied.value) return;
  staleLocked.value = true;
  finalModal.value = false;
  staleModal.value = true;
  notice.value = "数据库身份或修订已变化，旧 AI 建议被强制锁定；未执行调度。";
  void nextTick(() => dialog.value?.querySelector<HTMLButtonElement>("button")?.focus());
}
function changeDatabase() {
  dbRevision.value += 1;
  if (sourceKind.value && !applied.value) alertStale();
  else notice.value = "模拟完成正式复盘，数据库修订已更新；旧分析快照不能作为新调度依据。";
}
function dismiss() {
  staleModal.value = false;
  notice.value = "提示已关闭，旧建议仍锁定。关闭弹窗不会解除数据库修订校验。";
}
function startExport() {
  capturedExportRevision.value = dbRevision.value;
  phase.value = "writing";
  newAiReadyRevision.value = null;
  notice.value = "模拟开始导出当前修订；实际 GankSoft 会提供后台任务进度，不依赖此 Vue 视图。";
}
function nextExportPhase() {
  if (phase.value === "writing") {
    phase.value = "validating";
    notice.value = "模拟进入 ZIP 完整性校验；此时不能报告已完成。";
  } else if (phase.value === "validating") {
    latestExportRevision.value = capturedExportRevision.value ?? dbRevision.value;
    phase.value = "done";
    notice.value = exportOutdated.value
      ? "ZIP 已按固定快照生成，但导出期间数据库变化，该来源已过期，请重新导出。"
      : "模拟导出新分析 ZIP 成功。用户仍需自行交给外部 AI 重新分析。";
  }
}
function cancelExport() {
  if (!exporting.value) return;
  phase.value = "cancelled";
  newAiReadyRevision.value = null;
  notice.value = "模拟取消完成，临时内容已清理；无正式 ZIP。";
}
function reExport() {
  staleModal.value = false;
  finalModal.value = false;
  importedRevision.value = null;
  sourceKind.value = null;
  staleLocked.value = true;
  selected.value = ["r1", "r2", "r3"];
  startExport();
}
function simulateAiGenerate() {
  if (phase.value !== "done" || exportOutdated.value) {
    notice.value = "最新分析 ZIP 尚未完成或已经过期；不能生成有效新建议。";
    return;
  }
  newAiReadyRevision.value = latestExportRevision.value;
  notice.value = "模拟外部 AI 针对最新分析 ZIP 生成建议；实际操作需由用户在外部完成。";
}
function importOld() {
  sourceKind.value = "old";
  importedRevision.value = originalRevision;
  selected.value = ["r1", "r2", "r3"];
  finalModal.value = false;
  if (stale.value) alertStale();
  else notice.value = "模拟旧建议来源与当前数据库仍一致，可安全预览，未执行任何修改。";
}
function importNew() {
  if (!canUseNew.value) {
    notice.value = "没有经过最新来源对应的外部 AI 新建议，旧 ZIP 不能替代新 ZIP。";
    return;
  }
  sourceKind.value = "new";
  importedRevision.value = newAiReadyRevision.value;
  staleLocked.value = false;
  staleModal.value = false;
  selected.value = ["r1", "r2", "r3"];
  applied.value = false;
  notice.value = "模拟新 AI ZIP 与最新分析 ZIP/数据库修订匹配，可以预览并确认应用。";
}
function toggle(id: string) {
  if (stale.value || applied.value) return;
  selected.value = selected.value.includes(id)
    ? selected.value.filter(x => x !== id)
    : [...selected.value, id];
}
function requestApply() {
  if (stale.value) { alertStale(); return; }
  if (!canApply.value) return;
  // 在正式 W5 中，本动作只是只读 prepare；唯一写入确认在 confirmApply。
  finalModal.value = true;
}
function confirmApply() {
  if (stale.value || importedRevision.value !== dbRevision.value) {
    finalModal.value = false;
    alertStale();
    return;
  }
  if (!canApply.value || !finalModal.value) return;
  finalModal.value = false;
  applied.value = true;
  notice.value = "演示完成最终确认：这里只改变模拟状态；实际 GankSoft 需要 W5 原子事务和真实回执。";
}
function returnParent() {
  notice.value = "返回学习分析（仅通过组件事件通知父页面，正式状态由父组件恢复）。";
  emit("back");
}
function reset() {
  dbRevision.value = 128;
  latestExportRevision.value = 128;
  capturedExportRevision.value = null;
  phase.value = "idle";
  staleLocked.value = false;
  staleModal.value = false;
  finalModal.value = false;
  importedRevision.value = null;
  sourceKind.value = null;
  newAiReadyRevision.value = null;
  applied.value = false;
  selected.value = ["r1", "r2", "r3"];
  notice.value = "已重置模拟。";
}
</script>

<template>
  <section class="w8-child" aria-label="W8 AI 调度调整子页面模拟">
    <header class="w8-heading">
      <div>
        <span class="crumb">学习分析 / AI 调度调整 / W8</span>
        <h2>AI 数据导出与建议导入</h2>
        <p>这是「学习分析」的子页面，左侧窄图标栏和顶部主导航由父级提供，不在此重新实现。</p>
      </div>
      <div class="header-buttons">
        <button @click="returnParent">返回学习分析</button>
        <button @click="reset">重置模拟</button>
      </div>
    </header>

    <div class="note">仅 Vue 3 合成示例：不读取 SQLite、不生成真实 ZIP、不连接外部 AI、不修改任何学习或调度记录。</div>
    <div class="revisions" aria-live="polite">
      <div><small>当前数据库修订</small><strong>{{ dbRevision }}</strong></div>
      <div><small>最近导出来源修订</small><strong>{{ latestExportRevision }}</strong></div>
      <div><small>已选 AI 建议来源修订</small><strong>{{ importedRevision ?? "未导入" }}</strong></div>
      <button @click="changeDatabase">模拟一次正式复盘（数据库更新）</button>
    </div>

    <p class="notice" role="status">{{ notice }}</p>
    <div class="columns">
      <article class="panel">
        <h3>1. 导出最新学习数据</h3>
        <p>仍然导出完整卡片、知识关系、历史和调度快照；日期仅影响摘要，绝不裁剪完整记录。</p>
        <div class="subtle">主进程后台任务负责真实导出、进度与取消。此处用分阶段按钮模拟，不显示虚构百分比。</div>
        <button class="primary" :disabled="exporting" @click="startExport">重新导出最新分析 ZIP（模拟）</button>
        <div class="phase">当前阶段：<strong>{{ phaseNames[phase] }}</strong></div>
        <div v-if="exporting" class="controls">
          <button @click="nextExportPhase">{{ phase === "writing" ? "模拟写入结束并进入校验" : "模拟校验通过并完成" }}</button>
          <button @click="cancelExport">取消导出</button>
        </div>
        <p v-if="exportOutdated" class="warning">ZIP 虽已生成，但已经落后于最新数据库。不能用它生成当前调度建议。</p>
        <div v-if="phase === 'done' && !exportOutdated" class="next">
          <p>本机 ZIP 已生成（模拟）。请由用户交给外部 AI 重新分析。</p>
          <button @click="simulateAiGenerate">模拟外部 AI 根据新 ZIP 生成建议</button>
          <p v-if="canUseNew" class="ok">新建议已生成（模拟），现在可导入。</p>
        </div>
      </article>

      <article class="panel">
        <h3>2. 导入 AI 返回建议</h3>
        <p>原始分析 ZIP 必须与 AI 建议 ZIP 以及当前数据库身份匹配。只选返回 ZIP 是正常路径，不代表可以跳过核验。</p>
        <div class="controls">
          <button @click="importOld">尝试导入旧 AI ZIP</button>
          <button class="primary" :disabled="!canUseNew" @click="importNew">导入 AI 重新生成的新 ZIP</button>
        </div>
        <p v-if="sourceKind" class="phase">来源：{{ sourceKind === "old" ? "旧建议" : "重新生成的新建议" }} · 修订 {{ importedRevision }}</p>
        <p v-if="stale" class="warning">旧建议已锁定：暂不处理或重复导入旧文件，都不能解除锁定。</p>
        <div v-if="sourceKind && !stale" class="suggestions">
          <label v-for="s in oldSuggestions" :key="s.id">
            <input type="checkbox" :checked="selected.includes(s.id)" :disabled="applied" @change="toggle(s.id)">
            <span><strong>{{ s.action }}</strong><small>{{ s.before }} → {{ s.after }} · {{ s.reason }}</small></span>
          </label>
          <button class="primary" :disabled="!canApply" @click="requestApply">检查并应用（自动只读校验）</button>
          <p v-if="applied" class="ok">已应用 {{ selected.length }} 条（仅模拟；无实际写入）。</p>
        </div>
      </article>
    </div>

    <div v-if="finalModal" class="overlay">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="w8-final-title">
        <h3 id="w8-final-title">确认应用 AI 调度建议？</h3>
        <p>模拟准备校验已完成。本次选择 {{ selected.length }} 条建议；实际 W5 会在事务内再次验证。</p>
        <div class="actions"><button @click="changeDatabase">模拟确认前数据库再次更新</button><button @click="finalModal=false">取消</button><button class="primary" @click="confirmApply">确认应用</button></div>
      </div>
    </div>

    <div v-if="staleModal" class="overlay">
      <div ref="dialog" class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="w8-stale-title" aria-describedby="w8-stale-info">
        <div class="warning-mark">!</div>
        <h3 id="w8-stale-title">学习数据已发生变化</h3>
        <p id="w8-stale-info">旧建议来自数据库修订 {{ importedRevision ?? originalRevision }}，当前修订已为 {{ dbRevision }}，无法安全应用旧 AI 建议。</p>
        <p class="warning">请重新导出最新学习数据，自行交给外部 AI 重新分析，再导入基于新 ZIP 生成的新建议。</p>
        <div class="actions"><button @click="dismiss">暂不处理</button><button class="primary" @click="reExport">重新导出最新分析 ZIP</button></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.w8-child { position:relative; min-height:670px; background:#f7f8fa; padding:24px; border:1px solid #e2e7ec; border-radius:14px; color:#243447; font:14px/1.5 system-ui,"Microsoft YaHei",sans-serif }
.w8-child * { box-sizing:border-box }
.w8-child button { border:1px solid #cbd5e1; background:#fff; padding:9px 12px; border-radius:8px; cursor:pointer; color:#354c64; font:inherit }
.w8-child button:disabled { opacity:.45; cursor:not-allowed }
.w8-child button.primary { background:#2269b5; color:#fff; border-color:#2269b5; font-weight:600 }
.w8-heading { display:flex; justify-content:space-between; gap:14px; align-items:flex-start }
.w8-heading h2 { margin:4px 0; font-size:22px; color:#1e293b }
.w8-heading p,.panel p { color:#64748b; margin:5px 0 12px }
.crumb { font-size:12px; color:#6b7d90 }
.header-buttons,.controls,.actions { display:flex; gap:9px; align-items:center; flex-wrap:wrap }
.note { margin:15px 0; border-radius:9px; background:#eaf1fd; color:#445f7b; padding:11px; font-size:12px }
.revisions { display:flex; flex-wrap:wrap; align-items:center; gap:13px; background:white; padding:14px; border:1px solid #e2e8f0; border-radius:12px }
.revisions div { flex:1; min-width:130px; display:flex; flex-direction:column }
.revisions small,.suggestions small { color:#718096 }
.revisions strong { font-size:20px }
.revisions button { margin-left:auto; background:#fff8e7; color:#8b5e1a; border-color:#efd6a9 }
.notice { color:#24603f; background:#edf8ef; padding:10px 13px; border-radius:9px; margin:14px 0 }
.columns { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:15px }
.panel { min-width:0; background:#fff; border:1px solid #e2e8f0; border-radius:13px; padding:20px; display:flex; flex-direction:column; align-items:flex-start; gap:11px }
.panel h3 { margin:0; font-size:17px }.panel button { max-width:100% }
.subtle,.phase,.next { padding:11px; background:#f5f8fc; border-radius:9px; color:#65758a; width:100% }
.warning { color:#994e37 !important; background:#fff3ea; padding:10px; border-radius:9px; width:100% }
.ok { color:#267149 !important }
.suggestions { width:100%; display:flex; flex-direction:column; gap:9px; margin-top:10px; border-top:1px solid #e5eaf0; padding-top:14px }
.suggestions label { display:flex; align-items:flex-start; gap:10px; border:1px solid #e5eaf0; padding:10px; border-radius:8px }
.suggestions label span { display:flex; flex-direction:column }
.suggestions input { accent-color:#2269b5 }
.overlay { position:absolute; inset:0; z-index:5; display:flex; justify-content:center; align-items:center; padding:20px; background:#1e293b80; border-radius:14px }
.dialog { background:white; border-radius:14px; padding:23px; max-width:480px; width:100%; box-shadow:0 12px 36px #11182745 }
.dialog h3 { font-size:20px; margin:9px 0 }.dialog p { color:#53647a; line-height:1.65 }
.warning-mark { width:37px; height:37px; display:grid; place-items:center; border-radius:50%; background:#fff1d7; color:#a86e18; font-size:22px; font-weight:800 }
.actions { justify-content:flex-end; margin-top:18px }
@media (max-width:900px) { .columns { grid-template-columns:1fr } }
@media (max-width:600px) { .w8-child { padding:14px }.w8-heading { flex-direction:column } .header-buttons { align-self:flex-start }.dialog { padding:15px } }
</style>
