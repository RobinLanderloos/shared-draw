import { describe, it, expect } from "vitest";
import { createDraw, type NewDraw } from "../src/domain";

const NOW = new Date("2026-11-13T12:00:00Z");
let n = 0;
const deps = { now: () => NOW, newId: () => "draw1", newKey: () => `key${++n}` };

const valid: NewDraw = {
  title: "Waar eten we?",
  creatorName: "Robin",
  participantNames: ["Sam", "Lotte"],
  options: ["Pizza", "Sushi", "Friet"],
};

describe("createDraw", () => {
  it("creates a pending draw with distinct keys and the creator already accepted", () => {
    const r = createDraw(valid, deps);
    if (!r.ok) throw new Error("expected ok");
    const d = r.draw;
    expect(d.state).toBe("pending");
    expect(d.options).toEqual(["Pizza", "Sushi", "Friet"]);
    expect(d.participants.map((p) => p.name)).toEqual(["Robin", "Sam", "Lotte"]);
    expect(new Set(d.participants.map((p) => p.key)).size).toBe(3);
    expect(d.participants[0]).toMatchObject({ isCreator: true, acceptedAt: NOW });
    expect(d.participants[1].acceptedAt).toBeUndefined();
    expect(d.expiresAt).toEqual(new Date("2026-11-20T12:00:00Z"));
  });

  const bad = (patch: Partial<NewDraw>, error: string) => {
    const r = createDraw({ ...valid, ...patch }, deps);
    expect(r).toEqual({ ok: false, error });
  };

  it("rejects fewer than 2 options", () => bad({ options: ["Pizza"] }, "too_few_options"));
  it("rejects more than 10 options", () =>
    bad({ options: Array.from({ length: 11 }, (_, i) => `o${i}`) }, "too_many_options"));
  it("rejects duplicate options ignoring case and whitespace", () =>
    bad({ options: ["Pizza", " pizza "] }, "duplicate_option"));
  it("rejects empty options", () => bad({ options: ["Pizza", "  "] }, "empty_option"));
  it("rejects options over 100 characters", () =>
    bad({ options: ["Pizza", "x".repeat(101)] }, "option_too_long"));
  it("rejects an empty title", () => bad({ title: " " }, "empty_title"));
  it("rejects an empty creator name", () => bad({ creatorName: "" }, "empty_name"));
  it("rejects empty participant names", () => bad({ participantNames: ["Sam", ""] }, "empty_name"));
  it("rejects duplicate participant names including the creator", () =>
    bad({ participantNames: ["robin"] }, "duplicate_name"));
  it("allows a draw with only the creator and one other", () => {
    expect(createDraw({ ...valid, participantNames: ["Sam"] }, deps).ok).toBe(true);
  });
  it("rejects a draw with no other participants", () =>
    bad({ participantNames: [] }, "no_participants"));
});
