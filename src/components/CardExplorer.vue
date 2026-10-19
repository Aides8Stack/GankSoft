<script setup lang="ts">
import { computed, reactive, ref, watch, onBeforeUnmount, nextTick } from "vue";
import { services } from "../services";
import {
  state,
  moduleFilter,
  isMemoryModule,
  liveQuestions,
  liveMemories,
  liveKnowledge,
  knowledgeName,
  formatDate,
  cardSelection,
  cardFilterPreset,
  task,
  working,
  notice,
  explorerViews,
  reviewRequest,
} from "../store";
import {
  StudyFilters,
  knowledgeGroups,
  randomKnowledgeCandidates,
  sampleKnowledge,
} from "../../shared/study-query";
import { useStudyQuery } from "../composables/useStudyQuery";
import KnowledgeTreePanel from "./KnowledgeTreePanel.vue";
import DateRangeControl from "./DateRangeControl.vue";
import { validDateRange } from "../../shared/date-range";
import type { DateSelectionInput } from "../../shared/workspace-contracts";
import { catalogManagement } from "../composables/catalogManagement";
import QuestionEditor from "./QuestionEditor.vue";
import KnowledgePicker from "./KnowledgePicker.vue";
import CardReviewPolicy from "./CardReviewPolicy.vue";
import CardReviewAnalytics from "./CardReviewAnalytics.vue";
const showReviewData = ref(false);
const activePlan = ref(""),
  activePlanSnapshot = ref("");
import MemoryEditor from "./MemoryEditor.vue";
const emit = defineEmits<{ navigate: [page: string, id?: string] }>();
async function exportSelected() {
  await task(
    () =>
      catalogManagement.exportDeck(moduleFilter.value, [
        ...cardSelection.value,
      ]),
    "所选卡片导出完成",
  );
}
const collectionId = moduleFilter.value;
const memory = computed(() => isMemoryModule(moduleFilter.value));
const editing = ref(false),
  editId = ref(""),
  detail = ref(""),
  randomCount = ref(10),
  filterName = ref(""),
  moveTarget = ref("");
const filters = reactive(StudyFilters.parse({}));
const dateDraft = ref<DateSelectionInput>({ range: "all" }),
  advanced = ref(false),
  plans = ref(false);
const randomScope = ref<"eligible" | "visible" | "checked">("eligible"),
  randomStrategy = ref("uniform"),
  sampleCount = ref(3),
  preview = ref<string[]>([]),
  previewSignature = ref(""),
  applyMode = ref("replace");
const storedView = explorerViews.value[collectionId],
  resultPane = ref<HTMLElement>();
if (storedView)
  Object.assign(filters, StudyFilters.parse(storedView.filters ?? storedView));
let restoringView = !!storedView?.filters;
dateDraft.value = { ...filters.date };
watch(
  dateDraft,
  (d) => {
    if (
      d.range !== "custom" &&
      JSON.stringify(filters.date) !== JSON.stringify(d)
    )
      filters.date = { ...d } as any;
  },
  { deep: true },
);
watch(
  () => filters.date,
  (d) => {
    if (JSON.stringify(dateDraft.value) !== JSON.stringify(d))
      dateDraft.value = { ...d };
  },
  { deep: true },
);
function applyDate() {
  if (validDateRange(dateDraft.value.start || "", dateDraft.value.end || ""))
    filters.date = { ...dateDraft.value } as any;
}
const query = useStudyQuery(collectionId, filters),
  { loading, failure } = query;
const nodes = computed(() =>
    liveKnowledge.value.filter((k) => k.module === collectionId),
  ),
  matchedSet = computed(() => new Set(query.result.value.matched));
