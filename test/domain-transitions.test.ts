import { describe, it, expect } from "vitest";
import { createDraw, accept, decline, cancel, expire, reveal, type Draw } from "../src/domain";

const T0 = new Date("2026-11-13T12:00:00Z");
const T1 = new Date("2026-11-13T13:00:00Z");
let n = 0;
const make = (names = ["Sam", "Lotte"]): Draw => {
  const r = createDraw(
    { title: "t", creatorName: "Robin", participantNames: names, options: ["A", "B", "C"] },
    { now: () => T0, newId: () => "d", newKey: () => `k${++n}` },
  );
  if (!r.ok) throw new Error("setup");
  return r.draw;
};
const key = (d: Draw, name: string) => d.participants.find((p) => p.name === name)!.key;
const pick = (i: number) => () => i;

describe("accept", () => {
  it("marks only the acting participant and stays pending until everyone accepted", () => {
    const d = make();
    const r = accept(d, key(d, "Sam"), pick(1), T1);
    if (!r.ok) throw new Error();
    expect(r.draw.state).toBe("pending");
    expect(r.draw.participants.find((p) => p.name === "Sam")!.acceptedAt).toEqual(T1);
    expect(r.draw.participants.find((p) => p.name === "Lotte")!.acceptedAt).toBeUndefined();
  });

  it("draws exactly when the last participant accepts, using the injected picker", () => {
    let d = make();
    const r1 = accept(d, key(d, "Sam"), pick(2), T1);
    if (!r1.ok) throw new Error();
    d = r1.draw;
    const r2 = accept(d, key(d, "Lotte"), pick(2), T1);
    if (!r2.ok) throw new Error();
    expect(r2.draw.state).toBe("drawn");
    expect(r2.draw.pickedIndex).toBe(2);
    expect(r2.draw.drawnAt).toEqual(T1);
  });

  it("passes the option count to the picker", () => {
    let seen = 0;
    let d = make(["Sam"]);
    const r = accept(d, key(d, "Sam"), (count) => ((seen = count), 0), T1);
    expect(r.ok).toBe(true);
    expect(seen).toBe(3);
  });

  it("is idempotent for a participant who already accepted", () => {
    let d = make();
    const r1 = accept(d, key(d, "Sam"), pick(0), T1);
    if (!r1.ok) throw new Error();
    const r2 = accept(r1.draw, key(d, "Sam"), pick(0), new Date("2026-11-14T00:00:00Z"));
    if (!r2.ok) throw new Error();
    expect(r2.draw).toEqual(r1.draw);
  });

  it("rejects an unknown key", () => {
    const d = make();
    expect(accept(d, "nope", pick(0), T1)).toEqual({ ok: false, error: "unknown_participant" });
  });

  it("rejects accepting a declined, cancelled or expired draw", () => {
    for (const fn of [
      (d: Draw) => decline(d, key(d, "Sam"), T1),
      (d: Draw) => cancel(d, key(d, "Robin"), T1),
      (d: Draw) => ({ ok: true as const, draw: expire(d, new Date("2026-12-01T00:00:00Z")) }),
    ]) {
      const d = make();
      const r = fn(d);
      if (!r.ok) throw new Error();
      expect(accept(r.draw, key(d, "Lotte"), pick(0), T1)).toEqual({ ok: false, error: "not_pending" });
    }
  });
});

describe("decline", () => {
  it("ends a pending draw for everyone", () => {
    const d = make();
    const r = decline(d, key(d, "Lotte"), T1);
    if (!r.ok) throw new Error();
    expect(r.draw.state).toBe("declined");
    expect(r.draw.endedAt).toEqual(T1);
  });
  it("cannot change a drawn result", () => {
    let d = make(["Sam"]);
    const a = accept(d, key(d, "Sam"), pick(1), T1);
    if (!a.ok) throw new Error();
    expect(decline(a.draw, key(d, "Sam"), T1)).toEqual({ ok: false, error: "not_pending" });
  });
});

describe("cancel", () => {
  it("lets only the creator cancel a pending draw", () => {
    const d = make();
    expect(cancel(d, key(d, "Sam"), T1)).toEqual({ ok: false, error: "not_creator" });
    const r = cancel(d, key(d, "Robin"), T1);
    if (!r.ok) throw new Error();
    expect(r.draw.state).toBe("cancelled");
  });
  it("cannot cancel a drawn draw", () => {
    const d = make(["Sam"]);
    const a = accept(d, key(d, "Sam"), pick(0), T1);
    if (!a.ok) throw new Error();
    expect(cancel(a.draw, key(d, "Robin"), T1)).toEqual({ ok: false, error: "not_pending" });
  });
});

describe("expire", () => {
  it("expires a pending draw only after its expiry time", () => {
    const d = make();
    expect(expire(d, T1).state).toBe("pending");
    expect(expire(d, d.expiresAt).state).toBe("expired");
  });
  it("never touches a drawn draw", () => {
    const d = make(["Sam"]);
    const a = accept(d, key(d, "Sam"), pick(0), T1);
    if (!a.ok) throw new Error();
    expect(expire(a.draw, new Date("2027-01-01T00:00:00Z")).state).toBe("drawn");
  });
});

describe("reveal", () => {
  const drawn = () => {
    const d = make(["Sam"]);
    const a = accept(d, key(d, "Sam"), pick(0), T1);
    if (!a.ok) throw new Error();
    return a.draw;
  };
  it("is true only on a participant's first view, independently per participant", () => {
    const d = drawn();
    const r1 = reveal(d, key(d, "Sam"), T1);
    expect(r1.reveal).toBe(true);
    const r2 = reveal(r1.draw, key(d, "Sam"), T1);
    expect(r2.reveal).toBe(false);
    expect(reveal(r2.draw, key(d, "Robin"), T1).reveal).toBe(true);
  });
  it("is never true while the draw is not drawn", () => {
    const d = make();
    expect(reveal(d, key(d, "Sam"), T1).reveal).toBe(false);
  });
});
