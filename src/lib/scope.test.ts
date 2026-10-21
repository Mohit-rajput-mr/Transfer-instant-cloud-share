import { describe, expect, it } from "vitest";
import { countArea, inScope, placed } from "./scope";

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

describe("Nearby count", () => {
  const items = [o("tdr1", null), o("tdr1", "n1"), o("tdr3", null)];
  it("is placed only by GPS or an area picked on the map, never the IP guess", () => {
    expect(placed(true, "ip")).toBe(true);
    expect(placed(false, "pick")).toBe(true);
    expect(placed(false, "ip")).toBe(false);
    expect(placed(false, undefined)).toBe(false);
  });
  it("counts the own area once placed, nothing while location is off", () => {
    expect(countArea(items, "tdr1", true)).toBe(2);
    expect(countArea(items, "tdr1", false)).toBe(0);
    expect(countArea(items, "", true)).toBe(0);
  });
});
