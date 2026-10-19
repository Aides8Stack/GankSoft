<script setup lang="ts">
import ImageNode from "./ImageNode.vue";
import ImageViewer from "./ImageViewer.vue";
const viewImage = ref("");
import { MEMORY_MODULES, deckName, deckPath, inDeckScope } from '../store';
import { ref, reactive, computed, watch } from 'vue';
import { services } from '../services';
import { type MemoryCard } from '../../shared/types';
import {
  state,
  liveMemories,
  dueMemories,
  liveKnowledge,
  moduleFilter,
  selectedMemoryId,
  task,
  working,
  formatDate,
  assetUrl,
} from '../store';
const props = defineProps<{ reviewMode?: boolean }>();
const emit = defineEmits<{ navigate: [page: string, id?: string] }>();
const query = ref(''),
  onlyDue = ref(!!props.reviewMode),
  editing = ref(false),
  revealed = ref(false),
  result = ref<any>(null),
  note = ref('');
const form = reactive<any>({});
const card = computed(() =>
  liveMemories.value.find((m) => m.id === selectedMemoryId.value && inDeckScope(m.module)),
);
if (props.reviewMode) selectedMemoryId.value = '';
const cards = computed(() =>
  (onlyDue.value ? dueMemories.value : liveMemories.value).filter(
    (m) => inDeckScope(m.module) && (m.title + m.cue + m.content).includes(query.value),
  ),
);
function nextCard() {
  const next = cards.value.find((m) => m.id !== selectedMemoryId.value);
  selectedMemoryId.value = next?.id ?? '';
}
const history = computed(() =>
  state.value!.memoryReviews.filter((r) => r.card_id === card.value?.id),
);
const legacyAssets = computed(
  () =>
    card.value?.assets ?? state.value!.questions.find((q) => q.id === (card.value as any)?.legacy_question_id)?.assets ??
    [],
);
watch(selectedMemoryId, () => {
  revealed.value = false;
  result.value = null;
  note.value = '';
});
function edit(m?: MemoryCard) {
  Object.keys(form).forEach((k) => delete form[k]);
  Object.assign(
    form,
    m
      ? { ...m, knowledge_ids: [...m.knowledge_ids] }
      : {
          module: MEMORY_MODULES.value.includes(moduleFilter.value)
            ? moduleFilter.value
            : (MEMORY_MODULES.value[0] ?? ''),
          title: '',
          cue: '',
          content: '',
          source: '',
          knowledge_ids: [],
        },
  );
  editing.value = true;
}
async function save() {
  const id = await task(() => services.memory.save(form), '记忆卡已保存');
  if (id) {
    moduleFilter.value = form.module;
    selectedMemoryId.value = id;
    revealed.value = false;
    result.value = null;
    note.value = '';
    editing.value = false;
  }
}
async function review(score: number) {
  if (!card.value) return;
  const data = await task(
    () =>
      services.memory.review({
        id: card.value!.id,
        version: card.value!.version,
        score,
        note: note.value,
      }),
    '记忆复盘已记录',
  );
  if (data) result.value = data;
}
async function action(value: string) {
  if (!card.value) return;
  if (value === 'delete' && !confirm('将这条积累移入回收站？复盘历史保留。')) return;
  await task(
    () => services.memory.action({ id: card.value!.id, action: value }),
    '记忆卡状态已更新',
  );
}
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">MEMORY & RECALL</div>
      <h1>记忆积累</h1>
      <p>先根据提示主动回忆，再展开内容，对看答案前的记忆情况自评。</p>
    </div>
    <button class="btn primary" @click="edit()">＋ 新增记忆卡</button>
  </div>
  <div class="toolbar panel">
    <input v-model="query" class="search-input" placeholder="搜索标题、提示、内容…" /><label
      class="check-option"
      ><input type="checkbox" v-model="onlyDue" />只看到期</label
    ><span class="muted">{{ cards.length }} 条积累 · {{ dueMemories.length }} 条到期</span>
  </div>
  <div class="library-layout">
    <section class="panel question-list">
      <button
        class="question-card"
        v-for="m in cards"
        :key="m.id"
        :class="{ selected: card?.id === m.id }"
        @click="selectedMemoryId = m.id"
      >
        <span class="tag">{{ deckName(m.module) }}</span>
        <h3>{{ m.title }}</h3>
        <p>{{ m.cue }}</p>
        <div class="row-between card-foot">
          <span>{{ m.due_at ? '已建立复盘计划' : '待首次回忆' }}</span
          ><span>{{ m.paused ? '已暂停' : formatDate(m.due_at) }}</span>
        </div>
      </button>
      <div v-if="!cards.length" class="empty"><p>添加积累，或导入已处理的记忆卡文件。</p></div>
    </section>
    <section v-if="card" class="panel detail-panel">
      <div class="section-head">
        <h2>{{ card.title }}</h2>
        <button class="btn" @click="edit(card)">编辑积累</button>
      </div>
      <span class="tag">{{ deckName(card.module) }}</span>
      <h4>记忆提示</h4>
      <p class="prewrap question-stem">{{ card.cue }}</p>
      <div class="image-grid">
        <ImageNode v-for="a in legacyAssets.filter((a) => a.role === 'question')" :key="a.id" :src="assetUrl(a.id)" :layout="a.layout" readonly @preview="viewImage = assetUrl(a.id)" />
      </div>
      <button v-if="!revealed" class="btn primary" @click="revealed = true">
        已尝试回忆，展开内容</button
      ><template v-else
        ><div class="answer-box">
          <h3>积累内容</h3>
          <p class="prewrap">{{ card.content }}</p>
          <div class="image-grid">
            <ImageNode v-for="a in legacyAssets.filter((a) => a.role === 'analysis')" :key="a.id" :src="assetUrl(a.id)" :layout="a.layout" readonly @preview="viewImage = assetUrl(a.id)" />
          </div>
        </div>
        <template v-if="!result"
          ><label>回忆中发现的问题（选填）<textarea v-model="note" rows="2" /></label>
          <h4>看内容前，我记得怎样？</h4>
          <div class="inline-actions">
            <button
              v-for="(label, i) in [
                '完全忘记',
                '只记得零散内容',
                '记得一部分',
                '基本完整',
                '准确且能解释',
              ]"
              :key="i"
              class="btn"
              :disabled="working"
              @click="review(i)"
            >
              {{ i }} · {{ label }}
            </button>
          </div></template
        >
        <div v-else class="info-box">
          <button class="btn primary" @click="nextCard">下一张 →</button
          ><strong>本次自评 {{ result.score }} / 4</strong>
          <p>{{ result.result?.reason ?? '同日巩固已保存，不抬高掌握分或延长间隔。' }}</p>
        </div></template
      >
      <h4>关联知识点</h4>
      <div class="tag-row">
        <button
          v-for="id in card.knowledge_ids"
          :key="id"
          class="tag link"
          @click="emit('navigate', 'knowledge', id)"
        >
          {{ liveKnowledge.find((k) => k.id === id)?.name }} ↗
        </button>
      </div>
      <p class="footnote">来源：{{ card.source || '未填写' }}</p>
      <div class="inline-actions">
        <button class="text-btn" @click="action(card.paused ? 'resume' : 'pause')">
          {{ card.paused ? '恢复复盘' : '暂停复盘' }}</button
        ><button class="text-btn danger" @click="action('delete')">移入回收站</button>
      </div>
      <h4>历史自评</h4>
      <div class="list-row" v-for="r in history" :key="r.id">
        <div>
          <strong>{{ r.score }} / 4 · {{ r.effective ? '有效回忆' : '同日巩固' }}</strong
          ><small>{{ r.note }}</small>
        </div>
        <span>{{ formatDate(r.created_at) }}</span>
      </div>
    </section>
    <section v-else class="panel empty">
      <h3>选择一条积累开始回忆</h3>
      <p>记忆卡无需选项和正确答案。</p>
    </section>
  </div>
  <div v-if="editing" class="modal-backdrop" @click.self="editing = false">
    <section class="modal">
      <div class="section-head">
        <h2>{{ form.id ? '编辑积累' : '新增记忆卡' }}</h2>
        <button class="icon-btn" @click="editing = false">×</button>
      </div>
      <form @submit.prevent="save">
        <label
          >卡片集<select v-model="form.module" @change="form.knowledge_ids = []">
            <option v-for="m in MEMORY_MODULES" :key="m" :value="m">{{ deckPath(m) }}</option>
          </select></label
        ><label>标题<input v-model="form.title" required /></label
        ><label
          >记忆提示<textarea
            v-model="form.cue"
            required
            rows="2"
            placeholder="例如：这组概念的核心区别是什么？"
          /></label
        ><label>积累内容<textarea v-model="form.content" required rows="7" /></label>
        <div class="field-label">知识点</div>
        <div class="check-grid">
          <label class="check-option" v-for="k in liveKnowledge" :key="k.id"
            ><input type="checkbox" v-model="form.knowledge_ids" :value="k.id" />{{ k.name }}</label
          >
          <p class="muted" v-if="!liveKnowledge.some((k) => k.module === form.module)">
            可以先保存，再到对应卡片集的知识点树建立知识点。
          </p>
        </div>
        <label>来源<input v-model="form.source" /></label>
        <div class="modal-footer">
          <button class="btn primary" :disabled="working">保存记忆卡</button>
        </div>
      </form>
    </section>
  </div>
<ImageViewer v-if="viewImage" :src="viewImage" @close="viewImage = ''" />
</template>
