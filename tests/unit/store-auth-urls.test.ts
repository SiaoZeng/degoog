import { beforeEach, describe, expect, test } from "bun:test";
import { screenshotUrl } from "../../src/client/settings/store/lightbox";
import { repoImageSrc } from "../../src/client/settings/store/render";
import type { RepoInfo } from "../../src/client/types/store-tab";

const windowStub = {
  __DEGOOG_BASE_URL__: "/base",
  scopedT: () => (key: string) => key,
} as unknown as Window & typeof globalThis;

(globalThis as typeof globalThis & { window: Window & typeof globalThis }).window =
  windowStub;

beforeEach(() => {
  globalThis.window.__DEGOOG_BASE_URL__ = "/base";
});

describe("store auth urls", () => {
  test("screenshotUrl never leaks the settings token in query params", () => {
    const url = screenshotUrl("repo", "plugin", "item", "shot.png", "secret");
    expect(url).toBe("/base/api/store/screenshots/repo/plugin/item/shot.png");
    expect(url).not.toContain("token=");
  });

  test("repoImageSrc never appends the settings token to local asset urls", () => {
    const repo: RepoInfo = {
      url: "https://example.com/repo.git",
      localPath: "repo",
      lastFetched: new Date(0).toISOString(),
      name: "Repo",
      repoImage: "images/logo.png",
    };

    const url = repoImageSrc(repo, () => "secret");
    expect(url).toBe(
      "/base/api/store/repos/repo/asset?path=images%2Flogo.png",
    );
    expect(url).not.toContain("token=");
  });
});
