// The same OS/browser mouse path is used for native, adapted and full-editor tables.
import assert from "node:assert/strict";

export async function checkTableMouseDrag(page, scope) {
  const table = scope.locator("table.children");
  // Keep the whole table, including both drag endpoints, within the viewport.
  await table.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }));
  const rows = () =>
    table
      .locator("tr")
      .evaluateAll((es) =>
        es.map((r) => Array.from(r.children).map((c) => c.textContent)),
      );
  const original = await rows();
  assert.equal(original.length, 4);
  const initialDOM = await table.elementHandle();
  const viewport = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    dpr: devicePixelRatio,
  }));
  await scope.evaluate((root) => {
    window.s2DragController?.abort();
    window.s2DragController = new AbortController();
    window.s2NativeDrags = [];
    window.s2DragTimeline = [];
    const observer = new MutationObserver((records) => {
      for (const mutation of records) {
        const el = mutation.target;
        if (!el.matches?.('.line-handle, .drag-preview')) continue;
        window.s2DragTimeline.push({
          at: performance.now(), role: el.dataset.role ?? 'preview',
          attribute: mutation.attributeName, before: mutation.oldValue,
          after: el.getAttribute(mutation.attributeName), connected: el.isConnected,
        });
      }
    });
    observer.observe(root, { subtree: true, attributes: true,
      attributeOldValue: true, attributeFilter: ['data-show', 'data-display-type'] });
    window.s2DragController.signal.addEventListener('abort', () => observer.disconnect(), { once: true });
    const observed = new WeakMap();
    for (const type of ["pointermove", "pointerleave", "dragstart", "dragover", "drop", "dragend"]) {
      document.addEventListener(
        type,
        (event) => {
          const record = {
            type,
            at: performance.now(),
            trusted: event.isTrusted,
            role: event.target.closest?.("[data-role]")?.dataset.role ?? null,
            target: event.target.tagName,
            x: event.clientX,
            y: event.clientY,
            defaultPrevented: event.defaultPrevented,
          };
          window.s2NativeDrags.push(record);
          observed.set(event, record);
        },
        { capture: true, signal: window.s2DragController.signal },
      );
      document.addEventListener(
        type,
        (event) => {
          // Bubble is after the official Vue handler; capture's microtask can
          // run before that handler for native OS events.
          const record = observed.get(event);
          if (record) record.defaultPrevented = event.defaultPrevented;
        },
        { signal: window.s2DragController.signal },
      );
    }
  });
  async function mouseDrag(handle, target, axis) {
    const source = await handle.boundingBox();
    assert.ok(source, "Missing drag source geometry");
    const x = source.x + source.width / 2,
      y = source.y + source.height / 2;
    assert.ok(x > 0 && x < viewport.width, "Drag x outside native viewport");
    assert.ok(y > 0 && y < viewport.height, "Drag y outside native viewport");
    await page.mouse.move(x, y);
    await page.mouse.down();
    try {
      await page.mouse.move(x + 10, y + 10, { steps: 5 });
      await scope
        .locator('.drag-preview[data-show="true"]')
        .waitFor({ timeout: 5000 });
      // Native dragging can scroll/reflow the document. Use current public DOM
      // geometry after the preview appears, and compare the indicator with the
      // live cell edge rather than a rectangle captured before mouse.down.
      const destination = await target.boundingBox();
      assert.ok(destination, "Missing drag target geometry");
      const endX = Math.floor(destination.x + destination.width / 2) + 1;
      const endY = Math.floor(destination.y + destination.height / 2) + 1;
      assert.ok(endX > 0 && endX < viewport.width, "Drag x outside native viewport");
      assert.ok(endY > 0 && endY < viewport.height, "Drag y outside native viewport");
      const targetElement = await target.elementHandle();
      assert.ok(targetElement, "Missing drag target element");
      await page.mouse.move(endX, endY, { steps: 15 });
      try {
        await page.waitForFunction(
          ({ axis, targetElement, selector }) => {
            const line = document.querySelector(
              `${selector} [data-role="${axis}-line-drag-handle"][data-show="true"][data-display-type="indicator"]`,
            );
            if (!line) return false;
            const rect = line.getBoundingClientRect();
            const destination = targetElement.getBoundingClientRect();
            return axis === "x"
              ? Math.abs(rect.y - (destination.y + destination.height)) < 8
              : Math.abs(rect.x - (destination.x + destination.width)) < 8;
          },
          {
            axis,
            targetElement,
            selector:
              (await scope.getAttribute("id")) === "table-drag-comparison"
                ? "#table-drag-comparison"
                : ".gank-editor",
          },
          { timeout: 5000 },
        );
      } catch (error) {
        // Read before mouse.up/screenshot: both can hide the line or resize a
        // full-page capture. Preserve evidence without accepting a failed drag.
        const geometry = await page.evaluate(({ axis, targetElement, selector }) => {
          const line = document.querySelector(`${selector} [data-role="${axis}-line-drag-handle"]`);
          const rect = (el) => el?.getBoundingClientRect().toJSON() ?? null;
          return { axis, target: rect(targetElement), line: rect(line),
            lineState: line ? { ...line.dataset, style: line.getAttribute("style") } : null,
            offsetParent: rect(line?.offsetParent), scroll: { x: scrollX, y: scrollY },
            viewport: { width: innerWidth, height: innerHeight, clientWidth: document.documentElement.clientWidth },
            targetConnected: targetElement.isConnected,
            tableConnected: document.querySelector(`${selector} table.children`)?.isConnected,
            preview: document.querySelector(`${selector} .drag-preview`)?.dataset.show,
            timeline: window.s2DragTimeline.slice(-60),
            lastEvents: window.s2NativeDrags.slice(-30) };
        }, { axis, targetElement, selector: (await scope.getAttribute("id")) === "table-drag-comparison" ? "#table-drag-comparison" : ".gank-editor" });
        throw new Error(`${error.message}\nDRAG_GEOMETRY ${JSON.stringify(geometry)}`, { cause: error });
      } finally { await targetElement.dispose(); }
      // Native OS dragover delivery can lag a CDP mouse move on Windows.
      // Wait for the actual accepted final event before releasing, not a timer.
      await page.mouse.move(endX + 1, endY + 1);
      await page.waitForFunction(
        ({ x, y }) =>
          window.s2NativeDrags.some(
            (e) =>
              e.type === "dragover" &&
              e.trusted &&
              e.defaultPrevented &&
              Math.abs(e.x - x) <= 1 &&
              Math.abs(e.y - y) <= 1,
          ),
        { x: endX + 1, y: endY + 1 },
        { timeout: 5000 },
      );
    } finally {
      await page.mouse.up();
    }
  }
  async function waitRows(expected) {
    await page.waitForFunction(
      ({ expected, selector }) =>
        JSON.stringify(
          Array.from(
            document.querySelectorAll(`${selector} table.children tr`),
          ).map((r) => Array.from(r.children).map((c) => c.textContent)),
        ) === JSON.stringify(expected),
      {
        expected,
        selector:
          (await scope.getAttribute("id")) === "table-drag-comparison"
            ? "#table-drag-comparison"
            : ".gank-editor",
      },
    );
  }
  await table.locator("tr").nth(1).locator("td").first().hover();
  const rowHandle = scope.locator(
    '[data-role="row-drag-handle"][data-show="true"]',
  );
  await rowHandle.waitFor();
  await mouseDrag(
    rowHandle,
    table.locator("tr").nth(3).locator("td").first(),
    "x",
  );
  const expectedRows = [original[0], original[2], original[3], original[1]];
  await waitRows(expectedRows);
  const originalTableConnectedAfterRow = await initialDOM.evaluate(
    (el) => el.isConnected,
  );
  await page.waitForFunction(
    () => document.activeElement?.classList.contains("ProseMirror"),
    null,
    { timeout: 5000 },
  );
  await table.locator("tr").first().locator("th").first().hover();
  const colHandle = scope.locator(
    '[data-role="col-drag-handle"][data-show="true"]',
  );
  await colHandle.waitFor();
  await mouseDrag(
    colHandle,
    table.locator("tr").first().locator("th").nth(2),
    "y",
  );
  const expected = expectedRows.map((r) => [r[1], r[2], r[0]]);
  await waitRows(expected);
  const events = await page.evaluate(() => window.s2NativeDrags);
  for (const role of ["row-drag-handle", "col-drag-handle"])
    assert.ok(
      events.some(
        (e) => e.type === "dragstart" && e.trusted && e.role === role,
      ),
    );
  assert.ok(events.filter((e) => e.type === "drop" && e.trusted).length >= 2);
  assert.deepEqual(await rows(), expected);
  const originalTableConnectedAfterColumn = await initialDOM.evaluate(
    (el) => el.isConnected,
  );
  await initialDOM.dispose();
  return {
    status: "PASS",
    original,
    expected,
    events,
    timeline: await page.evaluate(() => window.s2DragTimeline),
    viewport,
    dom: { originalTableConnectedAfterRow, originalTableConnectedAfterColumn },
  };
}

