import { describe, expect, test } from "bun:test";
import { applySearXNGEngineToggles } from "../../combined/plugins/searxng-manager/index";

describe("combined SearXNG manager", () => {
  test("updates only exact engine blocks and inserts missing disabled keys", () => {
    const input = [
      "engines:",
      "  - name: alpha",
      "    shortcut: a",
      "  - name: beta",
      "    disabled: true",
      "    shortcut: b",
      "  - name: alphabet",
      "    disabled: true",
      "    shortcut: ab",
      "",
    ].join("\n");

    const result = applySearXNGEngineToggles(input, [
      { name: "alpha", enabled: false },
      { name: "beta", enabled: true },
    ]);

    expect(result.matched).toEqual(["alpha", "beta"]);
    expect(result.text).toBe(
      [
        "engines:",
        "  - name: alpha",
        "    disabled: true",
        "    shortcut: a",
        "  - name: beta",
        "    disabled: false",
        "    shortcut: b",
        "  - name: alphabet",
        "    disabled: true",
        "    shortcut: ab",
        "",
      ].join("\n"),
    );
  });
});
