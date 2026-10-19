<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { services } from '../services';
import { state, liveDecks, deckPath, task, working, moduleFilter } from '../store';
import type { Deck } from '../../shared/types';
const search = ref(''),
  editing = ref(false);
const form = reactive<any>({});
const decks = computed(() => liveDecks.value.filter((d) => deckPath(d.id).includes(search.value)));
function edit(d?: Deck, parent?: Deck) {
  Object.keys(form).forEach((k) => delete form[k]);
  Object.assign(
    form,
    d
      ? { ...d }
      : { name: '', kind: parent?.kind ?? 'memory', parent_id: parent?.id ?? '', sort_order: 0 },
  );
  editing.value = true;
}
async function restore(d: Deck) {
  await task(() => services.deck.action({ id: d.id, action: 'restore' }), '卡片集已恢复');
}
async function save() {
  const key = await task(() => services.deck.save(form), '卡片集已保存');
  if (key) {
    editing.value = false;
    moduleFilter.value = key;
  }
}
async function remove(d: Deck) {
  if (!confirm('删除空卡片集及子集？可在下方恢复；有卡片或知识点时会阻止删除。')) return;
  await task(() => services.deck.action({ id: d.id, action: 'delete' }), '已移入回收站');
}
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">CARD COLLECTIONS</div>
      <h1>卡片集管理</h1>
      <p>自由命名，按层级组织。每个卡片集拥有自己的知识点树，卡片可关联多个知识点。</p>
    </div>
    <button class="btn primary" @click="edit()">新增卡片集</button>
  </div>
  <section class="panel">
    <label>查找卡片集<input v-model="search" placeholder="名称或完整路径" /></label>
    <table>
      <thead>
        <tr>
          <th>卡片集</th>
          <th>类型</th>
          <th>卡片 / 知识点</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in decks" :key="d.id">
          <td>{{ deckPath(d.id) }}</td>
          <td>{{ d.kind === 'memory' ? '记忆积累' : '错题复盘' }}</td>
          <td>
            {{
              (d.kind === 'memory' ? state!.memories : state!.questions).filter(
                (c) => c.module === d.id && !c.deleted_at,
              ).length
            }}
            / {{ state!.knowledge.filter((k) => k.module === d.id && !k.deleted_at).length }}
          </td>
          <td>
            <button class="text-btn" @click="edit(d)">编辑 / 移动</button
            ><button class="text-btn" @click="edit(undefined, d)">新增子卡片集</button
            ><button class="text-btn danger" @click="remove(d)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!decks.length" class="muted">没有匹配的卡片集。</p>
  </section>
  <section class="panel">
    <h2>卡片集回收站</h2>
    <div v-for="d in state!.decks.filter((d) => d.deleted_at)" :key="d.id" class="list-row">
      <span>{{ d.name }}</span
      ><button class="btn" @click="restore(d)">恢复</button>
    </div>
    <p class="muted">
      卡片与知识点可在原有页面删除、恢复；学习记录保留。子集继承父集类型，改名和移动不改变稳定编号。
    </p>
  </section>
  <div v-if="editing" class="modal-backdrop" @click.self="editing = false">
    <section class="modal">
      <div class="section-head">
        <h2>{{ form.id ? '编辑卡片集' : '新增卡片集' }}</h2>
        <button class="icon-btn" @click="editing = false">×</button>
      </div>
      <form @submit.prevent="save">
        <label>名称<input v-model="form.name" required maxlength="100" /></label
        ><label
          >类型<select v-model="form.kind" :disabled="!!form.id || !!form.parent_id">
            <option value="memory">记忆积累</option>
            <option value="question">错题复盘</option>
          </select></label
        ><label
          >父卡片集<select
            v-model="form.parent_id"
            @change="form.kind = liveDecks.find((d) => d.id === form.parent_id)?.kind ?? form.kind"
          >
            <option value="">无 · 顶级卡片集</option>
            <option
              v-for="d in liveDecks.filter(
                (d) => d.id !== form.id && (!form.id || d.kind === form.kind),
              )"
              :key="d.id"
              :value="d.id"
            >
              {{ deckPath(d.id) }}
            </option>
          </select></label
        ><label>排序<input v-model.number="form.sort_order" type="number" /></label>
        <p class="muted">已有卡片集保留原类型；子集按父集类型创建。</p>
        <button class="btn primary" :disabled="working">保存</button>
      </form>
    </section>
  </div>
</template>
