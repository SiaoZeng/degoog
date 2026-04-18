import { describe, test, expect, beforeAll, beforeEach, afterEach } from "bun:test";
import { file } from "bun";

type Route = {
  method: "get" | "post";
  path: string;
  handler: (req: Request) => Promise<Response>;
};

let routes: Route[];
let settingsAuthRouter: {
  request: (req: Request | string) => Response | Promise<Response>;
};

const originalFetch = globalThis.fetch;
const originalPublicInstance = process.env.DEGOOG_PUBLIC_INSTANCE;
const originalPasswords = process.env.DEGOOG_SETTINGS_PASSWORDS;

const getRoute = (method: "get" | "post", path: string): Route => {
  const route = routes.find((entry) => entry.method === method && entry.path === path);
  if (!route) throw new Error(`Missing route ${method.toUpperCase()} ${path}`);
  return route;
};

beforeAll(async () => {
  const [managerMod, settingsAuthMod] = await Promise.all([
    import("../../combined/plugins/searxng-manager/index"),
    import("../../src/server/routes/settings-auth"),
  ]);
  routes = managerMod.routes as Route[];
  settingsAuthRouter = settingsAuthMod.default;
});

beforeEach(() => {
  delete process.env.DEGOOG_PUBLIC_INSTANCE;
  delete process.env.DEGOOG_SETTINGS_PASSWORDS;
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  if (originalPublicInstance !== undefined) process.env.DEGOOG_PUBLIC_INSTANCE = originalPublicInstance;
  else delete process.env.DEGOOG_PUBLIC_INSTANCE;

  if (originalPasswords !== undefined) process.env.DEGOOG_SETTINGS_PASSWORDS = originalPasswords;
  else delete process.env.DEGOOG_SETTINGS_PASSWORDS;

  globalThis.fetch = originalFetch;
});

describe("routes/searxng-manager auth", () => {
  test("GET / returns 401 on public instances", async () => {
    process.env.DEGOOG_PUBLIC_INSTANCE = "true";
    const res = await getRoute("get", "/").handler(
      new Request("http://localhost/api/plugin/searxng-manager/"),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  test("GET /engines returns 401 on public instances", async () => {
    process.env.DEGOOG_PUBLIC_INSTANCE = "true";
    const res = await getRoute("get", "/engines").handler(
      new Request("http://localhost/api/plugin/searxng-manager/engines"),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  test("POST /toggle returns 401 on public instances", async () => {
    process.env.DEGOOG_PUBLIC_INSTANCE = "true";
    const res = await getRoute("post", "/toggle").handler(
      new Request("http://localhost/api/plugin/searxng-manager/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engines: [{ name: "google", enabled: true }] }),
      }),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  test("GET / accepts a valid settings token", async () => {
    process.env.DEGOOG_SETTINGS_PASSWORDS = "secret";

    const authRes = await settingsAuthRouter.request(
      new Request("http://localhost/api/settings/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "secret" }),
      }),
    );
    expect(authRes.status).toBe(200);
    const authBody = (await authRes.json()) as { token?: string };
    expect(authBody.token).toBeTruthy();

    const res = await getRoute("get", "/").handler(
      new Request("http://localhost/api/plugin/searxng-manager/?token=" + authBody.token),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    expect(await res.text()).toContain("SearXNG Engine Manager");
  });

  test("GET /engines accepts a valid settings token", async () => {
    process.env.DEGOOG_SETTINGS_PASSWORDS = "secret";

    const authRes = await settingsAuthRouter.request(
      new Request("http://localhost/api/settings/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "secret" }),
      }),
    );
    expect(authRes.status).toBe(200);
    const authBody = (await authRes.json()) as { token?: string };
    expect(authBody.token).toBeTruthy();

    globalThis.fetch = (async () =>
      Response.json({
        engines: [
          {
            name: "google",
            enabled: true,
            categories: ["general"],
            shortcut: "go",
            language_support: true,
            paging: true,
            safesearch: true,
            time_range_support: true,
          },
        ],
        categories: ["general"],
      })) as unknown as typeof fetch;

    const res = await getRoute("get", "/engines").handler(
      new Request("http://localhost/api/plugin/searxng-manager/engines", {
        headers: { "x-settings-token": authBody.token! },
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { engines: Array<{ name: string }> };
    expect(body.engines[0]?.name).toBe("google");
  });

  test("manager page forwards the settings token, accepts token query fallback, and handles unauthorized responses", async () => {
    const pageUrl = new URL("../../combined/plugins/searxng-manager/page.html", import.meta.url);
    const page = await file(pageUrl).text();

    expect(page).toContain('sessionStorage.getItem("degoog-settings-token")');
    expect(page).toContain('new URLSearchParams(window.location.search).get("token")');
    expect(page).toContain('sessionStorage.setItem(TOKEN_KEY, tokenFromUrl);');
    expect(page).toContain('headers["x-settings-token"] = token');
    expect(page).toContain("Unauthorized: open Settings and unlock access first.");
  });
});
