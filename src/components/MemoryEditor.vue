<script setup lang="ts">
import { reactive } from 'vue';
import KnowledgePicker from './KnowledgePicker.vue';
import { services } from '../services';
import { moduleFilter, task, working } from '../store';
import type { MemoryCard } from '../../shared/types';
const props = defineProps<{ card?: MemoryCard }>();
const emit = defineEmits<{ close: []; saved: [id: string] }>();
const form = reactive(
  props.card
    ? { ...props.card, knowledge_ids: [...props.card.knowledge_ids] }
    : {
        module: moduleFilter.value,
        title: '',
        cue: '',
        content: '',
        source: '',
        knowledge_ids: [] as string[],
      },
);
async function save() {
  const key = await task(() => services.memory.save(form), '记忆卡已保存');
  if (key) emit('saved', key);
}
</script>
<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <section class="modal">
      <div class="section-head">
        <h2>{{ card ? '编辑' : '新增' }}记忆卡</h2>
        <button class="icon-btn" @click="emit('close')">×</button>
      </div>
      <form @submit.prevent="save">
        <label>标题<input v-model="form.title" required /></label
        ><label>提示<textarea v-model="form.cue" rows="3" required /></label
        ><label>记忆内容<textarea v-model="form.content" rows="7" required /></label
        ><label>来源<input v-model="form.source" /></label>
        <div class="field-label">关联知识点（可多选）</div>
        <KnowledgePicker v-model="form.knowledge_ids" :deck-id="form.module" />
        <button class="btn primary" :disabled="working">保存</button>
      </form>
    </section>
  </div>
</template>
