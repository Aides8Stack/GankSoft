<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, shallowRef } from "vue";
import { unifiedCardExchange, unifiedCards } from "../services";
import type { Input, Output } from "../../shared/protocol/registry";
import {collectDeckContent} from "./catalog-management";
const panel=ref<HTMLElement>();const origin=document.activeElement as HTMLElement|null;
const props = defineProps<{
  deckId?: string;
  wholeDeck?:boolean;
  cards?: { cardId: string; revision: number }[];
  importing?: boolean;
  parentId?: string | null;
}>();
const emit = defineEmits<{ close: []; imported: [deckId: string]; review: [] }>();
const preview = shallowRef<
    Output<"card.exchange.preview"> | Output<"card.exchange.open">
  >(),
  busy = ref(false),
  unknown = ref(false),
  error = ref(""),
  notice = ref(""),
  name = ref(""),
  allowDuplicate = ref(false),fileReview=ref(false);
let pending:
  | { kind: "save"; payload: Input<"card.exchange.save">; id: string }
  | { kind: "import"; payload: Input<"card.exchange.import">; id: string }
  | null = null;
async function prepare() {
  busy.value = true;
  error.value = "";
  try {
    const r = props.importing
      ? await unifiedCardExchange.open()
      : await unifiedCardExchange.preview(props.wholeDeck ? await collectDeckContent(props.deckId!,unifiedCards.listSummary) : {
          deckId: props.deckId!,
          cards: props.cards!.map((c) => ({
            cardId: c.cardId,
            expectedRevision: c.revision,
          })),
        });
    preview.value = r;
    if (!r) {
      emit("close");
      return;
    }
    if ("name" in r && typeof r.name === "string") name.value = r.name;
  } catch (e) {
    error.value = String(e);
  } finally {
    busy.value = false;
  }
}
async function execute() {
  if (!pending || busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    const p = pending;
    if (p.kind === "save") {
      const r = await unifiedCardExchange.save(p.payload, p.id);
      notice.value = r.saved ? "已导出 " + r.name : "已取消导出";
    } else {
      const r = await unifiedCardExchange.import(p.payload, p.id);
      notice.value = r.skipped
        ? "此内容包已经导入，已定位原卡片集。"
        : `已导入 ${r.count} 张卡片`;
      emit("imported", r.deckId);
    }
    pending = null;
    unknown.value = false;
    preview.value = null;
  } catch (e) {
    unknown.value = !(e as { definitive?: boolean }).definitive;
    fileReview.value=pending?.kind==='save'&&(e as {code?:string}).code==='OPERATION_UNKNOWN';
    if (!unknown.value) pending = null;
    error.value = String(e);
  } finally {
    busy.value = false;
  }
}
async function confirm() {
  if (!preview.value||busy.value||unknown.value||pending) return;
  pending = props.importing
    ? {
        kind: "import",
        payload: {
          token: preview.value.token,
          name: name.value,
          parentId: props.parentId ?? null,
          allowDuplicate: allowDuplicate.value,
        },
        id: crypto.randomUUID(),
      }
    : {
        kind: "save",
        payload: { token: preview.value.token },
        id: crypto.randomUUID(),
      };
  await execute();
}
function close(){return !busy.value&&!unknown.value&&!pending;}
function keys(e:KeyboardEvent){if(!props.wholeDeck)return;if(e.key==='Escape'&&close()){e.preventDefault();emit('close');}if(e.key==='Tab'){const nodes=Array.from(panel.value!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)'));if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0]?.focus();}}}
defineExpose({close});
onMounted(async()=>{await prepare();await nextTick();if(props.wholeDeck)panel.value?.querySelector<HTMLElement>('input:not(:disabled),button:not(:disabled)')?.focus();});
onUnmounted(()=>{if(props.wholeDeck&&origin?.isConnected)origin.focus();});
</script>
<template>
  <section ref="panel" aria-label="卡片内容交换预览" class="exchange-preview" :role="wholeDeck?'dialog':'region'" :aria-modal="wholeDeck?true:undefined" @keydown="keys">
    <h3>{{ importing ? "导入卡片内容包 ZIP" : wholeDeck ? "导出卡片集 ZIP · 卡片内容包" : "导出选中卡片" }}</h3>
    <p>此 ZIP 为卡片内容包：仅含已发布卡、关联知识点及其祖先和图片，不含未关联知识点、草稿、FSRS、调度配置或复盘历史；不是完整卡片集备份。支持1–500张已发布卡，完整数据请使用设置中的备份。</p>
    <p v-if="busy" role="status">正在处理内容包…</p>
    <template v-if="preview"
      ><p>
        {{ preview.count }} 张卡片 · 单选错题 {{ preview.modes.question }} ·
        问答记忆 {{ preview.modes.qa }} · 直接记忆 {{ preview.modes.direct }} ·
        {{ preview.knowledgeCount }} 个知识点
      </p>
      <p v-for="w in preview.warnings" :key="w">{{ w }}</p>
      <template v-if="importing"
        ><label
          >新卡片集名称<input
            v-model="name"
            aria-label="导入卡片集名称"
            :disabled="busy || unknown"
            maxlength="100" /></label
        ><label
          v-if="'previouslyImported' in preview && preview.previouslyImported"
          ><input
            type="checkbox"
            v-model="allowDuplicate"
            :disabled="busy || unknown"
          />此包已导入，另导一份</label
        ></template
      ><button
        :disabled="busy || unknown || (importing && !name.trim())"
        @click="confirm"
      >
        {{ importing ? "确认导入独立卡片集" : "选择位置并导出" }}
      </button></template
    >
    <p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <button v-if="error && !unknown && (wholeDeck || !preview)" :disabled="busy" @click="prepare">重新预览内容包</button>
    <button v-if="wholeDeck && unknown && fileReview" :disabled="busy" @click="emit('review')">前往设置核对文件结果</button>
    <button v-if="unknown" :disabled="busy" @click="execute">
      核对原交换请求</button
    ><button :disabled="busy || unknown" @click="emit('close')">
      {{ preview ? "取消交换" : "关闭交换" }}
    </button>
  </section>
</template>
<style scoped>
.exchange-preview {
  padding: 16px;
  border: 1px solid var(--line, #ddd);
  border-radius: 8px;
  background: var(--panel, #fff);
  margin: 12px 0;
}
.exchange-preview p {
  line-height: 1.6;
}
label {
  display: block;
  margin: 12px 0;
}
button {
  margin: 4px;
}
input:not([type="checkbox"]) {
  display: block;
  width: min(100%, 360px);
}
</style>
