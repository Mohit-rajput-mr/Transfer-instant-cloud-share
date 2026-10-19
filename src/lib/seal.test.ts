import { describe, expect, it } from "vitest";
import { newSealKey, openSealed, sealTo } from "./seal";

describe("knock invite sealing", () => {
  it("opens with the right key", async () => {
    const k = await newSealKey();
    const box = await sealTo(k.pub, { code: "abcdefghijkl", key: "x".repeat(22) });
    expect(await openSealed(k.priv, box)).toEqual({ code: "abcdefghijkl", key: "x".repeat(22) });
  });
  it("fits the server's limits (pub ≤ 200 chars, box ≤ 2000)", async () => {
    const k = await newSealKey();
    expect(k.pub).toMatch(/^[A-Za-z0-9+/=_-]{40,200}$/);
    expect((await sealTo(k.pub, { code: "abcdefghijkl", key: "y".repeat(22) })).length).toBeLessThanOrEqual(2000);
  });
  it("cannot be opened with another key", async () => {
    const a = await newSealKey(), b = await newSealKey();
    const box = await sealTo(a.pub, { code: "c", key: "k" });
    await expect(openSealed(b.priv, box)).rejects.toThrow();
  });
  it("rejects a tampered box", async () => {
    const k = await newSealKey();
    const box = await sealTo(k.pub, { code: "c", key: "k" });
    const raw = Uint8Array.from(atob(box), (c) => c.charCodeAt(0));
    raw[raw.length - 1] ^= 1;
    await expect(openSealed(k.priv, btoa(String.fromCharCode(...raw)))).rejects.toThrow();
  });
});
