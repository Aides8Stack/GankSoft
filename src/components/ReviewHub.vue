<script setup lang="ts">
import { computed, ref } from 'vue';
import { dueMemories, dueQuestions, inDeckScope } from '../store';
import ReviewWorkspace from './ReviewWorkspace.vue';
import MemoryWorkspace from './MemoryWorkspace.vue';
const emit = defineEmits<{ navigate: [page: string, id?: string] }>();
const type = ref('question');
const memoryCount = computed(() => dueMemories.value.filter((m) => inDeckScope(m.module)).length);
const questionCount = computed(
  () => dueQuestions.value.filter((m) => inDeckScope(m.module)).length,
);
</script>
<template>
  <div class="panel inline-actions">
    <button class="btn" :class="{ primary: type === 'question' }" @click="type = 'question'">
      错题复盘 · 到期 {{ questionCount }}</button
    ><button class="btn" :class="{ primary: type === 'memory' }" @click="type = 'memory'">
      记忆复盘 · 到期 {{ memoryCount }}</button
    ><span class="muted">两类卡片分别记录每次复盘，并据评分调整下次日期。</span>
  </div>
  <ReviewWorkspace
    v-if="type === 'question'"
    @navigate="(p, id) => emit('navigate', p, id)"
  /><MemoryWorkspace v-else :review-mode="true" @navigate="(p, id) => emit('navigate', p, id)" />
</template>
