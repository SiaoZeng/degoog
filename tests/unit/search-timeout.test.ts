import { describe, expect, mock, test } from "bun:test";

const REGISTRY_MODULE = "../../src/server/extensions/engines/registry";
const TRANSPORTS_MODULE = "../../src/server/extensions/transports/registry";
const PLUGIN_SETTINGS_MODULE = "../../src/server/utils/plugin-settings";

mock.module(REGISTRY_MODULE, () => ({
  getEngineMap: () => ({}),
  getEngineIdByInstance: () => "searxng-engine",
  getEngineDefaultTransport: () => undefined,
  getActiveWebEngines: async () => [],
  getEnginesForCustomType: async () => [],
}));

mock.module(TRANSPORTS_MODULE, () => ({
  resolveTransport: () => ({ name: "fetch" }),
}));
mock.module(PLUGIN_SETTINGS_MODULE, () => ({
  getSettings: async () => ({}),
  asString: (value: unknown) => (typeof value === "string" ? value : ""),
  asBoolean: (value: unknown) => value === true,
}));

const { resolveEngineTimeout } = await import("../../src/server/search");

describe("search engine timeouts", () => {
  test("uses engine timeout hints for slow combined engines", async () => {
    const timeout = await resolveEngineTimeout("searxng-engine", {
      name: "SearXNG",
      timeoutMs: 16_000,
      executeSearch: async () => [],
    });

    expect(timeout).toBe(21_000);
  });
});
