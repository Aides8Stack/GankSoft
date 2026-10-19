import test from "node:test";
import assert from "node:assert/strict";
import {
  createImageBindingLoader,
  setImageBindingReporter,
} from "../electron/infrastructure/image-binding.ts";
import { validateImage } from "../electron/infrastructure/images.ts";
import { Transformer } from "@napi-rs/image";

test("a missing optional addon cannot prevent importing the application; explicit Windows MSVC path avoids generated ABI selection", () => {
  const requested: string[] = [];
  let unavailable = true;
  const load = createImageBindingLoader("win32", "x64", (name) => {
    requested.push(name);
    if (unavailable)
      throw Object.assign(new Error("DLL initialization failed"), {
        code: "ERR_DLOPEN_FAILED",
      });
    return { Transformer };
  });
  assert.equal(requested.length, 0);
  const causes: unknown[] = [];
  setImageBindingReporter((cause) => causes.push(cause));
  assert.throws(
    load,
    (e: any) => e.code === "IMAGE_DECODER_UNAVAILABLE" && e.retryable,
  );
  assert.equal((causes[0] as any).code, "ERR_DLOPEN_FAILED");
  unavailable = false;
  assert.equal(load(), Transformer);
  assert.equal(load(), Transformer);
  assert.deepEqual(requested, [
    "@napi-rs/image-win32-x64-msvc",
    "@napi-rs/image-win32-x64-msvc",
  ]);
});

test("lazy image validation still fully decodes PNG/JPEG/WebP and rejects corrupt or mislabelled bytes", () => {
  const image = Transformer.fromRgbaPixels(Buffer.from([0, 0, 0, 255]), 1, 1);
  for (const [bytes, mime] of [
    [image.pngSync(), "image/png"],
    [image.jpegSync(), "image/jpeg"],
    [image.webpSync(), "image/webp"],
  ] as const) {
    assert.doesNotThrow(() => validateImage(bytes, mime));
    assert.throws(() => validateImage(bytes.subarray(0, 16), mime));
  }
  assert.throws(() => validateImage(image.pngSync(), "image/jpeg"));
  assert.throws(() => validateImage(Buffer.alloc(0), "image/png"));
});
