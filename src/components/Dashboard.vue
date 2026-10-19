<script setup lang="ts">
import {calendarDay} from '../../shared/calendar';

import { MODULES, isMemoryModule, deckName, deckPath, inDeckScope } from '../store';
import { computed } from 'vue';

import {
  state,
  liveMemories,
  dueMemories,
  liveQuestions,
  liveKnowledge,
  dueQuestions,
  formatDate,
  selectedQuestionId,
} from '../store';
const emit = defineEmits<{ navigate: [page: string, id?: string] }>();
const attempts = computed(() =>
  state.value!.attempts.filter(
    (a) => a.effective && liveQuestions.value.some((q) => q.id === a.question_id),
  ),
);
const correct = computed(() =>
  attempts.value.length
    ? Math.round((attempts.value.filter((a) => a.correct).length / attempts.value.length) * 100)
    : null,
);
const today = computed(
  () =>
    attempts.value.filter(
      (a) => calendarDay(new Date(a.created_at),state.value!.settings.studyTimezone) === calendarDay(new Date(),state.value!.settings.studyTimezone),
    ).length,
);
const recent = computed(() => state.value!.attempts.slice(0, 5));
function start() {
  selectedQuestionId.value = '';
  emit('navigate', 'review');
}
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">LEARNING OVERVIEW</div>
      <h1>把每一次错误，变成下一次进步。</h1>
      <p>整理知识，主动回忆，按自己的节奏持续复盘。</p>
    </div>
    <button class="btn primary" @click="emit('navigate', 'questions', 'new')">＋ 录入错题</button>
  </div>
  <div class="info-box row-between">
    <span
      >记忆卡：{{ liveMemories.length }} 条记忆积累，{{
        dueMemories.length
      }}
      条到期。与错题统计分别管理。</span
    ><button class="btn" @click="emit('navigate', 'memory')">开始记忆复盘 →</button>
  </div>
  <div class="stats-grid">
    <div class="stat-card">
      <span>收录错题</span><strong>{{ liveQuestions.length }}<small>道</small></strong>
      <div>分布于 {{ new Set(liveQuestions.map((q) => q.module)).size }} 个模块</div>
    </div>
    <div class="stat-card">
      <span>知识点</span><strong>{{ liveKnowledge.length }}<small>个</small></strong>
      <div>{{ state!.relations.length }} 条相关关系</div>
    </div>
    <div class="stat-card accent">
      <span>到期复盘</span><strong>{{ dueQuestions.length }}<small>道</small></strong>
      <div>今日已有效复盘 {{ today }} 道</div>
    </div>
    <div class="stat-card">
      <span>收录错题重做正确率</span
      ><strong>{{ correct === null ? '—' : correct + '%' }}<small></small></strong>
      <div>{{ attempts.length }} 次有效复盘 · 全部历史</div>
    </div>
  </div>
  <div class="dashboard-columns">
    <section class="panel">
      <div class="section-head">
        <h2>
          今日复盘 <span class="badge">{{ dueQuestions.length }}</span>
        </h2>
        <button class="text-btn" @click="start">查看全部 →</button>
      </div>
      <div class="review-callout">
        <div class="round-icon">↻</div>
        <div>
          <h3>{{ dueQuestions.length ? '让记忆在合适的时候加深' : '建立你的第一条复盘记录' }}</h3>
          <p>每日上限 {{ state!.settings.dailyLimit }} 道，优先处理反复错误和到期内容。</p>
        </div>
        <button class="btn primary" @click="start">开始复盘 →</button>
      </div>
      <div v-if="!dueQuestions.length" class="empty compact">
        <div class="empty-symbol">✓</div>
        <h3>当前没有到期任务</h3>
        <p>录入并整理错题后，会自动进入复盘队列。</p>
      </div>
      <button
        v-for="q in dueQuestions.slice(0, 4)"
        :key="q.id"
        class="list-row"
        @click="emit('navigate', 'questions', q.id)"
      >
        <div>
          <span class="tag">{{ deckName(q.module) }}</span
          ><strong>{{ q.title }}</strong
          ><small>下次复盘 {{ formatDate(q.due_at) }}</small>
        </div>
        <span>→</span>
      </button>
    </section>
    <section class="panel">
      <div class="section-head">
        <h2>知识版图</h2>
        <button class="text-btn" @click="emit('navigate', 'knowledge')">打开图谱 →</button>
      </div>
      <div class="module-summary" v-for="m in MODULES" :key="m">
        <span>{{ deckName(m) }}</span>
        <div class="bar-track">
          <div
            :style="{
              width:
                Math.min(
                  100,
                  (isMemoryModule(m) ? liveMemories : liveQuestions).filter((q) => q.module === m)
                    .length * 10,
                ) + '%',
            }"
          ></div>
        </div>
        <small
          >{{
            (isMemoryModule(m) ? liveMemories : liveQuestions).filter((q) => q.module === m).length
          }}
          {{ isMemoryModule(m) ? '条积累' : '题' }}</small
        >
      </div>
      <p class="footnote">按收录题量展示，不代表学科掌握程度。</p>
    </section>
  </div>
  <div class="dashboard-columns">
    <section class="panel">
      <div class="section-head"><h2>最近复盘</h2></div>
      <div v-if="!recent.length" class="empty compact">
        <p>每次复盘的思路、评分和变化都会记录在这里。</p>
      </div>
      <div v-for="a in recent" :key="a.id" class="list-row">
        <div>
          <strong>{{
            state!.questions.find((q) => q.id === a.question_id)?.title ?? '历史题目'
          }}</strong
          ><small
            >{{ formatDate(a.created_at) }} · {{ a.effective ? '有效复盘' : '学习巩固' }}</small
          >
        </div>
        <span class="score-chip">{{ a.score }} / 4</span>
      </div>
    </section>
  </div>
</template>
