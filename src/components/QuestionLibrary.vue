<script setup lang="ts">
import ImageNode from "./ImageNode.vue";
import { deckName, deckPath, inDeckScope } from "../store";
import { services } from "../services";
import { ref, computed, watch } from "vue";
import {
  reviewRequest,
  state,
  liveQuestions,
  moduleFilter,
  selectedQuestionId,
  selectedKnowledgeId,
  knowledgeName,
  formatDate,
  task,
  working,
  assetUrl,
} from "../store";
import QuestionEditor from "./QuestionEditor.vue";
import CardReviewPolicy from "./CardReviewPolicy.vue";
import CardReviewAnalytics from "./CardReviewAnalytics.vue";
const showReviewData = ref(false);
import ImageViewer from "./ImageViewer.vue";

function historicalKnowledge(a: any) {
  try {
    return JSON.parse(a.knowledge_snapshot || "[]")
      .map((k: any) => k.name)
      .join("、");
  } catch {
    return "";
  }
}
const props = defineProps<{ projectMode?: boolean }>();
const projectNote = ref(""),
  compareA = ref(""),
  compareB = ref("");
const emit = defineEmits<{ navigate: [page: string, id?: string] }>();
const search = ref(""),
  status = ref("all"),
  knowledgeFilter = ref(""),
  editing = ref(false),
  creating = ref(false),
  viewAsset = ref("");

