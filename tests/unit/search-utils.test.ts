import { describe, expect, mock, test } from "bun:test";

const REGISTRY_MODULE = "../../src/server/extensions/engines/registry";

mock.module(REGISTRY_MODULE, () => ({
  getDefaultEngineConfig: () => ({
    google: false,
    bing: true,
  }),
  listEngineIds: () => ["google", "bing", "brave"],
}));

// Dynamic import is required here so the mocked registry module is applied before evaluation.
const { parseEngineConfig } = await import("../../src/server/utils/search");

describe("search utils", () => {
  test("parseEngineConfig falls back to registry defaults when query params are absent", () => {
    expect(parseEngineConfig(new URLSearchParams())).toEqual({
      google: false,
      bing: true,
      brave: true,
    });
  });

  test("parseEngineConfig honors explicit query overrides", () => {
    expect(
      parseEngineConfig(new URLSearchParams("google=true&bing=false")),
    ).toEqual({
      google: true,
      bing: false,
      brave: true,
    });
  });
});
