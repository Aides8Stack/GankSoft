import { createRequire } from "node:module";
import { DomainError } from "../../shared/domain-error.ts";
import type { Transformer } from "@napi-rs/image";

let reportFailure: (cause: unknown) => void = (cause) =>
  console.error("GankSoft image decoder failed to load:", cause);
export function setImageBindingReporter(report: (cause: unknown) => void) {
  reportFailure = report;
}

type Binding = { Transformer: typeof Transformer };
/** Windows distribution contains the MSVC addon. Do not infer its ABI from Electron's Node build flags. */
export function createImageBindingLoader(
  platform: string,
  arch: string,
  requireBinding: (name: string) => unknown,
) {
  let binding: Binding | undefined;
  return () => {
    if (binding) return binding.Transformer;
    try {
      const name =
        platform === "win32" && arch === "x64"
          ? "@napi-rs/image-win32-x64-msvc"
          : "@napi-rs/image";
      const loaded = requireBinding(name) as Binding;
      if (typeof loaded?.Transformer !== "function")
        throw new Error("Image binding has no Transformer export");
      binding = loaded;
      return binding.Transformer;
    } catch (cause) {
      // Keep the actual loader/DLL error; the upstream generic npm message hides it.
      reportFailure(cause);
      throw new DomainError(
        "IMAGE_DECODER_UNAVAILABLE",
        "图片解码组件加载失败，请保留完整程序目录，并查看启动诊断日志",
        {},
        true,
      );
    }
  };
}

// Loading the module must not load a native addon: library, review, backup and settings can start independently.
export const getImageTransformer = createImageBindingLoader(
  process.platform,
  process.arch,
  createRequire(import.meta.url),
);