export async function compareTableMouseDrag(page) {
  const markdown =
    "| 列甲 | 列乙 | 列丙 |\n| --- | --- | --- |\n| 甲1 | 甲2 | 甲3 |\n| 乙1 | 乙2 | 乙3 |\n| 丙1 | 丙2 | 丙3 |\n";
  const results = [];
  const saved = await page.evaluate(() => window.editorSpike.handle.snapshot());
  const size = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    dpr: devicePixelRatio,
  }));
  for (const adapted of [false, true]) {
    const result = {
      adapter: adapted
        ? "GankSoft public TableNodeView only"
        : "Native Crepe defaults",
      status: "NOT_RUN",
    };
    try {
      // Reload between candidates: no hovered native tooltip/drag timers from
      // one destroyed Crepe can access the next candidate's disposed ctx.
      await page.reload();
      await page.waitForFunction(() => !!window.editorSpike, null, {
        timeout: 5000,
      });
      await page.evaluate(
        ({ adapted, markdown }) =>
          window.editorSpike.mountDragComparison(adapted, markdown),
        { adapted, markdown },
      );
      Object.assign(
        result,
        await checkTableMouseDrag(page, page.locator("#table-drag-comparison")),
      );
      assert.deepEqual(result.viewport, size);
    } catch (error) {
      result.status = "FAIL";
      result.error = error.stack ?? String(error);
      result.events = await page.evaluate(() => window.s2NativeDrags);
      result.timeline = await page.evaluate(() => window.s2DragTimeline);
      result.rows = await page
        .locator("#table-drag-comparison table.children tr")
        .evaluateAll((es) =>
          es.map((r) => Array.from(r.children).map((c) => c.textContent)),
        );
    }
    results.push(result);
  }
  await page.reload();
  await page.getByRole("button", { name: "开始隔离验证" }).click();
  await page.waitForFunction(() => !!window.editorSpike?.handle);
  await page.evaluate((doc) => window.editorSpike.setInitial(doc), saved);
  await page.waitForFunction(
    (doc) =>
      JSON.stringify(window.editorSpike?.handle?.snapshot()) ===
      JSON.stringify(doc),
    saved,
  );
  return {
    markdown,
    results,
    note: "Fresh document per candidate via reload, same helper/host/data/window; native race control remains separate. Native control failure is diagnostic; adapted and full-editor paths must PASS.",
  };
}

