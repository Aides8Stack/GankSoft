import assert from "node:assert/strict";

// These standalone probes launch the real production main, which now selects
// the unified606 renderer. Retained604 integration tests use their own host.
export async function waitForProductionOverview(page) {
  await page.getByRole("heading", { name: "学习总览", exact: true }).waitFor();
  await page.locator(".unified-shell").waitFor();
  assert.equal(page.url(), "gank-app://ui/index.html");
  const model = await page.evaluate(async () => {
    const protocol = { major: 2, minor: 0 };
    const capabilities = await window.gank.protocol({
      protocol, requestId: crypto.randomUUID(), dataEpoch: null,
      method: "app.capabilities", payload: {},
    });
    if (!capabilities.ok) throw Error("Production capabilities failed");
    const catalog = await window.gank.protocol({
      protocol, requestId: crypto.randomUUID(), dataEpoch: capabilities.dataEpoch,
      method: "workspace.catalog", payload: {},
    });
    if (!catalog.ok) throw Error("Production catalog failed");
    return catalog.data.model;
  });
  assert.equal(model, "unified", "Expected the actual production606 renderer");
  return { url: page.url(), model, renderer: "UnifiedWorkspace" };
}
