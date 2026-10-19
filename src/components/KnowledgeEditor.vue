<script setup lang="ts">
import { MODULES, deckName, deckPath, inDeckScope } from '../store';
import { services } from '../services';
import { reactive } from 'vue';
import { type Knowledge } from '../../shared/types';
import { liveKnowledge, task, working } from '../store';
const props = defineProps<{ node?: Knowledge; parent?: Knowledge; module?: string }>();
const emit = defineEmits<{ close: []; saved: [id: string] }>();
const form = reactive({
  id: props.node?.id,
  name: props.node?.name ?? '',
  module: props.node?.module ?? props.parent?.module ?? props.module ?? MODULES.value[0] ?? '',
  parent_id: props.node?.parent_id ?? props.parent?.id ?? '',
  aliases: props.node?.aliases ?? '',
  principle: props.node?.principle ?? '',
  conditions: props.node?.conditions ?? '',
  method: props.node?.method ?? '',
  traps: props.node?.traps ?? '',
  version: props.node?.version,
});
async function save() {
  const result = await task(
    () => services.knowledge.save(form),
    '知识点已保存，相关页面已同步',
  );
  if (result) emit('saved', result);
}
</script>
<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <section class="modal">
      <div class="section-head">
        <h2>{{ node ? '编辑知识点' : parent ? '新增下级知识点' : '新增知识点' }}</h2>
        <button class="icon-btn" @click="emit('close')">×</button>
      </div>
      <form @submit.prevent="save">
        <label
          >知识点名称<input v-model="form.name" required placeholder="例如：基期量计算"
        /></label>
        <div class="form-grid">
          <label
            >所属卡片集<select v-model="form.module" @change="form.parent_id = ''">
              <option v-for="m in MODULES" :key="m" :value="m">{{ deckPath(m) }}</option>
            </select></label
          ><label
            >上级知识点<select v-model="form.parent_id">
              <option value="">无 · 模块下的一级知识点</option>
              <option
                v-for="k in liveKnowledge.filter(
                  (k) => k.module === form.module && k.id !== form.id,
                )"
                :key="k.id"
                :value="k.id"
              >
                {{ k.name }}
              </option>
            </select></label
          >
        </div>
        <label>别名<input v-model="form.aliases" placeholder="用于搜索，可用分号分隔" /></label
        ><label>原理／核心理解<textarea v-model="form.principle" rows="3" /></label
        ><label>识别信号与适用条件<textarea v-model="form.conditions" rows="2" /></label
        ><label>方法与步骤<textarea v-model="form.method" rows="3" /></label
        ><label>易错点与辨析<textarea v-model="form.traps" rows="3" /></label>
        <div class="modal-footer">
          <button class="btn" type="button" @click="emit('close')">取消</button
          ><button class="btn primary" :disabled="working">保存知识点</button>
        </div>
      </form>
    </section>
  </div>
</template>
