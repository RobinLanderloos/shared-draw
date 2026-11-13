import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./app";
import { openRepo } from "./repo";

const port = Number(process.env.PORT ?? 3000);
const dbPath = process.env.DB_PATH ?? "./data/draw.db";
mkdirSync(dirname(dbPath), { recursive: true });

const repo = openRepo(dbPath);
const sweep = () => repo.sweep(new Date());
sweep();
setInterval(sweep, 60 * 60 * 1000).unref();

const app = createApp({ repo });
app.get("/", serveStatic({ path: "./public/index.html" }));
app.get("/d/:id", serveStatic({ path: "./public/draw.html" }));
app.use("/*", serveStatic({ root: "./public" }));

serve({ fetch: app.fetch, port }, () => {
  console.log(`shared-draw listening on :${port} (db: ${dbPath})`);
});
