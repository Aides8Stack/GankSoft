<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowReactive } from "vue";
import type { z } from "zod";
import {
  DraftPreview,
  type WorkspaceDraftDTO,
} from "../../shared/protocol/card-draft";
import {
  parsePlacement,
  type EditorDocument,
} from "../../shared/editor/document";
import MarkdownEditor from "../editor/MarkdownEditor.vue";
import type { EditorMediaAdapter } from "../editor/media-adapter";
import { CardDraftController, type DraftAdapter } from "./draft-controller";
const props = defineProps<{
  initial: z.infer<typeof DraftPreview>;
  draft: WorkspaceDraftDTO | null;
  adapter: DraftAdapter;
  mediaAdapter: EditorMediaAdapter;
}>();
const emit = defineEmits<{
  unsaved: [fields: ReturnType<CardDraftController["snapshot"]>];
  failure: [message: string];
}>();
const render = ref(0),
  editorKey = ref(0),
  switchTrigger = ref<HTMLButtonElement>();
const controller = shallowReactive(
  new CardDraftController(
    { cardId: props.initial.cardId, deckId: props.initial.deckId },
    props.initial,
    props.draft,
    props.adapter,
    () => render.value++,
  ),
);
const data = computed(() => {
  void render.value;
  return controller.fields;
});
const mode = computed(() => data.value.payload.mode);
const dialog = ref<HTMLDialogElement>();
const localError = ref("");
const assets = new Map<string, "draft" | "asset">();
const noLocalSave = {
  async save(): Promise<{ revision: number }> {
    throw Error("CARD_DRAFT_OWNS_SAVE");
  },
};
const labels: Record<string, string> = {
  stem: "题干",
  material: "公共材料",
  analysis: "答案解析",
  initialThought: "我当时怎么想的，为什么错",
  front: "正面问题",
  back: "背面答案",
  supplement: "补充说明",
  body: "记忆正文",
};
const fields = computed(() =>
  mode.value === "qa"
    ? ["front", "back", "supplement"]
    : mode.value === "direct"
      ? ["body"]
      : ["stem", "material", "analysis", "initialThought"],
);
function afterInput(field: string, optionId?: string) {
  queueMicrotask(() => captureOne(field, optionId));
}
const editorRefs = new Map<
  string,
  { handle?: { snapshot(): EditorDocument } }
