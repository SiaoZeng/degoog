// SearXNG web engine — connects degoog to the local combined SearXNG backend

import {
  LOCAL_OUTGOING_HOSTS,
  SearXNGTypedEngine,
} from "../_shared/searxng-base";

export const type = "web";
export const outgoingHosts = LOCAL_OUTGOING_HOSTS;

export class SearXNGEngine extends SearXNGTypedEngine {
  constructor() {
    super({
      name: "SearXNG",
      bangShortcut: "sx",
      category: "general",
    });
  }
}

export default SearXNGEngine;
