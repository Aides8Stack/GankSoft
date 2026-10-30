import type { EditorView } from "@milkdown/kit/prose/view";

// Retain the mount-time DOM selection repair, only while its intent is current.
// EditorState identity is a transaction generation (including selection-only
// changes and undo back to the same document). No old absolute position is ever
// mapped onto a newer document: a newer transaction owns its own selection.
export function createListSelectionRestore(
  view: EditorView,
  requestFrame = (callback: FrameRequestCallback) => requestAnimationFrame(callback),
  cancelFrame = (id: number) => cancelAnimationFrame(id),
) {
  type Capture = { state: EditorView["state"]; live: () => boolean; epoch: number };
  const captures = new Map<object, Capture>();
  let frame: number | undefined;
  let ticket: object | undefined;
  let epoch = 0;
  let disposed = false;
  const invalidate = () => {
    ticket = undefined;
    epoch++;
    captures.clear();
    if (frame !== undefined) cancelFrame(frame);
    frame = undefined;
  };
  // These may precede ProseMirror's transaction/DOM observer. In particular blur
  // followed by focus, and composition events with no document change, must
  // still revoke an old intent. Never consume or alter the native event.
  const events = ["keydown", "beforeinput", "input", "pointerdown", "compositionstart", "compositionend", "focusout"];
  for (const event of events) view.dom.addEventListener(event, invalidate, true);
  const flush = () => {
    frame = undefined;
    const pending = [...captures.values()];
    captures.clear();
    if (disposed || view.isDestroyed || !view.hasFocus() || !view.editable || view.composing) return;
    const current = view.state;
    const last = pending.reverse().find(capture =>
      capture.epoch === epoch && capture.state === current && capture.live());
    if (!last) return;
    // Same document and same selection generation, including NodeSelection.
    // Dispatching the current selection lets PM repair DOM selection disturbed
    // by moving contentDOM, exactly the legitimate purpose of the upstream RAF.
    view.dispatch(current.tr.setSelection(last.state.selection));
    // An equal selection transaction need not redraw PM's DOM selection.
    // focus() is the public DOM-selection sync API; the guard above requires
    // that this very editor already has focus, so this cannot steal it.
    view.focus();
  };
  return {
    schedule(owner: object, live: () => boolean) {
      if (disposed) return;
      captures.delete(owner);
      captures.set(owner, { state: view.state, live, epoch });
      if (frame === undefined) {
        const currentTicket = {};
        ticket = currentTicket;
        frame = requestFrame(() => {
          if (ticket !== currentTicket) return;
          ticket = undefined;
          flush();
        });
      }
    },
    remove(owner: object) { captures.delete(owner); },
    dispose() {
      disposed = true;
      invalidate();
      for (const event of events) view.dom.removeEventListener(event, invalidate, true);
    },
  };
}
