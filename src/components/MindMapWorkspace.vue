<script setup lang="ts">
import {
  ref,
  shallowRef,
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
import { services, unifiedKnowledge } from "../services";
import type { Output, Input } from "../../shared/protocol/registry";
import KnowledgeMarkdownPanel from "./KnowledgeMarkdownPanel.vue";
import KnowledgeMarkdownExchange from "./KnowledgeMarkdownExchange.vue";
import KnowledgeTreeActions from "./KnowledgeTreeActions.vue";
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
  if(nativeMode&&!(await save()))return;
  if(nativeMode&&(!selected.value||selectedKnowledgeId.value==='gank-root'))selectedKnowledgeId.value=nodes.value[0]?.id??'';
  view.value = view.value === "map" ? "outline" : "map";
  syncOutline();
  await nextTick();
}
function outlineSelect(id: string, open = false) {
  void selectNode(id);
  if (open && id !== "gank-root") detailOpen.value = true;
}
const props = defineProps<{ expanded?: boolean; unifiedDeckId?: string }>();
const emit = defineEmits<{ navigate: [page: string, id?: string] }>();
// Capture scope once: a later navigation must never save this draft into another deck.
const deckId = props.unifiedDeckId ?? moduleFilter.value;
const nativeTree = shallowRef<Output<'knowledge.tree.read'>>(),nativeBody=shallowRef<InstanceType<typeof KnowledgeMarkdownPanel>>();
const nativeMode=!!props.unifiedDeckId;
const nativeExchange=shallowRef<InstanceType<typeof KnowledgeMarkdownExchange>>();
const nativeActions=shallowRef<InstanceType<typeof KnowledgeTreeActions>>();
async function operationChanged(){await refreshKnowledge();mind.refresh(data());mind.clearHistory();dirty.value=false;detailOpen.value=false;selectedKnowledgeId.value='';syncOutline();}
const pendingTree=shallowRef<{requestId:string;payload:Input<'knowledge.tree.apply'>}|null>(null);
async function refreshKnowledge(){if(nativeMode)nativeTree.value=await unifiedKnowledge.tree({deckId});else await refresh();}
async function bodySaved(node:Output<'knowledge.node.save'>){
  if(!nativeTree.value)return;
  const expected=nativeTree.value.nodes.map(n=>n.nodeId===node.nodeId?{...n,revision:node.revision}:n),next=await unifiedKnowledge.tree({deckId});
  if(JSON.stringify(next.nodes)!==JSON.stringify(expected)){
    saveFailed.value=true;error.value='正文已保存；图谱同时发生变化，当前图谱草稿保留，请核对后恢复。';return;
  }
  nativeTree.value=next;
}
async function selectNode(id:string){if(id===selectedKnowledgeId.value)return;if(nativeMode&&nativeBody.value&&!(await nativeBody.value.flush())){error.value='当前正文尚未保存，请先处理后再切换知识点';if(selectedKnowledgeId.value)mind?.selectNode(mind.findEle(selectedKnowledgeId.value));return;}selectedKnowledgeId.value=id;}
async function closeDetails(){if(nativeMode&&nativeBody.value&&!(await nativeBody.value.flush()))return;detailOpen.value=false;}

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
  nativeMode?(nativeTree.value?.nodes??[]).map(n=>({id:n.nodeId,name:n.name,parent_id:n.parentId,module:deckId,version:n.revision,position:n.position,principle:'',method:'',conditions:'',traps:'',aliases:'',created_at:'',updated_at:'',deleted_at:null})):
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
  if(nativeMode)await refreshKnowledge();
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
      addChild:()=>!pendingTree.value,insertSibling:()=>!pendingTree.value,insertParent:()=>!pendingTree.value,
      moveNodesIn:()=>!pendingTree.value,moveNodesBefore:()=>!pendingTree.value,moveNodesAfter:()=>!pendingTree.value,
      removeNodes: async (items) => {
        if(!nativeMode)return true;
        if(items.length!==1||items[0].nodeObj.id==='gank-root'){error.value='请选择一棵知识子树进行回收';return false;}
        if(!(await save())||!nativeTree.value)return false;
        if(!confirm('将选中知识点及全部下级移入回收站？'))return false;
        try{await unifiedKnowledge.deleteSubtree({deckId,nodeId:items[0].nodeObj.id,expectedTreeHash:nativeTree.value.treeHash});await refreshKnowledge();mind.refresh(data());mind.clearHistory();selectedKnowledgeId.value='';}
        catch(e){error.value='子树删除失败，图谱仍保留：'+String(e);}return false;
      },
      beginEdit: (el) => {
        if (el && nodes.value.some((k) => k.id === el.nodeObj.id)) {
          void selectNode(el.nodeObj.id);
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
    void selectNode(items[0]?.id ?? "");
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
    void selectNode(id);
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
    if(nativeMode&&(event.target as Element).closest(".knowledge-markdown"))return;
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
  const rows: { id: string; name: string; parent_id: string | null; position:number }[] = [];
  function walk(n: any, parent: string | null,position=0) {
    if (n.id !== "gank-root")
      rows.push({
        id: canonical(n.id),
        name: n.topic,
        parent_id: parent ? canonical(parent) : null,
        position,
      });
    for (const [index,c] of (n.children ?? []).entries())
      walk(c, n.id === "gank-root" ? null : n.id,index);
  }
  walk(mind.getData().nodeData, null);
  return rows;
}
async function persist(): Promise<boolean> {
  if(nativeMode&&nativeBody.value&&!(await nativeBody.value.flush()))return false;
  if (!dirty.value&&!pendingTree.value) return true;
  if (!mind || working.value || editing.value) return false;
  saving.value = true;
  mind.editable = false;
  if (canvas.value) canvas.value.inert = true;
  try {
    const rows = treeRows(),
      prior = selectedKnowledgeId.value;
    const priorId = canonical(prior);
    if(nativeMode){
      if(!nativeTree.value)throw Error('图谱尚未读取');
      pendingTree.value??={requestId:crypto.randomUUID(),payload:{deckId,expectedTreeHash:nativeTree.value.treeHash,nodes:rows.map(n=>({nodeId:n.id,name:n.name,parentId:n.parent_id,position:n.position}))}};
      try{nativeTree.value=await unifiedKnowledge.applyTree(pendingTree.value.payload,pendingTree.value.requestId);pendingTree.value=null;}
      catch(e){if((e as {definitive?:boolean}).definitive)pendingTree.value=null;throw e;}
    }else await services.knowledge.mapSave({module:deckId,nodes:rows,expected:{...expected}});
    if(!nativeMode)await refreshKnowledge();
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
    if(nativeMode&&selected.value)nativeBody.value?.rebase(selected.value.version);
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
    if (canvas.value) canvas.value.inert = !!pendingTree.value;
    saving.value = false;
  }
}
async function save(): Promise<boolean> {
  if(nativeMode&&nativeExchange.value&&!nativeExchange.value.isClosed())return false;
  if(nativeMode&&nativeActions.value&&!nativeActions.value.close())return false;
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
    if(pendingTree.value){error.value="先核对上一份图谱的保存结果，不能丢弃未知提交";return;}
    if(nativeMode&&nativeBody.value&&!(await nativeBody.value.flush()))return;
    await refreshKnowledge();
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
  if (!mind || saving.value || pendingTree.value) return;
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
async function renameNative(){
  if(!nativeMode||!selected.value||!(await save())||!nativeTree.value)return;
  const name=prompt('知识点名称',selected.value.name)?.trim();if(!name)return;
  try{nativeTree.value=await unifiedKnowledge.applyTree({deckId,expectedTreeHash:nativeTree.value.treeHash,nodes:nativeTree.value.nodes.map(({revision,...n})=>n.nodeId===selected.value?.id?{...n,name}:n)});
    if(selected.value)nativeBody.value?.rebase(selected.value.version);mind.refresh(data());syncOutline();}
  catch(e){error.value='重命名失败，原图谱保留：'+String(e);}
}
async function editDetails() {
  if (await save()) {if(nativeMode)detailOpen.value=true;else editing.value = true;}
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
  const clean=!dirty.value&&!saving.value&&!pendingTree.value&&(!nativeMode||(!nativeBody.value||nativeBody.value.isClean())&&(!nativeActions.value||nativeActions.value.close())&&(!nativeExchange.value||nativeExchange.value.isClosed()));
  if(closing||clean)return;
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
    if (!canvas.value?.querySelector("#input-box") && (!nativeMode || dirty.value&&!saveFailed.value)) void save();
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
defineExpose({save,reloadSaved,mind:()=>mind,nativeTree,dirty,close:save});
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
      :class="{ 'has-detail': selected && detailOpen&&(!nativeMode||view==='map') }"
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
          v-if="view === 'outline' && outlineTree&&!nativeMode"
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
        <section v-if="nativeMode&&view==='outline'" class="native-outline-workbench" aria-label="Markdown 大纲工作台">
          <main class="outline-body">
            <template v-if="selected"><h2>{{selected.name}}</h2><KnowledgeMarkdownPanel :key="selected.id" ref="nativeBody" :deck-id="deckId" :node-id="selected.id" :on-saved="bodySaved"/></template>
            <p v-else>创建或选择知识点后编辑正文。</p>
          </main>
          <nav aria-label="大纲分级目录"><h3>目录</h3><ul><KnowledgeOutline v-for="root in outlineTree?.children" :key="root.id" :node="root" :selected="selectedKnowledgeId" @select="outlineSelect($event)" @open="outlineSelect($event)"/></ul></nav>
        </section>
        <div
          ref="toolbar"
          class="mind-tools"
          role="toolbar"
          aria-label="导图工具栏"
          @keydown.esc="popup = ''"
        >
        <KnowledgeMarkdownExchange v-if="nativeMode" ref="nativeExchange" :deck-id="deckId" :flush="save" :changed="operationChanged"/>
        <KnowledgeTreeActions v-if="nativeMode" ref="nativeActions" :deck-id="deckId" :selected-id="selectedKnowledgeId" :flush="save" :changed="operationChanged"/>

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
          <button v-if="!nativeMode"
            class="map-tool"
            title="新增下级"
            aria-label="新增下级"
            :disabled="saving || !!pendingTree"
            @click="mind?.addChild()"
          >
            <UiIcon name="add" />
          </button>

          <button
            class="map-tool"
            title="撤销"
            aria-label="撤销"
            :disabled="saving || !!pendingTree"
            @click="history('undo')"
          >
            <UiIcon name="undo" />
          </button>
          <button
            class="map-tool"
            title="重做"
            aria-label="重做"
            :disabled="saving || !!pendingTree"
            @click="history('redo')"
          >
            <UiIcon name="redo" />
          </button>
          <button
            class="map-tool"
            :title="selected && detailOpen&&(!nativeMode||view==='map') ? '收起知识栏' : '打开知识栏'"
            :aria-label="selected && detailOpen&&(!nativeMode||view==='map') ? '收起知识栏' : '打开知识栏'"
            :disabled="!selected"
            @click="detailOpen ? closeDetails() : (detailOpen = true)"
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
          <template v-if="nativeMode">
            <button v-if="selected" class="map-tool" title="新增下级" aria-label="新增下级" :disabled="saving||!!pendingTree" @click="mind?.addChild()"><UiIcon name="add"/></button>
            <button v-if="selected" class="map-tool" title="新增同级" aria-label="新增同级" :disabled="saving||!!pendingTree" @click="mind?.insertSibling('after')">↳</button>
            <button class="map-tool" title="新增根节点" aria-label="新增根节点" :disabled="saving||!!pendingTree" @click="mind?.addChild(mind.findEle('gank-root'))">⊕</button>
            <button v-if="selected" class="map-tool" title="同级上移" aria-label="同级上移" :disabled="saving||!!pendingTree" @click="mind?.moveUpNode()">↑</button>
            <button v-if="selected" class="map-tool" title="同级下移" aria-label="同级下移" :disabled="saving||!!pendingTree" @click="mind?.moveDownNode()">↓</button>
            <button class="map-tool" title="全部展开" aria-label="全部展开" @click="mind?.expandNodeAll(mind.findEle('gank-root'),true)">⊞</button>
            <button class="map-tool" title="全部收起" aria-label="全部收起" @click="mind?.expandNodeAll(mind.findEle('gank-root'),false)">⊟</button>
          </template>
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
      <template v-if="selected && detailOpen&&(!nativeMode||view==='map')">
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
              @click="closeDetails"
              aria-label="关闭知识栏"
            >
              ×
            </button>
          </div>
          <h2>{{ selected.name }}</h2>
          <button v-if="nativeMode" class="text-btn" @click="renameNative">重命名</button>
          <p v-if="!nativeMode" class="muted">关联 {{ linked.length }} 张卡片</p>
          <div class="inline-actions">
            <button class="btn" :disabled="saving || !!pendingTree" @click="editDetails">
              编辑知识点详情</button
            ><button class="btn primary" :disabled="saving || !!pendingTree" @click="study">
              筛选此知识点的卡片
            </button>
          </div>
          <KnowledgeMarkdownPanel v-if="nativeMode" :key="selected.id" ref="nativeBody" :deck-id="deckId" :node-id="selected.id" :on-saved="bodySaved"/>
          <template v-else>
          <h4>原理</h4>
          <p>{{ selected.principle || "待补充" }}</p>
          <h4>方法与条件</h4>
          <p>
            {{ selected.method || "待补充" }}<br />{{ selected.conditions }}
          </p>
          <h4>易错点</h4>
          <p>{{ selected.traps || "待补充" }}</p>
          </template>
          <template v-if="!nativeMode">
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
          </template>
        </section>
      </template>
    </div>
  </section>
  <KnowledgeEditor
    v-if="editing && selected && !nativeMode"
    :node="selected"
    @close="editing = false"
    @saved="edited"
  />
</template>
<style>
@import "mind-elixir/style.css";
</style>

<style scoped>
.native-outline-workbench{position:absolute;inset:0 0 64px;display:grid;grid-template-columns:minmax(0,1fr) minmax(200px,260px);gap:20px;background:var(--panel,#fff);padding:18px;overflow:hidden}
.outline-body{min-width:0;overflow:auto;padding:8px 18px}.native-outline-workbench nav{overflow:auto;border-left:1px solid var(--line,#ddd);padding-left:12px}.native-outline-workbench ul{list-style:none;padding-left:18px}.native-outline-workbench nav>ul{padding-left:0}
@media(max-width:720px){.native-outline-workbench{grid-template-columns:minmax(0,1fr) 180px;gap:6px;padding:8px}.outline-body{padding:4px}}
</style>
