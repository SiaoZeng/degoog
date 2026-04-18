// SearXNG videos engine — connects degoog video search to the local combined SearXNG backend

import {
  LOCAL_OUTGOING_HOSTS,
  SearXNGTypedEngine,
} from "../_shared/searxng-base";

export const type = "videos";
export const outgoingHosts = LOCAL_OUTGOING_HOSTS;

export class SearXNGVideosEngine extends SearXNGTypedEngine {
  constructor() {
    super({
      name: "SearXNG Videos",
      bangShortcut: "sxv",
      category: "videos",
    });
  }
}

export default SearXNGVideosEngine;
