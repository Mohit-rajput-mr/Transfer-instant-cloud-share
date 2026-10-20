import { describe, expect, it } from "vitest";
import { inScope } from "./scope";

const o = (area: string | null, netHash: string | null) => ({ area, netHash });
const me = { home: "tdr1", net: "n1", mine: false };

describe("inScope", () => {
  it("Open void shows everything", () => expect(inScope(o("zzzz", null), "all", me)).toBe(true));
  it("Nearby shows only your own area", () => {
    expect(inScope(o("tdr1", null), "area", me)).toBe(true);
    expect(inScope(o("tdr3", "n1"), "area", me)).toBe(false);
    expect(inScope(o(null, null), "area", me)).toBe(false);
    expect(inScope(o("tdr1", null), "area", { ...me, home: "" })).toBe(false);
  });
  it("Wi-Fi shows only your network", () => {
    expect(inScope(o("x", "n1"), "near", me)).toBe(true);
    expect(inScope(o("x", "n2"), "near", me)).toBe(false);
    expect(inScope(o("x", null), "near", { ...me, net: null })).toBe(false);
  });
  it("your own sends always show; Mine shows only them", () => {
    expect(inScope(o("far", "n9"), "area", { ...me, mine: true })).toBe(true);
    expect(inScope(o("tdr1", "n1"), "mine", me)).toBe(false);
    expect(inScope(o("tdr1", "n1"), "mine", { ...me, mine: true })).toBe(true);
  });
});
