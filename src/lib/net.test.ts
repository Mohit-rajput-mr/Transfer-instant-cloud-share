import { afterEach, describe, expect, it } from "vitest";
import { acquire } from "./net";

const tick = () => new Promise((r) => setTimeout(r, 10));
const store = (v: string | null) => {
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: () => v, setItem: () => {} };
};
afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe("turns on the line", () => {
  it("always full speed (owner 2026-11-20, even if an old 'gentle' pick is stored): 8 upload parts at once, a send never waits behind them", async () => {
    store("gentle");
    const ups = await Promise.all([...Array(8)].map(() => acquire("up")));
    const order: string[] = [];
    const up9 = acquire("up").then((r) => (order.push("up"), r));
    const serve = acquire("serve").then((r) => (order.push("serve"), r));
    await tick();
    expect(order).toEqual(["serve"]);
    ups[0]();
    await tick();
    expect(order).toEqual(["serve", "up"]);
    ups.slice(1).forEach((r) => r());
    (await serve)();
    (await up9)();
  });
});
