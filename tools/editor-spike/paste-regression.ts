// Real adapter paste handling with controlled staging completion. The asset was
// staged by the full integration test through the real media IPC before this suite.
import { createMarkdownEditor } from "../../src/editor/milkdown-adapter";
import type { EditorAsset, EditorDocument } from "../../shared/editor/document";

const initial: EditorDocument = {
  encoding: "ganksoft.editor/1",
  markdown: "甲乙丙丁\n",
  assets: [],
};
function check(value: unknown, message: string): asserts value {
  if (!value) throw Error("PASTE_REGRESSION: " + message);
}
async function until(test: () => boolean, detail: () => string) {
  const deadline = performance.now() + 5000;
  while (!test()) {
    if (performance.now() > deadline)
      throw Error("PASTE_REGRESSION: " + detail());
    await new Promise(requestAnimationFrame);
  }
}
async function fixture(value = initial) {
  const host = document.createElement("div");
  document.body.append(host);
  const stages: {
    promise: Promise<EditorAsset[]>;
    resolve: (value: EditorAsset[]) => void;
  }[] = [];
  const errors: string[] = [],
    changes: EditorDocument[] = [];
  const handle = await createMarkdownEditor(
    host,
    value,
    {
      stageClipboard() {
        let resolve!: (value: EditorAsset[]) => void;
        const promise = new Promise<EditorAsset[]>((done) => {
          resolve = done;
        });
        stages.push({ promise, resolve });
        return promise;
      },
    },
    (doc) => changes.push(doc),
    (error) => errors.push(error),
  );
  function paste() {
    const data = new DataTransfer();
    data.items.add(
      new File([new Uint8Array([1])], "signal.png", { type: "image/png" }),
    );
    const event = new ClipboardEvent("paste", {
      clipboardData: data,
      bubbles: true,
      cancelable: true,
    });
    host.querySelector(".ProseMirror")!.dispatchEvent(event);
    check(event.defaultPrevented, "paste handler must consume the event");
    return stages.at(-1)!;
  }
  const images = () =>
    host.querySelectorAll<HTMLImageElement>("img[data-gank-placement]").length;
  const complete = (count = 1) =>
    until(
      () => images() === count,
      () => "expected images; " + errors.join(";"),
    );
  async function rejected() {
    await until(
      () => errors.includes("Error: MEDIA_INSERTION_DOCUMENT_CHANGED_RETRY"),
      () => "expected document conflict; " + errors.join(";"),
    );
    check(
      images() === 0 && handle.snapshot().assets.length === 0,
      "rejected paste must not attach asset or node",
    );
  }
  async function edit(text: string) {
    check(
      document.execCommand("insertText", false, text),
      "browser text input must succeed",
    );
    await until(
      () => handle.snapshot().markdown.includes(text),
      () => "text edit was not applied",
    );
  }
  let disposed = false;
  async function destroy() {
    if (disposed) return;
    disposed = true;
    const closing = handle.destroy();
    check(!host.querySelector('.ProseMirror'), 'native view must stop synchronously before asynchronous context cleanup');
    await closing;
    host.remove();
  }
  return {
    host,
    handle,
    stages,
    errors,
    changes,
    paste,
    images,
    complete,
    rejected,
    edit,
    destroy,
  };
}
export async function pasteRegression(asset: EditorAsset) {
  const cases: { case: string; status: "PASS" }[] = [];
  const pass = (name: string) => cases.push({ case: name, status: "PASS" });
  {
    const f = await fixture();
    try {
      f.handle.select(2, 2);
      const before = f.handle.snapshot();
      const stage = f.paste();
      // Only a selection transaction changes: the original implementation rejects this.
      f.handle.select(4, 4);
      check(
        JSON.stringify(f.handle.snapshot()) === JSON.stringify(before),
        "selection-only scenario must not modify content",
      );
      stage.resolve([asset]);
      await f.complete();
      const p = f.host.querySelector(".ProseMirror p")!;
      check(
        p.firstChild?.textContent === "甲" &&
          p.lastChild?.textContent === "乙丙丁",
        "paste must use original bookmark, not new caret",
      );
      check(!f.errors.length, "selection-only change must not fail");
      pass("selection-only-original-target");
    } finally {
      await f.destroy();
    }
  }
  {
    const f = await fixture(),
      button = document.createElement("button");
    document.body.append(button);
    try {
      f.handle.select(3, 3);
      const stage = f.paste();
      button.focus();
      stage.resolve([asset]);
      await f.complete();
      check(
        document.activeElement === button,
        "async completion must not steal focus",
      );
      check(
        f.host.querySelector(".ProseMirror p")?.firstChild?.textContent ===
          "甲乙",
        "blur must retain target",
      );
      pass("blur-without-focus-steal");
    } finally {
      button.remove();
      await f.destroy();
    }
  }
  {
    const f = await fixture();
    try {
      f.handle.select(2, 4);
      const stage = f.paste();
      f.handle.select(1, 1);
      stage.resolve([asset]);
      await f.complete();
      check(
        f.host.querySelector(".ProseMirror p")?.textContent === "甲丁",
        "original selected range must be replaced",
      );
      pass("selected-range-original-target");
    } finally {
      await f.destroy();
    }
  }
  for (const change of ["edit", "edit-undo", "replace-target"]) {
    const f = await fixture();
    try {
      f.handle.select(2, 2);
      const stage = f.paste();
      if (change === "replace-target") f.handle.select(1, 5);
      await f.edit("改");
      if (change === "edit-undo") {
        f.host.querySelector(".ProseMirror")!.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "z",
            code: "KeyZ",
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          }),
        );
        await until(
          () => f.handle.snapshot().markdown === initial.markdown,
          () => "undo must restore original content",
        );
      }
      const before = f.handle.snapshot();
      stage.resolve([asset]);
      await f.rejected();
      check(
        JSON.stringify(before) === JSON.stringify(f.handle.snapshot()),
        "rejection must preserve current content",
      );
      pass(change + "-rejected");
    } finally {
      await f.destroy();
    }
  }
  {
    const f = await fixture();
    try {
      f.handle.select(2, 2);
      f.paste().resolve([asset, { ...asset, mime: "image/jpeg" }]);
      await until(
        () => f.errors.includes("Error: MEDIA_ASSET_CONFLICT"),
        () => "expected conflicting asset rejection",
      );
      check(
        f.images() === 0 && f.handle.snapshot().assets.length === 0,
        "bad batch must not partially insert first image",
      );
      pass("batch-conflict-no-partial-insert");
    } finally {
      await f.destroy();
    }
  }
  {
    const f = await fixture();
    let reopened: Awaited<ReturnType<typeof fixture>> | undefined;
    try {
      f.handle.select(2, 2);
      const first = f.paste();
      f.handle.select(4, 4);
      f.paste();
      check(
        f.stages.length === 1 &&
          f.errors.includes("MEDIA_PASTE_IN_PROGRESS_RETRY"),
        "second pending paste must be explicitly rejected before staging",
      );
      first.resolve([asset]);
      await f.complete();
      check(
        f.host.querySelector(".ProseMirror p")?.firstChild?.textContent ===
          "甲",
        "busy rejection must not move first target",
      );
      const retry = f.paste();
      check(
        Number(f.stages.length) === 2,
        "retry after completion must be accepted",
      );
      retry.resolve([asset]);
      await f.complete(2);
      const placements = f.handle.placements();
      f.handle.setWidth(placements[0].placementId, 30);
      check(
        JSON.stringify(f.handle.placements().map((p) => p.width)) === "[30,80]",
        "two references have independent widths",
      );
      const saved = f.handle.snapshot();
      check(
        saved.assets.length === 1,
        "repeated asset references must deduplicate",
      );
      await f.destroy();
      reopened = await fixture(saved);
      await until(
        () =>
          reopened!.images() === 2 &&
          Array.from(
            reopened!.host.querySelectorAll<HTMLImageElement>(
              "img[data-gank-placement]",
            ),
          ).every((img) => img.complete && img.naturalWidth > 0),
        () =>
          "reopened real resource must load: " +
          Array.from(
            reopened!.host.querySelectorAll<HTMLImageElement>(
              "img[data-gank-placement]",
            ),
          )
            .map((img) =>
              JSON.stringify({
                html: img.outerHTML,
                complete: img.complete,
                width: img.naturalWidth,
              }),
            )
            .join(";"),
      );
      check(
        JSON.stringify(reopened.handle.snapshot()) === JSON.stringify(saved),
        "full document must round-trip",
      );
      check(
        JSON.stringify(reopened.handle.placements().map((p) => p.width)) ===
          "[30,80]",
        "widths must survive reopen",
      );
      pass("busy-retry-two-references-widths-reopen");
    } finally {
      await f.destroy();
      if (reopened) await reopened.destroy();
    }
  }
  {
    const f = await fixture();
    f.handle.select(2, 2);
    const stage = f.paste(),
      changes = f.changes.length;
    await f.destroy();
    stage.resolve([asset]);
    await stage.promise;
    check(
      f.changes.length === changes && !f.errors.length && !f.host.isConnected,
      "destroyed editor must not receive completion",
    );
    pass("destroy-pending");
  }
  {
    const old = await fixture();
    old.handle.select(2, 2);
    const stage = old.paste();
    await old.destroy();
    const fresh = await fixture();
    try {
      stage.resolve([asset]);
      await stage.promise;
      check(
        fresh.images() === 0 && fresh.handle.snapshot().assets.length === 0,
        "switch must not deliver to new editor",
      );
      fresh.handle.select(3, 3);
      fresh.paste().resolve([asset]);
      await fresh.complete();
      pass("switch-editor-owner");
    } finally {
      await fresh.destroy();
    }
  }
  {
    const first = await fixture(),
      second = await fixture();
    try {
      first.handle.select(2, 2);
      const a = first.paste();
      second.handle.select(3, 3);
      const b = second.paste();
      b.resolve([asset]);
      await second.complete();
      a.resolve([asset]);
      await first.complete();
      check(
        !first.errors.length && !second.errors.length,
        "pending ownership must be per instance",
      );
      pass("parallel-instance-isolation");
    } finally {
      await first.destroy();
      await second.destroy();
    }
  }
  return cases;
}

