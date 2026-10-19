<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { effectiveTheme } from "../composables/preferences";
import { gankMapTheme } from "../composables/mindMapTheme";
import type MindElixir from "mind-elixir";
import type { Knowledge } from "../../shared/types";
import { deckName, liveKnowledge, refresh, working } from "../store";
import { services } from "../services";
const props = defineProps<{
  deckId: string;
  compact?: boolean;
  purpose?: "association" | "filter";
}>();
const filtering = computed(() => props.purpose === "filter");
const model = defineModel<string[]>({ required: true });
const open = ref(false),
  chosen = ref<string[]>([]),
  focused = ref(""),
  query = ref("");
const name = ref(""),
  saving = ref(false),
  failure = ref(""),
  loading = ref(false);
const created = ref<Knowledge[]>([]),
  fetched = ref<Knowledge[] | null>(null);
const canvas = ref<HTMLDivElement>(),
  panel = ref<HTMLElement>(),
  trigger = ref<HTMLButtonElement>(),
  search = ref<HTMLInputElement>();
watch(effectiveTheme, () => {
  if (mind) mind.changeTheme(gankMapTheme(mind.theme));
});
let mind: MindElixir | undefined,
  generation = 0;
const nodes = computed(() => [
  ...new Map(
    [...created.value, ...(fetched.value ?? liveKnowledge.value)]
      .filter((k) => k.module === props.deckId && !k.deleted_at)
      .map((k) => [k.id, k]),
  ).values(),
]);
const selected = computed(() =>
  nodes.value.filter((k) => chosen.value.includes(k.id)),
);
const associated = computed(() =>
  nodes.value.filter((k) => model.value.includes(k.id)),
);
const current = computed(() => nodes.value.find((k) => k.id === focused.value));
const matches = computed(() =>
  query.value.trim()
    ? nodes.value
        .filter((k) =>
          (k.name + " " + k.aliases)
            .toLowerCase()
            .includes(query.value.trim().toLowerCase()),
        )
        .slice(0, 20)
    : [],
);
function path(id: string) {
  const parts: string[] = [],
    seen = new Set<string>();
  let node = nodes.value.find((k) => k.id === id);
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    parts.unshift(node.name);
    node = nodes.value.find((k) => k.id === node!.parent_id);
  }
  return parts.join(" / ");
}
function data() {
  const seen = new Set<string>();
  function branch(parent: string | null): {
    id: string;
    topic: string;
    expanded: boolean;
    children: ReturnType<typeof branch>;
  }[] {
    return nodes.value
      .filter((k) => k.parent_id === parent && !seen.has(k.id))
      .map((k) => {
        seen.add(k.id);
        return {
          id: k.id,
          topic: k.name,
          expanded: true,
          children: branch(k.id),
        };
      });
  }
  return {
    nodeData: {
      id: "picker-root",
      topic: deckName(props.deckId),
      root: true,
      children: branch(null),
    },
  };
}
function decorate() {
  if (!mind) return;
  for (const node of nodes.value) {
    const el = mind.findEle(node.id);
    if (!el) continue;
    el.dataset.knowledgeId = node.id;
    el.dataset.picked = String(chosen.value.includes(node.id));
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", path(node.id));
    el.setAttribute("aria-pressed", String(chosen.value.includes(node.id)));
  }
}
function pick(id: string) {
  if (!nodes.value.some((k) => k.id === id)) {
    focused.value = "";
    return;
  }
  focused.value = id;
  if (!chosen.value.includes(id)) chosen.value.push(id);
  decorate();
}
function remove(id: string) {
  chosen.value = chosen.value.filter((v) => v !== id);
  decorate();
}
async function show() {
  chosen.value = [...model.value];
  created.value = [];
  focused.value = "";
  query.value = "";
  name.value = "";
  failure.value = "";
  open.value = true;
  loading.value = true;
  const attempt = ++generation;
  try {
    await nextTick();
    search.value?.focus();
    const [{ default: Engine }, graph] = await Promise.all([
      import("mind-elixir"),
      services.workspace.read(["knowledge"], props.deckId),
    ]);
    if (generation !== attempt || !open.value || !canvas.value) return;
    fetched.value = graph.knowledge;
    chosen.value = chosen.value.filter((id) =>
      nodes.value.some((k) => k.id === id),
    );
    mind = new Engine({
      el: canvas.value,
      direction: Engine.SIDE,
      theme: gankMapTheme(Engine.THEME),
      editable: false,
      contextMenu: false,
      keypress: false,
      toolBar: true,
    });
    mind.init(data());
    mind.bus.addListener("selectNodes", (items) => {
      if (items[0]) pick(items[0].id);
    });
    decorate();
    mind.scaleFit();
  } catch (e) {
    failure.value = "思维导图加载失败，请关闭后重新打开：" + String(e);
  } finally {
    if (generation === attempt) loading.value = false;
  }
}
function close() {
  if (saving.value) return;
  open.value = false;
  generation++;
  mind?.destroy();
  mind = undefined;
  nextTick(() => trigger.value?.focus());
}
function confirmSelection() {
  model.value = chosen.value.filter((id) =>
    nodes.value.some((k) => k.id === id),
  );
  close();
}
function locate(id: string) {
  pick(id);
  const el = mind?.findEle(id);
  if (el) mind?.scrollIntoView(el, true);
}
async function create() {
  if (filtering.value) return;
  const value = name.value.trim();
  if (!value || saving.value || loading.value || working.value) return;
  saving.value = true;
  failure.value = "";
  const parent = current.value?.id ?? null;
  try {
    const id = await services.knowledge.save({
      name: value,
      module: props.deckId,
      parent_id: parent,
    });
    created.value.push({
      id,
      name: value,
      module: props.deckId,
      parent_id: parent,
      aliases: "",
      principle: "",
      conditions: "",
      method: "",
      traps: "",
      deleted_at: null,
      version: 1,
    });
    name.value = "";
    pick(id);
    mind?.refresh(data());
    decorate();
    const el = mind?.findEle(id);
    if (el) mind?.scrollIntoView(el, true);
    try {
      await refresh();
    } catch {
      failure.value = "知识点已新增，页面同步失败；关闭选择器后可刷新核对。";
    }
  } catch (e) {
    failure.value = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}
function keydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    close();
    return;
  }
  if (
    (e.key === "Enter" || e.key === " ") &&
    (e.target as HTMLElement).dataset.knowledgeId
  ) {
    e.preventDefault();
    pick((e.target as HTMLElement).dataset.knowledgeId!);
  }
  if (e.key !== "Tab") return;
  const items = Array.from(
    panel.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input:not(:disabled),[tabindex="0"]',
    ) ?? [],
  ).filter((el) => el.getClientRects().length);
  const first = items[0],
    last = items.at(-1);
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last?.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first?.focus();
  }
}
watch(
  () => props.deckId,
  () => {
    close();
    created.value = [];
    fetched.value = null;
    model.value = [];
  },
);
watch(nodes, () => {
  if (open.value && mind) {
    mind.refresh(data());
    decorate();
  }
});
onBeforeUnmount(() => {
  generation++;
  mind?.destroy();
});
</script>
<template>
  <div class="knowledge-picker-field">
    <button
      ref="trigger"
      type="button"
      class="btn"
      :disabled="!deckId || working"
      @click="show"
    >
      {{
        filtering ? "从思维导图选择筛选知识点" : "从思维导图选择 / 新增知识点"
      }}
    </button>
    <div
      v-if="!compact"
      class="knowledge-picker-tags"
      :aria-label="filtering ? '已选筛选知识点' : '已关联知识点'"
    >
      <span
        v-for="node in associated"
        :key="node.id"
        class="tag"
        :title="path(node.id)"
        >{{ path(node.id)
        }}<button
          type="button"
          :aria-label="(filtering ? '移除筛选 ' : '取消关联 ') + node.name"
          @click="model = model.filter((id) => id !== node.id)"
        >
          ×
        </button></span
      ><span v-if="!associated.length" class="muted">{{
        filtering ? "未选择知识点，不限制知识点" : "尚未关联知识点"
      }}</span>
    </div>
  </div>
  <Teleport to="body"
    ><div
      v-if="open"
      class="modal-backdrop knowledge-picker-backdrop"
      @click.self="close"
    >
      <section
        ref="panel"
        class="modal knowledge-picker-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="knowledge-picker-title"
        @keydown="keydown"
      >
        <div class="section-head">
          <div>
            <h2 id="knowledge-picker-title">从思维导图选择知识点</h2>
            <p class="muted">
              {{ deckName(deckId) }} · 点击已有节点加入选择，可多选；点击 ×
              移除。
            </p>
          </div>
          <button
            type="button"
            class="icon-btn"
            :disabled="saving"
            aria-label="关闭知识点选择器"
            @click="close"
          >
            ×
          </button>
        </div>
        <div class="knowledge-picker-tools">
          <input
            ref="search"
            v-model="query"
            aria-label="搜索图谱知识点"
            placeholder="搜索名称或别名"
            @keydown.enter.prevent="matches[0] && locate(matches[0].id)"
          /><button type="button" class="btn" @click="mind?.scaleFit()">
            适应窗口</button
          ><button type="button" class="btn" @click="mind?.toCenter()">
            回到中心
          </button>
        </div>
        <div
          v-if="query"
          class="knowledge-picker-search"
          aria-label="知识点搜索结果"
        >
          <button
            v-for="node in matches"
            :key="node.id"
            type="button"
            class="btn"
            @click="locate(node.id)"
          >
            {{ path(node.id) }}</button
          ><span v-if="!matches.length" class="muted">{{
            filtering ? "没有匹配的知识点。" : "没有匹配知识点，可在下方新增。"
          }}</span>
        </div>
        <p v-if="loading" role="status">正在展开思维导图…</p>
        <div class="knowledge-picker-map-wrap">
          <div
            ref="canvas"
            class="knowledge-picker-map"
            aria-label="当前卡片集知识树"
          ></div>
          <p v-if="!nodes.length && !loading" class="knowledge-picker-empty">
            {{
              filtering
                ? "此卡片集暂无知识点，可先到知识图谱添加。"
                : "此卡片集暂无知识点，从下方新增一级知识点开始。"
            }}
          </p>
        </div>
        <div class="knowledge-picker-tags" aria-label="本次选择">
          <span
            v-for="node in selected"
            :key="node.id"
            class="tag"
            :title="path(node.id)"
            >{{ path(node.id)
            }}<button
              type="button"
              :disabled="saving"
              :aria-label="'移除选择 ' + node.name"
              @click="remove(node.id)"
            >
              ×
            </button></span
          ><span v-if="!selected.length" class="muted">尚未选择知识点</span>
        </div>
        <div v-if="!filtering" class="knowledge-picker-create">
          <div class="section-head">
            <strong>{{
              current
                ? "在「" + path(current.id) + "」下新增"
                : "新增一级知识点"
            }}</strong
            ><button
              v-if="current"
              type="button"
              class="text-btn"
              :disabled="saving"
              @click="focused = ''"
            >
              改为新增一级知识点
            </button>
          </div>
          <div class="knowledge-picker-tools">
            <input
              v-model="name"
              aria-label="新增知识点名称"
              maxlength="100"
              placeholder="输入知识点名称"
              :disabled="saving"
              @keydown.enter.prevent="create"
            /><button
              type="button"
              class="btn"
              :disabled="saving || loading || !name.trim() || working"
              @click="create"
            >
              {{ saving ? "正在新增…" : "新增并选中" }}
            </button>
          </div>
          <p class="footnote">
            新增知识点会立即保存。取消只放弃本次关联选择，不删除已新增的知识点。
          </p>
        </div>
        <p v-if="failure" role="alert" class="info-box">{{ failure }}</p>
        <div class="modal-footer">
          <span class="muted">已选择 {{ selected.length }} 个知识点</span
          ><button type="button" class="btn" :disabled="saving" @click="close">
            取消</button
          ><button
            type="button"
            class="btn primary"
            :disabled="saving || loading"
            @click="confirmSelection"
          >
            {{ filtering ? "应用筛选" : "确认关联" }}
          </button>
        </div>
      </section>
    </div></Teleport
  >
