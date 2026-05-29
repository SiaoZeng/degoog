import { describe, test, expect } from "bun:test";
import { DuckDuckGoEngine } from "../../src/server/extensions/engines/duckduckgo";
import { BraveEngine } from "../../src/server/extensions/engines/brave";
import { GoogleEngine } from "../../src/server/extensions/engines/google";
import { RedditEngine } from "../../src/server/extensions/engines/reddit";
import type { SearchResult } from "../../src/server/types";

const fixtureHtml = `
<html>
<body>
  <div class="result">
    <h2 class="result__title"><a href="https://example.com/page1">First Result</a></h2>
    <div class="result__snippet">Snippet one</div>
  </div>
  <div class="result">
    <h2 class="result__title"><a href="https://example.com/page2">Second Result</a></h2>
    <div class="result__snippet">Snippet two</div>
  </div>
</body>
</html>
`;

const googleFixtureHtml = `
<html>
<body>
  <div>
    <a href="/url?q=https://example.com/article&amp;sa=U&amp;ved=1">
      Example Article
      <span>example.com</span>
    </a>
  </div>
  <div>Snippet from Google</div>
  <div>
    <a href="/url?q=https://example.com/plain&amp;sa=U&amp;ved=2">Plain Text Result</a>
  </div>
  <div>Plain snippet</div>
</body>
</html>
`;

const redditFallbackHtml = `
<html>
<body>
  <div data-type="web">
    <a href="https://www.reddit.com/r/privacy/comments/abc123/privacy_tools_roundup/">
      <div class="search-snippet-title">Privacy tools roundup</div>
    </a>
    <div class="generic-snippet">
      <div class="content">r/privacy discussion</div>
    </div>
  </div>
  <div data-type="web">
    <a href="https://example.com/not-reddit">
      <div class="search-snippet-title">Ignore me</div>
    </a>
    <div class="generic-snippet">
      <div class="content">not reddit</div>
    </div>
  </div>
</body>
</html>
`;

describe("engine execution", () => {
  test("DuckDuckGo executeSearch returns SearchResult[] with mocked fetch", async () => {
    const engine = new DuckDuckGoEngine();
    const mockFetch = async (): Promise<Response> =>
      new Response(fixtureHtml, {
        headers: { "Content-Type": "text/html" },
      });
    const results = await engine.executeSearch("test", 1, "any", {
      fetch: mockFetch,
    });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(2);
    const [first, second] = results as SearchResult[];
    expect(first.title).toBe("First Result");
    expect(first.url).toBe("https://example.com/page1");
    expect(first.snippet).toBe("Snippet one");
    expect(first.source).toBe("DuckDuckGo");
    expect(second.title).toBe("Second Result");
    expect(second.url).toBe("https://example.com/page2");
  });

  test("DuckDuckGo executeSearch passes timeFilter into request", async () => {
    const engine = new DuckDuckGoEngine();
    let capturedUrl = "";
    const mockFetch = async (url: string): Promise<Response> => {
      capturedUrl = url;
      return new Response(
        '<html><body><div class="result"></div></body></html>',
      );
    };
    await engine.executeSearch("q", 1, "day", { fetch: mockFetch });
    expect(capturedUrl).toContain("df=d");
  });

  test("DuckDuckGo executeSearch passes page offset", async () => {
    const engine = new DuckDuckGoEngine();
    let capturedUrl = "";
    const mockFetch = async (url: string): Promise<Response> => {
      capturedUrl = url;
      return new Response("<html><body></body></html>");
    };
    await engine.executeSearch("q", 2, "any", { fetch: mockFetch });
    expect(capturedUrl).toContain("s=30");
    expect(capturedUrl).toContain("dc=31");
  });

  test("Google executeSearch parses mobile XHTML anchors without relying on nested span titles", async () => {
    const engine = new GoogleEngine();
    const mockFetch = async (): Promise<Response> =>
      new Response(googleFixtureHtml, {
        headers: { "Content-Type": "application/xhtml+xml" },
      });
    const results = await engine.executeSearch("privacy", 1, "any", {
      fetch: mockFetch,
    });
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      title: "Example Article",
      url: "https://example.com/article",
      snippet: "Snippet from Google",
      source: "Google",
    });
    expect(results[1]).toEqual({
      title: "Plain Text Result",
      url: "https://example.com/plain",
      snippet: "Plain snippet",
      source: "Google",
    });
  });

  test("Reddit executeSearch falls back to site-filtered Brave results", async () => {
    const engine = new RedditEngine();
    let capturedUrl = "";
    const mockFetch = async (url: string): Promise<Response> => {
      capturedUrl = url;
      return new Response(redditFallbackHtml, {
        headers: { "Content-Type": "text/html" },
      });
    };
    const results = await engine.executeSearch("privacy tools", 1, "week", {
      fetch: mockFetch,
    });
    expect(capturedUrl).toContain("https://search.brave.com/search?");
    expect(capturedUrl).toContain("q=site%3Areddit.com+privacy+tools");
    expect(capturedUrl).toContain("tf=pw");
    expect(results).toEqual([
      {
        title: "Privacy tools roundup",
        url: "https://www.reddit.com/r/privacy/comments/abc123/privacy_tools_roundup/",
        snippet: "r/privacy discussion",
        source: "Reddit",
      },
    ]);
  });

  test("Reddit executeSearch can reuse a configured Brave fallback engine", async () => {
    const engine = new RedditEngine();
    const brave = new BraveEngine();
    brave.configure({ safeSearch: "strict" });
    engine.setFallbackEngine(brave);

    let cookie = "";
    const mockFetch = async (_url: string, init?: RequestInit): Promise<Response> => {
      const headers = init?.headers as Record<string, string> | undefined;
      cookie = headers?.Cookie ?? "";
      return new Response(redditFallbackHtml, {
        headers: { "Content-Type": "text/html" },
      });
    };

    await engine.executeSearch("privacy tools", 1, "any", {
      fetch: mockFetch,
      buildAcceptLanguage: () => "en-US,en;q=0.9",
    });

    expect(cookie).toContain("safesearch=strict");
  });
});