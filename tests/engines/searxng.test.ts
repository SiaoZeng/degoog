import { describe, test, expect } from "bun:test";
import { SearXNGEngine } from "../../combined/engines/searxng/index";
import { SearXNGImagesEngine } from "../../combined/engines/searxng-images/index";
import { SearXNGVideosEngine } from "../../combined/engines/searxng-videos/index";
import { SearXNGNewsEngine } from "../../combined/engines/searxng-news/index";

const emptyJsonResponse = () =>
  Response.json({
    results: [],
  });

describe("combined searxng engines", () => {
  test("web engine does not expose a user-configurable baseUrl and ignores injected baseUrl settings", async () => {
    const engine = new SearXNGEngine();
    const schemaKeys = engine.settingsSchema.map((field) => field.key);
    expect(schemaKeys).not.toContain("baseUrl");

    let capturedUrl = "";
    const mockFetch = async (url: string): Promise<Response> => {
      capturedUrl = url;
      return emptyJsonResponse();
    };

    engine.configure({
      baseUrl: "https://evil.example.invalid",
      engines: "google",
    } as Record<string, string>);
    await engine.executeSearch("privacy", 1, "any", { fetch: mockFetch });

    expect(capturedUrl.startsWith("http://127.0.0.1:8888/search?")).toBe(true);
    expect(capturedUrl).not.toContain("evil.example.invalid");
  });

  test("web engine uses the general category and does not lie about hour filters", async () => {
    const engine = new SearXNGEngine();
    let capturedUrl = "";
    const mockFetch = async (url: string): Promise<Response> => {
      capturedUrl = url;
      return emptyJsonResponse();
    };

    await engine.executeSearch("privacy", 1, "hour", { fetch: mockFetch });

    expect(capturedUrl).toContain("categories=general");
    expect(capturedUrl).not.toContain("time_range=");
  });

  test("images engine targets the images category", async () => {
    const engine = new SearXNGImagesEngine();
    let capturedUrl = "";
    const mockFetch = async (url: string): Promise<Response> => {
      capturedUrl = url;
      return emptyJsonResponse();
    };

    await engine.executeSearch("mountain", 1, "day", { fetch: mockFetch });

    expect(capturedUrl).toContain("categories=images");
    expect(capturedUrl).toContain("time_range=day");
  });

  test("videos engine targets the videos category", async () => {
    const engine = new SearXNGVideosEngine();
    let capturedUrl = "";
    const mockFetch = async (url: string): Promise<Response> => {
      capturedUrl = url;
      return emptyJsonResponse();
    };

    await engine.executeSearch("conference talk", 1, "week", { fetch: mockFetch });

    expect(capturedUrl).toContain("categories=videos");
    expect(capturedUrl).toContain("time_range=week");
  });

  test("news engine targets the news category", async () => {
    const engine = new SearXNGNewsEngine();
    let capturedUrl = "";
    const mockFetch = async (url: string): Promise<Response> => {
      capturedUrl = url;
      return emptyJsonResponse();
    };

    await engine.executeSearch("linux", 2, "month", { fetch: mockFetch });

    expect(capturedUrl).toContain("categories=news");
    expect(capturedUrl).toContain("pageno=2");
    expect(capturedUrl).toContain("time_range=month");
  });

  test("engine ignores non-local SEARXNG_BASE_URL overrides", async () => {
    process.env.SEARXNG_BASE_URL = "https://evil.example.invalid";
    try {
      const engine = new SearXNGEngine();
      let capturedUrl = "";
      const mockFetch = async (url: string): Promise<Response> => {
        capturedUrl = url;
        return emptyJsonResponse();
      };

      await engine.executeSearch("privacy", 1, "any", { fetch: mockFetch });

      expect(capturedUrl.startsWith("http://127.0.0.1:8888/search?")).toBe(true);
    } finally {
      delete process.env.SEARXNG_BASE_URL;
    }
  });

  test("engine degrades to empty results when the backend fetch fails", async () => {
    const engine = new SearXNGEngine();
    const results = await engine.executeSearch("privacy", 1, "any", {
      fetch: async (): Promise<Response> => {
        throw new Error("backend offline");
      },
    });

    expect(results).toEqual([]);
  });
});
