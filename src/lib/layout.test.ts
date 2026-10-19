import { describe, expect, it } from "vitest";
import { bubbleLayout, smartCols } from "./layout";

const rows = (n: number) => {
  const c = smartCols(n);
  return Array.from({ length: Math.ceil(n / c) }, (_, i) => Math.min(c, n - i * c));
};

describe("container rows (smartCols)", () => {
  it("fills even rows the owner asked for", () => {
    expect(rows(9)).toEqual([3, 3, 3]);
    expect(rows(10)).toEqual([5, 5]);
    expect(rows(8)).toEqual([4, 4]);
    expect(rows(12)).toEqual([4, 4, 4]);
    expect(rows(6)).toEqual([3, 3]);
    expect(rows(4)).toEqual([2, 2]);
  });
  it("puts small sets in one row", () => {
    expect(rows(1)).toEqual([1]);
    expect(rows(2)).toEqual([2]);
    expect(rows(3)).toEqual([3]);
  });
  it("is never taller than wide and never wider than 6", () => {
    for (let n = 1; n <= 40; n++) {
      const c = smartCols(n), r = Math.ceil(n / c);
      expect(c).toBeLessThanOrEqual(6);
      if (n > 3 && n <= 36) expect(r).toBeLessThanOrEqual(c);
      expect(r * c).toBeGreaterThanOrEqual(n);
    }
  });
});

describe("bubbleLayout", () => {
  it("places every file inside the container", () => {
    for (let n = 1; n <= 24; n++) {
      const L = bubbleLayout(n);
      expect(L.spots).toHaveLength(n);
      for (const [x, y] of L.spots) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(1);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(1);
      }
    }
  });
});
