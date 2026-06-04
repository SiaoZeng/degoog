import { describe, test, expect, beforeAll, afterEach } from "bun:test";
import { Hono } from "hono";
import {
  clearPluginRoutes,
  registerPluginRoutesFromModule,
} from "../../src/server/extensions/plugin-routes/registry";

let pluginRoutesRouter: Hono;

beforeAll(async () => {
  const mod = await import("../../src/server/routes/plugin-routes");
  pluginRoutesRouter = mod.default;
});

afterEach(() => {
  clearPluginRoutes();
});

describe("routes/plugin-routes", () => {
  test("GET /api/plugin/unknown/some path returns 404", async () => {
    const res = await pluginRoutesRouter.request(
      "http://localhost/api/plugin/unknown-plugin-id/some",
    );
    expect(res.status).toBe(404);
  });

  test("mounted plugin router preserves wildcard suffix under a base path", async () => {
    await registerPluginRoutesFromModule("searxng-manager", "/tmp", {
      routes: [
        {
          method: "get",
          path: "/engines",
          handler: () => new Response("engines-ok"),
        },
      ],
    });
    const app = new Hono();
    app.route("/base", pluginRoutesRouter);

    const res = await app.request(
      "http://localhost/base/api/plugin/searxng-manager/engines",
    );

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("engines-ok");
  });
});
