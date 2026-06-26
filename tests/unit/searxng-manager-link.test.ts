import { describe, test, expect } from "bun:test";
import { file } from "bun";

describe("SearXNG manager settings link", () => {
  test("engines tab only exposes the manager link for authenticated settings flows and appends the token query", async () => {
    const fileUrl = new URL("../../src/client/settings/engines-tab.ts", import.meta.url);
    const source = await file(fileUrl).text();

    expect(source).toContain('if (allExtensions.engines.some((engine) => engine.id.includes("searxng"))) {');
    expect(source).toContain('class="btn btn--secondary degoog-btn degoog-btn--secondary searxng-manager-link"');
    expect(source).toContain('sessionStorage.getItem("degoog-settings-token")');
    expect(source).toContain('encodeURIComponent(token)');
    expect(source).toContain('managerLink.href = token');
  });
});