const counts = computed(() => {
  const m = new Map<string, number>();
  for (const k of nodes.value) {
    const g = knowledgeGroups([k.id], nodes.value, filters.includeChildren)[0];
    m.set(
      k.id,
      query.result.value.eligible.filter((c) =>
        c.knowledgeIds.some((id) => g.has(id)),
      ).length,
    );
  }
  return m;
});
const candidates = computed(() =>
  randomKnowledgeCandidates(
    randomScope.value,
    query.result.value.eligible,
    query.result.value.eligible.filter((c) => matchedSet.value.has(c.id)),
    knowledgeGroups(
      filters.knowledge,
      nodes.value,
      filters.includeChildren,
    ).flatMap((g) => [...g]),
  ),
);
const signature = computed(() =>
  JSON.stringify([
    filters,
    randomScope.value,
    randomStrategy.value,
    sampleCount.value,
    candidates.value,
    query.result.value.eligible.map((c) => [c.id, c.reviewCount]),
  ]),
);
const previewValid = computed(
  () =>
    preview.value.length > 0 &&
    previewSignature.value === signature.value &&
    !loading.value &&
    !failure.value,
);
function drawKnowledge() {
  try {
    const weights = new Map<string, number>();
    for (const id of candidates.value) {
      const cards = query.result.value.eligible.filter((c) =>
        c.knowledgeIds.includes(id),
      );
      weights.set(
        id,
        1 /
          (1 +
            cards.reduce((a, c) => a + c.reviewCount, 0) /
              Math.max(1, cards.length)),
      );
    }
    preview.value = sampleKnowledge(
      candidates.value,
      Number(sampleCount.value),
      randomStrategy.value === "low" ? weights : undefined,
    );
    previewSignature.value = signature.value;
  } catch (e) {
    notice.value = String(e);
  }
}
function applySample() {
  if (!previewValid.value) return;
  filters.knowledge =
    applyMode.value === "replace"
      ? [...preview.value]
      : [...new Set([...filters.knowledge, ...preview.value])];
  preview.value = [];
}
onBeforeUnmount(() => {
  explorerViews.value[collectionId] = {
    filters: JSON.parse(JSON.stringify(filters)),
    page: page.value,
    scroll: resultPane.value?.scrollTop || 0,
  };
});
function clearFilters() {
  Object.assign(filters, StudyFilters.parse({}));
  preview.value = [];
  cardFilterPreset.value = "all";
}
const allCards = computed<any[]>(() =>
  (memory.value ? liveMemories.value : liveQuestions.value).filter(
    (c) => c.module === moduleFilter.value,
  ),
);
const reviewsByCard = computed(() => {
  const map = new Map<string, any[]>();
  for (const r of memory.value
    ? state.value!.memoryReviews
    : state.value!.attempts) {
    const id = "card_id" in r ? r.card_id : r.question_id;
    const list = map.get(id) ?? [];
    list.push(r);
    map.set(id, list);
  }
  return map;
});
const filtered = computed(() =>
  query.result.value.matched
    .map((id) => allCards.value.find((c) => c.id === id))
    .filter(Boolean),
);
const selectedOutside = computed(
    () => cardSelection.value.filter((id) => !matchedSet.value.has(id)).length,
  ),
  metrics = computed(
    () => new Map(query.result.value.eligible.map((c) => [c.id, c])),
  );
watch(
  allCards,
  (cards) => {
    const valid = new Set(cards.map((c) => c.id));
    cardSelection.value = cardSelection.value.filter((id) => valid.has(id));
  },
  { immediate: true },
);
const selected = computed(() =>
  allCards.value.find((c) => c.id === detail.value),
);
const edited = computed(() =>
  allCards.value.find((c) => c.id === editId.value),
);
watch(
  cardFilterPreset,
  (v) => {
    if (v === "due") filters.state = "due";
    else if (v.startsWith("knowledge:")) filters.knowledge = [v.slice(10)];
  },
  { immediate: true },
);

const page = ref(storedView?.page || 1);
const pageCount = computed(() =>
  Math.max(1, Math.ceil(filtered.value.length / 50)),
);
const visibleCards = computed(() =>
  filtered.value.slice((page.value - 1) * 50, page.value * 50),
);
watch(
  () => filtered.value.map((c) => c.id).join(","),
  async () => {
    if (restoringView) {
      page.value = Math.min(page.value, pageCount.value);
      restoringView = false;
      await nextTick();
      if (resultPane.value) resultPane.value.scrollTop = storedView.scroll || 0;
    } else page.value = 1;
  },
);

