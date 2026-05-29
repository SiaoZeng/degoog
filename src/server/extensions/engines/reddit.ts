import { BraveEngine } from "./brave";
import type {
  SearchEngine,
  SearchResult,
  TimeFilter,
  EngineContext,
} from "../../types";

const REDDIT_HOST_RE = /(^|\.)reddit\.com$/i;

export class RedditEngine implements SearchEngine {
  name = "Reddit";
  bangShortcut = "r";
  private fallback: SearchEngine = new BraveEngine();

  setFallbackEngine(engine: SearchEngine): void {
    this.fallback = engine;
  }

  async executeSearch(
    query: string,
    page: number = 1,
    timeFilter?: TimeFilter,
    context?: EngineContext,
  ): Promise<SearchResult[]> {
    const siteQuery = `site:reddit.com ${query}`;
    const results = await this.fallback.executeSearch(
      siteQuery,
      page,
      timeFilter,
      context,
    );

    return results
      .filter((result) => this.isRedditUrl(result.url))
      .map((result) => ({
        ...result,
        source: this.name,
      }));
  }

  private isRedditUrl(url: string): boolean {
    try {
      return REDDIT_HOST_RE.test(new URL(url).hostname);
    } catch {
      return false;
    }
  }
}
