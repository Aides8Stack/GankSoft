<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowReactive,
  shallowRef,
} from "vue";
import type { z } from "zod";
import type { Input, Output } from "../../shared/protocol/registry";
import {
  copyCardContent,
  previewCardPaste,
  confirmCardPaste,
} from "../../shared/cards/clipboard";
import { buildExternalPrompt, DEFAULT_PROMPT } from "../../shared/cards/prompt";
import { normalizeLegacyQuestionDraft } from "../../shared/cards/mapping";
import type { PromptContext } from "../../shared/protocol/card-transfer";
import {
  DraftPreview,
  type WorkspaceDraftDTO,
} from "../../shared/protocol/card-draft";
import {
  parsePlacement,
  type EditorDocument,
} from "../../shared/editor/document";
import MarkdownEditor from "../editor/MarkdownEditor.vue";
import UiIcon from "../components/UiIcon.vue";
import type { EditorMediaAdapter } from "../editor/media-adapter";
import { CardDraftController, type DraftAdapter } from "./draft-controller";
const props = defineProps<{
  initial: z.infer<typeof DraftPreview>;
  deckName?: string;
  draft: WorkspaceDraftDTO | null;
  adapter: DraftAdapter;
  mediaAdapter: EditorMediaAdapter;
  publish?: (
    input: Input<"card.publish">,
    requestId: string,
  ) => Promise<Output<"card.publish">>;
  loadPromptContext?: () => Promise<z.infer<typeof PromptContext>>;
  clipboard?: {
    copy(input: Input<"card.clipboard.copy">): Promise<boolean>;
    preview(input: Input<"card.clipboard.preview">): Promise<Output<"card.clipboard.preview">>;
    apply(input: Input<"card.clipboard.apply">, requestId: string): Promise<WorkspaceDraftDTO>;
  };
}>();
const emit = defineEmits<{
  unsaved: [fields: ReturnType<CardDraftController["snapshot"]>];
  failure: [message: string];
  back: [];
  drafts: [];
}>();
const publishing = ref(false),
  preparingPublish = ref(false),
  resetStudyCycle = ref(false),
  publishMessage = ref("");
const pendingPublish = shallowRef<{
  input: Input<"card.publish">;
  requestId: string;
}>();
const transferDialog = ref<HTMLDialogElement>(),
  transferMode = ref<"paste" | "prompt">("paste"),
  pasteText = ref("");
const pastePreview = shallowRef<ReturnType<typeof previewCardPaste>>();
const nativePastePreview = shallowRef<Output<"card.clipboard.preview">>();
const pendingPaste = shallowRef<{ input: Input<"card.clipboard.apply">; requestId: string }>();
const applyingPaste = ref(false);
const previewingClipboard = ref(false);
const editingBlocked = computed(() => !!pendingPublish.value || !!pendingPaste.value || publishing.value || preparingPublish.value || applyingPaste.value);
let transferGeneration = 0;
function expectation() {
  return { cardId: props.initial.cardId, deckId: props.initial.deckId,
    expectedPublishedRevision: controller.publishedRevision, expectedDraftRevision: controller.revision };
}
const promptContext = shallowRef<z.infer<typeof PromptContext>>();
const promptOptions = ref({
  includeDeckKnowledgeCatalog: false,
  includeConfirmedKnowledgePaths: false,
});
const promptTemplate = ref(DEFAULT_PROMPT),
  transferError = ref("");
