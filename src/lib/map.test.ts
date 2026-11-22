import { describe, expect, it } from "vitest";
import { place, worldSize, type Thing } from "./map";

describe("map: files wired to a task panel", () => {
  it("line up beside the panel in the order of their rows, so cables never cross", () => {
    const panel: Thing = { key: "t:g", w: 384, h: 300, born: 1 };
    const files: Thing[] = [
      { key: "o:c", w: 210, h: 250, born: 2, near: "t:g", row: 2 },
      { key: "o:a", w: 210, h: 250, born: 3, near: "t:g", row: 0 },
      { key: "o:b2", w: 210, h: 250, born: 5, near: "t:g", row: 1 },
      { key: "o:b1", w: 210, h: 250, born: 4, near: "t:g", row: 1 },
    ];
    const out = place([panel, ...files], 4000, 3000);
    const p = out.get("t:g")!;
    const ys = ["o:a", "o:b1", "o:b2", "o:c"].map((k) => out.get(k)!.y);
    expect([...ys].sort((x, y) => x - y)).toEqual(ys); // top to bottom = row order
    for (const k of ["o:a", "o:b1", "o:b2", "o:c"]) expect(out.get(k)!.x).toBeGreaterThan(p.x + panel.w / 2); // all to its right
    expect(out.get("o:b1")!.y).toBe(out.get("o:b2")!.y); // one lane per task: the same task's files side by side
    expect(out.get("o:b2")!.x).toBeGreaterThan(out.get("o:b1")!.x);
  });
  it("the world is tall enough for every lane, so a lane is never squeezed off to the other side", () => {
    const things: Thing[] = [{ key: "t:g", w: 384, h: 430, born: 1 }, ...[0, 0, 1, 2].map((row, i) => ({ key: `o:${i}`, w: 210, h: 250, born: 2 + i, near: "t:g", row }))];
    const { W, H } = worldSize(things, 1665, 822);
    expect(H).toBeGreaterThanOrEqual(3 * 280);
    const out = place(things, W, H), p = out.get("t:g")!;
    for (const k of ["o:0", "o:1", "o:2", "o:3"]) expect(out.get(k)!.x).toBeGreaterThan(p.x);
  });
});
