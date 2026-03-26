// SearXNG Engine — connects degoog to a local SearXNG instance for 242+ search sources
// Loaded automatically by degoog's plugin engine registry from data/engines/

import type {
  SearchEngine,
  SearchResult,
  TimeFilter,
  EngineContext,
  SettingField,
} from "../../../src/server/types";

const TIME_RANGE_MAP: Record<string, string> = {
  hour: "day",
  day: "day",
  week: "week",
  month: "month",
  year: "year",
};

const SEARCH_TYPE_MAP: Record<string, string> = {
  web: "general",
  images: "images",
  videos: "videos",
  news: "news",
};

export const type = "web";
export const outgoingHosts = ["localhost", "127.0.0.1"];

export class SearXNGEngine implements SearchEngine {
  name = "SearXNG";
  bangShortcut = "sx";
  baseUrl = "http://127.0.0.1:8888";

  settingsSchema: SettingField[] = [
    {
      key: "baseUrl",
      label: "SearXNG URL",
      type: "text",
      description:
        "Base URL of your SearXNG instance (default: http://127.0.0.1:8888)",
    },
    {
      key: "categories",
      label: "Categories",
      type: "text",
      description:
        'Comma-separated categories to search (e.g. "general,science,it"). Leave empty for default.',
    },
    {
      key: "engines",
      label: "Engines",
      type: "text",
      description:
        'Comma-separated engine names to use (e.g. "google,duckduckgo,wikipedia"). Leave empty for all enabled.',
    },
    {
      key: "safesearch",
      label: "Safe Search",
      type: "select",
      options: ["0", "1", "2"],
      description: "Safe search level: 0=off, 1=moderate, 2=strict",
    },
  ];

  private categories = "";
  private engines = "";
  private safesearch = "0";

  configure(settings: Record<string, string | string[]>): void {
    if (typeof settings.baseUrl === "string" && settings.baseUrl.trim()) {
      this.baseUrl = settings.baseUrl.trim().replace(/\/+$/, "");
    }
    if (typeof settings.categories === "string") {
      this.categories = settings.categories.trim();
    }
    if (typeof settings.engines === "string") {
      this.engines = settings.engines.trim();
    }
    if (typeof settings.safesearch === "string") {
      this.safesearch = settings.safesearch;
    }
  }

  async executeSearch(
    query: string,
    page: number = 1,
    timeFilter?: TimeFilter,
    context?: EngineContext,
  ): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      pageno: String(Math.max(1, page)),
      safesearch: this.safesearch,
    });

    if (this.categories) {
      params.set("categories", this.categories);
    }
    if (this.engines) {
      params.set("engines", this.engines);
    }
    if (context?.lang) {
      params.set("language", context.lang);
    }
    if (
      timeFilter &&
      timeFilter !== "any" &&
      timeFilter !== "custom" &&
      TIME_RANGE_MAP[timeFilter]
    ) {
      params.set("time_range", TIME_RANGE_MAP[timeFilter]);
    }

    const url = `${this.baseUrl}/search?${params.toString()}`;
    const doFetch = context?.fetch ?? fetch;

    const response = await doFetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        engine?: string;
        thumbnail?: string;
        img_src?: string;
        duration?: string;
      }>;
    };

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results
      .filter((r) => r.title && r.url)
      .map((r) => ({
        title: r.title!,
        url: r.url!,
        snippet: r.content ?? "",
        source: `SearXNG:${r.engine ?? "unknown"}`,
        ...(r.thumbnail ? { thumbnail: r.thumbnail } : {}),
        ...(r.img_src ? { imageUrl: r.img_src } : {}),
        ...(r.duration ? { duration: r.duration } : {}),
      }));
  }
}

export default SearXNGEngine;
