import { describe, test, expect } from "bun:test";
import { file } from "bun";

describe("combined entrypoint managed asset sync", () => {
  test("syncs managed fork assets on every start instead of copy-once guards", async () => {
    const entrypointUrl = new URL("../../entrypoint.combined.sh", import.meta.url);
    const entrypoint = await file(entrypointUrl).text();

    expect(entrypoint).toContain("sync_managed_dir");
    expect(entrypoint).toContain('rm -rf "$dst"');
    expect(entrypoint).not.toContain('if [ ! -f /app/data/engines/searxng/index.ts ]');
    expect(entrypoint).not.toContain('if [ ! -f /app/data/plugins/searxng-manager/index.ts ]');
  });

  test("uses Python YAML editing instead of brittle grep and line-window sed patches", async () => {
    const entrypointUrl = new URL("../../entrypoint.combined.sh", import.meta.url);
    const entrypoint = await file(entrypointUrl).text();

    expect(entrypoint).toContain("python3 - <<'PY'");
    expect(entrypoint).not.toContain("line + 6");
    expect(entrypoint).not.toContain("grep -n \"name:");
  });
});
