<script setup lang="ts">
/**
 * W8 AI 分析工作流视觉/操作原型。仅模拟数据和进度。
 * 不接 IPC、文件系统、SQLite 或外部 AI；不可作为生产验证证据。
 */
import { computed, onBeforeUnmount, ref } from "vue";

type View = "workflow" | "overview" | "history" | "compare";
type ExportPhase = "idle" | "writing" | "validating" | "done" | "cancelled";
type SourceScenario = "matched" | "missing" | "stale";
type SuggestionStatus = "valid" | "conflict" | "rejected";
type Suggestion = {
  id: string;
  label: string;
  target: string;
  before: string;
  after: string;
  reason: string;
  affected: number;
  status: SuggestionStatus;
};
const samples: Suggestion[] = [
  { id: "a1", label: "卡片集留存率", target: "行测专项", before: "90%", after: "92%", reason: "长期记忆稳定性优先", affected: 210, status: "valid" },
  { id: "a2", label: "单卡最大间隔", target: "言语理解 · 卡片 012", before: "90 天", after: "60 天", reason: "近期出现遗忘风险", affected: 1, status: "valid" },
  { id: "a3", label: "提前未来复习", target: "资料分析 · 卡片 083", before: "11月05日", after: "11月03日", reason: "需要尽早巩固", affected: 1, status: "valid" },
  { id: "a4", label: "知识点关联卡片最大间隔", target: "数量关系 → 工程问题", before: "120 天", after: "75 天", reason: "与同一目标的其他建议冲突", affected: 24, status: "conflict" },
  { id: "a5", label: "单卡最大间隔", target: "数量关系 → 工程问题（重叠目标）", before: "120 天", after: "45 天", reason: "与知识点建议互相覆盖", affected: 1, status: "conflict" },
  { id: "a6", label: "不支持的动作", target: "FSRS 内部状态", before: "不适用", after: "拒绝修改", reason: "不属于 W5 四类允许的调度调整", affected: 0, status: "rejected" }
];

