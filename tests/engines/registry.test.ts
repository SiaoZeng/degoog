import { describe, test, expect, beforeAll } from "bun:test";
import {
  initEngines,
  getEngineExtensionMeta,
  getEngineMap,
  getEngineRegistry,
  getEnginesForSearchType,
  getDefaultEngineConfig,
  getOutgoingAllowlist,
} from "../../src/server/extensions/engines/registry";

describe("engines registry", () => {
  beforeAll(async () => {
    const orig = process.env.DEGOOG_ENGINES_DIR;
    process.env.DEGOOG_ENGINES_DIR = "/nonexistent-dir-for-tests";
    await initEngines();
    if (orig !== undefined) process.env.DEGOOG_ENGINES_DIR = orig;
    else delete process.env.DEGOOG_ENGINES_DIR;
  });

  test("getEngineMap returns builtin engines", () => {
    const map = getEngineMap();
    expect(map["duckduckgo"]).toBeDefined();
    expect(map["google"]).toBeDefined();
    expect(map["duckduckgo"].name).toBe("DuckDuckGo");
  });

  test("getEngineRegistry returns list with id and displayName", () => {
    const reg = getEngineRegistry();
    expect(Array.isArray(reg)).toBe(true);
    const ddg = reg.find((e) => e.id === "duckduckgo");
    expect(ddg).toBeDefined();
    expect(ddg!.displayName).toBe("DuckDuckGo");
  });

  test("getEnginesForSearchType returns web engines for type all", () => {
    const config: Record<string, boolean> = { duckduckgo: true, google: false };
    const engines = getEnginesForSearchType("all", config);
    expect(engines.length).toBeGreaterThan(0);
    expect(engines.some((e) => e.name === "DuckDuckGo")).toBe(true);
  });

  test("getEnginesForSearchType skips image engines disabled by default", () => {
    const engines = getEnginesForSearchType("images", {});
    expect(Array.isArray(engines)).toBe(true);
    expect(engines.some((e) => e.name === "Google Images")).toBe(false);
    expect(engines.some((e) => e.name === "Bing Images")).toBe(true);
  });

  test("getDefaultEngineConfig disables Google by default", () => {
    const config = getDefaultEngineConfig();
    expect(typeof config).toBe("object");
    expect(config.google).toBe(false);
    expect(config.duckduckgo).toBe(true);
  });

  test("getEngineExtensionMeta exposes defaultEnabled for disabled image engines", async () => {
    const meta = await getEngineExtensionMeta();
    const googleImages = meta.find((entry) => entry.id === "google-images");
    expect(googleImages).toBeDefined();
    expect(googleImages!.defaultEnabled).toBe(false);
  });

  test("getOutgoingAllowlist returns non-empty array", () => {
    const list = getOutgoingAllowlist();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });
});
