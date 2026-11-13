import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { openRepo } from "../src/repo";

const setup = (pick = 1) => {
  const clock = { t: new Date("2026-11-13T12:00:00Z") };
  const app = createApp({ repo: openRepo(":memory:"), now: () => clock.t, pick: () => pick });
  const post = (path: string, body?: unknown) =>
    app.request(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const get = (path: string) => app.request(path);
  return { app, clock, post, get };
};

const input = {
  title: "Waar eten we?",
  creatorName: "Robin",
  participantNames: ["Sam", "Lotte"],
  options: ["Pizza", "Sushi", "Friet"],
};

const create = async (s: ReturnType<typeof setup>, body: unknown = input) => {
  const res = await s.post("/api/draws", body);
  const json = await res.json();
  const path = (name: string) => json.links.find((l: any) => l.name === name).path as string;
  return { res, json, path };
};

describe("POST /api/draws", () => {
  it("creates a draw and returns one personal link per participant", async () => {
    const s = setup();
    const { res, json } = await create(s);
    expect(res.status).toBe(201);
    expect(json.links.map((l: any) => l.name)).toEqual(["Robin", "Sam", "Lotte"]);
    expect(json.links[0].isCreator).toBe(true);
    expect(new Set(json.links.map((l: any) => l.path)).size).toBe(3);
    expect(json.links[1].path).toMatch(/^\/d\/[\w-]+\?key=[\w-]+$/);
  });

  it("rejects invalid input with a 400 and an error code", async () => {
    const s = setup();
    const { res, json } = await create(s, { ...input, options: ["Alleen"] });
    expect(res.status).toBe(400);
    expect(json.error).toBe("too_few_options");
  });

  it("rejects malformed bodies", async () => {
    const s = setup();
    const res = await s.post("/api/draws", { title: 5 });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/draws/:id", () => {
  it("shows the pending draw with odds and who accepted, without any keys", async () => {
    const s = setup();
    const { json, path } = await create(s);
    const id = json.id;
    const res = await s.get(`/api/draws/${id}?key=${new URL("http://x" + path("Sam")).searchParams.get("key")}`);
    const view = await res.json();
    expect(res.status).toBe(200);
    expect(view.state).toBe("pending");
    expect(view.me).toMatchObject({ name: "Sam", isCreator: false, accepted: false });
    expect(view.options).toEqual([
      { label: "Pizza", odds: "1 op 3" },
      { label: "Sushi", odds: "1 op 3" },
      { label: "Friet", odds: "1 op 3" },
    ]);
    expect(view.participants).toEqual([
      { name: "Robin", accepted: true },
      { name: "Sam", accepted: false },
      { name: "Lotte", accepted: false },
    ]);
    expect(view.result).toBeUndefined();
    const raw = JSON.stringify(view);
    for (const l of json.links) expect(raw).not.toContain(new URL("http://x" + l.path).searchParams.get("key")!);
  });

  it("gives identical not-found answers for an unknown draw and a wrong key", async () => {
    const s = setup();
    const { json } = await create(s);
    const a = await s.get(`/api/draws/${json.id}?key=wrong`);
    const b = await s.get(`/api/draws/unknown?key=wrong`);
    expect(a.status).toBe(404);
    expect(b.status).toBe(404);
    expect(await a.json()).toEqual(await b.json());
  });

  it("treats a missing key as not found", async () => {
    const s = setup();
    const { json } = await create(s);
    expect((await s.get(`/api/draws/${json.id}`)).status).toBe(404);
  });
});

const keyOf = (path: string) => new URL("http://x" + path).searchParams.get("key")!;
const flow = async () => {
  const s = setup(1);
  const { json, path } = await create(s);
  const url = (name: string) => `/api/draws/${json.id}`;
  const k = (name: string) => keyOf(path(name));
  const view = async (name: string) => (await s.get(`${url(name)}?key=${k(name)}`)).json();
  const act = (name: string, action: string) => s.post(`${url(name)}/${action}?key=${k(name)}`);
  return { s, view, act };
};

describe("accept and draw", () => {
  it("draws only once everyone has accepted and stores the result", async () => {
    const { view, act } = await flow();
    expect((await act("Sam", "accept")).status).toBe(200);
    expect((await view("Robin")).state).toBe("pending");
    expect((await view("Robin")).participants[1].accepted).toBe(true);
    await act("Lotte", "accept");
    const v = await view("Robin");
    expect(v.state).toBe("drawn");
    expect(v.result).toMatchObject({ index: 1, label: "Sushi" });
    expect(v.result.drawnAt).toBe("2026-11-13T12:00:00.000Z");
  });

  it("is safe to accept twice", async () => {
    const { view, act } = await flow();
    expect((await act("Sam", "accept")).status).toBe(200);
    expect((await act("Sam", "accept")).status).toBe(200);
    expect((await view("Sam")).state).toBe("pending");
  });

  it("rejects an accept with a wrong key", async () => {
    const { s, view } = await flow();
    const v = await view("Sam");
    const res = await s.post(`/api/draws/unknown/accept?key=nope`);
    expect(res.status).toBe(404);
    expect(v.state).toBe("pending");
  });
});

describe("reveal", () => {
  it("is true on each participant's first view only", async () => {
    const { view, act } = await flow();
    await act("Sam", "accept");
    await act("Lotte", "accept");
    expect((await view("Sam")).reveal).toBe(true);
    expect((await view("Sam")).reveal).toBe(false);
    expect((await view("Lotte")).reveal).toBe(true);
    expect((await view("Robin")).reveal).toBe(true);
    expect((await view("Robin")).reveal).toBe(false);
  });

  it("is false for a pending draw", async () => {
    const { view } = await flow();
    expect((await view("Sam")).reveal).toBe(false);
  });
});

describe("decline and cancel", () => {
  it("a decline ends the draw for everyone and blocks later accepts", async () => {
    const { view, act } = await flow();
    expect((await act("Lotte", "decline")).status).toBe(200);
    expect((await view("Robin")).state).toBe("declined");
    const r = await act("Sam", "accept");
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ error: "not_pending", state: "declined" });
  });

  it("only the creator can cancel, and only while pending", async () => {
    const { view, act } = await flow();
    const denied = await act("Sam", "cancel");
    expect(denied.status).toBe(403);
    expect((await act("Robin", "cancel")).status).toBe(200);
    expect((await view("Sam")).state).toBe("cancelled");
  });

  it("cannot decline or cancel a drawn draw", async () => {
    const { view, act } = await flow();
    await act("Sam", "accept");
    await act("Lotte", "accept");
    expect((await act("Sam", "decline")).status).toBe(409);
    expect((await act("Robin", "cancel")).status).toBe(409);
    expect((await view("Sam")).state).toBe("drawn");
  });
});

describe("expiry", () => {
  it("shows an expired draw after 7 days and refuses accepts", async () => {
    const s = setup();
    const { json, path } = await create(s);
    s.clock.t = new Date("2026-11-21T00:00:00Z");
    const key = keyOf(path("Sam"));
    const v = await (await s.get(`/api/draws/${json.id}?key=${key}`)).json();
    expect(v.state).toBe("expired");
    expect((await s.post(`/api/draws/${json.id}/accept?key=${key}`)).status).toBe(409);
  });
});

describe("limits", () => {
  it("rejects oversized bodies", async () => {
    const s = setup();
    const res = await s.post("/api/draws", { ...input, title: "x".repeat(100_000) });
    expect(res.status).toBe(413);
  });
});
