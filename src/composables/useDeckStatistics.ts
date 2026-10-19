import type { Ref } from "vue";
import type {
  CollectionStatistics,
  DeckInsights,
} from "../../shared/review-analytics";
import { ref, watch, onBeforeUnmount } from "vue";
import { services } from "../services";
import { state } from "../store";
import {
  DateSelection,
  type DateSelectionInput,
} from "../../shared/workspace-contracts";
/** Both views share the DTO, range validation, request sequencing and backend window. */
type Result<T> = {
  selection: Ref<DateSelectionInput>;
  data: Ref<T | null>;
  failure: Ref<string>;
  loading: Ref<boolean>;
  load: () => Promise<void>;
};
export function useDeckStatistics(
  deck: () => string,
  kind: "collection",
): Result<CollectionStatistics>;
export function useDeckStatistics(
  deck: () => string,
  kind: "analysis",
): Result<DeckInsights>;
export function useDeckStatistics(
  deck: () => string,
  kind: "collection" | "analysis",
) {
  const selection = ref<DateSelectionInput>({ range: "30" }),
    data = ref<CollectionStatistics | DeckInsights | null>(null),
    failure = ref(""),
    loading = ref(false);
  let sequence = 0;
  async function load() {
    const seq = ++sequence;
    data.value = null;
    failure.value = "";
    loading.value = false;
    const parsed = DateSelection.safeParse(selection.value);
    if (!parsed.success) {
      failure.value = "请选择有效的起止日期";
      return;
    }
    loading.value = true;
    try {
      const result =
        kind === "collection"
          ? await services.analytics.collection(deck(), parsed.data)
          : await services.analytics.deck(deck(), parsed.data);
      if (seq === sequence && result.deckId === deck()) data.value = result;
    } catch (e) {
      if (seq === sequence) failure.value = String(e);
    } finally {
      if (seq === sequence) loading.value = false;
    }
  }
  watch(
    () => [deck(), selection.value, state.value?.meta.dataRevision],
    () => void load(),
    { immediate: true, deep: true },
  );
  onBeforeUnmount(() => sequence++);
  return { selection, data, failure, loading, load };
}