>();
function remember(key: string, value: unknown) {
  if (value)
    editorRefs.set(key, value as { handle?: { snapshot(): EditorDocument } });
  else editorRefs.delete(key);
}
function captureOne(field: string, optionId?: string) {
  const doc = editorRefs.get(optionId ?? field)?.handle?.snapshot();
  if (doc) changed(field, doc, optionId);
}
function captureAll() {
  for (const [key, editor] of editorRefs) {
    const doc = editor.handle?.snapshot();
    if (!doc) continue;
    const option =
      data.value.payload.encoding === "question-v1" &&
      data.value.payload.fields.options.some((o) => o.optionId === key);
    changed(option ? "options" : key, doc, option ? key : undefined);
  }
}
async function saveAll() {
  captureAll();
  await controller.flush();
}
function initialDocument(field: string, optionId?: string): EditorDocument {
  const payload = data.value.payload;
  const value =
    optionId && payload.encoding === "question-v1"
      ? payload.fields.options.find((o) => o.optionId === optionId)?.markdown
      : (payload.fields as Record<string, unknown>)[field];
  return {
    encoding: "ganksoft.editor/1",
    markdown: typeof value === "string" ? value : "",
    assets: [
      ...new Map(
        data.value.mediaRefs.map((r) => [
          r.assetId,
          {
            id: r.assetId,
            mime: r.mime,
            access: assets.get(r.assetId) ?? ("asset" as const),
          },
        ]),
      ).values(),
    ],
  };
}
function updateText(field: string, value: string) {
  const copy = controller.snapshot();
  if (field === "title") copy.title = value;
  else (copy.payload.fields as Record<string, unknown>)[field] = value;
  controller.change(copy);
}
function changed(field: string, doc: EditorDocument, optionId?: string) {
  try {
    const copy = controller.snapshot();
    if (optionId && copy.payload.encoding === "question-v1")
      copy.payload.fields.options.find(
        (o) => o.optionId === optionId,
      )!.markdown = doc.markdown;
    else (copy.payload.fields as Record<string, unknown>)[field] = doc.markdown;
    for (const a of doc.assets) assets.set(a.id, a.access);
    for (const m of doc.markdown.matchAll(/gank-asset:\/\/[^\s)<>"']+/g)) {
      const p = parsePlacement(m[0]),
        asset = doc.assets.find((a) => a.id === p.assetId);
      if (!asset) throw Error("MEDIA_REFERENCE_MISSING");
      const old = copy.mediaRefs.find((r) => r.placementId === p.placementId);
      if (old) {
        old.width = p.width;
      } else
        copy.mediaRefs.push({
          placementId: p.placementId,
          assetId: p.assetId,
          width: p.width,
          mime: asset.mime,
          fileName:
            asset.id +
            (asset.mime === "image/jpeg"
              ? ".jpg"
              : asset.mime === "image/webp"
                ? ".webp"
                : ".png"),
          role: "question",
        });
    }
    if (JSON.stringify(copy) !== JSON.stringify(controller.fields))
      controller.change(copy);
  } catch (e) {
    localError.value = String(e);
    controller.suspend();
    emit("failure", String(e));
  }
}
function addOption() {
  const c = controller.snapshot();
  if (c.payload.encoding !== "question-v1") return;
  c.payload.fields.options.push({
    optionId: crypto.randomUUID(),
    position: c.payload.fields.options.length,
    markdown: "",
  });
  controller.change(c);
}
function removeOption(id: string) {
  const c = controller.snapshot();
  if (c.payload.encoding !== "question-v1") return;
  const f = c.payload.fields;
  f.options = f.options
    .filter((o) => o.optionId !== id)
    .map((o, position) => ({ ...o, position }));
  if (f.correctOptionId === id) f.correctOptionId = null;
  controller.change(c);
}
function moveOption(id: string, delta: number) {
  const c = controller.snapshot();
  if (c.payload.encoding !== "question-v1") return;
  const list = c.payload.fields.options,
    index = list.findIndex((o) => o.optionId === id),
    target = index + delta;
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  c.payload.fields.options = list.map((o, position) => ({ ...o, position }));
  controller.change(c);
}
function setAnswer(id: string) {
  const c = controller.snapshot();
  if (c.payload.encoding === "question-v1") {
    c.payload.fields.correctOptionId = id;
    controller.change(c);
  }
}
async function switchType(
  type: "question" | "qa" | "direct",
  event: MouseEvent,
) {
  switchTrigger.value = event.currentTarget as HTMLButtonElement;
  await saveAll();
  await controller.previewType(type);
  if (controller.preview) {
    dialog.value?.showModal();
    await nextTick();
    dialog.value?.querySelector<HTMLButtonElement>("[data-cancel]")?.focus();
  }
}
function cancel() {
  controller.cancelSwitch();
  if (!controller.preview) {
    dialog.value?.close();
    switchTrigger.value?.focus();
  }
}
async function confirm() {
  await controller.confirmSwitch();
  if (!controller.preview) {
    editorKey.value++;
    dialog.value?.close();
    switchTrigger.value?.focus();
  }
}
function key(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (!event.isComposing) void saveAll();
  }
}
const status = computed(() => {
  void render.value;
  return {
    clean: "已保存",
    dirty: "未保存",
    saving: "保存中",
    error: "保存失败，内容已保留",
    conflict: "保存冲突，请保留本地内容",
  }[controller.state];
});
onBeforeUnmount(() => {
  captureAll();
  const unsaved = controller.dispose();
  if (unsaved) emit("unsaved", unsaved);
});
defineExpose({
  controller,
  close: async () => {
    await saveAll();
    return controller.close();
  },
});
</script>
<template>
  <section
    class="card-draft-form"
    data-testid="card-draft-form"
    @keydown="key"
    @compositionstart.capture="controller.suspend()"
    @compositionend.capture="nextTick(() => controller.resume())"
  >
    <header>
      <h1>编辑卡片</h1>
      <output aria-live="polite" :data-save-state="controller.state">{{
        status
      }}</output>
    </header>
    <div class="card-meta">
      <label>所属卡片集<input :value="initial.deckId" readonly /></label
      ><label
        >标题<input
          data-testid="draft-title"
          :value="data.title"
          @input="
            updateText('title', ($event.target as HTMLInputElement).value)
          "
      /></label>
    </div>
    <nav aria-label="卡片类型">
      <button
        v-for="(label, type) in {
          question: '错题复盘',
          qa: '问答记忆',
          direct: '直接记忆',
        }"
        :key="type"
        :aria-pressed="mode === type"
        :disabled="controller.switchOutcomeUnknown || controller.previewing"
        @click="switchType(type, $event)"
      >
        {{ label }}
      </button>
    </nav>
    <div :key="editorKey" class="draft-fields">
      <label v-for="field in fields" :key="field"
        ><span>{{ labels[field] }}</span
        ><MarkdownEditor
          :ref="(el) => remember(field, el)"
          :initial="initialDocument(field)"
          @input="afterInput(field)"
          :revision="0"
          :external-save="true"
          :document-adapter="noLocalSave"
          :media-adapter="mediaAdapter"
          @changed="changed(field, $event)"
          @request-save="saveAll()"
          @failure="emit('failure', $event)"
      /></label>
      <section
        v-if="data.payload.encoding === 'question-v1'"
        aria-label="单选选项"
      >
        <div
          v-for="(option, index) in data.payload.fields.options"
          :key="option.optionId"
          class="option-row"
        >
          <label
            ><input
              type="radio"
              name="correct-option"
              :checked="data.payload.fields.correctOptionId === option.optionId"
              @change="setAnswer(option.optionId)"
            />正确项 {{ index + 1 }}</label
          >
          <MarkdownEditor
            :ref="(el) => remember(option.optionId, el)"
            :initial="initialDocument('options', option.optionId)"
            @input="afterInput('options', option.optionId)"
            :revision="0"
            :external-save="true"
            :document-adapter="noLocalSave"
            :media-adapter="mediaAdapter"
            @changed="changed('options', $event, option.optionId)"
            @request-save="saveAll()"
            @failure="emit('failure', $event)"
          />
          <button
            :disabled="index === 0"
            :aria-label="`上移选项 ${index + 1}`"
            @click="moveOption(option.optionId, -1)"
          >
            ↑</button
          ><button
            :disabled="index === data.payload.fields.options.length - 1"
            :aria-label="`下移选项 ${index + 1}`"
            @click="moveOption(option.optionId, 1)"
          >
            ↓</button
          ><button @click="removeOption(option.optionId)">
            删除选项 {{ index + 1 }}
          </button>
        </div>
        <button
          :disabled="data.payload.fields.options.length >= 100"
          @click="addOption"
        >
          添加选项
        </button>
      </section>
      <section
        v-else-if="data.payload.encoding === 'legacy-question-604'"
        aria-label="旧题原文"
      >
        <p>旧选项与答案保留原文，需显式整理后发布。</p>
        <pre>{{ data.payload.fields.options }}</pre>
        <p>原答案：{{ data.payload.fields.answer }}</p>
      </section>
      <label
        >来源<input
          :value="data.payload.fields.source"
          @input="
            updateText('source', ($event.target as HTMLInputElement).value)
          "
      /></label>
    </div>
    <p v-if="controller.error || localError" role="alert">
      {{ controller.error || localError }}
    </p>
    <footer>
      <button data-testid="save-draft" @click="saveAll()">
        保存草稿（Ctrl+S）
      </button>
    </footer>
    <dialog
      ref="dialog"
      @cancel.prevent="cancel"
      aria-labelledby="switch-title"
    >
      <h2 id="switch-title">确认切换卡片类型</h2>
      <template v-if="controller.preview"
        ><p v-for="warning in controller.preview.warnings" :key="warning">
          {{ warning }}
        </p>
        <p v-if="controller.preview.requiredFields.length">
          待填写：{{ controller.preview.requiredFields.join("、") }}
        </p>
        <pre>{{
          JSON.stringify(controller.preview.fields.payload.fields, null, 2)
        }}</pre>
        <button
          data-cancel
          :disabled="controller.switchOutcomeUnknown"
          @click="cancel"
        >
          取消</button
        ><button @click="confirm">确认切换</button></template
      >
    </dialog>
  </section>
