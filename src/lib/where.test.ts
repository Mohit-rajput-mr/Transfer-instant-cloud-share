import { describe, expect, it } from "vitest";
import { ASK_EVERY, askedRecently } from "./where";

describe("location popup: once every 2 days", () => {
  const now = 1_800_000_000_000;
  it("shows on a first visit", () => expect(askedRecently(null, now)).toBe(false));
  it("stays hidden within 2 days", () => expect(askedRecently(String(now - ASK_EVERY + 60_000), now)).toBe(true));
  it("shows again after 2 days", () => expect(askedRecently(String(now - ASK_EVERY - 1), now)).toBe(false));
  it("treats the old flag and junk as long ago", () => {
    expect(askedRecently("1", now)).toBe(false);
    expect(askedRecently("x", now)).toBe(false);
  });
});
