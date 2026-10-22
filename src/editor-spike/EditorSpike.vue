<script setup lang="ts">
import { ref, shallowRef } from "vue";
import MarkdownEditor from "../editor/MarkdownEditor.vue";
import { electronMediaAdapter } from "../editor/media-adapter";
import type { EditorDocument } from "../../shared/editor/document";
import type { MarkdownEditorHandle } from "../editor/milkdown-adapter";
import { services } from "../services";
const initial: EditorDocument = {
  encoding: "ganksoft.editor/1",
  assets: [],
  markdown:
    '# 正文验证\n\n中文输入与 **加粗**、*强调*。\n\n- 列表一\n- 列表二\n\n| 名称 | 数值 |\n| --- | --- |\n| 中文 | 30 |\n\n行内 $x^2+1$。\n\n$$\n\\frac{a}{b}\n$$\n\n<span data-gank-color="#b91c1c">彩色文字</span> 与 [链接](https://example.org)。\n',
};
const key = ref(0),
  visible = ref(false),
  deck = ref(""),
  message = ref(""),
  failSave = ref(false);
const document = shallowRef<EditorDocument>(initial),
  saved = shallowRef<EditorDocument>(initial),
  revision = ref(0),
  events = ref<string[]>([]);
const editor = shallowRef<{
  handle?: MarkdownEditorHandle;
  save(): Promise<void>;
}>();
const adapter = {
  async save(
    value: EditorDocument,
    expectedRevision: number,
    signal: AbortSignal,
  ) {
    if (signal.aborted) throw Error("SAVE_ABORTED");
    if (failSave.value) throw Error("VALIDATION_SAVE_FAILURE");
    if (expectedRevision !== revision.value) throw Error("REVISION_CONFLICT");
    saved.value = structuredClone(value);
    revision.value++;
    return { revision: revision.value };
  },
};
// Validation-only observation; do not replace the real media service or its errors.
const mediaTrace: Record<string, unknown>[] = [];
function tracedMediaAdapter(deckId: string) {
  const adapter = electronMediaAdapter(deckId);
  return {
    async stageClipboard() {
      const row: Record<string, unknown> = {
        stage: "media.stage",
        status: "started",
      };
      mediaTrace.push(row);
      try {
        const assets = await adapter.stageClipboard();
        Object.assign(row, { status: "resolved", assets });
        return assets;
      } catch (error) {
        Object.assign(row, { status: "rejected", error: String(error) });
        throw error;
      }
    },
  };
}
async function start() {
  // This page is built/launched only by the isolated validation tool; no normal app navigation exposes it.
  const catalog = await services.workspace.read(["catalog"], null);
  deck.value = catalog.decks.find((d) => d.kind === "question")!.id;
  visible.value = true;
}
function reopen() {
  visible.value = false;
  setTimeout(() => {
    document.value = structuredClone(saved.value);
    key.value++;
    visible.value = true;
  }, 0);
}
const api = {
  get mediaTrace() {
    return structuredClone(mediaTrace);
  },
  get handle() {
    return editor.value?.handle;
  },
  get saved() {
    return structuredClone(saved.value);
  },
  get current() {
    return structuredClone(document.value);
  },
  setInitial(value: EditorDocument) {
    visible.value = false;
    document.value = structuredClone(value);
    saved.value = structuredClone(value);
    setTimeout(() => {
      key.value++;
      visible.value = true;
    }, 0);
  },
  async tableRegression() {
    const { tableRegression } =
      await import("../../tools/editor-spike/table-regression");
    return tableRegression();
  },
  async pasteRegression() {
    const { pasteRegression } =
      await import("../../tools/editor-spike/paste-regression");
    return pasteRegression(editor.value!.handle!.snapshot().assets[0]);
  },
  async nativeTableRace() {
    const [{ Crepe }, { editorViewCtx }] = await Promise.all([
      import("@milkdown/crepe"),
      import("@milkdown/kit/core"),
    ]);
    const host = window.document.createElement("div");
    host.id = "native-table-race";
    window.document.body.append(host);
    const c = new Crepe({
      root: host,
      defaultValue:
        "# 原生候选\n\n| 列一 | 列二 |\n| --- | --- |\n| 中文 | 输入 |\n",
    });
    try {
      await c.create();
      const cell = host.querySelector("td p")!;
      const rect = cell.getBoundingClientRect();
      cell.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          clientX: rect.x + 3,
          clientY: rect.y + 3,
        }),
      );
      c.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        view.dispatch(view.state.tr.insertText("中", 1));
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { markdown: c.getMarkdown() };
    } finally {
      await c.destroy();
      host.remove();
    }
  },
  async nativeProbe(markdown: string) {
    const { Crepe } = await import("@milkdown/crepe");
    const host = window.document.createElement("div");
    window.document.body.append(host);
    const c = new Crepe({ root: host, defaultValue: markdown });
    try {
      await c.create();
      return {
        markdown: c.getMarkdown(),
        html: host.innerHTML,
        color: host.querySelector("span[data-gank-color]")
          ? getComputedStyle(host.querySelector("span[data-gank-color]")!).color
          : null,
      };
    } finally {
      await c.destroy();
      host.remove();
    }
  },
  async mountPeer() {
    const { createMarkdownEditor } = await import("../editor/milkdown-adapter");
    const host = window.document.createElement("div");
    host.id = "peer";
    window.document.body.append(host);
    const peer = await createMarkdownEditor(
      host,
      { encoding: "ganksoft.editor/1", markdown: "独立实例", assets: [] },
      { stageClipboard: async () => [] },
      () => {},
      () => {},
    );
    return {
      snapshot: () => peer.snapshot(),
      destroy: async () => {
        await peer.destroy();
        host.remove();
      },
    };
  },
  reopen,
  get revision() {
    return revision.value;
  },
};
// This standalone validation build is never imported by src/main.ts.
Object.assign(window, { editorSpike: api });
</script>
<template>
  <main>
    <h1>MarkdownEditor + Media 独立验证</h1>
    <p>
      仅使用验证工具创建的临时数据目录。自动保存目标为内存适配器，不是正式草稿或发布。
    </p>
    <button v-if="!deck" @click="start">开始隔离验证</button>
    <template v-else
      ><label><input type="checkbox" v-model="failSave" />注入保存失败</label>
      <button @click="reopen">销毁并重建</button>
      <MarkdownEditor
        v-if="visible"
        :key="key"
        ref="editor"
        :initial="document"
        :revision="revision"
        :document-adapter="adapter"
        :media-adapter="tracedMediaAdapter(deck)"
        @changed="document = $event"
        @save-state="events.push($event)"
        @failure="message = $event"
      />
      <p role="status">{{ message }}</p>
      <details>
        <summary>序列化结果 / 保存事件</summary>
        <pre>{{ saved }}</pre>
        <pre>{{ events }}</pre>
      </details>
    </template>
  </main>
</template>
<style>
body {
  margin: 0;
  background: #f5f7fa;
  font: 15px system-ui;
  color: #172033;
}
main {
  max-width: 1000px;
  margin: 32px auto;
  padding: 0 24px;
}
button {
  cursor: pointer;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
h1 {
  font-size: 24px;
}
</style>