</template>
<style>
@import "mind-elixir/style.css";
.knowledge-picker-backdrop {
  z-index: 60;
}
.knowledge-picker-dialog {
  width: 1120px;
  padding: 22px;
}
.knowledge-picker-tools {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 12px 0;
}
.knowledge-picker-tools input {
  flex: 1;
  min-width: 0;
}
.knowledge-picker-map-wrap {
  position: relative;
  border: 1px solid #dbe5de;
  border-radius: 10px;
  overflow: hidden;
}
.knowledge-picker-map {
  height: clamp(220px, 40vh, 440px);
  width: 100%;
}
.knowledge-picker-map me-tpc[data-picked="true"] {
  outline: 3px solid #338264;
  outline-offset: 2px;
}
.knowledge-picker-map me-tpc:focus-visible {
  box-shadow: 0 0 0 5px #e7b95c;
}
.knowledge-picker-empty {
  position: absolute;
  left: 20px;
  bottom: 8px;
  pointer-events: none;
  color: #63748d;
}
.knowledge-picker-tags,
.knowledge-picker-search {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}
.knowledge-picker-tags .tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: normal;
}
.knowledge-picker-tags button {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: inherit;
  font-size: 17px;
}
.knowledge-picker-create {
  border-top: 1px solid #e3e8e5;
  padding-top: 12px;
}
.knowledge-picker-dialog .footnote {
  margin-bottom: 0;
}
@media (max-width: 650px) {
  .knowledge-picker-backdrop {
    padding: 8px;
  }
  .knowledge-picker-dialog {
    padding: 14px;
    max-width: 100%;
  }
  .knowledge-picker-tools {
    flex-wrap: wrap;
  }
  .knowledge-picker-tools input {
    flex-basis: 100%;
  }
}
</style>
