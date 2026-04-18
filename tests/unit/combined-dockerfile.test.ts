import { describe, test, expect } from "bun:test";
import { file } from "bun";

describe("combined Dockerfile reproducibility", () => {
  test("pins the base images and SearXNG source ref", async () => {
    const dockerfileUrl = new URL("../../Dockerfile.combined", import.meta.url);
    const dockerfile = await file(dockerfileUrl).text();

    expect(dockerfile).toContain("FROM python:3.12-alpine@sha256:236173eb74001afe2f60862de935b74fcbd00adfca247b2c27051a70a6a39a2d AS searxng-build");
    expect(dockerfile).toContain("FROM oven/bun:1-alpine@sha256:26d8996560ca94eab9ce48afc0c7443825553c9a851f40ae574d47d20906826d AS degoog-build");
    expect(dockerfile).toContain("ARG SEARXNG_REF=e8299a4c37627c6271ed83227c27cf98021c03f6");
    expect(dockerfile).not.toContain("git clone --depth 1 https://github.com/searxng/searxng.git .");
  });

  test("reuses Bun from the Bun build stage instead of curl-installing it", async () => {
    const dockerfileUrl = new URL("../../Dockerfile.combined", import.meta.url);
    const dockerfile = await file(dockerfileUrl).text();

    expect(dockerfile).toContain("COPY --from=degoog-build /usr/local/bin/bun /usr/local/bin/bun");
    expect(dockerfile).not.toContain("curl -fsSL https://bun.sh/install");
  });
});
