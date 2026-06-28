import * as cheerio from "cheerio";

const FALLBACK_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

const BASE_URL = "https://search.brave.com/";
const SEARXNG_SAFESEARCH_MAP = { off: "0", moderate: "1", strict: "2" };

const TIME_RANGE_MAP = { day: "pd", week: "pw", month: "pm", year: "py" };

const _cookie = (lang, safeSearch) => {
  const parts = [`safesearch=${safeSearch}`, "useLocation=0", "summarizer=0"];
  if (lang && lang !== "en") {
    parts.push(`country=${lang}`, `ui_lang=${lang}-${lang}`);
  } else {
    parts.push("country=us", "ui_lang=en-us");
  }
  return parts.join("; ");
};

export default class BraveEngine {
  isClientExposed = false;
  name = "Brave Search";
  bangShortcut = "brave";
  safeSearch = "moderate";

  settingsSchema = [
    {
      key: "safeSearch",
      label: "Safe Search",
      type: "select",
      options: ["off", "moderate", "strict"],
      default: "moderate",
      description: "Filter explicit content from search results.",
    },
    {
      key: "outgoingTransport",
      label: "Outgoing HTTP client",
      type: "select",
      options: ["fetch", "curl", "curl-impersonate", "curl-fallback"],
      default: "curl-impersonate",
      description: "The outgoing HTTP client to use for this engine.",
    },
  ];

  configure(settings) {
    if (typeof settings.safeSearch === "string") this.safeSearch = settings.safeSearch;
  }

  async executeSearch(query, page = 1, timeFilter, context) {
    const args = { q: query, source: "web" };
    if (page > 1) args.offset = String(page - 1);
    if (timeFilter && timeFilter !== "any" && timeFilter !== "custom" && TIME_RANGE_MAP[timeFilter]) {
      args.tf = TIME_RANGE_MAP[timeFilter];
    }
    const url = `${BASE_URL}search?${new URLSearchParams(args).toString()}`;
    const doFetch = context?.fetch ?? fetch;
    let response = await doFetch(url, {
      headers: {
        "User-Agent": context?.userAgent?.() ?? FALLBACK_UA,
        "Accept-Encoding": "gzip, deflate",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": context?.buildAcceptLanguage?.() || "en-US,en;q=0.9",
        Cookie: _cookie(context?.lang, this.safeSearch),
      },
      redirect: "follow",
    });
    if (response.status === 429) {
      const localBase =
        process.env.SEARXNG_BASE_URL?.trim() ||
        `http://127.0.0.1:${process.env.SEARXNG_PORT?.trim() || "8888"}`;
      const fallbackParams = new URLSearchParams({
        q: query,
        format: "json",
        pageno: String(page || 1),
        categories: "general",
        engines: "brave",
        safesearch: SEARXNG_SAFESEARCH_MAP[this.safeSearch] || "1",
      });
      if (context?.lang) fallbackParams.set("language", context.lang);
      if (timeFilter && timeFilter !== "any" && timeFilter !== "custom") {
        fallbackParams.set("time_range", timeFilter);
      }
      const fallback = await fetch(`${localBase}/search?${fallbackParams.toString()}`);
      const payload = await fallback.json();
      let items = Array.isArray(payload?.results) ? payload.results : [];
      items = items.filter((item) =>
        (Array.isArray(item?.sources) &&
          item.sources.some((src) => src === "SearXNG:brave")) ||
        item?.source === "SearXNG:brave",
      );
      if (items.length === 0) {
        const broadParams = new URLSearchParams({
          q: query,
          format: "json",
          pageno: String(page || 1),
          categories: "general",
          safesearch: SEARXNG_SAFESEARCH_MAP[this.safeSearch] || "1",
        });
        if (context?.lang) broadParams.set("language", context.lang);
        if (timeFilter && timeFilter !== "any" && timeFilter !== "custom") {
          broadParams.set("time_range", timeFilter);
        }
        const broad = await fetch(`${localBase}/search?${broadParams.toString()}`);
        const broadPayload = await broad.json();
        items = Array.isArray(broadPayload?.results) ? broadPayload.results : [];
      }
      return items
        .map((item) => ({
          title: item.title,
          url: item.url,
          snippet: item.snippet ?? item.content ?? "",
          source: this.name,
          ...(item.thumbnail ? { thumbnail: item.thumbnail } : {}),
        }))
        .filter((item) => item.title && item.url);
    }
    context?.sentinel?.(response, this.name);

    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];

    $('div[data-type="web"]').each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find('a[href^="http"]').first();
      const href = linkEl.attr("href") ?? "";
      const titleEl = $el.find('div.search-snippet-title, div[class*="search-snippet-title"]').first();
      const contentEl = $el.find("div.generic-snippet div.content").first();

      try {
        const parsed = new URL(href, BASE_URL);
        if (parsed.origin === new URL(BASE_URL).origin) return;
      } catch { return; }
      if (!href) return;
      const title = titleEl.text().trim();
      const snippet = contentEl.text().trim();
      if (!title) return;
      const thumbnail = $el.find('a[class*="thumbnail"] img[src]').first().attr("src");
      results.push({
        title, url: href, snippet, source: this.name,
        ...(thumbnail ? { thumbnail } : {}),
      });
    });

    return results;
  }
}
