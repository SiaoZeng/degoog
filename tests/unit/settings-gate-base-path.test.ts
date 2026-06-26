import { describe, expect, test } from "bun:test";
import { file } from "bun";

describe("settings gate html", () => {
  test("posts auth requests through the injected base url", async () => {
    const fileUrl = new URL("../../src/public/settings-gate.html", import.meta.url);
    const source = await file(fileUrl).text();

    expect(source).toContain('const base = window.__DEGOOG_BASE_URL__ ?? "";');
    expect(source).toContain('fetch(base + "/api/settings/auth", {');
    expect(source).not.toContain('fetch("/api/settings/auth", {');
  });
});
