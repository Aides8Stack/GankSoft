import { ref, watch, onBeforeUnmount } from "vue";
import { services } from "../services";
import { state } from "../store";
import type { StudyFilter } from "../../shared/study-query";
import type { Output } from "../../shared/protocol/registry";
export function useStudyQuery(deckId: string, filters: StudyFilter) {
  const result = ref<Output<"cards.query">>({
      matched: [],
      eligible: [],
      window: { start: null, end: null, timeZone: "Asia/Shanghai" },
    }),
    loading = ref(false),
    failure = ref("");
  let seq = 0,
    timer: ReturnType<typeof setTimeout>,
    disposed = false;
  function update() {
    const generation = ++seq;
    loading.value = true;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const data = await services.studyQuery(
          deckId,
          JSON.parse(JSON.stringify(filters)),
        );
        if (!disposed && generation === seq) {
          result.value = data;
          failure.value = "";
        }
      } catch (e) {
        if (!disposed && generation === seq) failure.value = String(e);
      } finally {
        if (!disposed && generation === seq) loading.value = false;
      }
    }, 250);
  }
  watch([() => JSON.stringify(filters), () => state.value], update, {
    immediate: true,
  });
  onBeforeUnmount(() => {
    disposed = true;
    seq++;
    clearTimeout(timer);
  });
  return { result, loading, failure, update };
}
