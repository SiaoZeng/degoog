import type { SearchEngine, SearchType, EngineConfig, ExtensionMeta } from "../types";
import { getSettings, maskSecrets } from "../plugin-settings";
import { GoogleEngine } from "./google";
import { DuckDuckGoEngine } from "./duckduckgo";
import { BingEngine } from "./bing";
import { BraveEngine } from "./brave";
import { WikipediaEngine } from "./wikipedia";
import { RedditEngine } from "./reddit";
import { GoogleImagesEngine } from "./google-images";
import { BingImagesEngine } from "./bing-images";
import { GoogleVideosEngine } from "./google-videos";
import { BingVideosEngine } from "./bing-videos";
import { BingNewsEngine } from "./bing-news";

export type EngineSearchType = "web" | "images" | "videos" | "news";

export interface EngineDefinition {
  id: string;
  displayName: string;
  searchType: EngineSearchType;
  EngineClass: new () => SearchEngine;
}

const BUILTIN_DEFINITIONS: EngineDefinition[] = [
  {
    id: "google",
    displayName: "Google",
    searchType: "web",
    EngineClass: GoogleEngine,
  },
  {
    id: "duckduckgo",
    displayName: "DuckDuckGo",
    searchType: "web",
    EngineClass: DuckDuckGoEngine,
  },
  {
    id: "bing",
    displayName: "Bing",
    searchType: "web",
    EngineClass: BingEngine,
  },
  {
    id: "brave",
    displayName: "Brave Search",
    searchType: "web" as const,
    EngineClass: BraveEngine,
  },
  {
    id: "wikipedia",
    displayName: "Wikipedia",
    searchType: "web",
    EngineClass: WikipediaEngine,
  },
  {
    id: "reddit",
    displayName: "Reddit",
    searchType: "web",
    EngineClass: RedditEngine,
  },
  {
    id: "google-images",
    displayName: "Google Images",
    searchType: "images",
    EngineClass: GoogleImagesEngine,
  },
  {
    id: "bing-images",
    displayName: "Bing Images",
    searchType: "images",
    EngineClass: BingImagesEngine,
  },
  {
    id: "google-videos",
    displayName: "Google Videos",
    searchType: "videos",
    EngineClass: GoogleVideosEngine,
  },
  {
    id: "bing-videos",
    displayName: "Bing Videos",
    searchType: "videos",
    EngineClass: BingVideosEngine,
  },
  {
    id: "bing-news",
    displayName: "Bing News",
    searchType: "news",
    EngineClass: BingNewsEngine,
  },
];

const webIds = BUILTIN_DEFINITIONS.filter((d) => d.searchType === "web").map(
  (d) => d.id,
);
export const ENGINE_IDS = webIds as readonly string[];
export type EngineId = (typeof ENGINE_IDS)[number];

const builtinMap = Object.fromEntries(
  BUILTIN_DEFINITIONS.map((d) => [d.id, new d.EngineClass()]),
) as Record<string, SearchEngine>;

const builtinRegistry = BUILTIN_DEFINITIONS.filter(
  (d) => d.searchType === "web",
).map((d) => ({
  id: d.id,
  displayName: d.displayName,
}));

interface PluginEntry {
  id: string;
  displayName: string;
  searchType: EngineSearchType;
  instance: SearchEngine;
}

let pluginEntries: PluginEntry[] = [];

export function getEngineRegistry(): { id: string; displayName: string }[] {
  return [
    ...builtinRegistry,
    ...pluginEntries
      .filter((e) => e.searchType === "web")
      .map((e) => ({ id: e.id, displayName: e.displayName })),
  ];
}

export function getEngineMap(): Record<string, SearchEngine> {
  const pluginMap = Object.fromEntries(
    pluginEntries.map((e) => [e.id, e.instance]),
  );
  return { ...builtinMap, ...pluginMap };
}

