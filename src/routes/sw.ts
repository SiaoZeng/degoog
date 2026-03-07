import { Hono } from "hono";

const router = new Hono();

router.get("/sw.js", async (c) => {
  const body = await Bun.file("src/public/sw.js").text();
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript",
      "Service-Worker-Allowed": "/",
    },
  });
});

export default router;
