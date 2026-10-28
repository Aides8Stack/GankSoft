<script setup lang="ts">
import {
  computed,
  watch,
  defineAsyncComponent,
  nextTick,
  onMounted,
  ref,
  shallowRef,
} from "vue";
import {
  unifiedWorkspace,
  unifiedCards,
  unifiedDrafts,
  unifiedLearning,
} from "../services";
import { StudyFilters } from "../../shared/study-query";
import { reviewSettingsGuards } from "../composables/reviewSettingsGuard";
import { initializeTheme } from "../composables/preferences";
import type { Input, Output } from "../../shared/protocol/registry";
import UiIcon from "./v37/PrototypeIcon.vue";
import CatalogBranch from "./UnifiedCatalogBranch.vue";
import "./ui-v076.css";
function reloadAfterRestore() {
  window.location.reload();
}
const SystemSettings = defineAsyncComponent(
  () => import("./UnifiedSystemSettings.vue"),
);
const system = shallowRef<InstanceType<typeof SystemSettings>>();
const Exchange = defineAsyncComponent(
  () => import("./UnifiedCardExchange.vue"),
);
const importing = ref(false),
  exchange = shallowRef<InstanceType<typeof Exchange>>();
const Home = defineAsyncComponent(()=>import('./UnifiedHome.vue'));
const homeView = shallowRef<InstanceType<typeof Home>>();
async function homeStudy(item:{id:string;name:string;cardCount:number|null}){await openDeck(item);if(deck.value?.id===item.id)await study();}
async function homeResume(item:{id:string;name:string;cardCount:number|null},id:string){await openDeck(item);if(deck.value?.id===item.id)await resume(id);}
async function homeViewEvent(item:{id:string;name:string;cardCount:number|null},id:string,event:string){await openDeck(item);if(deck.value?.id===item.id)await viewCard(id,false,event);}
const MediaLibrary=defineAsyncComponent(()=>import('../components/MediaLibrary.vue'));
const mediaView=shallowRef<InstanceType<typeof MediaLibrary>>();
const DeckOverview = defineAsyncComponent(()=>import('./UnifiedDeckOverview.vue'));
const Analytics = defineAsyncComponent(() => import("./UnifiedAnalytics.vue"));
const CatalogEditor = defineAsyncComponent(
  () => import("./UnifiedCatalogEditor.vue"),
);
const catalogEditor = shallowRef<InstanceType<typeof CatalogEditor>>(),
  catalogEdit = shallowRef<{
    kind: "folder" | "deck";
    item?: Output<"workspace.catalog">["items"][number];
  } | null>(null);
const CardBatch = defineAsyncComponent(() => import("./UnifiedCardBatch.vue"));
const CardRecycle = defineAsyncComponent(() => import("./UnifiedRecycle.vue"));
const batch = shallowRef<InstanceType<typeof CardBatch>>();
const StudyPlanner = defineAsyncComponent(
  () => import("./UnifiedStudyPlanner.vue"),
);
const ScheduleSettings = defineAsyncComponent(
  () => import("./UnifiedScheduleSettings.vue"),
);
const settings = shallowRef<InstanceType<typeof ScheduleSettings>>();
const CardEditor = defineAsyncComponent(
  () => import("./UnifiedCardEditor.vue"),
);
const CardDetail = defineAsyncComponent(
  () => import("./UnifiedCardDetail.vue"),
);
const detail = shallowRef<InstanceType<typeof CardDetail>>();
const ReviewForm = defineAsyncComponent(
  () => import("../review/UnifiedReviewForm.vue"),
);
const MindWorkspace = defineAsyncComponent(
  () => import("../components/MindMapWorkspace.vue"),
);
const railRevision = ref(0), railOpen = ref(false), focusMode = ref(false), deckPath = ref<string[]>([]);
async function selectRailDeck(item: Output<"workspace.catalog">["items"][number], path:string[]) {
  await openDeck(item);
  if(deck.value?.id===item.id){deckPath.value=path;railOpen.value=false;}
}
const props = defineProps<{ initialCatalog?: Output<"workspace.catalog"> }>();
const catalog = shallowRef<Output<"workspace.catalog">>(),
  folder = ref<string | null>(null),
  catalogItems = ref<Output<"workspace.catalog">["items"]>([]),
  deck = shallowRef<{ id: string; name: string; cardCount: number | null }>(),
  page = ref<
    | "home"
    | "cards"
    | "detail"
    | "edit"
    | "review"
    | "media"
    | "knowledge"
    | "planner"
    | "settings"
    | "card-policy"
    | "analysis"
    | "exchange"
    | "overview"
    | "system"
  >("home");
