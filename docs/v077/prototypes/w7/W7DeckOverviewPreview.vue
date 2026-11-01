<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(defineProps<{
  deckName?: string;
  dueCount?: number;
  scheduledSession?: { completed: number; total: number; paused: boolean } | null;
  practiceQueueCount?: number;
}>(), {
  deckName: '行测学习卡片集',
  dueCount: 12,
  scheduledSession: null,
  practiceQueueCount: 2,
});
const emit = defineEmits<{
  startScheduled: [];
  resumeScheduled: [];
  startPractice: [];
  openCards: [];
  openHistory: [];
}>();
const busy = ref(false);
const scheduledLabel = computed(() => props.scheduledSession
  ? `继续正式复盘 · ${props.scheduledSession.completed}/${props.scheduledSession.total}`
  : `开始正式复盘 · ${props.dueCount} 张待复盘`);
async function run(action: 'start' | 'resume' | 'practice') {
  if (busy.value) return;
  busy.value = true;
  try {
    if (action === 'start') emit('startScheduled');
    else if (action === 'resume') emit('resumeScheduled');
    else emit('startPractice');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="w7-overview">
    <header class="heading">
      <div><p class="eyebrow">卡片集概览</p><h1>{{ deckName }}</h1></div>
      <button class="secondary" @click="emit('openCards')">所有卡片</button>
    </header>

    <section class="scheduled" aria-label="正式调度复盘">
      <div class="scheduled-copy">
        <span class="eyebrow">系统复习计划</span>
        <h2>{{ scheduledSession ? '有一轮正式复盘尚未完成' : dueCount ? '今天有卡片需要复习' : '今天的正式复习已完成' }}</h2>
        <p v-if="scheduledSession">这是本卡片集唯一的未完成正式复盘队列。自主练习不会影响它。</p>
        <p v-else>{{ dueCount }} 张卡片已到复习时间。每完成一张，立即保存记录并更新 FSRS。</p>
      </div>
      <button class="primary" :disabled="busy || (!scheduledSession && dueCount === 0)"
        @click="run(scheduledSession ? 'resume' : 'start')">
        {{ busy ? '正在打开…' : scheduledLabel }}
      </button>
    </section>

    <section class="practice">
      <div><h2>自主练习</h2><p>自由选择卡片练习。可以重复练习，不改变正式复习日期。</p></div>
      <button class="secondary" @click="emit('startPractice')">选择卡片开始练习</button>
    </section>

    <footer>
      <span>未完成自主练习队列：{{ practiceQueueCount }} 个</span>
      <button class="link" @click="emit('openHistory')">查看复盘历史</button>
    </footer>
  </main>
</template>

<style scoped>
.w7-overview{display:grid;gap:20px;color:var(--text,#20242b)}
.heading,.scheduled,.practice,footer{display:flex;align-items:center;justify-content:space-between;gap:20px}
.heading h1{margin:4px 0;font-size:24px}.eyebrow{margin:0;color:var(--muted,#737b87);font-size:12px}
.scheduled{padding:24px;border:1px solid var(--border,#dfe3e8);border-radius:14px;background:var(--panel,#fff)}
.scheduled h2,.practice h2{margin:6px 0;font-size:18px}.scheduled p,.practice p{margin:6px 0;color:var(--muted,#737b87);font-size:13px}
button{border:1px solid var(--border,#dfe3e8);border-radius:9px;padding:10px 14px;background:transparent;color:inherit;cursor:pointer}
button.primary{background:var(--accent,#285ec7);border-color:var(--accent,#285ec7);color:white;font-weight:600}
button:disabled{opacity:.45;cursor:not-allowed}.practice{padding:18px 20px;border:1px solid var(--border,#dfe3e8);border-radius:12px}
footer{justify-content:flex-start;color:var(--muted,#737b87);font-size:12px}.link{margin-left:auto;border:0;color:var(--accent,#285ec7)}
@media(max-width:650px){.heading,.scheduled,.practice{align-items:stretch;flex-direction:column}.scheduled button,.practice button{width:100%}}
</style>
