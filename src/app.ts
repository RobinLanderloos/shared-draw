import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { streamSSE } from "hono/streaming";
import { randomBytes } from "node:crypto";
import {
  createDraw, accept, decline, cancel, expire, reveal,
  type Draw, type NewDraw, type Picker, type TransitionResult,
} from "./domain";
import { openRepo, hashKey, type Repo } from "./repo";
import { pickIndex } from "./picker";
import { nl, format } from "./strings";
import { createLimiter } from "./ratelimit";

export interface AppDeps {
  repo: Repo;
  now: () => Date;
  pick: Picker;
  limits: { createMax: number; apiMax: number; windowMs: number };
}

const MAX_BODY_BYTES = 16 * 1024;
const token = (bytes: number) => randomBytes(bytes).toString("base64url");

function viewOf(draw: Draw, meKey: string, revealNow: boolean) {
  const me = draw.participants.find((p) => p.key === meKey)!;
  const odds = format(nl.odds, { n: draw.options.length });
  return {
    id: draw.id,
    title: draw.title,
    state: draw.state,
    expiresAt: draw.expiresAt.toISOString(),
    options: draw.options.map((label) => ({ label, odds })),
    participants: draw.participants.map((p) => ({ name: p.name, accepted: !!p.acceptedAt })),
    me: { name: me.name, isCreator: me.isCreator, accepted: !!me.acceptedAt },
    reveal: revealNow,
    ...(draw.state === "drawn" && draw.pickedIndex !== undefined
      ? {
          result: {
            index: draw.pickedIndex,
            label: draw.options[draw.pickedIndex],
            drawnAt: draw.drawnAt!.toISOString(),
          },
        }
      : {}),
  };
}

type ActionOutcome = { status: 200 | 403 | 404 | 409; body: Record<string, unknown> };

const notFound = (c: Context) => c.json({ error: "not_found" }, 404);

export function createApp(deps?: Partial<AppDeps>) {
  const repo = deps?.repo ?? openRepo(":memory:");
  const now = deps?.now ?? (() => new Date());
  const pick = deps?.pick ?? pickIndex;
  const limits = deps?.limits ?? { createMax: 10, apiMax: 120, windowMs: 60_000 };
  const apiAllowed = createLimiter(limits.apiMax, limits.windowMs, now);
  const createAllowed = createLimiter(limits.createMax, limits.windowMs, now);
  const app = new Hono();

  // In-process pub/sub: open draw pages get a "changed" event and refetch.
  const listeners = new Map<string, Set<() => void>>();
  const publish = (drawId: string) => listeners.get(drawId)?.forEach((fn) => fn());

  const clientIp = (c: Context) =>
    c.req.header("x-forwarded-for")?.split(",")[0].trim() || c.req.header("x-real-ip") || "unknown";
  const limited = (c: Context) => c.json({ error: "rate_limited" }, 429);

  app.use("/api/*", async (c, next) => {
    if (!apiAllowed(clientIp(c))) return limited(c);
    await next();
  });

  app.get("/health", (c) => c.json({ status: "ok" }));
  app.get("/strings.json", (c) => c.json(nl));

  app.post(
    "/api/draws",
    bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => c.json({ error: "too_large" }, 413) }),
    async (c) => {
      if (!createAllowed(clientIp(c))) return limited(c);
      const body = (await c.req.json().catch(() => null)) as Partial<NewDraw> | null;
      const ok =
        body &&
        typeof body.title === "string" &&
        typeof body.creatorName === "string" &&
        Array.isArray(body.participantNames) && body.participantNames.every((n) => typeof n === "string") &&
        Array.isArray(body.options) && body.options.every((o) => typeof o === "string");
      if (!ok) return c.json({ error: "invalid_body" }, 400);

      const r = createDraw(body as NewDraw, { now, newId: () => token(9), newKey: () => token(18) });
      if (!r.ok) return c.json({ error: r.error }, 400);
      repo.insert(r.draw);
      return c.json(
        {
          id: r.draw.id,
          links: r.draw.participants.map((p) => ({
            name: p.name,
            isCreator: p.isCreator,
            path: `/d/${r.draw.id}?key=${p.key}`,
          })),
        },
        201,
      );
    },
  );

  app.get("/api/draws/:id", (c) => {
    const rawKey = c.req.query("key") ?? "";
    const meKey = hashKey(rawKey);
    const out = repo.mutate(c.req.param("id"), (cur) => {
      const drawn = expire(cur, now());
      if (!drawn.participants.some((p) => p.key === meKey)) return { draw: cur, value: null };
      const r = reveal(drawn, meKey, now());
      return { draw: r.draw, value: viewOf(r.draw, meKey, r.reveal) };
    });
    return out ? c.json(out) : notFound(c);
  });

  app.get("/api/draws/:id/events", (c) => {
    const id = c.req.param("id");
    if (!repo.find(id, c.req.query("key") ?? "")) return notFound(c);
    return streamSSE(c, async (stream) => {
      let wake: () => void = () => {};
      let pending = false;
      const onChange = () => { pending = true; wake(); };
      let set = listeners.get(id);
      if (!set) listeners.set(id, (set = new Set()));
      set.add(onChange);
      let closed = false;
      stream.onAbort(() => { closed = true; wake(); });
      try {
        await stream.writeSSE({ event: "connected", data: "ok" });
        while (!closed) {
          if (pending) {
            pending = false;
            await stream.writeSSE({ event: "changed", data: "1" });
            continue;
          }
          await new Promise<void>((resolve) => {
            wake = resolve;
            const t = setTimeout(resolve, 25_000);
            const orig = resolve;
            wake = () => { clearTimeout(t); orig(); };
          });
          if (!closed && !pending) await stream.writeSSE({ event: "ping", data: "" });
        }
      } finally {
        set.delete(onChange);
        if (set.size === 0) listeners.delete(id);
      }
    });
  });

  const action = (name: "accept" | "decline" | "cancel") =>
    app.post(`/api/draws/:id/${name}`, (c) => {
      const meKey = hashKey(c.req.query("key") ?? "");
      const out = repo.mutate<ActionOutcome>(c.req.param("id"), (cur) => {
        const live = expire(cur, now());
        let r: TransitionResult;
        if (name === "accept") r = accept(live, meKey, pick, now());
        else if (name === "decline") r = decline(live, meKey, now());
        else r = cancel(live, meKey, now());
        return r.ok
          ? { draw: r.draw, value: { status: 200, body: { ok: true, state: r.draw.state } } }
          : {
              draw: live,
              value:
                r.error === "unknown_participant"
                  ? { status: 404, body: { error: "not_found" } }
                  : r.error === "not_creator"
                    ? { status: 403, body: { error: "not_creator" } }
                    : { status: 409, body: { error: "not_pending", state: live.state } },
            };
      });
      if (!out) return notFound(c);
      if (out.status === 200) publish(c.req.param("id"));
      return c.json(out.body, out.status);
    });
  action("accept");
  action("decline");
  action("cancel");

  return app;
}
