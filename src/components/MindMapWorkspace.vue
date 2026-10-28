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
import {knowledgeView} from "../../shared/knowledge-view";
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
import MapIcon from "../unified/v37/PrototypeIcon.vue";
import { bindFixedMapNodes } from "../composables/fixedMapNodes";
import { unifiedLearning } from "../services";
import KnowledgeEditor from "./KnowledgeEditor.vue";
const focusedTool=ref(''),toolbarHeight=ref(76),zoom=ref(1),fullScreen=ref(false);
const structureDialog=ref<HTMLDialogElement>(),structureParent=ref('');
const confirmationDialog=ref<HTMLDialogElement>(),confirmationMessage=ref('');
let resolveConfirmation:((accepted:boolean)=>void)|undefined;
async function confirmMap(message:string){
 if(!nativeMode)return confirm(message);
 if(resolveConfirmation)return false;
 confirmationMessage.value=message;
 return new Promise<boolean>(resolve=>{resolveConfirmation=resolve;confirmationDialog.value?.showModal();});
}
function finishConfirmation(accepted:boolean){confirmationDialog.value?.close();const done=resolveConfirmation;resolveConfirmation=undefined;done?.(accepted);}

const association=shallowRef<{id:string;direct:number;aggregate:number}>();
const associationError=ref('');
const selectedPath=computed(()=>{const path:string[]=[];let node=selected.value;const seen=new Set<string>();while(node&&!seen.has(node.id)){seen.add(node.id);path.unshift(node.name);node=nodes.value.find(n=>n.id===node!.parent_id);}return path.join(' / ');});
const descendants=computed(()=>{const ids=new Set<string>();if(selected.value){ids.add(selected.value.id);let size=-1;while(size!==ids.size){size=ids.size;for(const n of nodes.value)if(n.parent_id&&ids.has(n.parent_id))ids.add(n.id);}}return ids;});
const structureTargets=computed(()=>nodes.value.filter(n=>!descendants.value.has(n.id)));
let associationRequest=0;
function zoomBy(delta:number){mind?.scale(Math.max(.2,Math.min(1.4,zoom.value+delta)));}
async function openStructure(){if(!selected.value||!(await save()))return;structureParent.value=selected.value.parent_id??'';structureDialog.value?.showModal();}
async function applyStructure(){
 if(!selected.value||saving.value||pendingTree.value)return;
 const source=mind.findEle(selected.value.id),target=mind.findEle(structureParent.value||'gank-root');
 if(!source||!target)return;
 await mind.moveNodesIn([source],target);
 if(await save())structureDialog.value?.close();
}
// Public before hooks supply unique business names; no framework methods are replaced.
function prepareNode(el:any,sibling=false){
 if(saving.value||pendingTree.value||layered.value)return false;
 const target=el??mind?.currentNode;if(!target)return false;
 const parent=sibling?target.nodeObj.parent:target.nodeObj;
 if(!parent)return false;
 mind.newTopicName=nextKnowledgeName((parent.children??[]).map((n:any)=>n.topic));return true;
}
// Keep the originating details container visible for its native child dialogs.
// Closing it would hide the child's modal content before the async open finishes.
function closeSecondaryTools(event:MouseEvent){
 const target=event.target as Element;
 if(target.closest('.knowledge-actions,.knowledge-md-actions'))return;
 (event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open');
}
function closeToolMenu(event:KeyboardEvent){
 if(!(event.target as Element).closest('dialog'))(event.currentTarget as HTMLDetailsElement).open=false;
}
function toolFocused(event:FocusEvent){focusedTool.value=(event.target as Element).closest('button')?.getAttribute('aria-label')??'';}
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
function outlineExpand(id:string){if(layered.value)void loadLayer(id);}
function outlineSelect(id: string, open = false) {
  void selectNode(id);
  if (open && id !== "gank-root") detailOpen.value = true;
}
const props = defineProps<{ expanded?: boolean; unifiedDeckId?: string;unifiedDeckName?:string }>();
const emit = defineEmits<{ navigate: [page: string, id?: string]; filter: [nodeId:string] }>();
// Capture scope once: a later navigation must never save this draft into another deck.
const deckId = props.unifiedDeckId ?? moduleFilter.value;
const nativeTree = shallowRef<Output<'knowledge.tree.read'>>(),nativeBody=shallowRef<InstanceType<typeof KnowledgeMarkdownPanel>>();
const nativeMode=!!props.unifiedDeckId;
const nativeExchange=shallowRef<InstanceType<typeof KnowledgeMarkdownExchange>>();
const nativeActions=shallowRef<InstanceType<typeof KnowledgeTreeActions>>();
async function operationChanged(){await refreshKnowledge();mind.refresh(data());mind.clearHistory();dirty.value=false;detailOpen.value=false;selectedKnowledgeId.value='';syncOutline();}
const pendingTree=shallowRef<{requestId:string;payload:Input<'knowledge.tree.apply'>}|null>(null);
const layered=ref(false),layerBusy=ref(false),layerTotal=ref(0),layerError=ref('');
const childCounts=new Map<string,number>(),layerPages=new Map<string|null,number|null>(),expandedNodes=new Map<string,boolean>();
function rememberExpansion(){if(!mind)return;const stack=[mind.getData().nodeData];while(stack.length){const node=stack.pop()!;if(!node.id.startsWith('gank-lazy:'))expandedNodes.set(node.id,node.expanded!==false);stack.push(...(node.children??[]));}}
async function refreshKnowledge(initial=false){
 if(!nativeMode){await refresh();return;}
 if(initial){const page=await unifiedKnowledge.layer({deckId,parentId:null,limit:50});layerTotal.value=page.totalNodes;
  if(page.totalNodes>200){layered.value=true;layerPages.set(null,page.nextOffset);for(const n of page.nodes)childCounts.set(n.nodeId,n.childCount);nativeTree.value={deckId,treeHash:page.treeHash,nodes:page.nodes.map(({childCount,...n})=>n)};return;}}
 nativeTree.value=await unifiedKnowledge.tree({deckId});layered.value=false;layerPages.clear();childCounts.clear();
}
async function loadLayer(parentId:string|null){
 if(!layered.value||layerBusy.value||!nativeTree.value||layerPages.has(parentId)&&layerPages.get(parentId)===null)return;
 layerBusy.value=true;layerError.value='';const hash=nativeTree.value.treeHash;
 try{const page=await unifiedKnowledge.layer({deckId,parentId,expectedTreeHash:hash,offset:layerPages.get(parentId)??0,limit:50});if(disposed)return;
  rememberExpansion();if(parentId)expandedNodes.set(parentId,true);layerPages.set(parentId,page.nextOffset);
  const merged=new Map(nativeTree.value.nodes.map(n=>[n.nodeId,n]));for(const {childCount,...n} of page.nodes){merged.set(n.nodeId,n);childCounts.set(n.nodeId,childCount);}
  nativeTree.value={...nativeTree.value,nodes:[...merged.values()].sort((a,b)=>a.position-b.position)};mind.refresh(data());syncOutline();
 }catch(e){layerError.value=String(e);}finally{layerBusy.value=false;}
}
async function reloadLayers(){if(layerBusy.value)return;layerBusy.value=true;try{expandedNodes.clear();layerPages.clear();childCounts.clear();layerError.value='';await refreshKnowledge(true);selectedKnowledgeId.value='';detailOpen.value=false;mind.refresh(data());if(layered.value)mind.disableEdit();else mind.enableEdit();syncOutline();}catch(e){layerError.value=String(e);}finally{layerBusy.value=false;}}
async function loadComplete(){
 if(!layered.value||layerBusy.value)return;layerBusy.value=true;layerError.value='';
 try{rememberExpansion();await refreshKnowledge();if(disposed)return;mind.refresh(data());mind.enableEdit();mind.clearHistory();syncOutline();}
 catch(e){layerError.value=String(e);}finally{layerBusy.value=false;}
}
function lazyParent(id:string):{parent:string|null}|undefined{if(id==='gank-lazy:roots')return {parent:null};if(id.startsWith('gank-lazy:'))return {parent:id.slice(10)};}

async function bodySaved(node:Output<'knowledge.node.save'>){
  if(!nativeTree.value)return;
  const expected=nativeTree.value.nodes.map(n=>n.nodeId===node.nodeId?{...n,revision:node.revision}:n),next=await unifiedKnowledge.tree({deckId});
  if(JSON.stringify(next.nodes)!==JSON.stringify(expected)){
    saveFailed.value=true;error.value='正文已保存；图谱同时发生变化，当前图谱草稿保留，请核对后恢复。';return;
  }
  nativeTree.value=next;
}
async function selectNode(id:string){const marker=lazyParent(id);if(marker){await loadLayer(marker.parent);return;}if(id===selectedKnowledgeId.value)return;if(nativeMode&&nativeBody.value&&!(await nativeBody.value.flush())){error.value='当前正文尚未保存，请先处理后再切换知识点';if(selectedKnowledgeId.value)mind?.selectNode(mind.findEle(selectedKnowledgeId.value));return;}selectedKnowledgeId.value=id;}
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
const detailResized=ref(!!localStorage.getItem("gank-map-detail-width"));
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
watch([selectedKnowledgeId,nativeTree],async()=>{
 const request=++associationRequest,id=selectedKnowledgeId.value;association.value=undefined;associationError.value='';
 if(!nativeMode||!nodes.value.some(n=>n.id===id))return;
 try{const [direct,aggregate]=await Promise.all([unifiedLearning.knowledgeMastery({deckId,nodeId:id,scope:'direct'}),unifiedLearning.knowledgeMastery({deckId,nodeId:id,scope:'aggregate'})]);if(!disposed&&request===associationRequest)association.value={id,direct:direct.cardIds.length,aggregate:aggregate.cardIds.length};}
 catch(e){if(!disposed&&request===associationRequest)associationError.value=String(e);}
});
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
let releaseFixedNodes:(()=>void)|undefined;
let releasePan: (() => void) | undefined, resize: ResizeObserver | undefined,toolbarResize:ResizeObserver|undefined;
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
  return {nodeData:knowledgeView(nodes.value,{name:props.unifiedDeckName??deckName(deckId),expanded:expandedNodes,partial:layered.value,counts:childCounts,pages:layerPages})};
}
async function init() {
  if(nativeMode)await refreshKnowledge(true);
  const [{ default: MindElixir }, { zh_CN }] = await Promise.all([
    import("mind-elixir"),
    import("mind-elixir/i18n"),
  ]);
  if (disposed || !canvas.value) return;
  mind = new MindElixir({
    el: canvas.value,
    direction: ([0, 1, 2, 3].includes(
      Number(localStorage.getItem("gank-map-layout:" + deckId)),
    ) && localStorage.getItem("gank-map-layout:" + deckId) !== null
      ? Number(localStorage.getItem("gank-map-layout:" + deckId))
      : MindElixir.RIGHT) as 0 | 1 | 2 | 3,
    editable: !layered.value,
    // Do not inherit the OS dark preference into an otherwise light application.
    theme: gankMapTheme(MindElixir.THEME),
    before: {
      addChild:(el)=>prepareNode(el),insertSibling:(_,el)=>prepareNode(el,true),insertParent:(el)=>prepareNode(el,true),
      reshapeNode:()=>!nativeMode&&!pendingTree.value,
      copyNodes:()=>!nativeMode&&!pendingTree.value,
      moveNodesIn:()=>!pendingTree.value,moveNodesBefore:()=>!pendingTree.value,moveNodesAfter:()=>!pendingTree.value,
      removeNodes: async (items) => {
        if(!nativeMode)return true;
        if(items.length!==1||items[0].nodeObj.id==='gank-root'){error.value='请选择一棵知识子树进行回收';return false;}
        if(!(await save())||!nativeTree.value)return false;
        if(!(await confirmMap('将选中知识点及全部下级移入回收站？')))return false;
        try{await unifiedKnowledge.deleteSubtree({deckId,nodeId:items[0].nodeObj.id,expectedTreeHash:nativeTree.value.treeHash});await refreshKnowledge();mind.refresh(data());mind.clearHistory();selectedKnowledgeId.value='';}
        catch(e){error.value='子树删除失败，图谱仍保留：'+String(e);}return false;
      },
      beginEdit: (el) => {
        if(nativeMode)return !saving.value&&!pendingTree.value&&!layered.value&&el?.nodeObj.id!=='gank-root';
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
  await mind.init(data());
  if (disposed) return;
  mind.scaleFit();
  releasePan = bindMindMapPan(canvas.value, (dx, dy) => mind.move(dx, dy));
  if(nativeMode)releaseFixedNodes=bindFixedMapNodes(canvas.value,el=>mind.selectNode(el));
  mind.bus.addListener('scale',(value:number)=>{zoom.value=value;});
  syncOutline();
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
    if (!layered.value && op.name !== "beginEdit") {
      dirty.value = true;
      syncOutline();
    }
  });
  mind.bus.addListener("expandNode",(node:any)=>{if(layered.value&&node.expanded!==false)void loadLayer(node.id==='gank-root'?null:node.id);else restoreSelection();});
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
  if(nativeMode)return;
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
    const hadPopup=!!popup.value||!!workspace.value?.querySelector('dialog[open],.r5-node-menu[open]');
    popup.value = "";
    if(nativeMode){if(!hadPopup)fullScreen.value=false;return;}
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
  if(layered.value){if(dirty.value){error.value="按层浏览不能提交不完整图谱，请先载入完整结构";return false;}return true;}
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
    rememberExpansion();mind.refresh(data());
    syncOutline();
    selectedKnowledgeId.value = canonical(priorId);
    restoreSelection();
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
    mind.editable = !layered.value;
    if (canvas.value) canvas.value.inert = !!pendingTree.value;
    saving.value = false;
  }
}
async function save(): Promise<boolean> {
  if(resolveConfirmation)return false;
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
    !(await confirmMap("重新载入已保存的图谱？当前未保存的图谱修改将被放弃。"))
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
  restoreSelection();
}
async function locate() {
  if(layered.value){if(!query.value.trim()||layerBusy.value||!nativeTree.value)return;layerBusy.value=true;layerError.value='';
   try{const found=await unifiedKnowledge.locate({deckId,query:query.value.trim(),expectedTreeHash:nativeTree.value.treeHash});if(disposed)return;
    rememberExpansion();const merged=new Map(nativeTree.value.nodes.map(n=>[n.nodeId,n]));for(const {childCount,...n} of found.path){merged.set(n.nodeId,n);childCounts.set(n.nodeId,childCount);expandedNodes.set(n.nodeId,true);}
    nativeTree.value={...nativeTree.value,nodes:[...merged.values()].sort((a,b)=>a.position-b.position)};mind.refresh(data());syncOutline();const last=found.path.at(-1);if(last){await selectNode(last.nodeId);const el=mind.findEle(last.nodeId);if(el){mind.selectNode(el);mind.scrollIntoView(el,true);}}else layerError.value='没有匹配的知识点';
   }catch(e){layerError.value=String(e);}finally{layerBusy.value=false;popup.value='';}return;
  }
  if(!query.value.trim())return;
  // Expand the current public data model instead of rebuilding from persisted
  // rows: search must never discard an unsaved rename, reparent or new node.
  const stack=[{node:mind.getData().nodeData,parents:[] as string[]}];let found:{node:any;parents:string[]}|undefined;
  while(stack.length){const item=stack.pop()!;if(item.node.id!=='gank-root'&&item.node.topic.includes(query.value.trim())){found=item;break;}for(const child of [...(item.node.children??[])].reverse())stack.push({node:child,parents:[...item.parents,item.node.id]});}
  if(found){for(const id of found.parents){const el=mind.findEle(id);if(el&&el.nodeObj.expanded===false)mind.expandNode(el,true);}await selectNode(found.node.id);
   if(selectedKnowledgeId.value!==found.node.id)return;const el=mind.findEle(found.node.id);if(el){mind.selectNode(el);mind.scrollIntoView(el,true);}}
  popup.value = "";
}
// refresh/expandNodeAll replace DOM and clear native selection. Reapply the
// existing business selection through the public API, never a parallel class state.
function restoreSelection(){const el=selectedKnowledgeId.value&&mind?.findEle(selectedKnowledgeId.value);if(el)mind.selectNode(el);}
async function expandAll(){if(layered.value)await loadComplete();if(!layered.value){mind?.expandNodeAll(mind.findEle('gank-root'),true);restoreSelection();}}
function collapseAll(){for(const root of mind?.getData().nodeData.children??[]){const el=mind.findEle(root.id);if(el)mind.expandNodeAll(el,false);}restoreSelection();}
function direction(value: number) {
  [() => mind?.initLeft(), () => mind?.initRight(), () => mind?.initSide(), () => mind?.initDown()][
    value
  ]?.();
  restoreSelection();
  popup.value = "";
}
function study() {
  if(nativeMode){if(selected.value)emit('filter',selected.value.id);return;}
  cardFilterPreset.value = "knowledge:" + selectedKnowledgeId.value;
  emit("navigate", "cards");
}
function renameNative(){if(nativeMode&&selected.value)void mind?.beginEdit(mind.findEle(selected.value.id));}
async function editDetails() {
  if(layered.value)await loadComplete();if(layered.value)return;
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
    const available = (workspace.value?.clientWidth ?? 900) * 0.5;
    detailResized.value=true;
    detailWidth.value = Math.max(
      240,
      Math.min(510, available, initial + start - e.clientX),
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
  const current=workspace.value?.querySelector<HTMLElement>('.mind-detail')?.offsetWidth??detailWidth.value;
  detailResized.value=true;
  detailWidth.value = Math.max(240,Math.min(510,(workspace.value?.clientWidth??900)*.5,current+(event.key==='ArrowLeft'?20:-20)));
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
  // The outline is a document, so its first title/TOC row must sit below the
  // real toolbar height, including wrapping at narrow widths and display zoom.
  toolbarResize=new ResizeObserver(()=>{toolbarHeight.value=(toolbar.value?.offsetHeight??52)+24;});
  if(toolbar.value)toolbarResize.observe(toolbar.value);
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
  disposed = true;finishConfirmation(false);
  if (mapPersistence.flush === save) delete mapPersistence.flush;
  clearInterval(timer);
  releaseResize?.();
  releasePan?.();releaseFixedNodes?.();
  resize?.disconnect();toolbarResize?.disconnect();
  mind?.destroy();
  unsavedMap.value = false;
  document.removeEventListener("pointerdown", closePopups, true);
  window.removeEventListener("keydown", key, true);
  window.removeEventListener("beforeunload", beforeUnload);
});
defineExpose({save,reloadSaved,mind:()=>mind,nativeTree,dirty,layered,close:save});
</script>
<template>
  <section
    ref="workspace"
    class="mind-workspace"
    :class="{ 'mind-expanded': expanded&&!nativeMode, 'r5-knowledge':nativeMode,'r5-fullscreen':nativeMode&&fullScreen }"
    aria-label="知识图谱工作区"
  >
    <div class="page-heading">
      <div>
        <div class="eyebrow">KNOWLEDGE MIND MAP</div>
        <h1>{{ nativeMode?"知识图谱":expanded ? "思维导图工作台" : "知识图谱" }}</h1>
        <p>
          {{nativeMode ? (unifiedDeckName+" · "+nodes.filter(n=>n.parent_id===null).length+" 棵独立知识树，"+(layered?layerTotal:nodes.length)+" 个知识点") : "拖动画布；双击知识点打开知识栏。每 5 秒自动保存，支持 Ctrl+S。"}}
        </p>
      </div>
      <div class="inline-actions">
        <button v-if="nativeMode" class="btn" aria-label="新增根节点" :disabled="saving||!!pendingTree||layered" @click="mind?.addChild(mind.findEle('gank-root'))"><MapIcon name="plus"/>新根节点</button>
        <button
          v-if="expanded&&!nativeMode"
          class="btn mind-return"
          @click="emit('navigate', 'knowledge')"
        >
          返回知识图谱
        </button>
      </div>
    </div>
    <p v-if="nativeMode&&error" role="alert">{{error}}</p>
    <p v-if="layered" class="info-box" role="status">按层浏览 {{layerTotal}} 个知识点；展开节点载入下级，正文按需读取。<button :disabled="layerBusy" @click="loadComplete">载入完整结构以编辑</button><button :disabled="layerBusy" @click="reloadLayers">重新载入分层图谱</button></p>
    <p v-if="layerError" role="alert">{{layerError}}</p>
    <div v-if="saveFailed" class="info-box mind-save-recovery" role="status">
      保存未完成，当前修改仍保留。<button class="btn" @click="save">
        重新保存</button
      ><button class="btn" @click="reloadSaved">重新载入已保存图谱</button>
    </div>
    <div v-if="nativeMode" ref="toolbar" class="r5-mapbar" role="toolbar" aria-label="知识图谱工具栏">
      <button class="map-tool" title="缩小" aria-label="缩小" @click="zoomBy(-.1)"><MapIcon name="minus"/></button>
      <span class="map-zoom-value" aria-label="当前缩放比例">{{Math.round(zoom*100)}}%</span>
      <button class="map-tool" title="放大" aria-label="放大" @click="zoomBy(.1)"><MapIcon name="plus"/></button>
      <span class="tool-separator"/>
      <button class="map-tool" title="适应窗口" aria-label="适应窗口" @click="mind?.scaleFit()"><MapIcon name="fit"/></button>
      <button class="map-tool" title="回到中心" aria-label="回到中心" @click="mind?.toCenter()"><MapIcon name="target"/></button>
      <div class="r5-layout-menu">
        <button class="map-tool" data-popup title="导图结构" aria-label="导图结构" :aria-expanded="popup==='layout'" @click="popup=popup==='layout'?'':'layout'"><MapIcon name="layout"/></button>
        <div v-if="popup==='layout'" class="map-popover"><button v-for="(label,index) in ['向左展开','向右展开','左右展开','向下展开']" :key="index" @click="direction(index)">{{label}}</button></div>
      </div>
      <span class="tool-separator"/>
      <button class="map-tool" title="撤销" aria-label="撤销" :disabled="saving||!!pendingTree||layered" @click="history('undo')"><MapIcon name="undo"/></button>
      <button class="map-tool" title="重做" aria-label="重做" :disabled="saving||!!pendingTree||layered" @click="history('redo')"><MapIcon name="redo"/></button>
      <span class="tool-separator"/>
      <button class="map-tool" title="全部展开" aria-label="全部展开" :disabled="layerBusy" @click="expandAll"><MapIcon name="expand"/></button>
      <button class="map-tool" title="全部收起" aria-label="全部收起" @click="collapseAll"><MapIcon name="collapse"/></button>
      <form class="r5-search" role="search" @submit.prevent="locate"><MapIcon name="searchField"/><input v-model="query" type="search" aria-label="搜索知识点名称" placeholder="搜索知识点"/><button class="map-tool" title="定位" aria-label="定位">↵</button></form>
      <button class="map-tool" :title="detailOpen?'收起知识栏':'打开知识栏'" :aria-label="detailOpen?'收起知识栏':'打开知识栏'" :disabled="!selected" @click="detailOpen?closeDetails():(detailOpen=true)"><MapIcon name="panel"/></button>
      <button class="map-tool" :title="fullScreen?'退出全屏':'全屏'" :aria-label="fullScreen?'退出全屏':'全屏'" @click="fullScreen=!fullScreen"><MapIcon name="fullscreen"/></button>
      <span class="tool-separator"/>
      <span class="r5-selected-name" :title="selected?.name">{{selected?.name??'未选择'}}</span>
      <button class="map-tool" title="新增下级" aria-label="新增下级" :disabled="!selected||saving||!!pendingTree||layered" @click="mind?.addChild()"><MapIcon name="child"/></button>
      <button class="map-tool" title="新增同级" aria-label="新增同级" :disabled="!selected||saving||!!pendingTree||layered" @click="mind?.insertSibling('after')"><MapIcon name="sibling"/></button>
      <details class="r5-node-menu" @keydown.esc="closeToolMenu">
        <summary aria-label="更多知识点操作" title="更多知识点操作"><MapIcon name="more"/></summary>
        <div class="r5-secondary-tools" @click="closeSecondaryTools">
        <button class="map-tool" title="重命名" aria-label="重命名" :disabled="!selected||saving||!!pendingTree||layered" @click="renameNative"><MapIcon name="list"/></button>
        <button class="map-tool" title="调整层级" aria-label="调整层级" :disabled="!selected||saving||!!pendingTree||layered" @click="openStructure"><MapIcon name="layout"/></button>
        <button class="map-tool" title="同级上移" aria-label="同级上移" :disabled="!selected||saving||!!pendingTree||layered" @click="mind?.moveUpNode()">↑</button>
        <button class="map-tool" title="同级下移" aria-label="同级下移" :disabled="!selected||saving||!!pendingTree||layered" @click="mind?.moveDownNode()">↓</button>
        <button class="map-tool" title="删除知识子树" aria-label="删除知识子树" :disabled="!selected||saving||!!pendingTree||layered" @click="mind?.removeNodes([mind.findEle(selectedKnowledgeId)])"><MapIcon name="trash"/></button>
        <KnowledgeTreeActions v-if="!layered" ref="nativeActions" :deck-id="deckId" :selected-id="selectedKnowledgeId" :flush="save" :changed="operationChanged"/>
        <KnowledgeMarkdownExchange v-if="!layered" ref="nativeExchange" :deck-id="deckId" :flush="save" :changed="operationChanged"/>
        <button class="map-tool" :title="dirty?'保存图谱修改 · Ctrl+S':'图谱已保存'" :aria-label="dirty?'保存图谱修改':'图谱已保存'" :disabled="saving||!dirty" @click="save"><MapIcon name="check"/></button>
        </div>
      </details>
    </div>
    <div
      class="mind-layout"
      :class="{ 'has-detail': selected && detailOpen&&(!nativeMode||view==='map') }"
      :style="{ '--detail-width': nativeMode&&!detailResized?undefined:detailWidth+'px' }"
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
        <section v-if="nativeMode&&view==='outline'" class="native-outline-workbench" :style="{top:nativeMode?'0':toolbarHeight+'px'}" aria-label="Markdown 大纲工作台">
          <main class="outline-body">
            <template v-if="selected"><h2>{{selected.name}}</h2><KnowledgeMarkdownPanel :readonly="layered" :key="selected.id+String(layered)" ref="nativeBody" :deck-id="deckId" :node-id="selected.id" :on-saved="bodySaved"/></template>
            <p v-else>创建或选择知识点后编辑正文。</p>
          </main>
          <nav aria-label="大纲分级目录"><h3>目录</h3><ul><KnowledgeOutline v-for="root in outlineTree?.children" :key="root.id" :node="root" :selected="selectedKnowledgeId" @select="outlineSelect($event)" @open="outlineSelect($event)" @expand="outlineExpand"/></ul></nav>
        </section>
        <div
          v-if="!nativeMode"
          ref="toolbar"
          class="mind-tools"
          role="toolbar"
          aria-label="导图工具栏"
          @keydown.esc="popup = '';focusedTool=''" @focusin="toolFocused" @focusout="focusedTool=''"
        >
        <span v-if="focusedTool" role="tooltip" class="map-focus-hint">{{focusedTool}}</span>
        <KnowledgeMarkdownExchange v-if="nativeMode&&!layered" ref="nativeExchange" :deck-id="deckId" :flush="save" :changed="operationChanged"/>
        <KnowledgeTreeActions v-if="nativeMode&&!layered" ref="nativeActions" :deck-id="deckId" :selected-id="selectedKnowledgeId" :flush="save" :changed="operationChanged"/>

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
            <button v-if="selected" class="map-tool" title="新增下级" aria-label="新增下级" :disabled="saving||!!pendingTree||layered" @click="mind?.addChild()"><UiIcon name="add"/></button>
            <button v-if="selected" class="map-tool" title="新增同级" aria-label="新增同级" :disabled="saving||!!pendingTree||layered" @click="mind?.insertSibling('after')">↳</button>
            <button class="map-tool" title="新增根节点" aria-label="新增根节点" :disabled="saving||!!pendingTree||layered" @click="mind?.addChild(mind.findEle('gank-root'))">⊕</button>
            <button v-if="selected" class="map-tool" title="同级上移" aria-label="同级上移" :disabled="saving||!!pendingTree||layered" @click="mind?.moveUpNode()">↑</button>
            <button v-if="selected" class="map-tool" title="同级下移" aria-label="同级下移" :disabled="saving||!!pendingTree||layered" @click="mind?.moveDownNode()">↓</button>
            <button class="map-tool" title="全部展开" aria-label="全部展开" @click="expandAll">⊞</button>
            <button class="map-tool" title="全部收起" aria-label="全部收起" @click="collapseAll">⊟</button>
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
        <div v-if="!nativeMode" class="mind-bottom-tools">
          <button
            class="btn"
            :aria-pressed="view === 'outline'"
            @click="toggleView"
          >
            {{ view === "map" ? "切换大纲模式" : "切换思维导图" }}
          </button>
        </div>
        <div v-if="!nativeMode" class="mind-save-status" role="status">
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
          :aria-valuenow="detailResized?detailWidth:undefined"
          :aria-valuemin="240"
          :aria-valuemax="510"
          tabindex="0"
          @pointerdown.prevent="startResize"
          @keydown="resizeKey"
        ></div>
        <section class="panel mind-detail" aria-label="知识点细节栏">
          <div class="section-head">
            <span class="eyebrow">{{nativeMode?"知识点详情":"知识点"}}</span
            ><button
              class="text-btn mind-close-detail"
              @click="closeDetails"
              aria-label="关闭知识栏"
            >
              ×
            </button>
          </div>
          <h2>{{ selected.name }}</h2>
          <p v-if="nativeMode" class="r5-node-path">{{selectedPath}}</p>
          <div v-if="nativeMode" class="r5-node-stats" :aria-busy="!association&&!associationError">
            <span><strong>{{association?.direct??'—'}}</strong><small>直接关联</small></span>
            <span><strong>{{association?.aggregate??'—'}}</strong><small>含子级关联</small></span>
            <span><strong>{{layered?'—':descendants.size-1}}</strong><small>后代节点</small></span>
          </div><p v-if="associationError" role="alert">{{associationError}}</p><button v-if="layered" :disabled="layerBusy" @click="loadComplete">载入完整结构后编辑正文</button>

          <p v-if="!nativeMode" class="muted">关联 {{ linked.length }} 张卡片</p>
          <div class="inline-actions">
            <button v-if="!nativeMode" class="btn" :disabled="saving || !!pendingTree" @click="editDetails">
              编辑知识点详情</button
            ><button class="btn primary" :disabled="saving || !!pendingTree" @click="study">
              筛选此知识点的卡片
            </button>
          </div>
          <h3 v-if="nativeMode" class="r5-body-heading">知识点 Markdown 内容</h3>
          <KnowledgeMarkdownPanel v-if="nativeMode" :readonly="layered" :key="selected.id+String(layered)" ref="nativeBody" :deck-id="deckId" :node-id="selected.id" :on-saved="bodySaved"/>
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
    <footer v-if="nativeMode" class="r5-map-footer">
      <div class="r5-view-tabs" role="group" aria-label="知识图谱视图"><button :aria-pressed="view==='map'" @click="view!=='map'&&toggleView()"><MapIcon name="brain"/>思维导图</button><button :aria-pressed="view==='outline'" @click="view!=='outline'&&toggleView()"><MapIcon name="list"/>Markdown 大纲</button></div>
      <span>空白处平移 · 自动布局 · {{selected?.name??'未选择'}}</span>
      <span role="status">{{saving?'正在保存…':dirty?'有修改，等待保存':savedAt?'已保存 · '+savedAt:'图谱已保存'}}</span>
    </footer>
    <dialog ref="confirmationDialog" aria-label="确认图谱操作" @cancel.prevent="finishConfirmation(false)"><h2>确认操作</h2><p>{{confirmationMessage}}</p><div class="inline-actions"><button @click="finishConfirmation(false)">取消</button><button class="primary" @click="finishConfirmation(true)">确认</button></div></dialog>
    <dialog ref="structureDialog" aria-label="调整知识点层级" @cancel="structureDialog?.close()">
      <form @submit.prevent="applyStructure"><h2>调整知识点层级</h2><p>{{selected?.name}}</p>
        <label>新的上级<select v-model="structureParent" aria-label="新的上级"><option value="">独立根节点</option><option v-for="n in structureTargets" :key="n.id" :value="n.id">{{n.name}}</option></select></label>
        <p>位置由图谱自动计算。当前节点及其下级不能作为新的上级。</p>
        <button type="button" :disabled="saving" @click="structureDialog?.close()">取消</button><button class="primary" :disabled="saving||!!pendingTree">保存层级</button>
      </form>
    </dialog>
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
.map-focus-hint{position:absolute;top:calc(100% + 6px);left:0;max-width:100%;padding:6px 10px;overflow-wrap:anywhere;background:var(--text,#243b31);color:var(--panel,#fff);border-radius:5px;font-size:12px;pointer-events:none;z-index:6}
.mind-workspace.mind-expanded{position:fixed;inset:0;z-index:90;width:100vw;height:100dvh;max-width:none;min-height:0;margin:0;padding:0;display:flex;flex-direction:column;overflow:hidden;background:var(--bg,#f6f7f9)}
.mind-workspace.mind-expanded .mind-layout{flex:1;height:auto;min-height:0;border-radius:0}
.mind-workspace.mind-expanded .mind-canvas-area{height:100%;min-height:0}
.mind-workspace.mind-expanded ~ .modal-backdrop{z-index:100}
.native-outline-workbench{position:absolute;inset:0 0 64px;display:grid;grid-template-columns:minmax(0,1fr) minmax(200px,260px);gap:20px;background:var(--panel,#fff);padding:18px;overflow:hidden}
.outline-body{min-width:0;overflow:auto;padding:8px 18px}.native-outline-workbench nav{overflow:auto;border-left:1px solid var(--line,#ddd);padding-left:12px}.native-outline-workbench ul{list-style:none;padding-left:18px}.native-outline-workbench nav>ul{padding-left:0}
@media(max-width:720px){.native-outline-workbench{grid-template-columns:minmax(0,1fr) 180px;gap:6px;padding:8px}.outline-body{padding:4px}}
</style>
