<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount, nextTick } from 'vue';
import type { CardKind } from '../../shared/review-contract';
import type { CardReviewStats } from '../../shared/review-analytics';
import AssessmentSummary from './AssessmentSummary.vue';
import ReviewLineChart from './ReviewLineChart.vue';
import ReviewRecordDetail from './ReviewRecordDetail.vue';
import { services } from '../services';
const props = defineProps<{ kind: CardKind; cardId: string }>();
const emit = defineEmits<{ close: [] }>();
const data = ref<CardReviewStats | null>(null),
  loading = ref(false),
  failure = ref(''),
  detail = ref('');
let sequence = 0;
async function load() {
  const seq = ++sequence;
  loading.value = true;
  failure.value = '';
  try {
    const result = await services.cards.timeline({
      kind: props.kind,
      card_id: props.cardId,
    });
    if (seq === sequence) data.value = result;
  } catch (e) {
    if (seq === sequence) {
      failure.value = String(e);
      data.value = null;
    }
  } finally {
    if (seq === sequence) loading.value = false;
  }
}
watch(
  () => [props.kind, props.cardId],
  () => {
    detail.value = '';
    void load();
  },
  { immediate: true },
);
onBeforeUnmount(() => sequence++);
const records = computed(() => data.value?.records ?? []);
const formalOnly = ref(false);
const chartRecords = computed(() =>
  formalOnly.value ? records.value.filter((r) => r.effective) : records.value,
);
const activeRecord = computed(() => records.value.find((r) => r.id === detail.value));
const recordPanel = ref<HTMLElement | null>(null);
async function selectRecord(id: string) {
  detail.value = id;
  await nextTick();
  recordPanel.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
const format = (date: string) =>
  new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
const delta = (n: number | null) => (n == null ? '—' : (n > 0 ? '+' : '') + n.toFixed(1));
</script>
<template>
  <div class="modal-backdrop analytics-backdrop" @click.self="emit('close')">
    <section
      class="modal review-analytics"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-analytics-title"
    >
      <div class="section-head">
        <div>
          <div class="eyebrow">REVIEW HISTORY & CHANGE</div>
          <h2 id="review-analytics-title">单卡复盘数据与变化</h2>
          <p v-if="data" class="muted">{{ data.title }} · 累计 {{ data.lifetimeCount }} 次</p>
        </div>
        <button class="icon-btn" aria-label="关闭复盘数据" @click="emit('close')">×</button>
      </div>
      <p v-if="loading" role="status">正在读取复盘数据…</p>
      <div v-if="failure" class="info-box" role="alert">
        {{ failure }} <button class="btn" @click="load">重新读取</button>
      </div>
      <template v-if="data && !loading">
        <AssessmentSummary :evidence="data.evidence" :model="data.memoryModel" />
        <div class="analytics-metrics">
          <div>
            <small>复盘次数</small><strong>{{ data.summary.total }}</strong
            ><span>有效 {{ data.summary.effective }} · 练习／巩固 {{ data.summary.practice }}</span>
          </div>
          <div v-if="kind === 'question'">
            <small>有效复盘正确率</small
            ><strong>{{
              data.summary.correctRate == null ? '—' : data.summary.correctRate + '%'
            }}</strong
            ><span>按本卡全部有效复盘统计</span>
          </div>
          <div v-if="kind === 'question'">
            <small>有效复盘平均自评</small
            ><strong>{{
              data.summary.averageSelfScore == null ? '—' : data.summary.averageSelfScore.toFixed(1)
            }}</strong
            ><span>{{ data.summary.scoredCount }} 条有自评分 · 满分 10</span>
          </div>
          <div v-if="kind === 'question'">
            <small>最近自评变化</small><strong>{{ delta(data.summary.selfScoreChange) }}</strong
            ><span>最近两条有效自评</span>
          </div>
        </div>
        <p v-if="kind === 'question'" class="footnote">
          均分、正确率与变化只使用有效复盘。旧记录没有自评分时标为未记录，不换算成十分制；练习／同日巩固保留在明细中。调度等级
          0—4 与自评分 0—10 分别保存。
        </p>
        <p v-else class="footnote">
          记忆卡按忘记／困难／正常／轻松记录回忆表现，没有客观正误或十分制评分；练习／巩固保留在明细中。
        </p>
        <template v-if="kind === 'question'">
          <label class="check-option"
            ><input type="checkbox" v-model="formalOnly" />图表仅看有效复盘</label
          >
          <p class="footnote">
            图表默认包含每次已保存的复盘；实心点为更新排期的复盘，空心点为未更新排期的记录（包括练习、同日巩固、猜测、记得答案和提示）。横轴按复盘先后排列，点击数据点可查看该次答案与思路。缺失值留空；按本卡片的复盘次序展示完整走势。
          </p>
          <div class="review-chart-grid">
            <ReviewLineChart
              :records="chartRecords"
              :unified="true"
              metric="selfScore"
              title="自评分走势"
              :selected-id="detail"
              @select="selectRecord"
            />
            <ReviewLineChart
              :records="chartRecords"
              :unified="true"
              metric="elapsedSeconds"
              title="做题用时走势"
              :selected-id="detail"
              @select="selectRecord"
            />
          </div>
        </template>
        <div v-if="kind === 'question'" class="review-time-summary">
          <span
            >平均用时
            <strong>{{
              data.summary.averageSeconds == null ? '未记录' : data.summary.averageSeconds + ' 秒'
            }}</strong></span
          >
          <span
            >累计用时 <strong>{{ data.summary.totalSeconds }} 秒</strong></span
          >
          <small class="muted"
            >包含本卡全部 {{ data.summary.timedCount }} 条有用时的记录（含练习／巩固）</small
          >
        </div>
        <div v-if="activeRecord" ref="recordPanel">
          <ReviewRecordDetail :record="activeRecord" :kind="kind" @close="detail = ''" />
        </div>
        <div v-if="data.summary.repeatedFaults.length" class="analytics-faults">
          <strong>错因分布</strong
          ><span v-for="f in data.summary.repeatedFaults" :key="f.name" class="tag"
            >{{ f.name }} · {{ f.count }} 次</span
          >
        </div>
        <div v-if="records.length" class="analytics-table-wrap">
          <table class="analytics-table">
            <thead>
              <tr>
                <th>次序／时间</th>
                <th>记录类型</th>
                <th>{{ kind === 'question' ? '答案／正误' : '回忆表现' }}</th>
                <th v-if="kind === 'question'">自评／变化</th>
                <th v-if="kind === 'question'">做题时间</th>
                <th>调度等级</th>
                <th>当次安排</th>
                <th>记录</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="r in [...records].reverse()" :key="r.id"
                ><tr>
                  <td>
                    第 {{ r.ordinal }} 次<small>{{ format(r.createdAt) }}</small>
                  </td>
                  <td>
                    <small>{{ r.effective ? '有效复盘' : '练习／巩固' }}</small>
                  </td>
                  <td>
                    {{
                      r.correct === null
                        ? r.schedulerGrade <= 1
                          ? '忘记'
                          : r.schedulerGrade === 2
                            ? '困难'
                            : r.schedulerGrade === 3
                              ? '正常'
                              : '轻松'
                        : r.answer + ' · ' + (r.correct ? '答对' : '答错')
                    }}
                  </td>
                  <td v-if="kind === 'question'">
                    {{ r.selfScore == null ? '未记录' : r.selfScore.toFixed(1) + ' / 10'
                    }}<small>变化 {{ delta(r.selfScoreChange) }}</small>
                  </td>
                  <td v-if="kind === 'question'">
                    {{ r.elapsedSeconds == null ? '未记录' : r.elapsedSeconds + ' 秒' }}
                    <small v-if="r.elapsedSource === 'legacy_unknown'">旧记录，来源未知</small>
                  </td>
                  <td>{{ r.schedulerGrade }} / 4</td>
                  <td>
                    {{ r.dueAt ? format(r.dueAt) : '保持原排期'
                    }}<small v-if="r.intervalDays != null"
                      >间隔 {{ r.intervalDays }} 天{{
                        r.intervalDays === 0 ? '（当日学习步骤）' : ''
                      }}</small
                    ><small v-if="r.maxIntervalDays != null"
                      >当时上限 {{ r.maxIntervalDays }} 天</small
                    >
                  </td>
                  <td>
                    <button
                      class="text-btn"
                      :aria-expanded="detail === r.id"
                      @click="detail === r.id ? (detail = '') : selectRecord(r.id)"
                    >
                      {{ detail === r.id ? '收起' : '查看详情' }}
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <p v-else class="empty">本卡尚无复盘记录。每次保存后会独立记录。</p>
      </template>
    </section>
  </div>
</template>
