import { describe, test, expect } from "bun:test";
import { file } from "bun";

describe("SearXNG manager settings link", () => {
  test("engines tab exposes the manager link without leaking auth tokens into the url", async () => {
    const fileUrl = new URL("../../src/client/settings/engines/tab.ts", import.meta.url);
    const source = await file(fileUrl).text();

    expect(source).toContain('if (allowConfigure && allExtensions.engines.some((engine) => engine.id.includes("searxng"))) {');
    expect(source).toContain('class="btn btn--secondary degoog-btn degoog-btn--secondary searxng-manager-link"');
    expect(source).toContain('managerLink.href = `${getBase()}/api/plugin/searxng-manager/`;');
    expect(source).not.toContain('encodeURIComponent(token)');
    expect(source).not.toContain('managerLink.href = token');
  });
});
