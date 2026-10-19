<script setup lang="ts">
import { computed } from "vue";
import { moduleFilter, isMemoryModule } from "../store";
import DateRangeControl from "./DateRangeControl.vue";
import { useDeckStatistics } from "../composables/useDeckStatistics";
const emit = defineEmits<{ navigate: [page: string, id?: string] }>();
const { selection, data, failure, loading, load } = useDeckStatistics(
  () => moduleFilter.value,
  "collection",
);
const memory = computed(() => isMemoryModule(moduleFilter.value));
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">COLLECTION SUMMARY</div>
      <h1>卡片集情况汇总</h1>
      <p>查看学习进度、复盘安排和{{ memory ? "遗忘" : "错误" }}情况。</p>
    </div>
    <DateRangeControl v-model="selection" />
  </div>
  <p v-if="loading" role="status">正在统计…</p>
  <p v-if="failure" role="alert">
    {{ failure }}<button class="btn" @click="load">重试</button>
  </p>
  <template v-if="data">
    <div class="stats-grid">
      <div class="stat-card">
        <span>卡片总数</span><strong>{{ data.summary.cards }}</strong>
        <div>{{ data.summary.unlinked }} 张未关联知识点</div>
      </div>
      <div class="stat-card">
        <span>有效复盘</span><strong>{{ data.summary.effective }}</strong>
        <div>另有 {{ data.summary.practice }} 次练习 / 巩固</div>
      </div>
      <div class="stat-card">
        <span>{{ memory ? "遗忘次数" : "答错次数" }}</span
        ><strong>{{ data.summary.failures }}</strong>
        <div>{{ memory ? "自评为重来" : "以实际选项正误统计" }}</div>
      </div>
      <div class="stat-card">
        <span>当前到期</span><strong>{{ data.summary.due }}</strong>
        <div>{{ data.summary.paused }} 张暂停</div>
      </div>
    </div>
    <div class="summary-grid">
      <section class="panel">
        <h2>{{ memory ? "易忘记忆卡" : "易错卡片" }}</h2>
        <button
          v-for="c in data.weak"
          :key="c.id"
          class="list-row"
          @click="emit('navigate', memory ? 'memory' : 'project', c.id)"
        >
          <span>{{ c.title }}</span
          ><span>{{ c.failures }} 次{{ memory ? "遗忘" : "答错" }} →</span>
        </button>
        <p v-if="!data.weak.length" class="empty compact">还没有对应记录。</p>
      </section>
      <section class="panel">
        <h2>近期学习记录</h2>
        <div v-for="{ date, count } in data.daily" :key="date" class="list-row">
          <span>{{ date }}</span
          ><span>{{ count }} 次</span>
        </div>
        <p v-if="!data.daily.length" class="empty compact">
          完成学习后显示趋势。
        </p>
      </section>
      <section class="panel">
        <h2>{{ memory ? "自评分布" : "作答表现" }}</h2>
        <div v-for="s in [0, 2, 3, 4]" :key="s" class="list-row">
          <span>{{
            s === 0 ? "重来" : s === 2 ? "困难" : s === 3 ? "正常" : "轻松"
          }}</span
          ><span
            >{{
              data.scores.find((r: any) => r.score === s)?.count || 0
            }}
            次</span
          >
        </div>
        <p class="footnote">评分是学习表现，不等于知识点掌握概率。</p>
      </section>
      <section class="panel">
        <h2>接下来可以做什么</h2>
        <button class="list-row" @click="emit('navigate', 'cards')">
          筛选卡片并针对性学习 →</button
        ><button
          v-if="!memory"
          class="list-row"
          @click="emit('navigate', 'insights')"
        >
          分析错因与错误知识点 →</button
        ><button class="list-row" @click="emit('navigate', 'knowledge')">
          查看知识图谱 →
        </button>
      </section>
    </div>
  </template>
</template>
