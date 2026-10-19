import { ref, computed, watch } from "vue";
import { services } from "../services";
import { notice, error } from "../store";
import type { AppMessage } from "../../shared/workspace-contracts";
export const messages = ref<AppMessage[]>([]),
  messageFailure = ref("");
export const unreadMessages = computed(
  () => messages.value.filter((m) => !m.read).length,
);
let pending = Promise.resolve();
export async function loadMessages() {
  await pending;
  try {
    messages.value = await services.messages.list();
    messageFailure.value = "";
  } catch (e) {
    messageFailure.value = String(e);
  }
}
export function notify(kind: AppMessage["kind"], text: string) {
  pending = pending.then(async () => {
    try {
      const m = await services.messages.append(kind, text.slice(0, 4000));
      messages.value = [m, ...messages.value];
    } catch (e) {
      messageFailure.value = "消息记录失败：" + String(e);
    }
  });
  return pending;
}
export function startNotifications() {
  const stop = watch(
    [notice, error],
    ([n, e], [oldN, oldE]) => {
      if (n && n !== oldN)
        void notify(n.includes("已取消") ? "info" : "success", n);
      if (e && e !== oldE) void notify("error", e);
    },
    { flush: "sync" },
  );
  void loadMessages();
  return stop;
}
export async function markMessagesRead() {
  await pending;
  await services.messages.read();
  messages.value = messages.value.map((m) => ({ ...m, read: true }));
}
