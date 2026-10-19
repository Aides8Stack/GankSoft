<script setup lang="ts">
import ReviewQueuePreview from "./ReviewQueuePreview.vue";
import { computed, ref, watch } from "vue";
import { formatStudyTime } from "../../shared/study-pages";
import CardReviewPolicy from "./CardReviewPolicy.vue";
import CardReviewAnalytics from "./CardReviewAnalytics.vue";
import ImageAttachments from "./ImageAttachments.vue";
import ImageViewer from "./ImageViewer.vue";
import { moduleFilter } from "../store";
import SelfAssessmentSlider from "./SelfAssessmentSlider.vue";
const showPolicy = ref(false),
  showReviewData = ref(false);
import { useStudySession } from "../composables/useStudySession";
import { FAULTS } from "../../shared/types";
const emit = defineEmits<{ navigate: [page: string, id?: string] }>();
const {
  memory,
  session,
  choice,
  loadWarning,
  progress,
  complete,
  conflict,
  card,
  cv,
  paused,
  toggleTotalTimer,
  result,
  working,
  suggestedScore,
  assessmentPreview,
  scoreLabel,
  submitting,
  draftStatus,
  draftError,
  chooseResume,
  chooseRestart,
  persist,
  restartCard,
  reveal,
  submit,
  next,
  leave,
  finish,
  knowledgeName,
  assetUrl,
} = useStudySession(emit);
const viewImage = ref(""),
  imageWidth = ref(Number(localStorage.getItem("gank-image-width")) || 640);
