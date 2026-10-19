import { dailyReviewBudget } from "../../shared/review-budget";
import type { ImageNodeRef } from "../../shared/image-node";
import { calendarDay } from "../../shared/calendar";
import {
  computed,
  reactive,
  ref,
  watch,
  onBeforeUnmount,
  onMounted,
} from "vue";
import { services } from "../services";
import {
  state,
  moduleFilter,
  liveQuestions,
  liveMemories,
  isMemoryModule,
  dueQuestions,
  dueMemories,
  cardSelection,
  reviewRequest,
  working,
  knowledgeName,
  assetUrl,
  refresh,
  error,
  notice,
  studyController,
} from "../store";
import { evaluateQuestion, resolvedTarget } from "../../shared/assessment";
import { FAULTS } from "../../shared/types";

export function useStudySession(
  emit: (event: "navigate", page: string, id?: string) => void,
) {
  const deckId = moduleFilter.value,
    memory = isMemoryModule(deckId),
    request = reviewRequest.value;
  reviewRequest.value = null;
  const cards = computed<any[]>(() =>
    (memory ? liveMemories.value : liveQuestions.value).filter(
      (c) => c.module === deckId,
    ),
  );
  const stored = state.value!.sessions.find(
    (s) =>
      s.deck_id === deckId &&
      (!request?.sessionId ||
        JSON.parse(s.payload).sessionId === request.sessionId),
  );
  const due = (memory ? dueMemories.value : dueQuestions.value).filter(
    (c) => c.module === deckId,
  );
  const today = dailyReviewBudget(memory ? state.value!.memoryReviews : state.value!.attempts,
    new Set(cards.value.map(c => c.id)), new Date(), state.value!.settings.studyTimezone).uniqueDue;
  const ids = request?.ids
    ? [...request.ids]
    : request?.mode === "selected"
      ? [...cardSelection.value]
      : due
          .slice(
            0,
            Math.max(
              0,
              (state.value!.deckReviewPolicies.find((p) => p.deck_id === deckId)
                ?.daily_limit ?? 15) - today,
            ),
          )
          .map((c) => c.id);
  const key =
    "gank-study-v065:" +
    state.value!.meta.dataPath +
    ":" +
    deckId +
    ":" +
    (request?.sessionId ?? "legacy");
  const emptyEntry = () => ({
    entryId: crypto.randomUUID(),
    answer: "",
    thought: "",
    responseImages: [] as (string | ImageNodeRef)[],
    basis: "independent",
    understanding: 2,
    selfScore: null,
    improvement: "",
    faults: [],
    errorIds: [],
    faultDetail: "",
    note: "",
    stage: "answer",
    seconds: 0,
    pendingSubmission: null,
    savedResult: null,
  });
  const cv = (c: any) =>
    memory ? (c?.learning_version ?? 1) : (c?.content_version ?? 1);
  function fresh() {
    const queue = ids.filter((id) =>
      cards.value.some(
        (c) =>
          c.id === id &&
          (memory || (c.status === "ready" && /^[A-D]$/.test(c.answer))),
      ),
    );
    return {
      schemaVersion: 1,
      sessionId: request?.sessionId ?? crypto.randomUUID(),
      pageTitle: request?.title || (memory ? "记忆学习" : "错题复盘"),
      pageDetail: request?.detail || "",
      totalSeconds: 0,
      timerPaused: false,
      ids: queue,
      index: 0,
      practice: !!request?.practice,
      ...(request?.queueSnapshot?{queueSnapshot:request.queueSnapshot}:{}),
      skippedCount: 0,
      abandonedDrafts: [],
      ...emptyEntry(),
      contentVersion: cv(cards.value.find((c) => c.id === queue[0])),
    };
  }
  let local: any = null;
  try {
    local = JSON.parse(
      localStorage.getItem(key) ||
        localStorage.getItem(
          "gank-study-v060:" + state.value!.meta.dataPath + ":" + deckId,
        ) ||
        "null",
    );
  } catch {}
  const validDraft = (s: any) =>
    !!s &&
    Array.isArray(s.ids) &&
    s.ids.every((id: any) => typeof id === "string") &&
    Number.isInteger(s.index) &&
    s.index >= 0 &&
    s.index <= s.ids.length &&
    ["answer", "reveal", "result"].includes(s.stage);
  let saved: any = null;
  try {
    saved = stored ? JSON.parse(stored.payload) : null;
  } catch {}
  const loadWarning = ref(
    stored && !validDraft(saved)
      ? "旧会话格式不完整，无法安全续学。原始数据仍在升级前备份中，请明确选择重新开始。"
      : "",
  );
  if (saved && !validDraft(saved)) saved = null;
  if (local && !validDraft(local.payload)) local = null;
  const localUsable =
    local &&
    (!request?.sessionId || local.payload?.sessionId === request.sessionId) &&
    (!saved ||
      (local.payload?.sessionId === saved.sessionId &&
        local.revision >= stored!.revision));
  const initial = localUsable ? local.payload : (saved ?? fresh());
  initial.totalSeconds ??= 0;
  initial.timerPaused = !!(saved || localUsable);
  // Older drafts have no anchored content version; never guess which revision they were answered against.
  if (!initial.schemaVersion)
    Object.assign(initial, {
      schemaVersion: 1,
      sessionId: request?.sessionId ?? crypto.randomUUID(),
      pageTitle: request?.title || (memory ? "记忆学习" : "错题复盘"),
      pageDetail: request?.detail || "",
      totalSeconds: 0,
      timerPaused: false,
      entryId: crypto.randomUUID(),
      contentVersion:
        initial.thought || initial.stage !== "answer"
          ? 0
          : cv(cards.value.find((c) => c.id === initial.ids?.[initial.index])),
      abandonedDrafts: [],
    });
  if (
    !memory &&
    initial.stage === "reveal" &&
    initial.selfScore == null &&
    !initial.pendingSubmission
  )
    initial.selfScore =
      initial.answer ===
      cards.value.find((c) => c.id === initial.ids[initial.index])?.answer
        ? 6
        : 3;
  const session = reactive<any>(initial);
  const choice = ref(
    !!loadWarning.value ||
      (!!(stored || localUsable) && request?.mode !== "resume"),
  );
  const result = computed(() => session.savedResult);
  const paused = ref(false),
    submitting = ref(false),
    draftStatus = ref(""),
    draftError = ref("");
  const card = computed(() =>
    cards.value.find((c) => c.id === session.ids[session.index]),
  );
  const complete = computed(() => session.index >= session.ids.length);
  const conflict = computed(
    () =>
      !!card.value &&
      session.stage !== "result" &&
      session.contentVersion !== cv(card.value),
  );
  const progress = computed(() => {
    const total = session.ids.length,
      done = Math.max(
        0,
        Math.min(
          total,
          session.index -
            (session.skippedCount ?? 0) +
            (session.stage === "result" ? 1 : 0),
        ),
      );
    return {
      total,
      done,
      remaining: Math.max(0, total - done - (session.skippedCount ?? 0)),
      percent: total
        ? Math.round(((done + (session.skippedCount ?? 0)) / total) * 100)
        : 0,
    };
  });
  const assessmentPreview = computed(() => {
    if (!card.value || memory) return null;
    return evaluateQuestion({
      correct: session.answer === card.value.answer,
      basis: session.basis,
      understanding: session.understanding,
      selfScore: session.selfScore ?? null,
      elapsedSeconds: session.seconds,
      targetSeconds: resolvedTarget(
        card.value.id,
        deckId,
        state.value!.assessmentPolicies,
        state.value!.deckAssessmentPolicies,
      ),
      practice: !!session.practice,
    });
  });
  const suggestedScore = computed(() => assessmentPreview.value?.grade ?? 0);
  const scoreLabel = (s: number) =>
    s <= 1 ? "重来" : s === 2 ? "困难" : s === 3 ? "正常" : "轻松";
  let lastSaved = stored?.payload ?? "",
    pendingSaves = 0;
  let revision = stored?.revision ?? 0,
    chain: Promise<any> = Promise.resolve(),
    disposed = false,
    suppress = false,
    saveTimer: ReturnType<typeof setTimeout>,
    timer: ReturnType<typeof setInterval>;
  function localSave() {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          revision,
          payload: JSON.parse(JSON.stringify(session)),
        }),
      );
    } catch {
      draftError.value = "本机临时草稿写入失败，请保持页面打开并重试保存。";
    }
  }
  function persist(extra: any = {}) {
    if (disposed || choice.value || !session.ids.length)
      return Promise.resolve(true);
    localSave();
    const payload = JSON.parse(JSON.stringify(session)),
      serialized = JSON.stringify(payload);
    if (!pendingSaves && serialized === lastSaved && !Object.keys(extra).length)
      return Promise.resolve(true);
    pendingSaves++;
    draftStatus.value = "正在保存草稿…";
    chain = chain
      .catch(() => {})
      .then(async () => {
        try {
          const r = await services.session.save({
            deck_id: deckId,
            payload,
            expected_revision: revision,
            ...extra,
          });
          revision = r.revision;
          lastSaved = serialized;
          const rows = state.value?.sessions;
          if (rows) {
            const i = rows.findIndex(
              (r) =>
                r.deck_id === deckId &&
                JSON.parse(r.payload).sessionId === session.sessionId,
            );
            const row = {
              deck_id: deckId,
              payload: serialized,
              revision,
              updated_at: new Date().toISOString(),
            };
            if (i < 0) rows.push(row);
            else rows[i] = row;
          }
          draftError.value = "";
          draftStatus.value = "草稿已保存";
          localSave();
          return true;
        } catch (e) {
          draftError.value = "草稿保存失败：" + String(e);
          draftStatus.value = "本机临时草稿已保留";
          return false;
        } finally {
          pendingSaves--;
        }
      });
    return chain;
  }
  watch(
    session,
    () => {
      if (suppress || choice.value || disposed) return;
      localSave();
      if (submitting.value) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => void persist(), 350);
    },
    { deep: true, flush: "sync" },
  );
  function beforeUnload(e: BeforeUnloadEvent) {
    localSave();
    if (draftError.value || submitting.value) {
      e.preventDefault();
      e.returnValue = "";
    }
  }
  onMounted(() => {
    if (!choice.value) void persist();
    studyController.suspend = suspend;
    studyController.retire = () => {
      disposed = true;
    };
    window.addEventListener("blur", autoPause);
    document.addEventListener("visibilitychange", visibilityPause);
    window.addEventListener("beforeunload", beforeUnload);
    timer = setInterval(() => {
      if (
        !session.timerPaused &&
        !choice.value &&
        !complete.value &&
        !conflict.value &&
        !submitting.value
      )
        session.totalSeconds = Math.min(31536000, session.totalSeconds + 1);
      if (
        !session.timerPaused &&
        card.value &&
        !paused.value &&
        !submitting.value &&
        !choice.value &&
        session.stage === "answer"
      )
        session.seconds = Math.min(86400, session.seconds + 1);
    }, 1000);
  });
  onBeforeUnmount(() => {
    clearInterval(timer);
    clearTimeout(saveTimer);
    session.timerPaused = true;
    if (studyController.suspend === suspend) {
      delete studyController.suspend;
      delete studyController.retire;
    }
    window.removeEventListener("blur", autoPause);
    document.removeEventListener("visibilitychange", visibilityPause);
    window.removeEventListener("beforeunload", beforeUnload);
    if (!disposed) {
      localSave();
      void persist();
    }
  });
  function autoPause() {
    if (!session.timerPaused) {
      session.timerPaused = true;
      void persist();
    }
  }
  function visibilityPause() {
    if (document.hidden) autoPause();
  }
  async function suspend() {
    session.timerPaused = true;
    clearTimeout(saveTimer);
    return !submitting.value && (await persist());
  }
  function toggleTotalTimer() {
    if (document.hidden || complete.value || choice.value || conflict.value)
      return;
    session.timerPaused = !session.timerPaused;
    void persist();
  }
  async function chooseResume() {
    choice.value = false;
    await persist();
  }
  async function chooseRestart() {
    choice.value = false;
    await chain;
    suppress = true;
    Object.keys(session).forEach((k) => delete session[k]);
    Object.assign(session, fresh());
    suppress = false;
    localSave();
    await persist({ replace: true });
  }
  async function reveal() {
    if (
      conflict.value ||
      (!memory && (!session.answer || !session.thought.trim()))
    )
      return;
    if (!memory)
      session.selfScore = session.answer === card.value.answer ? 6 : 3;
    session.stage = "reveal";
    await persist();
  }
  async function restartCard() {
    clearTimeout(saveTimer);
    await chain;
    suppress = true;
    session.abandonedDrafts ??= [];
    session.abandonedDrafts.push({
      contentVersion: session.contentVersion,
      answer: session.answer,
      thought: session.thought,
      improvement: session.improvement,
      createdAt: new Date().toISOString(),
    });
    Object.assign(session, emptyEntry(), { contentVersion: cv(card.value) });
    suppress = false;
    localSave();
    await persist({ restart: true });
  }
  async function submit(score?: number) {
    if (
      !card.value ||
      conflict.value ||
      submitting.value ||
      working.value ||
      session.stage === "result"
    )
      return;
    const retry = !!session.pendingSubmission;
    let sent = false;
    submitting.value = true;
    working.value = true;
    error.value = "";
    clearTimeout(saveTimer);
    try {
      if (!session.pendingSubmission)
        session.pendingSubmission = memory
          ? {
              id: card.value.id,
              score,
              note: session.note,
              practice: session.practice,
            }
          : {
              question_id: card.value.id,
              question_version: card.value.version,
              answer: session.answer,
              thought: session.thought,
              response_images: [...(session.responseImages ?? [])],
              basis: session.basis,
              understanding: session.understanding,
              self_score: session.selfScore,
              protocol_version: 2,
              elapsed_seconds: session.seconds,
              improvement: session.improvement,
              faults: [...session.faults],
              error_knowledge_ids: [...session.errorIds],
              fault_detail: session.faultDetail,
              practice: session.practice,
            };
      if (!retry && !(await persist()))
        throw new Error(draftError.value || "请先重试保存草稿，再提交复盘。");
      if (retry) await chain;
      const payload = {
        protocol_version:
          session.pendingSubmission.protocol_version ??
          (session.pendingSubmission.self_score == null && !memory ? 1 : 2),
        ...session.pendingSubmission,
        request_id: session.entryId,
        content_version: session.contentVersion,
        session_id: session.sessionId,
        deck_id: deckId,
      };
      sent = true;
      const data = await (
        memory ? services.memory.review : services.review.submit
      )(payload);
      // The review coordinator has committed the receipt and session progress in the same transaction.
      suppress = true;
      session.savedResult = data;
      session.stage = "result";
      session.pendingSubmission = null;
      suppress = false;
      revision++;
      lastSaved = JSON.stringify(session);
      localSave();
      draftStatus.value = "复盘记录已保存";
      draftError.value = "";
      notice.value = "本次复盘已保存";
      try {
        await refresh();
        const row = state.value!.sessions.find(
          (s) =>
            s.deck_id === deckId &&
            (!request?.sessionId ||
              JSON.parse(s.payload).sessionId === request.sessionId),
        );
        revision = row?.revision ?? revision;
        localSave();
      } catch {
        error.value =
          "复盘已经保存，但列表刷新失败。可重新打开页面核对，无需重新作答。";
      }
    } catch (e) {
      error.value = String(e);
      if (!sent || (e as any)?.definitive === true) {
        session.pendingSubmission = null;
        localSave();
        draftError.value = "保存失败，输入已保留；请按提示修正后再次提交。";
      } else
        draftError.value =
          "提交未完成或结果待确认；输入已保留，点击保存按钮使用原编号重试。";
    } finally {
      submitting.value = false;
      working.value = false;
    }
  }
  async function next(skip = false) {
    if (submitting.value || working.value) return;
    await chain;
    if (!skip && session.stage !== "result") return;
    if (skip && card.value) return;
    const previous = JSON.parse(JSON.stringify(session));
    suppress = true;
    if (skip) session.skippedCount = (session.skippedCount ?? 0) + 1;
    session.index++;
    Object.assign(session, emptyEntry(), {
      contentVersion: cv(
        cards.value.find((c) => c.id === session.ids[session.index]),
      ),
    });
    suppress = false;
    localSave();
    if (!(await persist({ skip }))) {
      suppress = true;
      Object.assign(session, previous);
      suppress = false;
      localSave();
    }
  }
  async function leave() {
    clearTimeout(saveTimer);
    if (submitting.value) return;
    if (!(await suspend())) return;
    try {
      await refresh();
    } catch (e) {
      error.value = String(e);
      return;
    }
    emit("navigate", "cards");
  }
  async function finish() {
    clearTimeout(saveTimer);
    await chain;
    try {
      await services.session.delete({
        deck_id: deckId,
        session_id: session.sessionId,
      });
      disposed = true;
      localStorage.removeItem(key);
      await refresh();
      emit("navigate", "cards");
    } catch (e) {
      error.value = String(e);
    }
  }

  return {
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
  };
}
