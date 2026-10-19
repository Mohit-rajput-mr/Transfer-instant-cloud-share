import { describe, expect, it } from "vitest";
import { SPACE_LIFE_MS, cleanHandle, closesAt, tagName, untag, type SpaceMeta } from "./spaces";

const meta = (m: Partial<SpaceMeta>): SpaceMeta => ({ slug: "kech", title: "Kech", priv: false, pass: null, owner: "o", at: 1_000_000, ...m });

describe("space life", () => {
  it("named spaces (open or private) close 8 hours after they were made", () => {
    expect(SPACE_LIFE_MS).toBe(8 * 3600_000);
    expect(closesAt(meta({ priv: false }))).toBe(1_000_000 + SPACE_LIFE_MS);
    expect(closesAt(meta({ priv: true }))).toBe(1_000_000 + SPACE_LIFE_MS);
  });
  it("anonymous spaces burn with their session instead", () => expect(closesAt(meta({ anon: true }))).toBeNull());
});

describe("name tags on objects", () => {
  it("round-trips the sender's name outside a space (who sent it)", () => {
    const o = untag({ name: tagName("comps", { by: "Mohit", from: "abcdef0123" }), expiresAt: new Date(Date.now() + 60_000).toISOString() });
    expect(o.name).toBe("comps");
    expect(o.by).toBe("Mohit");
    expect(o.space).toBeNull();
  });
  it("round-trips space, container name and a short life", () => {
    const o = untag({ name: tagName("a.zap", { space: "kech", by: "Vick", from: "abcdef0123", group: "ALL .ZAP FILES", life: 10, open: true }), expiresAt: new Date(Date.now() + 60_000).toISOString() });
    expect(o).toMatchObject({ name: "a.zap", space: "kech", by: "Vick", groupName: "ALL .ZAP FILES", life: 10, open: true });
  });
  it("a plain name has no tags", () => expect(untag({ name: "plain" }).by).toBeNull());
});

describe("cleanHandle", () => {
  it("strips the tag delimiters so a name can't forge tags", () => expect(cleanHandle("a⟪s=x;b=y⟫|/z")).toBe("as=xb=yz".replace(/[=;]/g, "")));
  it("caps at 24 characters and trims", () => expect(cleanHandle("  " + "x".repeat(40) + " ")).toBe("x".repeat(24)));
  it("non-strings are empty", () => expect(cleanHandle(42)).toBe(""));
});
