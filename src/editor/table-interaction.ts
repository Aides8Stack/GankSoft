/*
 * Cell hit-testing/same-cell rules adapted from Milkdown TableNodeView7.22.3:
 * https://github.com/Milkdown/milkdown/blob/v7.22.3/packages/components/src/table-block/view/view.ts
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2020-present Mirone
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import type { Editor } from "@milkdown/kit/core";
import {
  TableNodeView,
  tableBlockView,
} from "@milkdown/kit/component/table-block";
import { tableSchema } from "@milkdown/kit/preset/gfm";
import { findParent } from "@milkdown/kit/prose";
import { NodeSelection, TextSelection } from "@milkdown/kit/prose/state";
import { CellSelection } from "@milkdown/kit/prose/tables";
import { $view } from "@milkdown/kit/utils";

// Public NodeView extension: retain Crepe's table UI, commands and mutation handling.
// The native timing is unchanged. A deferred click is an intent, never an old transaction.
class CurrentTableNodeView extends TableNodeView {
  private alive = true;
  private cancelClick = () => {};

  override update(node: Parameters<TableNodeView["update"]>[0]) {
    // Preserve the native drag source across selection/decorations-only updates.
    // Crepe returns false for unchanged nodes, causing ProseMirror to rebuild it.
    if (node.eq(this.node)) return true;
    return super.update(node);
  }

  override stopEvent(event: Event) {
    if (
      (event.type === "mousedown" || event.type === "pointerdown") &&
      event.target instanceof HTMLElement &&
      event.target.closest("td, th") &&
      !event.target.closest("button")
    ) {
      this.cancelClick();
      const view = this.view;
      if (!this.alive || view.isDestroyed || !view.editable || view.composing)
        return false;
      const expected = view.state;
      const pos = view.posAtCoords({
        left: (event as MouseEvent).clientX,
        top: (event as MouseEvent).clientY,
      });
      if (!pos || pos.inside < 0) return false;
      const isCell = (node: { type: { name: string } }) =>
        node.type.name === "table_cell" || node.type.name === "table_header";
      const cell = findParent(isCell)(expected.doc.resolve(pos.inside));
      if (!cell) return false;
      if (expected.selection instanceof TextSelection) {
        const current = findParent(isCell)(expected.selection.$from);
        if (current?.node === cell.node) return false;
      }
      const from = cell.from + 1;
      if (expected.selection.eq(NodeSelection.create(expected.doc, from)))
        return false;
      const applyClick = () => {
        this.cancelClick = () => {};
        // Includes selection-only transactions: an older click must not steal a newer caret.
        if (!this.alive || view.isDestroyed || view.state !== expected) return;
        const current = view.state;
        view.dispatch(
          current.tr
            .setSelection(NodeSelection.create(current.doc, from))
            .scrollIntoView(),
        );
      };
      if (expected.selection instanceof CellSelection) {
        const id = window.setTimeout(applyClick, 20);
        this.cancelClick = () => window.clearTimeout(id);
      } else {
        const id = window.requestAnimationFrame(applyClick);
        this.cancelClick = () => window.cancelAnimationFrame(id);
      }
      return true;
    }
    return super.stopEvent(event);
  }

  override destroy() {
    this.alive = false;
    this.cancelClick();
    super.destroy();
  }
}
const currentTableView = $view(
  tableSchema.node,
  (ctx) => (node, view, getPos) =>
    new CurrentTableNodeView(ctx, node, view, getPos),
);
export async function installTableInteraction(editor: Editor) {
  // Before create(), via Milkdown's public plugin lifecycle. No prototype/private patches.
  await editor.remove(tableBlockView);
  editor.use(currentTableView);
}
