import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";

describe("health", () => {
  it("answers ok on /health", async () => {
    const app = createApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
