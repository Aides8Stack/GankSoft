<script setup lang="ts">
import { reviewSettingsGuards } from "./composables/reviewSettingsGuard";
import { dailyReviewBudget } from "../shared/review-budget";
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { initializeTheme } from "./composables/preferences";
import {
  startNotifications,
  unreadMessages,
} from "./composables/notifications";
import {
  settingsPersistence,
  settingPages,
} from "./composables/settingsPersistence";
import MessageCenter from "./components/MessageCenter.vue";
import { services } from "./services";
import { catalogManagement } from "./composables/catalogManagement";
import UiIcon from "./components/UiIcon.vue";
import WorkspacePageBar from "./components/WorkspacePageBar.vue";
import { mapPersistence } from "./composables/mapPersistence";
import { queueIdentity } from "../shared/study-pages";
import { calendarDay } from "../shared/calendar";
import {
  dueQuestions,
  dueMemories,
  liveQuestions,
  liveMemories,
  knowledgeName,
  studyController,
} from "./store";
import { version } from "../package.json";
import {
  state,
  refresh,
  notice,
  error,
  working,
  moduleFilter,
  liveDecks,
  deckName,
  deckPath,
  isMemoryModule,
  selectedQuestionId,
  selectedMemoryId,
  selectedKnowledgeId,
  reviewRequest,
  cardSelection,
  cardFilterPreset,
  task,
} from "./store";
import CollectionImport from "./components/CollectionImport.vue";
import FolderTree from "./components/FolderTree.vue";
import CatalogManager from "./components/CatalogManager.vue";
import Overview from "./components/Overview.vue";
import CardExplorer from "./components/CardExplorer.vue";
import CollectionSummary from "./components/CollectionSummary.vue";
import MindMapWorkspace from "./components/MindMapWorkspace.vue";
import QuestionLibrary from "./components/QuestionLibrary.vue";
import StudyWorkspace from "./components/StudyWorkspace.vue";
import Insights from "./components/Insights.vue";
import DeckReviewSettings from "./components/DeckReviewSettings.vue";
import ImportWorkspace from "./components/ImportWorkspace.vue";

import Settings from "./components/Settings.vue";
import TrashWorkspace from "./components/TrashWorkspace.vue";
watch(moduleFilter, () => {
  void refresh().catch((e) => {
    error.value = String(e);
  });
});
const page = ref("overview"),
  opened = ref(""),
  manager = ref<any>(null);
const importingCollection = ref(false),
  importFolder = ref<string | null>(null);
async function importFromCatalog() {
  if (!(await prepareNavigation())) return;
  importFolder.value = menu.value?.kind === "folder" ? menu.value.id : null;
  menu.value = null;
  importingCollection.value = true;
}
const mainArea = ref<HTMLElement | null>(null);
const settingSection = ref(""),
  openedSettings = ref<string[]>([]),
  messagesOpen = ref(false);
