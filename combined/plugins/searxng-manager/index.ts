// SearXNG Engine Manager Plugin for degoog
// Provides a settings page to enable/disable SearXNG engines

import {
  getSettingsTokenFromRequest,
  validateSettingsToken,
} from "../../../src/server/routes/settings-auth";

const SEARXNG_BASE = process.env.SEARXNG_BASE_URL || "http://127.0.0.1:8888";
const SETTINGS_PATH = process.env.SEARXNG_SETTINGS_PATH || "/etc/searxng/settings.yml";

function getTokenFromRequest(req: Request): string | undefined {
  return getSettingsTokenFromRequest({
    req: Object.assign(req, {
      header: (name: string) => req.headers.get(name) ?? undefined,
      query: (name: string) =>
        new URL(req.url).searchParams.get(name) ?? undefined,
    }),
  } as unknown as Parameters<typeof getSettingsTokenFromRequest>[0]);
}

async function requireSettingsAuth(req: Request): Promise<Response | null> {
  const token = getTokenFromRequest(req);
  if (await validateSettingsToken(token)) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export const routes = [
  {
    method: "get" as const,
    path: "/",
    handler: async (req: Request): Promise<Response> => {
      const unauthorized = await requireSettingsAuth(req);
      if (unauthorized) return unauthorized;
      const html = await Bun.file(
        new URL("page.html", import.meta.url).pathname,
      ).text();
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    },
  },
  {
    method: "get" as const,
    path: "/engines",
    handler: async (req: Request): Promise<Response> => {
      const unauthorized = await requireSettingsAuth(req);
      if (unauthorized) return unauthorized;
      try {
        const configRes = await fetch(`${SEARXNG_BASE}/config`);
        const config = (await configRes.json()) as {
          engines: Array<{
            name: string;
            enabled: boolean;
            categories: string[];
            shortcut: string;
            language_support: boolean;
            paging: boolean;
            safesearch: boolean;
            time_range_support: boolean;
          }>;
          categories: string[];
        };
        return Response.json({
          engines: config.engines,
          categories: config.categories,
        });
      } catch (err) {
        return Response.json(
          { error: "SearXNG not reachable", detail: String(err) },
          { status: 502 },
        );
      }
    },
  },
  {
    method: "post" as const,
    path: "/toggle",
    handler: async (req: Request): Promise<Response> => {
      const unauthorized = await requireSettingsAuth(req);
      if (unauthorized) return unauthorized;
      try {
        const body = (await req.json()) as {
          engines: Array<{ name: string; enabled: boolean }>;
        };
        if (!body.engines || !Array.isArray(body.engines)) {
          return Response.json({ error: "Invalid request" }, { status: 400 });
        }

        const { readFile, writeFile } = await import("fs/promises");
        let settings = await readFile(SETTINGS_PATH, "utf-8");

        for (const { name, enabled } of body.engines) {
          const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const nameRegex = new RegExp(
            `(- name: ${escapedName}\\n(?:.*\\n)*?\\s+)disabled: (true|false)`,
          );
          const match = settings.match(nameRegex);
          if (match) {
            settings = settings.replace(
              nameRegex,
              `$1disabled: ${enabled ? "false" : "true"}`,
            );
          }
        }

        await writeFile(SETTINGS_PATH, settings, "utf-8");

        // Restart SearXNG via supervisorctl (no shell, fixed args)
        const { execFile } = await import("child_process");
        await new Promise<void>((resolve) => {
          execFile(
            "supervisorctl",
            ["restart", "searxng"],
            { timeout: 10000 },
            () => resolve(),
          );
        });

        return Response.json({ ok: true, restarted: true });
      } catch (err) {
        return Response.json(
          { error: "Failed to update", detail: String(err) },
          { status: 500 },
        );
      }
    },
  },
];