async function start(ids: string[]) {
  if (loading.value || failure.value || !ids.length) return;
  if (ids.length > 5000) {
    notice.value = "一次最多学习5000张，请缩小筛选或分批选择。";
    return;
  }
  const checked = await task(() =>
    services.studyPreflight(collectionId, ids, filters.paused !== "active"),
  );
  if (!checked) return;
  ids = checked.ids;
  if (!ids.length) {
    notice.value = "所选卡片已删除、移动、暂停或缺少答案。";
    return;
  }
  if (
    !confirm(
      `开始学习 ${ids.length} 张卡片？${selectedOutside.value ? "包含不在当前筛选结果中的已选卡片。" : ""}${filters.paused !== "active" ? "包含暂停卡片；不会解除暂停。" : ""}`,
    )
  )
    return;
  const ready = ids.filter((id) =>
    allCards.value.some(
      (c) =>
        c.id === id &&
        (memory.value || (c.status === "ready" && /^[A-D]$/.test(c.answer))),
    ),
  );
  if (ready.length < ids.length)
    notice.value = "部分卡片缺少有效答案或已删除，请先编辑补全。";
  if (!ready.length) return;
  cardSelection.value = ready;
  const plan =
    activePlan.value && activePlanSnapshot.value === JSON.stringify(filters)
      ? { name: activePlan.value }
      : null;
  reviewRequest.value = {
    mode: "selected",
    title:
      plan?.name ||
      (filters.knowledge[0] ? knowledgeName(filters.knowledge[0]) : ""),
    detail: plan
      ? "复盘方案：" + plan.name
      : filters.knowledge.map(knowledgeName).join(" / "),
  };
  emit("navigate", "study");
}
function random() {
  const ids = filtered.value
    .filter(
      (c) => memory.value || (c.status === "ready" && /^[A-D]$/.test(c.answer)),
    )
    .map((c) => c.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  start(
    ids.slice(0, Math.max(1, Math.min(500, Number(randomCount.value) || 1))),
  );
}
function edit(id = "") {
  editId.value = id;
  editing.value = true;
}
async function remove(id: string) {
  if (!confirm("将这张卡片移入回收站？学习历史保留。")) return;
  await task(
    () =>
      memory.value
        ? services.memory.action({ id, action: "delete" })
        : services.question.delete({ id }),
    "已删除",
  );
}
async function bulk(action: string) {
  const ids = [...cardSelection.value];
  if (
    action === "delete" &&
    !confirm("将所选 " + ids.length + " 张卡片移入回收站？")
  )
    return;
  await task(
    () =>
      services.cards.bulk({
        deck_id: moduleFilter.value,
        ids,
        action,
        target: moveTarget.value,
      }),
    "批量操作完成",
  );
  cardSelection.value = [];
}
async function saveFilter() {
  if (!filterName.value.trim()) return;
  await task(
    () =>
      services.filter.save({
        deck_id: moduleFilter.value,
        name: filterName.value,
        payload: filters,
      }),
    "筛选方案已保存",
  );
  filterName.value = "";
}
function applyFilter(payload: string, name: string) {
  Object.assign(filters, StudyFilters.parse(JSON.parse(payload)));
  activePlan.value = name;
  activePlanSnapshot.value = JSON.stringify(filters);
}
async function deleteFilter(f: any) {
  await task(
    () =>
      services.filter.delete({
        id: f.id,
        deck_id: collectionId,
        expected_revision: f.revision,
      }),
    "方案已删除",
  );
}
const renamingFilter = ref<any>(null),
  renameValue = ref("");
function renameFilter(f: any) {
  renamingFilter.value = f;
  renameValue.value = f.name;
}
async function commitRenameFilter() {
  const f = renamingFilter.value;
  if (!f || !renameValue.value.trim()) return;
  const saved = await task(
    () =>
      services.filter.save({
        id: f.id,
        deck_id: collectionId,
        expected_revision: f.revision,
        name: renameValue.value.trim(),
        payload: StudyFilters.parse(JSON.parse(f.payload)),
      }),
    "方案已更新",
  );
  if (saved) renamingFilter.value = null;
}
const stateNames = {
  all: "全部",
  due: "待复盘",
  new: "未学习",
  learned: "已学习",
  ready: "可学习",
  unlinked: "未关联知识点",
};
const performanceNames = {
  all: "全部",
  "last-failed": "最近一次失败",
  "ever-failed": "曾经失败",
  repeated: "最近三次至少两次失败",
  uncertain: "答对但不稳定",
};
</script>
<template>
  <div class="study-explorer">
    <div class="page-heading">
      <div>
        <div class="eyebrow">COLLECTION CARDS</div>
        <h1>所有卡片</h1>
        <p>
          {{
            memory
              ? "主动回忆，再对照内容评估记忆。"
              : "独立选择答案并写下思路，再核对解析。"
          }}
        </p>
      </div>
      <button class="btn primary" @click="edit()">
        ＋ 新增{{ memory ? "记忆" : "错题" }}卡
      </button>
    </div>
    <div class="knowledge-study-layout">
      <aside class="study-knowledge-side panel">
        <KnowledgeTreePanel
          v-model="filters.knowledge"
          :nodes="nodes"
          :counts="counts"
          :include-children="filters.includeChildren"
        />
        <label class="check-option"
          ><input
            type="checkbox"
            v-model="filters.includeChildren"
          />包含下级知识点</label
        >
        <KnowledgePicker
          v-model="filters.knowledge"
          :deck-id="moduleFilter"
          purpose="filter"
          compact
        />
        <section class="random-knowledge">
          <strong>随机选择知识点</strong>
          <label
            >候选范围<select v-model="randomScope">
              <option value="eligible">当前其他筛选条件</option>
              <option value="visible">当前匹配结果</option>
              <option value="checked">已选知识点</option>
            </select></label
          >
          <div class="form-grid">
            <label
              >数量<input
                type="number"
                min="1"
                max="20"
                step="1"
                v-model.number="sampleCount" /></label
            ><label
              >策略<select v-model="randomStrategy">
                <option value="uniform">均匀随机</option>
                <option value="low">少复盘优先</option>
              </select></label
            >
          </div>
          <p v-if="randomStrategy === 'low'" class="muted">
            权重 = 1 /（1 + 关联卡片平均有效复盘次数）
          </p>
          <p class="muted">{{ candidates.length }} 个候选 · 不足时取全部</p>
          <button
            class="btn"
            :disabled="loading || !!failure || !candidates.length"
            @click="drawKnowledge"
          >
            抽取 / 换一批
          </button>
          <div class="sample-preview" aria-live="polite">
            <span class="tag" v-for="id in preview" :key="id">{{
              knowledgeName(id)
            }}</span>
            <p v-if="preview.length && !previewValid">预览已失效，请重新抽取</p>
          </div>
          <div class="inline-actions">
            <select v-model="applyMode" aria-label="随机结果应用方式">
              <option value="replace">替换选择</option>
              <option value="append">追加选择</option></select
            ><button class="btn" :disabled="!previewValid" @click="applySample">
              应用
            </button>
          </div>
        </section>
      </aside>
      <div class="study-results-column">
        <section class="panel study-filter-toolbar">
          <div class="toolbar">
            <input
              v-model="filters.query"
              aria-label="搜索卡片"
              placeholder="搜索标题、正文、来源、知识点"
            /><button class="btn" @click="advanced = !advanced">高级筛选</button
            ><button class="btn" @click="plans = !plans">筛选方案</button>
          </div>
          <div class="toolbar">
            <select v-model="filters.dateField" aria-label="日期字段">
              <option value="lastReviewAt">上次学习时间</option>
              <option value="firstReviewAt">首次学习时间</option>
              <option value="createdAt">卡片创建时间</option>
              <option disabled>导入时间（暂无独立记录）</option></select
            ><DateRangeControl v-model="dateDraft" /><button
              v-if="dateDraft.range === 'custom'"
              class="btn"
              :disabled="
                !validDateRange(dateDraft.start || '', dateDraft.end || '')
              "
              @click="applyDate"
            >
              应用区间
            </button>
          </div>
          <div class="inline-actions">
            <button
              class="btn"
              @click="
                filters.state = 'all';
                filters.performance = 'all';
              "
            >
              全部</button
            ><button
              class="btn"
              @click="
                filters.state = 'due';
                filters.performance = 'all';
              "
            >
              待复盘</button
            ><button
              class="btn"
              @click="
                filters.state = 'all';
                filters.performance = 'ever-failed';
              "
            >
              易错 / 遗忘</button
            ><button
              class="btn"
              @click="
                filters.state = 'new';
                filters.performance = 'all';
              "
            >
              未学习
            </button>
          </div>
          <div v-show="advanced" class="filter-grid">
            <label
              >学习状态<select v-model="filters.state">
                <option value="all">全部状态</option>
                <option value="due">已到期</option>
                <option value="new">未学习</option>
                <option value="learned">已学习</option>
                <option value="ready">可学习</option>
                <option value="unlinked">未关联知识点</option>
              </select></label
            ><label
              >错误 / 遗忘<select v-model="filters.performance">
                <option value="all">全部表现</option>
                <option value="last-failed">最近一次失败</option>
                <option value="ever-failed">曾经失败</option>
                <option value="repeated">最近三次至少两次失败</option>
                <option v-if="!memory" value="uncertain">答对但不稳定</option>
              </select></label
            ><label
              >至少有效复盘<input
                type="number"
                min="0"
                v-model.number="filters.minReviews" /></label
            ><select v-model="filters.match" aria-label="知识点匹配规则">
              <option value="any">任意知识点 OR</option>
              <option value="all">全部知识点 AND</option></select
            ><select v-model="filters.paused" aria-label="暂停策略">
              <option value="active">排除暂停卡片</option>
              <option value="all">包含暂停卡片</option>
              <option value="paused">仅暂停卡片</option>
            </select>
          </div>
          <div v-if="plans" class="saved-study-filters">
            <div class="toolbar">
              <input
                v-model="filterName"
                placeholder="保存当前筛选方案的名称"
              /><button
                class="btn"
                :disabled="!filterName.trim() || loading || !!failure"
                @click="saveFilter"
              >
                保存方案
              </button>
            </div>
            <div
              v-for="f in state!.savedFilters.filter(
                (f) => f.deck_id === moduleFilter,
              )"
              :key="f.id"
              class="inline-actions"
            >
              <button class="tag link" @click="applyFilter(f.payload, f.name)">
                {{ f.name }}</button
              ><button class="text-btn" @click="renameFilter(f)">重命名</button
              ><button class="text-btn danger" @click="deleteFilter(f)">
                删除
              </button>
            </div>
          </div>
          <div class="filter-chips">
            <span class="muted">当前条件</span
            ><button
              class="tag"
              v-for="id in filters.knowledge"
              :key="id"
              :aria-label="'移除筛选 ' + knowledgeName(id)"
              @click="
                filters.knowledge = filters.knowledge.filter((k) => k !== id)
              "
            >
              {{ knowledgeName(id) }} ×</button
            ><button
              v-if="filters.query"
              class="tag"
              @click="filters.query = ''"
            >
              搜索：{{ filters.query }} ×</button
            ><button
              v-if="filters.state !== 'all'"
              class="tag"
              @click="filters.state = 'all'"
            >
              {{ stateNames[filters.state] }} ×</button
            ><button
              v-if="filters.performance !== 'all'"
              class="tag"
              @click="filters.performance = 'all'"
            >
              {{ performanceNames[filters.performance] }} ×</button
            ><button
              v-if="filters.minReviews"
              class="tag"
              @click="filters.minReviews = 0"
            >
              复盘 ≥ {{ filters.minReviews }} ×</button
            ><button
              v-if="filters.date.range !== 'all'"
              class="tag"
              @click="filters.date = { range: 'all' }"
            >
              {{ query.result.value.window.start }} —
              {{ query.result.value.window.end }} ×</button
            ><button
              v-if="filters.paused !== 'active'"
              class="tag"
              @click="filters.paused = 'active'"
            >
              {{ filters.paused === "all" ? "包含暂停" : "仅暂停" }} ×</button
            ><button
              v-if="filters.match === 'all'"
              class="tag"
              @click="filters.match = 'any'"
            >
              知识点 AND ×</button
            ><button
              v-if="!filters.includeChildren"
              class="tag"
              @click="filters.includeChildren = true"
            >
              不含下级 ×</button
            ><button class="text-btn" @click="clearFilters">重置</button>
          </div>
          <p v-if="loading" role="status">正在刷新匹配结果…</p>
          <p v-if="failure" role="alert">{{ failure }}</p>
        </section>
        <section ref="resultPane" class="panel explorer-list">
          <div class="section-head list-heading">
            <h2>
              卡片列表 <span class="list-count">{{ filtered.length }}</span>
            </h2>
            <select v-model="filters.sort" aria-label="结果排序">
              <option value="default">创建时间：新到旧</option>
              <option value="lastReviewDesc">最近学习优先</option>
              <option value="errorCountDesc">失败次数多优先</option>
              <option value="reviewCountAsc">复盘次数少优先</option>
            </select>
          </div>
          <p v-if="filtered.length < allCards.length" class="info-box">
            当前筛选隐藏了 {{ allCards.length - filtered.length }} 张卡片。
            <button class="text-btn" @click="clearFilters">
              显示本集全部卡片
            </button>
          </p>
          <div v-for="c in visibleCards" :key="c.id" class="card-row">
            <input
              type="checkbox"
              v-model="cardSelection"
              :value="c.id"
              :aria-label="'选择：' + c.title"
            />
            <div class="card-row-body">
              <h3>
                <button
                  class="text-btn"
                  @click="
                    memory ? (detail = c.id) : emit('navigate', 'project', c.id)
                  "
                >
                  {{ c.title }}
                </button>
              </h3>
              <div class="card-status-line">
                <span
                  v-if="!memory && !/^[A-D]$/.test(c.answer)"
                  class="status-pill paused"
                  >缺少正确答案，请先编辑补全</span
                >
                <span
                  v-else
                  class="status-pill"
                  :class="{
                    paused: c.paused,
                    due:
                      !c.paused &&
                      c.due_at &&
                      new Date(c.due_at).getTime() <= Date.now(),
                  }"
                  >{{
                    c.paused
                      ? "已暂停"
                      : c.due_at && new Date(c.due_at).getTime() <= Date.now()
                        ? "待复盘"
                        : "已安排"
                  }}</span
                >
              </div>
              <div class="card-preview">{{ c.stem ?? c.cue }}</div>
              <div class="card-meta">
                <span
                  >失败 {{ metrics.get(c.id)?.failures ?? 0 }} 次 · 有效复盘
                  {{ metrics.get(c.id)?.reviewCount ?? 0 }} 次 · 上次
                  {{
                    metrics.get(c.id)?.lastReviewAt
                      ? formatDate(metrics.get(c.id)!.lastReviewAt)
                      : "未学习"
                  }}</span
                >
                <span
                  v-for="id in c.knowledge_ids"
                  :key="id"
                  class="badge-soft"
                  >{{ knowledgeName(id) }}</span
                ><span v-if="!c.knowledge_ids.length">未关联知识点</span
                ><span>{{
                  c.paused ? "排期暂停" : "下次 " + formatDate(c.due_at)
                }}</span>
              </div>
            </div>
            <div class="inline-actions card-row-actions">
              <button class="text-btn" @click="edit(c.id)">编辑</button
              ><button class="text-btn" @click="start([c.id])">学习</button
              ><button class="text-btn danger" @click="remove(c.id)">
                删除
              </button>
            </div>
          </div>
          <nav
            v-if="pageCount > 1"
            class="inline-actions"
            aria-label="卡片列表分页"
          >
            <button class="btn" :disabled="page <= 1" @click="page--">
              上一页
            </button>
            <span
              >第 {{ page }} / {{ pageCount }} 页 · 每页 50 张 ·
              全选结果包含所有页</span
            >
            <button class="btn" :disabled="page >= pageCount" @click="page++">
              下一页
            </button>
          </nav>
          <div v-if="!filtered.length" class="empty">
            <h3>
              {{
                allCards.length ? "当前筛选下没有卡片" : "当前卡片集还没有卡片"
              }}
            </h3>
            <p>
              {{
                allCards.length
                  ? "卡片仍在本集中，点击“显示本集全部卡片”查看。"
                  : "可在“批量导入与导出”中导入内容。"
              }}
            </p>
          </div>
        </section>
        <footer class="panel study-selection-footer">
          <div class="selection-counts">
            匹配 {{ filtered.length }} 张 · 已选 {{ cardSelection.length }} 张
            <span v-if="selectedOutside"
              >（{{ selectedOutside }} 张不在当前结果）</span
            >
          </div>
          <div class="inline-actions">
            <button
              class="text-btn"
              :disabled="loading || !!failure"
              @click="cardSelection = [...query.result.value.matched]"
            >
              选择全部结果</button
            ><button class="text-btn" @click="cardSelection = []">
              清空选择</button
            ><button
              class="btn"
              :disabled="!cardSelection.length || working"
              @click="exportSelected"
            >
              导出所选卡片…</button
            ><button
              class="btn"
              :disabled="
                !cardSelection.length || loading || !!failure || working
              "
              @click="start([...cardSelection])"
            >
              学习所选</button
            ><button
              class="btn primary"
              :disabled="!filtered.length || loading || !!failure || working"
              @click="start([...query.result.value.matched])"
            >
              学习筛选结果
            </button>
          </div>
          <details>
            <summary>批量管理与随机卡片练习</summary>
            <div class="inline-actions">
              <button
                class="text-btn"
                :disabled="!cardSelection.length"
                @click="bulk('pause')"
              >
                暂停排期</button
              ><button
                class="text-btn"
                :disabled="!cardSelection.length"
                @click="bulk('resume')"
              >
                恢复排期</button
              ><select v-model="moveTarget">
                <option value="">移动到同类型卡片集</option>
                <option
                  v-for="d in state!.decks.filter(
                    (d) =>
                      !d.deleted_at &&
                      d.id !== moduleFilter &&
                      d.kind === (memory ? 'memory' : 'question'),
                  )"
                  :key="d.id"
                  :value="d.id"
                >
                  {{ d.name }}
                </option></select
              ><button
                class="btn"
                :disabled="!moveTarget || !cardSelection.length"
                @click="bulk('move')"
              >
                移动</button
              ><button
                class="text-btn danger"
                :disabled="!cardSelection.length"
                @click="bulk('delete')"
              >
                删除所选</button
              ><input
                type="number"
                min="1"
                max="500"
                v-model.number="randomCount"
                aria-label="随机卡片数量"
              /><button
                class="btn"
                :disabled="loading || !!failure || !filtered.length"
                @click="random"
              >
                随机卡片练习
              </button>
            </div>
          </details>
        </footer>
      </div>
    </div>
  </div>
  <QuestionEditor
    v-if="editing && !memory"
    :question="edited"
    @close="editing = false"
    @saved="editing = false"
  /><MemoryEditor
    v-if="editing && memory"
    :card="edited"
    @close="editing = false"
    @saved="editing = false"
  />
  <div
    v-if="selected && memory"
    class="modal-backdrop"
    @click.self="detail = ''"
  >
    <section class="modal">
      <div class="section-head">
        <h2>{{ selected.title }}</h2>
        <button class="icon-btn" @click="detail = ''">×</button>
      </div>
      <h4>提示</h4>
      <p class="prewrap">{{ selected.cue }}</p>
      <h4>记忆内容</h4>
      <p class="prewrap">{{ selected.content }}</p>
      <CardReviewPolicy kind="memory" :card-id="selected.id" />
      <button class="btn" @click="showReviewData = true">
        查看复盘数据与变化
      </button>
      <CardReviewAnalytics
        v-if="showReviewData"
        kind="memory"
        :card-id="selected.id"
        @close="showReviewData = false"
      />
      <h4>学习记录</h4>
      <div
        v-for="r in state!.memoryReviews.filter(
          (r) => r.card_id === selected.id,
        )"
        :key="r.id"
        class="list-row"
      >
        <div>
          {{
            r.score <= 1
              ? "忘记"
              : r.score === 2
                ? "困难"
                : r.score === 3
                  ? "正常"
                  : "轻松"
          }}<small>{{ r.note }}</small>
        </div>
        <span>{{ formatDate(r.created_at) }}</span>
      </div>
      <button class="btn primary" @click="start([selected.id])">
        开始回忆
      </button>
    </section>
  </div>
  <div
    v-if="renamingFilter"
    class="modal-backdrop"
    @click.self="renamingFilter = null"
  >
    <section
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-label="重命名筛选方案"
    >
      <h2>重命名筛选方案</h2>
      <form @submit.prevent="commitRenameFilter">
        <label
          >新方案名称<input v-model="renameValue" maxlength="100" required
        /></label>
        <div class="modal-footer">
          <button type="button" class="btn" @click="renamingFilter = null">
            取消</button
          ><button
            class="btn primary"
            :disabled="working || !renameValue.trim()"
          >
            保存名称
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
