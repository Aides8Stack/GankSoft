<script setup lang="ts">
import {calendarDay} from '../../shared/calendar';

import { computed, ref } from 'vue';
import {
  state,
  liveDecks,
  liveFolders,
  liveQuestions,
  liveMemories,
  dueQuestions,
  dueMemories,
  deckPath,
  folderPath,
} from '../store';
const emit = defineEmits<{ navigate: [page: string, id?: string] }>();
const kind = ref('all'),
  folder = ref(''),
  onlyTasks = ref(false);
function inFolder(key: string | null) {
  if (!folder.value) return true;
  let f = liveFolders.value.find((f) => f.id === key);
  while (f) {
    if (f.id === folder.value) return true;
    f = liveFolders.value.find((p) => p.id === f!.parent_id);
  }
  return false;
}
const rows = computed(() =>
  liveDecks.value
    .filter((d) => (kind.value === 'all' || d.kind === kind.value) && inFolder(d.folder_id))
    .map((d) => {
      const cards = (d.kind === 'memory' ? liveMemories.value : liveQuestions.value).filter(
        (c) => c.module === d.id,
      );
      const reviews =
        d.kind === 'memory'
          ? state.value!.memoryReviews.filter((r) => cards.some((c) => c.id === r.card_id))
          : state.value!.attempts.filter((r) => cards.some((c) => c.id === r.question_id));
      const due = (d.kind === 'memory' ? dueMemories.value : dueQuestions.value).filter(
        (c) => c.module === d.id,
      );
      const newCards = cards.filter(
        (c) => !reviews.some((r) => ('card_id' in r ? r.card_id : r.question_id) === c.id),
      );
      return {
        ...d,
        total: cards.length,
        newCount: newCards.length,
        due: due.length,
        overdue: due.filter((c) => Date.now() - new Date(c.due_at!).getTime() > 86400000).length,
        today: reviews.filter(
          (r) => r.effective && calendarDay(new Date(r.created_at),state.value!.settings.studyTimezone) === calendarDay(new Date(),state.value!.settings.studyTimezone),
        ).length,
        session: state.value!.sessions.some((s) => s.deck_id === d.id),
      };
    })
    .filter((d) => !onlyTasks.value || d.due || d.newCount || d.session),
);
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">LEARNING OVERVIEW</div>
      <h1>今天，从一次主动回忆开始。</h1>
      <p>查看各个卡片集的学习安排，选择一个继续。</p>
    </div>
    <span class="tag">{{ new Date().toLocaleDateString('zh-CN') }}</span>
  </div>
  <div class="stats-grid">
    <div class="stat-card">
      <span>卡片集</span><strong>{{ liveDecks.length }}</strong>
      <div>{{ liveQuestions.length + liveMemories.length }} 张卡片</div>
    </div>
    <div class="stat-card accent">
      <span>当前到期</span><strong>{{ dueQuestions.length + dueMemories.length }}</strong>
      <div>逐卡计算复盘时间</div>
    </div>
    <div class="stat-card">
      <span>记忆积累</span><strong>{{ liveMemories.length }}</strong>
      <div>{{ dueMemories.length }} 张到期</div>
    </div>
    <div class="stat-card">
      <span>错题复盘</span><strong>{{ liveQuestions.length }}</strong>
      <div>{{ dueQuestions.length }} 张到期</div>
    </div>
  </div>
  <section v-if="rows.some(d => d.due || d.session)" class="today-callout">
    <div class="callout-symbol" aria-hidden="true">↻</div>
    <div><span class="eyebrow">下一步</span><h2>{{ rows.some(d => d.session) ? '接着上次的进度，继续学习' : '留一点时间，巩固已经学过的内容' }}</h2><p>按下方筛选范围选择卡片集，每次复盘的思路都会独立保存。</p></div>
    <button class="btn primary" @click="emit('navigate', rows.some(d => d.session) ? 'resume' : 'start', (rows.find(d => d.session) ?? rows.find(d => d.due))!.id)">{{ rows.some(d => d.session) ? '继续学习' : '开始复盘' }} <span aria-hidden="true">→</span></button>
  </section>
  <section class="panel">
    <div class="section-head">
      <h2>卡片集定期复盘</h2>
      <span class="muted">{{ rows.length }} 个卡片集 · 到期数包含全部待复盘卡片</span>
    </div>
    <div class="toolbar">
      <select v-model="kind" aria-label="卡片集类型">
        <option value="all">全部类型</option>
        <option value="memory">记忆积累</option>
        <option value="question">错题复盘</option></select
      ><select v-model="folder" aria-label="文件夹范围">
        <option value="">全部文件夹</option>
        <option v-for="f in liveFolders" :key="f.id" :value="f.id">
          {{ folderPath(f.id) }}
        </option></select
      ><label class="check-option"><input type="checkbox" v-model="onlyTasks" />仅看有任务</label>
    </div>
    <div class="table-scroll"><table>
      <thead>
        <tr>
          <th>卡片集</th>
          <th>待学新卡</th>
          <th>到期</th>
          <th>逾期</th>
          <th>今日完成</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in rows" :key="d.id">
          <td>
            <button class="text-btn" @click="emit('navigate', 'open', d.id)">{{ d.name }}</button
            ><small class="block muted"
              >{{ deckPath(d.id) }} · {{ d.kind === 'memory' ? '记忆积累' : '错题复盘' }}</small
            >
          </td>
          <td>{{ d.newCount }}</td>
          <td>
            <button class="text-btn due-count" :class="{ 'has-due': d.due > 0 }" @click="emit('navigate', 'due', d.id)">{{ d.due }}</button>
          </td>
          <td>{{ d.overdue }}</td>
          <td>{{ d.today }}</td>
          <td>
            <button class="btn" :disabled="!d.due" @click="emit('navigate', 'start', d.id)">
              开始复盘</button
            ><button v-if="d.session" class="text-btn" @click="emit('navigate', 'resume', d.id)">
              继续学习
            </button>
          </td>
        </tr>
      </tbody>
    </table></div>
    <div v-if="!rows.length" class="empty compact">
      <p>没有符合条件的卡片集。可在左侧卡片库右键新建。</p>
    </div>
  </section>
  <div class="info-box">
    先打开卡片集录入或导入内容；学习记录与 FSRS 状态随卡片保存，改名、移动文件夹都不会重置。
  </div>
</template>
