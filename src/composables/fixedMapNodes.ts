/** Lock visual node dragging while retaining the framework's selection and edits.
 * v6.0.0-next.4 exposes no node-draggable option. This adapter only intercepts
 * the gesture start; layout, selection and all structural operations stay native.
 */
export function bindFixedMapNodes(host: HTMLElement, select: (node: HTMLElement) => void) {
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    const node = event.target.closest<HTMLElement>('.me-tpc');
    if (!node || event.target.closest('#input-box, input, textarea, [contenteditable]')) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    select(node);
  };
  host.addEventListener('pointerdown', down, true);
  return () => host.removeEventListener('pointerdown', down, true);
}