// Native plain-text clipboard path; independent of the 11 image cases above.
export async function nativeClipboardRegression() {
  const cases: { case: string; status: string }[] = [];
  for (const code of [false, true]) {
    const f = await fixture({
      encoding: "ganksoft.editor/1",
      assets: [],
      markdown: code ? "```txt\n原文\n```\n" : "原文\n",
    });
    try {
      f.handle.select(1, 1);
      const data = new DataTransfer();
      const text = code
        ? "<img src=x onerror=alert(1)>"
        : "原生 **加粗**\n\n- 甲\n- 乙";
      data.setData("text/plain", text);
      const event = new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      });
      f.host.querySelector(".ProseMirror")!.dispatchEvent(event);
      check(event.defaultPrevented, "native clipboard must handle paste");
      const saved = f.handle.snapshot();
      check(
        !f.errors.length,
        "plain clipboard unexpectedly rejected: " + f.errors,
      );
      if (code) {
        check(saved.markdown.includes(text), "code text changed");
        check(!f.host.querySelector("img"), "code text became an HTML image");
      } else {
        check(
          f.host.querySelector("strong")?.textContent === "加粗",
          "native bold paste missing",
        );
        check(
          f.host.querySelectorAll("li").length === 2,
          "native list paste missing",
        );
      }
      const fresh = await fixture(saved);
      try {
        check(
          JSON.stringify(fresh.handle.snapshot()) === JSON.stringify(saved),
          "native paste recreation differs",
        );
      } finally {
        await fresh.destroy();
      }
      cases.push({
        case: code
          ? "native-code-literal-paste"
          : "native-markdown-plain-paste",
        status: "PASS",
      });
    } finally {
      await f.destroy();
    }
  }
  const f = await fixture();
  try {
    const before = f.handle.snapshot();
    const data = new DataTransfer();
    data.setData("text/plain", "![x](https://example.org/unsafe.png)");
    f.host
      .querySelector(".ProseMirror")!
      .dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    check(
      JSON.stringify(f.handle.snapshot()) === JSON.stringify(before),
      "unsafe plain paste changed content",
    );
    check(f.errors.length === 1, "unsafe plain paste must report rejection");
    cases.push({ case: "native-plain-business-validation", status: "PASS" });
  } finally {
    await f.destroy();
  }
  return cases;
}
