import { state } from "../state";
import { performSearch } from "./search";
import { performTabSearch } from "./tab-search";

interface TabInfo {
  id: string;
  name: string;
  icon: string | null;
}

let pluginTabs: TabInfo[] = [];
let tabsReady: Promise<void> | null = null;

export function initTabs(): void {
  document.querySelectorAll<HTMLElement>(".results-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const type = tab.dataset.type;
      if (state.currentQuery && type) {
        if (type.startsWith("tab:")) {
          void performTabSearch(state.currentQuery, type.slice(4));
        } else {
          void performSearch(state.currentQuery, type);
        }
      }
    });
  });

  tabsReady = _loadPluginTabs();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void _loadPluginTabs();
  });

  window.addEventListener("extensions-saved", () => void _loadPluginTabs());
}

const _loadPluginTabs = async (): Promise<void> => {
  try {
    const res = await fetch("/api/search-tabs");
    if (!res.ok) return;
    const data = (await res.json()) as { tabs: TabInfo[] };
    pluginTabs = data.tabs || [];
    _renderPluginTabs();
  } catch {}
};

function _renderPluginTabs(): void {
  const tabsContainer = document.getElementById("results-tabs");
  const toolsWrap = document.getElementById("tools-bar");
  if (!tabsContainer || !toolsWrap) return;

  tabsContainer.querySelectorAll(".results-tab[data-plugin-tab]").forEach((el) => el.remove());

  for (const tab of pluginTabs) {
    const el = document.createElement("div");
    el.className = "results-tab";
    el.dataset.type = `tab:${tab.id}`;
    el.dataset.pluginTab = "true";
    el.textContent = tab.name;
    tabsContainer.insertBefore(el, toolsWrap);

    el.addEventListener("click", () => {
      if (state.currentQuery) {
        void performTabSearch(state.currentQuery, tab.id);
      }
    });
  }
}

export function reloadPluginTabs(): void {
  void _loadPluginTabs();
}

export const getPluginTabIds = async (): Promise<Set<string>> => {
  if (tabsReady) await tabsReady;
  const ids = new Set<string>();
  for (const tab of pluginTabs) {
    ids.add(tab.id);
    if (tab.id.startsWith("engine:")) ids.add(tab.id.slice(7));
  }
  return ids;
};