const list = computed(() =>
  liveQuestions.value.filter(
    (q) =>
      inDeckScope(q.module) &&
      (!knowledgeFilter.value ||
        q.knowledge_ids.includes(knowledgeFilter.value)) &&
      (status.value === "all" || q.status === status.value) &&
      (
        q.title +
        q.stem +
        q.analysis +
        q.initial_thought +
        q.knowledge_ids.map(knowledgeName).join(" ")
      )
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
);
const selected = computed(() =>
  liveQuestions.value.find((q) => q.id === selectedQuestionId.value),
);
watch(
  () => selected.value?.id,
  () => {
    projectNote.value = selected.value?.project_note ?? "";
  },
  { immediate: true },
);
async function saveNote() {
  const q = selected.value;
  if (!q) return;
  await task(
    () =>
      services.question.note({
        id: q.id,
        version: q.version,
        note: projectNote.value,
      }),
    "笔记已保存",
  );
}
const provenance = computed(() =>
  state
    .value!.importEntries.filter((e) => e.local_id === selected.value?.id)
    .flatMap((e) => JSON.parse(e.archive_refs)),
);
const history = computed(() =>
  state.value!.attempts.filter((a) => a.question_id === selected.value?.id),
);
watch(
  selectedQuestionId,
  (id) => {
    if (id === "new") {
      creating.value = true;
      editing.value = true;
      selectedQuestionId.value = "";
    }
  },
  { immediate: true },
);
async function saved(id: string) {
  selectedQuestionId.value = id;
  editing.value = false;
  creating.value = false;
}
async function remove() {
  if (!selected.value || !confirm("将本题移入回收站？题目和复盘历史会保留。"))
    return;
  await task(
    () => services.question.delete({ id: selected.value!.id }),
    "已移入回收站",
  );
  selectedQuestionId.value = "";
}
function practice() {
  reviewRequest.value = { mode: "all" };
  emit("navigate", "review");
}

function togglePlan(id: string, paused: boolean) {
  return services.plan.set({ id, action: paused ? "resume" : "pause" });
}
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">QUESTION LIBRARY</div>
      <h1>{{ props.projectMode ? "题目详情" : "错题库" }}</h1>
      <button
        v-if="props.projectMode"
        class="btn project-back"
        @click="emit('navigate', 'back')"
      >
        ← 返回上一个页面
      </button>
      <p>保留原题与思路，把错误关联到真正需要补习的知识。</p>
    </div>
    <button
      v-if="!props.projectMode"
      class="btn primary"
      @click="
        creating = true;
        editing = true;
      "
    >
      ＋ 录入错题</button
    ><button v-if="!props.projectMode" class="btn" @click="practice">
      选择卡片集 / 知识点 / 随机组题
    </button>
  </div>
  <div v-if="!props.projectMode" class="toolbar panel">
    <input
      v-model="search"
      class="search-input"
      placeholder="搜索题目、解析、思路或知识点…"
    /><select v-model="status">
      <option value="all">全部状态</option>

      <option value="ready">可学习</option></select
    ><select v-model="knowledgeFilter">
      <option value="">全部知识点</option>
      <option
        v-for="k in state!.knowledge.filter((k) => !k.deleted_at)"
        :key="k.id"
        :value="k.id"
      >
        {{ k.name }}
      </option></select
    ><span class="muted">{{ moduleFilter }} · {{ list.length }} 道</span>
  </div>
  <div class="library-layout" :class="{ 'project-page': props.projectMode }">
    <section v-if="!props.projectMode" class="panel question-list">
      <div v-if="!list.length" class="empty">
        <div class="empty-symbol">▤</div>
        <h3>还没有符合条件的错题</h3>
        <p>先录入一道题，再关联知识点。</p>
        <button
          class="btn"
          @click="
            creating = true;
            editing = true;
          "
        >
          录入第一道错题
        </button>
      </div>
      <button
        v-for="q in list"
        :key="q.id"
        class="question-card"
        :class="{ selected: selected?.id === q.id }"
        @click="selectedQuestionId = q.id"
      >
        <div class="row-between">
          <span class="tag">{{ deckName(q.module) }}</span
          ><span class="badge">{{ q.paused ? "复盘已暂停" : "可学习" }}</span>
        </div>
        <h3>{{ q.title }}</h3>
        <p class="line-clamp">{{ q.stem }}</p>
        <div class="tag-row">
          <span
            v-for="id in q.knowledge_ids.slice(0, 3)"
            :key="id"
            class="tag subtle"
            >{{ knowledgeName(id) }}</span
          >
        </div>
        <div class="row-between card-foot">
          <span>{{ q.due_at ? "已建立复盘计划" : "待首次验证" }}</span
          ><span>{{
            q.due_at ? "复盘 " + formatDate(q.due_at) : "未进入复盘"
          }}</span>
        </div>
      </button>
    </section>
    <section class="panel detail-panel" v-if="selected">
      <div class="section-head">
        <div>
          <span class="tag">{{ deckName(selected.module) }}</span>
          <h2>{{ selected.title }}</h2>
        </div>
        <button
          class="btn"
          @click="
            creating = false;
            editing = true;
          "
        >
          编辑
        </button>
      </div>
      <div class="detail-actions">
        <button
          class="btn primary"
          :disabled="selected.status !== 'ready'"
          @click="emit('navigate', 'review', selected.id)"
        >
          ↻ 重做本题</button
        ><button
          class="btn"
          v-if="selected.due_at"
          @click="
            task(
              () => togglePlan(selected!.id, !!selected!.paused),
              '计划已更新',
            )
          "
        >
          {{ selected.paused ? "恢复复盘" : "暂停复盘" }}</button
        ><button
          v-if="!props.projectMode"
          class="text-btn danger"
          @click="remove"
        >
          移入回收站
        </button>
      </div>
      <button class="btn" @click="showReviewData = true">
        查看复盘数据与变化
      </button>
      <CardReviewAnalytics
        v-if="showReviewData"
        kind="question"
        :card-id="selected.id"
        @close="showReviewData = false"
      />
      <CardReviewPolicy kind="question" :card-id="selected.id" />
      <div v-if="selected.material" class="material-box">
        <h4>公共材料</h4>
        <p class="prewrap">{{ selected.material }}</p>
      </div>
      <h4>题目</h4>
      <p class="prewrap">{{ selected.stem }}</p>
      <p class="prewrap">{{ selected.options }}</p><div class="option-images"><template v-for="option in ['A','B','C','D']" :key="option"><div v-for="asset in selected.assets.filter((a) => a.role === 'option-' + option)" :key="asset.id"><strong>选项 {{ option }}</strong><ImageNode :src="assetUrl(asset.id)" :layout="asset.layout" readonly @preview="viewAsset = asset.id" /></div></template></div>
      <div class="image-grid">
        <ImageNode v-for="a in selected.assets.filter((a) => a.role === 'question')" :key="a.id" :src="assetUrl(a.id)" :layout="a.layout" readonly @preview="viewAsset = a.id" />
      </div>

      <div class="answer-box">
        <strong>正确答案：{{ selected.answer || "待填写" }}</strong>
        <p class="prewrap">{{ selected.analysis || "暂无文字解析" }}</p>
        <div class="image-grid">
          <ImageNode v-for="a in selected.assets.filter((a) => a.role === 'analysis')" :key="a.id" :src="assetUrl(a.id)" :layout="a.layout" readonly @preview="viewAsset = a.id" />
        </div>
      </div>
      <h4>关联知识点</h4>
      <div class="tag-row">
        <button
          v-for="id in selected.knowledge_ids"
          :key="id"
          class="tag link"
          @click="emit('navigate', 'knowledge', id)"
        >
          {{ knowledgeName(id) }} ↗</button
        ><span v-if="!selected.knowledge_ids.length" class="muted"
          >待补充知识点</span
        >
      </div>
      <h4>长期笔记</h4>
      <textarea
        v-model="projectNote"
        rows="4"
        placeholder="持续补充这道题的总结，不覆盖历次复习思路。"
      /><button class="btn" @click="saveNote">保存笔记</button>
      <h4 v-if="provenance.length">导入时的知识点版本</h4>
      <p class="footnote" v-for="(ref, i) in provenance" :key="i">
        {{ ref.archiveId }} / {{ ref.version }} / {{ ref.nodeKey }}
      </p>
      <h4>初次错误思路</h4>
      <p class="prewrap muted">{{ selected.initial_thought || "尚未填写" }}</p>
      <div v-if="selected.reason" class="info-box">{{ selected.reason }}</div>
      <h4>复盘记录与证据</h4>
      <p v-if="!history.length" class="muted">
        尚未复盘。每次结果都会独立保存。
      </p>
      <details v-if="history.length > 1">
        <summary>对照两次复习思路</summary>
        <div class="form-grid">
          <label
            >记录一<select v-model="compareA">
              <option value="">选择复习记录</option>
              <option v-for="a in history" :key="a.id" :value="a.id">
                {{ formatDate(a.created_at) }} · {{ a.answer }}
              </option>
            </select>
            <p class="project-history-thought">
              {{ history.find((a) => a.id === compareA)?.thought }}
            </p></label
          ><label
            >记录二<select v-model="compareB">
              <option value="">选择复习记录</option>
              <option v-for="a in history" :key="a.id" :value="a.id">
                {{ formatDate(a.created_at) }} · {{ a.answer }}
              </option>
            </select>
            <p class="project-history-thought">
              {{ history.find((a) => a.id === compareB)?.thought }}
            </p></label
          >
        </div>
      </details>
      <div v-for="a in history" :key="a.id" class="history-item">
        <div class="row-between">
          <strong
            >{{ a.correct ? "答对" : "答错" }} · 自评
            {{
              a.self_score == null
                ? "未记录"
                : a.self_score.toFixed(1) + " / 10"
            }}
            · 调度等级 {{ a.score }} / 4</strong
          ><small>{{ formatDate(a.created_at) }}</small>
        </div>
        <p>
          {{ a.effective ? "有效复盘" : "同日巩固／提示学习" }} ·
          {{ a.faults || "未标记错因" }}
        </p>
        <div class="history-meta">
          <span>本次答案 {{ a.answer }}</span
          ><span
            >用时
            {{
              a.elapsed_seconds == null ? "未记录" : a.elapsed_seconds + " 秒"
            }}</span
          ><span>{{
            a.basis === "independent"
              ? "独立作答"
              : a.basis === "guess"
                ? "猜测作答"
                : a.basis === "remember"
                  ? "记得答案"
                  : "借助提示"
          }}</span>
        </div>
        <p v-if="a.knowledge_names" class="history-reflection">
          本次知识漏洞：{{ historicalKnowledge(a) || a.knowledge_names }}
        </p>
        <p v-if="a.fault_detail" class="history-reflection">
          具体错因：{{ a.fault_detail }}
        </p>
        <p v-if="a.thought" class="project-history-thought">
          思路：{{ a.thought }}
        </p>
        <p v-if="a.improvement" class="muted history-reflection">
          解析后的反思：{{ a.improvement }}
        </p>
      </div>
      <p class="footnote">来源：{{ selected.source || "未填写" }}</p>
    </section>
    <section v-else class="panel empty detail-panel">
      <div class="empty-symbol">↗</div>
      <h3>选择一道错题</h3>
      <p>查看解析、知识点与掌握情况。</p>
    </section>
  </div>
  <QuestionEditor
    v-if="editing"
    :question="creating ? undefined : selected"
    @close="editing = false"
    @saved="saved"
  /><ImageViewer
    v-if="viewAsset"
    :asset-id="viewAsset"
    @close="viewAsset = ''"
  />
</template>
