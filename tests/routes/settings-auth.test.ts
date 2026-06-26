import { describe, test, expect } from "bun:test";
import type { Context } from "hono";
import {
  canBalrogPass,
  getSettingsAuthToken,
  validateSettingsAuthToken,
  gandalf,
  guardPrivilegedAction,
  hasGeneratedDefaultSettingsPassword,
  isDangerouslyNoPassword,
  isPasswordRequired,
} from "../../src/server/routes/settings-auth";

const buildContext = (url: string, address: string): Context => {
  const req = new Request(url);
  const ctx = {
    req: Object.assign(req, {
      header: (name: string) => req.headers.get(name) ?? undefined,
      query: (name: string) =>
        new URL(req.url).searchParams.get(name) ?? undefined,
      raw: req,
    }),
    env: {
      requestIP: () => ({ address }),
    },
    json: (data: unknown, status?: number) =>
      Response.json(data, { status: status ?? 200 }),
  };
  return ctx as unknown as Context;
};

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

  test("descriptive auth aliases prefer header tokens and ignore query tokens", async () => {
    const req = new Request("http://localhost/?token=query-token", {
      headers: {
        "x-settings-token": "header-token",
        cookie: "settings-token=cookie-token",
      },
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
    const expected = await gandalf("missing-token");
    expect(await validateSettingsAuthToken("missing-token")).toBe(expected);
  });

  test("falls back to the settings cookie when no header token exists", () => {
    const req = new Request("http://localhost/?token=query-token", {
      headers: {
        cookie: "other=x; settings-token=cookie-token; theme=dark",
      },
    });
    const c = {
      req: Object.assign(req, {
        header: (name: string) => req.headers.get(name) ?? undefined,
        query: (name: string) =>
          new URL(req.url).searchParams.get(name) ?? undefined,
      }),
    };
    const ctx = c as unknown as Context;

    expect(canBalrogPass(ctx)).toBe("cookie-token");
  });

  test("requires a generated default password when no password env is set", () => {
    const oldPasswords = process.env.DEGOOG_SETTINGS_PASSWORDS;
    const oldDanger = process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD;
    delete process.env.DEGOOG_SETTINGS_PASSWORDS;
    delete process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD;
    try {
      expect(isDangerouslyNoPassword()).toBe(false);
      expect(hasGeneratedDefaultSettingsPassword()).toBe(true);
      expect(isPasswordRequired()).toBe(true);
    } finally {
      if (oldPasswords === undefined) delete process.env.DEGOOG_SETTINGS_PASSWORDS;
      else process.env.DEGOOG_SETTINGS_PASSWORDS = oldPasswords;
      if (oldDanger === undefined) delete process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD;
      else process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD = oldDanger;
    }
  });

  test("allows explicitly disabling settings auth with the dangerous env", () => {
    const oldPasswords = process.env.DEGOOG_SETTINGS_PASSWORDS;
    const oldDanger = process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD;
    delete process.env.DEGOOG_SETTINGS_PASSWORDS;
    process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD = "true";
    try {
      expect(isDangerouslyNoPassword()).toBe(true);
      expect(hasGeneratedDefaultSettingsPassword()).toBe(false);
      expect(isPasswordRequired()).toBe(false);
    } finally {
      if (oldPasswords === undefined) delete process.env.DEGOOG_SETTINGS_PASSWORDS;
      else process.env.DEGOOG_SETTINGS_PASSWORDS = oldPasswords;
      if (oldDanger === undefined) delete process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD;
      else process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD = oldDanger;
    }
  });

  test("guardPrivilegedAction rejects non-loopback callers when no auth is configured", async () => {
    const oldPasswords = process.env.DEGOOG_SETTINGS_PASSWORDS;
    const oldDanger = process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD;
    delete process.env.DEGOOG_SETTINGS_PASSWORDS;
    process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD = "true";
    try {
      const res = await guardPrivilegedAction(
        buildContext("http://localhost/api/store/install", "10.0.0.5"),
        "POST /api/store/install",
      );
      expect(res?.status).toBe(401);
    } finally {
      if (oldPasswords === undefined) delete process.env.DEGOOG_SETTINGS_PASSWORDS;
      else process.env.DEGOOG_SETTINGS_PASSWORDS = oldPasswords;
      if (oldDanger === undefined) delete process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD;
      else process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD = oldDanger;
    }
  });

  test("guardPrivilegedAction allows loopback callers when no auth is configured", async () => {
    const oldPasswords = process.env.DEGOOG_SETTINGS_PASSWORDS;
    const oldDanger = process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD;
    delete process.env.DEGOOG_SETTINGS_PASSWORDS;
    process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD = "true";
    try {
      const res = await guardPrivilegedAction(
        buildContext("http://localhost/api/store/install", "127.0.0.1"),
        "POST /api/store/install",
      );
      expect(res).toBeNull();
    } finally {
      if (oldPasswords === undefined) delete process.env.DEGOOG_SETTINGS_PASSWORDS;
      else process.env.DEGOOG_SETTINGS_PASSWORDS = oldPasswords;
      if (oldDanger === undefined) delete process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD;
      else process.env.DEGOOG_DANGEROUSLY_NO_PASSWORD = oldDanger;
    }
  });
});
