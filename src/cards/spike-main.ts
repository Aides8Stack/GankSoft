import { createApp, defineComponent, h, shallowRef } from "vue";
import CardDraftForm from "./CardDraftForm.vue";
import { unifiedCards, unifiedDrafts } from "../services";
import { electronMediaAdapter } from "../editor/media-adapter";
// Isolated development build only, never imported by the normal application.
const q = new URLSearchParams(location.search),
  scope = { cardId: q.get("cardId")!, deckId: q.get("deckId")! };
const Shell = defineComponent({
  async setup() {
    const draft = await unifiedDrafts.get(scope);
    const published = draft ? null : await unifiedCards.getPublishedContent(scope);
    const initial = await unifiedDrafts.previewSwitch({
      ...scope,
      targetType: draft?.draftType ?? published!.mode,
    });
    const form = shallowRef();
    const savedDrafts = shallowRef<Awaited<ReturnType<typeof unifiedDrafts.listSummary>>>();
    const opening = shallowRef(false), error = shallowRef("");
    Object.assign(window, {
      cardDraftSpike: {
        get form() {
          return form.value;
        },
        scope,
      },
    });
    async function createDraft() {
      if (opening.value) return;
      opening.value=true;
      try {
        if (!await form.value.close()) { error.value="请先保存或核对当前操作"; return; }
        const created = await unifiedDrafts.create({ deckId: scope.deckId, initialType: "question" });
        location.search = new URLSearchParams({ cardId: created.cardId, deckId: scope.deckId }).toString();
      } catch(e) { error.value=String(e); } finally { opening.value=false; }
    }
    async function listDrafts(after: string | null = null) {
      try { savedDrafts.value=await unifiedDrafts.listSummary({deckId:scope.deckId,after}); }
      catch(e) { error.value=String(e); }
    }
    return () => h("main", [h("button", { onClick: createDraft, disabled:opening.value, "data-testid": "new-card-draft" }, "新建卡片"),
      h("button", { onClick:()=>listDrafts() }, "恢复草稿"),
      error.value?h("p",{role:"alert"},error.value):null,
      savedDrafts.value?h("nav",{"aria-label":"已保存草稿"},savedDrafts.value.items.map(d=>h("button",{onClick:async()=>{
        if(await form.value.close()) location.search=new URLSearchParams({cardId:d.cardId,deckId:scope.deckId}).toString();
      }},d.title||"未命名草稿"))):null,
      savedDrafts.value?.nextCursor?h("button",{onClick:()=>listDrafts(savedDrafts.value!.nextCursor)},"下一页草稿"):null,
      h(CardDraftForm, {
        ref: form,
        initial,
        draft,
        adapter: unifiedDrafts,
        publish: unifiedCards.publish,
        loadPromptContext: () => unifiedCards.promptContext(scope),
        clipboard: { copy: unifiedCards.clipboardCopy, preview: unifiedCards.clipboardPreview, apply: unifiedCards.clipboardApply },
        mediaAdapter: electronMediaAdapter(scope.deckId),
      })]);
  },
});
import { Suspense } from "vue";
createApp({
  render: () =>
    h(Suspense, null, {
      default: () => h(Shell),
      fallback: () => h("p", "读取草稿…"),
    }),
}).mount("#app");
