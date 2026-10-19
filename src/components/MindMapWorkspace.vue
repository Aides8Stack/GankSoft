<script setup lang="ts">
import {
  ref,
  computed,
  nextTick,
  onMounted,
  onBeforeUnmount,
  watch,
} from "vue";
import { bindMindMapPan } from "../composables/mindMapPan";
import { effectiveTheme } from "../composables/preferences";
import { gankMapTheme } from "../composables/mindMapTheme";
import { mapPersistence } from "../composables/mapPersistence";
import { services } from "../services";
import {
  state,
  moduleFilter,
  deckName,
  liveKnowledge,
  liveQuestions,
  liveMemories,
  selectedKnowledgeId,
  error,
  working,
  cardFilterPreset,
  unsavedMap,
  refresh,
} from "../store";
import { nextKnowledgeName } from "../../shared/knowledge-names";
import KnowledgeOutline from "./KnowledgeOutline.vue";
import UiIcon from "./UiIcon.vue";
import KnowledgeEditor from "./KnowledgeEditor.vue";
const view = ref<"map" | "outline">("map"),
  outlineTree = ref<any>(null);
function syncOutline() {
  if (mind) outlineTree.value = structuredClone(mind.getData().nodeData);
}
async function toggleView() {
  view.value = view.value === "map" ? "outline" : "map";
  syncOutline();
  await nextTick();
}
function outlineSelect(id: string, open = false) {
  selectedKnowledgeId.value = id;
  if (open && id !== "gank-root") detailOpen.value = true;
}
const props = defineProps<{ expanded?: boolean }>();
const emit = defineEmits<{ navigate: [page: string, id?: string] }>();
// Capture scope once: a later navigation must never save this draft into another deck.
const deckId = moduleFilter.value;
const canvas = ref<HTMLDivElement>(),
  workspace = ref<HTMLElement>(),
  toolbar = ref<HTMLElement>();
const saveFailed = ref(false);
const dirty = ref(false),
  saving = ref(false),
  editing = ref(false),
  query = ref("");
const detailOpen = ref(false),
  popup = ref(""),
  savedAt = ref("");
const detailWidth = ref(
  Number(localStorage.getItem("gank-map-detail-width")) || 300,
);
const nodes = computed(() =>
  liveKnowledge.value.filter((k) => k.module === deckId),
);
const selected = computed(() =>
  nodes.value.find((k) => k.id === selectedKnowledgeId.value),
);
const linked = computed(() =>
  [...liveQuestions.value, ...liveMemories.value].filter(
    (c) =>
      c.module === deckId &&
      c.knowledge_ids.includes(selectedKnowledgeId.value),
  ),
);
const aliases = new Map<string, string>();
function canonical(id: string): string {
  return aliases.has(id) ? canonical(aliases.get(id)!) : id;
}
watch(effectiveTheme, () => {
  if (mind) mind.changeTheme(gankMapTheme(mind.theme));
});
let mind: any,
  disposed = false,
  expected: Record<string, number> = {};
let releasePan: (() => void) | undefined, resize: ResizeObserver | undefined;
let timer: ReturnType<typeof setInterval>,
  inFlight: Promise<boolean> | undefined;
