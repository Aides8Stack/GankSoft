<script setup lang="ts">
import type { EvidenceSummary, MemoryModel } from '../../shared/assessment';
defineProps<{ evidence: EvidenceSummary | null; model: MemoryModel | null }>();
</script>
<template>
  <section class="info-box" aria-label="评估与记忆模型">
    <template v-if="evidence">
      <h3>独立解题表现</h3>
      <p>
        最近 {{ evidence.days }} 个独立复盘日 · 独立答案正确率
        {{ evidence.answerCorrectRate == null ? '未记录' : evidence.answerCorrectRate + '%' }} ·
        能解释方法
        {{ evidence.methodSuccessRate == null ? '未记录' : evidence.methodSuccessRate + '%' }}
      </p>
      <p>{{ evidence.message }}</p>
      <p class="footnote">
        仅使用新版规则下更新排期的独立作答，每个本机日历日取最后一次，最多10个日期。练习、猜测、记得答案、提示及旧评估记录不补算；比例是观察结果，不是能力概率。
      </p>
      <p>
        当前用时目标
        {{ evidence.targetSeconds == null ? '未设置' : evidence.targetSeconds + '秒' }} ·
        同目标独立解对并理解方法的计时 {{ evidence.timedDays }} 天 · 达标
        {{ evidence.withinTargetDays }} 天
      </p>
    </template>
    <details>
      <summary>FSRS当前记忆状态</summary>
      <template v-if="model">
        <p>
          稳定性 {{ model.stability.toFixed(2) }} 天 · 难度 {{ model.difficulty.toFixed(2) }} ·
          当前模型估计可提取率
          {{
            model.retrievability == null
              ? '无法估计'
              : (model.retrievability * 100).toFixed(1) + '%'
          }}
        </p>
        <p>调度更新 {{ model.reps }} 次 · 遗忘计数 {{ model.lapses }}</p>
        <p v-if="model.legacyHistory" class="footnote">
          沿用了旧评估规则产生的模型状态；新规则逐次更新，不伪造或重放旧历史。
        </p>
        <p class="footnote">
          这是FSRS的模型估计，不是本题正确率、行测能力分或同类题掌握概率。未针对个人数据重新拟合参数。
        </p>
      </template>
      <p v-else>尚无可用的FSRS状态，不能据此判断掌握。</p>
    </details>
  </section>
</template>
