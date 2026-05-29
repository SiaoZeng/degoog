import { describe, test, expect, mock } from "bun:test";

const SEARCH_MODULE_PATH = "../../src/server/search";
const PLUGIN_SETTINGS_PATH = "../../src/server/utils/plugin-settings";
const SEARCH_ROUTE_PATH = "../../src/server/routes/search";

describe("routes/search retry", () => {
  test("GET /api/search/retry updates cached engine timings using the resolved engine name", async () => {
    const actualSearch = await import("../../src/server/search");

    mock.module(PLUGIN_SETTINGS_PATH, () => ({
      getSettings: async () => ({}) as Record<string, string>,
      isDisabled: async () => false,
      asString: (value: unknown) =>
        typeof value === "string"
          ? value
          : Array.isArray(value)
            ? (value[0] ?? "")
            : "",
    }));

    mock.module(SEARCH_MODULE_PATH, () => ({
      ...actualSearch,
      search: async () => ({
        results: [],
        atAGlance: null,
        query: "privacy",
        totalTime: 1,
        type: "images",
        engineTimings: [{ name: "Google Images", time: 5, resultCount: 0 }],
        relatedSearches: [],
        knowledgePanel: null,
      }),
      searchSingleEngine: async () => ({
        results: [
          {
            title: "Image Result",
            url: "https://example.com/image-result",
            snippet: "snippet",
            source: "Google Images",
          },
        ],
        timing: { name: "Google Images", time: 7, resultCount: 1 },
      }),
    }));

    const { default: router } = await import(SEARCH_ROUTE_PATH);

    const seedResponse = await router.request(
      "http://localhost/api/search?q=privacy&type=images&page=1&google-images=true&bing-images=false",
    );
    expect(seedResponse.status).toBe(200);

    const retryResponse = await router.request(
      "http://localhost/api/search/retry?q=privacy&type=images&page=1&engine=google-images&google-images=true&bing-images=false",
    );
    expect(retryResponse.status).toBe(200);

    const body = await retryResponse.json();
    expect(body.engineTimings).toEqual([
      { name: "Google Images", time: 7, resultCount: 1 },
    ]);
  });
});
