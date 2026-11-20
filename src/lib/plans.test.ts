import { describe, expect, it } from "vitest";
import { PERKS, livesFor } from "./plans";
import { tagName, untag } from "./spaces";
import { cleanOrb } from "./sync";
import { formatClock } from "./client";

describe("plans", () => {
  it("free gets no long lives; pro up to 7 days; business up to 30", () => {
    expect(livesFor("free")).toEqual([]);
    expect(Math.max(...livesFor("pro").map(([m]) => m))).toBe(7 * 1440);
    expect(Math.max(...livesFor("business").map(([m]) => m))).toBe(30 * 1440);
    expect(PERKS.pro.maxFile).toBe(100 * 1024 ** 3);
  });
  it("a long life rides in the name and comes back out", () => {
    const n = tagName("deck", { life: 30, long: 10080, open: true });
    expect(n).toBe("⟪o=1;l=10080⟫deck");
    const o = untag({ name: n, expiresAt: new Date(Date.now() + 7 * 864e5).toISOString() });
    expect(o.name).toBe("deck");
    expect(o.life).toBe(10080);
    expect(o.open).toBe(true);
  });
  it("an unknown long life is ignored", () => {
    expect(tagName("x", { long: 999 })).toBe("x");
    expect(untag({ name: "⟪l=999⟫x" }).life).toBe(30);
  });
  it("a beamed long-lived object is kept, but not past its own life", () => {
    const now = Date.now();
    const base = { id: "abc234", fileName: "a.pdf", mime: "application/pdf", size: 50 * 1024 ** 3, salt: "c2FsdA", iterations: 600000, hue: 3, status: "ready", createdAt: new Date(now).toISOString() };
    expect(cleanOrb({ ...base, life: 10080, expiresAt: new Date(now + 6 * 864e5).toISOString() }, now)?.life).toBe(10080);
    expect(cleanOrb({ ...base, life: 30, expiresAt: new Date(now + 6 * 864e5).toISOString() }, now)).toBeNull();
  });
  it("the clock shows days", () => expect(formatClock(2 * 864e5 + 3 * 36e5)).toBe("2d 03h"));
});

describe("retagName", () => {
  it("changes one tag and keeps every other one", async () => {
    const { retagName } = await import("./spaces");
    const name = tagName("deck", { by: "jigsaw", verified: true, hue: 265, long: 10080, open: true, skin: "card" });
    const u = untag({ name });
    const again = untag({ name: retagName(u, { skin: "ring" }) });
    expect(again).toMatchObject({ name: "deck", by: "jigsaw", verified: true, byHue: 265, life: 10080, open: true, skin: "ring" });
  });
});

describe("hiding the name on what is floating", () => {
  it("drops the name, the account mark and its colour, keeps the rest", async () => {
    const { retagName } = await import("./spaces");
    const u = untag({ name: tagName("deck", { by: "jigsaw", verified: true, hue: 140, open: true, skin: "card" }) });
    const hid = untag({ name: retagName(u, { by: undefined, verified: false, hue: undefined }) });
    expect(hid).toMatchObject({ name: "deck", by: null, verified: false, byHue: null, open: true, skin: "card" });
    const shown = untag({ name: retagName(hid, { by: "jigsaw", verified: true, hue: 140 }) });
    expect(shown).toMatchObject({ by: "jigsaw", verified: true, byHue: 140 });
  });
});
