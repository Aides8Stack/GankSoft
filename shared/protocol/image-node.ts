import { z } from "zod";
export const ImageRole = z.enum(["question", "analysis", "option-A", "option-B", "option-C", "option-D"]);
export type ImageRole = z.infer<typeof ImageRole>;
const unit = z.number().finite().min(0).max(1);
export const ImageEditSchema = z.strictObject({
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  flipX: z.boolean(), flipY: z.boolean(),
  crop: z.strictObject({ x: unit, y: unit, width: unit.min(0.01), height: unit.min(0.01) })
    .refine(c => c.x + c.width <= 1.000001 && c.y + c.height <= 1.000001, "裁剪超出原图"),
  annotations: z.array(z.strictObject({ text: z.string().trim().min(1).max(120), x: unit, y: unit,
    color: z.enum(["#d32f2f", "#1565c0", "#111111", "#ffffff"]) })).max(20),
});
export type ImageEdit = z.infer<typeof ImageEditSchema>;
export interface ImageLayout {
  widthPx: number;
  alignment: "left" | "center" | "right";
  fit: "contain" | "cover";
  edit?: ImageEdit;
}
export interface ImageNodeRef { id: string; layout?: ImageLayout; }
export const ImageLayoutSchema = z.strictObject({
  widthPx: z.number().int().min(64).max(2400).default(360),
  alignment: z.enum(["left", "center", "right"]).default("left"),
  fit: z.enum(["contain", "cover"]).default("contain"),
  edit: ImageEditSchema.optional(),
});
export const imageLayout = (value?: unknown): ImageLayout => {
  const result = ImageLayoutSchema.parse(value === undefined ? {} : value);
  if (result.edit === undefined) delete result.edit;
  return result;
};
export const defaultImageEdit = (): ImageEdit => ({ rotation: 0, flipX: false, flipY: false,
  crop: { x: 0, y: 0, width: 1, height: 1 }, annotations: [] });
export function resizedWidth(width: number, deltaX: number) {
  return Math.max(64, Math.min(2400, Math.round(width + deltaX)));
}
/** A clipped SVG viewport; original bytes never change. Annotation coordinates refer to the final viewport. */
export function imagePresentation(width: number, height: number, value?: ImageEdit) {
  const edit = ImageEditSchema.parse(value ?? defaultImageEdit());
  const c = edit.crop, w = Math.max(1, width) * c.width, h = Math.max(1, height) * c.height;
  const turned = edit.rotation === 90 || edit.rotation === 270;
  const outWidth = turned ? h : w, outHeight = turned ? w : h;
  return { width: outWidth, height: outHeight,
    transform: `translate(${outWidth / 2} ${outHeight / 2}) rotate(${edit.rotation}) scale(${edit.flipX ? -1 : 1} ${edit.flipY ? -1 : 1}) translate(${-width * (c.x + c.width / 2)} ${-height * (c.y + c.height / 2)})` };
}