watch(imageWidth, (v) => localStorage.setItem("gank-image-width", String(v)));
const responseDraft = computed({
  get: () =>
    (session.responseImages ?? []).map((id: string) => ({ id, draft: true })),
  set: (images: { id: string }[]) => {
    session.responseImages = images.map((i) => i.id);
  },
});
let previouslyPaused = false;
watch([showPolicy, showReviewData], ([policy, data], [oldPolicy, oldData]) => {
  if ((policy || data) && !oldPolicy && !oldData) {
    previouslyPaused = paused.value;
    paused.value = true;
  } else if (!policy && !data && (oldPolicy || oldData))
    paused.value = previouslyPaused;
});
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">ACTIVE RECALL · FSRS</div>
      <h1>{{ memory ? "记忆学习" : "错题复盘" }}</h1>
      <p>
        {{
          session.practice
            ? "练习巩固：记录表现，保持原排期。"
            : "题目、选项和答案保持不变；每次作答独立记录，由 FSRS 安排下次时间。"
        }}
      </p>
    </div>
    <button class="btn" @click="leave">暂停并返回卡片集</button>
  </div>
  <div v-if="choice" class="modal-backdrop">
    <section
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-title"
    >
      <h2 id="resume-title">发现未完成的学习会话</h2>
      <p>
        {{
          loadWarning ||
          "原答案、思路和进度已保留。请选择继续，或明确重新开始。"
        }}
      </p>
      <div class="modal-footer">
        <button class="btn" @click="emit('navigate', 'cards')">取消</button
        ><button class="btn" @click="chooseRestart">重新开始</button
        ><button
          class="btn primary"
          :disabled="!!loadWarning"
          @click="chooseResume"
        >
          继续上次学习
        </button>
      </div>
    </section>
  </div>
  <div class="draft-feedback" role="status" aria-live="polite">
    <span>{{ draftStatus }}</span
    ><span v-if="draftError" class="danger">{{ draftError }}</span
    ><button
      v-if="session.pendingSubmission && !working"
      class="btn"
      @click="submit()"
    >
      重试原提交</button
    ><button
      v-if="draftError && !session.pendingSubmission"
      class="btn"
      @click="persist()"
    >
      重试保存草稿
    </button>
  </div>
  <section
    v-if="progress.total"
    class="panel review-progress"
    aria-label="本轮复盘进度"
  >
    <ol class="study-steps" aria-label="本张复盘步骤">
      <li
        :class="{
          current: session.stage === 'answer',
          done: session.stage !== 'answer',
        }"
      >
        <span>1</span>独立{{ memory ? "回忆" : "作答" }}
      </li>
      <li
        :class="{
          current: session.stage === 'reveal',
          done: session.stage === 'result',
        }"
      >
        <span>2</span>{{ memory ? "核对与自评" : "核对与反思" }}
      </li>
      <li :class="{ current: session.stage === 'result' || complete }">
        <span>3</span>保存与安排
      </li>
    </ol>
    <div class="review-progress-heading">
      <strong
        >本轮进度 · 已完成 {{ progress.done }} / {{ progress.total }} 张</strong
      >
      <div class="session-clock" aria-label="复盘总计时">
        <span
          >总计时
          <strong data-testid="total-time">{{
            formatStudyTime(session.totalSeconds)
          }}</strong></span
        >
        <button
          class="btn"
          :disabled="complete || conflict || submitting"
          :aria-pressed="session.timerPaused"
          @click="toggleTotalTimer"
        >
          {{ session.timerPaused ? "恢复总计时" : "暂停总计时" }}
        </button>
        <span v-if="session.timerPaused" class="muted"
          >已暂停 · 返回页面后请手动恢复</span
        >
        <span>{{ progress.percent }}% · 剩余 {{ progress.remaining }} 张</span>
      </div>
    </div>
    <progress
      :value="progress.done"
      :max="progress.total"
      aria-label="复盘完成进度"
    />
    <p>
      {{
        complete ? "本轮学习已完成" : "当前第 " + (session.index + 1) + " 张"
      }}
      ·
      {{
        session.stage === "result"
          ? "本张记录已保存，可以继续下一张"
          : complete
            ? "所有记录已保存"
            : "保存本张学习记录后更新进度"
      }}
    </p>
  </section>
  <section v-if="complete" class="panel empty">
    <h2>{{ session.ids.length ? "本轮学习完成" : "当前没有可学习的卡片" }}</h2>
    <p>
      {{
        session.ids.length
          ? "所有记录已经保存。"
          : "请调整筛选条件或每日学习预算。"
      }}
    </p>
    <button class="btn primary" @click="finish">返回所有卡片</button>
  </section>
  <section v-else-if="conflict" class="panel study-main">
    <h2>题目内容已变化</h2>
    <p>
      基础内容已被编辑。原作答草稿已保留，请核对当前内容后重新作答，避免提交不匹配的答案。
    </p>
    <div class="project-history-thought">
      {{ session.thought || "尚未填写独立思路" }}
    </div>
    <button class="btn primary" @click="restartCard">保留草稿并重新作答</button>
  </section>
  <section v-else-if="card" class="panel study-main">
    <div class="section-head">
      <div>
        <span class="tag"
          >{{ session.index + 1 }} / {{ session.ids.length }}</span
        >
        <h2 style="margin-top: 12px">{{ card.title }}</h2>
      </div>
      <div class="study-controls">
        <span
          >本题 {{ Math.floor(session.seconds / 60) }}:{{
            String(session.seconds % 60).padStart(2, "0")
          }}</span
        ><button class="text-btn" @click="paused = !paused">
          {{ paused ? "继续" : "暂停计时" }}
        </button>
      </div>
    </div>
    <div class="inline-actions study-card-tools">
      <button
        class="btn"
        :disabled="working || !!session.pendingSubmission"
        @click="showPolicy = true"
      >
        调整本卡调度
      </button>
      <button class="btn" :disabled="working" @click="showReviewData = true">
        查看复盘数据与变化
      </button>
    </div>
    <div
      v-if="showPolicy"
      class="modal-backdrop"
      @click.self="showPolicy = false"
    >
      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-label="调整本卡调度"
      >
        <div class="section-head">
          <h2>调整本卡调度</h2>
          <button
            class="icon-btn"
            aria-label="关闭调度设置"
            @click="showPolicy = false"
          >
            ×
          </button>
        </div>
        <CardReviewPolicy
          :kind="memory ? 'memory' : 'question'"
          :card-id="card.id"
        />
        <p class="footnote">关闭后继续本题，答案与思路草稿保留。</p>
      </section>
    </div>
    <CardReviewAnalytics
      v-if="showReviewData"
      :kind="memory ? 'memory' : 'question'"
      :card-id="card.id"
      @close="showReviewData = false"
    />
    <label v-if="session.stage === 'answer'" class="check-option"
      ><input
        type="checkbox"
        v-model="session.practice"
      />练习巩固，不修改复盘计划</label
    >
    <div v-if="!memory && card.material" class="material-box">
      <h4>公共材料</h4>
      <p class="prewrap">{{ card.material }}</p>
    </div>
    <p class="prewrap question-stem">{{ memory ? card.cue : card.stem }}</p>
    <p v-if="!memory" class="prewrap">{{ card.options }}</p>
    <label v-if="!memory && card.assets.length" class="view-image-size"
      >图片显示宽度 {{ imageWidth }}px
      <input
        type="range"
        min="240"
        max="1100"
        step="20"
        v-model.number="imageWidth"
    /></label>
    <div v-if="!memory" class="image-grid">
      <img
        v-for="a in card.assets.filter((a: any) => a.role === 'question')"
        :key="a.id"
        :src="assetUrl(a.id)"
        alt="题目图片，点击放大"
        role="button"
        tabindex="0"
        :style="{ width: imageWidth + 'px' }"
        @click="viewImage = assetUrl(a.id)"
        @keydown.enter="viewImage = assetUrl(a.id)"
      />
    </div>
    <template v-if="session.stage === 'answer'"
      ><template v-if="!memory"
        ><h4>我的答案</h4>
        <div class="answer-options">
          <button
            v-for="a in ['A', 'B', 'C', 'D']"
            :key="a"
            class="answer-option"
            :class="{ chosen: session.answer === a }"
            :aria-pressed="session.answer === a"
            @click="session.answer = a"
          >
            {{ a }}
          </button>
        </div>
        <label
          >本次做题思路 <span class="danger">必填</span
          ><span class="field-hint">先保留你的独立判断，再对照解析。</span
          ><textarea
            v-model="session.thought"
            rows="5"
            placeholder="写出判断依据、计算过程或卡住的位置。完全不会时也请记录原因。"
            required
          /></label
        ><ImageAttachments
          v-model="responseDraft"
          :deck-id="moduleFilter"
          purpose="response" /></template
      ><button
        class="btn primary"
        :disabled="!memory && (!session.answer || !session.thought.trim())"
        @click="reveal"
      >
        {{ memory ? "已尝试回忆，展开内容" : "提交答案和思路，查看解析" }}
      </button></template
    >
    <template v-else
      ><div class="answer-box">
        <h3>
          {{
            memory
              ? "记忆内容"
              : session.answer === card.answer
                ? "答案正确 · " + card.answer
                : "本次答错 · 正确答案 " + card.answer
          }}
        </h3>
        <p class="prewrap">
          {{ memory ? card.content : card.analysis || "暂无解析" }}
        </p>
        <div v-if="!memory" class="image-grid">
          <img
            v-for="a in card.assets.filter((a: any) => a.role === 'analysis')"
            :key="a.id"
            :src="assetUrl(a.id)"
            alt="解析图片，点击放大"
            role="button"
            tabindex="0"
            :style="{ width: imageWidth + 'px' }"
            @click="viewImage = assetUrl(a.id)"
            @keydown.enter="viewImage = assetUrl(a.id)"
          />
        </div>
      </div>
      <ImageAttachments
        v-if="!memory && (session.responseImages ?? []).length"
        v-model="responseDraft"
        :deck-id="moduleFilter"
        purpose="response"
        readonly
      />
      <template v-if="session.stage === 'reveal'"
        ><template v-if="memory"
          ><label
            >遗忘点与回忆笔记<textarea
              v-model="session.note"
              rows="3"
              :disabled="!!session.pendingSubmission"
            />
          </label>
          <p class="muted">按展开内容前的真实表现评分。</p>
          <div class="study-rating">
            <button
              class="btn"
              v-for="s in [0, 2, 3, 4]"
              :key="s"
              :disabled="working"
              @click="submit(s)"
            >
              {{ scoreLabel(s) }}
            </button>
          </div></template
        ><template v-else
          ><fieldset
            class="review-fields"
            :disabled="submitting || !!session.pendingSubmission"
          >
            <h4>提交前的做题思路</h4>
            <div class="project-history-thought">{{ session.thought }}</div>
            <div class="form-grid">
              <label
                >作答依据<select v-model="session.basis">
                  <option value="independent">独立解出 / 独立尝试</option>
                  <option value="guess">猜测</option>
                  <option value="remember">记得原答案</option>
                  <option value="hint">借助提示 / 提前看解析</option>
                </select></label
              ><label
                >方法理解<select v-model.number="session.understanding">
                  <option :value="0">不理解</option>
                  <option :value="1">部分理解</option>
                  <option :value="2">能解释主要步骤</option>
                  <option :value="3">能解释适用条件与易错点</option>
                </select></label
              >
            </div>
            <SelfAssessmentSlider
              v-model="session.selfScore"
              :correct="session.answer === card.answer"
            />
            <h4>本次错因</h4>
            <div class="check-grid">
              <label v-for="f in FAULTS" :key="f" class="check-option"
                ><input type="checkbox" v-model="session.faults" :value="f" />{{
                  f
                }}</label
              >
            </div>
            <h4>实际出错知识点</h4>
            <div class="check-grid">
              <label
                v-for="id in card.knowledge_ids"
                :key="id"
                class="check-option"
                ><input
                  type="checkbox"
                  v-model="session.errorIds"
                  :value="id"
                />{{ knowledgeName(id) }}</label
              >
            </div>
            <label
              >错因具体表现<textarea
                v-model="session.faultDetail"
                rows="2"
              /></label
            ><label
              >解析后感悟与改进（可选）<textarea
                v-model="session.improvement"
                rows="3"
              />
            </label>
            <p class="info-box">
              {{
                assessmentPreview?.eligible
                  ? "调度建议：" + scoreLabel(suggestedScore)
                  : "本次仅保存观察记录"
              }}。{{ assessmentPreview?.reasons.join("；") }}
              <span v-if="assessmentPreview?.targetSeconds != null">
                · 目标 {{ assessmentPreview.targetSeconds }} 秒 ·
                {{
                  assessmentPreview.efficiency === "overtime"
                    ? "超过目标"
                    : assessmentPreview.efficiency === "unmeasured"
                      ? "无有效计时样本"
                      : "目标内"
                }}</span
              >
            </p>
          </fieldset>
          <p v-if="session.pendingSubmission" class="info-box">
            上次提交结果待确认，本次内容已锁定；重试不会重复创建记录。
          </p>
          <button class="btn primary" :disabled="working" @click="submit()">
            确认并保存本次复盘
          </button></template
        ></template
      >
      <div v-else class="info-box">
        <h3>本次学习已记录</h3>
        <p v-if="!memory && result?.selfScore != null">
          本次自评 {{ result.selfScore.toFixed(1) }} / 10 · 调度等级
          {{ result.score }} / 4
        </p>
        <p>
          {{
            result?.reason ??
            result?.result?.reason ??
            (session.practice
              ? "练习巩固保持原排期。"
              : "记录已保存；重复巩固不会抬高调度表现。")
          }}
        </p>
        <button class="btn primary" @click="next()">下一张 →</button
        ><button
          v-if="!memory"
          class="btn"
          @click="emit('navigate', 'project', card.id)"
        >
          打开题目详情
        </button>
      </div></template
    >
  </section>
  <section v-else class="panel empty">
    <h2>这张卡片已移动或删除</h2>
    <button class="btn" @click="next(true)">跳过并继续</button>
  </section>
  <details v-if="session.abandonedDrafts?.length" class="panel">
    <summary>查看保留的历史草稿（重新作答／跳过）</summary>
    <div
      v-for="(d, i) in session.abandonedDrafts"
      :key="i"
      class="project-history-thought"
    >
      保留的原稿 · 原答案 {{ d.answer }}
      <p>{{ d.thought }}</p>
      <p>{{ d.improvement }}</p>
    </div>
  </details>
  <ImageViewer v-if="viewImage" :src="viewImage" @close="viewImage = ''" />
  <ReviewQueuePreview v-if="session.stage === 'result'" :deck-id="moduleFilter" :card-id="card?.id" readonly />
</template>