const settingsTabs = computed(() =>
  openedSettings.value.map((id) => ({
    id,
    title: settingPages.find((p) => p.id === id)?.title || id,
  })),
);
const activeSessionId = ref("");
const mapDeckPages = ref<string[]>([]);
const isMapPage = computed(() =>
  ["knowledge", "knowledge-expanded"].includes(page.value),
);
const mapPages = computed(() =>
  mapDeckPages.value.includes(opened.value)
    ? [
        {
          id: "knowledge-expanded",
          title: "展开导图",
          detail: deckName(opened.value) + " · 思维导图工作台",
        },
      ]
    : [],
);
const showWorkspacePages = computed(
  () => ["cards", "study"].includes(page.value) && !!opened.value,
);
const detailOrigin = ref<{
  page: string;
  deckId: string;
  sessionId: string;
  scroll: number;
} | null>(null);
async function returnFromDetail() {
  const origin = detailOrigin.value;
  if (!origin) {
    await changePage("cards");
    return;
  }
  if (origin.page === "study") await activateReview(origin.sessionId);
  else {
    if (!(await prepareNavigation())) return;
    opened.value = origin.deckId;
    moduleFilter.value = origin.deckId || "全部模块";
    await refresh();
    page.value = origin.page;
  }
  await nextTick();
  if (mainArea.value) mainArea.value.scrollTop = origin.scroll;
}
const switching = ref(false);
const collectionReviewPages = computed(() =>
  reviewPages.value.filter((t) => t.deckId === opened.value),
);
const reviewPages = computed(() =>
  (state.value?.sessions ?? []).flatMap((row) => {
    try {
      const draft = JSON.parse(row.payload);
      if (!liveDecks.value.some((d) => d.id === row.deck_id)) return [];
      return [
        {
          id: draft.sessionId,
          deckId: row.deck_id,
          title: draft.pageTitle || deckName(row.deck_id),
          detail: draft.pageDetail || "",
          ids: draft.ids as string[],
          index: draft.index as number,
          stage: draft.stage as string,
        },
      ];
    } catch {
      return [];
    }
  }),
);
function pageInfo(tab: (typeof reviewPages.value)[number]) {
  return `${tab.title}\n${tab.detail || "复盘页面"}\n${deckName(tab.deckId)} · ${tab.ids.length} 张 · 当前第 ${Math.min(tab.index + 1, tab.ids.length)} 张`;
}
async function prepareNavigation() {
  if ([...reviewSettingsGuards].some(guard=>!guard())) return false;
  if (switching.value || !allowLeave()) return false;
  if (settingsPersistence.flush && !(await settingsPersistence.flush()))
    return false;
  messagesOpen.value = false;
  if (mapPersistence.flush && !(await mapPersistence.flush())) return false;
  return (
    page.value !== "study" ||
    !studyController.suspend ||
    (await studyController.suspend())
  );
}
async function activateReview(id: string) {
  if (!(await prepareNavigation())) return;
  const tab = reviewPages.value.find((t) => t.id === id);
  if (!tab) return;
  switching.value = true;
  try {
    page.value = "cards";
    await nextTick();
    opened.value = tab.deckId;
    moduleFilter.value = tab.deckId;
    await refresh();
    reviewRequest.value = { mode: "resume", sessionId: id };
    activeSessionId.value = id;
    page.value = "study";
  } catch (e) {
    error.value = String(e);
  } finally {
    switching.value = false;
  }
}
async function closeReview(id: string, confirmed = false) {
  if (working.value || switching.value) return;
  const tab = reviewPages.value.find((t) => t.id === id);
  if (
    !tab ||
    (!confirmed &&
      !confirm(
        `关闭“${tab.title}”？已保存的复盘记录保留，此页面的未完成草稿将结束。`,
      ))
  )
    return;
  if (!(await prepareNavigation())) return;
  try {
    await services.session.delete({ deck_id: tab.deckId, session_id: id });
    if (activeSessionId.value === id && page.value === "study") {
      studyController.retire?.();
      page.value = "cards";
      await nextTick();
    }
    for (const key of Object.keys(localStorage))
      if (key.startsWith("gank-study-v065:") && key.endsWith(":" + id))
        localStorage.removeItem(key);
    await refresh();
  } catch (e) {
    error.value = String(e);
  }
}
async function startSpecialty(ids:string[]) {
  cardSelection.value=ids;
  reviewRequest.value={mode:'selected',practice:true,title:'知识点专项',detail:'额外练习，不推进 FSRS'};
  await startReview(opened.value,'selected');
}
async function startReview(deckId: string, mode: string) {
  if (!(await prepareNavigation())) return;
  const metadata = reviewRequest.value;
  const memory = isMemoryModule(deckId);
  let ids = [...cardSelection.value];
  let queueSnapshot=metadata?.queueSnapshot;
  if (mode === "due") {
    try {
      const queue=await services.policy.previewQueue(deckId);
      ids=[...queue.due,...queue.relearn].map(c=>c.cardId);
      queueSnapshot={ruleVersion:queue.ruleVersion,configRevision:queue.configRevision,dataRevision:queue.dataRevision,seed:queue.seed,calculatedAt:queue.calculatedAt};
    } catch(e) { error.value=String(e); return; }
  }
  const cards = (memory ? liveMemories.value : liveQuestions.value).filter(
    (c) => c.module === deckId,
  );
  ids = [...new Set(ids)].filter((id) =>
    cards.some(
      (c) =>
        c.id === id && (memory || ("answer" in c && /^[A-D]$/.test(c.answer))),
    ),
  );
  if (!ids.length) {
    notice.value = "当前没有可复盘的卡片，请调整选择或每日预算。";
    return;
  }
  const existing = reviewPages.value.find(
    (t) => queueIdentity(t.deckId, t.ids) === queueIdentity(deckId, ids),
  );
  if (existing) {
    notice.value = "这些题目已有复盘页面，已定位；更换顺序不会新建页面。";
    await activateReview(existing.id);
    return;
  }
  const first = cards.find((c) => c.id === ids[0]);
  const title =
    metadata?.title ||
    (first?.knowledge_ids[0]
      ? knowledgeName(first.knowledge_ids[0])
      : deckName(deckId) + "复盘");
  reviewRequest.value = {
    mode: "selected",
    sessionId: crypto.randomUUID(),
    ids,
    title,
    detail: metadata?.detail || title,
    practice: !!metadata?.practice,
    ...(queueSnapshot?{queueSnapshot}:{}),
  };
  activeSessionId.value = reviewRequest.value.sessionId!;
  opened.value = deckId;
  moduleFilter.value = deckId;
  page.value = "study";
}

