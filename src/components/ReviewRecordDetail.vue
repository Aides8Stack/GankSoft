<script setup lang="ts">
import { ref } from "vue";
import ImageViewer from "./ImageViewer.vue";
const viewImage = ref("");
import type { ReviewPoint } from "../../shared/review-analytics";
import type { CardKind } from "../../shared/review-contract";
defineProps<{ record: ReviewPoint; kind: CardKind }>();
const emit = defineEmits<{ close: [] }>();
const format = (date: string) => new Date(date).toLocaleString("zh-CN");
</script>
<template>
  <section
    class="selected-review"
    aria-label="选中的复盘记录"
    aria-live="polite"
  >
    <div class="section-head">
      <h3>第 {{ record.ordinal }} 次复盘 · {{ format(record.createdAt) }}</h3>
      <button class="text-btn" @click="emit('close')">收起记录</button>
    </div>
    <p v-if="kind === 'question'">
      当次选择 <strong>{{ record.answer }}</strong> · 当次判定
      {{ record.correct ? "答对" : "答错" }} · 自评
      {{ record.selfScore ?? "未记录" }} · 用时
      {{
        record.elapsedSeconds == null ? "未记录" : record.elapsedSeconds + " 秒"
      }}
    </p>
    <p v-if="record.elapsedSource === 'legacy_unknown'" class="muted">
      用时来自旧记录，来源未知；旧 0 秒按原值保留。
    </p>
    <div v-if="record.assessment" class="info-box">
      <strong>当次评估</strong>
      <p>{{ record.assessment.reasons.join("；") }}</p>
      <p v-if="record.assessment.targetSeconds != null">
        当时用时目标 {{ record.assessment.targetSeconds }} 秒 ·
        {{
          record.assessment.efficiency === "overtime"
            ? "超过目标"
            : record.assessment.efficiency === "unmeasured"
              ? "未形成有效计时样本"
              : "目标内"
        }}
      </p>
    </div>
    <p v-else-if="kind === 'question'" class="footnote">
      旧评估记录，保留当时等级，不按新规则补算。
    </p>
    <h4>{{ kind === "question" ? "当次做题思路" : "当次回忆记录" }}</h4>
    <p class="project-history-thought">{{ record.thought || "未填写" }}</p>
    <div v-if="record.question" class="image-grid">
      <button
        v-for="a in record.question.assets.filter((a) => a.role === 'response')"
        :key="a.id"
        class="image-button"
        @click="viewImage = `app-media://history/${record.id}/${a.id}`"
      >
        <img
          :src="`app-media://history/${record.id}/${a.id}`"
          alt="当次作答图片"
        />
      </button>
    </div>
    <ImageViewer v-if="viewImage" :src="viewImage" @close="viewImage = ''" />
    <template v-if="kind === 'question'"
      ><h4>解析后感悟（可选）</h4>
      <p class="prewrap">{{ record.reflection || "本次未填写感悟" }}</p>
      <p v-if="record.faultDetail">具体错因：{{ record.faultDetail }}</p>
      <p v-if="record.knowledgeGaps.length">
        知识漏洞：{{ record.knowledgeGaps.join("、") }}
      </p>
    </template>
  </section>
</template>
