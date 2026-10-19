<script setup lang="ts">
import DiagnosisSettings from "./DiagnosisSettings.vue";
import { loadMessages } from "../composables/notifications";
import { services } from "../services";
import {
  themeMode,
  themeFailure,
  themeSaving,
  updateTheme,
  flushTheme,
  initializeTheme,
} from "../composables/preferences";
import {
  settingsPersistence,
  settingPages,
} from "../composables/settingsPersistence";
import TrashWorkspace from "./TrashWorkspace.vue";
import { ref, reactive, onMounted, onBeforeUnmount, computed } from "vue";
import { state, task, formatDate, working, notice, error } from "../store";

const props = defineProps<{ section?: string }>();
const emit = defineEmits<{ open: [id: string] }>();
let original = "";
const aiReady = ref(false);
const aiDirty = computed(
  () => aiReady.value && JSON.stringify(ai) !== original,
);
const operations = ref<
  Awaited<ReturnType<typeof services.maintenance.operations>>
>([]);
async function loadOperations() {
  operations.value = await services.maintenance.operations();
}
async function resolveOperation(requestId: string) {
  const note = prompt(
    "请先核对学习数据或导出文件，再记录核对结果（至少10字）。解除锁定不会撤销或重做上次操作。",
  );
  if (!note) return;
  const ok = await task(
    () => services.maintenance.resolve({ requestId, note }),
    "核对结果已记录，已解除自动重做锁定",
  );
  if (ok) await loadOperations();
}
const ai = reactive({
  endpoint: "",
  model: "",
  apiKey: "",
  hasKey: false,
  clearKey: false,
});
onMounted(async () => {
  try {
    await loadOperations();
  } catch (e) {
    error.value = String(e);
  }
  const data = await task(() => services.ai.config());
  if (data) {
    Object.assign(ai, data);
    original = JSON.stringify(ai);
    aiReady.value = true;
  }
});
async function saveAi() {
  const data = await task(() => services.ai.save(ai), "模型配置已保存");
  if (data) {
    Object.assign(ai, data);
    ai.apiKey = "";
    ai.clearKey = false;
    original = JSON.stringify(ai);
  }
  return !!data;
}
let pendingFlush: Promise<boolean> | null = null;
function flush(): Promise<boolean> {
  if (!pendingFlush)
    pendingFlush = (async () => {
      if (!(await flushTheme())) return false;
      if (!aiDirty.value) return true;
      return await saveAi();
    })().finally(() => {
      pendingFlush = null;
    });
  return pendingFlush;
}
let closing = false;
function beforeUnload(event: BeforeUnloadEvent) {
  if (closing || (!aiDirty.value && !themeSaving.value)) return;
  event.preventDefault();
  event.returnValue = "";
  void flush().then((ok) => {
    if (ok) {
      closing = true;
      window.close();
    }
  });
}
onMounted(() => {
  settingsPersistence.flush = flush;
  window.addEventListener("beforeunload", beforeUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", beforeUnload);
  if (settingsPersistence.flush === flush) delete settingsPersistence.flush;
});
async function backup() {
  const path = await task(() => services.maintenance.backup());
  if (path) notice.value = "完整备份已导出";
}
async function restore() {
  const restored = await task(() => services.maintenance.restore());
  if (!restored) return;
  await initializeTheme();
  await loadMessages();
  notice.value = "备份已恢复";
}
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">SETTINGS & DATA</div>
      <h1>{{ settingPages.find((p) => p.id === section)?.title || "设置" }}</h1>
      <p>让复盘节奏适合自己，让学习积累可备份、可恢复。</p>
    </div>
  </div>
  <section v-if="!section" class="panel settings-index">
    <button
      v-for="p in settingPages"
      :key="p.id"
      class="list-row"
      @click="emit('open', p.id)"
    >
      <div>
        <strong>{{ p.title }}</strong
        ><small>{{ p.description }}</small>
      </div>
      <span>→</span>
    </button>
  </section>
  <section v-if="section === 'appearance'" class="panel">
    <h2>全局主题</h2>
    <p>切换后立即生效并自动保存。</p>
    <div class="theme-choices">
      <button
        v-for="mode in [
          { id: 'light', name: '浅色' },
          { id: 'dark', name: '深色' },
          { id: 'system', name: '跟随系统' },
        ] as const"
        :key="mode.id"
        class="btn"
        :class="{ primary: themeMode === mode.id }"
        :aria-pressed="themeMode === mode.id"
        @click="updateTheme(mode.id)"
      >
        {{ mode.name }}
      </button>
    </div>
    <p v-if="themeFailure" role="alert">{{ themeFailure }}</p>
  </section>
  <DiagnosisSettings v-if="section === 'advanced-diagnosis'" />
  <TrashWorkspace v-if="section === 'trash'" />
  <div
    v-if="section === 'schedule' || section === 'backup'"
    class="settings-columns"
  >
    <section v-if="section === 'schedule'" class="panel">
      <h2>复盘调度配置</h2>
      <p>
        打开左侧任意卡片集，在其「复盘调度设置」中调整每日任务上限和最大复盘间隔。各卡片集配置互不影响。
      </p>
      <p class="footnote">
        单张卡片可覆盖所在卡片集的最大间隔，也可在复盘中直接调整。
      </p>
    </section>
    <section v-if="section === 'backup'" class="panel">
      <div class="section-head"><h2>完整备份与恢复</h2></div>
      <p>备份包含数据库、题目图片、知识点关系和复盘历史。</p>
      <div class="inline-actions">
        <button class="btn primary" @click="backup" :disabled="working">
          导出完整备份</button
        ><button class="btn" @click="restore" :disabled="working">
          从备份恢复
        </button>
      </div>
      <p class="footnote">
        恢复前检查完整性，并保留替换前的数据目录。MVP 单个备份上限 512 MB。
      </p>
      <h4>当前数据目录</h4>
      <code class="path-text">{{ state!.meta.dataPath }}</code>
      <p class="footnote">
        用户数据与软件安装目录分开，更新代码不会覆盖学习记录。
      </p>
    </section>
  </div>
  <section v-if="section === 'operations'" class="panel">
    <p v-if="!operations.length">没有待核对操作。</p>
    <h2>待核对的系统操作</h2>
    <p>上次操作在返回回执前中断。请核对实际数据或文件，确认后再解除锁定。</p>
    <div v-for="op in operations" :key="op.requestId" class="audit-row">
      <span>{{ op.method }} · {{ formatDate(op.createdAt) }}</span
      ><button
        class="btn"
        :disabled="working"
        @click="resolveOperation(op.requestId)"
      >
        记录核对结果并解锁
      </button>
    </div>
  </section>
  <section v-if="section === 'ai'" class="panel">
    <div class="section-head"><h2>AI 模型连接（可选）</h2></div>
    <p class="muted">
      兼容 chat/completions
      格式的服务。只有主动点击生成分析时才发送相关文字；基础功能不依赖 AI。
    </p>
    <p v-if="!aiReady" role="status">正在读取模型配置…</p>
    <form v-else @submit.prevent="saveAi">
      <div class="form-grid">
        <label
          >完整接口地址<input
            v-model="ai.endpoint"
            placeholder="https://你的服务/v1/chat/completions"
            required /></label
        ><label
          >模型名称<input
            v-model="ai.model"
            placeholder="服务提供的模型名称"
            required
        /></label>
      </div>
      <label
        >API 密钥（留空保留现有密钥）<input
          v-model="ai.apiKey"
          type="password"
          autocomplete="off"
          :placeholder="
            ai.hasKey ? '已保存加密密钥' : '本机无密钥服务可留空'
          " /></label
      ><label class="check-option"
        ><input type="checkbox" v-model="ai.clearKey" />清除已保存密钥</label
      >
      <p class="footnote">
        密钥使用系统凭据加密，不进入源码、操作日志或学习备份。更换电脑后需重新配置。接口支持
        HTTPS，或本机 HTTP。
      </p>
      <button class="btn primary" :disabled="working">保存模型配置</button>
    </form>
  </section>
  <section v-if="section === 'audit'" class="panel">
    <div class="section-head">
      <h2>最近操作</h2>
      <span class="muted">保留完整日志，显示最近 100 条</span>
    </div>
    <div v-for="a in state!.audits" :key="a.id" class="audit-row">
      <strong>{{ a.action }}</strong
      ><span>{{ formatDate(a.created_at) }}</span>
    </div>
    <p v-if="!state!.audits.length" class="muted">尚无操作记录。</p>
  </section>
</template>
