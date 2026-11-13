import { randomInt } from "node:crypto";

/** Uniform pick in [0, optionCount) from the OS CSPRNG (see ADR-0001). */
export function pickIndex(optionCount: number): number {
  return randomInt(0, optionCount);
}
