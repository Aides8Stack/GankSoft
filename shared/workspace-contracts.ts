import { z } from "zod";
import { validDateRange } from "./date-range.ts";
export const DateSelection = z
  .strictObject({
    range: z.enum(["7", "30", "all", "custom"]).default("30"),
    start: z.string().optional(),
    end: z.string().optional(),
  })
  .refine(
    (v) => v.range !== "custom" || validDateRange(v.start || "", v.end || ""),
    "请选择有效的起止日期，开始日期不能晚于结束日期",
  );
export type DateSelectionInput = z.input<typeof DateSelection>;
export const ThemeMode = z.enum(["light", "dark", "system"]);
export const Preferences = z.strictObject({ theme: ThemeMode });
export const Message = z.strictObject({
  id: z.string(),
  kind: z.enum(["success", "info", "error"]),
  text: z.string(),
  createdAt: z.string(),
  read: z.boolean(),
});
export type AppMessage = z.infer<typeof Message>;
