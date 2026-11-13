import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { openRepo } from "../src/repo";

const setup = async () => {
  const app = createApp({ repo: openRepo(":memory:"), now: () => new Date("2026-11-13T12:00:00Z"), pick: () => 0 });
  const res = await app.request("/api/draws", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "t", creatorName: "Robin", participantNames: ["Sam"], options: ["a", "b"] }),
  });
  const json = await res.json();
  const key = (n: string) => new URL("http://x" + json.links.find((l: any) => l.name === n).path).searchParams.get("key")!;
  return { app, id: json.id as string, key };
};

const readUntil = async (reader: ReadableStreamDefaultReader<Uint8Array>, needle: string) => {
  const dec = new TextDecoder();
  let text = "";
  const deadline = Date.now() + 2000;
  while (!text.includes(needle) && Date.now() < deadline) {
    const { value, done } = await Promise.race([
      reader.read(),
      new Promise<{ value: undefined; done: true }>((r) => setTimeout(() => r({ value: undefined, done: true }), 500)),
    ]);
    if (value) text += dec.decode(value);
    if (done && !value) break;
  }
  return text;
};

describe("GET /api/draws/:id/events", () => {
  it("sends a changed event to connected participants when the draw changes", async () => {
    const { app, id, key } = await setup();
    const res = await app.request(`/api/draws/${id}/events?key=${key("Robin")}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const reader = res.body!.getReader();
    await readUntil(reader, "connected");
    await app.request(`/api/draws/${id}/accept?key=${key("Sam")}`, { method: "POST" });
    const text = await readUntil(reader, "event: changed");
    expect(text).toContain("event: changed");
    await reader.cancel();
  });

  it("behaves like not-found for a wrong key", async () => {
    const { app, id } = await setup();
    const res = await app.request(`/api/draws/${id}/events?key=wrong`);
    expect(res.status).toBe(404);
  });
});
