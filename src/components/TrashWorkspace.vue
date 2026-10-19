<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { services } from '../services';
import { state, task, working, formatDate, notice } from '../store';
const ownerName = (id: string) => state.value!.decks.find(d => d.id === id)?.name ?? '原卡片集已清理';
const query = ref(''),
  kind = ref('all'),
  selected = ref<string[]>([]),
  restoreName = ref('');
const labels: Record<string, string> = {
  folder: '文件夹',
  deck: '卡片集',
  knowledge: '知识点',
  question: '错题卡',
  memory: '记忆卡',
};
const records = computed(() =>
  [
    ...state.value!.folders.map((r) => ({ ...r, kind: 'folder', title: r.name, owner: '目录' })),
    ...state.value!.decks.map((r) => ({
      ...r,
      kind: 'deck',
      title: r.name,
      owner: r.kind === 'memory' ? '记忆积累' : '错题复盘',
    })),
    ...state.value!.knowledge.map((r) => ({
      ...r,
      kind: 'knowledge',
      title: r.name,
      owner: ownerName(r.module),
    })),
    ...state.value!.questions.map((r) => ({ ...r, kind: 'question', owner: ownerName(r.module) })),
    ...state.value!.memories.map((r) => ({ ...r, kind: 'memory', owner: ownerName(r.module) })),
  ]
    .filter((r) => r.deleted_at)
    .map((r) => ({ ...r, key: r.kind + ':' + r.id }))
    .sort(
      (a, b) =>
        (b.deleted_at ?? '').localeCompare(a.deleted_at ?? '') || a.title.localeCompare(b.title),
    ),
);
const filtered = computed(() =>
  records.value.filter(
    (r) =>
      (kind.value === 'all' || kind.value === r.kind) &&
      (r.title + r.owner).toLowerCase().includes(query.value.trim().toLowerCase()),
  ),
);
const allSelected = computed(
  () => filtered.value.length > 0 && filtered.value.every((r) => selected.value.includes(r.key)),
);
watch([query, kind], () => {
  selected.value = [];
});
watch(records, (rows) => {
  selected.value = selected.value.filter((key) => rows.some((r) => r.key === key));
});
function items(keys = selected.value) {
  return records.value.filter((r) => keys.includes(r.key)).map((r) => ({ kind: r.kind, id: r.id }));
}
function toggleAll() {
  selected.value = allSelected.value ? [] : filtered.value.map((r) => r.key);
}
async function restore(keys = selected.value) {
  const result = await task(
    () =>
      services.trash.manage({ action: 'restore', items: items(keys), name: restoreName.value }),
    '所选记录已恢复',
  );
  if (result) {
    selected.value = [];
    restoreName.value = '';
  }
}
const deletion = ref<any>(null);
async function previewDelete() {
  const targets = items();
  const result = await task(() => services.trash.preview({ items: targets }));
  if (result) deletion.value = { ...result, items: targets };
}
async function purge() {
  const plan = deletion.value;
  const result = await task(
    () => services.trash.manage({ action: 'purge', items: plan.items, expected: plan.revision }),
    '所选范围已彻底删除',
  );
  deletion.value = null;
  if (result) {
    selected.value = [];
    if (result.attachmentCleanupPending)
      notice.value = '记录已删除，但部分图片文件未能清理，请检查数据目录权限。';
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">RECYCLE BIN</div>
      <h1>回收站</h1>
      <p>集中管理已删除内容，需要时恢复，或确认后彻底删除。</p>
    </div>
    <span class="tag">共 {{ records.length }} 条记录</span>
  </div>
  <section class="panel">
    <div class="filter-grid trash-filters">
      <label>搜索记录<input v-model="query" placeholder="名称、题目或所属卡片集" /></label
      ><label
        >记录类型<select v-model="kind" aria-label="回收站记录类型">
          <option value="all">全部类型</option>
          <option v-for="(label, key) in labels" :key="key" :value="key">{{ label }}</option>
        </select></label
      >
    </div>
    <div class="selection-bar trash-actions">
      <label class="check-option"
        ><input
          type="checkbox"
          :checked="allSelected"
          :indeterminate="selected.length > 0 && !allSelected"
          :disabled="!filtered.length || working"
          @change="toggleAll"
        />全选当前结果</label
      ><span class="muted">符合 {{ filtered.length }} 条 · 已选 {{ selected.length }} 条</span
      ><button class="text-btn" :disabled="!selected.length || working" @click="selected = []">
        取消选择</button
      ><button class="btn primary" :disabled="!selected.length || working" @click="restore()">
        恢复所选</button
      ><button class="btn danger" :disabled="!selected.length || working" @click="previewDelete">
        彻底删除所选
      </button>
    </div>
    <details>
      <summary>恢复说明与知识点重名处理</summary>
      <p class="muted">
        文件夹与卡片集会恢复原删除批次中的内容。若所属卡片集也已删除，请一并选择或先恢复卡片集。单独恢复知识点不会撤销此前的合并和关联迁移；批量恢复失败时，本批次全部保持原状。
      </p>
      <label
        >知识点重名时的新名称（仅单条恢复使用）<input
          v-model="restoreName"
          placeholder="通常留空；重名时填写后恢复该知识点"
      /></label>
    </details>
  </section>
  <section class="panel trash-list">
    <div class="section-head">
      <h2>已删除记录</h2>
      <span class="muted">彻底删除前可核对影响范围</span>
    </div>
    <div v-for="r in filtered" :key="r.key" class="trash-row">
      <input
        type="checkbox"
        v-model="selected"
        :value="r.key"
        :aria-label="'选择回收站记录：' + r.title"
        :disabled="working"
      />
      <div class="trash-row-body">
        <h3>{{ r.title }}</h3>
        <div class="card-meta">
          <span class="badge-soft">{{ labels[r.kind] }}</span
          ><span>{{ r.owner }}</span
          ><span>删除于 {{ formatDate(r.deleted_at) }}</span>
        </div>
      </div>
      <button class="btn" :disabled="working" @click="restore([r.key])">恢复</button>
    </div>
    <div v-if="!filtered.length" class="empty">
      <h3>{{ records.length ? '没有符合条件的记录' : '回收站为空' }}</h3>
      <p>
        {{
          records.length
            ? '调整搜索或记录类型，查看其他内容。'
            : '删除后的文件夹、卡片集、知识点和卡片会显示在这里。'
        }}
      </p>
      <button
        v-if="records.length"
        class="btn"
        @click="
          query = '';
          kind = 'all';
        "
      >
        清空筛选
      </button>
    </div>
  </section>
  <div v-if="deletion" class="modal-backdrop" @click.self="!working && (deletion = null)">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="trash-confirm-title">
      <div class="section-head">
        <h2 id="trash-confirm-title">确认彻底删除</h2>
        <button
          class="icon-btn"
          aria-label="取消彻底删除"
          :disabled="working"
          @click="deletion = null"
        >
          ×
        </button>
      </div>
      <p>
        所选 {{ deletion.items.length }} 条记录实际影响
        <strong>{{ deletion.total }}</strong> 条内容，包含所选文件夹或卡片集内仍在回收站的内容。
      </p>
      <div class="purge-counts">
        <span v-for="(label, key) in labels" :key="key"
          >{{ label }} <strong>{{ deletion.counts[key] }}</strong></span
        >
      </div>
      <p class="danger">
        同时删除范围内的
        {{ deletion.history }} 条复盘记录及对应排期。此操作无法从回收站撤销，已有备份不受影响。
      </p>
      <div class="modal-footer">
        <button class="btn" :disabled="working" @click="deletion = null">取消</button
        ><button class="btn danger" :disabled="working" @click="purge">确认彻底删除</button>
      </div>
    </section>
  </div>
</template>
