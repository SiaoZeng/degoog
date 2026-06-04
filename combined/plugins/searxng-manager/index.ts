// SearXNG Engine Manager Plugin for degoog
// Provides a settings page to enable/disable SearXNG engines
import type { Context } from "hono";

import {
  getSettingsAuthToken,
  validateSettingsAuthToken,
} from "../../../src/server/routes/settings-auth";

const SEARXNG_BASE = process.env.SEARXNG_BASE_URL || "http://127.0.0.1:8888";
const SETTINGS_PATH = process.env.SEARXNG_SETTINGS_PATH || "/etc/searxng/settings.yml";

function getTokenFromRequest(req: Request): string | undefined {
  return getSettingsAuthToken({
    req: Object.assign(req, {
      header: (name: string) => req.headers.get(name) ?? undefined,
      query: (name: string) =>
        new URL(req.url).searchParams.get(name) ?? undefined,
    }),
  } as unknown as Context);
}

async function requireSettingsAuth(req: Request): Promise<Response | null> {
  const token = getTokenFromRequest(req);
  if (await validateSettingsAuthToken(token)) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export interface SearXNGEngineToggle {
  name: string;
  enabled: boolean;
}

export interface SearXNGToggleResult {
  text: string;
  matched: string[];
}

const parseYamlScalar = (value: string): string => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

export function applySearXNGEngineToggles(
  settings: string,
  toggles: SearXNGEngineToggle[],
): SearXNGToggleResult {
  const requested = new Map(toggles.map((item) => [item.name, item.enabled]));
  const lines = settings.split("\n");
  const matched: string[] = [];
  const engineNamePattern = /^(\s*)-\s+name:\s*(.*?)\s*$/;
  const disabledPattern = /^\s*disabled:\s*(?:true|false)\s*(?:#.*)?$/;

  for (let index = 0; index < lines.length; ) {
    const nameMatch = engineNamePattern.exec(lines[index]);
    if (!nameMatch) {
      index++;
      continue;
    }

    const baseIndent = nameMatch[1];
    const name = parseYamlScalar(nameMatch[2]);
    let blockEnd = index + 1;
    while (blockEnd < lines.length) {
      const nextName = engineNamePattern.exec(lines[blockEnd]);
      if (nextName && nextName[1] === baseIndent) break;
      blockEnd++;
    }

    const enabled = requested.get(name);
    if (enabled !== undefined) {
      const disabledLine = `${baseIndent}  disabled: ${enabled ? "false" : "true"}`;
      let disabledIndex = -1;
      for (let cursor = index + 1; cursor < blockEnd; cursor++) {
        if (disabledPattern.test(lines[cursor])) {
          disabledIndex = cursor;
          break;
        }
      }
      if (disabledIndex === -1) {
        lines.splice(index + 1, 0, disabledLine);
        blockEnd++;
      } else {
        lines[disabledIndex] = disabledLine;
      }
      matched.push(name);
    }

    index = blockEnd;
  }

  return { text: lines.join("\n"), matched };
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
        const settings = await readFile(SETTINGS_PATH, "utf-8");
        const updated = applySearXNGEngineToggles(settings, body.engines);
        if (updated.matched.length !== body.engines.length) {
          const matched = new Set(updated.matched);
          const missing = body.engines
            .map((engine) => engine.name)
            .filter((name) => !matched.has(name));
          return Response.json(
            { error: "Unknown SearXNG engines", missing },
            { status: 400 },
          );
        }

        await writeFile(SETTINGS_PATH, updated.text, "utf-8");

        // Restart SearXNG via supervisorctl (no shell, fixed args)
        const { execFile } = await import("child_process");
        await new Promise<void>((resolve, reject) => {
          execFile(
            "supervisorctl",
            ["-c", "/etc/supervisord.conf", "restart", "searxng"],
            { timeout: 10000 },
            (error) => (error ? reject(error) : resolve()),
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
