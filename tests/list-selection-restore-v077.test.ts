import test from 'node:test';
import assert from 'node:assert/strict';
import { createListSelectionRestore } from '../src/editor/list-selection-restore.ts';

function fixture() {
  const callbacks: FrameRequestCallback[] = [];
  const dom = new EventTarget();
  const selection = { anchor: 4, head: 4 };
  const state = { doc: {}, selection, tr: { setSelection(s: unknown) { return s; } } };
  const dispatched: unknown[] = [];
  const view = { dom, state, isDestroyed: false, composing: false, editable: true,
    focused: true, focusCalls: 0, focus() { this.focusCalls++; }, hasFocus() { return this.focused; }, dispatch(s: unknown) { dispatched.push(s); } };
  const restores = createListSelectionRestore(view as any,
    cb => { callbacks.push(cb); return callbacks.length; }, () => {});
  const owner = {};
  const run = (i = callbacks.length - 1) => callbacks[i]!(0);
  return { view, restores, owner, callbacks, run, dispatched };
}
test('unchanged focused mount repairs DOM using original selection object and one RAF per view', () => {
  const f = fixture();
  f.restores.schedule({}, () => true); f.restores.schedule(f.owner, () => true);
  assert.equal(f.callbacks.length, 1); f.run();
  assert.deepEqual(f.dispatched, [f.view.state.selection]); assert.equal(f.view.focusCalls,1); f.restores.dispose();
});
for (const kind of ['input', 'selection move', 'undo to identical document', 'benign transaction']) {
  test(`later ${kind} invalidates captured transaction generation`, () => {
    const f = fixture(); f.restores.schedule(f.owner, () => true);
    f.view.state = { ...f.view.state }; f.run();
    assert.deepEqual(f.dispatched, []); f.restores.dispose();
  });
}
for (const event of ['keydown','beforeinput','input','pointerdown','compositionstart','compositionend','focusout']) {
  test(`${event} revokes old intent even before a transaction (including blur/refocus)`, () => {
    const f = fixture(); f.restores.schedule(f.owner, () => true);
    f.view.dom.dispatchEvent(new Event(event)); f.run();
    assert.deepEqual(f.dispatched, []); f.restores.dispose();
  });
}
for (const flag of ['isDestroyed', 'composing', 'focused', 'editable']) {
  test(`${flag} guard`, () => {
    const f = fixture(); f.restores.schedule(f.owner, () => true);
    f.view[flag as keyof typeof f.view] = (flag === 'isDestroyed' || flag === 'composing') as never;
    f.run(); assert.deepEqual(f.dispatched, []); f.restores.dispose();
  });
}
test('unmounted/node removed and disposed callbacks cannot dispatch', () => {
  const f = fixture(); f.restores.schedule(f.owner, () => false); f.run();
  f.restores.schedule(f.owner, () => true); f.restores.remove(f.owner); f.run();
  f.restores.schedule(f.owner, () => true); f.restores.dispose(); f.run();
  assert.deepEqual(f.dispatched, []);
});
test('cancelled frame cannot consume a later mount; latest live item repairs once', () => {
  const f = fixture(); f.restores.schedule(f.owner, () => true);
  f.view.dom.dispatchEvent(new Event('keydown'));
  f.restores.schedule({}, () => true); f.restores.schedule(f.owner, () => false);
  f.run(0); assert.deepEqual(f.dispatched, []);
  f.run(1); assert.deepEqual(f.dispatched, [f.view.state.selection]);
  f.restores.dispose();
});
