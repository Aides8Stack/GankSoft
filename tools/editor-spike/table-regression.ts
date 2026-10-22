// Isolated Electron fixture. Input/selection changes occur before any click callback can run.
import { Crepe } from "@milkdown/crepe";
import { editorViewCtx, commandsCtx, parserCtx } from "@milkdown/kit/core";
import { TextSelection, NodeSelection } from "@milkdown/kit/prose/state";
import { CellSelection } from "@milkdown/kit/prose/tables";
import {
  addRowAfterCommand,
  addColAfterCommand,
  deleteSelectedCellsCommand,
  setAlignCommand,
  selectRowCommand,
  selectColCommand,
} from "@milkdown/kit/preset/gfm";
import { installTableInteraction } from "../../src/editor/table-interaction";
const markdown =
  "# 测试\n\n| 列一 | 列二 |\n| --- | --- |\n| 甲 | 乙 |\n| 丙 | 丁 |\n";
function check(value: unknown, message: string): asserts value {
  if (!value) throw Error("TABLE_REGRESSION: " + message);
}
const settle = async () => {
  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r)),
  );
  await new Promise((r) => setTimeout(r, 25));
};
async function fixture(value = markdown) {
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;top:0;left:0;width:800px;z-index:1000;background:white";
  document.body.append(host);
  const crepe = new Crepe({ root: host, defaultValue: value });
  await installTableInteraction(crepe.editor);
  await crepe.create();
  await settle(); // Initial rendering only; never wait between the tested click and newer intent.
  const view = crepe.editor.action((ctx) => ctx.get(editorViewCtx));
  function cell(text: string) {
    let found: { pos: number; node: any } | undefined;
    view.state.doc.descendants((n, p) => {
      if (n.type.name === "table_cell" && n.textContent === text)
        found = { pos: p, node: n };
    });
    check(found, "cell " + text);
    return found;
  }
  function click(text: string, type = "mousedown") {
    const p = Array.from(host.querySelectorAll("td p")).find(
      (p) => p.textContent === text,
    );
    check(p, "DOM cell " + text);
    const r = p.getBoundingClientRect();
    check(
      (view.posAtCoords({ left: r.x + 3, top: r.y + 3 })?.inside ?? -1) >= 0,
      "cell must be hit-testable before event",
    );
    // Browsers synthesize mousedown after pointerdown; ProseMirror handles that mouse event.
    for (const eventType of type.split("+")) {
      p.dispatchEvent(
        new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          clientX: r.x + 3,
          clientY: r.y + 3,
        }),
      );
    }
  }
  const snapshot = () =>
    JSON.stringify({
      doc: view.state.doc.toJSON(),
      selection: view.state.selection.toJSON(),
    });
  const destroy = async () => {
    await crepe.destroy();
    host.remove();
  };
  return { host, crepe, view, cell, click, snapshot, destroy };
}
export async function tableRegression() {
  const results: { case: string; status: "PASS"; [key: string]: unknown }[] =
    [];
  for (const event of ["mousedown", "pointerdown+mousedown"]) {
    for (const selection of ["text", "cells"]) {
      for (const change of ["document", "selection-only"]) {
        const f = await fixture();
        try {
          if (selection === "cells")
            f.view.dispatch(
              f.view.state.tr.setSelection(
                CellSelection.create(
                  f.view.state.doc,
                  f.cell("甲").pos,
                  f.cell("乙").pos,
                ),
              ),
            );
          else
            f.view.dispatch(
              f.view.state.tr.setSelection(
                TextSelection.create(f.view.state.doc, 1),
              ),
            );
          f.click("甲", event);
          // Synchronous: no timer, frame or input-readiness wait before the intervening transaction.
          if (change === "document")
            f.view.dispatch(f.view.state.tr.insertText("中", 1));
          else
            f.view.dispatch(
              f.view.state.tr.setSelection(
                TextSelection.create(f.view.state.doc, f.cell("乙").pos + 2),
              ),
            );
          const expected = f.snapshot();
          await settle();
          check(
            f.snapshot() === expected,
            "deferred click replaced newer " + change,
          );
          results.push({
            case: `${event}/${selection}/${change}`,
            status: "PASS",
            inputBeforeCallbacks: true,
          });
        } finally {
          await f.destroy();
        }
      }
    }
    const f = await fixture();
    try {
      f.click("甲", event);
      f.click("乙", event);
      await settle();
      check(
        f.view.state.selection instanceof NodeSelection,
        event + " latest click not applied: " + f.snapshot(),
      );
      check(
        f.view.state.selection.$from.parent.textContent === "乙",
        "older click won",
      );
      results.push({ case: `${event}/latest-click-wins`, status: "PASS" });
    } finally {
      await f.destroy();
    }
  }
  for (const change of ["document", "selection-only"]) {
    const f = await fixture();
    try {
      const header = f.host.querySelector("th p")!;
      const r = header.getBoundingClientRect();
      header.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          clientX: r.x + 3,
          clientY: r.y + 3,
        }),
      );
      if (change === "document")
        f.view.dispatch(f.view.state.tr.insertText("中", 1));
      else
        f.view.dispatch(
          f.view.state.tr.setSelection(
            TextSelection.create(f.view.state.doc, f.cell("乙").pos + 2),
          ),
        );
      const expected = f.snapshot();
      await settle();
      check(f.snapshot() === expected, "header click replaced newer intent");
      results.push({
        case: "header/" + change,
        status: "PASS",
        inputBeforeCallbacks: true,
      });
    } finally {
      await f.destroy();
    }
  }
  for (const action of ["delete", "replace", "destroy"]) {
    for (const selection of ["text", "cells"]) {
      const f = await fixture();
      let destroyed = false;
      try {
        if (selection === "cells")
          f.view.dispatch(
            f.view.state.tr.setSelection(
              CellSelection.create(f.view.state.doc, f.cell("甲").pos),
            ),
          );
        f.click("甲");
        if (action === "destroy") {
          await f.destroy();
          destroyed = true;
          await settle();
        } else {
          if (action === "delete") {
            let table: { pos: number; size: number } | undefined;
            f.view.state.doc.descendants((n, p) => {
              if (n.type.name === "table") table = { pos: p, size: n.nodeSize };
            });
            check(table, "table missing");
            f.view.dispatch(
              f.view.state.tr.delete(table.pos, table.pos + table.size),
            );
          } else {
            const parsed = f.crepe.editor.action((ctx) =>
              ctx.get(parserCtx)("# 替换\n\n替换后的正文"),
            );
            check(parsed, "parser failed");
            f.view.dispatch(
              f.view.state.tr.replaceWith(
                0,
                f.view.state.doc.content.size,
                parsed.content,
              ),
            );
          }
          const expected = f.snapshot();
          await settle();
          check(
            f.snapshot() === expected,
            "old callback touched removed/replaced table",
          );
        }
        results.push({ case: `${action}/${selection}`, status: "PASS" });
      } finally {
        if (!destroyed) await f.destroy();
      }
    }
  }
  const f = await fixture();
  try {
    f.view.dispatch(
      f.view.state.tr.setSelection(
        TextSelection.create(f.view.state.doc, f.cell("甲").pos + 2),
      ),
    );
    f.click("甲");
    f.view.dispatch(f.view.state.tr.insertText("中文", f.cell("甲").pos + 2));
    const expected = f.snapshot();
    await settle();
    check(f.snapshot() === expected, "same-cell edit overwritten");
    const commands = f.crepe.editor.action((ctx) => ctx.get(commandsCtx));
    const rows = () => f.host.querySelectorAll("tbody.content-dom tr").length;
    const cols = () =>
      f.host.querySelectorAll("tbody.content-dom tr:first-child th").length;
    check(
      f.host.querySelector('[data-role="row-drag-handle"][draggable="true"]'),
      "native row drag UI missing",
    );
    check(
      f.host.querySelector('[data-role="col-drag-handle"][draggable="true"]'),
      "native column drag UI missing",
    );
    const beforeRows = rows(),
      beforeCols = cols();
    check(commands.call(addRowAfterCommand.key), "add row unavailable");
    check(rows() === beforeRows + 1, "row not inserted");
    check(commands.call(addColAfterCommand.key), "add column unavailable");
    check(cols() === beforeCols + 1, "column not inserted");
    let tablePos = 0;
    f.view.state.doc.descendants((n, p) => {
      if (n.type.name === "table") tablePos = p;
    });
    // The native column menu selects the entire column before applying alignment.
    commands.call(selectColCommand.key, { pos: tablePos + 1, index: 0 });
    check(
      f.view.state.selection instanceof CellSelection &&
        f.view.state.selection.isColSelection(),
      "alignment column not selected",
    );
    check(commands.call(setAlignCommand.key, "right"), "alignment unavailable");
    check(/-+:/.test(f.crepe.getMarkdown()), "alignment not serialized");
    commands.call(selectRowCommand.key, { pos: tablePos + 1, index: 1 });
    check(
      f.view.state.selection instanceof CellSelection &&
        f.view.state.selection.isRowSelection(),
      "row selection unavailable",
    );
    check(
      f.view.state.selection instanceof CellSelection,
      "row selection lost",
    );
    check(
      commands.call(deleteSelectedCellsCommand.key),
      "row deletion unavailable",
    );
    check(rows() === beforeRows, "row not removed");
    commands.call(selectColCommand.key, { pos: tablePos + 1, index: 1 });
    check(
      f.view.state.selection instanceof CellSelection &&
        f.view.state.selection.isColSelection(),
      "column selection unavailable",
    );
    check(
      commands.call(deleteSelectedCellsCommand.key),
      "column deletion unavailable",
    );
    check(cols() === beforeCols, "column not removed");
    const saved = f.crepe.getMarkdown();
    const parsed = f.crepe.editor.action((ctx) => ctx.get(parserCtx)(saved));
    check(parsed, "table reparse failed");
    // Crepe's trailing plugin adds an empty paragraph after the table. Compare real
    // recreated editor states, so normalization is exercised rather than ignored.
    const reopened = await fixture(saved);
    try {
      check(
        reopened.crepe.getMarkdown() === saved,
        "table Markdown changed on reopen",
      );
      // Separate editors have distinct schema/type identities; compare exact persisted JSON.
      check(
        JSON.stringify(reopened.view.state.doc.toJSON()) ===
          JSON.stringify(f.view.state.doc.toJSON()),
        "table content/format changed after editor recreation",
      );
    } finally {
      await reopened.destroy();
    }
    results.push({
      case: "same-cell-input-row-column-select-add-delete-align-roundtrip",
      status: "PASS",
      markdown: saved,
    });
  } finally {
    await f.destroy();
  }
  return results;
}
