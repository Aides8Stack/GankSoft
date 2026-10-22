import { Crepe } from "@milkdown/crepe";
import { installTableInteraction } from "./table-interaction";
import {
  editorViewCtx,
  editorViewOptionsCtx,
  parserCtx,
  remarkStringifyOptionsCtx,
} from "@milkdown/kit/core";
import { imageSchema } from "@milkdown/kit/preset/commonmark";
import { uploadConfig } from "@milkdown/kit/plugin/upload";
import { $markSchema, $remark } from "@milkdown/kit/utils";
import { toggleMark } from "@milkdown/kit/prose/commands";
import { Slice } from "@milkdown/kit/prose/model";
import { TextSelection } from "@milkdown/kit/prose/state";
import {
  Asset,
  colorValue,
  parsePlacement,
  placementUrl,
  readDocument,
  resourceUrl,
  safeLink,
  type EditorDocument,
  type EditorAsset,
} from "../../shared/editor/document.ts";
import type { EditorMediaAdapter } from "./media-adapter";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

// This closed extension is deliberately not a general HTML renderer.
type Ast = {
  type: string;
  value?: string;
  url?: string;
  identifier?: string;
  color?: string;
  children?: Ast[];
};
function transform(tree: Ast, assets: readonly EditorAsset[]) {
  const placements = new Set<string>();
  function walk(parent: Ast) {
    const result: Ast[] = [],
      stack: Ast[] = [];
    for (const n of parent.children ?? []) {
      if (n.type === "html") {
        const m = /^<span data-gank-color="(#[0-9a-f]{6})">$/.exec(
          n.value ?? "",
        );
        if (m) {
          const group: Ast = {
            type: "gankColor",
            color: colorValue(m[1]),
            children: [],
          };
          (stack.at(-1)?.children ?? result).push(group);
          stack.push(group);
          continue;
        }
        if (n.value === "</span>" && stack.length) {
          stack.pop();
          continue;
        }
        throw Error("UNSUPPORTED_HTML");
      }
      if (
        (n.type === "link" || n.type === "definition") &&
        !safeLink(n.url ?? "")
      )
        throw Error("UNSAFE_LINK");
      if (n.type === "image") {
        const p = parsePlacement(n.url ?? "");
        resourceUrl(n.url!, assets);
        if (placements.has(p.placementId))
          throw Error("MEDIA_PLACEMENT_DUPLICATE");
        placements.add(p.placementId);
      }
      // Reference images would bypass per-placement identity; reject explicitly.
      if (n.type === "imageReference")
        throw Error("UNSUPPORTED_IMAGE_REFERENCE");
      walk(n);
      (stack.at(-1)?.children ?? result).push(n);
    }
    if (stack.length) throw Error("COLOR_SPAN_UNCLOSED");
    if (parent.children) parent.children = result;
  }
  walk(tree);
}
const color = $markSchema("gankColor", () => ({
  attrs: { color: { default: "#000000" } },
  parseDOM: [
    {
      tag: "span[data-gank-color]",
      getAttrs: (dom) => ({
        color: colorValue((dom as HTMLElement).dataset.gankColor ?? ""),
      }),
    },
  ],
  toDOM: (mark) => [
    "span",
    {
      "data-gank-color": colorValue(mark.attrs.color),
      style: `color:${colorValue(mark.attrs.color)}`,
    },
    0,
  ],
  parseMarkdown: {
    match: (n) => n.type === "gankColor",
    runner: (s, n, type) => {
      s.openMark(type, { color: n.color });
      s.next(n.children);
      s.closeMark(type);
    },
  },
  toMarkdown: {
    match: (m) => m.type.name === "gankColor",
    runner: (s, m) => {
      s.withMark(m, "gankColor", undefined, { color: m.attrs.color });
    },
  },
}));
export interface MarkdownEditorHandle {
  snapshot(): EditorDocument;
  placements(): { placementId: string; width: number }[];
  insertImage(asset: EditorAsset, width: number): void;
  setWidth(placementId: string, width: number): void;
  setColor(value: string): void;
  select(from: number, to: number): void;
  destroy(): Promise<void>;
}
export async function createMarkdownEditor(
  root: HTMLElement,
  initial: EditorDocument,
  media: EditorMediaAdapter,
  changed: (doc: EditorDocument) => void,
  failure: (message: string) => void,
): Promise<MarkdownEditorHandle> {
  const document = readDocument(initial);
  let assets = [...document.assets],
    alive = true,
    ready = false;
  const safe = $remark(
    "gank-safe-markdown",
    () => () => (tree: Ast) => transform(tree, assets),
  );
  const image = imageSchema.extendSchema((prev) => (ctx) => ({
    ...prev(ctx),
    parseDOM: [
      {
        tag: "img[data-gank-placement]",
        getAttrs: (dom) => {
          const d = dom as HTMLImageElement;
          parsePlacement(d.dataset.gankPlacement!);
          return { src: d.dataset.gankPlacement, alt: d.alt, title: d.title };
        },
      },
    ],
    toDOM: (node) => {
      try {
        const p = parsePlacement(node.attrs.src);
        return [
          "img",
          {
            src: resourceUrl(node.attrs.src, assets),
            alt: node.attrs.alt,
            title: node.attrs.title,
            "data-gank-placement": node.attrs.src,
            style: `width:${p.width}%;height:auto`,
          },
        ];
      } catch {
        return ["span", { "data-media-error": "true" }, "图片引用无效"];
      }
    },
  }));
  const crepe = new Crepe({
    root,
    defaultValue: document.markdown,
    features: {
      [Crepe.Feature.ImageBlock]: false,
      [Crepe.Feature.AI]: false,
      [Crepe.Feature.TopBar]: false,
    },
    featureConfigs: {
      [Crepe.Feature.Latex]: {
        katexOptions: {
          trust: false,
          strict: "error",
          maxExpand: 200,
          maxSize: 20,
        },
      },
    },
  });
  await installTableInteraction(crepe.editor);
  const snapshot = () => {
    const markdown = crepe.getMarkdown();
    // Reparse to validate typed/input-rule-created nodes before any save event.
    crepe.editor.action((ctx) => {
      if (!ctx.get(parserCtx)(markdown)) throw Error("MARKDOWN_PARSE_FAILED");
    });
    return readDocument({ encoding: "ganksoft.editor/1", markdown, assets });
  };
  const insertImage = (asset: EditorAsset, width: number) => {
    if (!alive) return;
    asset = Asset.parse(asset);
    const known = assets.find((a) => a.id === asset.id);
    if (known && JSON.stringify(known) !== JSON.stringify(asset))
      throw Error("MEDIA_ASSET_CONFLICT");
    if (!known) assets.push(asset);
    const src = placementUrl({
      assetId: asset.id,
      placementId: crypto.randomUUID(),
      width,
    });
    crepe.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      view.dispatch(
        view.state.tr.replaceSelectionWith(
          view.state.schema.nodes.image.create({ src, alt: "图片", title: "" }),
        ),
      );
    });
  };
  crepe.editor
    .use(image)
    .use(color)
    .use(safe)
    .config((ctx) => {
      ctx.update(remarkStringifyOptionsCtx, (prev) => ({
        ...prev,
        handlers: {
          ...prev.handlers,
          gankColor: (n: any, _parent: any, state: any, info: any) =>
            `<span data-gank-color="${colorValue(n.color)}">${state.containerPhrasing(n, info)}</span>`,
        },
      }));
      ctx.update(uploadConfig.key, (prev) => ({
        ...prev,
        uploader: async () => {
          failure("仅支持通过本地媒体服务粘贴图片");
          return [];
        },
      }));
      ctx.update(editorViewOptionsCtx, (prev) => ({
        ...prev,
        handlePaste: (view, event) => {
          event.preventDefault();
          if (
            Array.from(event.clipboardData?.items ?? []).some((i) =>
              i.type.startsWith("image/"),
            )
          ) {
            // Retain the insertion location across asynchronous platform staging.
            const bookmark = view.state.selection.getBookmark(),
              beforeDoc = view.state.doc;
            void media
              .stageClipboard()
              .then((result) => {
                if (!alive) return;
                if (!result.length) throw Error("CLIPBOARD_IMAGE_EMPTY");
                // A concurrent edit can invalidate a raw bookmark; reject instead of inserting into the wrong location.
                if (
                  !view.state.doc.eq(beforeDoc) ||
                  !view.state.selection.eq(bookmark.resolve(view.state.doc))
                )
                  throw Error("MEDIA_INSERTION_MOVED_RETRY");
                result.forEach((a) => insertImage(a, 80));
              })
              .catch((e) => {
                if (alive) failure(String(e));
              });
          } else {
            try {
              const text = event.clipboardData?.getData("text/plain") ?? "";
              const doc = crepe.editor.action((ctx) =>
                ctx.get(parserCtx)(text),
              );
              if (!doc) throw Error("MARKDOWN_PARSE_FAILED");
              view.dispatch(
                view.state.tr.replaceSelection(new Slice(doc.content, 0, 0)),
              );
            } catch (e) {
              failure(String(e));
            }
          }
          return true;
        },
        handleDrop: (_view, event) => {
          event.preventDefault();
          failure("拖放未接入；请使用本地图片粘贴");
          return true;
        },
        handleClickOn: (_view, _pos, _node, _nodePos, event) => {
          if ((event.target as HTMLElement).closest("a")) {
            event.preventDefault();
            return true;
          }
          return false;
        },
      }));
    });
  crepe.on((api) =>
    api.markdownUpdated(() => {
      if (!ready || !alive) return;
      try {
        changed(snapshot());
      } catch (e) {
        failure(String(e));
      }
    }),
  );
  try {
    await crepe.create();
    ready = true;
    snapshot();
  } catch (e) {
    alive = false;
    await crepe.destroy().catch(() => {});
    throw e;
  }
  return {
    snapshot,
    insertImage,
    placements() {
      return crepe.editor.action((ctx) => {
        const result: { placementId: string; width: number }[] = [];
        ctx.get(editorViewCtx).state.doc.descendants((n) => {
          if (n.type.name === "image") {
            const p = parsePlacement(n.attrs.src);
            result.push({ placementId: p.placementId, width: p.width });
          }
        });
        return result;
      });
    },
    setWidth(placementId, width) {
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        let found = false;
        const tr = view.state.tr;
        view.state.doc.descendants((n, pos) => {
          if (n.type.name !== "image") return;
          const p = parsePlacement(n.attrs.src);
          if (p.placementId === placementId) {
            found = true;
            tr.setNodeMarkup(pos, undefined, {
              ...n.attrs,
              src: placementUrl({ ...p, width }),
            });
          }
        });
        if (!found) throw Error("MEDIA_PLACEMENT_NOT_FOUND");
        view.dispatch(tr);
      });
    },
    setColor(value) {
      colorValue(value);
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        toggleMark(color.type(ctx), { color: value })(
          view.state,
          view.dispatch,
        );
        view.focus();
      });
    },
    select(from, to) {
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        view.dispatch(
          view.state.tr.setSelection(
            TextSelection.create(view.state.doc, from, to),
          ),
        );
        view.focus();
      });
    },
    async destroy() {
      alive = false;
      ready = false;
      await crepe.destroy();
    },
  };
}
