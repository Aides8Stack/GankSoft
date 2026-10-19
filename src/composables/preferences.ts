import { ref } from "vue";
import { services } from "../services";
export type ThemeMode = "light" | "dark" | "system";
export const themeMode = ref<ThemeMode>("light");
export const effectiveTheme = ref<"light" | "dark">("light");
export const themeFailure = ref(""),
  themeSaving = ref(false);
let pendingCount = 0;
const media = window.matchMedia("(prefers-color-scheme: dark)");
function apply() {
  effectiveTheme.value =
    themeMode.value === "system"
      ? media.matches
        ? "dark"
        : "light"
      : themeMode.value;
  document.documentElement.dataset.theme = effectiveTheme.value;
  document.documentElement.style.colorScheme = effectiveTheme.value;
}
media.addEventListener("change", () => {
  if (themeMode.value === "system") apply();
});
let pending = Promise.resolve();
export async function initializeTheme() {
  try {
    themeMode.value = (await services.preferences.get()).theme;
  } catch (e) {
    themeFailure.value = String(e);
  }
  apply();
}
export function updateTheme(mode: ThemeMode) {
  themeMode.value = mode;
  apply();
  themeFailure.value = "";
  pendingCount++;
  themeSaving.value = true;
  pending = pending.then(async () => {
    try {
      await services.preferences.set(mode);
      if (themeMode.value === mode) themeFailure.value = "";
    } catch (e) {
      if (themeMode.value === mode)
        themeFailure.value = "主题保存失败：" + String(e);
    } finally {
      pendingCount--;
      themeSaving.value = pendingCount > 0;
    }
  });
  return pending;
}

export async function flushTheme() {
  await pending;
  return !themeFailure.value;
}