function engineSearchTypeFromSearchType(
  type: SearchType,
): EngineSearchType | null {
  if (type === "all") return "web";
  if (type === "images" || type === "videos" || type === "news") return type;
  return null;
}

export function getEnginesForSearchType(
  type: SearchType,
  config: EngineConfig,
): SearchEngine[] {
  const engineType = engineSearchTypeFromSearchType(type);
  if (!engineType) return [];

  const allDefinitions = [
    ...BUILTIN_DEFINITIONS.filter((d) => d.searchType === engineType),
    ...pluginEntries.filter((e) => e.searchType === engineType),
  ];
  const engineMap = getEngineMap();

  if (engineType === "web") {
    const active: SearchEngine[] = [];
    for (const def of allDefinitions) {
      if (config[def.id]) {
        const instance = engineMap[def.id];
        if (instance) active.push(instance);
      }
    }
    return active;
  }

  return allDefinitions.map((d) => engineMap[d.id]).filter(Boolean);
}

export function getDefaultEngineConfig(): Record<string, boolean> {
  const entries = getEngineRegistry();
  return Object.fromEntries(entries.map((e) => [e.id, true]));
}

export async function getEngineExtensionMeta(): Promise<ExtensionMeta[]> {
  const allDefs = [
    ...BUILTIN_DEFINITIONS,
    ...pluginEntries.map((e) => ({
      id: e.id,
      displayName: e.displayName,
      searchType: e.searchType,
      instance: e.instance,
    })),
  ];

  const engineMap = getEngineMap();
  const results: ExtensionMeta[] = [];

  for (const def of allDefs) {
    const instance = engineMap[def.id];
    const schema = instance?.settingsSchema ?? [];
    const rawSettings = schema.length > 0 ? await getSettings(def.id) : {};
    const maskedSettings = maskSecrets(rawSettings, schema);

    results.push({
      id: def.id,
      displayName: def.displayName,
      description: `${def.searchType} search engine`,
      type: "engine",
      configurable: schema.length > 0,
      settingsSchema: schema,
      settings: maskedSettings,
    });
  }

  return results;
}

function isSearchEngine(val: unknown): val is SearchEngine {
  return (
    typeof val === "object" &&
    val !== null &&
    "name" in val &&
    typeof (val as SearchEngine).name === "string" &&
    "executeSearch" in val &&
    typeof (val as SearchEngine).executeSearch === "function"
  );
}

export async function initEngines(): Promise<void> {
  const { readdir } = await import("fs/promises");
  const { join } = await import("path");
  const { pathToFileURL } = await import("url");
  const pluginDir =
    process.env.DEGOOG_ENGINES_DIR ?? join(process.cwd(), "data", "engines");
  const seen = new Set<string>(BUILTIN_DEFINITIONS.map((d) => d.id));
  pluginEntries = [];

  try {
    const files = await readdir(pluginDir);
    for (const file of files) {
      if (!/\.(js|ts|mjs|cjs)$/.test(file)) continue;
      const base = file.replace(/\.(js|ts|mjs|cjs)$/, "");
      const id = `engine-${base}`;
      if (seen.has(id)) continue;
      seen.add(id);

      try {
        const fullPath = join(pluginDir, file);
        const url = pathToFileURL(fullPath).href;
        const mod = await import(url);
        const Export = mod.default ?? mod.engine ?? mod.Engine;
        const instance: SearchEngine =
          typeof Export === "function" ? new Export() : Export;
        if (!isSearchEngine(instance)) continue;
        const searchType =
          mod.type === "images" || mod.type === "videos" || mod.type === "news"
            ? mod.type
            : "web";
        if (instance.configure && instance.settingsSchema?.length) {
          const stored = await getSettings(id);
          if (Object.keys(stored).length > 0) instance.configure(stored);
        }
        pluginEntries.push({
          id,
          displayName: instance.name,
          searchType,
          instance,
        });
      } catch {
      }
    }
  } catch {
  }
}
