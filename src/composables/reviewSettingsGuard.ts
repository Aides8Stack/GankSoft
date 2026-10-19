import { onBeforeUnmount, onMounted, type ComputedRef } from "vue";
export const reviewSettingsGuards = new Set<() => boolean>();
export function useReviewSettingsGuard(dirty: ComputedRef<boolean>) {
  const guard = () =>
    !dirty.value || confirm("复习配置有未保存修改。放弃这些修改并离开？");
  const unload = (e: BeforeUnloadEvent) => {
    if (dirty.value) {
      e.preventDefault();
      e.returnValue = "";
    }
  };
  onMounted(() => {
    reviewSettingsGuards.add(guard);
    window.addEventListener("beforeunload", unload);
  });
  onBeforeUnmount(() => {
    reviewSettingsGuards.delete(guard);
    window.removeEventListener("beforeunload", unload);
  });
}
