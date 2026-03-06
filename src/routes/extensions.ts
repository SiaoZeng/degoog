import { Hono } from "hono";
import { getEngineExtensionMeta, getEngineMap } from "../engines/registry";
import { getPluginExtensionMeta, getCommandInstanceById } from "../commands/registry";
import { getSettings, setSettings, mergeSecrets } from "../plugin-settings";
import { generateAISummary, AI_SUMMARY_ID } from "../commands/builtins/ai-summary";
import type { ScoredResult } from "../types";

const router = new Hono();

router.get("/api/extensions", async (c) => {
  const [engines, plugins] = await Promise.all([
    getEngineExtensionMeta(),
    getPluginExtensionMeta(),
  ]);
  return c.json({ engines, plugins });
});

router.post("/api/extensions/:id/settings", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Record<string, string>>();

  const [engines, plugins] = await Promise.all([
    getEngineExtensionMeta(),
    getPluginExtensionMeta(),
  ]);
  const ext = [...engines, ...plugins].find((e) => e.id === id);

  if (!ext) {
    return c.json({ error: "Extension not found" }, 404);
  }

  const existing = await getSettings(id);
  const merged = mergeSecrets(body, existing, ext.settingsSchema);
  await setSettings(id, merged);

  const engineInstance = getEngineMap()[id];
  if (engineInstance?.configure) engineInstance.configure(merged);

  const commandInstance = getCommandInstanceById(id);
  if (commandInstance?.configure) commandInstance.configure(merged);

  return c.json({ ok: true });
});

router.post("/api/ai/glance", async (c) => {
  const body = await c.req.json<{ query: string; results: ScoredResult[] }>();
  if (!body.query || !Array.isArray(body.results)) {
    return c.json({ error: "Missing query or results" }, 400);
  }

  const aiSettings = await getSettings(AI_SUMMARY_ID);
  if (aiSettings["enabled"] !== "true") {
    return c.json({ summary: null });
  }

  const summary = await generateAISummary(body.query, body.results);
  return c.json({ summary });
});

export default router;
