import { describe, expect, it } from "vitest";
import { pinRows } from "./pins";
import type { Overview } from "./types";

const at = "2026-10-19T10:00:00Z";
const d = {
  live: [{ lat: 1, lon: 2, n: 3, city: "Pune", cc: "IN" }],
  exact: [{ lat: 4, lon: 5, acc: 12, label: "iPhone", city: null, cc: "IN", at }],
  exactSeen: [{ lat: 6, lon: 7, acc: null, label: null, city: "Berlin", cc: "DE", at, online: false }],
  anon: [{ lat: 8, lon: 9, city: "Paris", cc: "FR", n: 2, online: 0, last: at, first: at, ips: ["1.1.1.1", "2.2.2.2"] }],
  visitors: [{ lat: 10, lon: 11, n: 5 }],
  points: [{ lat: 12, lon: 13, n: 1, k: "upload" }, { lat: 14, lon: 15, n: 2, k: "download" }],
} as unknown as Overview;

describe("pinRows", () => {
  it("lists every globe pin once, under its layer", () => {
    const r = pinRows(d);
    expect(r.map((x) => x.k)).toEqual(["live", "exact", "seen", "anon", "visitors", "uploads", "downloads"]);
    expect(r[1]).toMatchObject({ acc: 12, note: "iPhone", online: true, n: 1 });
    expect(r[2]).toMatchObject({ city: "Berlin", online: false });
    expect(r[3]).toMatchObject({ note: "1.1.1.1, 2.2.2.2", online: false, at });
    expect(r[4]).toMatchObject({ city: null, cc: null, n: 5 });
  });
  it("copes with the optional layers missing", () => {
    expect(pinRows({ ...d, exact: undefined, exactSeen: undefined, anon: undefined }).length).toBe(4);
  });
});
