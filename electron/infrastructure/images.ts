import { DomainError } from "../../shared/domain-error.ts";
import { getImageTransformer } from "./image-binding.ts";
/** Shared boundary for file picker, clipboard and exchange imports. Decode before any write. */
export function validateImage(bytes: Buffer, mime: string) {
  if (!bytes.length || bytes.length > 20 * 1024 * 1024)
    throw new DomainError("VALIDATION_ERROR", "图片为空或超过20 MB", {
      image: "大小不合法",
    });
  const expected: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/webp": "webp",
  };
  if (!expected[mime])
    throw new DomainError("VALIDATION_ERROR", "图片 MIME 不支持", {
      image: "MIME 不支持",
    });
  const Transformer = getImageTransformer();
  try {
    const image = new Transformer(bytes);
    const info = image.metadataSync();
    if (
      info.format.toLowerCase() !== expected[mime] ||
      info.width < 1 ||
      info.height < 1 ||
      info.width * info.height > 40000000
    )
      throw new Error("格式、尺寸或像素数不合法");
    image.rawPixelsSync();
  } catch {
    throw new DomainError(
      "VALIDATION_ERROR",
      "图片无法解码、尺寸超限或内容与 MIME 不符",
      {
        image: "图片无法完整解码或格式不合法",
      },
    );
  }
}
