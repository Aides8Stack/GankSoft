import { z } from "zod";
export const ImageRole = z.enum(["question", "analysis", "option-A", "option-B", "option-C", "option-D"]);
export type ImageRole = z.infer<typeof ImageRole>;
export interface ImageLayout {
  widthPx: number;
  alignment: "left" | "center" | "right";
  fit: "contain" | "cover";
}
export interface ImageNodeRef { id: string; layout?: ImageLayout; }
export const ImageLayoutSchema = z.strictObject({
  widthPx: z.number().int().min(64).max(2400).default(360),
  alignment: z.enum(["left", "center", "right"]).default("left"),
  fit: z.enum(["contain", "cover"]).default("contain"),
});
export const imageLayout = (value?: unknown): ImageLayout => ImageLayoutSchema.parse(value ?? {});
export function resizedWidth(width: number, deltaX: number) {
  return Math.max(64, Math.min(2400, Math.round(width + deltaX)));
}
