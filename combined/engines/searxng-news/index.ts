// SearXNG news engine — connects degoog news search to the local combined SearXNG backend

import {
  LOCAL_OUTGOING_HOSTS,
  SearXNGTypedEngine,
} from "../_shared/searxng-base";

export const type = "news";
export const outgoingHosts = LOCAL_OUTGOING_HOSTS;

export class SearXNGNewsEngine extends SearXNGTypedEngine {
  constructor() {
    super({
      name: "SearXNG News",
      bangShortcut: "sxn",
      category: "news",
    });
  }
}

export default SearXNGNewsEngine;
