import { id, one, run, type Context } from "../infrastructure/context.ts";
import {
  Preferences,
  Message,
  type AppMessage,
} from "../../shared/workspace-contracts.ts";
function read(ctx: Context, key: string, fallback: any) {
  try {
    return (
      JSON.parse(
        one(ctx, "SELECT value FROM settings WHERE key=?", key)?.value ||
          "null",
      ) ?? fallback
    );
  } catch {
    return fallback;
  }
}
function write(ctx: Context, key: string, value: unknown) {
  run(
    ctx,
    "INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)",
    key,
    JSON.stringify(value),
  );
}
export function getPreferences(ctx: Context) {
  return Preferences.parse(read(ctx, "ui-preferences", { theme: "light" }));
}
export function setPreferences(ctx: Context, p: unknown) {
  const value = Preferences.parse(p);
  write(ctx, "ui-preferences", value);
  return value;
}
export function listMessages(ctx: Context): AppMessage[] {
  return Message.array().parse(read(ctx, "ui-messages", []));
}
export function appendMessage(
  ctx: Context,
  p: { kind: AppMessage["kind"]; text: string },
) {
  // Keep connection secrets out of user-visible persisted notifications.
  const text = p.text
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[密钥已隐藏]")
    .slice(0, 4000);
  const row = Message.parse({
    id: id(),
    kind: p.kind,
    text,
    createdAt: ctx.now().toISOString(),
    read: false,
  });
  write(ctx, "ui-messages", [row, ...listMessages(ctx)]);
  return row;
}
export function markMessages(ctx: Context, p: { ids?: string[] }) {
  const rows = listMessages(ctx).map((r) =>
    !p.ids || p.ids.includes(r.id) ? { ...r, read: true } : r,
  );
  write(ctx, "ui-messages", rows);
  return true as const;
}
