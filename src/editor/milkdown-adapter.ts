import { Crepe } from "@milkdown/crepe";
import { installTableInteraction } from "./table-interaction";
import {
  editorViewCtx,
  editorViewOptionsCtx,
  parserCtx,
  remarkStringifyOptionsCtx,
} from "@milkdown/kit/core";
import { imageSchema } from "@milkdown/kit/preset/commonmark";
import { uploadPlugin } from "@milkdown/kit/plugin/upload";
import { $markSchema, $prose, $remark } from "@milkdown/kit/utils";
import { toggleMark } from "@milkdown/kit/prose/commands";
import { Fragment, Slice } from "@milkdown/kit/prose/model";
import {
  Plugin,
  PluginKey,
  TextSelection,
  NodeSelection,
  type Selection,
} from "@milkdown/kit/prose/state";
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
  hasChanges(): boolean;
  snapshot(): EditorDocument;
  placements(): { placementId: string; width: number }[];
  focusImage(assetId:string):void;
  reinsertImage(asset:EditorAsset,width:number):void;
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
  options: { readOnly?: boolean } = {},
): Promise<MarkdownEditorHandle> {
  const document = readDocument(initial);
  let assets = [...document.assets],
    alive = true,
    ready = false;
  let pastePending = false;
  let initialContentVersion = 0;
  // A content edit followed by undo must still invalidate pending external work.
  const contentVersion = new PluginKey<number>("gank-image-paste-content");
  const contentObserver = $prose(
    () =>
      new Plugin<number>({
        key: contentVersion,
        state: {
          init: () => 0,
          apply: (tr, version) => (tr.docChanged ? version + 1 : version),
        },
      }),
  );
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
  // ImageBlock is disabled: the default uploader would create blob: identities
  // outside the media service. Remove its event plugin through the public API.
  await crepe.editor.remove(uploadPlugin);
  const hasChanges = () => crepe.editor.action(ctx =>
    (contentVersion.getState(ctx.get(editorViewCtx).state) ?? 0) !== initialContentVersion);
  const serializeSnapshot = () => {
    const markdown = crepe.getMarkdown();
    // Reparse to validate typed/input-rule-created nodes before any save event.
    crepe.editor.action((ctx) => {
      if (!ctx.get(parserCtx)(markdown)) throw Error("MARKDOWN_PARSE_FAILED");
    });
    return readDocument({ encoding: "ganksoft.editor/1", markdown, assets });
  };
  // The source bytes belong to persistence. Serialization belongs to real edits.
  const snapshot = () => hasChanges() ? serializeSnapshot() : readDocument(document);
  const insertImages = (
    result: EditorAsset[],
    width: number,
    target?: Selection,
  ) => {
    if (!alive) return;
    const nextAssets = [...assets];
    const sources = result.map((value) => {
      const asset = Asset.parse(value);
      const known = nextAssets.find((a) => a.id === asset.id);
      if (known && JSON.stringify(known) !== JSON.stringify(asset))
        throw Error("MEDIA_ASSET_CONFLICT");
      if (!known) nextAssets.push(asset);
      return placementUrl({
        assetId: asset.id,
        placementId: crypto.randomUUID(),
        width,
      });
    });
    crepe.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const tr = view.state.tr;
      if (target) tr.setSelection(target);
      tr.replaceSelection(
        new Slice(
          Fragment.fromArray(
            sources.map((src) =>
              view.state.schema.nodes.image.create({
                src,
                alt: "图片",
                title: "",
              }),
            ),
          ),
          0,
          0,
        ),
      );
      // Validate the whole batch/transaction before exposing any new asset reference.
      assets = nextAssets;
      view.dispatch(tr);
    });
  };
  const insertImage = (asset: EditorAsset, width: number) =>
    insertImages([asset], width);
  crepe.editor
    .use(contentObserver)
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
      ctx.update(editorViewOptionsCtx, (prev) => ({
        ...prev,
        handlePaste: (view, event) => {
          if(options.readOnly) return false;
          if (
            Array.from(event.clipboardData?.items ?? []).some((i) =>
              i.type.startsWith("image/"),
            )
          ) {
            event.preventDefault();
            if (pastePending) {
              failure("MEDIA_PASTE_IN_PROGRESS_RETRY");
              return true;
            }
            const before = view.state,
              selection = before.selection,
              bookmark = selection.getBookmark(),
              version = contentVersion.getState(before);
            pastePending = true;
            void (async () => {
              try {
                const result = await media.stageClipboard();
                if (!alive || view.isDestroyed) return;
                if (!result.length) throw Error("CLIPBOARD_IMAGE_EMPTY");
                const current = view.state;
                // Policy rejects every document transaction, so no document mapping is
                // needed/allowed. Selection-only transactions leave bookmark positions valid.
                if (
                  version === undefined ||
                  contentVersion.getState(current) !== version ||
                  !current.doc.eq(before.doc)
                )
                  throw Error("MEDIA_INSERTION_DOCUMENT_CHANGED_RETRY");
                const target = bookmark.resolve(current.doc);
                // Bookmark.resolve may fall back to a nearby selection. Never accept that.
                if (!target.eq(selection))
                  throw Error("MEDIA_INSERTION_TARGET_INVALID");
                insertImages(result, 80, target);
              } catch (e) {
                if (alive) failure(String(e));
              } finally {
                pastePending = false;
              }
            })();
          } else {
            try {
              const text = event.clipboardData?.getData("text/plain") ?? "";
              const html = event.clipboardData?.getData("text/html") ?? "";
              // Keep untrusted HTML out of the DOM parser. For plain text,
              // validate the business contract then let Milkdown's clipboard
              // plugin handle code, slice boundaries, marks and insertion.
              if (!html && view.state.selection.$from.parent.type.spec.code)
                return false;
              const doc = crepe.editor.action((ctx) =>
                ctx.get(parserCtx)(text),
              );
              if (!doc) throw Error("MARKDOWN_PARSE_FAILED");
              if (!html) return false;
              event.preventDefault();
              view.dispatch(
                view.state.tr.replaceSelection(new Slice(doc.content, 0, 0)),
              );
            } catch (e) {
              event.preventDefault();
              failure(String(e));
            }
          }
          return true;
        },
        handleDrop: (_view, event) => {
          if(options.readOnly) return false;
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
    api.markdownUpdated((_ctx, markdown, previousMarkdown) => {
      // Milkdown can emit an update with identical serialized content after
      // initialization or selection changes. It is not a user content edit.
      if (!ready || !alive || !hasChanges() || markdown === previousMarkdown) return;
      try {
        changed(snapshot());
      } catch (e) {
        failure(String(e));
      }
    }),
  );
  try {
    crepe.setReadonly(!!options.readOnly);
    await crepe.create();
    // Settle native appendTransaction initialization while still loading. In Crepe
    // 7.22.3 the trailing paragraph otherwise arrives on the first selection-only
    // transaction (e.g. blur on view switch), falsely making an untouched list dirty.
    // A neutral public transaction runs the same native plugins without a timer.
    crepe.editor.action(ctx => {
      const view = ctx.get(editorViewCtx);
      view.dispatch(view.state.tr);
      initialContentVersion = contentVersion.getState(view.state) ?? 0;
    });
    serializeSnapshot();
    ready = true;
  } catch (e) {
    alive = false;
    await crepe.destroy().catch(() => {});
    throw e;
  }
  return {
    hasChanges,
    snapshot,
    insertImage,
    reinsertImage(asset,width){crepe.editor.action(ctx=>{const view=ctx.get(editorViewCtx);view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(view.state.selection.to))));});insertImage(asset,width);},
    focusImage(assetId){crepe.editor.action(ctx=>{const view=ctx.get(editorViewCtx);let found=false;view.state.doc.descendants((n,pos)=>{if(found||n.type.name!=='image')return;if(parsePlacement(n.attrs.src).assetId===assetId){found=true;view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc,pos)).scrollIntoView());view.focus();}});});},
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
      // Revoke editing synchronously; native plugin teardown is asynchronous.
      crepe.setReadonly(true);
      await crepe.destroy();
    },
  };
}
