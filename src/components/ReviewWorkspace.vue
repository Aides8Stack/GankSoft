<script setup lang="ts">
import ImageNode from "./ImageNode.vue";
import {calendarDay} from '../../shared/calendar';

import { QUESTION_MODULES, deckName, deckPath, inDeckScope } from '../store';
import { services } from '../services';
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { FAULTS } from '../../shared/types';
import {
  state,
  liveKnowledge,
  reviewRequest,
  liveQuestions,
  dueQuestions,
  moduleFilter,
  selectedQuestionId,
  knowledgeName,
  task,
  working,
  assetUrl,
  formatDate,
} from '../store';
import ImageViewer from './ImageViewer.vue';
const emit = defineEmits<{ navigate: [page: string, id?: string] }>();
const initialRequest = reviewRequest.value;
reviewRequest.value = null;
if (!initialRequest?.questionId) selectedQuestionId.value = '';
const mode = ref(initialRequest?.mode ?? 'due'),
  revealed = ref(false),
  answer = ref(''),
  basis = ref('independent'),
  understanding = ref(2),
  thought = ref(''),
  improvement = ref(''),
  faults = ref<string[]>([]),
  errorIds = ref<string[]>([]),
  faultDetail = ref(''),
  seconds = ref(0),
  paused = ref(false),
  result = ref<any>(null),
  viewAsset = ref('');
