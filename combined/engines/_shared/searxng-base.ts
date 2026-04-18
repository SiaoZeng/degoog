import type {
  SearchEngine,
  SearchResult,
  TimeFilter,
  EngineContext,
  SettingField,
} from "../../../src/server/types";

const SUPPORTED_TIME_RANGE_MAP: Partial<Record<TimeFilter, string>> = {
  day: "day",
  week: "week",
  month: "month",
  year: "year",
};

const resolveBaseUrl = (): string => {
  const port = process.env.SEARXNG_PORT?.trim() || "8888";
  const fallback = `http://127.0.0.1:${port}`;
  const explicit = process.env.SEARXNG_BASE_URL?.trim();
  if (!explicit) return fallback;

  try {
    const parsed = new URL(explicit);
    const host = parsed.hostname.toLowerCase();
    if (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)
    ) {
      return explicit.replace(/\/+$/, "");
    }
  } catch {
    return fallback;
  }

  return fallback;
};

export const LOCAL_OUTGOING_HOSTS = ["localhost", "127.0.0.1"];

export interface SearXNGVariantOptions {
  name: string;
  bangShortcut: string;
  category: string;
}

export class SearXNGTypedEngine implements SearchEngine {
  name: string;
  bangShortcut: string;
  private readonly category: string;
  private readonly baseUrl: string;
  private engines = "";
  private safesearch = "0";

  settingsSchema: SettingField[] = [
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

  constructor(options: SearXNGVariantOptions) {
    this.name = options.name;
    this.bangShortcut = options.bangShortcut;
    this.category = options.category;
    this.baseUrl = resolveBaseUrl();
  }

  configure(settings: Record<string, string | string[]>): void {
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
      categories: this.category,
    });

    if (this.engines) {
      params.set("engines", this.engines);
    }
    if (context?.lang) {
      params.set("language", context.lang);
    }
    const mappedTimeRange = timeFilter ? SUPPORTED_TIME_RANGE_MAP[timeFilter] : undefined;
    if (mappedTimeRange) {
      params.set("time_range", mappedTimeRange);
    }

    const url = `${this.baseUrl}/search?${params.toString()}`;
    const doFetch = context?.fetch ?? fetch;

    try {
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
        .filter((result) => result.title && result.url)
        .map((result) => ({
          title: result.title!,
          url: result.url!,
          snippet: result.content ?? "",
          source: `SearXNG:${result.engine ?? "unknown"}`,
          ...(result.thumbnail ? { thumbnail: result.thumbnail } : {}),
          ...(result.img_src ? { imageUrl: result.img_src } : {}),
          ...(result.duration ? { duration: result.duration } : {}),
        }));
    } catch {
      return [];
    }
  }
}
