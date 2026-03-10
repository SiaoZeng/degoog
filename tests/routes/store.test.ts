import { describe, test, expect, beforeAll, afterAll } from "bun:test";

let storeRouter: {
  request: (req: Request | string) => Response | Promise<Response>;
};
let envRestore: string | undefined;

beforeAll(async () => {
  envRestore = process.env.DEGOOG_PUBLIC_INSTANCE;
  process.env.DEGOOG_PUBLIC_INSTANCE = "true";
  const mod = await import("../../src/server/routes/store");
  storeRouter = mod.default;
});

afterAll(() => {
  if (envRestore !== undefined) process.env.DEGOOG_PUBLIC_INSTANCE = envRestore;
  else delete process.env.DEGOOG_PUBLIC_INSTANCE;
});

describe("routes/store", () => {
  test("GET /api/store/items without auth returns 401", async () => {
    const res = await storeRouter.request("http://localhost/api/store/items");
    expect(res.status).toBe(401);
  });
});