let releaseResize: (() => void) | undefined;
watch(dirty, (value) => {
  unsavedMap.value = value;
});
watch(
  () => props.expanded,
  async () => {
    popup.value = "";
    await nextTick();
    mind?.scaleFit();
  },
);
function data() {
  expected = Object.fromEntries(nodes.value.map((k) => [k.id, k.version]));
  function branch(parent: string | null): any[] {
    return nodes.value
      .filter((k) => k.parent_id === parent)
      .map((k) => ({
        id: k.id,
        topic: k.name,
        expanded: true,
        children: branch(k.id),
      }));
  }
  return {
    nodeData: {
      id: "gank-root",
      topic: deckName(deckId),
      root: true,
      children: branch(null),
    },
  };
}
async function init() {
  const [{ default: MindElixir }, { zh_CN }] = await Promise.all([
    import("mind-elixir"),
    import("mind-elixir/i18n"),
  ]);
  if (disposed || !canvas.value) return;
  mind = new MindElixir({
    el: canvas.value,
    direction: ([0, 1, 2].includes(
      Number(localStorage.getItem("gank-map-layout:" + deckId)),
    ) && localStorage.getItem("gank-map-layout:" + deckId) !== null
      ? Number(localStorage.getItem("gank-map-layout:" + deckId))
      : MindElixir.SIDE) as 0 | 1 | 2,
    editable: true,
    // Do not inherit the OS dark preference into an otherwise light application.
    theme: gankMapTheme(MindElixir.THEME),
    before: {
      beginEdit: (el) => {
        if (el && nodes.value.some((k) => k.id === el.nodeObj.id)) {
          selectedKnowledgeId.value = el.nodeObj.id;
          detailOpen.value = true;
          return false;
        }
        return true;
      },
    },
    contextMenu: { locale: zh_CN, link: false, focus: false },
    toolBar: false,
    keypress: true,
    newTopicName: "新知识点",
  });
  const generate = mind.generateNewObj.bind(mind);
  const fresh = (parent: any) => ({
    ...generate(),
    topic: nextKnowledgeName((parent?.children ?? []).map((n: any) => n.topic)),
  });
  // Pass a named node into each operation; do not share mutable naming context
  // across MindElixir's asynchronous before hooks.
  const addChild = mind.addChild.bind(mind),
    insertSibling = mind.insertSibling.bind(mind),
    insertParent = mind.insertParent.bind(mind);
  mind.addChild = async (el: any, node: any) => {
    const target = el ?? mind.currentNode;
    if (!target) return;
    const next = node ?? fresh(target.nodeObj);
    await addChild(target, next);
    if (!node) mind.editTopic(mind.findEle(next.id));
  };
  mind.insertSibling = async (position: any, el: any, node: any) => {
    const target = el ?? mind.currentNode;
    if (!target) return;
    if (!target.nodeObj.parent) return mind.addChild(target, node);
    const next = node ?? fresh(target.nodeObj.parent);
    await insertSibling(position, target, next);
    if (!node) mind.editTopic(mind.findEle(next.id));
  };
  mind.insertParent = async (el: any, node: any) => {
    const target = el ?? mind.currentNode;
    if (!target?.nodeObj.parent) return;
    const next = node ?? fresh(target.nodeObj.parent);
    await insertParent(target, next);
    if (!node) mind.editTopic(mind.findEle(next.id));
  };
  await mind.init(data());
  if (disposed) return;
  mind.scaleFit();
  releasePan = bindMindMapPan(canvas.value, (dx, dy) => mind.move(dx, dy));
  let lastSize = {
    width: canvas.value.clientWidth,
    height: canvas.value.clientHeight,
  };
  resize = new ResizeObserver(() => {
    const width = canvas.value?.clientWidth || 0,
      height = canvas.value?.clientHeight || 0;
    if (
      width &&
      height &&
      (width !== lastSize.width || height !== lastSize.height)
    ) {
      lastSize = { width, height };
      mind.scaleFit();
    }
  });
  resize.observe(canvas.value);
  mind.bus.addListener("changeDirection", (direction: number) =>
    localStorage.setItem("gank-map-layout:" + deckId, String(direction)),
  );
  mind.bus.addListener("operation", (op: any) => {
    if (op.name !== "beginEdit") {
      dirty.value = true;
      syncOutline();
    }
  });
  mind.bus.addListener("selectNodes", (items: any[]) => {
    selectedKnowledgeId.value = items[0]?.id ?? "";
  });
}
function closePopups(event: Event) {
  if (
    !(event.target instanceof Element) ||
    !event.target.closest(".map-popover, [data-popup]")
  )
    popup.value = "";
}
function doubleClick(event: MouseEvent) {
  const target = (event.target as HTMLElement).closest<HTMLElement>(".me-tpc");
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  const id = (target as any).nodeObj?.id;
  if (id && id !== "gank-root") {
    selectedKnowledgeId.value = id;
    detailOpen.value = true;
  }
}
function key(event: KeyboardEvent) {
  if (
    (event.ctrlKey || event.metaKey) &&
    ["z", "y"].includes(event.key.toLowerCase()) &&
    canvas.value?.contains(event.target as Node) &&
    !(event.target as Element).closest("[contenteditable], input, textarea")
  ) {
    event.preventDefault();
    event.stopPropagation();
    history(
      event.key.toLowerCase() === "y" || event.shiftKey ? "redo" : "undo",
    );
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    void save();
  }
  if (event.key === "Escape") {
    popup.value = "";
    if (
      props.expanded &&
      !editing.value &&
      !(event.target as Element).closest(
        "input, textarea, [contenteditable], .context-menu",
      )
    )
      emit("navigate", "knowledge");
  }
}
function treeRows() {
  const rows: { id: string; name: string; parent_id: string | null }[] = [];
  function walk(n: any, parent: string | null) {
    if (n.id !== "gank-root")
      rows.push({
        id: canonical(n.id),
        name: n.topic,
        parent_id: parent ? canonical(parent) : null,
      });
    for (const c of n.children ?? [])
      walk(c, n.id === "gank-root" ? null : n.id);
  }
  walk(mind.getData().nodeData, null);
  return rows;
}
async function persist(): Promise<boolean> {
  if (!dirty.value) return true;
  if (!mind || working.value || editing.value) return false;
  saving.value = true;
  mind.editable = false;
  if (canvas.value) canvas.value.inert = true;
  try {
    const rows = treeRows(),
      prior = selectedKnowledgeId.value;
    const priorId = canonical(prior);
    await services.knowledge.mapSave({
      module: deckId,
      nodes: rows,
      expected: { ...expected },
    });
    await refresh();
    // mapSave assigns durable IDs to new nodes; refresh before allowing another edit.
    const mapped = new Map<string, string>();
    function durable(id: string): string {
      if (mapped.has(id)) return mapped.get(id)!;
      const row = rows.find((n) => n.id === id);
      if (!row) return id;
      const parent = row.parent_id ? durable(row.parent_id) : null;
      const match = nodes.value.find(
        (n) => n.parent_id === parent && n.name === row.name,
      );
      const value = match?.id ?? id;
      mapped.set(id, value);
      if (value !== id) aliases.set(id, value);
      return value;
    }
    for (const row of rows) durable(row.id);
    mind.refresh(data());
    syncOutline();
    selectedKnowledgeId.value = canonical(priorId);
    dirty.value = false;
    saveFailed.value = false;
    savedAt.value = new Date().toLocaleTimeString("zh-CN");
    return true;
  } catch (e) {
    saveFailed.value = true;
    error.value =
      "图谱保存失败，修改仍保留，请先解决后重试：" +
      (e instanceof Error ? e.message : String(e));
    return false;
  } finally {
    mind.editable = true;
    if (canvas.value) canvas.value.inert = false;
    saving.value = false;
  }
}
async function save(): Promise<boolean> {
  const input = canvas.value?.querySelector<HTMLElement>("#input-box");
  input?.blur(); // commit the active node name before taking a snapshot
  if (inFlight) return inFlight;
  inFlight = persist();
  try {
    return await inFlight;
  } finally {
    inFlight = undefined;
  }
}
async function reloadSaved() {
  if (
    saving.value ||
    !confirm("重新载入已保存的图谱？当前未保存的图谱修改将被放弃。")
  )
    return;
  try {
    await refresh();
    mind.refresh(data());
    mind.clearHistory();
    aliases.clear();
    dirty.value = false;
    saveFailed.value = false;
    error.value = "";
  } catch (e) {
    error.value = "重新载入失败，原稿保留：" + String(e);
  }
}
function history(action: "undo" | "redo") {
  if (!mind || saving.value) return;
  const before = JSON.stringify(mind.getData().nodeData);
  mind[action]();
  if (JSON.stringify(mind.getData().nodeData) !== before) dirty.value = true;
}
function locate() {
  const node = nodes.value.find(
    (k) => query.value.trim() && k.name.includes(query.value.trim()),
  );
  if (node) {
    selectedKnowledgeId.value = node.id;
    const el = canvas.value?.querySelector(
      '[data-nodeid="' + CSS.escape("me" + node.id) + '"]',
    );
    if (el) {
      mind.selectNode(el);
      mind.scrollIntoView(el, true);
    }
  }
  popup.value = "";
}
function direction(value: number) {
  [() => mind?.initLeft(), () => mind?.initRight(), () => mind?.initSide()][
    value
  ]?.();
  popup.value = "";
}
function study() {
  cardFilterPreset.value = "knowledge:" + selectedKnowledgeId.value;
  emit("navigate", "cards");
}
async function editDetails() {
  if (await save()) editing.value = true;
}
function edited() {
  editing.value = false;
  mind?.refresh(data());
}
function startResize(event: PointerEvent) {
  releaseResize?.();
  const initial =
      workspace.value?.querySelector<HTMLElement>(".mind-detail")
        ?.offsetWidth || detailWidth.value,
    start = event.clientX;
  const move = (e: PointerEvent) => {
    const available = (workspace.value?.clientWidth ?? 900) * 0.45;
    detailWidth.value = Math.max(
      240,
      Math.min(480, available, initial + start - e.clientX),
    );
  };
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    window.removeEventListener("blur", stop);
    localStorage.setItem("gank-map-detail-width", String(detailWidth.value));
    releaseResize = undefined;
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
  window.addEventListener("blur", stop);
  releaseResize = stop;
}
function resizeKey(event: KeyboardEvent) {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  detailWidth.value = Math.max(
    240,
    Math.min(480, detailWidth.value + (event.key === "ArrowLeft" ? 20 : -20)),
  );
  localStorage.setItem("gank-map-detail-width", String(detailWidth.value));
}
let closing = false;
function beforeUnload(event: BeforeUnloadEvent) {
  canvas.value?.querySelector<HTMLElement>("#input-box")?.blur();
  if (closing || (!dirty.value && !saving.value)) return;
  event.preventDefault();
  event.returnValue = "";
  void save().then((ok) => {
    if (ok) {
      closing = true;
      window.close();
    }
  });
}
onMounted(() => {
  mapPersistence.flush = save;
  document.addEventListener("pointerdown", closePopups, true);
  window.addEventListener("keydown", key, true);
  window.addEventListener("beforeunload", beforeUnload);
  timer = setInterval(() => {
    // Do not steal focus or save half a composition during continuous typing.
    if (!canvas.value?.querySelector("#input-box")) void save();
  }, 5000);
  void init().catch((e) => {
    error.value = "图谱初始化失败：" + e.message;
  });
});
onBeforeUnmount(() => {
  disposed = true;
  if (mapPersistence.flush === save) delete mapPersistence.flush;
  clearInterval(timer);
  releaseResize?.();
  releasePan?.();
  resize?.disconnect();
  mind?.destroy();
  unsavedMap.value = false;
  document.removeEventListener("pointerdown", closePopups, true);
  window.removeEventListener("keydown", key, true);
  window.removeEventListener("beforeunload", beforeUnload);
});
</script>
<template>
  <section
    ref="workspace"
    class="mind-workspace"
    :class="{ 'mind-expanded': expanded }"
    aria-label="知识图谱工作区"
  >
    <div class="page-heading">
      <div>
        <div class="eyebrow">KNOWLEDGE MIND MAP</div>
        <h1>{{ expanded ? "思维导图工作台" : "知识图谱" }}</h1>
        <p>
          拖动画布或节点；双击知识点打开知识栏。每 5 秒自动保存，支持 Ctrl+S。
        </p>
      </div>
      <div class="inline-actions">
        <button
          v-if="expanded"
          class="btn mind-return"
          @click="emit('navigate', 'knowledge')"
        >
          返回知识图谱
        </button>
      </div>
    </div>
    <div v-if="saveFailed" class="info-box mind-save-recovery" role="status">
      保存未完成，当前修改仍保留。<button class="btn" @click="save">
        重新保存</button
      ><button class="btn" @click="reloadSaved">重新载入已保存图谱</button>
    </div>
    <div
      class="mind-layout"
      :class="{ 'has-detail': selected && detailOpen }"
      :style="{ '--detail-width': detailWidth + 'px' }"
    >
      <div class="mind-canvas-area">
        <div
          ref="canvas"
          class="mind-canvas"
          :class="{ 'canvas-hidden': view === 'outline' }"
          @dblclick.capture="doubleClick"
        ></div>
        <div
          v-if="view === 'outline' && outlineTree"
          class="outline-view"
          aria-label="知识点大纲"
        >
          <ul>
            <KnowledgeOutline
              :node="outlineTree"
              :selected="selectedKnowledgeId"
              @select="outlineSelect($event)"
              @open="outlineSelect($event, true)"
            />
          </ul>
        </div>
        <div
          ref="toolbar"
          class="mind-tools"
          role="toolbar"
          aria-label="导图工具栏"
          @keydown.esc="popup = ''"
        >
          <button
            class="map-tool"
            data-popup
            title="搜索知识点"
            aria-label="搜索知识点"
            :aria-expanded="popup === 'search'"
            @click="popup = popup === 'search' ? '' : 'search'"
          >
            <UiIcon name="search" />
          </button>
          <div v-if="popup === 'search'" class="map-popover map-search">
            <input
              v-model="query"
              autofocus
              placeholder="搜索知识点"
              aria-label="搜索知识点名称"
              @keydown.enter="locate"
            /><button
              class="map-tool"
              aria-label="定位"
              title="定位"
              @click="locate"
            >
              ↵
            </button>
          </div>
          <button
            class="map-tool"
            data-popup
            title="导图结构"
            aria-label="导图结构"
            :aria-expanded="popup === 'layout'"
            @click="popup = popup === 'layout' ? '' : 'layout'"
          >
            <UiIcon name="layout" />
          </button>
          <div v-if="popup === 'layout'" class="map-popover map-structures">
            <button @click="direction(0)">向左展开</button
            ><button @click="direction(1)">向右展开</button
            ><button @click="direction(2)">左右展开</button>
          </div>
          <button
            class="map-tool"
            title="适应窗口"
            aria-label="适应窗口"
            @click="mind?.scaleFit()"
          >
            <UiIcon name="fit" />
          </button>
          <button
            class="map-tool"
            title="回到中心"
            aria-label="回到中心"
            @click="mind?.toCenter()"
          >
            <UiIcon name="center" />
          </button>
          <span class="tool-separator"></span>
          <button
            class="map-tool"
            title="新增下级"
            aria-label="新增下级"
            :disabled="saving"
            @click="mind?.addChild()"
          >
            <UiIcon name="add" />
          </button>
          <button
            class="map-tool"
            title="撤销"
            aria-label="撤销"
            :disabled="saving"
            @click="history('undo')"
          >
            <UiIcon name="undo" />
          </button>
          <button
            class="map-tool"
            title="重做"
            aria-label="重做"
            :disabled="saving"
            @click="history('redo')"
          >
            <UiIcon name="redo" />
          </button>
          <button
            class="map-tool"
            :title="selected && detailOpen ? '收起知识栏' : '打开知识栏'"
            :aria-label="selected && detailOpen ? '收起知识栏' : '打开知识栏'"
            :disabled="!selected"
            @click="detailOpen = !detailOpen"
          >
            <UiIcon name="detail" />
          </button>
          <button
            class="map-tool"
            :aria-label="expanded ? '返回知识图谱' : '展开思维导图工作台'"
            :title="expanded ? '返回知识图谱' : '展开导图'"
            @click="
              emit('navigate', expanded ? 'knowledge' : 'knowledge-expanded')
            "
          >
            ⛶
          </button>
          <button
            class="map-tool"
            :title="dirty ? '保存图谱修改 · Ctrl+S' : '图谱已保存'"
            :aria-label="dirty ? '保存图谱修改' : '图谱已保存'"
            :disabled="saving || !dirty"
            @click="save"
          >
            <UiIcon name="save" />
          </button>
        </div>
        <div class="mind-bottom-tools">
          <button
            class="btn"
            :aria-pressed="view === 'outline'"
            @click="toggleView"
          >
            {{ view === "map" ? "切换大纲模式" : "切换思维导图" }}
          </button>
        </div>
        <div class="mind-save-status" role="status">
          {{
            saving
              ? "正在保存…"
              : dirty
                ? "有修改，等待保存"
                : savedAt
                  ? "已保存 · " + savedAt
                  : "图谱已保存"
          }}
        </div>
      </div>
      <template v-if="selected && detailOpen">
        <div
          class="mind-detail-resizer"
          role="separator"
          aria-label="调整知识栏宽度"
          aria-orientation="vertical"
          :aria-valuenow="detailWidth"
          :aria-valuemin="240"
          :aria-valuemax="480"
          tabindex="0"
          @pointerdown.prevent="startResize"
          @keydown="resizeKey"
        ></div>
        <section class="panel mind-detail" aria-label="知识点细节栏">
          <div class="section-head">
            <span class="eyebrow">知识点</span
            ><button
              class="text-btn mind-close-detail"
              @click="detailOpen = false"
              aria-label="关闭知识栏"
            >
              ×
            </button>
          </div>
          <h2>{{ selected.name }}</h2>
          <p class="muted">关联 {{ linked.length }} 张卡片</p>
          <div class="inline-actions">
            <button class="btn" :disabled="saving" @click="editDetails">
              编辑知识点详情</button
            ><button class="btn primary" :disabled="saving" @click="study">
              筛选此知识点的卡片
            </button>
          </div>
          <h4>原理</h4>
          <p>{{ selected.principle || "待补充" }}</p>
          <h4>方法与条件</h4>
          <p>
            {{ selected.method || "待补充" }}<br />{{ selected.conditions }}
          </p>
          <h4>易错点</h4>
          <p>{{ selected.traps || "待补充" }}</p>
          <h4>关联卡片</h4>
          <button
            v-for="c in linked"
            :key="c.id"
            class="list-row"
            @click="emit('navigate', 'stem' in c ? 'project' : 'memory', c.id)"
          >
            {{ c.title }} →
          </button>
          <p v-if="!linked.length" class="muted">暂无关联卡片</p>
        </section>
      </template>
    </div>
  </section>
  <KnowledgeEditor
    v-if="editing && selected"
    :node="selected"
    @close="editing = false"
    @saved="edited"
  />
</template>
<style>
@import "mind-elixir/style.css";
</style>
