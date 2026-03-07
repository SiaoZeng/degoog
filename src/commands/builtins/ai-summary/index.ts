import type { SettingField } from "../../../types";
import { getSettings } from "../../../plugin-settings";

export const AI_SUMMARY_ID = "ai-summary";

export const aiSummarySettingsSchema: SettingField[] = [
  {
    key: "enabled",
    label: "Enable AI Summary",
    type: "toggle",
    description:
      "Replace At a Glance with a brief AI-generated summary of search results",
  },
  {
    key: "baseUrl",
    label: "API Base URL",
    type: "url",
    required: true,
    placeholder: "https://api.openai.com/v1",
    description:
      "OpenAI-compatible base URL. Use http://localhost:11434/v1 for Ollama",
  },
  {
    key: "model",
    label: "Model",
    type: "text",
    required: true,
    placeholder: "gpt-4o-mini",
    description: "Model name (e.g. gpt-4o-mini, llama3, mistral)",
  },
  {
    key: "apiKey",
    label: "API Key",
    type: "password",
    secret: true,
    placeholder: "Leave blank for local models (Ollama)",
    description: "API key for the provider. Not required for local Ollama.",
  },
  {
    key: "timeoutSeconds",
    label: "Timeout (seconds)",
    type: "text",
    placeholder: "30",
    description:
      "Max seconds to wait for an AI response before falling back to the standard result.",
  },
];

export interface AISummarySettings {
  enabled: boolean;
  baseUrl: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
}

export async function getAISummarySettings(): Promise<AISummarySettings> {
  const stored = await getSettings(AI_SUMMARY_ID);
  const timeoutSeconds = parseFloat(stored["timeoutSeconds"] || "") || 30;
  return {
    enabled: stored["enabled"] === "true",
    baseUrl: stored["baseUrl"] || "",
    model: stored["model"] || "",
    apiKey: stored["apiKey"] || "",
    timeoutMs: Math.max(5, timeoutSeconds) * 1000,
  };
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIChatResponse {
  choices?: { message?: { content?: string } }[];
}

export async function generateAISummary(
  query: string,
  results: { title: string; url: string; snippet: string }[],
): Promise<string | null> {
  const settings = await getAISummarySettings();
  if (!settings.enabled || !settings.baseUrl || !settings.model) return null;

  const context = results
    .slice(0, 6)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`)
    .join("\n\n");

  const messages: OpenAIMessage[] = [
    {
      role: "system",
      content:
        "You are a helpful assistant that summarises web search results. Write a concise 2–3 sentence summary answering the query based on the provided snippets. Do not invent facts. Do not include citations.",
    },
    {
      role: "user",
      content: `Query: ${query}\n\nSearch results:\n${context}`,
    },
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (settings.apiKey) headers["Authorization"] = `Bearer ${settings.apiKey}`;

  try {
    const res = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: settings.model,
        messages,
        max_tokens: 256,
      }),
      signal: AbortSignal.timeout(settings.timeoutMs),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OpenAIChatResponse;
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}