</template>
<style scoped>
.card-draft-form {
  max-width: 1100px;
  margin: auto;
  padding: 24px;
  color: var(--text, #24352f);
  background: var(--surface, #fff);
}
header,
nav,
footer,
.card-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}
header {
  justify-content: space-between;
}
h1 {
  font-size: 22px;
}
label {
  display: block;
}
.card-meta > label:first-child {
  flex: 3;
}
.card-meta > label:last-child {
  flex: 7;
}
input:not([type="radio"]) {
  width: 100%;
  box-sizing: border-box;
}
input,
textarea,
button {
  font: inherit;
  padding: 8px;
  border: 1px solid #cbd5d0;
  border-radius: 6px;
}
nav {
  margin: 20px 0;
}
button {
  cursor: pointer;
  background: #fff;
}
button[aria-pressed="true"] {
  background: #e5f1eb;
  color: #245b49;
  border-color: #2c705e;
}
.draft-fields > label {
  margin-bottom: 20px;
}
.draft-fields > label > span {
  display: block;
  margin-bottom: 8px;
}
.option-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 12px 0;
}
.option-row textarea {
  flex: 1;
}
footer {
  justify-content: flex-end;
  margin-top: 20px;
}
dialog {
  max-width: 680px;
  max-height: 80vh;
  border: 1px solid #b9c9c0;
  border-radius: 12px;
  padding: 24px;
}
dialog::backdrop {
  background: #14291e66;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
output {
  font-size: 13px;
  color: #527061;
}
@media (max-width: 700px) {
  .card-meta {
    display: block;
  }
  .option-row {
    flex-wrap: wrap;
  }
  .option-row textarea {
    width: 100%;
  }
}
</style>
