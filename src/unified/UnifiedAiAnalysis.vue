<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { aiAnalysis, dataSync } from "../services";
import type { Output } from "../../shared/protocol/registry";
import type { DateSelectionInput } from "../../shared/workspace-contracts";
import DateRangeControl from "../components/DateRangeControl.vue";
const props = defineProps<{ deckId: string }>(),
  emit = defineEmits<{ back: [] }>();
const page = ref<"export" | "prompt">("export"),
  saved = shallowRef<Output<"learning.aiAdjustment.prompt.get">>(),
  text = ref(""),
  date = ref<DateSelectionInput>({ range: "all" }),
  images = ref(false),
  busy = ref(false),
  saving = ref(false),
  loading = ref(false),
  error = ref(""),
  message = ref(""),
  progress = shallowRef<Output<"learning.aiAdjustment.export.status">>();
const preview = shallowRef<Output<"learning.aiAdjustment.preview.page">>(),
  importing = ref(false),
  previewLoading = ref(false);
const actionNames: Record<string, string> = {
  "deck.policy.retention.set": "卡片集留存率",
  "card.policy.max_interval.set": "单卡最大间隔",
  "knowledge.cards.max_interval.set": "知识点关联卡片最大间隔",
  "card.schedule.advance_due": "提前未来复习",
};
async function importZip() {
  if (importing.value) return;
  importing.value = true;
  preview.value = undefined;
  error.value = "";
  message.value = "";
  try {
    const r = await aiAnalysis.openPreview(props.deckId);
    if (!disposed) {
      preview.value = r ?? undefined;
      if (!r) message.value = "已取消导入，未修改任何学习数据。";
    }
  } catch (e) {
    if (!disposed) error.value = "导入未完成：" + String(e);
  } finally {
    importing.value = false;
  }
}
async function readPreview(offset = preview.value?.offset ?? 0) {
  const old = preview.value;
  if (!old || previewLoading.value) return;
  previewLoading.value = true;
  try {
    const r = await aiAnalysis.previewPage({
      deckId: props.deckId,
      token: old.token,
      offset,
      limit: 50,
    });
    if (!disposed && preview.value?.token === old.token) preview.value = r;
  } catch (e) {
    if (!disposed && preview.value?.token === old.token) {
      preview.value = {
        ...old,
        stale: true,
        staleReason: "预览校验未完成，请重新导入",
      };
      error.value = String(e);
    }
  } finally {
    previewLoading.value = false;
  }
}
async function cancelPreview() {
  const old = preview.value;
  preview.value = undefined;
  if (!old) return;
  try {
    await aiAnalysis.closePreview({ deckId: props.deckId, token: old.token });
    if (!disposed) message.value = "已取消预览，未修改任何学习数据。";
  } catch (e) {
    if (!disposed) error.value = "预览关闭未确认：" + String(e);
  }
}
const unsubscribe = dataSync.subscribe(() => {
  if (preview.value) {
    preview.value = {
      ...preview.value,
      stale: true,
      staleReason: "数据已变化，正在核对预览修订…",
    };
    void readPreview();
  }
});
const dirty = computed(() => !!saved.value && text.value !== saved.value.text);
let jobId = "",
  timer: ReturnType<typeof setTimeout> | undefined,
  disposed = false,
  generation = 0;