const deckNavigation = [
 {page:'overview',label:'概览',icon:'grid'},
 {page:'cards',label:'所有卡片',icon:'cards'},
 {page:'planner',label:'筛选学习',icon:'search'},
 {page:'review',label:'开始复盘',icon:'play'},
 {page:'media',label:'图片资源',icon:'cards'},
 {page:'knowledge',label:'知识图谱',icon:'knowledge'},
 {page:'analysis',label:'学习分析',icon:'insights'},
 {page:'exchange',label:'导入导出',icon:'exchange'},
 {page:'settings',label:'调度设置',icon:'schedule'},
] as const;
async function navigateDeck(next:typeof deckNavigation[number]['page']) {
 if(next==='cards')await cards(); else if(next==='review')await study(); else await switchPage(next);
}
const plannerStates=new Map<string,import('./planner-state').PlannerState>();
const detailReturn=ref<'cards'|'planner'>('cards');
const listSort=ref('default');
const displayedRows=computed(()=>{const copy=[...rows.value];if(listSort.value==='title')copy.sort((a,b)=>a.title.localeCompare(b.title,'zh-CN'));if(listSort.value==='reviews')copy.sort((a,b)=>a.reviewCount-b.reviewCount);return copy;});
const error = ref(""),
  notice = ref(""),
  busy = ref(false),
  query = ref(""),
  mode = ref<"all" | "question" | "qa" | "direct">("all"),
  selection = ref<string[]>([]),
  cardId = ref(""),
  rows = ref<Output<"card.listSummary">["items"]>([]),
  cursor = ref<string | null>(null),
  drafts = ref<Output<"draft.listSummary">["items"]>([]);
const sessions = ref<Output<"workspace.sessions">["items"]>([]),
  activeSession = ref(""),
  review = shallowRef<Output<"learning.session.get">>(),
  editor = shallowRef<InstanceType<typeof CardEditor>>(),
  reviewForm = shallowRef<InstanceType<typeof ReviewForm>>(),
  map = shallowRef<InstanceType<typeof MindWorkspace>>();
const selectedEvent = ref("");
const labels = { question: "单选错题", qa: "问答记忆", direct: "直接记忆" };
const draftCursor = ref<string | null>(null),
  sessionCursor = ref<string | null>(null);
const selectedRows = computed(() =>
  rows.value.filter((r) => selection.value.includes(r.cardId)),
);
const showingMap = computed(() => page.value === "knowledge");
const lastLists = new Map<
  string,
  {
    rows: Output<"card.listSummary">["items"];
    cursor: string | null;
    query: string;
    mode: typeof mode.value;
    selection: string[];
    scroll: number;
    sort: string;
  }
>();
const contentArea = ref<HTMLElement>();
// New pages start at their heading; the list and settings keep their explicit restore paths.
watch(page,(next,previous)=>{if(next!=='cards'&&next!=='system'&&previous!=='system')void nextTick(()=>{if(contentArea.value)contentArea.value.scrollTop=0;});});
let systemReturn: typeof page.value = "home",
  systemScroll = 0,
  listFocus = "";
let systemDataChanged = false;
async function systemChanged() {
  systemDataChanged = true;
  lastLists.clear();
  await loadCatalog(folder.value);
}
async function openSystem() {
  if (page.value === "system" || !(await leave())) return;
  systemDataChanged = false;
  systemReturn = page.value;
  if (page.value === "detail")
    selectedEvent.value = detail.value?.selectedEvent() ?? selectedEvent.value;
  systemScroll = contentArea.value?.scrollTop ?? 0;
  page.value = "system";
  await nextTick();
  contentArea.value?.querySelector<HTMLElement>("select,button")?.focus();
}
async function returnSystem() {
  if (!(await leave())) return;
  if (systemReturn === "review" && deck.value && activeSession.value) {
    try {
      review.value = await unifiedLearning.get({
        deckId: deck.value.id,
        sessionId: activeSession.value,
      });
    } catch (e) {
      error.value = String(e);
      return;
    }
  }
  page.value = systemReturn;
  if (systemReturn === "cards" && systemDataChanged) {
    await loadCards();
    await loadSessions();
  }
  systemDataChanged = false;
  await nextTick();
  if (contentArea.value) contentArea.value.scrollTop = systemScroll;
  document
    .querySelector<HTMLElement>(".unified-sidebar [aria-label=系统设置]")
    ?.focus();
}
function systemExchange() {
  importing.value = true;
}

