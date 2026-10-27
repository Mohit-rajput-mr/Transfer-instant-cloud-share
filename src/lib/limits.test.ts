import { describe, expect, it } from "vitest";
import { LEGACY_PART_CHUNKS, PART_CHUNKS, partChunks, storeParts } from "./limits";

describe("stored-copy parts", () => {
  it("new pages upload one 8 MB chunk per part, old pages (no pc) keep their 4", () => {
    expect(PART_CHUNKS).toBe(1);
    expect(partChunks(1)).toBe(1);
    expect(partChunks(undefined)).toBe(LEGACY_PART_CHUNKS);
    expect(partChunks(4)).toBe(4);
    expect(partChunks("1")).toBe(LEGACY_PART_CHUNKS); // only the exact number counts
  });
  it("a 20 MB file is 3 parts now (one request before), and still 1 for the old layout", () => {
    const mb = 1024 * 1024;
    expect(storeParts(20 * mb)).toBe(3);
    expect(storeParts(20 * mb, LEGACY_PART_CHUNKS)).toBe(1);
    expect(storeParts(8 * mb)).toBe(1);
    expect(storeParts(0)).toBe(1);
  });
});