// Controlled lifecycle regression, separate from the trusted mouse qualification.
// Capture only the upstream 200ms leave callback; never alter the real mouse trials.
export async function checkDragLeaveLifecycle(page) {
  const saved = await page.evaluate(() => window.editorSpike.handle?.snapshot());
  await page.reload();
  await page.waitForFunction(() => !!window.editorSpike);
  await page.evaluate(() => window.editorSpike.mountDragComparison(true,
    "| A | B |\n| --- | --- |\n| a | b |\n| c | d |\n"));
  const result = await page.evaluate(async () => {
    const root = document.querySelector('#table-drag-comparison .milkdown-table-block');
    const handle = root.querySelector('[data-role="row-drag-handle"]');
    const wrapper = root.firstElementChild;
    const original = window.setTimeout;
    const callbacks = [];
    window.setTimeout = (callback, delay, ...args) => {
      if (delay === 200) {
        callbacks.push(() => callback(...args));
        return -callbacks.length;
      }
      return original(callback, delay, ...args);
    };
    try {
      handle.dispatchEvent(new DragEvent('dragstart', { bubbles: true }));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      wrapper.dispatchEvent(new PointerEvent('pointerleave', { clientX: 0, clientY: 0 }));
      const duringDrag = callbacks.length;
      window.dispatchEvent(new DragEvent('dragend'));
      wrapper.dispatchEvent(new PointerEvent('pointerleave', { clientX: 0, clientY: 0 }));
      const afterEnd = callbacks.length - duringDrag;
      for (const callback of callbacks) callback();
      return { duringDrag, afterEnd,
        handlesHidden: [...root.querySelectorAll('.cell-handle, .line-handle')]
          .every(el => el.dataset.show === 'false') };
    } finally { window.setTimeout = original; }
  });
  if (saved) {
    await page.reload();
    await page.getByRole('button', { name: '开始隔离验证' }).click();
    await page.waitForFunction(() => !!window.editorSpike?.handle);
    await page.evaluate(doc => window.editorSpike.setInitial(doc), saved);
    await page.waitForFunction(doc => JSON.stringify(window.editorSpike?.handle?.snapshot()) === JSON.stringify(doc), saved);
  }
  assert.equal(result.duringDrag, 0, 'Native drag pointerleave must not queue hover hiding');
  assert.equal(result.afterEnd, 1, 'Ordinary pointerleave must retain native hiding');
  assert.equal(result.handlesHidden, true);
  return { status: 'PASS', ...result, scope: 'Synthetic lifecycle fault regression; not real mouse acceptance' };
}
