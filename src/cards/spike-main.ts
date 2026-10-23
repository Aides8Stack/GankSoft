import { createApp, defineComponent, h, shallowRef } from "vue";
import CardDraftForm from "./CardDraftForm.vue";
import { unifiedCards, unifiedDrafts } from "../services";
import { electronMediaAdapter } from "../editor/media-adapter";
// Isolated development build only, never imported by the normal application.
const q = new URLSearchParams(location.search),
  scope = { cardId: q.get("cardId")!, deckId: q.get("deckId")! };
const Shell = defineComponent({
  async setup() {
    const draft = await unifiedDrafts.get(scope),
      published = await unifiedCards.getPublishedContent(scope);
    const initial = await unifiedDrafts.previewSwitch({
      ...scope,
      targetType: draft?.draftType ?? published.mode,
    });
    const form = shallowRef();
    Object.assign(window, {
      cardDraftSpike: {
        get form() {
          return form.value;
        },
        scope,
      },
    });
    return () =>
      h(CardDraftForm, {
        ref: form,
        initial,
        draft,
        adapter: unifiedDrafts,
        mediaAdapter: electronMediaAdapter(scope.deckId),
      });
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
