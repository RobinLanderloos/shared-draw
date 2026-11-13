import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { openRepo } from "../src/repo";

const body = JSON.stringify({
  title: "t", creatorName: "A", participantNames: ["B"], options: ["x", "y"],
});
const mk = (limits: { createMax: number; apiMax: number }) => {
  const clock = { t: new Date("2026-11-13T12:00:00Z") };
  const app = createApp({ repo: openRepo(":memory:"), now: () => clock.t, limits: { ...limits, windowMs: 60_000 } });
  const create = (ip: string) =>
    app.request("/api/draws", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body });
  return { app, clock, create };
};

describe("rate limiting", () => {
  it("rejects creates beyond the limit from one IP with 429", async () => {
    const { create } = mk({ createMax: 3, apiMax: 1000 });
    for (let i = 0; i < 3; i++) expect((await create("1.1.1.1")).status).toBe(201);
    const res = await create("1.1.1.1");
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited" });
  });

  it("limits per IP, so other IPs are not affected", async () => {
    const { create } = mk({ createMax: 1, apiMax: 1000 });
    expect((await create("1.1.1.1")).status).toBe(201);
    expect((await create("1.1.1.1")).status).toBe(429);
    expect((await create("2.2.2.2")).status).toBe(201);
  });

  it("lets the window reset", async () => {
    const { create, clock } = mk({ createMax: 1, apiMax: 1000 });
    expect((await create("1.1.1.1")).status).toBe(201);
    expect((await create("1.1.1.1")).status).toBe(429);
    clock.t = new Date(clock.t.getTime() + 61_000);
    expect((await create("1.1.1.1")).status).toBe(201);
  });

  it("limits all API calls per IP but not the health check", async () => {
    const { app } = mk({ createMax: 100, apiMax: 2 });
    const hit = () => app.request("/api/draws/x?key=y", { headers: { "x-forwarded-for": "3.3.3.3" } });
    expect((await hit()).status).toBe(404);
    expect((await hit()).status).toBe(404);
    expect((await hit()).status).toBe(429);
    expect((await app.request("/health")).status).toBe(200);
  });
});
