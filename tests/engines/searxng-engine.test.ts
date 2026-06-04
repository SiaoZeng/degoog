import { describe, expect, test } from "bun:test";
import { SearXNGTypedEngine } from "../../combined/engines/_shared/searxng-base";
import type { EngineFetch } from "../../src/server/types";

describe("SearXNG combined engine", () => {
  test("queries the local SearXNG JSON API and maps results", async () => {
    const previousPort = process.env.SEARXNG_PORT;
    const previousBaseUrl = process.env.SEARXNG_BASE_URL;
    process.env.SEARXNG_PORT = "18888";
    delete process.env.SEARXNG_BASE_URL;

    try {
      const seenUrls: string[] = [];
      const fakeFetch: EngineFetch = async (url) => {
        seenUrls.push(url);
        return Response.json({
          results: [
            {
              title: "Result A",
              url: "https://example.test/a",
              content: "Snippet A",
              engine: "duckduckgo",
              thumbnail: "https://example.test/thumb.jpg",
              img_src: "https://example.test/image.jpg",
              duration: "1:23",
            },
            { title: "Missing URL" },
          ],
        });
      };

      const engine = new SearXNGTypedEngine({
        name: "SearXNG",
        bangShortcut: "sx",
        category: "general",
      });
      engine.configure({ engines: "wikipedia,duckduckgo", safesearch: "1" });

      const results = await engine.executeSearch("qwen tts", 2, "week", {
        fetch: fakeFetch,
        lang: "de-DE",
      });

      expect(seenUrls).toHaveLength(1);
      const firstUrl = seenUrls[0];
      if (!firstUrl) throw new Error("SearXNG engine did not fetch");
      const requested = new URL(firstUrl);
      expect(requested.origin).toBe("http://127.0.0.1:18888");
      expect(requested.pathname).toBe("/search");
      expect(requested.searchParams.get("q")).toBe("qwen tts");
      expect(requested.searchParams.get("format")).toBe("json");
      expect(requested.searchParams.get("pageno")).toBe("2");
      expect(requested.searchParams.get("safesearch")).toBe("1");
      expect(requested.searchParams.get("categories")).toBe("general");
      expect(requested.searchParams.get("engines")).toBe("wikipedia,duckduckgo");
      expect(requested.searchParams.get("language")).toBe("de-DE");
      expect(requested.searchParams.get("time_range")).toBe("week");
      expect(results).toEqual([
        {
          title: "Result A",
          url: "https://example.test/a",
          snippet: "Snippet A",
          source: "SearXNG:duckduckgo",
          thumbnail: "https://example.test/thumb.jpg",
          imageUrl: "https://example.test/image.jpg",
          duration: "1:23",
        },
      ]);
    } finally {
      if (previousPort === undefined) delete process.env.SEARXNG_PORT;
      else process.env.SEARXNG_PORT = previousPort;
      if (previousBaseUrl === undefined) delete process.env.SEARXNG_BASE_URL;
      else process.env.SEARXNG_BASE_URL = previousBaseUrl;
    }
  });
});
