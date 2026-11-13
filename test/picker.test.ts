import { describe, it, expect } from "vitest";
import { pickIndex } from "../src/picker";

describe("pickIndex", () => {
  it("always returns a valid index and reaches every option roughly evenly", () => {
    const n = 4;
    const counts = new Array(n).fill(0);
    const runs = 8000;
    for (let i = 0; i < runs; i++) {
      const k = pickIndex(n);
      expect(Number.isInteger(k)).toBe(true);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(n);
      counts[k]++;
    }
    for (const c of counts) {
      expect(c).toBeGreaterThan(runs / n * 0.85);
      expect(c).toBeLessThan(runs / n * 1.15);
    }
  });
});
