import { Hono } from "hono";

const router = new Hono();

const validTokens = new Set<string>();

function getPasswords(): string[] {
  const raw = process.env.DEGOOG_SETTINGS_PASSWORDS ?? "";
  return raw.split(",").map((p) => p.trim()).filter(Boolean);
}

function isRequired(): boolean {
  return getPasswords().length > 0;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function validateSettingsToken(token: string | undefined): boolean {
  if (!isRequired()) return true;
  return !!token && validTokens.has(token);
}

router.get("/api/settings/auth", (c) => {
  const required = isRequired();
  if (!required) return c.json({ required: false, valid: true });

  const token = c.req.header("x-settings-token") ?? c.req.query("token");
  return c.json({ required: true, valid: validateSettingsToken(token) });
});

router.post("/api/settings/auth", async (c) => {
  const body = await c.req.json<{ password?: string }>();
  const passwords = getPasswords();

  if (passwords.length === 0) return c.json({ ok: true, token: null });

  if (!body.password || !passwords.includes(body.password)) {
    return c.json({ ok: false }, 401);
  }

  const token = generateToken();
  validTokens.add(token);
  return c.json({ ok: true, token });
});

export default router;