let timer: ReturnType<typeof setInterval>;
const reviewedToday = computed(
  () =>
    state.value!.attempts.filter(
      (a) => a.effective && calendarDay(new Date(a.created_at),state.value!.settings.studyTimezone) === calendarDay(new Date(),state.value!.settings.studyTimezone),
    ).length,
);
const search = ref('');
const selectedDecks = ref<string[]>([]);
const randomCount = ref(10);
function randomSelect() {
  const ids = candidates.value.map((q) => q.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  chosenIds.value = ids.slice(0, Math.max(1, Math.min(200, randomCount.value)));
  startSelected();
}
const knowledgeId = ref(initialRequest?.knowledgeId ?? '');
const includeChildren = ref(true);
const chosenIds = ref<string[]>(initialRequest?.questionId ? [initialRequest.questionId] : []);
const sessionIds = ref<string[] | null>(null);
const completedIds = ref<string[]>([]);
const knowledgeOptions = computed(() => liveKnowledge.value);
const scope = computed(() => {
  const ids = new Set(knowledgeId.value ? [knowledgeId.value] : []);
  if (includeChildren.value) {
    let size = -1;
    while (size !== ids.size) {
      size = ids.size;
      for (const k of liveKnowledge.value) if (k.parent_id && ids.has(k.parent_id)) ids.add(k.id);
    }
  }
  return ids;
});
const matching = computed(() =>
  liveQuestions.value.filter(
    (q) =>
      inDeckScope(q.module) &&
      (!selectedDecks.value.length || selectedDecks.value.some((d) => inDeckScope(q.module, d))) &&
      (!search.value.trim() ||
        (q.title + q.stem + q.source).toLowerCase().includes(search.value.trim().toLowerCase())) &&
      (!knowledgeId.value || q.knowledge_ids.some((id) => scope.value.has(id))),
  ),
);
const candidates = computed(() => {
  const ready = matching.value.filter((q) => q.status === 'ready');
  if (mode.value !== 'due') return ready;
  const ids = new Set(ready.map((q) => q.id));
  // Filter the subject before applying the daily budget.
  return dueQuestions.value
    .filter((q) => ids.has(q.id))
    .slice(0, Math.max(0, state.value!.settings.dailyLimit - reviewedToday.value));
});
const queue = computed(() =>
  (sessionIds.value
    ? liveQuestions.value.filter((q) => q.status === 'ready' && sessionIds.value!.includes(q.id))
    : candidates.value
  ).filter((q) => !completedIds.value.includes(q.id)),
);
const q = computed(() =>
  liveQuestions.value.find((q) => q.id === selectedQuestionId.value && q.status === 'ready'),
);
function clearSession() {
  sessionIds.value = null;
  completedIds.value = [];
  chosenIds.value = [];
  selectedQuestionId.value = '';
  reset();
}
watch([mode, moduleFilter, knowledgeId, includeChildren, search, selectedDecks], clearSession, {
  deep: true,
});
function startSelected() {
  sessionIds.value = candidates.value
    .filter((q) => chosenIds.value.includes(q.id))
    .map((q) => q.id);
  completedIds.value = [];
  selectedQuestionId.value = sessionIds.value[0] ?? '';
  reset();
}
function reset() {
  revealed.value = false;
  answer.value = '';
  basis.value = 'independent';
  understanding.value = 2;
  thought.value = '';
  improvement.value = '';
  faults.value = [];
  errorIds.value = [];
  faultDetail.value = '';
  seconds.value = 0;
  paused.value = false;
  result.value = null;
}
watch(selectedQuestionId, reset);
onMounted(() => {
  timer = setInterval(() => {
    if (q.value && !paused.value && !revealed.value) seconds.value++;
  }, 1000);
});
onBeforeUnmount(() => clearInterval(timer));
async function submit() {
  if (!q.value) return;
  const r = await task(
    () =>
      services.review.submit({
        question_id: q.value!.id,
        question_version: q.value!.version,
        answer: answer.value,
        basis: basis.value,
        understanding: understanding.value,
        elapsed_seconds: seconds.value,
        thought: thought.value,
        improvement: improvement.value,
        faults: faults.value,
        error_knowledge_ids: errorIds.value,
        fault_detail: faultDetail.value,
      }),
    '本次复盘已保存',
  );
  if (r) {
    result.value = r;
    completedIds.value.push(q.value!.id);
  }
}
function next() {
  const next = queue.value.find((item) => item.id !== q.value?.id);
  selectedQuestionId.value = next?.id ?? '';
  reset();
}
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">SPACED REVIEW</div>
      <h1>定期复盘</h1>
      <p>先独立作答，再核对解析。记录看答案前的真实掌握情况。</p>
    </div>
    <div class="tag">今日有效复盘 {{ reviewedToday }} / {{ state!.settings.dailyLimit }}</div>
  </div>
  <div class="review-layout">
    <aside class="panel review-queue">
      <div class="section-head"><h2>复盘队列</h2></div>
      <label
        >复盘方式<select v-model="mode">
          <option value="due">到期任务 · 每日预算内</option>
          <option value="all">主动选题 · 全部卡片</option>
          <option value="knowledge">按知识点复盘</option>
        </select></label
      >
      <label
        >选择知识点<select v-model="knowledgeId">
          <option value="">全部知识点</option>
          <option v-for="k in knowledgeOptions" :key="k.id" :value="k.id">
            {{ deckName(k.module) }} / {{ k.name }}
          </option>
        </select></label
      >
      <label class="check-option"
        ><input type="checkbox" v-model="includeChildren" />包含下级知识点</label
      >
      <details>
        <summary>选择若干卡片集（包含子集）</summary>
        <label v-for="d in QUESTION_MODULES" :key="d" class="check-option"
          ><input type="checkbox" v-model="selectedDecks" :value="d" />{{ deckPath(d) }}</label
        ><button class="text-btn" @click="selectedDecks = []">清空选择</button>
      </details>
      <label>随机题量<input type="number" min="1" max="200" v-model.number="randomCount" /></label
      ><button
        v-if="mode !== 'due'"
        class="btn"
        :disabled="!candidates.length"
        @click="randomSelect"
      >
        随机抽题并开始
      </button>
      <label>搜索题目<input v-model="search" placeholder="标题、题干或来源" /></label>
      <p class="muted" v-if="mode !== 'due'">
        可提前复盘；暂停排期的题也可主动练习。同日重复只记巩固。
      </p>
      <template v-if="mode !== 'due' && !sessionIds">
        <label v-for="item in candidates" :key="item.id" class="check-option">
          <input type="checkbox" v-model="chosenIds" :value="item.id" />{{ item.title }}
        </label>
        <button class="btn" @click="chosenIds = candidates.map((q) => q.id)">全选筛选结果</button>
        <button class="btn primary" :disabled="!chosenIds.length" @click="startSelected">
          开始所选 {{ chosenIds.length }} 题
        </button>
      </template>
      <button v-if="sessionIds" class="btn" @click="clearSession">重新选题</button>
      <p>可复盘 {{ queue.length }} 题</p>
      <button
        v-for="item in queue"
        :key="item.id"
        class="queue-item"
        :class="{ selected: q?.id === item.id }"
        @click="selectedQuestionId = item.id"
      >
        <span class="tag">{{ deckName(item.module) }}</span
        ><strong>{{ item.title }}</strong
        ><small
          >{{ item.due_at ? '已建立复盘计划' : '待首次验证' }} ·
          {{ formatDate(item.due_at) }}</small
        >
      </button>
      <div v-if="!queue.length" class="empty compact">
        <p>
          当前队列为空。可切换“主动选题”提前练习，或先整理导入题；到期任务还受暂停状态和每日预算限制。
        </p>
      </div>
    </aside>
    <section v-if="q" class="panel review-main">
      <div class="section-head">
        <div>
          <span class="tag">{{ deckName(q.module) }}</span>
          <h2>{{ q.title }}</h2>
        </div>
        <div class="timer">
          {{
            Math.floor(seconds / 60)
              .toString()
              .padStart(2, '0')
          }}:{{ (seconds % 60).toString().padStart(2, '0') }}
          <button class="text-btn" @click="paused = !paused">{{ paused ? '继续' : '暂停' }}</button>
        </div>
      </div>
      <div v-if="q.material" class="material-box">
        <h4>公共材料</h4>
        <p class="prewrap">{{ q.material }}</p>
      </div>
      <p class="prewrap question-stem">{{ q.stem }}</p>
      <p class="prewrap">{{ q.options }}</p>
      <div class="image-grid">
        <ImageNode v-for="a in q.assets.filter((a) => a.role === 'question')" :key="a.id" :src="assetUrl(a.id)" :layout="a.layout" readonly @preview="viewAsset = a.id" />
      </div>
      <h4>我的答案</h4>
      <div class="answer-options">
        <button
          v-for="a in ['A', 'B', 'C', 'D']"
          :key="a"
          :class="['answer-option', { chosen: answer === a }]"
          :disabled="revealed"
          @click="answer = a"
        >
          {{ a }}
        </button>
      </div>
      <template v-if="!revealed"
        ><label
          >本次独立思路（选填）<textarea
            v-model="thought"
            rows="2"
            placeholder="先记下判断依据，再看解析。"
          /></label
        ><button class="btn primary" :disabled="!answer" @click="revealed = true">
          提交答案并查看解析
        </button></template
      >
      <template v-else
        ><div class="answer-box">
          <h3>{{ answer === q.answer ? '答案正确' : '本次答错' }} · 正确答案 {{ q.answer }}</h3>
          <p class="prewrap">{{ q.analysis || '暂无文字解析，请参考解析图片。' }}</p>
          <div class="image-grid">
            <ImageNode v-for="a in q.assets.filter((a) => a.role === 'analysis')" :key="a.id" :src="assetUrl(a.id)" :layout="a.layout" readonly @preview="viewAsset = a.id" />
          </div>
        </div>
        <template v-if="!result"
          ><div class="form-grid">
            <label
              >看答案前的作答依据<select v-model="basis">
                <option value="independent">独立解出／独立尝试</option>
                <option value="guess">猜测</option>
                <option value="remember">记得这道题的答案</option>
                <option value="hint">借助提示或提前看了解析</option>
              </select></label
            ><label
              >看答案前的方法理解<select v-model.number="understanding">
                <option :value="0">不理解</option>
                <option :value="1">部分理解</option>
                <option :value="2">能解释主要步骤</option>
                <option :value="3">能解释适用条件与易错点</option>
              </select></label
            >
          </div>
          <div class="field-label">本次错因（可多选）</div>
          <div class="check-grid">
            <label v-for="f in FAULTS" :key="f" class="check-option"
              ><input type="checkbox" v-model="faults" :value="f" />{{ f }}</label
            >
          </div>
          <div class="field-label">具体出错的知识点（只标记实际出错项）</div>
          <div class="check-grid">
            <label v-for="id in q.knowledge_ids" :key="id" class="check-option"
              ><input type="checkbox" v-model="errorIds" :value="id" />{{
                knowledgeName(id)
              }}</label
            >
          </div>
          <label
            >错因具体表现<textarea
              v-model="faultDetail"
              rows="2"
              placeholder="例如：把增长量当成增长率。知识点标记需要同时选择错因。"
            /></label
          ><label
            >下次怎么做<textarea
              v-model="improvement"
              rows="2"
              placeholder="例如：计算前先标注已知量和所求量。"
            /></label
          ><button class="btn primary" :disabled="working" @click="submit">
            保存复盘并安排下次
          </button></template
        >
        <div v-else class="review-result">
          <span class="score-large">{{ result.score }}<small>/ 4</small></span>
          <div>
            <h3>{{ result.effective ? '有效复盘已记录' : '学习巩固已记录' }}</h3>
            <p>
              {{
                result.result?.reason ?? '本次属于同日巩固或提示学习，不提高掌握分，不延长间隔。'
              }}
            </p>
            <p v-if="result.result">
              下次
              {{ formatDate(result.result.dueAt) }}
            </p>
            <button class="btn primary" @click="next">下一题 →</button>
            <button class="btn" @click="emit('navigate', 'questions', q.id)">查看历史</button>
          </div>
        </div></template
      >
    </section>
    <section v-else class="panel empty review-main">
      <div class="empty-symbol">↻</div>
      <h2>准备好，开始一次主动回忆</h2>
      <p>从左侧选择题目。答案和知识点提示会在提交后展示。</p>
      <button v-if="queue.length" class="btn primary" @click="selectedQuestionId = queue[0].id">
        开始第一题
      </button>
    </section>
  </div>
  <ImageViewer v-if="viewAsset" :asset-id="viewAsset" @close="viewAsset = ''" />
</template>
