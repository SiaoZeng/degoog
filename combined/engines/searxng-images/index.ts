// SearXNG images engine — connects degoog image search to the local combined SearXNG backend

import {
  LOCAL_OUTGOING_HOSTS,
  SearXNGTypedEngine,
} from "../_shared/searxng-base";

export const type = "images";
export const outgoingHosts = LOCAL_OUTGOING_HOSTS;

export class SearXNGImagesEngine extends SearXNGTypedEngine {
  constructor() {
    super({
      name: "SearXNG Images",
      bangShortcut: "sxi",
      category: "images",
    });
  }
}

export default SearXNGImagesEngine;
