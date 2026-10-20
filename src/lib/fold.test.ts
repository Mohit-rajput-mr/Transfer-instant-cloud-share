import { describe, expect, it } from "vitest";
import { pickFold } from "./fold";

describe("pickFold", () => {
  it("keeps everything when it fits", () => expect(pickFold(() => true)).toBe(0));
  it("folds only as far as needed", () => expect(pickFold((l) => l >= 2)).toBe(2));
  it("ends at the last level, which always fits", () => expect(pickFold(() => false)).toBe(3));
});
