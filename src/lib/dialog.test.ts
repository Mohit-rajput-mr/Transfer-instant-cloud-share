import { describe, expect, it } from "vitest";
import { dialogOpen, isTop, pushDialog, wrapIndex } from "./dialog";

describe("dialog stack", () => {
  it("only the top card hears Escape; closing one leaves the one under it on top", () => {
    const a = {}, b = {};
    const dropA = pushDialog(a);
    const dropB = pushDialog(b);
    expect(isTop(b)).toBe(true);
    expect(isTop(a)).toBe(false);
    dropB();
    expect(isTop(a)).toBe(true);
    expect(dialogOpen()).toBe(true);
    dropA();
    expect(dialogOpen()).toBe(false);
  });
  it("a card closing out of order doesn't take another off", () => {
    const a = {}, b = {};
    const dropA = pushDialog(a);
    const dropB = pushDialog(b);
    dropA();
    expect(isTop(b)).toBe(true);
    dropB();
    expect(dialogOpen()).toBe(false);
  });
});

describe("Tab trap", () => {
  it("wraps at both ends and brings focus back in", () => {
    expect(wrapIndex(2, 3, false)).toBe(0);
    expect(wrapIndex(0, 3, true)).toBe(2);
    expect(wrapIndex(1, 3, false)).toBe(-1);
    expect(wrapIndex(1, 3, true)).toBe(-1);
    expect(wrapIndex(-1, 3, false)).toBe(0);
    expect(wrapIndex(-1, 3, true)).toBe(2);
    expect(wrapIndex(-1, 0, false)).toBe(-1);
  });
});