let navigationPending = false;
async function leave() {
  if(page.value==='media'&&mediaView.value&&!await mediaView.value.close())return false;
  if (importing.value && exchange.value?.close() === false) return false;
  if (navigationPending || busy.value) return false;
  navigationPending = true;
  try {
    importing.value = false;
    if (
      page.value === "system" &&
      system.value &&
      !(await system.value.close())
    )
      return false;
    if (catalogEdit.value) {
      if (catalogEditor.value && !catalogEditor.value.close()) return false;
      catalogEdit.value = null;
    }
    if (page.value === "cards" && batch.value && !batch.value.close())
      return false;
    if (["settings", "card-policy"].includes(page.value)) {
      if (settings.value && !settings.value.close()) return false;
      for (const guard of reviewSettingsGuards) if (!guard()) return false;
    }
    if (page.value === "edit" && editor.value && !(await editor.value.close()))
      return false;
    if (
      page.value === "review" &&
      reviewForm.value &&
      !(await reviewForm.value.close())
    )
      return false;
    if (page.value === "knowledge" && map.value && !(await map.value.save()))
      return false;
    if (page.value === "cards" && deck.value)
      lastLists.set(deck.value.id, {
        rows: [...rows.value],
        cursor: cursor.value,
        query: query.value,
        mode: mode.value,
        selection: [...selection.value],
        scroll: contentArea.value?.scrollTop ?? 0,
        sort: listSort.value,
      });
    return true;
  } finally {
    navigationPending = false;
  }
}
async function loadCatalog(id: string | null = null, more = false) {
  busy.value = true;
  error.value = "";
  try {
    const result = await unifiedWorkspace.catalog({
      folderId: id,
      cursor: more ? catalog.value?.nextCursor : null,
    });
    catalog.value = result;
    railRevision.value++;
    catalogItems.value = more
      ? [...catalogItems.value, ...result.items]
      : result.items;
    folder.value = id;
  } catch (e) {
    error.value = String(e);
  } finally {
    busy.value = false;
  }
}
async function catalogSaved() {
  catalogEdit.value = null;
  notice.value = "目录已保存";
  void homeView.value?.load();
  await loadCatalog(folder.value);
  if (error.value)
    error.value = "目录已保存，刷新失败，请重新读取。" + error.value;
}
async function home(id: string | null = null) {
  if (!(await leave())) return;
  const refreshHome = page.value === "home";
  deck.value = undefined;
  page.value = "home";
  await loadCatalog(id);
  if (refreshHome) await homeView.value?.load();
}
async function openDeck(item: {
  id: string;
  name: string;
  cardCount: number | null;
  path?: string;
}) {
  if (!(await leave())) return;
  deck.value = item;
  deckPath.value = [...(item.path?item.path.split(' / '):(catalog.value?.breadcrumbs.map(b=>b.name)??[])),item.name];
  drafts.value = [];
  draftCursor.value = null;
  sessions.value = [];
  sessionCursor.value = null;
  query.value = "";
  listSort.value = "default";
  mode.value = "all";
  selection.value = [];
  rows.value = [];
  cursor.value = null;
  page.value = "overview";
  await loadSessions();
}
async function loadCards(more = false) {
  if (!deck.value || busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    const result = await unifiedCards.listSummary({
      deckId: deck.value.id,
      filters: {
        query: query.value,
        ...(mode.value === "all" ? {} : { mode: mode.value }),
      },
      cursor: more ? cursor.value : null,
      limit: 30,
    });
    rows.value = more ? [...rows.value, ...result.items] : result.items;
    cursor.value = result.nextCursor;
    if (!more) selection.value = [];
  } catch (e) {
    error.value = String(e);
  } finally {
    busy.value = false;
  }
}
async function loadSessions(more = false) {
  if (!deck.value) return;
  try {
    const id = deck.value.id,
      result = await unifiedWorkspace.sessions({
        deckId: id,
        after: more ? sessionCursor.value : null,
      });
    if (deck.value?.id === id) {
      sessions.value = more
        ? [...sessions.value, ...result.items]
        : result.items;
      sessionCursor.value = result.nextCursor;
    }
  } catch (e) {
    error.value = String(e);
  }
}
async function cards() {
  if (!deck.value || !(await leave())) return;
  const remembered = lastLists.get(deck.value.id);
  page.value = "cards";
  if (remembered) {
    rows.value = remembered.rows;
    cursor.value = remembered.cursor;
    query.value = remembered.query;
    mode.value = remembered.mode;
    selection.value = remembered.selection;
    listSort.value = remembered.sort;
    await nextTick();
    if (contentArea.value) contentArea.value.scrollTop = remembered.scroll;
  } else await loadCards();
  await loadSessions();
  await nextTick();
  if (listFocus)
    contentArea.value
      ?.querySelector<HTMLElement>(
        '[data-card-id="' + CSS.escape(listFocus) + '"] button',
      )
      ?.focus({ preventScroll: true });
}
// The graph supplies a node identity; the existing Unified planner owns all
// filtering and queue reads. Do not use the legacy workspace's global preset.
async function filterKnowledge(nodeId:string) {
  if(!deck.value||!(await leave()))return;
  plannerStates.set(deck.value.id,{
    filters:StudyFilters.parse({knowledge:[nodeId],includeChildren:true}),
    mode:'all',random:false,count:1,scope:'eligible',weighted:false,seed:'',
  });
  page.value='planner';
}
async function viewCard(id: string, edit = false, eventId = "") {
  if (!(await leave())) return;
  if(!edit&&page.value!=="detail")detailReturn.value=page.value==='planner'?'planner':'cards';
  listFocus = id;
  cardId.value = id;
  selectedEvent.value = eventId;
  page.value = edit ? "edit" : "detail";
}
async function create(mode: "question" | "qa" | "direct") {
  if (!deck.value || !(await leave())) return;
  busy.value = true;
  try {
    const d = await unifiedDrafts.create({
      deckId: deck.value.id,
      initialType: mode,
    });
    cardId.value = d.cardId;
    page.value = "edit";
  } catch (e) {
    error.value = String(e);
  } finally {
    busy.value = false;
  }
}
async function restoreDrafts(more = false) {
  if (!deck.value || !(await leave())) return;
  busy.value = true;
  try {
    const r = await unifiedDrafts.listSummary({
      deckId: deck.value.id,
      after: more ? draftCursor.value : null,
    });
    drafts.value = more ? [...drafts.value, ...r.items] : r.items;
    draftCursor.value = r.nextCursor;
  } catch (e) {
    error.value = String(e);
  } finally {
    busy.value = false;
  }
}
async function switchPage(
  next:
    | "media"
    | "knowledge"
    | "planner"
    | "settings"
    | "card-policy"
    | "analysis"
    | "exchange"
    | "overview",
) {
  if (!(await leave())) return;
  page.value = next;
}
async function study(ids?: string[], practice = false) {
  if (!deck.value || !(await leave())) return;
  busy.value = true;
  error.value = "";
  try {
    let chosen = ids;
    if (!chosen?.length) {
      const q = await unifiedLearning.queue({
        deckId: deck.value.id,
        filters: { query: query.value },
        limit: 100,
      });
      chosen = [...q.due, ...q.relearn, ...q.specialty].map((r) => r.cardId);
    }
    if (!chosen.length) {
      notice.value = "当前没有可复盘卡片，可在列表选择卡片开始专项复盘。";
      return;
    }
    const uniqueIds = [...new Set(chosen)],
      matches = await unifiedWorkspace.sessions({
        deckId: deck.value.id,
        exactCardIds: uniqueIds,
      }),
      existing = matches.items.find(
        (s) => !s.completed && s.practiceMode === practice,
      );
    const result = existing
      ? await unifiedLearning.get({
          deckId: deck.value.id,
          sessionId: existing.sessionId,
        })
      : await unifiedLearning.open({
          deckId: deck.value.id,
          cardIds: uniqueIds,
          practice,
        });
    review.value = result;
    activeSession.value = result.sessionId;
    page.value = "review";
    await loadSessions();
  } catch (e) {
    error.value = String(e);
  } finally {
    busy.value = false;
  }
}
async function resume(id: string) {
  if (!deck.value || !(await leave())) return;
  busy.value = true;
  try {
    review.value = await unifiedLearning.get({
      deckId: deck.value.id,
      sessionId: id,
    });
    activeSession.value = id;
    page.value = "review";
  } catch (e) {
    error.value = String(e);
  } finally {
    busy.value = false;
  }
}
async function batchSaved() {
  railRevision.value++;
  if (!deck.value) return;
  lastLists.delete(deck.value.id);
  selection.value = [];
  await loadCards();
  if (error.value)
    error.value =
      "操作已保存，列表刷新失败，请重新读取；无需重复操作。" + error.value;
}
function published() {
  railRevision.value++;
  notice.value = "卡片已发布";
  if (deck.value) lastLists.delete(deck.value.id);
}
onMounted(async () => {
  await initializeTheme();
  if (props.initialCatalog) {
    catalog.value = props.initialCatalog;
    catalogItems.value = props.initialCatalog.items;
  } else await loadCatalog();
});
defineExpose({ leave, page, deck, rows, sessions });
</script>
<template>
  <div class="unified-shell" :class="{ 'map-fullscreen': showingMap, 'focus-mode':focusMode }">
    <aside v-if="!showingMap" id="learning-sidebar" class="unified-sidebar left-rail" :class="{open:railOpen}" aria-label="学习导航">
      <div class="brand"><div class="brand-mark">G</div><div class="brand-text"><strong>GankSoft</strong><small>知识 · 记忆 · 复盘</small></div></div>
      <div class="rail-section"><button class="rail-link" title="学习总览" aria-label="学习总览" :aria-current="page==='home'?'page':undefined" @click="home(null);railOpen=false"><UiIcon name="home"/><span>学习总览</span></button></div>
      <div class="rail-section group-nav"><div class="rail-head"><span>卡片集</span><button class="icon-button tiny" title="新建卡片集" aria-label="侧栏新建卡片集" @click="catalogEdit={kind:'deck'}"><UiIcon name="add"/></button></div>
        <CatalogBranch :selected="page==='home'?undefined:deck?.id" :revision="railRevision" @select="selectRailDeck"/>
      </div>
      <div class="rail-spacer"/>
      <div class="rail-bottom"><div class="storage-status"><span class="status-dot"/>数据保存在本机</div>

        <button class="rail-link" title="系统设置" aria-label="系统设置" :aria-current="page==='system'?'page':undefined" @click="openSystem"><UiIcon name="settings"/><span>设置</span></button>
        <div class="version">v0.7.6-rc.1 · 本地学习工作台</div>
      </div>
    </aside>
    <div class="unified-main">
      <header class="unified-topbar topbar">
        <div class="topbar-left">
          <button class="icon-button mobile-menu" aria-label="展开卡片集目录" :aria-expanded="railOpen" aria-controls="learning-sidebar" @click="railOpen=!railOpen"><UiIcon name="cards"/></button>
          <button class="top-home" title="返回学习总览" aria-label="返回学习总览" @click="home(null)"><UiIcon name="home" :size="17"/></button>
          <span class="top-sep">/</span><span class="workspace-title">{{ page==='system'?'设置':deck?.name??'学习总览' }}</span>
          <template v-if="deck&&page!=='system'"><span class="top-sep">/</span><span class="top-page">{{deckNavigation.find(n=>n.page===page)?.label??({edit:'编辑卡片',detail:'卡片详情','card-policy':'单卡调度'} as Record<string,string>)[page]}}</span></template>
        </div>
        <div class="topbar-right"><span class="local-status"><span class="status-dot"/>本地学习 · 自动保存</span><button class="icon-button" title="切换专注模式" aria-label="切换专注模式" :aria-pressed="focusMode" @click="focusMode=!focusMode"><UiIcon name="grid"/></button><button class="avatar" title="本地用户" aria-label="本地用户设置" @click="openSystem">GS</button>
          <button v-if="showingMap" class="button" @click="cards">返回所有卡片</button>
        </div>
      </header>
      <nav v-if="!showingMap" :hidden="!deck||page==='system'" class="deck-subnav subnav" aria-label="卡片集功能">
        <button v-for="item in (deck&&page!=='system'?deckNavigation:[])" :key="item.page" :title="item.label" :aria-current="page===item.page?'page':undefined" @click="navigateDeck(item.page)"><UiIcon :name="item.icon" :size="15"/>{{item.label}}</button>
      </nav>
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-if="notice" role="status">{{ notice }}</p>
      <main ref="contentArea" class="unified-content content-scroller"><div class="content-container">
        <template v-if="page === 'system'"
          ><SystemSettings
            ref="system"
            :deck-id="deck?.id"
            @schedule="switchPage('settings')"
            @back="returnSystem"
            @changed="systemChanged"
            @exchange="systemExchange"
            @restored="reloadAfterRestore" /><Exchange
            v-if="importing"
            ref="exchange"
            importing
            :parent-id="folder"
            @close="importing = false"
            @imported="loadCatalog(folder)"
        /></template>
        <template v-else-if="page==='home'">
          <Home ref="homeView" @create="catalogEdit={kind:'deck'}" @folder="catalogEdit={kind:'folder'}" @import="importing=true" @open="openDeck" @study="homeStudy" @resume="homeResume" @view="homeViewEvent">
          <nav aria-label="目录路径">
            <button @click="loadCatalog(null)">全部卡片集</button
            ><button
              v-for="b in catalog?.breadcrumbs"
              :key="b.id"
              @click="loadCatalog(b.id)"
            >
              {{ b.name }}
            </button>
          </nav>
          <section class="catalog-grid" aria-label="卡片集目录">
            <article
              v-for="item in catalogItems"
              :key="item.kind + item.id"
              class="catalog-item"
              :aria-label="item.name"
            >
              <button
                class="catalog-open"
                :aria-label="item.name"
                @click="
                  item.kind === 'folder' ? loadCatalog(item.id) : openDeck(item)
                "
              >
                <span class="deck-icon" :class="item.kind==='folder'?'':'blue'"><UiIcon :name="item.kind==='folder'?'folder':'cards'"/></span>
                <span class="deck-row-main"><strong>{{item.name}}</strong><small>{{item.kind==='folder'?'文件夹 · 点击查看卡片集':'错题、问答与直接记忆'}}</small></span>
                <span v-if="item.kind==='deck'" class="deck-row-meta"><span>{{item.cardCount}} 张</span><strong>{{item.knowledgeCount}} 知识点</strong></span>
                <UiIcon name="chevron" :size="15"/>
              </button
              ><button
                class="icon-button"
                aria-label="管理目录项"
                :aria-description="item.name"
                :title="'管理 ' + item.name"
                @click="catalogEdit = { kind: item.kind, item }"
              >
                <UiIcon name="detail" />
              </button>
            </article>
            <div v-if="!catalogItems.length && !busy" class="empty-state"><strong>为下一次学习，建立一个卡片集</strong>可以混合管理单选错题、问答记忆和直接记忆。<div class="heading-actions" style="justify-content:center;margin-top:14px"><button @click="catalogEdit={kind:'deck'}">创建第一个卡片集</button><button @click="importing=true">导入已有内容</button></div></div>
          </section>
          <button
            v-if="catalog?.nextCursor"
            :disabled="busy"
            @click="loadCatalog(folder, true)"
          >
            更多卡片集
          </button>          </Home>
          <Exchange v-if="importing" ref="exchange" importing :parent-id="folder" @close="importing=false" @imported="loadCatalog(folder);homeView?.load()"/>
        </template>
        <template v-else-if="deck && page === 'cards'"
          ><div class="r3-cards"><div class="page-heading"><div><h1>所有卡片</h1><p>{{deck.name}} · 查看、编辑与管理本集卡片。</p></div><div class="heading-actions"><button class="button" @click="restoreDrafts()"><UiIcon name="cards" :size="15"/>草稿箱</button><button class="button" @click="importing=true"><UiIcon name="upload" :size="15"/>批量导入</button><button class="button primary" @click="create('question')"><UiIcon name="add" :size="15"/>新建卡片</button></div></div>
          <section class="surface padded card-collection-panel">
          <form class="list-tools" @submit.prevent="loadCards()">
            <label class="search-field"><UiIcon name="searchField" :size="16"/>
            <input
              :disabled="busy"
              v-model="query"
              aria-label="搜索卡片标题"
              placeholder="搜索卡片标题"
            /></label><select
              :disabled="busy"
              v-model="mode"
              class="select" aria-label="卡片模式"
              @change="loadCards()"
            >
              <option value="all">全部类型</option>
              <option value="question">单选错题</option>
              <option value="qa">问答记忆</option>
              <option value="direct">直接记忆</option></select
            ><button class="button" :disabled="busy">搜索</button><select class="select" aria-label="已加载卡片排序" v-model="listSort"><option value="default">默认顺序</option><option value="title">已加载：标题</option><option value="reviews">已加载：复盘次数</option></select><button class="button" type="button" @click="switchPage('planner')"><UiIcon name="search" :size="15"/>高级筛选</button>
          </form>
          <nav v-if="drafts.length" class="draft-preview-list" aria-label="已保存草稿">
            <button
              v-for="d in drafts"
              :key="d.cardId"
              @click="viewCard(d.cardId, true)"
            >
              {{ d.title || "未命名草稿" }}</button
            ><button
              v-if="draftCursor"
              :disabled="busy"
              @click="restoreDrafts(true)"
            >
              更多草稿
            </button>
          </nav>
          <nav
            v-if="sessionCursor || sessions.some((s) => !s.completed)"
            aria-label="恢复复盘页面"
          >
            <button
              v-for="s in sessions.filter((s) => !s.completed)"
              :key="s.sessionId"
              :title="s.title"
              @click="resume(s.sessionId)"
            >
              继续 {{ s.title.slice(0, 16) }} · {{ s.index + 1 }}/{{
                s.total
              }}</button
            ><button
              v-if="sessionCursor"
              :disabled="busy"
              @click="loadSessions(true)"
            >
              更多复盘页面
            </button>
          </nav>
          <CardBatch
            ref="batch"
            :deck-id="deck.id"
            :cards="selectedRows"
            @changed="batchSaved"
            @clear="selection = []"
          ><template #study="{blocked}"><button v-if="selection.length" class="button small primary" :disabled="busy||blocked" @click="study(selection)"><UiIcon name="play" :size="15"/>学习选中卡片</button></template></CardBatch>
          <div class="table-wrap"><table class="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="全选已加载卡片" :checked="rows.length>0&&rows.every(r=>selection.includes(r.cardId))" :disabled="!rows.length" @change="selection=($event.target as HTMLInputElement).checked?rows.map(r=>r.cardId):[]"/></th>
                <th>卡片</th>
                <th>类型</th>
                <th>复盘次数</th><th>最近得分</th><th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in displayedRows" :key="r.cardId" :data-card-id="r.cardId" :class="{'is-row-selected':selection.includes(r.cardId)}">
                <td>
                  <input
                    type="checkbox"
                    :value="r.cardId"
                    v-model="selection"
                    :aria-label="'选择 ' + (r.title || '未命名卡片')"
                  />
                </td>
                <td>
                  <button class="card-title-link" @click="viewCard(r.cardId)">
                    {{ r.title || "未命名卡片" }}
                  </button><div class="tiny-label">{{r.knowledgeNames?.join(' · ')||'尚未关联知识点'}}{{r.knowledgeCount>(r.knowledgeNames?.length??0)?' · +'+(r.knowledgeCount-(r.knowledgeNames?.length??0)):''}}</div>
                </td>
                <td><span class="mode-label"><span class="dot"/>{{ labels[r.publishedType] }}</span></td>
                <td>{{r.reviewCount??0}} 次</td><td>{{r.lastScoreTenths==null?'未记录':(r.lastScoreTenths/10).toFixed(1)+' / 10'}}</td>
                <td><span class="pill" :class="{due:!r.paused&&(!r.dueAt||Date.parse(r.dueAt)<=Date.now()),good:!r.paused&&!!r.dueAt&&Date.parse(r.dueAt)>Date.now()}" :title="r.dueAt?'到期：'+new Date(r.dueAt).toLocaleString('zh-CN'):undefined">{{r.paused?'已暂停':!r.dueAt||Date.parse(r.dueAt)<=Date.now()?'待复盘':'已学习'}}</span>
                </td>
                <td><div class="row-actions"><button class="text-button" :aria-label="'详情 '+r.title" @click="viewCard(r.cardId)">详情</button>
                  <button class="text-button"
                    title="编辑卡片"
                    :aria-label="'编辑 ' + r.title"
                    @click="viewCard(r.cardId, true)"
                  >
                    编辑
                  </button></div>
                </td>
              </tr>
            </tbody>
          </table></div>
          <p v-if="busy" role="status" data-testid="card-list-loading">正在读取卡片…</p><button v-if="error" class="button" @click="loadCards()">重新读取卡片</button><p v-if="!rows.length && !busy" class="empty-state">
            没有匹配的卡片，可调整筛选或新建卡片。
          </p>
          <button class="button" v-if="cursor" :disabled="busy" @click="loadCards(true)">
            更多卡片
          </button><div class="list-bottom-note"><span>已加载 {{rows.length}} 张 · 勾选后可批量操作</span><span>{{cursor?'还有更多卡片':'已显示全部'}} · 按需分页</span></div>
          </section></div><Exchange v-if="importing" ref="exchange" importing :deck-id="deck.id" @close="importing=false" @imported="loadCards()"/>
        </template>
        <MediaLibrary v-else-if="deck&&page==='media'" ref="mediaView" :key="deck.id" :deck-id="deck.id"/>
        <DeckOverview v-else-if="deck&&page==='overview'" :key="deck.id" :deck-id="deck.id" :deck-name="deck.name" :deck-path="deckPath.join(' / ')" @navigate="navigateDeck" @study="study()" @resume="resume" @create="create('question')" @view="id=>viewCard(id)"/>
        <template v-else-if="deck&&page==='exchange'">
          <div class="page-heading"><div><h1>导入导出</h1><p>{{deck.name}} · 内容交换与完整备份分开管理。</p></div></div>
          <div class="analytics-layout"><section class="surface padded"><div class="section-heading"><h2>导入卡片内容</h2></div><p class="tiny-meta">预览内容包后创建独立卡片集，保留当前内容。</p><button class="primary margin-top" @click="importing=true">选择内容包并预览</button></section><section class="surface padded"><div class="section-heading"><h2>导出卡片内容</h2></div><p class="tiny-meta">在卡片列表勾选要导出的内容。批量导出将保留知识点关系。</p><button class="margin-top" @click="cards">选择卡片并导出</button><button class="margin-top" @click="openSystem">完整备份与恢复</button></section></div>
          <Exchange v-if="importing" ref="exchange" importing :parent-id="folder" @close="importing=false" @imported="loadCatalog(folder)"/>
        </template>
        <Analytics
          v-else-if="deck && page === 'analysis'"
          :key="deck.id + page"
          :deck-id="deck.id"
          :overview="false"
          @view="(id, eventId) => viewCard(id, false, eventId)"
        />
        <CardDetail
          v-else-if="deck && page === 'detail'"
          ref="detail"
          :key="cardId"
          :deck-id="deck.id"
          :card-id="cardId"
          :initial-event-id="selectedEvent"
          :deck-name="deck.name"
          :back-label="detailReturn==='planner'?'返回筛选':'返回列表'"
          @back="detailReturn==='planner'?switchPage('planner'):cards()"
          @knowledge="switchPage('knowledge')"
          @edit="viewCard(cardId, true)"
          @study="study([cardId])"
          @schedule="switchPage('card-policy')"
        />
        <CardEditor
          v-else-if="deck && page === 'edit'"
          :key="cardId"
          ref="editor"
          :deck-id="deck.id"
          :deck-name="deck.name"
          :card-id="cardId"
          @schedule="switchPage('card-policy')" @published="published" @back="cards" @drafts="async()=>{await cards();if(page==='cards')await restoreDrafts();}"
        />
        <template v-else-if="deck && page === 'review' && review"
          ><div class="page-heading"><div><h1>学习与复盘</h1><p>{{deck.name}} · 三种卡片使用同一复盘工作台。</p></div><div class="heading-actions"><button class="button" @click="cards">返回卡片列表</button></div></div><nav v-if="sessions.filter(s=>!s.completed).length>1" class="review-tabs" aria-label="复盘页标签">
            <button
              v-for="s in sessions.filter(s=>!s.completed)"
              :key="s.sessionId"
              :title="s.title + ' · ' + (s.index + 1) + '/' + s.total"
              :aria-current="s.sessionId === activeSession ? 'page' : undefined"
              @click="resume(s.sessionId)"
            >
              {{ s.title.slice(0, 12) }} · {{ s.index + 1 }}/{{
                s.total
              }}</button
            ><button
              v-if="sessionCursor"
              :disabled="busy"
              @click="loadSessions(true)"
            >
              更多复盘页面
            </button>
          </nav>
          <ReviewForm
            :key="review.sessionId"
            ref="reviewForm"
            :initial="review"
            :api="unifiedLearning"
        /></template>
        <StudyPlanner
          v-else-if="deck && page === 'planner'"
          :key="deck.id"
          :deck-id="deck.id"
          :initial="plannerStates.get(deck.id)"
          @remember="state=>plannerStates.set(deck!.id,state)"
          @back="cards" @view="id=>viewCard(id)"
          @study="study"
        />
        <ScheduleSettings
          v-else-if="deck && (page === 'settings' || page === 'card-policy')"
          :key="deck.id + page + cardId"
          ref="settings"
          :deck-id="deck.id"
          :card-id="page === 'card-policy' ? cardId : undefined"
        />
        <MindWorkspace
          v-else-if="deck && page === 'knowledge'"
          :key="deck.id"
          ref="map"
          :unified-deck-id="deck.id"
          :unified-deck-name="deck.name"
          expanded
          @filter="filterKnowledge"
          @navigate="cards"
        />
      </div></main>
      <CatalogEditor
        v-if="catalogEdit"
        ref="catalogEditor"
        :key="catalogEdit.kind + (catalogEdit.item?.id ?? 'new')"
        :kind="catalogEdit.kind"
        :item="catalogEdit.item"
        :parent-id="catalogEdit.item?.parentId ?? folder"
        @saved="catalogSaved"
        @cancel="catalogEdit = null"
      />
    </div>
  </div>
</template>
