import { describe, expect, it } from "vitest";
import { ext, formatClock } from "./client";

describe("formatClock", () => {
  it("mm:ss under an hour", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(59_000)).toBe("00:59");
    expect(formatClock(29 * 60_000 + 42_000)).toBe("29:42");
  });
  it("h:mm:ss from an hour (things in a space live up to 8 h)", () => {
    expect(formatClock(3600_000)).toBe("1:00:00");
    expect(formatClock(8 * 3600_000 - 1000)).toBe("7:59:59");
  });
  it("never negative", () => expect(formatClock(-5000)).toBe("00:00"));
});

describe("ext (format on every tile)", () => {
  it("any extension, upper case", () => {
    expect(ext("report.pdf")).toBe("PDF");
    expect(ext("76441455, 420 VAN.zap")).toBe("ZAP");
    expect(ext("archive.tar.gz")).toBe("GZ");
  });
  it("no extension → FILE", () => expect(ext("README")).toBe("FILE"));
});
