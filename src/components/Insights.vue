<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from "vue";
import DateRangeControl from "./DateRangeControl.vue";
import { useDeckStatistics } from "../composables/useDeckStatistics";
import { state } from "../store";
import { services } from "../services";
import type { DeckInsights } from "../../shared/review-analytics";
const props = defineProps<{ deckId: string }>();
const emit = defineEmits<{ navigate: [page: string, id?: string] }>();
const { selection, data, failure, loading, load } = useDeckStatistics(
  () => props.deckId,
  "analysis",
);
const failures = computed(
  () =>
    data.value?.knowledge
      .filter((k: any) => k.failures)
      .sort((a: any, b: any) => b.failures - a.failures) || [],
);
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">REFLECTION & INSIGHTS</div>
      <h1>从重复错误中找到突破口</h1>
      <p>
        {{ data?.deckName || "当前卡片集" }} ·
        仅分析本集题目、复盘和关联知识点。
      </p>
    </div>
    <DateRangeControl v-model="selection" />
  </div>
  <p v-if="loading" class="panel" role="status">正在分析当前卡片集…</p>
  <div v-if="failure" class="info-box" role="alert">
    {{ failure }} <button class="btn" @click="load">重试</button>
  </div>
  <template v-if="data && data.deckId === deckId">
    <div class="stats-grid">
      <div class="stat-card">
        <span>有效复盘</span
        ><strong>{{ data.summary.effective }}<small>次</small></strong>
        <div>{{ data.summary.verified }} 道不同题目</div>
      </div>
      <div class="stat-card">
        <span>重做正确率</span
        ><strong>{{
          data.summary.correctRate === null
            ? "—"
            : data.summary.correctRate + "%"
        }}</strong>
        <div>本集 · 所选时间范围</div>
      </div>
      <div class="stat-card">
        <span>反复出错</span
        ><strong>{{ data.summary.repeated }}<small>道</small></strong>
        <div>最近三次有效作答中至少两次答错</div>
      </div>
      <div class="stat-card">
        <span>答对但不稳定</span
        ><strong>{{ data.summary.uncertain }}<small>次</small></strong>
        <div>答对但猜测、记答案或不能解释方法</div>
      </div>
    </div>
    <section class="panel">
      <h2>错误知识点</h2>
      <button
        v-for="k in failures"
        :key="k.id"
        class="list-row"
        @click="emit('navigate', 'knowledge', k.id)"
      >
        <span>{{ k.name }}</span
        ><span>错误标记 {{ k.failures }} 次 →</span>
      </button>
      <p v-if="!failures.length" class="muted">本集尚无标记的错误知识点。</p>
      <p class="footnote">
        只统计本集有效复盘中实际标记的知识点；关联不代表每个知识点都出错。
      </p>
    </section>
    <div class="dashboard-columns">
      <section class="panel">
        <h2>高频错因</h2>
        <p v-if="!data.faults.length" class="empty compact">
          完成复盘并标记具体错因后，这里会形成统计。
        </p>
        <div v-for="f in data.faults" :key="f.name" class="fault-bar">
          <div class="row-between">
            <span>{{ f.name }}</span
            ><strong>{{ f.count }} 次</strong>
          </div>
          <div class="bar-track">
            <div
              :style="{
                width:
                  (f.count / Math.max(1, data.summary.effective)) * 100 + '%',
              }"
            ></div>
          </div>
        </div>
        <p class="footnote">
          同次复盘中，同一错因只计一次；多种错因可同时出现。
        </p>
      </section>
      <section class="panel">
        <h2>优先处理的题目</h2>
        <p v-if="!data.repeated.length" class="empty compact">
          本集暂无符合“反复出错”规则的题目。
        </p>
        <button
          v-for="q in data.repeated"
          :key="q.id"
          class="list-row"
          @click="emit('navigate', 'questions', q.id)"
        >
          <div>
            <strong>{{ q.title }}</strong
            ><small
              >最近调度等级
              {{ q.recent.map((a: any) => a.score).join(" / ") }}</small
            >
          </div>
          <span>查看依据 →</span>
        </button>
      </section>
    </div>
    <section class="panel">
      <div class="section-head">
        <h2>知识点覆盖与分析入口</h2>
        <span class="muted">缺少记录 ≠ 已掌握</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>知识点</th>
            <th>关联题量</th>
            <th>有复盘的题数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="k in data.knowledge" :key="k.id">
            <td>{{ k.name }}</td>
            <td>{{ k.linked }}</td>
            <td>{{ k.reviewed }}</td>
            <td>
              <button
                class="text-btn"
                @click="emit('navigate', 'knowledge', k.id)"
              >
                查看知识卡与证据 →
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!data.knowledge.length" class="empty compact">
        在本集建立知识点并关联题目后，即可分析。
      </p>
    </section>
    <p class="footnote">
      本地规则分析 · 统计仅描述本集已收录题目，不代表整个学科的考试正确率。
    </p>
  </template>
</template>
