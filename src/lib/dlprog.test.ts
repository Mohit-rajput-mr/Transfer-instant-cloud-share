import { describe, expect, it } from "vitest";
import { addDl, dlState, pruneDl, shownDl, type Downloader } from "./dlprog";
import { readSync } from "./sync";

const d = (w: string, f: number, at: number, x: Partial<Downloader> = {}): Downloader => ({ w, f, at, t: at, ...x });

describe("who is downloading (anonymous spaces)", () => {
  it("states: running, paused when quiet 7 s or stalled, done, canceled, failed", () => {
    expect(dlState(d("A", 0.4, 1000), 5000)).toBe("down");
    expect(dlState(d("A", 0.4, 1000), 9000)).toBe("paused");
    expect(dlState(d("A", 0.4, 1000, { z: true }), 1500)).toBe("paused");
    expect(dlState(d("A", 1, 1000, { e: 1 }), 1500)).toBe("done");
    expect(dlState(d("A", 0.3, 1000, { e: 2 }), 1500)).toBe("canceled");
    expect(dlState(d("A", 0.3, 1000, { e: 3 }), 1500)).toBe("failed");
  });
  it("a note said earlier never overwrites a newer one (queued while offline)", () => {
    let m = addDl(new Map(), "abcd", d("A", 0.6, 2000));
    m = addDl(m, "abcd", { w: "A", f: 0.2, at: 3000, t: 1000 });
    expect(m.get("abcd")![0].f).toBe(0.6);
    m = addDl(m, "abcd", d("B", 0.1, 3000));
    expect(m.get("abcd")!.map((x) => x.w)).toEqual(["A", "B"]);
  });
  it("several at once: running first (furthest on top), then paused, then finished / stopped", () => {
    const now = 10_000;
    const list = shownDl([d("Done", 1, 9000, { e: 1 }), d("Slow", 0.2, 9500), d("Fast", 0.8, 9500), d("Gone", 0.5, 1000), d("Stop", 0.3, 9000, { e: 2 })], now);
    expect(list.map((x) => x.w)).toEqual(["Fast", "Slow", "Gone", "Done", "Stop"]);
    expect(list.map((x) => x.state)).toEqual(["down", "down", "paused", "done", "canceled"]);
  });
  it("fades: done after 6 s, stopped after 10 s, silent after 2 minutes", () => {
    const m = new Map([["abcd", [d("Done", 1, 0, { e: 1 }), d("Stop", 0.3, 0, { e: 2 }), d("Quiet", 0.3, 0)]]]);
    expect(pruneDl(m, 7000).get("abcd")!.map((x) => x.w)).toEqual(["Stop", "Quiet"]);
    expect(pruneDl(m, 11_000).get("abcd")!.map((x) => x.w)).toEqual(["Quiet"]);
    expect(pruneDl(m, 121_000).has("abcd")).toBe(false);
  });
  it("the live message is cleaned: bad ids, names and numbers are dropped", () => {
    const m = readSync({ dp: [{ o: "abcd12", w: "Anon-36B", f: 1.7, e: 2, z: 1, t: 5 }, { o: "../x", w: "A", f: 0.1 }, { o: "abcd", w: "", f: 0.1 }, { o: "abcd", w: "B", f: "x" }] }, Date.now());
    expect(m.dp).toEqual([{ o: "abcd12", w: "Anon-36B", f: 1, e: 2, z: 1, t: 5 }]);
  });
});
