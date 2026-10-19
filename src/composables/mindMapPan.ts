/** Adapt editable MindElixir's blank-area gesture without replacing node dragging. */
export function bindMindMapPan(host: HTMLElement, move: (dx: number, dy: number) => void) {
  const blurController = new AbortController();
  let active: { id: number; x: number; y: number } | undefined;
  const down = (event: PointerEvent) => {
    const target = event.target as Element;
    if (
      event.button !== 0 ||
      event.pointerType !== 'mouse' ||
      !target.closest('.map-container') ||
      target.closest(
        '.me-tpc, .me-epd, .svg-label, .topiclinks, .summary, button, input, textarea, [contenteditable], .map-toolbar, .context-menu',
      )
    )
      return;
    active = { id: event.pointerId, x: event.clientX, y: event.clientY };
    host.setPointerCapture(event.pointerId);
    host.classList.add('is-panning');
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const drag = (event: PointerEvent) => {
    if (!active || active.id !== event.pointerId) return;
    move(event.clientX - active.x, event.clientY - active.y);
    active.x = event.clientX;
    active.y = event.clientY;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const end = (event?: PointerEvent) => {
    if (!active || (event && active.id !== event.pointerId)) return;
    const id = active.id;
    active = undefined;
    host.classList.remove('is-panning');
    if (host.hasPointerCapture(id)) host.releasePointerCapture(id);
  };
  host.addEventListener('pointerdown', down, true);
  host.addEventListener('pointermove', drag, true);
  host.addEventListener('pointerup', end, true);
  host.addEventListener('pointercancel', end, true);
  host.addEventListener('lostpointercapture', end);
  window.addEventListener('blur', () => end(), { signal: blurController.signal });
  return () => {
    end();
    blurController.abort();
    host.removeEventListener('pointerdown', down, true);
    host.removeEventListener('pointermove', drag, true);
    host.removeEventListener('pointerup', end, true);
    host.removeEventListener('pointercancel', end, true);
    host.removeEventListener('lostpointercapture', end);
  };
}
