import { describe, it, expect } from "vitest";
import { openRepo } from "../src/repo";
import { createDraw, accept, cancel, type Draw } from "../src/domain";

const T0 = new Date("2026-11-13T12:00:00Z");
let n = 0;
const newDraw = (id = "d1", names = ["Sam", "Lotte"]) => {
  const r = createDraw(
    { title: "Eten", creatorName: "Robin", participantNames: names, options: ["Pizza", "Sushi", "Friet"] },
    { now: () => T0, newId: () => id, newKey: () => `raw-${++n}` },
  );
  if (!r.ok) throw new Error("setup");
  return r.draw;
};
const rawKey = (d: Draw, name: string) => d.participants.find((p) => p.name === name)!.key;
const days = (d: number) => new Date(T0.getTime() + d * 86400_000);

describe("repo", () => {
  it("stores a draw and finds it by id and a participant's key", () => {
    const repo = openRepo(":memory:");
    const d = newDraw();
    repo.insert(d);
    const found = repo.find("d1", rawKey(d, "Sam"));
    expect(found?.me.name).toBe("Sam");
    expect(found?.draw.options).toEqual(["Pizza", "Sushi", "Friet"]);
    expect(found?.draw.participants.map((p) => p.name)).toEqual(["Robin", "Sam", "Lotte"]);
    expect(found?.draw.expiresAt).toEqual(d.expiresAt);
    expect(found?.draw.participants[0].acceptedAt).toEqual(T0);
  });

  it("does not store raw keys", () => {
    const repo = openRepo(":memory:");
    const d = newDraw();
    repo.insert(d);
    const found = repo.find("d1", rawKey(d, "Sam"))!;
    expect(found.draw.participants.some((p) => p.key === rawKey(d, "Sam"))).toBe(false);
  });

  it("returns the same result for an unknown draw and a wrong key", () => {
    const repo = openRepo(":memory:");
    const d = newDraw();
    repo.insert(d);
    expect(repo.find("d1", "wrong")).toBeUndefined();
    expect(repo.find("nope", rawKey(d, "Sam"))).toBeUndefined();
  });

  it("persists a mutation and returns the callback's value", () => {
    const repo = openRepo(":memory:");
    const d = newDraw();
    repo.insert(d);
    const me = repo.find("d1", rawKey(d, "Sam"))!.me;
    const value = repo.mutate("d1", (cur) => {
      const r = accept(cur, me.key, () => 0, T0);
      if (!r.ok) throw new Error();
      return { draw: r.draw, value: "done" };
    });
    expect(value).toBe("done");
    const after = repo.find("d1", rawKey(d, "Sam"))!.draw;
    expect(after.participants.find((p) => p.name === "Sam")?.acceptedAt).toEqual(T0);
  });

  it("applies racing mutations one after another so the first wins", () => {
    const repo = openRepo(":memory:");
    const d = newDraw("d1", ["Sam"]);
    repo.insert(d);
    const creator = repo.find("d1", rawKey(d, "Robin"))!.me;
    const sam = repo.find("d1", rawKey(d, "Sam"))!.me;
    const first = repo.mutate("d1", (cur) => {
      const r = cancel(cur, creator.key, T0);
      return { draw: r.ok ? r.draw : cur, value: r.ok };
    });
    const second = repo.mutate("d1", (cur) => {
      const r = accept(cur, sam.key, () => 0, T0);
      return { draw: r.ok ? r.draw : cur, value: r.ok ? "ok" : r.error };
    });
    expect(first).toBe(true);
    expect(second).toBe("not_pending");
  });

  it("returns undefined when mutating an unknown draw", () => {
    const repo = openRepo(":memory:");
    expect(repo.mutate("nope", (d) => ({ draw: d, value: 1 }))).toBeUndefined();
  });

  it("round-trips drawn state with picked option and reveal timestamps", () => {
    const repo = openRepo(":memory:");
    const d = newDraw("d1", ["Sam"]);
    repo.insert(d);
    const sam = repo.find("d1", rawKey(d, "Sam"))!.me;
    repo.mutate("d1", (cur) => {
      const r = accept(cur, sam.key, () => 2, T0);
      if (!r.ok) throw new Error();
      return { draw: r.draw, value: 0 };
    });
    const after = repo.find("d1", rawKey(d, "Sam"))!.draw;
    expect(after.state).toBe("drawn");
    expect(after.pickedIndex).toBe(2);
    expect(after.drawnAt).toEqual(T0);
  });

  describe("sweep", () => {
    it("expires pending draws after 7 days", () => {
      const repo = openRepo(":memory:");
      const d = newDraw();
      repo.insert(d);
      repo.sweep(days(6));
      expect(repo.find("d1", rawKey(d, "Sam"))!.draw.state).toBe("pending");
      repo.sweep(days(8));
      expect(repo.find("d1", rawKey(d, "Sam"))!.draw.state).toBe("expired");
    });

    it("keeps a drawn result for 30 days and deletes it afterwards", () => {
      const repo = openRepo(":memory:");
      const d = newDraw("d1", ["Sam"]);
      repo.insert(d);
      const sam = repo.find("d1", rawKey(d, "Sam"))!.me;
      repo.mutate("d1", (cur) => {
        const r = accept(cur, sam.key, () => 0, T0);
        if (!r.ok) throw new Error();
        return { draw: r.draw, value: 0 };
      });
      repo.sweep(days(29));
      expect(repo.find("d1", rawKey(d, "Sam"))).toBeDefined();
      repo.sweep(days(31));
      expect(repo.find("d1", rawKey(d, "Sam"))).toBeUndefined();
    });

    it("deletes declined/cancelled/expired draws 30 days after they ended", () => {
      const repo = openRepo(":memory:");
      const d = newDraw();
      repo.insert(d);
      const creator = repo.find("d1", rawKey(d, "Robin"))!.me;
      repo.mutate("d1", (cur) => {
        const r = cancel(cur, creator.key, T0);
        if (!r.ok) throw new Error();
        return { draw: r.draw, value: 0 };
      });
      repo.sweep(days(29));
      expect(repo.find("d1", rawKey(d, "Robin"))).toBeDefined();
      repo.sweep(days(31));
      expect(repo.find("d1", rawKey(d, "Robin"))).toBeUndefined();
    });
  });
});
