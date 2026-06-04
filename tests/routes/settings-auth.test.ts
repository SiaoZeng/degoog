import { describe, test, expect } from "bun:test";
import type { Context } from "hono";
import {
  canBalrogPass,
  getSettingsAuthToken,
  validateSettingsAuthToken,
  gandalf,
} from "../../src/server/routes/settings-auth";

describe("routes/settings-auth", () => {
  test("canBalrogPass returns undefined when no cookie or header", () => {
    const req = new Request("http://localhost/", { headers: {} });
    const c = {
      req: Object.assign(req, {
        header: (name: string) => req.headers.get(name) ?? undefined,
        query: (name: string) =>
          new URL(req.url).searchParams.get(name) ?? undefined,
      }),
    };
    const token = canBalrogPass(
      c as unknown as Parameters<typeof canBalrogPass>[0],
    );
    expect(token).toBeUndefined();
  });

  test("descriptive auth aliases delegate to upstream token helpers", async () => {
    const req = new Request("http://localhost/?token=query-token", {
      headers: { "x-settings-token": "header-token" },
    });
    const c = {
      req: Object.assign(req, {
        header: (name: string) => req.headers.get(name) ?? undefined,
        query: (name: string) =>
          new URL(req.url).searchParams.get(name) ?? undefined,
      }),
    };
    const ctx = c as unknown as Context;

    expect(getSettingsAuthToken(ctx)).toBe("header-token");
    expect(canBalrogPass(ctx)).toBe("header-token");
    await expect(validateSettingsAuthToken("missing-token")).resolves.toBe(
      await gandalf("missing-token"),
    );
  });

});
