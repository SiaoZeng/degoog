// SearXNG Engine Manager Plugin for degoog
// Provides a settings page to enable/disable SearXNG engines

const SEARXNG_BASE = process.env.SEARXNG_BASE_URL || "http://127.0.0.1:8888";
const SETTINGS_PATH = process.env.SEARXNG_SETTINGS_PATH || "/etc/searxng/settings.yml";

export const routes = [
  {
    method: "get" as const,
    path: "/",
    handler: async (_req: Request): Promise<Response> => {
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
    handler: async (_req: Request): Promise<Response> => {
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