const phaseNames = {
  idle: "准备中",
  choosing: "选择保存位置",
  writing: "正在导出全部卡片与学习事件",
  validating: "正在校验ZIP完整性",
  done: "导出完成",
  cancelled: "已取消",
  failed: "导出失败",
};
async function loadPrompt() {
  const token = ++generation;
  loading.value = true;
  error.value = "";
  try {
    const p = await aiAnalysis.prompt();
    if (!disposed && token === generation) {
      saved.value = p;
      text.value = p.text;
    }
  } catch (e) {
    if (!disposed && token === generation) error.value = String(e);
  } finally {
    if (!disposed && token === generation) loading.value = false;
  }
}
async function editPrompt() {
  page.value = "prompt";
  message.value = "";
  await loadPrompt();
}
function cancelPrompt() {
  if (saving.value) return;
  generation++;
  text.value = saved.value?.text ?? "";
  page.value = "export";
  error.value = "";
  message.value = "已放弃本次 Prompt 修改。";
}
async function savePrompt() {
  if (!saved.value || saving.value) return;
  saving.value = true;
  error.value = "";
  try {
    const p = await aiAnalysis.savePrompt({
      format: saved.value.format,
      text: text.value,
      expectedRevision: saved.value.revision,
    });
    if (!disposed) {
      saved.value = p;
      text.value = p.text;
      if (preview.value) void readPreview();
      message.value = "Prompt 已保存，将用于下一次导出。";
      page.value = "export";
    }
  } catch (e) {
    if (!disposed)
      error.value = "Prompt 未确认保存，编辑内容已保留。" + String(e);
  } finally {
    saving.value = false;
  }
}
async function poll(id: string) {
  try {
    const v = await aiAnalysis.status(id);
    if (!disposed && busy.value && id === jobId) progress.value = v;
  } catch (e) {
    if (!disposed && busy.value) error.value = "导出进度暂不可读。" + String(e);
  }
  if (!disposed && busy.value && id === jobId)
    timer = setTimeout(() => void poll(id), 400);
}
async function exportZip() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  message.value = "";
  jobId = crypto.randomUUID();
  const id = jobId;
  progress.value = { phase: "choosing", cardCount: 0, eventCount: 0, bytes: 0 };
  void poll(id);
  try {
    const r = await aiAnalysis.export({
      deckId: props.deckId,
      jobId: id,
      date: date.value,
      includeImages: images.value,
    });
    if (!disposed)
      message.value = r.saved
        ? `已导出 ${r.name} · ${r.cardCount} 张卡片 / ${r.eventCount} 条学习事件。`
        : "导出已取消，未生成新文件。";
  } catch (e) {
    if (!disposed) error.value = "导出未完成：" + String(e);
  } finally {
    busy.value = false;
    if (timer) clearTimeout(timer);
    jobId = "";
    progress.value = undefined;
  }
}
async function cancelExport() {
  if (!jobId) return;
  try {
    await aiAnalysis.cancel(jobId);
    if (!disposed) message.value = "正在取消并清理临时文件…";
  } catch (e) {
    if (!disposed) error.value = "取消请求未确认：" + String(e);
  }
}
function close() {
  if (busy.value || saving.value || importing.value) {
    error.value = "请先取消导出或等待保存完成。";
    return false;
  }
  if (page.value === "prompt" && dirty.value) {
    error.value = "Prompt 尚未保存，请保存或点击取消修改。";
    return false;
  }
  return true;
}
function back() {
  if (close()) emit("back");
}
onMounted(loadPrompt);
onBeforeUnmount(() => {
  unsubscribe();
  if (preview.value)
    void aiAnalysis
      .closePreview({ deckId: props.deckId, token: preview.value.token })
      .catch(() => {});
  disposed = true;
  generation++;
  if (timer) clearTimeout(timer);
  if (jobId) void aiAnalysis.cancel(jobId).catch(() => {});
});
defineExpose({ close });
</script>
<template>
  <section
    class="ai-analysis"
    aria-label="AI 调度调整"
    :aria-busy="busy || saving || importing"
  >
    <div class="page-heading">
      <div>
        <h1>{{ page === "prompt" ? "编辑分析 Prompt" : "AI 调度调整" }}</h1>
        <p>离线导出学习数据，由你决定何时交给外部 AI 分析。</p>
      </div>
      <button
        :disabled="busy || saving || importing"
        @click="page === 'prompt' ? cancelPrompt() : back()"
      >
        {{ page === "prompt" ? "取消修改并返回" : "返回学习分析" }}
      </button>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="message" role="status">{{ message }}</p>
    <template v-if="page === 'export'"
      ><section class="surface padded" aria-label="导出分析设置">
        <h2>导出分析 ZIP</h2>
        <p>
          完整导出当前卡片集的全部已发布卡片、关联知识点、学习历史和当前调度快照。没有卡片数量上限；大数据会自动分成多个文件。
        </p>
        <h3>统计摘要日期</h3>
        <DateRangeControl v-model="date" />
        <p class="tiny-meta">
          日期仅限定摘要的历史统计区间；卡片和学习事件仍完整导出，不裁剪历史。
        </p>
        <label class="image-choice"
          ><input
            v-model="images"
            type="checkbox"
            :disabled="busy"
          />附带图片（逐个校验、去重）</label
        >
        <p class="tiny-meta">
          默认不附图片，含图内容会标记材料不完整，AI
          不得猜测图像内容。单条内容超过256KiB或图片超过20MiB时明确报错。
        </p>
        <div class="ai-actions">
          <button
            class="primary"
            :disabled="busy || loading || !saved"
            @click="exportZip"
          >
            导出分析 ZIP</button
          ><button :disabled="busy || loading" @click="editPrompt">
            修改 Prompt</button
          ><button v-if="!saved" :disabled="loading" @click="loadPrompt">
            重新读取 Prompt</button
          ><button v-if="busy" @click="cancelExport">取消导出</button>
        </div>
        <div v-if="progress" class="export-progress" role="status">
          <strong>{{ phaseNames[progress.phase] }}</strong>
          <p>
            {{ progress.cardCount }} 张卡片 ·
            {{ progress.eventCount }} 条学习事件 ·
            {{ (progress.bytes / 1024).toFixed(1) }} KiB 数据
          </p>
        </div>
      </section>
      <section class="surface padded margin-top" aria-label="AI 建议导入预览">
        <h2>导入 AI 调度建议</h2>
        <p>
          先选择本次原始分析 ZIP，再选择 AI 返回
          ZIP。校验全部分片、来源和当前修订后，只读展示全部建议。导入与取消不修改学习数据。
        </p>
        <div class="ai-actions">
          <button :disabled="busy || importing" @click="importZip">
            {{ importing ? "正在校验全部建议…" : "导入建议 ZIP" }}</button
          ><button disabled title="本轮尚未开放执行">执行建议（未开放）</button
          ><button disabled>撤销（未开放）</button>
        </div>
        <div v-if="preview" aria-label="建议预览结果">
          <p class="tiny-meta">
            来源 {{ preview.source.exportId }} · 快照
            {{ preview.source.snapshotId }} · 修订
            {{ preview.source.dataRevision }}
          </p>
          <p role="status">
            共 {{ preview.total }} 条 · 合法 {{ preview.valid }} · 冲突
            {{ preview.conflict }} · 拒绝 {{ preview.rejected }}
          </p>
          <p v-if="preview.stale" role="alert">{{ preview.staleReason }}</p>
          <p
            v-for="row in preview.rows"
            :key="row.index"
            class="preview-row"
            :data-preview-index="row.index"
          >
            <strong
              >{{ row.index + 1 }}. {{ actionNames[row.type] ?? row.type }} ·
              {{
                { valid: "合法", conflict: "冲突", rejected: "拒绝" }[
                  row.status
                ]
              }}</strong
            ><br />
            目标：{{ row.target }} · {{ row.affectedCardCount }} 张卡片<br />
            调整前 {{ row.before }} → 调整后 {{ row.after }}<br />
            原因：{{ row.reason || "未提供" }}<br v-if="row.rejection" /><span
              v-if="row.rejection"
              >{{ row.rejection }}</span
            >
          </p>
          <div class="ai-actions">
            <button
              :disabled="previewLoading || preview.offset === 0"
              @click="readPreview(Math.max(0, preview.offset - 50))"
            >
              上一页</button
            ><span
              >{{ preview.total === 0 ? 0 : preview.offset + 1 }}–{{
                Math.min(preview.offset + preview.rows.length, preview.total)
              }}
              / {{ preview.total }}</span
            ><button
              :disabled="
                previewLoading ||
                preview.offset + preview.rows.length >= preview.total
              "
              @click="readPreview(preview.offset + 50)"
            >
              下一页</button
            ><button :disabled="previewLoading" @click="readPreview()">
              校验预览修订</button
            ><button @click="cancelPreview">取消预览</button>
          </div>
        </div>
      </section>
      <aside class="surface padded margin-top">
        <h2>私人数据提示</h2>
        <p>
          ZIP
          包含题目、答案、评分、反思、用时、学习历史和调度配置。导出只写入你选择的本地文件，不会上传数据，也不会修改
          FSRS、排期或学习记录。
        </p>
        <p>
          Prompt 会要求 AI
          先分析全卡片集和知识点摘要，再按索引读取全部分片；未完成全量分析必须说明实际覆盖率。
        </p>
        <p class="tiny-meta">
          AI 建议支持安全导入和只读预览；执行与撤销尚未开放，不生成已执行日志。
        </p>
      </aside></template
    >
    <section
      v-else
      class="surface padded prompt-panel"
      aria-label="Prompt 编辑"
    >
      <p v-if="loading">正在读取 Prompt…</p>
      <template v-else-if="saved"
        ><label for="analysis-prompt"
          >分析指令（显式保存后用于下一次 ZIP）</label
        ><textarea
          id="analysis-prompt"
          v-model="text"
          :disabled="saving"
          maxlength="100000"
          spellcheck="false"
        />
        <div class="ai-actions">
          <span class="tiny-meta"
            >{{ text.length }} / 100000 字符 ·
            {{ dirty ? "尚未保存" : "已保存版本 " + saved.revision }}</span
          ><button
            class="primary"
            :disabled="saving || !dirty || !text.trim()"
            @click="savePrompt"
          >
            保存 Prompt</button
          ><button :disabled="saving" @click="cancelPrompt">取消修改</button>
        </div></template
      ><button v-else :disabled="loading" @click="loadPrompt">
        重新读取 Prompt
      </button>
    </section>
  </section>
</template>
<style scoped>
.preview-row {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  overflow-wrap: anywhere;
}
.ai-analysis {
  min-width: 0;
}
.ai-analysis p {
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.ai-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 18px;
}
.image-choice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 18px 0 6px;
}
.image-choice input {
  width: auto;
}
.export-progress {
  margin-top: 18px;
  padding: 14px;
  border-radius: 12px;
  background: var(--primary-soft, #e9f4ee);
}
.prompt-panel label {
  display: block;
  margin-bottom: 12px;
}
.prompt-panel textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: clamp(260px, 48vh, 580px);
  resize: vertical;
  font: 13px/1.8 var(--font-family, sans-serif);
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
}
.ai-analysis [role="alert"] {
  color: var(--danger, #a23d37);
}
.ai-analysis .page-heading {
  gap: 12px;
  flex-wrap: wrap;
}
.ai-analysis .page-heading button {
  flex-shrink: 0;
}
</style>