const promptText = computed(() => {
  if (!promptContext.value) return "";
  try {
    return buildExternalPrompt(
      controller.fields,
      promptContext.value,
      promptOptions.value,
      promptTemplate.value,
    );
  } catch (e) {
    return String(e);
  }
});
async function copyContent() {
  await saveAll();
  try {
    if (controller.state !== "clean") return;
    if (props.clipboard) await props.clipboard.copy(expectation());
    else await navigator.clipboard.writeText(copyCardContent(controller.snapshot()));
    publishMessage.value = "卡片内容已复制";
  } catch (e) {
    localError.value = String(e);
  }
}
async function openTransfer(mode: "paste" | "prompt") {
  if (editingBlocked.value) return;
  await saveAll();
  if (controller.state !== "clean") return;
  transferGeneration++;
  transferMode.value = mode;
  transferError.value = "";
  pastePreview.value = undefined;
  nativePastePreview.value = undefined;
  pasteText.value = "";
  promptOptions.value = {
    includeDeckKnowledgeCatalog: false,
    includeConfirmedKnowledgePaths: false,
  };
  if (mode === "prompt") {
    try {
      promptContext.value = props.loadPromptContext
        ? await props.loadPromptContext()
        : { deckId: props.initial.deckId, catalog: [], confirmed: [] };
    } catch (e) {
      localError.value = String(e);
      return;
    }
  }
  transferDialog.value?.showModal();
}
function previewPaste() {
  if (pendingPaste.value || applyingPaste.value || previewingClipboard.value) return;
  nativePastePreview.value = undefined;
  pastePreview.value = undefined;
  try {
    pastePreview.value = previewCardPaste(
      pasteText.value,
      controller.snapshot(),
    );
    transferError.value = "";
  } catch (e) {
    transferError.value = String(e);
  }
}
async function previewClipboard() {
  if (!props.clipboard || pendingPaste.value || applyingPaste.value || previewingClipboard.value) return;
  const generation = transferGeneration;
  previewingClipboard.value = true;
  nativePastePreview.value = undefined;
  pastePreview.value = undefined;
  try {
    const preview = await props.clipboard.preview(expectation());
    if (generation !== transferGeneration || !transferDialog.value?.open) return;
    nativePastePreview.value = preview;
    pastePreview.value = { fields: preview.fields, overwrites: preview.overwrites,
      switchRequired: preview.switchRequired, warnings: preview.warnings, source: copyCardContent(controller.snapshot()) };
    transferError.value = "";
  } catch (e) {
    if (generation === transferGeneration) transferError.value = String(e);
  } finally { previewingClipboard.value = false; }
}
function cancelTransfer() {
  if (pendingPaste.value || applyingPaste.value) return;
  transferGeneration++;
  transferDialog.value?.close();
}
async function applyPaste() {
  if (applyingPaste.value || previewingClipboard.value) return;
  applyingPaste.value = true;
  try {
    if (!pastePreview.value) return;
    if (nativePastePreview.value && props.clipboard) {
      if (!pendingPaste.value && copyCardContent(controller.snapshot()) !== pastePreview.value.source) throw Error("CLIPBOARD_PREVIEW_EXPIRED");
      pendingPaste.value ??= { input: { ...expectation(), previewToken: nativePastePreview.value.token, confirmOverwrite: true }, requestId: crypto.randomUUID() };
      const result = await props.clipboard.apply(pendingPaste.value.input, pendingPaste.value.requestId);
      controller.acceptSavedDraft(result);
      if (nativePastePreview.value.imageCount) for (const ref of result.mediaRefs) assets.set(ref.assetId, "draft");
      pendingPaste.value = undefined;
    } else controller.change(confirmCardPaste(pastePreview.value, controller.snapshot(), true));
    editorKey.value++;
    await nextTick();
    await controller.flush();
    if (controller.state === "clean") transferDialog.value?.close();
  } catch (e) {
    transferError.value = String(e);
    if ((e as { outcome?: string }).outcome === "rejected") pendingPaste.value = undefined;
  } finally {
    applyingPaste.value = false;
  }
}
async function copyPrompt() {
  try {
    if (!promptContext.value) return;
    const text = buildExternalPrompt(
      controller.snapshot(),
      promptContext.value,
      promptOptions.value,
      promptTemplate.value,
    );
    await navigator.clipboard.writeText(text);
    transferDialog.value?.close();
    publishMessage.value = "Prompt已复制";
  } catch (e) {
    transferError.value = String(e);
  }
}
async function publishCard() {
  if (!props.publish || publishing.value || preparingPublish.value) return;
  preparingPublish.value = true;
  publishMessage.value = "";
  try {
  if (!pendingPublish.value) {
    await saveAll();
    if (controller.state !== "clean") return;
    if (controller.revision === null) {
      controller.change(controller.snapshot());
      await controller.flush();
    }
    if (controller.state !== "clean" || controller.revision === null) return;
    pendingPublish.value = {
      input: {
        cardId: props.initial.cardId,
        deckId: props.initial.deckId,
        expectedPublishedRevision: controller.publishedRevision,
        expectedDraftRevision: controller.revision,
        resetStudyCycle: resetStudyCycle.value,
      },
      requestId: crypto.randomUUID(),
    };
  }
  publishing.value = true;
  publishMessage.value = "";
  try {
    const result = await props.publish(
      pendingPublish.value.input,
      pendingPublish.value.requestId,
    );
    controller.acceptPublication(result.revision);
    pendingPublish.value = undefined;
    resetStudyCycle.value = false;
    publishMessage.value = "发布成功，历史已保留";
    localError.value = "";
  } catch (e) {
    localError.value = String(e);
    if ((e as { outcome?: string }).outcome === "rejected")
      pendingPublish.value = undefined;
  } finally {
    publishing.value = false;
  }
  } finally {
    preparingPublish.value = false;
  }
}
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
const confirmingSwitch = ref(false);
const modeNames = {question:'错题复盘',qa:'问答记忆',direct:'直接记忆'};
const legacyDialog = ref<HTMLDialogElement>();
const legacyCandidate = shallowRef<ReturnType<typeof normalizeLegacyQuestionDraft>>();
const convertingLegacy = ref(false);
async function previewLegacy() {
  await saveAll();
  if (controller.state !== "clean" || editingBlocked.value) return;
  legacyCandidate.value=normalizeLegacyQuestionDraft(controller.snapshot());
  legacyDialog.value?.showModal();
}
async function confirmLegacy() {
  if (convertingLegacy.value || !legacyCandidate.value) return;
  convertingLegacy.value=true;
  try {
    if (JSON.stringify(controller.snapshot())!==JSON.stringify(legacyCandidate.value)) {
      controller.change(legacyCandidate.value);
      editorKey.value++;
      await nextTick();
    }
    await controller.flush();
    if (controller.state === "clean") legacyDialog.value?.close();
  } finally { convertingLegacy.value=false; }
}
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
const requiredFieldNames: Record<string,string> = {...labels,options:'至少两个选项',correctOptionId:'正确答案',optionText:'选项正文','legacyOptions:explicit-conversion-required':'整理旧题选项'};
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
  if (publishing.value || pendingPublish.value || pendingPaste.value) return;
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
  if (editingBlocked.value) return;
  const copy = controller.snapshot();
  if (field === "title") copy.title = value;
  else (copy.payload.fields as Record<string, unknown>)[field] = value;
  controller.change(copy);
}
function changed(field: string, doc: EditorDocument, optionId?: string) {
  if (pendingPublish.value || pendingPaste.value) return;
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
const batchDialog=ref<HTMLDialogElement>(),batchText=ref('');
const batchLines=computed(()=>batchText.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean));
async function openBatch(){if(editingBlocked.value)return;await saveAll();if(controller.state!=="clean")return;batchText.value='';batchDialog.value?.showModal();}
async function applyBatch(){
 if(editingBlocked.value||batchLines.value.length<2||batchLines.value.length>100)return;
 await saveAll();if(controller.state!=="clean")return;const copy=controller.snapshot();if(copy.payload.encoding!=="question-v1")return;
 copy.payload.fields.options=batchLines.value.map((markdown,position)=>({optionId:crypto.randomUUID(),position,markdown}));copy.payload.fields.correctOptionId=null;
 controller.change(copy);editorKey.value++;await nextTick();await controller.flush();if(controller.state==='clean')batchDialog.value?.close();
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
  if (type === mode.value || editingBlocked.value || controller.previewing || controller.preview) return;
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
  if (confirmingSwitch.value) return;
  confirmingSwitch.value = true;
  try {
    await controller.confirmSwitch();
    if (!controller.preview) {
      editorKey.value++;
      dialog.value?.close();
      await nextTick();
      switchTrigger.value?.focus();
    }
  } finally { confirmingSwitch.value = false; }
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
    if (batchDialog.value?.open || pendingPublish.value || publishing.value || preparingPublish.value || pendingPaste.value || applyingPaste.value) return false;
    await saveAll();
    return controller.close();
  },
});
</script>
<template>
  <section
    class="card-draft-form editor-shell"
    data-testid="card-draft-form"
    @keydown="key"
    @compositionstart.capture="controller.suspend()"
    @compositionend.capture="nextTick(() => controller.resume())"
  >
    <header class="editor-head">
      <div class="editor-title-group"><button class="text-button editor-back" @click="emit('back')">‹ 返回上一页</button><h1>编辑卡片</h1></div>
      <div class="heading-actions"><button @click="emit('drafts')"><UiIcon name="cards" :size="15"/>草稿箱</button><output aria-live="polite" :data-save-state="controller.state">{{
        status
      }}</output></div>
    </header>
    <div class="card-content-toolbar editor-toolbar" :inert="editingBlocked">
      <button @click="copyContent">复制卡片</button
      ><button @click="openTransfer('paste')">粘贴卡片</button
      ><button @click="openTransfer('prompt')">复制 Prompt</button>
    </div>
    <div class="card-meta" :inert="editingBlocked">
      <label>所属卡片集<input :value="deckName??initial.deckId" readonly /></label
      ><label
        >标题<input
          data-testid="draft-title"
          :value="data.title"
          @input="
            updateText('title', ($event.target as HTMLInputElement).value)
          "
      /></label>
    </div>
    <nav class="mode-control" aria-label="卡片类型" :inert="editingBlocked">
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
    <div :key="editorKey" class="draft-fields" :inert="editingBlocked">
      <section class="draft-field" role="group" :aria-label="labels[field]" v-for="field in fields.filter(f=>!['analysis','initialThought','material'].includes(f))" :key="field" :data-editor-field="field"
        ><span>{{ labels[field] }}</span
        ><MarkdownEditor
          :ref="(el) => remember(field, el)"
          :initial="initialDocument(field)"
          @input="afterInput(field)"
          :revision="0"
          :external-save="true"
          :document-adapter="noLocalSave"
          :media-adapter="mediaAdapter"
          :resource-deck-id="initial.deckId"
          @changed="changed(field, $event)"
          @request-save="saveAll()"
          @failure="emit('failure', $event)"
      /></section>
      <section
        v-if="data.payload.encoding === 'question-v1'"
        aria-label="单选选项"
      >
        <div class="section-heading"><span class="field-label">选项</span><button class="text-button" @click="openBatch">批量输入选项</button></div>
        <div
          v-for="(option, index) in data.payload.fields.options"
          :key="option.optionId"
          class="option-row"
        >
          <span class="option-letter">{{String.fromCharCode(65+index)}}</span>
          <MarkdownEditor
            :ref="(el) => remember(option.optionId, el)"
            :initial="initialDocument('options', option.optionId)"
            @input="afterInput('options', option.optionId)"
            :revision="0"
            :external-save="true"
            :document-adapter="noLocalSave"
            :media-adapter="mediaAdapter"
          :resource-deck-id="initial.deckId"
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
          ><button :aria-label="'删除选项 '+(index+1)" :title="'删除选项 '+(index+1)" @click="removeOption(option.optionId)">
            <UiIcon name="trash" :size="15"/>
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
        <button @click="previewLegacy">整理为单选题</button>
      </section>
      <fieldset v-if="data.payload.encoding==='question-v1'" class="editor-answer"><legend>正确答案 <small>单选</small></legend><label v-for="(option,index) in data.payload.fields.options" :key="option.optionId" :class="{active:data.payload.fields.correctOptionId===option.optionId}"><input type="radio" name="correct-option" :aria-label="'正确项 '+(index+1)" :checked="data.payload.fields.correctOptionId===option.optionId" @change="setAnswer(option.optionId)"/>{{String.fromCharCode(65+index)}}</label></fieldset>
      <section class="draft-field" role="group" :aria-label="labels[field]" v-for="field in fields.filter(f=>['analysis','initialThought'].includes(f))" :key="field" :data-editor-field="field"
        ><span>{{ labels[field] }}</span
        ><MarkdownEditor
          :ref="(el) => remember(field, el)"
          :initial="initialDocument(field)"
          @input="afterInput(field)"
          :revision="0"
          :external-save="true"
          :document-adapter="noLocalSave"
          :media-adapter="mediaAdapter"
          :resource-deck-id="initial.deckId"
          @changed="changed(field, $event)"
          @request-save="saveAll()"
          @failure="emit('failure', $event)"
      /></section>

      <slot name="knowledge"/>
      <label
        >题目来源<input
          :value="data.payload.fields.source"
          @input="
            updateText('source', ($event.target as HTMLInputElement).value)
          "
      /></label>
      <details class="optional-material" v-if="fields.includes('material')"><summary>公共材料（可选）</summary>
      <section class="draft-field" role="group" :aria-label="labels[field]" v-for="field in fields.filter(f=>f==='material')" :key="field" :data-editor-field="field"
        ><span>{{ labels[field] }}</span
        ><MarkdownEditor
          :ref="(el) => remember(field, el)"
          :initial="initialDocument(field)"
          @input="afterInput(field)"
          :revision="0"
          :external-save="true"
          :document-adapter="noLocalSave"
          :media-adapter="mediaAdapter"
          :resource-deck-id="initial.deckId"
          @changed="changed(field, $event)"
          @request-save="saveAll()"
          @failure="emit('failure', $event)"
      /></section>
      </details>
    </div>
    <p v-if="controller.error || localError" role="alert">
      {{ controller.error || localError }}
    </p>
    <p v-if="publishMessage" role="status">{{ publishMessage }}</p>
    <footer class="editor-footer">
      <button data-testid="save-draft" @click="saveAll()">
        保存草稿（Ctrl+S）
      </button>
      <slot name="actions"/>
      <template v-if="publish"
        ><label
          ><input
            type="checkbox"
            v-model="resetStudyCycle"
            :disabled="!!pendingPublish"
            data-testid="reset-cycle"
          />重新开始学习</label
        ><button
          class="primary"
          data-testid="publish-card"
          :disabled="publishing"
          @click="publishCard"
        >
          {{ pendingPublish ? "重试核对发布" : "发布卡片" }}
        </button></template
      >
    </footer>
    <dialog ref="batchDialog" aria-label="批量输入选项" @cancel.prevent="batchDialog?.close()"><h2>批量输入选项</h2><p>每行一个选项。确认后替换当前选项并清除正确答案，请重新选择正确项；仅保存草稿。</p><textarea v-model="batchText" aria-label="批量选项正文" rows="8"/><p>将写入 {{batchLines.length}} 个选项（2–100项）。</p><button @click="batchDialog?.close()">取消</button><button class="primary" :disabled="editingBlocked||batchLines.length<2||batchLines.length>100" @click="applyBatch">确认替换选项</button></dialog>
    <dialog ref="transferDialog" class="transfer-dialog" aria-label="内容交换" @cancel.prevent="cancelTransfer">
      <h2>
        {{ transferMode === "paste" ? "粘贴卡片预览" : "复制外部 AI Prompt" }}
      </h2>
      <div class="transfer-body">
      <template v-if="transferMode === 'paste'">
        <button v-if="clipboard" :disabled="!!pendingPaste || applyingPaste || previewingClipboard" @click="previewClipboard">从剪贴板预览（含图片）</button>
        <textarea
          v-model="pasteText"
          :readonly="!!pendingPaste || applyingPaste || previewingClipboard"
          aria-label="结构化卡片内容"
          rows="10"
        /><button :disabled="!!pendingPaste || applyingPaste || previewingClipboard" @click="previewPaste">解析预览</button>
        <template v-if="pastePreview"
          ><p>将覆盖：{{ pastePreview.overwrites.join("、") || "无变化" }}</p>
          <p v-for="warning in pastePreview.warnings" :key="warning">
            {{ warning }}
          </p>
          <p v-if="pastePreview.switchRequired">
            请先取消并确认切换到目标类型，再粘贴内容。
          </p>
          <pre>{{
            JSON.stringify(pastePreview.fields.payload.fields, null, 2)
          }}</pre>
          </template
        >
      </template>
      <template v-else>
        <label
          ><input
            type="checkbox"
            v-model="promptOptions.includeDeckKnowledgeCatalog"
          />当前卡片集完整知识点候选目录</label
        >
        <label
          ><input
            type="checkbox"
            v-model="promptOptions.includeConfirmedKnowledgePaths"
          />本卡已确认知识点及父级路径</label
        >
        <details>
          <summary>Prompt 模板</summary>
          <textarea
            v-model="promptTemplate"
            aria-label="Prompt模板"
            rows="5"
          /><button @click="promptTemplate = DEFAULT_PROMPT">
            恢复默认模板
          </button>
        </details>
        <textarea
          readonly
          :value="promptText"
          aria-label="Prompt预览"
          rows="12"
        />
      </template>
      </div>
      <p v-if="transferError" role="alert">{{ transferError }}</p>
      <footer class="transfer-actions">
        <button :disabled="!!pendingPaste || applyingPaste" @click="cancelTransfer">取消</button>
        <button v-if="transferMode === 'prompt'" class="primary" @click="copyPrompt">复制到剪贴板</button>
        <button v-else-if="pastePreview" class="primary" :disabled="pastePreview.switchRequired || applyingPaste || previewingClipboard" @click="applyPaste">
          {{ pendingPaste ? '重试核对粘贴' : '确认写入草稿' }}
        </button>
      </footer>
    </dialog>
    <dialog
      ref="dialog"
      class="mode-switch-dialog"
      @cancel.prevent="cancel"
      aria-labelledby="switch-title"
      aria-describedby="switch-impact"
    >
      <header class="switch-head"><h2 id="switch-title">确认切换卡片类型</h2><button class="icon-button" aria-label="取消类型切换" :disabled="confirmingSwitch||controller.switchOutcomeUnknown" @click="cancel">×</button></header>
      <div v-if="controller.preview" class="switch-body">
        <p>将「{{data.title||'未命名卡片'}}」从「{{modeNames[mode]}}」切换到「{{modeNames[controller.preview.targetType]}}」。</p>
        <p id="switch-impact">确认后会清除当前类型的未发布草稿；已发布内容与历史不受影响。只有发布新内容后，卡片的正式类型才会改变。</p>
        <p class="switch-hint">{{controller.preview.origin.strategy==='published-target'?'目标草稿将恢复该类型上次发布的内容。':controller.preview.origin.strategy==='unpublished'?'目标草稿将根据当前新卡内容转换，发布前可继续编辑。':'目标草稿将根据当前已发布内容转换，发布前可继续编辑。'}}</p>
        <p v-for="warning in controller.preview.warnings.filter(w=>!w.startsWith('确认后将清除当前未发布草稿'))" :key="warning" class="switch-hint">{{warning}}</p>
        <p v-if="controller.preview.requiredFields.length" class="switch-hint">发布前还需填写：{{controller.preview.requiredFields.map(f=>requiredFieldNames[f]??'请检查目标内容').join('、')}}。</p>
        <p v-if="controller.error" role="alert">{{controller.error}}</p>
      </div>
      <footer class="switch-footer"><button data-cancel :disabled="confirmingSwitch||controller.switchOutcomeUnknown" @click="cancel">取消</button><button class="button primary" :disabled="confirmingSwitch" @click="confirm">{{confirmingSwitch?'正在切换…':controller.switchOutcomeUnknown?'核对原切换请求':'确认切换并清除草稿'}}</button></footer>
    </dialog>
    <dialog ref="legacyDialog" aria-label="整理旧题选项">
      <h2>确认整理旧题选项</h2>
      <p>原选项和答案标记将保留在解析参考区。请手动添加选项、指定正确答案；发布前原题和全部历史保持不变。</p>
      <button :disabled="convertingLegacy" @click="legacyDialog?.close()">取消</button>
      <button :disabled="convertingLegacy" @click="confirmLegacy">确认整理</button>
      <p v-if="controller.error" role="alert">{{ controller.error }}</p>
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
.draft-fields > .draft-field {
  margin-bottom: 20px;
}
.draft-fields > .draft-field > span {
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

<style scoped>
.mode-switch-dialog{width:min(610px,calc(100vw - 40px));max-height:min(85vh,850px);padding:0;border:1px solid #e7ece7;border-radius:13px;box-shadow:0 28px 90px #172f1d36;overflow:hidden;color:var(--ink,#26352f)}
.mode-switch-dialog[open]{display:flex;flex-direction:column}
.mode-switch-dialog .switch-head{padding:19px 22px 14px;border-bottom:1px solid var(--border,#e6eae8);flex-shrink:0}
.mode-switch-dialog h2{font-size:18px;margin:0}
.mode-switch-dialog .switch-body{padding:20px 22px;overflow:auto;min-height:0;overflow-wrap:anywhere}
.mode-switch-dialog p{margin:0;line-height:1.65}
.mode-switch-dialog p+p{margin-top:12px}
.mode-switch-dialog .switch-hint{font-size:12px;color:var(--muted,#79857e)}
.mode-switch-dialog .switch-footer{padding:14px 22px;margin:0;border-top:1px solid var(--border,#e6eae8);gap:8px;flex-wrap:wrap;flex-shrink:0}
</style>

<style scoped>
.transfer-dialog{box-sizing:border-box;width:min(1080px,calc(100vw - 40px));max-width:calc(100vw - 40px);height:min(88vh,900px);max-height:calc(100vh - 32px);padding:0;overflow:hidden;color:var(--ink,#26352f);border:1px solid #e7ece7;box-shadow:0 28px 90px #172f1d36}
.transfer-dialog[open]{display:flex;flex-direction:column}
.transfer-dialog h2{margin:0;padding:18px 24px;border-bottom:1px solid var(--border,#e6eae8);font-size:18px;flex-shrink:0}
.transfer-body{padding:20px 24px;overflow:auto;min-height:0;flex:1;overflow-wrap:anywhere}
.transfer-body textarea{display:block;box-sizing:border-box;width:100%;min-height:180px;resize:vertical;margin:12px 0;line-height:1.6}
.transfer-body textarea[aria-label="Prompt预览"]{min-height:240px}
.transfer-body label{display:block;margin-bottom:10px}
.transfer-body pre{max-height:360px;overflow:auto;padding:14px;background:#f5f8f5;border-radius:8px}
.transfer-actions{display:flex;flex-wrap:wrap;gap:8px;flex-shrink:0;margin:0;padding:14px 24px;border-top:1px solid var(--border,#e6eae8)}
.transfer-dialog>[role="alert"]{margin:0;padding:8px 24px;flex-shrink:0}
@media(max-width:700px){.transfer-dialog{width:calc(100vw - 24px);max-width:calc(100vw - 24px)}.transfer-body{padding:16px}.transfer-dialog h2,.transfer-actions{padding:14px 16px}}
</style>
