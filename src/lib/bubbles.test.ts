import { describe, expect, it } from "vitest";
import { looksLikeName } from "./bubbles";

describe("looksLikeName (what may be saved and shown as you)", () => {
  it("accepts real names", () => {
    for (const n of ["Mohit", "mo", "Vick", "Mary-Jane O'Neil", "Rajput M.", "José", "Zoë Ann", "राज"]) expect(looksLikeName(n)).toBe(true);
  });
  it("rejects titles, addresses and codes typed into the name box", () => {
    for (const n of ["24-51 LITTLE NECK REPLY", "comp 1 mls", "212 W 93 ST", "a.b@c.com", "", "   ", "one two three four", "x".repeat(25)]) expect(looksLikeName(n)).toBe(false);
  });
});