const showBackToTop = ref(false);
const focusMode = ref(false);
watch(page, () => {
  focusMode.value = false;
});
function syncScrollPosition() {
  showBackToTop.value = (mainArea.value?.scrollTop ?? 0) > 300;
}
function backToTop() {
  mainArea.value?.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
}
watch([page, opened], () => {
  void nextTick(syncScrollPosition);
});
const menu = ref<{ kind: string; id: string; x: number; y: number } | null>(
  null,
);
const tabs = computed(() => [
  { id: "cards", label: "所有卡片", icon: "▤" },
  { id: "summary", label: "卡片集情况汇总", icon: "◈" },
  { id: "knowledge", label: "知识图谱", icon: "⌘" },
  ...(!isMemoryModule(opened.value)
    ? [{ id: "insights", label: "分析与漏洞", icon: "▥" }]
    : []),
  { id: "exchange", label: "批量导入与导出", icon: "⇄" },
  { id: "schedule", label: "复盘调度设置", icon: "◷" },
]);
const deckOpen = computed(
  () =>
    !!opened.value && !["overview", "settings", "trash"].includes(page.value),
);
const title = computed(() =>
  page.value === "overview"
    ? "学习总览"
    : page.value === "settings"
      ? "设置"
      : page.value === "trash"
        ? "回收站"
        : page.value === "project"
          ? "题目详情"
          : page.value === "study"
            ? "学习与复盘"
            : tabs.value.find((t) => t.id === page.value)?.label,
);
function allowLeave() {
  if (page.value === "study" && working.value) {
    error.value = "正在保存复盘，请等待结果后再切换页面。";
    return false;
  }
  return true;
}
async function closeMapPage() {
  if (!(await prepareNavigation())) return;
  mapDeckPages.value = mapDeckPages.value.filter((id) => id !== opened.value);
  if (page.value === "knowledge-expanded") page.value = "knowledge";
}
async function openSettingsHome() {
  if (await prepareNavigation()) {
    settingSection.value = "";
    page.value = "settings";
  }
}
async function openSetting(id: string) {
  if (!(await prepareNavigation())) return;
  if (!openedSettings.value.includes(id)) openedSettings.value.push(id);
  settingSection.value = id;
  page.value = "settings";
}
async function closeSetting(id: string) {
  if (!(await prepareNavigation())) return;
  openedSettings.value = openedSettings.value.filter((s) => s !== id);
  if (settingSection.value === id) settingSection.value = "";
}
let messageScroll = 0;
async function closeMessages() {
  messagesOpen.value = false;
  await nextTick();
  if (mainArea.value) mainArea.value.scrollTop = messageScroll;
}
async function showMessages() {
  if (messagesOpen.value) return;
  messageScroll = mainArea.value?.scrollTop || 0;
  if (!(await prepareNavigation())) return;
  messagesOpen.value = true;
  await nextTick();
  if (mainArea.value) mainArea.value.scrollTop = 0;
}
async function pageHome() {
  if (messagesOpen.value) {
    await closeMessages();
    return;
  }
  if (page.value === "settings") {
    if (await prepareNavigation()) settingSection.value = "";
    return;
  }
  await changePage(
    isMapPage.value
      ? "knowledge"
      : showWorkspacePages.value
        ? "cards"
        : page.value,
  );
}
async function pageSelect(id: string) {
  if (id === "messages") {
    messagesOpen.value = true;
    return;
  }
  messagesOpen.value = false;
  if (page.value === "settings") return openSetting(id);
  return isMapPage.value ? navigate("knowledge-expanded") : activateReview(id);
}
async function pageClose(id: string) {
  if (id === "messages") {
    await closeMessages();
    return;
  }
  if (page.value === "settings") return closeSetting(id);
  return isMapPage.value ? closeMapPage() : closeReview(id);
}
async function closeAllPages() {
  if (working.value || switching.value || !currentPageTabs.value.length) return;
  if (!confirm("关闭当前模块全部页面？已保存记录保留，未完成草稿将结束。"))
    return;
  if (!(await prepareNavigation())) return;
  error.value = "";
  if (page.value === "settings") {
    openedSettings.value = [];
    settingSection.value = "";
  } else if (isMapPage.value) await closeMapPage();
  else if (showWorkspacePages.value) {
    for (const id of collectionReviewPages.value.map((t) => t.id)) {
      await closeReview(id, true);
      if (error.value) break;
    }
  }
  if (messagesOpen.value) await closeMessages();
}
const currentPageTabs = computed(() => [
  ...(page.value === "settings"
    ? settingsTabs.value
    : isMapPage.value
      ? mapPages.value
      : showWorkspacePages.value
        ? collectionReviewPages.value.map((t) => ({
            ...t,
            detail: pageInfo(t),
          }))
        : []),
  ...(messagesOpen.value ? [{ id: "messages", title: "消息中心" }] : []),
]);
async function changePage(p: string) {
  if (await prepareNavigation()) page.value = p;
}
async function openDeck(id: string, entry = "cards") {
  if (!(await prepareNavigation())) return;
  opened.value = id;
  moduleFilter.value = id;
  page.value = entry;
  cardSelection.value = [];
  cardFilterPreset.value = "all";
  menu.value = null;
}
async function overview() {
  if (!(await prepareNavigation())) return;
  void refresh().catch(() => {});
  opened.value = "";
  moduleFilter.value = "全部模块";
  page.value = "overview";
}
async function navigate(p: string, id?: string) {
  if (p === "knowledge-expanded") {
    if (await prepareNavigation()) {
      if (!mapDeckPages.value.includes(opened.value))
        mapDeckPages.value.push(opened.value);
      page.value = p;
    }
    return;
  }
  if (p === "back") {
    await returnFromDetail();
    return;
  }
  if (page.value === "study" && working.value) {
    error.value = "正在保存复盘，请等待结果后再切换页面。";
    return;
  }
  if (p === "overview") {
    overview();
    return;
  }
  if (p === "open" && id) {
    openDeck(id);
    return;
  }
  if (p === "due" && id) {
    await openDeck(id);
    cardFilterPreset.value = "due";
    return;
  }
  if ((p === "start" || p === "resume") && id) {
    if (p === "resume") {
      const tab = reviewPages.value.find((t) => t.deckId === id);
      if (tab) await activateReview(tab.id);
      return;
    }
    await openDeck(id);
    await refresh();
    reviewRequest.value = null;
    await startReview(id, "due");
    return;
  }
  if (p === "study") {
    await startReview(opened.value, "selected");
    return;
  }
  if (p === "questions" || p === "project") {
    const origin = {
      page: page.value,
      deckId: opened.value,
      sessionId: activeSessionId.value,
      scroll: mainArea.value?.scrollTop ?? 0,
    };
    const q = state.value?.questions.find((q) => q.id === id);
    if (!(await prepareNavigation())) return;
    if (q && q.module !== opened.value) await openDeck(q.module);
    if (id) selectedQuestionId.value = id;
    if (origin.page !== "project") detailOrigin.value = origin;
    page.value = "project";
    return;
  }
  if (p === "knowledge" && id) {
    const k = state.value?.knowledge.find((k) => k.id === id);
    if (!(await prepareNavigation())) return;
    if (k && k.module !== opened.value) await openDeck(k.module);
    selectedKnowledgeId.value = id;
    page.value = "knowledge";
    return;
  }
  if (p === "memory" && id) {
    const m = state.value?.memories.find((m) => m.id === id);
    if (m && m.module !== opened.value) await openDeck(m.module);
    selectedMemoryId.value = id;
    cardSelection.value = [id];
    await startReview(opened.value, "selected");
    return;
  }
  if (p === "review" || p === "review-knowledge") {
    if (p === "review-knowledge" && id) {
      if (!(await prepareNavigation())) return;
      page.value = "cards";
      cardFilterPreset.value = "knowledge:" + id;
    } else {
      cardSelection.value = id
        ? [id]
        : selectedQuestionId.value
          ? [selectedQuestionId.value]
          : [];
      reviewRequest.value = null;
      await startReview(
        opened.value,
        cardSelection.value.length ? "selected" : "due",
      );
    }
    return;
  }
  if (await prepareNavigation()) page.value = p;
}
function context(kind: string, id: string, event: MouseEvent) {
  menu.value = {
    kind,
    id,
    x: Math.min(event.clientX, window.innerWidth - 235),
    y: Math.min(event.clientY, window.innerHeight - 255),
  };
}
async function manageCatalog(id: string) {
  if (await prepareNavigation()) manager.value.open("deck", id);
}
async function exportCatalog() {
  const id = menu.value?.id;
  if (!id || !(await prepareNavigation())) return;
  menu.value = null;
  await task(() => catalogManagement.exportDeck(id), "卡片集导出完成");
}
function create(kind: string, deckKind = "memory") {
  const parent = menu.value?.kind === "folder" ? menu.value.id : null;
  manager.value.open(kind, "", parent, deckKind);
  menu.value = null;
}
async function edit() {
  if (!(await prepareNavigation())) return;
  if (menu.value) manager.value.open(menu.value.kind, menu.value.id);
  menu.value = null;
}
async function remove(cascade = false) {
  const item = menu.value;
  if (!item) return;
  if (
    !confirm(
      cascade
        ? "将文件夹及所有内容移入回收站？"
        : "将所选项目移入回收站？删除文件夹时内容移到上一级。",
    )
  )
    return;
  menu.value = null;
  await task(
    () =>
      (item.kind === "folder" ? services.folder.action : services.deck.action)({
        id: item.id,
        action: "delete",
        cascade,
      }),
    "已移入回收站",
  );
  if (opened.value && !liveDecks.value.some((d) => d.id === opened.value))
    overview();
}
let noticeTimer: ReturnType<typeof setTimeout>;
watch(notice, (message) => {
  clearTimeout(noticeTimer);
  if (message)
    noticeTimer = setTimeout(() => {
      notice.value = "";
    }, 4000);
});
let tick: ReturnType<typeof setInterval>;
let stopNotifications: (() => void) | undefined;
onMounted(async () => {
  stopNotifications = startNotifications();
  await initializeTheme();
  try {
    await refresh();
    tick = setInterval(() => refresh().catch(() => {}), 60000);
  } catch (e) {
    error.value = String(e);
  }
});
onBeforeUnmount(() => {
  stopNotifications?.();
  clearInterval(tick);
  clearTimeout(noticeTimer);
});
</script>
<template>
  <div
    class="app-shell v04"
    :class="{ 'focus-mode': focusMode }"
    @click="menu = null"
  >
    <aside class="sidebar">
      <div class="brand">
        <img class="brand-icon" src="/assets/ganksoft.png" alt="GankSoft" />
        <div>GankSoft<small>知识 · 回忆 · 复盘</small></div>
      </div>
      <button
        class="nav-item"
        :class="{ active: page === 'overview' }"
        @click="overview"
      >
        <span>◈</span>学习总览
      </button>
      <div class="nav-caption catalog-heading">
        卡片库<button
          aria-label="新建文件夹或卡片集"
          class="icon-btn"
          @click.stop="context('root', '', $event)"
        >
          ＋
        </button>
      </div>
      <div
        class="catalog-scroll"
        @contextmenu.prevent="context('root', '', $event)"
      >
        <FolderTree @open="openDeck" @menu="context" @manage="manageCatalog" />
        <p
          v-if="
            state &&
            !liveDecks.length &&
            !state.folders.some((f) => !f.deleted_at)
          "
          class="muted empty compact"
        >
          右键创建文件夹或卡片集
        </p>
      </div>
      <div class="sidebar-bottom">
        <div class="local-badge"><i></i>学习数据保存在本机</div>
        <small>v{{ version }} · 本地学习空间</small>
        <button
          class="nav-item settings-bottom"
          :class="{ active: page === 'settings' }"
          @click="openSettingsHome"
        >
          <span>⚙</span>设置
        </button>
      </div>
    </aside>
    <section class="global-workspace">
      <header class="topbar">
        <WorkspacePageBar
          :multiple="deckOpen || page === 'settings' || messagesOpen"
          :show-manager="deckOpen || page === 'settings'"
          :pages="currentPageTabs"
          :active-id="
            messagesOpen
              ? 'messages'
              : page === 'settings'
                ? settingSection
                : isMapPage
                  ? page === 'knowledge-expanded'
                    ? page
                    : ''
                  : page === 'study'
                    ? activeSessionId
                    : ''
          "
          :home-title="
            (deckOpen ? deckName(opened) + ' / ' : '') +
            (isMapPage ? '知识图谱' : title || '')
          "
          @home="pageHome"
          @select="pageSelect"
          @close="pageClose"
          @close-all="closeAllPages"
        />
        <div class="topbar-actions">
          <button
            v-if="deckOpen"
            class="btn focus-toggle"
            :aria-pressed="focusMode"
            @click="focusMode = !focusMode"
          >
            {{ focusMode ? "显示导航" : "专注模式" }}</button
          ><button
            class="btn message-toggle"
            aria-label="消息中心"
            :aria-pressed="messagesOpen"
            @click="showMessages"
          >
            <UiIcon name="bell" /><span
              v-if="unreadMessages"
              class="message-count"
              >{{ unreadMessages }}</span
            >
          </button>
        </div>
      </header>
      <div class="workspace-body">
        <aside v-if="deckOpen" class="collection-nav">
          <div class="collection-nav-head">
            <span class="eyebrow">{{
              isMemoryModule(opened) ? "记忆积累" : "错题复盘"
            }}</span>
            <h2>{{ deckName(opened) }}</h2>
            <p class="muted">{{ deckPath(opened) }}</p>
          </div>
          <button
            v-for="t in tabs"
            :key="t.id"
            class="collection-tab"
            :class="{
              active:
                page === t.id ||
                (t.id === 'cards' && ['study', 'project'].includes(page)) ||
                (t.id === 'knowledge' && isMapPage),
            }"
            :aria-label="t.label"
            :title="t.label"
            @click="changePage(t.id)"
          >
            <UiIcon :name="t.id" />
            <span class="collection-tab-label">{{ t.label }}</span>
          </button>
          <div class="collection-tip">
            右键目录可管理文件夹和卡片集。<br />每张卡片独立记录学习与复盘。
          </div>
        </aside>
        <main
          ref="mainArea"
          class="main-area"
          @scroll.passive="syncScrollPosition"
        >
          <div v-if="error" class="banner error" role="alert">
            {{ error }}<button @click="error = ''">×</button>
          </div>
          <Transition name="notice">
            <div
              v-if="notice"
              class="banner success notice-toast"
              role="status"
              aria-live="polite"
            >
              <span class="notice-check" aria-hidden="true">✓</span>
              <span>{{ notice }}</span>
              <button aria-label="关闭成功提示" @click="notice = ''">×</button>
            </div>
          </Transition>
          <div
            class="content"
            :class="{
              busy: working,
              'map-page-content':
                page === 'knowledge-expanded' && !messagesOpen,
            }"
          >
            <MessageCenter v-if="messagesOpen" @close="closeMessages" />
            <div v-show="!messagesOpen" class="page-content-body">
              <template v-if="state"
                ><Overview
                  v-if="page === 'overview'"
                  @navigate="navigate" /><Settings
                  v-else-if="page === 'settings'"
                  :section="settingSection"
                  @open="openSetting" /><TrashWorkspace
                  v-else-if="page === 'trash'" /><CardExplorer
                  v-else-if="page === 'cards'"
                  :key="opened"
                  @navigate="navigate" /><CollectionSummary
                  v-else-if="page === 'summary'"
                  @navigate="navigate" /><MindMapWorkspace
                  v-else-if="isMapPage"
                  :expanded="page === 'knowledge-expanded'"
                  :key="opened"
                  @navigate="navigate" /><Insights
                  v-else-if="page === 'insights' && !isMemoryModule(opened)"
                  :key="opened"
                  :deck-id="opened"
                  @navigate="navigate" /><ImportWorkspace
                  v-else-if="page === 'exchange'"
                  :key="opened"
                  @navigate="navigate" /><DeckReviewSettings
                  @specialty="startSpecialty"
                  v-else-if="page === 'schedule'"
                  :key="opened"
                  :deck-id="opened" /><QuestionLibrary
                  :project-mode="true"
                  v-else-if="page === 'project'"
                  @navigate="navigate" /><StudyWorkspace
                  v-else-if="page === 'study'"
                  :key="activeSessionId"
                  @navigate="navigate"
              /></template>
              <section v-else class="panel empty">
                <h2>正在打开学习空间</h2>
              </section>
            </div>
          </div>
          <button
            v-show="showBackToTop"
            class="back-to-top"
            aria-label="返回顶部"
            title="返回顶部"
            @click="backToTop"
          >
            <span aria-hidden="true">↑</span>
            <span>返回顶部</span>
          </button>
        </main>
      </div>
    </section>
    <div
      v-if="menu"
      class="catalog-menu"
      :style="{ left: menu.x + 'px', top: menu.y + 'px' }"
      @click.stop
    >
      <template v-if="menu.kind !== 'deck'"
        ><button @click="create('folder')">
          ＋ 新建{{ menu.kind === "folder" ? "子" : "" }}文件夹</button
        ><button @click="create('deck', 'memory')">＋ 新建记忆卡片集</button
        ><button @click="create('deck', 'question')">
          ＋ 新建错题卡片集
        </button></template
      ><button v-if="menu.kind !== 'deck'" @click="importFromCatalog">
        导入卡片集</button
      ><template v-if="menu.kind !== 'root'"
        ><button @click="edit">编辑卡片集 / 重命名 / 移动 / 排序</button
        ><button class="danger" @click="remove(false)">
          {{ menu.kind === "folder" ? "仅删除文件夹" : "删除卡片集" }}</button
        ><button
          v-if="menu.kind === 'folder'"
          class="danger"
          @click="remove(true)"
        >
          连同内容移入回收站
        </button></template
      >
    </div>
    <CollectionImport
      v-if="importingCollection"
      :folder-id="importFolder"
      @close="importingCollection = false"
      @imported="
        (id) => {
          importingCollection = false;
          openDeck(id);
        }
      "
    />
    <CatalogManager
      ref="manager"
      @removed="
        (id) => {
          if (opened === id) overview();
        }
      "
    />
  </div>
</template>