const view = ref<View>("workflow");
const exportPhase = ref<ExportPhase>("idle");
const percent = ref(0);
const detailsOpen = ref(false);
const includeImages = ref(false);
const dateRange = ref("all");
const editingPrompt = ref(false);
const promptText = ref("请完整分析 ZIP 中卡片和学习事件，仅返回允许的调度调整建议 ZIP。");
const toast = ref("");
const scenario = ref<SourceScenario>("matched");
const imported = ref(false);
const sourceRecovered = ref(false);
const chosen = ref<Set<string>>(new Set(samples.filter(s => s.status === "valid").map(s => s.id)));
const verifying = ref(false);
const confirmOpen = ref(false);
const applied = ref(false);
const undone = ref(false);
const laterStudy = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;
let checkTimer: ReturnType<typeof setTimeout> | undefined;
const validCount = samples.filter(s => s.status === "valid").length;
const conflictCount = samples.filter(s => s.status === "conflict").length;
const rejectedCount = samples.filter(s => s.status === "rejected").length;
const selectedCount = computed(() => chosen.value.size);
const affectedCount = computed(() =>
  samples.filter(s => chosen.value.has(s.id) && s.status === "valid").reduce((n, s) => n + s.affected, 0)
);
const sourceMissing = computed(() => scenario.value === "missing" && !sourceRecovered.value);
const dbRevision = ref(128);
const originalAnalysisRevision = 128;
const latestExportRevision = ref<number | null>(128);
const exportStartedRevision = ref<number | null>(null);
const importedSuggestionRevision = ref<number | null>(null);
const staleLocked = ref(false);
const freshAiReady = ref(false);
const freshAiRevision = ref<number | null>(null);
const stale = computed(() => imported.value && (staleLocked.value || scenario.value === "stale" || importedSuggestionRevision.value !== dbRevision.value));
const exportedOutdated = computed(() => latestExportRevision.value !== null && latestExportRevision.value !== dbRevision.value);
const staleDialogOpen = ref(false);
const awaitingNewAiZip = ref(false);
const exportRunning = computed(() => exportPhase.value === "writing" || exportPhase.value === "validating");
const fileName = "GankSoft-v0.7.7-20261101-ai-analysis.zip";
const statusLabel = computed(() => ({
  idle: "尚未导出",
  writing: "正在导出卡片与学习事件",
  validating: "正在校验 ZIP 完整性",
  done: "导出已完成",
  cancelled: "已取消并清理"
})[exportPhase.value]);
function clearClock() {
  if (timer) clearInterval(timer);
  if (checkTimer) clearTimeout(checkTimer);
  timer = undefined;
  checkTimer = undefined;
}
function showStaleDialog() {
  if (!imported.value || applied.value) return;
  if (checkTimer) clearTimeout(checkTimer);
  checkTimer = undefined;
  verifying.value = false;
  confirmOpen.value = false;
  staleLocked.value = true;
  staleDialogOpen.value = true;
  toast.value = "原始分析快照与当前学习数据库修订不一致，旧 AI 建议已失效，未执行任何调整。";
}
function dismissStaleDialog() {
  staleDialogOpen.value = false;
  toast.value = "旧 AI 建议仍然失效，无法应用。可以稍后重新导出。";
}
function reexportAfterChange() {
  staleDialogOpen.value = false;
  confirmOpen.value = false;
  imported.value = false;
  importedSuggestionRevision.value = null;
  sourceRecovered.value = false;
  awaitingNewAiZip.value = true;
  freshAiReady.value = false;
  freshAiRevision.value = null;
  staleLocked.value = true;
  scenario.value = "matched";
  view.value = "workflow";
  exportData();
  toast.value = "正在模拟导出最新学习数据。请把新 ZIP 交给外部 AI 重新生成建议，再导入新返回包。";
}
function exportData() {
  if (exportRunning.value) return;
  clearClock();
  exportStartedRevision.value = dbRevision.value;
  freshAiReady.value = false;
  freshAiRevision.value = null;
  percent.value = 0;
  exportPhase.value = "writing";
  toast.value = "已启动模拟后台导出，可以切换到学习分析概览。";
  timer = setInterval(() => {
    if (exportPhase.value === "writing") {
      percent.value = Math.min(88, percent.value + 5);
      if (percent.value >= 88) exportPhase.value = "validating";
    } else if (exportPhase.value === "validating") {
      percent.value = Math.min(100, percent.value + 3);
      if (percent.value >= 100) {
        exportPhase.value = "done";
        latestExportRevision.value = exportStartedRevision.value;
        clearClock();
        toast.value = exportedOutdated.value
          ? "演示：ZIP 已生成，但导出期间数据库更新，固定快照已过期，请重新导出。"
          : "演示：ZIP 已完成完整性校验，可自行交给外部 AI 分析。";
      }
    }
  }, 110);
}
function cancelExport() {
  if (!exportRunning.value) return;
  clearClock();
  exportPhase.value = "cancelled";
  toast.value = "演示：已取消导出并清理临时文件。";
}
function simulateExternalAi() {
  if (exportPhase.value !== "done" || exportedOutdated.value || latestExportRevision.value === null) {
    toast.value = "分析 ZIP 尚未完成或快照已过期，不能模拟生成有效新建议。";
    return;
  }
  freshAiReady.value = true;
  freshAiRevision.value = latestExportRevision.value;
  toast.value = "演示：外部 AI 已根据最新分析 ZIP 生成新的建议（没有实际调用 AI）。";
}
function tryOldAiZip() {
  imported.value = true;
  importedSuggestionRevision.value = originalAnalysisRevision;
  staleLocked.value = true;
  showStaleDialog();
}
function chooseAiZip() {
  if (awaitingNewAiZip.value) {
    if (!freshAiReady.value || freshAiRevision.value !== dbRevision.value || exportedOutdated.value) {
      toast.value = "旧 AI 建议仍不可用：必须先完成最新 ZIP 导出，再交给外部 AI 重新生成新建议。";
      if (exportedOutdated.value) staleDialogOpen.value = true;
      return;
    }
    importedSuggestionRevision.value = freshAiRevision.value;
    staleLocked.value = false;
    awaitingNewAiZip.value = false;
    freshAiReady.value = false;
    scenario.value = "matched";
  } else {
    importedSuggestionRevision.value = originalAnalysisRevision;
  }
  staleDialogOpen.value = false;
  imported.value = true;
  applied.value = false;
  undone.value = false;
  chosen.value = new Set(samples.filter(s => s.status === "valid").map(s => s.id));
  sourceRecovered.value = false;
  if (sourceMissing.value) toast.value = "未找到原始分析 ZIP，请按精确来源补选后重新验证。";
  else if (stale.value) showStaleDialog();
  else toast.value = "演示：已验证 AI ZIP 的来源修订及原始 W4 ZIP，允许预览合法建议。";
}
function chooseSource() {
  sourceRecovered.value = true;
  if (stale.value) showStaleDialog();
  else toast.value = "演示：补选的原始分析 ZIP 经完整性、来源和数据库修订校验通过。";
}
function setScenario(value: SourceScenario) {
  scenario.value = value;
  if (value === "stale") {
    dbRevision.value += 1;
    staleLocked.value = true;
    if (imported.value && !applied.value) showStaleDialog();
    else toast.value = "演示：学习数据库修订已更新；旧建议和旧快照不能直接套用。";
  } else if (imported.value) {
    sourceRecovered.value = false;
    confirmOpen.value = false;
    toast.value = staleLocked.value ? "切换演示选项不会恢复已锁定的旧 AI 建议。" : "已切换来源文件情景，必须重新校验来源。";
  }
}
function selectValid() {
  chosen.value = new Set(samples.filter(s => s.status === "valid").map(s => s.id));
}
function clearSelection() {
  chosen.value = new Set();
}
function toggle(id: string) {
  const item = samples.find(s => s.id === id);
  if (!item || item.status !== "valid") return;
  const next = new Set(chosen.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  chosen.value = next;
}
function prepareToApply() {
  if (stale.value) { showStaleDialog(); return; }
  if (!imported.value || sourceMissing.value || !selectedCount.value || verifying.value || applied.value) return;
  verifying.value = true;
  const preparedAgainst = dbRevision.value;
  toast.value = "正在模拟自动只读校验（无需额外点击确认）。";
  checkTimer = setTimeout(() => {
    verifying.value = false;
    if (preparedAgainst !== dbRevision.value || stale.value) {
      showStaleDialog();
      return;
    }
    confirmOpen.value = true;
  }, 520);
}
function applyConfirmed() {
  if (stale.value) { showStaleDialog(); return; }
  if (!confirmOpen.value || !selectedCount.value || sourceMissing.value) return;
  confirmOpen.value = false;
  applied.value = true;
  undone.value = false;
  view.value = "workflow";
  toast.value = "演示：用户最终确认后，整组建议已标记应用。未触及真实数据库。";
}
function undo() {
  if (!applied.value || undone.value) return;
  if (laterStudy.value) {
    toast.value = "后续已有学习变化，整组撤销被安全拒绝。";
    return;
  }
  undone.value = true;
  toast.value = "演示：满足安全条件，本组操作已撤销。";
}
function reset() {
  clearClock();
  view.value = "workflow";
  exportPhase.value = "idle";
  percent.value = 0;
  imported.value = false;
  chosen.value = new Set(samples.filter(s => s.status === "valid").map(s => s.id));
  sourceRecovered.value = false;
  scenario.value = "matched";
  dbRevision.value = 128;
  latestExportRevision.value = 128;
  exportStartedRevision.value = null;
  importedSuggestionRevision.value = null;
  staleLocked.value = false;
  freshAiReady.value = false;
  freshAiRevision.value = null;
  staleDialogOpen.value = false;
  awaitingNewAiZip.value = false;
  applied.value = false;
  undone.value = false;
  laterStudy.value = false;
  confirmOpen.value = false;
  verifying.value = false;
  toast.value = "已重置演示。";
}
onBeforeUnmount(clearClock);
</script>

<template>
  <main class="w8-prototype">
    <aside class="rail" aria-label="GankSoft 导航预览">
      <span class="brand-dot">G</span>
      <button title="学习分析概览" :class="{ active: view === 'overview' }" @click="view = 'overview'">▥</button>
      <button title="AI 调度调整" :class="{ active: view === 'workflow' }" @click="view = 'workflow'">✧</button>
      <button title="变更记录" :class="{ active: view === 'history' }" @click="view = 'history'">◷</button>
      <button title="新旧流程比较" :class="{ active: view === 'compare' }" @click="view = 'compare'">⇄</button>
    </aside>
    <div class="content">
      <header class="header">
        <div>
          <div class="breadcrumb">学习分析 / <strong>AI 调度调整</strong> · W8 设计原型</div>
          <h1>{{ view === 'compare' ? '旧版与 W8 操作对比' : view === 'history' ? '调度调整记录' : view === 'overview' ? '学习分析概览（模拟）' : 'AI 学习分析与调度调整' }}</h1>
          <p>离线 AI 工作流 · 数据不会自动发送给 AI，只有最终确认才会修改调度。</p>
        </div>
        <div class="header-buttons"><button class="subtle" v-if="view !== 'overview'" @click="view = 'overview'">返回学习分析</button><button class="subtle" @click="reset">重置演示</button></div>
      </header>
      <div class="demo-note">交互模拟 · 左侧窄栏是父级应用外壳示意，正式 W8 子页不新增导航。修订、进度百分比、文件与建议均是合成值，不读取或修改 SQLite。</div>

      <div v-if="exportRunning || exportPhase === 'done'" class="task-bar" role="status">
        <div class="task-icon">↗</div>
        <div class="task-main"><strong>{{ statusLabel }}</strong><small>{{ exportRunning ? '模拟后台导出任务：离开此页仍会继续' : fileName }}</small></div>
        <div class="task-percent">{{ percent }}% <small>模拟</small></div>
        <button v-if="exportRunning" class="subtle" @click="cancelExport">取消</button>
        <button v-else class="subtle" @click="view = 'workflow'">查看详情</button>
        <div class="task-track"><span :style="{ width: percent + '%' }"></span></div>
      </div>
      <p v-if="toast" class="toast" role="status">{{ toast }}</p>

      <section v-if="view === 'overview'" class="surface">
        <h2>学习分析概览</h2>
        <p>这里代表你切换到了学习分析的其他页面。上方任务条仍在，模拟导出也不会因切换页面而取消。</p>
        <div class="stats"><div><strong>1,240</strong><small>已发布卡片</small></div><div><strong>4,830</strong><small>学习事件</small></div><div><strong>58</strong><small>关联知识点</small></div></div>
        <button class="primary" @click="view = 'workflow'">返回 AI 调度调整</button>
      </section>

      <section v-else-if="view === 'compare'" class="surface">
        <h2>旧版 → 新版</h2>
        <div class="comparison"><div><h3>现有 W4 / W5</h3><p>导出时必须停留在当前页，离开可能取消任务。</p><p>导入时先选择原始分析 ZIP，再选择 AI 建议 ZIP。</p><p>选中 → 校验确认 → 前置校验 → 执行按钮 → 最终确认。</p></div><div><h3>W8 方案</h3><p>只选保存位置，导出由主进程持有；可切回学习页。</p><p>先选择 AI 建议 ZIP，自动核验并定位原始 ZIP，必要时补选。</p><p>合法项默认选中，点击应用触发内部校验，最后只确认一次。</p></div></div>
        <button class="primary" @click="view = 'workflow'">体验新流程</button>
      </section>

      <section v-else-if="view === 'history'" class="surface">
        <h2>最近一组调度调整（模拟）</h2>
        <div v-if="applied" class="history-line"><strong>{{ undone ? '已撤销' : '已应用' }} {{ selectedCount }} 条建议</strong><p>涉及 {{ affectedCount }} 张卡片 · 仅调整允许的调度字段</p></div>
        <div v-else class="empty">还没有在本次模拟中应用建议。</div>
        <label class="inline-option"><input v-model="laterStudy" type="checkbox">模拟应用后发生了新的正式学习</label>
        <button class="subtle" :disabled="!applied || undone" @click="undo">尝试撤销上一组调整</button>
        <button class="primary" @click="view = 'workflow'">返回操作流程</button>
      </section>

      <template v-else>
        <nav class="steps" aria-label="工作流程">
          <span :class="{ current: !imported }"><b>1</b>导出学习数据</span>
          <span class="connector">—</span>
          <span :class="{ current: exportPhase === 'done' && !imported }"><b>2</b>交给外部 AI</span>
          <span class="connector">—</span>
          <span :class="{ current: imported && !applied }"><b>3</b>导入并预览建议</span>
          <span class="connector">—</span>
          <span :class="{ current: applied }"><b>4</b>确认调度调整</span>
        </nav>
        <div class="two-column">
          <section class="surface panel">
            <div class="panel-title"><div class="circle">01</div><div><h2>导出给 AI 分析</h2><p>完整卡片、知识点、学习历史与当前调度快照</p></div></div>
            <div class="info"><strong>行测专项卡片集</strong><span>1,240 张卡片 · 4,830 条学习事件 · 58 个知识点</span></div>
            <div class="row"><span>分析范围</span><strong>完整数据（默认）</strong></div><div class="row"><span>当前数据库修订（模拟）</span><strong>{{ dbRevision }}</strong></div>
            <button class="link" @click="detailsOpen = !detailsOpen">{{ detailsOpen ? '收起高级设置 −' : '高级设置：图片、日期、Prompt +' }}</button>
            <div v-if="detailsOpen" class="advanced">
              <label>统计摘要范围<select v-model="dateRange"><option value="all">全部时间（推荐）</option><option value="90">最近 90 天（仅摘要）</option><option value="30">最近 30 天（仅摘要）</option></select></label>
              <label class="inline-option"><input v-model="includeImages" type="checkbox">附带图片资源（文件体积可能增加）</label>
              <p class="fine">日期选项不会裁剪卡片和学习历史；不附图片时，AI 可能缺少图片内容。</p>
              <button class="subtle" @click="editingPrompt = !editingPrompt">{{ editingPrompt ? '收起 Prompt 编辑' : '编辑给 AI 的说明 Prompt' }}</button>
              <textarea v-if="editingPrompt" v-model="promptText" rows="3" aria-label="模拟编辑 Prompt"></textarea>
            </div>
            <button class="primary wide" :disabled="exportRunning" @click="exportData">{{ exportRunning ? '正在生成分析 ZIP…' : exportPhase === 'done' ? '重新导出最新数据' : '导出分析 ZIP' }}</button>
            <div v-if="exportPhase !== 'idle'" class="phase">
              <strong>{{ statusLabel }}</strong>
              <p v-if="exportRunning">示意进度 {{ percent }}%；可点击侧边栏的「学习分析概览」继续浏览。</p>
              <p v-if="exportPhase === 'done'">{{ fileName }}<br>导出快照修订 {{ latestExportRevision }} / 当前修订 {{ dbRevision }}；GankSoft 不会自动上传给外部 AI。</p><p v-if="exportedOutdated" class="error">虽然 ZIP 已生成，但快照比当前数据库旧，必须重新导出才能用于本轮 AI 调度。</p>
              <p v-if="exportPhase === 'cancelled'">尚未产生正式 ZIP，可以重新导出。</p>
              <button v-if="exportPhase === 'done' && !exportedOutdated && awaitingNewAiZip" class="subtle" @click="simulateExternalAi">模拟外部 AI 根据新 ZIP 生成建议</button><p v-if="freshAiReady" class="success">新建议 ZIP 已重新生成（模拟），现在可以导入。</p><button v-if="exportPhase === 'done'" class="subtle" @click="toast = '演示：请自己将分析 ZIP 和内含 Prompt 交给外部 AI，软件不会代传。'">查看交给 AI 的说明</button>
            </div>
          </section>

          <section class="surface panel">
            <div class="panel-title"><div class="circle">02</div><div><h2>导入 AI 返回建议</h2><p>只需选择 AI 返回的 ZIP，自动查找分析来源</p></div></div>
            <div class="info"><strong>来源文件匹配</strong><span>W8 优先匹配最近一份原始分析 ZIP；失联时才补选。</span></div>
            <label class="scenario">演示异常情况
              <select :value="scenario" @change="setScenario(($event.target as HTMLSelectElement).value as SourceScenario)">
                <option value="matched">正常：自动找到原分析包</option>
                <option value="missing">异常：原分析包已移动 / 删除</option>
                <option value="stale">异常：学习数据修订已变化</option>
              </select>
            </label>
            <button class="primary wide" @click="chooseAiZip">{{ awaitingNewAiZip ? '导入新 AI 返回 ZIP（模拟）' : '选择 AI 返回 ZIP（模拟）' }}</button><button v-if="awaitingNewAiZip" class="subtle wide" @click="tryOldAiZip">再次导入旧 AI ZIP（验证必须拒绝）</button>
            <div v-if="imported" class="phase">
              <strong>已识别：AI 调度建议 ZIP</strong><p class="fine">建议来源修订 {{ importedSuggestionRevision ?? '待确认' }} · 当前数据库修订 {{ dbRevision }}</p>
              <p v-if="sourceMissing" class="error">未找到对应的原始分析 ZIP。必须补选并重新核验，不能跳过。</p>
              <p v-else-if="stale" class="error">当前学习修订已变化。旧建议不可应用，请重新导出并分析。</p>
              <p v-else class="success">原始分析 ZIP 已{{ sourceRecovered ? '补选并' : '自动找到并' }}完整核验 · 来源一致</p>
              <button v-if="sourceMissing" class="subtle" @click="chooseSource">补选原始分析 ZIP（模拟）</button>
            </div>
          </section>
        </div>

        <section v-if="imported && !sourceMissing" class="surface preview-section">
          <div class="preview-heading">
            <div><h2>建议预览与选择</h2><p>可执行 {{ validCount }} 条 · 冲突 {{ conflictCount }} 条 · 拒绝 {{ rejectedCount }} 条；冲突与拒绝项不能被执行。</p></div>
            <span class="count">已选 {{ selectedCount }} / {{ validCount }}</span>
          </div>
          <div class="select-actions"><button class="subtle" :disabled="stale" @click="selectValid">选择全部合法建议</button><button class="subtle" @click="clearSelection">清空选择</button><button v-if="!stale && !applied" class="subtle" @click="setScenario('stale')">模拟复盘后数据变化</button></div>
          <div class="suggestions">
            <label v-for="item in samples" :key="item.id" class="suggestion" :class="{ disabled: item.status !== 'valid' }">
              <input type="checkbox" :disabled="item.status !== 'valid' || stale || applied" :checked="chosen.has(item.id)" @change="toggle(item.id)">
              <span class="suggestion-body">
                <span class="suggestion-title"><strong>{{ item.label }}</strong><span class="status-tag" :class="item.status">{{ item.status === 'valid' ? '可执行' : item.status === 'conflict' ? '冲突' : '已拒绝' }}</span></span>
                <span class="small">{{ item.target }} · {{ item.affected }} 张卡片</span>
                <span class="change">{{ item.before }} <b>→</b> {{ item.after }}</span>
                <span class="small">{{ item.reason }}</span>
              </span>
            </label>
          </div>
          <div v-if="applied" class="success-result">
            <strong>{{ undone ? '已撤销本组调整（模拟）' : '本组建议已应用（模拟）' }}</strong>
            <p>建议 {{ selectedCount }} 条 · 涉及 {{ affectedCount }} 张卡片。实际产品会同步学习分析并保存审计记录。</p>
            <button class="subtle" @click="view = 'history'">查看调整记录与撤销</button>
          </div>
          <div v-else class="footer-cta">
            <div><strong>本次将应用 {{ selectedCount }} 条建议</strong><p>先自动安全校验，再进行一次最终确认。</p></div>
            <button class="primary" :disabled="!selectedCount || stale || verifying" @click="prepareToApply">{{ verifying ? '正在自动校验…' : '检查并应用' }}</button>
          </div>
        </section>
      </template>

      <div v-if="staleDialogOpen" class="dialog-backdrop" role="presentation">
        <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="w8-stale-title" aria-describedby="w8-stale-description">
          <h2 id="w8-stale-title">⚠ 学习数据库已经更新</h2>
          <p id="w8-stale-description">建议来源修订 {{ importedSuggestionRevision ?? latestExportRevision }}；当前数据库修订 {{ dbRevision }}。旧建议已失效，不能继续应用。</p>
          <p>请重新导出最新的完整学习数据，由你自行交给外部 AI 重新分析，再导入新生成的建议 ZIP。软件不会自动发送给 AI。</p>
          <div class="dialog-actions">
            <button class="subtle" @click="dismissStaleDialog">暂不处理</button>
            <button class="primary" @click="reexportAfterChange">重新导出最新分析 ZIP</button>
          </div>
        </div>
      </div>
      <div v-if="confirmOpen" class="dialog-backdrop" role="presentation">
        <div class="dialog" role="dialog" aria-modal="true" aria-label="最终确认 AI 调度调整">
          <h2>确认应用 AI 调度调整？</h2>
          <p>系统已经完成模拟只读校验。将一次性应用 <b>{{ selectedCount }}</b> 条建议，涉及 <b>{{ affectedCount }}</b> 张卡片。</p>
          <p class="fine">正式实现仍须重新核验数据修订、执行 W5 事务与回执；应用后若继续学习，可能无法撤销。</p>
          <div class="dialog-actions"><button class="subtle" @click="setScenario('stale')">模拟此刻数据库更新</button><button class="subtle" @click="confirmOpen = false">取消，不修改</button><button class="primary" @click="applyConfirmed">确认应用</button></div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.w8-prototype{display:flex;min-height:700px;border:1px solid #e3e6ea;border-radius:16px;overflow:hidden;background:#f7f8fa;color:#1d2939;font:14px/1.55 system-ui,-apple-system,"Microsoft YaHei",sans-serif}
.w8-prototype *{box-sizing:border-box}
.w8-prototype button,.w8-prototype select,.w8-prototype textarea{font:inherit}
.header-buttons{display:flex;gap:8px;flex-wrap:wrap}.task-percent small{color:#667085;font-size:10px;font-weight:400}
.rail{width:54px;flex-shrink:0;padding:16px 8px;display:flex;align-items:center;gap:12px;flex-direction:column;background:#202c39}
.rail button{width:38px;height:38px;background:transparent;border:0;color:#bfc9d3;border-radius:9px;font-size:22px;cursor:pointer}
.rail button.active,.rail button:hover{color:#fff;background:#3b4e62}
.brand-dot{display:grid;place-items:center;width:34px;height:34px;background:#dfb870;color:#182537;border-radius:10px;font-size:17px;font-weight:800;margin-bottom:14px}
.content{flex:1;min-width:0;position:relative;padding:26px 30px 40px}
.header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.header h1{font-size:24px;line-height:1.3;margin:6px 0}
.header p,.panel p,.surface p{color:#667085;margin:4px 0 12px}
.breadcrumb{color:#667085;font-size:12px}
.demo-note{margin:14px 0;padding:9px 12px;border-radius:8px;background:#eff2f8;font-size:12px;color:#485a77}
.task-bar{display:flex;align-items:center;gap:12px;padding:12px 14px 18px;background:#edf4ff;border:1px solid #d3e4ff;border-radius:12px;position:relative;margin-bottom:16px}
.task-icon{font-size:20px;color:#1b65b5}
.task-main{display:flex;flex:1;min-width:0;flex-direction:column}
.task-main small{overflow-wrap:anywhere;color:#667085}
.task-percent{font-weight:700}
.task-track{position:absolute;left:14px;right:14px;bottom:7px;background:#ccdef6;height:4px;border-radius:10px;overflow:hidden}
.task-track span{display:block;height:100%;background:#2671c9;transition:width .15s}
.toast{background:#eaf7ee;color:#276143;border-radius:8px;padding:10px 12px;margin:10px 0}
.steps{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:22px 0;color:#667085;font-size:12px}
.steps span:not(.connector){display:flex;align-items:center;gap:7px}
.steps b{width:23px;height:23px;display:grid;place-items:center;border-radius:50%;background:#e5e9ee;color:#526070}
.steps .current{color:#1764b8;font-weight:700}.steps .current b{background:#216cc0;color:#fff}
.connector{color:#c3cbd5}
.two-column{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.surface{background:#fff;border:1px solid #e3e8ef;box-shadow:0 2px 9px #132c4410;border-radius:14px;padding:20px;margin-bottom:16px;min-width:0}
.panel{display:flex;flex-direction:column;gap:12px}
.panel-title{display:flex;align-items:flex-start;gap:11px}
.circle{border-radius:10px;background:#eaf2fe;color:#2868ac;padding:8px;font-size:13px;font-weight:800}
.panel h2,.surface h2{margin:0;font-size:18px}.panel-title p{margin:2px 0}
.info{padding:13px;background:#f8fafc;border:1px solid #edf0f5;border-radius:10px;display:flex;flex-direction:column;gap:2px}
.info span,.small{font-size:12px;color:#667085}
.row{display:flex;justify-content:space-between;gap:10px;font-size:13px;color:#667085}
.row strong{color:#344054}
.w8-prototype button{cursor:pointer;border-radius:9px;border:1px solid #d4dbe5;padding:9px 13px;transition:background .12s}
.w8-prototype button:disabled{opacity:.48;cursor:not-allowed}
button.primary{background:#2469b4;color:#fff;border-color:#2469b4;font-weight:650}
button.primary:hover:not(:disabled){background:#1e5899}
button.subtle{background:#fff;color:#344054}
button.subtle:hover:not(:disabled){background:#f2f5f9}
button.link{background:none;text-align:left;color:#2368b2;border:none;padding:2px 0}
button.wide{width:100%;margin-top:auto}
.advanced{padding:12px;background:#f8fafc;border-radius:10px;display:flex;flex-direction:column;gap:10px}
.advanced label:not(.inline-option){display:flex;flex-direction:column;gap:4px}
.w8-prototype select,.w8-prototype textarea{width:100%;border:1px solid #cfd8e5;background:#fff;border-radius:8px;padding:8px;min-width:0}
.inline-option{display:flex;align-items:center;gap:7px;margin:8px 0;color:#344054}
.inline-option input{accent-color:#2169b9}
.fine{font-size:12px;color:#6c7788}
.phase{border-top:1px solid #e7ebef;padding-top:12px}
.phase p{overflow-wrap:anywhere}
.scenario{font-size:12px;color:#667085;display:flex;flex-direction:column;gap:6px}
.success{color:#23714b!important}.error{color:#ad3835!important}
.preview-section{margin-top:2px}
.preview-heading{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.count{background:#eaf2fe;color:#1f66b1;padding:6px 10px;border-radius:18px;font-size:12px;white-space:nowrap}
.select-actions{display:flex;gap:7px;margin:11px 0 14px;flex-wrap:wrap}
.suggestions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.suggestion{border:1px solid #e2e7ee;border-radius:10px;display:flex;align-items:flex-start;gap:10px;padding:12px;cursor:pointer}
.suggestion.disabled{background:#f9fafb;cursor:default}
.suggestion input{margin-top:3px;accent-color:#276ab6}
.suggestion-body{display:flex;flex-direction:column;min-width:0;gap:3px}
.suggestion-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.status-tag{font-size:11px;padding:1px 6px;border-radius:8px;color:#256b44;background:#e5f4e9}
.status-tag.conflict{color:#94651b;background:#fff4d7}
.status-tag.rejected{color:#a23838;background:#fceaea}
.change{color:#1c568e;font-size:12px}
.footer-cta,.success-result{margin-top:18px;border-top:1px solid #e6ebf1;padding-top:15px;display:flex;gap:16px;justify-content:space-between;align-items:center}
.footer-cta p,.success-result p{margin-bottom:0}
.success-result{background:#eef9f2;border-radius:9px;padding:12px}
.empty{padding:20px;background:#f7f9fb;border-radius:10px;color:#667085}
.stats{display:flex;gap:12px;margin:22px 0}
.stats>div{display:flex;flex-direction:column;min-width:0;flex:1;padding:16px;background:#f8fafc;border-radius:10px}
.stats strong{font-size:23px}.stats small{color:#667085}
.comparison{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:20px 0}
.comparison>div{background:#f8fafc;padding:17px;border-radius:10px}
.comparison h3{margin:0 0 10px}
.history-line{padding:12px;background:#eef9f2;border-radius:10px;margin-top:14px}
.dialog-backdrop{position:absolute;inset:0;background:#1e293b70;display:flex;justify-content:center;align-items:center;padding:18px;z-index:3}
.dialog{width:min(450px,100%);padding:22px;background:#fff;border-radius:14px;box-shadow:0 18px 45px #141f2f55}
.dialog h2{margin:0 0 12px}.dialog p{line-height:1.7}
.dialog-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:22px;flex-wrap:wrap}
@media (max-width:1000px){.two-column{grid-template-columns:1fr}.suggestions{grid-template-columns:1fr}}
@media (max-width:560px){.content{padding:17px 13px}.header{flex-direction:column}.header h1{font-size:20px}.rail{width:48px}.steps{gap:5px}.connector{display:none}.footer-cta,.preview-heading{flex-direction:column;align-items:stretch}.comparison{grid-template-columns:1fr}}
</style>
